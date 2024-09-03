"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventBusListeners = exports.EventBus = void 0;
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
var EventBus = function (opt) {
    var _a;
    var bus = {};
    var show_log = (_a = opt === null || opt === void 0 ? void 0 : opt.log) !== null && _a !== void 0 ? _a : false;
    var on = function (key, handler, name, type) {
        if (type === void 0) { type = 'DEFAULT'; }
        show_log && console.log("[EVENT_BUS].on,", key, type);
        if (!bus[key])
            bus[key] = []; // 初始化
        bus[key].push({
            alias: name || 'anonymous',
            func: handler,
            type: type,
        });
        var listener = {
            cancel: function () { return off(key, handler); },
        };
        return listener;
    };
    var off = function (key, handler) {
        var _a, _b, _c;
        var index = (_b = (_a = bus[key]) === null || _a === void 0 ? void 0 : _a.findIndex(function (item) { return item.func === handler; })) !== null && _b !== void 0 ? _b : -1;
        index !== -1 && ((_c = bus[key]) === null || _c === void 0 ? void 0 : _c.splice(index, 1));
    };
    var once = function (key, handler) {
        var handleOnce = function () {
            var payload = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                payload[_i] = arguments[_i];
            }
            handler.apply(void 0, payload);
            setTimeout(function () {
                listener.cancel();
            }, 0);
        };
        var listener = on(key, handleOnce);
        return listener;
    };
    var on_unique = function (key, handler, name) {
        return on(key, handler, name, 'UNIQUE');
    };
    var on_stack = function (key, handler, name) {
        return on(key, handler, name, 'STACK');
    };
    var emit = function (key) {
        var payload = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            payload[_i - 1] = arguments[_i];
        }
        show_log && console.log.apply(console, __spreadArray(['[EVENT_BUS].emit', key], payload, false));
        var arr = bus[key];
        if (!arr)
            return;
        var stack_fn;
        for (var index = 0; index < arr.length; index++) {
            var fn = arr[index];
            try {
                switch (fn.type) {
                    default:
                    case 'DEFAULT':
                        fn.func.apply(fn, payload);
                        continue;
                    case 'UNIQUE':
                        fn.func.apply(fn, payload);
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
                stack_fn.apply(void 0, payload);
            }
            catch (e) {
                console.error(e);
            }
        }
    };
    return { on: on, once: once, emit: emit, off: off, on_unique: on_unique, on_stack: on_stack, bus: bus };
};
exports.EventBus = EventBus;
;
var EventBusListeners = function () {
    var list = [];
    var push = function () {
        var item = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            item[_i] = arguments[_i];
        }
        return list.push.apply(list, item);
    };
    var destory = function () { return list.splice(0, list.length).forEach(function (item) { return item.cancel(); }); };
    return { push: push, destory: destory };
};
exports.EventBusListeners = EventBusListeners;
