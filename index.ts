type EventKey = string | symbol;
type EventHandler<T = any> = (...payload: T[]) => void;
type EventMap = Record<EventKey, EventHandler>;
type ListenType = 'DEFAULT' | 'UNIQUE' | 'STACK';
type ListenerType<E> = {
    alias: string;
    func: E[keyof E];
    type: ListenType;
};
type Bus<E> = Record<keyof E, ListenerType<E>[]>;
type CancelFunc = () => void;

/** 
 * 获取 EventBus 的事件类型
 */
export type GetEventBusKey<T> = T extends EventBus<infer P> ? keyof P : unknown;

export interface EventBus<T extends EventMap> {
    /** 监听事件 */
    on<Key extends keyof T>(key: Key, handler: T[Key], name?: string, type?: ListenType): BusListener;
    /** 监听事件，如果有重复的，则不执行后面监听 */
    on_unique<Key extends keyof T>(key: Key, handler: T[Key], name?: string): BusListener;
    /** 监听事件，如果有重复的，则只执行最后一次监听的，前面的需要等最后的取消监听才会执行 */
    on_stack<Key extends keyof T>(key: Key, handler: T[Key], name?: string): BusListener;
    /** 监听事件，触发一次之后自动取消 */
    once<Key extends keyof T>(key: Key, handler: T[Key]): BusListener;
    /** 取消监听事件 */
    off<Key extends keyof T>(key: Key, handler: T[Key]): void;
    /** 触发事件 */
    emit<Key extends keyof T>(key: Key, ...payload: Parameters<T[Key]>): void;
    /** 数据 */
    readonly bus: Partial<Bus<T>>;
    /** 创建该eventbus时的时间戳，用于方便比较两个bus是否为同一个 */
    readonly timestamp: number;
}

export interface BusListener {
    /** 取消监听 */
    cancel: CancelFunc;
}

export interface EventBusOptions {
    /** 是否打印在控制台 */
    log?: boolean | undefined;
    /** 打印的实现方法 */
    logger?: (data: LogData, ...payload: any[]) => void;
}

type LogData = LogDataOn | ILogData;

interface LogDataOn {
    action: 'on'
    /** 键 */
    key: string;
    /** action为on时的类型 */
    type: string;
}

interface ILogData {
    /** 调用的方法 */
    action: 'off' | 'emit';
    /** 键 */
    key: string;
}

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
export const EventBus = <T extends EventMap>(opt?: EventBusOptions): EventBus<T> => {
    const bus: Partial<Bus<T>> = {};
    const show_log = opt?.log ?? false;
    const logFormat = opt?.logger || ((data, ...payload) => {
        console.log(`[EVENT_BUS] ${data.action} ${data.key}`, ...payload);
    });
    const on: EventBus<T>['on'] = (key, handler, name, type = 'DEFAULT') => {
        show_log && logFormat({ action: 'on', key: String(key), type: type });
        if (!bus[key]) bus[key] = []; // 初始化
        bus[key]!.push({
            alias: name || 'anonymous',
            func: handler,
            type: type,
        });
        const listener: BusListener = {
            cancel: () => off(key, handler),
        };
        return listener;
    };
    const off: EventBus<T>['off'] = (key, handler) => {
        const arr = bus[key];
        if (!arr) return;
        const index = arr.findIndex((item) => item.func === handler) ?? -1;
        index !== -1 && arr.splice(index, 1);
        show_log && logFormat({ action: 'off', key: String(key) })
    };
    const once: EventBus<T>['once'] = (key, handler) => {
        const handleOnce = (...payload: Parameters<typeof handler>) => {
            handler(...payload);
            setTimeout(() => {
                listener.cancel();
            }, 0);
        };
        const listener = on(key, handleOnce as typeof handler);
        return listener;
    };
    const on_unique: EventBus<T>['on_unique'] = (key, handler, name) => {
        return on(key, handler, name, 'UNIQUE');
    };
    const on_stack: EventBus<T>['on_stack'] = (key, handler, name) => {
        return on(key, handler, name, 'STACK');
    };
    const emit: EventBus<T>['emit'] = (key, ...payload) => {
        show_log && logFormat({ action: 'emit', key: String(key) }, ...payload);
        const arr = bus[key];
        if (!arr) return;
        let stack_fn: T[keyof T] | undefined;
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
            } catch (e) {
                console.error(e);
            }
        }
        if (stack_fn) {
            try {
                stack_fn(...payload);
            } catch (e) {
                console.error(e);
            }
        }
    };
    return { on, once, emit, off, on_unique, on_stack, bus, timestamp: Date.now() } as EventBus<T>;
};

export interface BusListeners {
    push: (...item: BusListener[]) => number;
    destory: () => void;
};

export const EventBusListeners = (): BusListeners => {
    const list: BusListener[] = [];
    const push = (...item: BusListener[]) => list.push(...item);
    const destory = () => list.splice(0, list.length).forEach(item => item.cancel());
    return { push, destory };
}