import request from 'supertest';

import { createApp } from '@server/app.js';

const prismaMocks = vi.hoisted(() => ({
  user: { create: vi.fn(), findUnique: vi.fn() },
  authSession: { create: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn() },
  widget: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  block: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn(), delete: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock('@server/lib/prisma.js', () => ({ prisma: prismaMocks }));
// Email flows are covered in emailFlows.test.ts; keep sign-up here free of mail side effects.
vi.mock('@server/lib/mailer.js', () => ({ isEmailEnabled: () => false, sendEmail: vi.fn() }));

const app = createApp();
const user = { id: 'user-1', email: 'person@example.com', name: 'Person' };
const widget = {
  id: 'widget-1',
  userId: user.id,
  title: 'GitHub overview',
  slug: 'gh-stats-github-overview-a1b2c3',
  width: 600,
  height: 400,
  public: false,
  config: {
    sources: { github: { username: 'octocat' } },
    palette: 'lavender',
    renderFormat: 'iframe',
    presetId: 'github-overview',
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  blocks: [],
};

beforeEach(() => {
  process.env.JWT_SECRET = 'test-access-secret';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  vi.clearAllMocks();
  prismaMocks.$transaction.mockImplementation((operations: Promise<unknown>[]) =>
    Promise.all(operations),
  );
});

const authenticatedAgent = async () => {
  prismaMocks.user.create.mockResolvedValue(user);
  prismaMocks.authSession.create.mockResolvedValue({});
  const agent = request.agent(app);
  const response = await agent
    .post('/api/auth/register')
    .send({ email: user.email, password: 'secret123' })
    .expect(201);
  return { agent, token: response.body.accessToken as string };
};

it('creates a widget with preset blocks and a generated slug', async () => {
  const { agent, token } = await authenticatedAgent();
  prismaMocks.widget.findUnique.mockResolvedValue(null);
  prismaMocks.widget.create.mockResolvedValue(widget);

  await agent
    .post('/api/widgets')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: 'GitHub overview',
      username: 'octocat',
      presetId: 'github-overview',
    })
    .expect(201);

  expect(prismaMocks.widget.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        title: 'GitHub overview',
        userId: user.id,
        slug: expect.stringContaining('gh-stats-github-stats-github-langs-'),
      }),
    }),
  );
  const createCall = prismaMocks.widget.create.mock.calls[0]?.[0] as {
    data: {
      width: number;
      height: number;
      blocks: { create: { config: { layout: { width: number; height: number } } }[] };
    };
  };
  expect(createCall.data.width).toBe(600);
  // Two default 2×2 blocks side by side: 2 rows.
  expect(createCall.data.height).toBe(318);
  expect(createCall.data.blocks.create).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        config: expect.objectContaining({ layout: { x: 0, y: 0, width: 2, height: 2 } }),
      }),
      expect.objectContaining({
        config: expect.objectContaining({ layout: { x: 2, y: 0, width: 2, height: 2 } }),
      }),
    ]),
  );
});

it('places a new block at the first free spot with the default size', async () => {
  const { agent, token } = await authenticatedAgent();
  prismaMocks.widget.findFirst.mockResolvedValue({
    id: widget.id,
    userId: user.id,
    config: { grid: { columns: 4 }, palette: 'lavender', renderFormat: 'iframe' },
    blocks: [],
  });
  prismaMocks.block.create.mockResolvedValue({
    id: 'block-1',
    widgetId: widget.id,
    position: 0,
    type: 'text',
    config: { text: 'New block', layout: { x: 0, y: 0, width: 2, height: 2 } },
  });

  await agent
    .post(`/api/widgets/${widget.id}/blocks`)
    .set('Authorization', `Bearer ${token}`)
    .send({ type: 'text', config: { text: 'New block' } })
    .expect(201);

  expect(prismaMocks.block.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        // Text blocks default to 2×1.
        config: expect.objectContaining({ layout: { x: 0, y: 0, width: 2, height: 1 } }),
      }),
    }),
  );
});

