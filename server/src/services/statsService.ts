import { AppError } from '@server/lib/errors.js';
import {
  getSourceForBlock,
  type BlockType,
  type SourceType,
  type WidgetConfig,
} from '@server/widgets/registry.js';

const CACHE_TTL_MS = 15 * 60 * 1000;
// Failed lookups (unknown user, rate limit, outage) are cached briefly so public widgets that
// keep being viewed don't hammer the external API while it is failing.
const ERROR_CACHE_TTL_MS = 60 * 1000;
const CACHE_MAX_ENTRIES = 500;

type CacheEntry = { expiresAt: number } & ({ value: unknown } | { error: unknown });
const responseCache = new Map<string, CacheEntry>();

const storeEntry = (key: string, entry: CacheEntry) => {
  const now = Date.now();
  if (responseCache.size >= CACHE_MAX_ENTRIES) {
    for (const [entryKey, cached] of responseCache) {
      if (cached.expiresAt <= now) responseCache.delete(entryKey);
    }
    if (responseCache.size >= CACHE_MAX_ENTRIES) {
      const oldestKey = responseCache.keys().next().value;
      if (oldestKey) responseCache.delete(oldestKey);
    }
  }
  responseCache.set(key, entry);
};

const getCached = async <T>(key: string, loader: () => Promise<T>) => {
  const now = Date.now();
  const cached = responseCache.get(key);
  if (cached && cached.expiresAt > now) {
    if ('error' in cached) throw cached.error;
    return cached.value as T;
  }
  if (cached) responseCache.delete(key);

  try {
    const value = await loader();
    storeEntry(key, { expiresAt: Date.now() + CACHE_TTL_MS, value });
    return value;
  } catch (error) {
    if (error instanceof AppError) {
      storeEntry(key, { expiresAt: Date.now() + ERROR_CACHE_TTL_MS, error });
    }
    throw error;
  }
};

const fetchJson = async <T>(
  url: string,
  init?: RequestInit,
  rateLimitMessage?: string,
): Promise<T> => {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      'User-Agent': 'widgecode-widget-builder',
      ...init?.headers,
    },
  });

  if (!response.ok) {
    if (
      rateLimitMessage &&
      response.status === 403 &&
      response.headers.get('x-ratelimit-remaining') === '0'
    ) {
      throw new AppError(502, rateLimitMessage);
    }
    throw new AppError(502, `External API returned ${response.status}`);
  }

  return response.json() as Promise<T>;
};

type GithubProfile = {
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
};

type GithubRepository = {
  language: string | null;
  size: number;
  fork: boolean;
};

