import { clearStatsCache, renderWidgetStats } from '@server/services/statsService.js';

afterEach(() => {
  vi.unstubAllGlobals();
  clearStatsCache();
});

it('maps the LeetCode contest rating into rendered block data', async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      data: {
        matchedUser: {
          username: 'tourist',
          profile: { ranking: 42, reputation: 10, starRating: 5 },
          submitStatsGlobal: {
            acSubmissionNum: [
              { difficulty: 'All', count: 100 },
              { difficulty: 'Easy', count: 50 },
              { difficulty: 'Medium', count: 40 },
              { difficulty: 'Hard', count: 10 },
            ],
          },
        },
        userContestRanking: { rating: 2_400 },
      },
    }),
  });
  vi.stubGlobal('fetch', fetchMock);

  const rendered = await renderWidgetStats({
    config: {},
    blocks: [
      {
        id: 'block-1',
        type: 'leetcode-stats',
        position: 0,
        config: { username: 'tourist' },
      },
    ],
  });

  expect(rendered.blocks[0]).toEqual(
    expect.objectContaining({
      data: expect.objectContaining({
        ranking: 42,
        contestRating: 2_400,
      }),
    }),
  );
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
  expect(String(request.body)).toContain('userContestRanking');
});

it('caches failed lookups briefly and shortens the widget cache TTL', async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 404, headers: new Headers() });
  vi.stubGlobal('fetch', fetchMock);
  const widget = {
    config: {},
    blocks: [{ id: 'block-1', type: 'github-stats', position: 0, config: { username: 'nobody' } }],
  };

  const first = await renderWidgetStats(widget);
  const second = await renderWidgetStats(widget);

  expect(first.blocks[0].error).toBe('External API returned 404');
  expect(second.blocks[0].error).toBe('External API returned 404');
  expect(first.cacheTtlSeconds).toBe(60);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

describe('GitHub languages', () => {
  const widget = {
    config: {},
    blocks: [
      { id: 'block-1', type: 'github-langs', position: 0, config: { username: 'octo', limit: 2 } },
    ],
  };

  afterEach(() => {
    delete process.env.GITHUB_TOKEN;
  });

  it('sums exact language bytes across pages when a token is configured', async () => {
    process.env.GITHUB_TOKEN = 'token';
    const page = (edges: [string, number][], hasNextPage: boolean) => ({
      ok: true,
      json: async () => ({
        data: {
          user: {
            repositories: {
              pageInfo: { hasNextPage, endCursor: hasNextPage ? 'next' : null },
              nodes: [
                { languages: { edges: edges.map(([name, size]) => ({ size, node: { name } })) } },
              ],
            },
          },
        },
      }),
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        page(
          [
            ['TypeScript', 600],
            ['CSS', 100],
          ],
          true,
        ),
      )
      .mockResolvedValueOnce(
        page(
          [
            ['TypeScript', 200],
            ['Go', 300],
            ['CSS', 50],
          ],
          false,
        ),
      );
    vi.stubGlobal('fetch', fetchMock);

    const rendered = await renderWidgetStats(widget);

    expect(rendered.blocks[0].data).toEqual({
      username: 'octo',
      languages: [
        { name: 'TypeScript', percentage: 73 },
        { name: 'Go', percentage: 27 },
      ],
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).variables.cursor).toBe('next');
  });

  it('reports a missing GitHub user from the GraphQL response', async () => {
    process.env.GITHUB_TOKEN = 'token';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { user: null }, errors: [{ message: 'Could not resolve' }] }),
      }),
    );

    const rendered = await renderWidgetStats(widget);

    expect(rendered.blocks[0].error).toBe('GitHub profile not found');
  });

  it('falls back to repository sizes without a token', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { language: 'Rust', size: 30, fork: false },
          { language: 'C', size: 10, fork: false },
          { language: 'Go', size: 500, fork: true },
        ],
      }),
    );

    const rendered = await renderWidgetStats(widget);

    expect(rendered.blocks[0].data).toMatchObject({
      languages: [
        { name: 'Rust', percentage: 75 },
        { name: 'C', percentage: 25 },
      ],
    });
  });
});