it('uses the next position after the highest existing block position', async () => {
  const { agent, token } = await authenticatedAgent();
  prismaMocks.widget.findFirst.mockResolvedValue({
    id: widget.id,
    userId: user.id,
    config: { grid: { columns: 2 }, palette: 'lavender', renderFormat: 'iframe' },
    blocks: [
      {
        id: 'block-1',
        position: 0,
        type: 'text',
        config: { layout: { x: 0, y: 0, width: 1, height: 1 } },
      },
      {
        id: 'block-3',
        position: 2,
        type: 'text',
        config: { layout: { x: 0, y: 1, width: 1, height: 1 } },
      },
    ],
  });
  prismaMocks.block.create.mockResolvedValue({});

  await agent
    .post(`/api/widgets/${widget.id}/blocks`)
    .set('Authorization', `Bearer ${token}`)
    .send({ type: 'text', config: { text: 'Next block' } })
    .expect(201);

  expect(prismaMocks.block.create).toHaveBeenCalledWith(
    expect.objectContaining({ data: expect.objectContaining({ position: 3 }) }),
  );
});

it('previews a block without publishing the widget', async () => {
  const { agent, token } = await authenticatedAgent();
  prismaMocks.widget.findFirst.mockResolvedValue({
    id: widget.id,
    userId: user.id,
    config: { grid: { columns: 2 }, palette: 'lavender', renderFormat: 'iframe' },
    blocks: [],
  });

  const response = await agent
    .post(`/api/widgets/${widget.id}/preview`)
    .set('Authorization', `Bearer ${token}`)
    .send({ id: 'preview-block', type: 'github-stats', config: {} })
    .expect(200);

  expect(response.body.block).toEqual(
    expect.objectContaining({
      id: 'preview-block',
      error: 'Add a github username to this widget',
    }),
  );
});

it('does not expose another user widget through protected routes', async () => {
  const { agent, token } = await authenticatedAgent();
  prismaMocks.widget.findFirst.mockResolvedValue(null);

  await agent
    .get('/api/widgets/widget-owned-by-someone-else')
    .set('Authorization', `Bearer ${token}`)
    .expect(404, { error: 'Widget not found' });
  expect(prismaMocks.widget.findFirst).toHaveBeenCalledWith(
    expect.objectContaining({
      where: { id: 'widget-owned-by-someone-else', userId: user.id },
    }),
  );
});

it('deletes a widget through the protected route', async () => {
  const { agent, token } = await authenticatedAgent();
  prismaMocks.widget.findFirst.mockResolvedValue(widget);
  prismaMocks.widget.delete.mockResolvedValue(widget);

  await agent
    .delete(`/api/widgets/${widget.id}`)
    .set('Authorization', `Bearer ${token}`)
    .expect(204);

  expect(prismaMocks.widget.delete).toHaveBeenCalledWith({ where: { id: widget.id } });
});

it('rejects adding a ninth block', async () => {
  const { agent, token } = await authenticatedAgent();
  prismaMocks.widget.findFirst.mockResolvedValue({
    id: widget.id,
    userId: user.id,
    config: { grid: { columns: 4 }, palette: 'lavender', renderFormat: 'iframe' },
    blocks: Array.from({ length: 8 }, (_, index) => ({
      id: `block-${index}`,
      position: index,
      type: 'text',
      config: { text: `Block ${index}`, layout: { x: 0, y: index, width: 2, height: 2 } },
    })),
  });

  await agent
    .post(`/api/widgets/${widget.id}/blocks`)
    .set('Authorization', `Bearer ${token}`)
    .send({ type: 'text', config: { text: 'Too many' } })
    .expect(400, { error: 'A widget can contain at most 8 blocks' });
});

it('renders a public widget as an SVG image', async () => {
  const publicWidget = {
    ...widget,
    public: true,
    blocks: [
      {
        id: 'block-1',
        widgetId: widget.id,
        position: 0,
        type: 'text',
        config: {
          text: 'Readme & stats',
          align: 'left',
          layout: { x: 0, y: 0, width: 1, height: 1 },
        },
      },
    ],
  };
  prismaMocks.widget.findFirst.mockResolvedValue(publicWidget);

  const response = await request(app)
    .get(`/api/public/widgets/${publicWidget.slug}/image.svg`)
    .expect(200);

  expect(response.headers['content-type']).toMatch(/image\/svg\+xml/);
  expect(response.headers['cache-control']).toContain('max-age=900');
  const svg = response.body.toString('utf8');
  expect(svg).toContain('<svg');
  expect(svg).toContain('Readme &amp; stats');
});

