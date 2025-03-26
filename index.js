"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrettyEventBus = exports.EventBusListeners = exports.EventBus = void 0;
/**
 * 创建一个EventBus，用于事件订阅
 * @example
 * const event = EventBus<{
 *     plus: (delta: number) => void,
 *     minus: (delta1: number, delta2: number) => void
 * }>();
 *
 * event.emit('plus', 1)
 * event.emit('minus', 1, 1)
 *
 * const listener = event.on('plus', (delta) => {...});
 * listener.cancel(); // 取消监听
 */
const EventBus = (opt) => {
    var _a;
    const bus = {};
    const show_log = (_a = opt === null || opt === void 0 ? void 0 : opt.log) !== null && _a !== void 0 ? _a : false;
    const logFormat = (opt === null || opt === void 0 ? void 0 : opt.logger) || ((data, ...payload) => {
        console.log(`[EVENT_BUS] ${data.action} ${data.key}`, ...payload);
    });
    const on = (key, handler, name, type = 'DEFAULT') => {
        show_log && logFormat({ action: 'on', key: String(key), type: type });
        if (!bus[key])
            bus[key] = []; // 初始化
        const data = bus[key].find(item => item.alias === name);
        if (data) {
            data.func = handler;
            data.type = type;
        }
        else {
            bus[key].push({
                alias: name || '@anonymous',
                func: handler,
                type: type,
            });
        }
        const listener = {
            cancel: () => off(key, handler),
        };
        return listener;
    };
    const off = (key, handler) => {
        var _a;
        const arr = bus[key];
        if (!arr)
            return;
        const index = (_a = arr.findIndex((item) => item.func === handler)) !== null && _a !== void 0 ? _a : -1;
        index !== -1 && arr.splice(index, 1);
        show_log && logFormat({ action: 'off', key: String(key) });
    };
    const once = (key, handler) => {
        const handleOnce = (...payload) => {
            handler(...payload);
            setTimeout(() => {
                listener.cancel();
            }, 0);
        };
        const listener = on(key, handleOnce);
        return listener;
    };
    const on_unique = (key, handler, name) => {
        return on(key, handler, name, 'UNIQUE');
    };
    const on_stack = (key, handler, name) => {
        return on(key, handler, name, 'STACK');
    };
    const emit = (key, ...payload) => {
        show_log && logFormat({ action: 'emit', key: String(key) }, ...payload);
        const arr = bus[key];
        if (!arr)
            return;
        let stack_fn;
        for (let index = 0; index < arr.length; index++) {
            const fn = arr[index];
            try {
                switch (fn.type) {
                    default:
                    case 'DEFAULT':
                        fn.func(...payload);
                        continue;
                    case 'UNIQUE':
                        fn.func(...payload);
                        return;
                    case 'STACK':
                        stack_fn = fn.func;
                        continue;
                }
            }
            catch (e) {
                console.error(e);
            }
        }
        if (stack_fn) {
            try {
                stack_fn(...payload);
            }
            catch (e) {
                console.error(e);
            }
        }
    };
    return { on, once, emit, off, on_unique, on_stack, bus, timestamp: Date.now() };
};
exports.EventBus = EventBus;
;
const EventBusListeners = () => {
    const list = [];
    const push = (...item) => list.push(...item);
    const destory = () => list.splice(0, list.length).forEach(item => item.cancel());
    return { push, destory };
};
exports.EventBusListeners = EventBusListeners;
class PrettyEventBus {
    constructor() {
    }
}
exports.PrettyEventBus = PrettyEventBus;
