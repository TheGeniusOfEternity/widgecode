import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const envCandidates = [
  path.resolve(process.cwd(), '../.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(moduleDirectory, '../../../.env'),
  path.resolve(moduleDirectory, '../../../../.env'),
];

const projectRootEnv = envCandidates.find((candidate) => fs.existsSync(candidate));

if (projectRootEnv) dotenv.config({ path: projectRootEnv });
