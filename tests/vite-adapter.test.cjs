const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createViteEventBus } = require('../dist/cjs/vite.js');

test('vite adapter reuses a bus by hot data and key', () => {
    const hot = { data: {} };
    const first = createViteEventBus(hot, 'app');
    const second = createViteEventBus(hot, 'app');
    const other = createViteEventBus(hot, 'other');

    assert.equal(first, second);
    assert.notEqual(first, other);
});

test('vite adapter needs no Vite runtime and accepts undefined', () => {
    const first = createViteEventBus(undefined, 'app');
    const second = createViteEventBus(undefined, 'app');
    assert.notEqual(first, second);
});