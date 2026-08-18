import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const esmDirectory = resolve(projectRoot, 'dist', 'esm');
await mkdir(esmDirectory, { recursive: true });
await writeFile(
    resolve(esmDirectory, 'package.json'),
    `${JSON.stringify({ type: 'module' }, null, 2)}\n`,
    'utf8',
);