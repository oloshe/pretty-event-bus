import { createEventBus } from './event-bus.js';
import type { EventBus, EventBusOptions, EventMap } from './types.js';

/** Vite 热更新上下文的最小结构类型，无需依赖 `vite/client`。 */
export interface HotContextLike {
    readonly data: Record<string, unknown>;
}

/**
 * 在 HMR 更新之间复用同一个事件总线实例。
 *
 * 库本身不会读取 `import.meta`。Vite 使用方需要显式传入：
 * `createViteEventBus(import.meta.hot, 'app-events')`。
 */
export function createViteEventBus<T extends EventMap>(
    hot: HotContextLike | undefined,
    key: string,
    options?: EventBusOptions<T>,
): EventBus<T> {
    if (!hot) return createEventBus<T>(options);

    const storageKey = `pretty-event-bus:${key}`;
    const existing = hot.data[storageKey];
    if (existing) return existing as EventBus<T>;

    const eventBus = createEventBus<T>(options);
    hot.data[storageKey] = eventBus;
    return eventBus;
}