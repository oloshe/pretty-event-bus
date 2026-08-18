import { rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = resolve(projectRoot, 'dist');

if (dirname(outputDirectory) !== projectRoot) {
    throw new Error(`Refusing to remove unexpected path: ${outputDirectory}`);
}

await rm(outputDirectory, { recursive: true, force: true });