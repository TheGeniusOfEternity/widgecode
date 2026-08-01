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

  const response = await agent
    .post('/api/widgets')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: 'GitHub overview',
      source: 'github',
      username: 'octocat',
      presetId: 'github-overview',
    })
    .expect(201);

  expect(response.body.widget.slug).toContain('gh-stats-github-overview-');
  expect(prismaMocks.widget.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({ title: 'GitHub overview', userId: user.id }),
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

it('rejects adding a sixth block', async () => {
  const { agent, token } = await authenticatedAgent();
  prismaMocks.widget.findFirst.mockResolvedValue({
    id: widget.id,
    userId: user.id,
    config: { grid: { columns: 1 }, palette: 'lavender', renderFormat: 'iframe' },
    blocks: Array.from({ length: 5 }, (_, index) => ({
      id: `block-${index}`,
      position: index,
      type: 'text',
      config: { text: `Block ${index}`, layout: { x: 0, y: index, width: 1, height: 1 } },
    })),
  });

  await agent
    .post(`/api/widgets/${widget.id}/blocks`)
    .set('Authorization', `Bearer ${token}`)
    .send({ type: 'text', config: { text: 'Too many' } })
    .expect(400, { error: 'A widget can contain at most 5 blocks' });
});
