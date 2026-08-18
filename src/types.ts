export type EventKey = string | symbol;

export type EventHandler = (...payload: any[]) => unknown;

export type EventMap = Record<EventKey, EventHandler>;

export type ListenType = 'DEFAULT' | 'UNIQUE' | 'STACK';

export type CancelFunc = () => void;

export interface BusListener {
    /** 当前订阅是否仍持有对应的监听注册。 */
    readonly active: boolean;
    /** 取消当前订阅，可安全重复调用。 */
    cancel: CancelFunc;
    /** `cancel()` 的别名，兼容常见的订阅命名。 */
    unsubscribe: CancelFunc;
}

export interface EventListenerSnapshot<
    T extends EventMap,
    Key extends keyof T = keyof T,
> {
    readonly alias: string;
    readonly func: T[Key];
    readonly type: ListenType;
}

export type EventBusState<T extends EventMap> = Readonly<
    Partial<{
        [Key in keyof T]: readonly EventListenerSnapshot<T, Key>[];
    }>
>;

export interface LogDataOn {
    readonly action: 'on';
    readonly key: string;
    readonly type: ListenType;
}

export interface LogDataAction {
    readonly action: 'off' | 'emit';
    readonly key: string;
}

export type LogData = LogDataOn | LogDataAction;

export interface EventErrorContext<T extends EventMap = EventMap> {
    readonly key: keyof T;
    readonly handler: T[keyof T];
    readonly phase: 'emit' | 'emitAsync';
}

export interface EventBusOptions<T extends EventMap = EventMap> {
    /** 是否输出订阅与派发日志。 */
    log?: boolean;
    /** 启用日志后使用的自定义日志函数。 */
    logger?: (data: LogData, ...payload: unknown[]) => void;
    /** 接收处理函数异常，且不会中断其他监听器。 */
    onError?: (error: unknown, context: EventErrorContext<T>) => void;
}

export interface EventBus<T extends EventMap> {
    /** 订阅事件；名称重复时替换上一代监听器。 */
    on<Key extends keyof T>(
        key: Key,
        handler: T[Key],
        name?: string,
        type?: ListenType,
    ): BusListener;
    /** 使用 UNIQUE 模式订阅。 */
    onUnique<Key extends keyof T>(key: Key, handler: T[Key], name?: string): BusListener;
    /** 使用 STACK 模式订阅。 */
    onStack<Key extends keyof T>(key: Key, handler: T[Key], name?: string): BusListener;
    /** @deprecated 请使用 `onUnique()`。 */
    on_unique<Key extends keyof T>(key: Key, handler: T[Key], name?: string): BusListener;
    /** @deprecated 请使用 `onStack()`。 */
    on_stack<Key extends keyof T>(key: Key, handler: T[Key], name?: string): BusListener;
    /** 订阅一次性事件，包括重入派发在内最多执行一次。 */
    once<Key extends keyof T>(key: Key, handler: T[Key]): BusListener;
    /** 移除与处理函数匹配的当前监听注册。 */
    off<Key extends keyof T>(key: Key, handler: T[Key]): void;
    /** 同步派发事件，并返回实际执行的处理函数数量。 */
    emit<Key extends keyof T>(key: Key, ...payload: Parameters<T[Key]>): number;
    /** 按顺序异步派发，并等待每个选中的处理函数完成。 */
    emitAsync<Key extends keyof T>(key: Key, ...payload: Parameters<T[Key]>): Promise<number>;
    /** 移除指定事件的监听器；省略事件键时移除全部监听器。 */
    clear(key?: keyof T): void;
    /** 返回指定事件或整个事件总线的监听器数量。 */
    listenerCount(key?: keyof T): number;
    /** 当前监听注册的只读诊断视图。 */
    readonly bus: EventBusState<T>;
    /** 为兼容保留的创建时间，不作为唯一标识。 */
    readonly timestamp: number;
}

/** 从 `EventBus` 实例类型中提取事件键。 */
export type GetEventBusKey<T> = T extends EventBus<infer Events> ? keyof Events : unknown;