const githubHeaders = () => {
  const token = process.env.GITHUB_TOKEN?.trim();
  return {
    'X-GitHub-Api-Version': '2022-11-28',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const githubRateLimitMessage =
  'GitHub API rate limit exceeded. Configure GITHUB_TOKEN for live widget previews.';

const githubProfile = (username: string) =>
  getCached(`github:${username}:profile`, () =>
    fetchJson<GithubProfile>(
      `https://api.github.com/users/${encodeURIComponent(username)}`,
      { headers: githubHeaders() },
      githubRateLimitMessage,
    ),
  );

const githubRepositories = (username: string) =>
  getCached(`github:${username}:repositories`, () =>
    fetchJson<GithubRepository[]>(
      `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated&type=owner`,
      { headers: githubHeaders() },
      githubRateLimitMessage,
    ),
  );

const getGithubStats = async (username: string) => {
  const profile = await githubProfile(username);
  return {
    username: profile.login,
    name: profile.name || profile.login,
    avatarUrl: profile.avatar_url,
    bio: profile.bio,
    publicRepositories: profile.public_repos,
    followers: profile.followers,
    following: profile.following,
  };
};

type GithubLanguagesResponse = {
  data?: {
    user: {
      repositories: {
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
        nodes: { languages: { edges: { size: number; node: { name: string } }[] } }[];
      };
    } | null;
  };
  errors?: { message: string }[];
};

const GITHUB_LANGUAGE_PAGES = 5;

// Exact byte counts per language across the user's public, non-fork repositories. GraphQL
// always needs a token, so this is only used when GITHUB_TOKEN is configured.
const githubLanguageBytes = (username: string) =>
  getCached(`github:${username}:language-bytes`, async () => {
    const query = `
      query userLanguages($login: String!, $cursor: String) {
        user(login: $login) {
          repositories(first: 100, after: $cursor, ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC) {
            pageInfo { hasNextPage endCursor }
            nodes { languages(first: 10, orderBy: { field: SIZE, direction: DESC }) { edges { size node { name } } } }
          }
        }
      }
    `;
    const totals = new Map<string, number>();
    let cursor: string | null = null;
    for (let page = 0; page < GITHUB_LANGUAGE_PAGES; page += 1) {
      const response: GithubLanguagesResponse = await fetchJson<GithubLanguagesResponse>(
        'https://api.github.com/graphql',
        {
          method: 'POST',
          headers: { ...githubHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, variables: { login: username, cursor } }),
        },
        githubRateLimitMessage,
      );
      if (response.errors?.length) {
        if (response.data?.user === null) throw new AppError(404, 'GitHub profile not found');
        throw new AppError(502, 'GitHub API returned an error');
      }
      const repositories = response.data?.user?.repositories;
      if (!repositories) throw new AppError(404, 'GitHub profile not found');
      for (const repository of repositories.nodes) {
        for (const { size, node } of repository.languages.edges) {
          totals.set(node.name, (totals.get(node.name) ?? 0) + size);
        }
      }
      if (!repositories.pageInfo.hasNextPage) break;
      cursor = repositories.pageInfo.endCursor;
    }
    return [...totals.entries()];
  });

// Without a token: each repository's whole size counted toward its primary language.
const approximateLanguageBytes = async (username: string) => {
  const totals = new Map<string, number>();
  for (const repository of await githubRepositories(username)) {
    if (!repository.language || repository.fork) continue;
    totals.set(
      repository.language,
      (totals.get(repository.language) ?? 0) + Math.max(repository.size, 1),
    );
  }
  return [...totals.entries()];
};

const getGithubLanguages = async (username: string, limit: number) => {
  const totals = new Map(
    process.env.GITHUB_TOKEN?.trim()
      ? await githubLanguageBytes(username)
      : await approximateLanguageBytes(username),
  );

  const languages = [...totals.entries()].sort((left, right) => right[1] - left[1]).slice(0, limit);
  const total = languages.reduce((sum, [, bytes]) => sum + bytes, 0) || 1;

  return {
    username,
    languages: languages.map(([name, bytes]) => ({
      name,
      percentage: Math.round((bytes / total) * 100),
    })),
  };
};

// --- GitHub GraphQL blocks (activity, pull requests, status); GraphQL always needs a token.

const githubGraphql = async <T>(query: string, variables: Record<string, unknown>) => {
  if (!process.env.GITHUB_TOKEN?.trim()) {
    throw new AppError(503, 'Add GITHUB_TOKEN on the server to show this block');
  }
  const response = await fetchJson<{ data?: T; errors?: { type?: string; message: string }[] }>(
    'https://api.github.com/graphql',
    {
      method: 'POST',
      headers: { ...githubHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    },
    githubRateLimitMessage,
  );
  if (response.errors?.some((error) => error.type === 'NOT_FOUND')) {
    throw new AppError(404, 'GitHub profile not found');
  }
  if (response.errors?.length || !response.data) {
    throw new AppError(502, 'GitHub API returned an error');
  }
  return response.data;
};

const CONTRIBUTION_LEVELS: Record<string, number> = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
};

type GithubActivityResponse = {
  user: {
    login: string;
    contributionsCollection: {
      totalCommitContributions: number;
      contributionCalendar: {
        weeks: {
          contributionDays: {
            date: string;
            contributionCount: number;
            contributionLevel: string;
          }[];
        }[];
      };
    };
  } | null;
};

/** Current streak ends today or yesterday (today may simply not have activity yet). */
export const contributionStreaks = (counts: number[]) => {
  let longest = 0;
  let run = 0;
  for (const count of counts) {
    run = count > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  let current = 0;
  let index = counts.length - 1;
  if (index >= 0 && counts[index] === 0) index -= 1;
  while (index >= 0 && counts[index] > 0) {
    current += 1;
    index -= 1;
  }
  return { current, longest };
};

const getGithubActivity = async (username: string) => {
  const data = await getCached(`github:${username}:activity`, () =>
    githubGraphql<GithubActivityResponse>(
      `query userActivity($login: String!) {
        user(login: $login) {
          login
          contributionsCollection {
            totalCommitContributions
            contributionCalendar { weeks { contributionDays { date contributionCount contributionLevel } } }
          }
        }
      }`,
      { login: username },
    ),
  );
  if (!data.user) throw new AppError(404, 'GitHub profile not found');
  const days = data.user.contributionsCollection.contributionCalendar.weeks.flatMap(
    (week) => week.contributionDays,
  );
  const streaks = contributionStreaks(days.map((day) => day.contributionCount));
  return {
    username: data.user.login,
    commitsYear: data.user.contributionsCollection.totalCommitContributions,
    currentStreak: streaks.current,
    longestStreak: streaks.longest,
    // Oldest → newest; the calendar starts on a Sunday, so days group into weeks of 7.
    levels: days.map((day) => CONTRIBUTION_LEVELS[day.contributionLevel] ?? 0),
    firstDayOfWeek: days.length ? new Date(`${days[0].date}T00:00:00Z`).getUTCDay() : 0,
  };
};

type GithubPullRequestsResponse = {
  user: {
    login: string;
    all: { totalCount: number };
    merged: { totalCount: number };
    open: { totalCount: number };
  } | null;
};

const getGithubPullRequests = async (username: string) => {
  const data = await getCached(`github:${username}:pull-requests`, () =>
    githubGraphql<GithubPullRequestsResponse>(
      `query userPullRequests($login: String!) {
        user(login: $login) {
          login
          all: pullRequests { totalCount }
          merged: pullRequests(states: MERGED) { totalCount }
          open: pullRequests(states: OPEN) { totalCount }
        }
      }`,
      { login: username },
    ),
  );
  if (!data.user) throw new AppError(404, 'GitHub profile not found');
  const { all, merged, open } = data.user;
  return {
    username: data.user.login,
    total: all.totalCount,
    merged: merged.totalCount,
    open: open.totalCount,
    closed: Math.max(all.totalCount - merged.totalCount - open.totalCount, 0),
  };
};

type GithubStatusResponse = {
  user: {
    login: string;
    status: {
      emojiHTML: string | null;
      message: string | null;
      indicatesLimitedAvailability: boolean;
    } | null;
  } | null;
};

// emojiHTML is markup like `<div><g-emoji …>🚀</g-emoji></div>`; custom emoji are images and
// can't be shown as text, so they are dropped.
export const emojiFromHtml = (html: string | null | undefined) => {
  if (!html || /<img/i.test(html)) return null;
  const text = html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .trim();
  return text || null;
};

const getGithubStatus = async (username: string) => {
  const data = await getCached(`github:${username}:status`, () =>
    githubGraphql<GithubStatusResponse>(
      `query userStatus($login: String!) {
        user(login: $login) { login status { emojiHTML message indicatesLimitedAvailability } }
      }`,
      { login: username },
    ),
  );
  if (!data.user) throw new AppError(404, 'GitHub profile not found');
  const status = data.user.status;
  return {
    username: data.user.login,
    emoji: emojiFromHtml(status?.emojiHTML),
    message: status?.message?.trim() || null,
    busy: Boolean(status?.indicatesLimitedAvailability),
  };
};

type LeetcodeResponse = {
  data?: {
    matchedUser?: {
      username: string;
      profile?: {
        ranking?: number | null;
        reputation?: number | null;
        starRating?: number | null;
      } | null;
      submitStatsGlobal?: {
        acSubmissionNum?: { difficulty: string; count: number }[];
      } | null;
    } | null;
    userContestRanking?: {
      rating?: number | null;
    } | null;
  };
};

const getLeetcodeStats = async (username: string) => {
  const query = `
    query userPublicProfile($username: String!) {
      matchedUser(username: $username) {
        username
        profile { ranking reputation starRating }
        submitStatsGlobal { acSubmissionNum { difficulty count } }
      }
      userContestRanking(username: $username) { rating }
    }
  `;
  const response = await getCached(`leetcode:${username}:profile`, () =>
    fetchJson<LeetcodeResponse>('https://leetcode.com/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Referer: 'https://leetcode.com/' },
      body: JSON.stringify({ query, variables: { username } }),
    }),
  );
  const matchedUser = response.data?.matchedUser;
  if (!matchedUser) throw new AppError(404, 'LeetCode profile not found');

  const solved = Object.fromEntries(
    (matchedUser.submitStatsGlobal?.acSubmissionNum ?? []).map((item) => [
      item.difficulty.toLowerCase(),
      item.count,
    ]),
  );
  return {
    username: matchedUser.username,
    ranking: matchedUser.profile?.ranking ?? null,
    contestRating: response.data?.userContestRanking?.rating ?? null,
    reputation: matchedUser.profile?.reputation ?? null,
    solved: {
      all: solved.all ?? 0,
      easy: solved.easy ?? 0,
      medium: solved.medium ?? 0,
      hard: solved.hard ?? 0,
    },
  };
};

const configFor = (value: unknown): WidgetConfig => {
  if (!value || typeof value !== 'object')
    return {
      sources: {},
      palette: 'lavender',
      paletteMode: 'light',
      grid: { columns: 1 },
      renderFormat: 'iframe',
    };
  const config = value as Partial<WidgetConfig>;
  return {
    ...config,
    sources: config.sources ?? {},
    palette: config.palette ?? 'lavender',
    paletteMode: config.paletteMode === 'dark' ? 'dark' : 'light',
    grid: config.grid ?? { columns: 1 },
    renderFormat: 'iframe',
  };
};

const usernameFor = (config: WidgetConfig, source: SourceType) =>
  config.sources?.[source]?.username;

const getBlockData = async (
  type: BlockType,
  blockConfig: Record<string, unknown>,
  config: WidgetConfig,
) => {
  const source = getSourceForBlock(type);
  if (!source) return { data: blockConfig };
  const blockUsername = typeof blockConfig.username === 'string' ? blockConfig.username.trim() : '';
  const username = blockUsername || usernameFor(config, source);
  if (!username) return { error: `Add a ${source} username to this widget` };

  if (type === 'github-stats') return { data: await getGithubStats(username) };
  if (type === 'github-langs') {
    const limit = typeof blockConfig.limit === 'number' ? blockConfig.limit : 5;
    return { data: await getGithubLanguages(username, limit) };
  }
  if (type === 'github-commits') return { data: await getGithubActivity(username) };
  if (type === 'github-prs') return { data: await getGithubPullRequests(username) };
  if (type === 'github-status') return { data: await getGithubStatus(username) };
  return { data: await getLeetcodeStats(username) };
};

export type RenderedWidget = {
  blocks: { id: string; type: string; position: number; data?: unknown; error?: string }[];
  cacheTtlSeconds: number;
};

export const renderWidgetStats = async (widget: {
  config: unknown;
  blocks: { id: string; type: string; position: number; config: unknown }[];
}): Promise<RenderedWidget> => {
  const config = configFor(widget.config);
  const blocks = await Promise.all(
    widget.blocks.map(async (block) => {
      try {
        return {
          id: block.id,
          type: block.type,
          position: block.position,
          ...(await getBlockData(
            block.type as BlockType,
            (block.config ?? {}) as Record<string, unknown>,
            config,
          )),
        };
      } catch (error) {
        return {
          id: block.id,
          type: block.type,
          position: block.position,
          error: error instanceof Error ? error.message : 'Could not load block data',
        };
      }
    }),
  );

  const hasErrors = blocks.some((block) => 'error' in block && block.error);
  return {
    blocks,
    cacheTtlSeconds: (hasErrors ? ERROR_CACHE_TTL_MS : CACHE_TTL_MS) / 1000,
  };
};

export const clearStatsCache = () => responseCache.clear();
