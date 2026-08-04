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
