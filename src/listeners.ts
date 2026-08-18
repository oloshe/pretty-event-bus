import type { BusListener } from './types.js';

export interface ListenerGroupOptions {
    /** 接收取消订阅时的异常，清理过程仍会继续。 */
    onError?: (error: unknown, listener: BusListener) => void;
}

export interface ListenerGroup {
    readonly size: number;
    /** 添加一个或多个订阅，并返回新的分组大小。 */
    add: (...listeners: BusListener[]) => number;
    /** 取消并移除全部订阅，可安全重复调用。 */
    destroy: () => void;
    /** @deprecated 请使用 `add()`。 */
    push: (...listeners: BusListener[]) => number;
    /** @deprecated 请使用 `destroy()`。 */
    destory: () => void;
}

export function createListenerGroup(options?: ListenerGroupOptions): ListenerGroup {
    const listeners: BusListener[] = [];
    const onError = options?.onError ?? ((error: unknown) => console.error(error));
    const add = (...items: BusListener[]): number => listeners.push(...items);
    const destroy = (): void => {
        const pending = listeners.splice(0, listeners.length);
        for (const listener of pending) {
            try {
                listener.cancel();
            } catch (error) {
                onError(error, listener);
            }
        }
    };

    return {
        get size() {
            return listeners.length;
        },
        add,
        destroy,
        push: add,
        destory: destroy,
    };
}

/** @deprecated 请使用 `createListenerGroup()`。 */
export const EventBusListeners: typeof createListenerGroup = createListenerGroup;

/** @deprecated 请使用 `ListenerGroup`。 */
export type BusListeners = ListenerGroup;