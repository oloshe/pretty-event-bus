const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const { test } = require('node:test');

test('package self-references resolve for CommonJS', () => {
    const core = require('pretty-event-bus');
    assert.equal(typeof core.createEventBus, 'function');
    assert.equal(typeof core.createListenerGroup, 'function');
    assert.equal(core.EventBusListeners, core.createListenerGroup);
    assert.equal(typeof require('pretty-event-bus/listeners').createListenerGroup, 'function');
    assert.equal(typeof require('pretty-event-bus/vite').createViteEventBus, 'function');
});

test('package self-reference resolves for ESM', async () => {
    const core = await import('pretty-event-bus');
    const listeners = await import('pretty-event-bus/listeners');
    assert.equal(typeof core.createEventBus, 'function');
    assert.equal(typeof listeners.createListenerGroup, 'function');
});

test('core outputs have no environment-specific HMR references', async () => {
    const files = [
        'dist/cjs/index.js',
        'dist/cjs/event-bus.js',
        'dist/cjs/listeners.js',
        'dist/esm/index.js',
        'dist/esm/event-bus.js',
        'dist/esm/listeners.js',
    ];
    for (const file of files) {
        const source = await readFile(file, 'utf8');
        assert.doesNotMatch(source, /import\.meta|ViteHotContext|\.\/vite/);
    }
});