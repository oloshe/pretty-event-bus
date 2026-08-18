const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createEventBus, EventBus } = require('../dist/cjs/index.js');

test('legacy and new factories expose the same typed runtime surface', () => {
    assert.equal(typeof createEventBus, 'function');
    assert.equal(EventBus, createEventBus);
});

test('default listeners all receive a dispatch and emit returns the count', () => {
    const bus = createEventBus();
    const calls = [];
    bus.on('message', (value) => calls.push(`a:${value}`));
    bus.on('message', (value) => calls.push(`b:${value}`));

    assert.equal(bus.emit('message', 3), 2);
    assert.deepEqual(calls, ['a:3', 'b:3']);
});

test('dispatch uses a snapshot when a listener cancels itself', () => {
    const bus = createEventBus();
    const calls = [];
    let first;
    first = bus.on('change', () => {
        calls.push('first');
        first.cancel();
    });
    bus.on('change', () => calls.push('second'));

    assert.equal(bus.emit('change'), 2);
    assert.equal(bus.emit('change'), 1);
    assert.deepEqual(calls, ['first', 'second', 'second']);
});

test('once cancels before invocation for sync, re-entrant, and throwing handlers', () => {
    const errors = [];
    const bus = createEventBus({ onError: (error) => errors.push(error) });
    let calls = 0;
    bus.once('nested', () => {
        calls += 1;
        bus.emit('nested');
    });
    assert.equal(bus.emit('nested'), 1);
    assert.equal(bus.emit('nested'), 0);
    assert.equal(calls, 1);

    bus.once('throwing', () => {
        throw new Error('once failure');
    });
    assert.equal(bus.emit('throwing'), 1);
    assert.equal(bus.emit('throwing'), 0);
    assert.equal(errors.length, 1);
});

test('named replacement has explicit generation-safe cancellation', () => {
    const bus = createEventBus();
    const calls = [];
    const stale = bus.on('refresh', () => calls.push('old'), 'view');
    const current = bus.on('refresh', () => calls.push('new'), 'view');

    assert.equal(stale.active, false);
    assert.equal(current.active, true);
    stale.cancel();
    assert.equal(bus.emit('refresh'), 1);
    current.unsubscribe();
    assert.equal(bus.emit('refresh'), 0);
    assert.deepEqual(calls, ['new']);
});

test('unique and stack aliases preserve their selection semantics', () => {
    const uniqueBus = createEventBus();
    const uniqueCalls = [];
    uniqueBus.onUnique('save', () => uniqueCalls.push('first'));
    uniqueBus.on_unique('save', () => uniqueCalls.push('second'));
    assert.equal(uniqueBus.emit('save'), 1);
    assert.deepEqual(uniqueCalls, ['first']);

    const stackBus = createEventBus();
    const stackCalls = [];
    stackBus.onStack('route', () => stackCalls.push('old'));
    stackBus.on_stack('route', () => stackCalls.push('latest'));
    assert.equal(stackBus.emit('route'), 1);
    assert.deepEqual(stackCalls, ['latest']);
});

test('emitAsync awaits handlers in order and reports rejections', async () => {
    const errors = [];
    const calls = [];
    const bus = createEventBus({
        onError: (error, context) => errors.push([error.message, context.phase]),
    });
    bus.on('load', async () => {
        await Promise.resolve();
        calls.push('first');
    });
    bus.on('load', async () => {
        calls.push('second');
        throw new Error('load failed');
    });

    assert.equal(await bus.emitAsync('load'), 2);
    assert.deepEqual(calls, ['first', 'second']);
    assert.deepEqual(errors, [['load failed', 'emitAsync']]);
});

test('listenerCount and clear expose safe lifecycle controls', () => {
    const bus = createEventBus();
    bus.on('a', () => {});
    bus.on('b', () => {});
    assert.equal(bus.listenerCount(), 2);
    assert.equal(bus.listenerCount('a'), 1);
    bus.clear('a');
    assert.equal(bus.listenerCount(), 1);
    bus.clear();
    assert.equal(bus.listenerCount(), 0);
});
test('logging supports the default and custom logger paths', async () => {
    const originalLog = console.log;
    const defaultLogs = [];
    console.log = (...args) => defaultLogs.push(args);
    try {
        const bus = createEventBus({ log: true });
        const listener = bus.on('logged', () => {});
        assert.equal(bus.emit('logged', 'sync'), 1);
        assert.equal(await bus.emitAsync('logged', 'async'), 1);
        listener.cancel();
        assert.equal(defaultLogs.length, 4);
    } finally {
        console.log = originalLog;
    }

    const customLogs = [];
    const bus = createEventBus({
        log: true,
        logger: (data, ...payload) => customLogs.push([data, ...payload]),
    });
    const listener = bus.on('custom', () => {});
    bus.emit('custom', 1);
    listener.cancel();
    assert.equal(customLogs.length, 3);
});

test('default error handling isolates a throwing listener', () => {
    const originalError = console.error;
    const errors = [];
    console.error = (error) => errors.push(error);
    try {
        const bus = createEventBus();
        bus.on('failure', () => { throw new Error('expected failure'); });
        assert.equal(bus.emit('failure'), 1);
        assert.equal(errors.length, 1);
        assert.equal(errors[0].message, 'expected failure');
    } finally {
        console.error = originalError;
    }
});

test('off and subscriptions cover missing, removed, and repeated cleanup paths', () => {
    const bus = createEventBus();
    const shared = () => {};
    const missing = () => {};

    bus.off('missing-event', missing);
    const first = bus.on('event', shared);
    const second = bus.on('event', shared);
    bus.off('event', missing);
    bus.off('event', shared);
    assert.equal(first.active, false);
    first.cancel();
    first.cancel();

    assert.equal(second.active, true);
    bus.clear('event');
    assert.equal(second.active, false);
    second.cancel();
    second.cancel();
    assert.equal(bus.listenerCount('missing-event'), 0);
    assert.deepEqual(bus.bus, {});
});

test('emitAsync supports UNIQUE and STACK selection modes', async () => {
    const uniqueBus = createEventBus();
    const uniqueCalls = [];
    uniqueBus.onUnique('save', async () => uniqueCalls.push('first'));
    uniqueBus.on('save', async () => uniqueCalls.push('second'));
    assert.equal(await uniqueBus.emitAsync('save'), 1);
    assert.deepEqual(uniqueCalls, ['first']);

    const stackBus = createEventBus();
    const stackCalls = [];
    stackBus.onStack('route', async () => stackCalls.push('old'));
    stackBus.onStack('route', async () => stackCalls.push('latest'));
    assert.equal(await stackBus.emitAsync('route'), 1);
    assert.deepEqual(stackCalls, ['latest']);
    assert.equal(await stackBus.emitAsync('missing'), 0);
});