it('inlines the GitHub avatar as a data URI in the public SVG image', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.startsWith('https://api.github.com/users/')) {
        return new Response(
          JSON.stringify({
            login: 'octocat',
            name: 'The Octocat',
            avatar_url: 'https://avatars.githubusercontent.com/u/583231?v=4',
            bio: 'Hello world',
            public_repos: 8,
            followers: 100,
            following: 9,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (url.startsWith('https://avatars.githubusercontent.com/')) {
        return new Response(Buffer.from([0x89, 0x50, 0x4e, 0x47]), {
          status: 200,
          headers: { 'Content-Type': 'image/png' },
        });
      }
      return new Response('Not found', { status: 404 });
    }),
  );

  const publicWidget = {
    ...widget,
    public: true,
    blocks: [
      {
        id: 'block-1',
        widgetId: widget.id,
        position: 0,
        type: 'github-stats',
        config: { layout: { x: 0, y: 0, width: 2, height: 2 } },
      },
    ],
  };
  prismaMocks.widget.findFirst.mockResolvedValue(publicWidget);

  const response = await request(app)
    .get(`/api/public/widgets/${publicWidget.slug}/image.svg`)
    .expect(200);

  const svg = response.body.toString('utf8');
  expect(svg).toContain('data:image/png;base64,');
  expect(svg).not.toContain('avatars.githubusercontent.com');
  expect(svg).toContain('The Octocat');

  vi.unstubAllGlobals();
});

it('reads the removed auto palette mode as light', async () => {
  const { widgetConfigSchema } = await import('@server/widgets/registry.js');

  expect(widgetConfigSchema.parse({ paletteMode: 'auto' }).paletteMode).toBe('light');
  expect(widgetConfigSchema.parse({}).paletteMode).toBe('light');
  expect(widgetConfigSchema.safeParse({ paletteMode: 'sepia' }).success).toBe(false);
});

it('does not expose the owner id in the public widget payload', async () => {
  prismaMocks.widget.findFirst.mockResolvedValue({ ...widget, public: true, blocks: [] });

  const response = await request(app).get(`/api/public/widgets/${widget.slug}`).expect(200);

  expect(response.body.widget.slug).toBe(widget.slug);
  expect(response.body.widget).not.toHaveProperty('userId');
});

it('accepts an empty text block while editing', async () => {
  const { agent, token } = await authenticatedAgent();
  const textBlock = {
    id: 'block-1',
    widgetId: widget.id,
    type: 'text',
    position: 0,
    config: { text: 'Hello', layout: { x: 0, y: 0, width: 1, height: 1 } },
    widget: { ...widget, blocks: [] },
  };
  prismaMocks.block.findFirst.mockResolvedValue(textBlock);
  prismaMocks.block.update.mockImplementation(async ({ data }: { data: unknown }) => ({
    ...textBlock,
    ...(data as object),
  }));

  await agent
    .put('/api/blocks/block-1')
    .set('Authorization', `Bearer ${token}`)
    .send({ config: { text: '', layout: { x: 0, y: 0, width: 1, height: 1 } } })
    .expect(200);
});

it('allows far more SVG image requests per IP than JSON widget requests', async () => {
  process.env.VERCEL = '1';
  const limitedApp = createApp();
  prismaMocks.widget.findFirst.mockResolvedValue(null);
  try {
    for (let attempt = 0; attempt < 121; attempt += 1) {
      await request(limitedApp)
        .get(`/api/public/widgets/${widget.slug}/image.svg`)
        .set('X-Forwarded-For', '198.51.100.7')
        .expect(404);
    }
    await request(limitedApp)
      .get(`/api/public/widgets/${widget.slug}`)
      .set('X-Forwarded-For', '198.51.100.7')
      .expect(404);
  } finally {
    delete process.env.VERCEL;
  }
});

