// Rewrites the `@server/*` and `@shared/*` path aliases in compiled output to relative paths.
// TypeScript leaves aliases as written, and Node can't resolve them at runtime. (Replaces
// tsc-alias, whose dependency chain carried an unpatched `braces` advisory.)
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outDir = path.join(serverRoot, 'dist', 'src');
const aliases = { '@server/': outDir, '@shared/': path.join(outDir, 'shared') };

// Static imports/exports and dynamic import() with a string literal.
const specifier = /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(['"])(@server\/|@shared\/)([^'"]+)\2/g;

const filesIn = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const full = path.join(directory, entry.name);
      return entry.isDirectory() ? filesIn(full) : [full];
    }),
  );
  return nested.flat();
};

export const resolveAliases = (source, file) =>
  source.replace(specifier, (_match, prefix, quote, alias, rest) => {
    let relative = path.relative(path.dirname(file), path.join(aliases[alias], rest));
    if (!relative.startsWith('.')) relative = `./${relative}`;
    return `${prefix}${quote}${relative.split(path.sep).join('/')}${quote}`;
  });

const run = async () => {
  const files = (await filesIn(outDir)).filter((file) => /\.(js|d\.ts)$/.test(file));
  let changed = 0;
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    const output = resolveAliases(source, file);
    if (output !== source) {
      await writeFile(file, output);
      changed += 1;
    }
  }
  console.log(`resolve-aliases: rewrote ${changed} file(s)`);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) await run();
