import path from 'node:path';

import { expect, it } from 'vitest';

import { resolveAliases } from './resolve-aliases.mjs';

const outDir = path.resolve('dist/src');

it('rewrites server and shared aliases relative to the importing file', () => {
  const file = path.join(outDir, 'services', 'widgetService.js');
  const source = [
    "import { prisma } from '@server/lib/prisma.js';",
    "export { blockVariant } from '@shared/widget/blockSizes.js';",
    "const theme = await import('@shared/widget/theme.js');",
    "import 'node:crypto';",
  ].join('\n');

  expect(resolveAliases(source, file)).toBe(
    [
      "import { prisma } from '../lib/prisma.js';",
      "export { blockVariant } from '../shared/widget/blockSizes.js';",
      "const theme = await import('../shared/widget/theme.js');",
      "import 'node:crypto';",
    ].join('\n'),
  );
});

it('uses ./ for files in the same directory', () => {
  const file = path.join(outDir, 'app.js');
  expect(resolveAliases("import { authRouter } from '@server/routes/auth.js';", file)).toBe(
    "import { authRouter } from './routes/auth.js';",
  );
});
