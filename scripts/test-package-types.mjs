import { cp, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const temporaryRoot = await mkdtemp(join(tmpdir(), 'pretty-event-bus-types-'));
const packageDirectory = join(temporaryRoot, 'package');
const consumerDirectory = join(temporaryRoot, 'consumer');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(command, args, cwd) {
    const result = spawnSync(command, args, {
        cwd,
        encoding: 'utf8',
        shell: process.platform === 'win32' && command.endsWith('.cmd'),
        stdio: 'pipe',
    });
    if (result.status !== 0) {
        process.stderr.write(result.stdout ?? '');
        process.stderr.write(result.stderr ?? '');
        throw new Error(`${command} ${args.join(' ')} failed with ${result.status}`);
    }
    return result.stdout;
}

try {
    await mkdir(packageDirectory, { recursive: true });
    await mkdir(consumerDirectory, { recursive: true });
    const packOutput = run(
        npmCommand,
        ['pack', '--json', '--ignore-scripts', '--pack-destination', packageDirectory],
        projectRoot,
    );
    const packed = JSON.parse(packOutput);
    const tarball = join(packageDirectory, packed[0].filename);

    await writeFile(
        join(consumerDirectory, 'package.json'),
        `${JSON.stringify({ private: true }, null, 2)}\n`,
        'utf8',
    );
    run(
        npmCommand,
        ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--no-package-lock', tarball],
        consumerDirectory,
    );

    run(
        process.execPath,
        [
            '-e',
            "const core=require('pretty-event-bus'); const listeners=require('pretty-event-bus/listeners'); const vite=require('pretty-event-bus/vite'); if(!core.createEventBus||!listeners.createListenerGroup||!vite.createViteEventBus) process.exit(1)",
        ],
        consumerDirectory,
    );
    run(
        process.execPath,
        [
            '--input-type=module',
            '-e',
            "const core=await import('pretty-event-bus'); const listeners=await import('pretty-event-bus/listeners'); if(!core.createEventBus||!listeners.createListenerGroup) process.exit(1)",
        ],
        consumerDirectory,
    );

    await cp(
        resolve(projectRoot, 'tests', 'types', 'consumer.ts'),
        join(consumerDirectory, 'consumer.ts'),
    );
    for (const config of [
        'tsconfig.node.json',
        'tsconfig.node16.json',
        'tsconfig.bundler.json',
    ]) {
        await cp(
            resolve(projectRoot, 'tests', 'types', config),
            join(consumerDirectory, config),
        );
        run(
            process.execPath,
            [resolve(projectRoot, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', config],
            consumerDirectory,
        );
    }
} finally {
    const resolvedTemporaryRoot = resolve(temporaryRoot);
    if (dirname(resolvedTemporaryRoot) !== resolve(tmpdir())) {
        throw new Error(`Refusing to remove unexpected path: ${resolvedTemporaryRoot}`);
    }
    await rm(resolvedTemporaryRoot, { recursive: true, force: true });
}