describe('grid layout rules', () => {
  const blockAt = (id: string, layout: Record<string, number>) => ({
    id,
    widgetId: widget.id,
    position: 0,
    type: 'text',
    config: { text: id, layout },
  });
  const widgetWith = (blocks: ReturnType<typeof blockAt>[]) => ({
    ...widget,
    config: { grid: { columns: 4 }, palette: 'lavender', renderFormat: 'iframe' },
    blocks,
  });
  const reorder = async (layouts: { blockId: string; layout: Record<string, number> }[]) => {
    const { agent, token } = await authenticatedAgent();
    return agent
      .put(`/api/widgets/${widget.id}/blocks`)
      .set('Authorization', `Bearer ${token}`)
      .send({ columns: 4, layouts });
  };

  it('rejects sizes the block type does not support', async () => {
    prismaMocks.widget.findFirst.mockResolvedValue(
      widgetWith([blockAt('a', { x: 0, y: 0, width: 2, height: 2 })]),
    );

    const response = await reorder([{ blockId: 'a', layout: { x: 0, y: 0, width: 3, height: 3 } }]);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("This block can't be 3×3");
  });

  it('rejects layouts taller than 5 rows', async () => {
    prismaMocks.widget.findFirst.mockResolvedValue(
      widgetWith([blockAt('a', { x: 0, y: 0, width: 2, height: 2 })]),
    );

    const response = await reorder([{ blockId: 'a', layout: { x: 0, y: 4, width: 2, height: 2 } }]);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('A widget can be at most 5 rows tall');
  });

  it('keeps migrated widgets that are already taller editable, but not taller still', async () => {
    const tall = widgetWith([
      blockAt('a', { x: 0, y: 0, width: 2, height: 2 }),
      blockAt('b', { x: 0, y: 4, width: 2, height: 2 }),
    ]);
    prismaMocks.widget.findFirst.mockResolvedValue(tall);

    const same = await reorder([
      { blockId: 'a', layout: { x: 2, y: 0, width: 2, height: 2 } },
      { blockId: 'b', layout: { x: 0, y: 4, width: 2, height: 2 } },
    ]);
    expect(same.status).toBe(200);

    const taller = await reorder([
      { blockId: 'a', layout: { x: 0, y: 0, width: 2, height: 2 } },
      { blockId: 'b', layout: { x: 0, y: 6, width: 2, height: 2 } },
    ]);
    expect(taller.status).toBe(400);
  });
});

it('places a new block in a smaller size when the default does not fit', async () => {
  const { agent, token } = await authenticatedAgent();
  // Four 2×2 blocks fill rows 0–3; only the single 5th row is left.
  prismaMocks.widget.findFirst.mockResolvedValue({
    ...widget,
    config: { grid: { columns: 4 }, palette: 'lavender', renderFormat: 'iframe' },
    blocks: [0, 1, 2, 3].map((index) => ({
      id: `block-${index}`,
      position: index,
      type: 'text',
      config: {
        text: 'x',
        layout: { x: (index % 2) * 2, y: Math.floor(index / 2) * 2, width: 2, height: 2 },
      },
    })),
  });
  prismaMocks.block.create.mockImplementation(async ({ data }: { data: unknown }) => ({
    id: 'new',
    ...(data as object),
  }));

  await agent
    .post(`/api/widgets/${widget.id}/blocks`)
    .set('Authorization', `Bearer ${token}`)
    .send({ type: 'github-stats', config: {} })
    .expect(201);

  expect(prismaMocks.block.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        config: expect.objectContaining({ layout: { x: 0, y: 4, width: 4, height: 1 } }),
      }),
    }),
  );
});

it('saves layouts for up to 8 blocks', async () => {
  const { agent, token } = await authenticatedAgent();
  const blocks = Array.from({ length: 8 }, (_, index) => ({
    id: `block-${index}`,
    widgetId: widget.id,
    position: index,
    type: 'text',
    config: { text: 'x', layout: { x: index % 4, y: Math.floor(index / 4), width: 1, height: 1 } },
  }));
  prismaMocks.widget.findFirst.mockResolvedValue({
    ...widget,
    config: { grid: { columns: 4 }, palette: 'lavender', renderFormat: 'iframe' },
    blocks,
  });

  await agent
    .put(`/api/widgets/${widget.id}/blocks`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      columns: 4,
      layouts: blocks.map((block) => ({ blockId: block.id, layout: block.config.layout })),
    })
    .expect(200);
});
