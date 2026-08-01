import { AppError } from '@server/lib/errors.js';
import {
  getSourceForBlock,
  type BlockType,
  type SourceType,
  type WidgetConfig,
} from '@server/widgets/registry.js';

const CACHE_TTL_MS = 15 * 60 * 1000;

type CacheEntry = { expiresAt: number; value: unknown };
const responseCache = new Map<string, CacheEntry>();

const getCached = async <T>(key: string, loader: () => Promise<T>) => {
  const cached = responseCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value as T;

  const value = await loader();
  responseCache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value });
  return value;
};

const fetchJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      'User-Agent': 'github-stats-widget-builder',
      ...init?.headers,
    },
  });

  if (!response.ok) {
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

const githubProfile = (username: string) =>
  getCached(`github:${username}:profile`, () =>
    fetchJson<GithubProfile>(`https://api.github.com/users/${encodeURIComponent(username)}`),
  );

const githubRepositories = (username: string) =>
  getCached(`github:${username}:repositories`, () =>
    fetchJson<GithubRepository[]>(
      `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated&type=owner`,
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

const getGithubLanguages = async (username: string, limit: number) => {
  const repositories = await githubRepositories(username);
  const totals = new Map<string, number>();

  for (const repository of repositories) {
    if (!repository.language || repository.fork) continue;
    totals.set(
      repository.language,
      (totals.get(repository.language) ?? 0) + Math.max(repository.size, 1),
    );
  }

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
      userContestRanking?: { rating?: number | null; globalRanking?: number | null } | null;
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
        userContestRanking { rating globalRanking }
      }
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
    ranking: matchedUser.profile?.ranking ?? matchedUser.userContestRanking?.globalRanking ?? null,
    contestRating: matchedUser.userContestRanking?.rating ?? null,
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
      paletteMode: 'auto',
      grid: { columns: 1 },
      renderFormat: 'iframe',
    };
  const config = value as Partial<WidgetConfig>;
  return {
    ...config,
    sources: config.sources ?? {},
    palette: config.palette ?? 'lavender',
    paletteMode: config.paletteMode ?? 'auto',
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

  return { blocks, cacheTtlSeconds: CACHE_TTL_MS / 1000 };
};

export const clearStatsCache = () => responseCache.clear();
