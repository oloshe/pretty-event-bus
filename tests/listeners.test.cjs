const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
    createListenerGroup,
    EventBusListeners,
} = require('../dist/cjs/listeners.js');

test('listener group adds, destroys, and keeps compatibility aliases', () => {
    const calls = [];
    const group = createListenerGroup();
    const first = { active: true, cancel: () => calls.push('first'), unsubscribe() {} };
    const second = { active: true, cancel: () => calls.push('second'), unsubscribe() {} };

    assert.equal(group.add(first), 1);
    assert.equal(group.push(second), 2);
    assert.equal(group.size, 2);
    group.destory();
    assert.equal(group.size, 0);
    group.destroy();
    assert.deepEqual(calls, ['first', 'second']);
    assert.equal(EventBusListeners, createListenerGroup);
});

test('listener group continues cleanup after a cancellation error', () => {
    const errors = [];
    let cancelled = false;
    const group = createListenerGroup({ onError: (error) => errors.push(error.message) });
    group.add(
        { active: true, cancel: () => { throw new Error('cancel failed'); }, unsubscribe() {} },
        { active: true, cancel: () => { cancelled = true; }, unsubscribe() {} },
    );

    group.destroy();
    assert.equal(cancelled, true);
    assert.deepEqual(errors, ['cancel failed']);
});
test('listener group uses console.error when no error handler is provided', () => {
    const originalError = console.error;
    const errors = [];
    console.error = (error) => errors.push(error);
    try {
        const group = createListenerGroup();
        group.add({
            active: true,
            cancel: () => { throw new Error('default cleanup error'); },
            unsubscribe() {},
        });
        group.destroy();
        assert.equal(errors.length, 1);
        assert.equal(errors[0].message, 'default cleanup error');
    } finally {
        console.error = originalError;
    }
});