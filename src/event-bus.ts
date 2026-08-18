import type {
    BusListener,
    EventBus as EventBusInstance,
    EventBusOptions,
    EventBusState,
    EventHandler,
    EventMap,
    ListenType,
} from './types.js';

type ListenerEntry<T extends EventMap> = {
    alias: string;
    name: string | undefined;
    func: T[keyof T];
    type: ListenType;
    generation: number;
};

type MutableBus<T extends EventMap> = Partial<
    Record<keyof T, ListenerEntry<T>[]>
>;

const defaultLogger: NonNullable<EventBusOptions['logger']> = (data, ...payload) => {
    console.log(`[EVENT_BUS] ${data.action} ${data.key}`, ...payload);
};

const defaultErrorHandler = (error: unknown): void => {
    console.error(error);
};

export function createEventBus<T extends EventMap>(
    options?: EventBusOptions<T>,
): EventBusInstance<T> {
    const mutableBus: MutableBus<T> = {};
    const showLog = options?.log ?? false;
    const logger = options?.logger ?? defaultLogger;
    const onError: NonNullable<EventBusOptions<T>['onError']> =
        options?.onError ?? defaultErrorHandler;

    const getListeners = <Key extends keyof T>(key: Key): ListenerEntry<T>[] => {
        const current = mutableBus[key];
        if (current) return current;
        const created: ListenerEntry<T>[] = [];
        mutableBus[key] = created;
        return created;
    };

    const removeEntry = (
        key: keyof T,
        entry: ListenerEntry<T>,
        generation: number,
    ): void => {
        if (entry.generation !== generation) return;
        const listeners = mutableBus[key];
        if (!listeners) return;
        const index = listeners.indexOf(entry);
        if (index === -1) return;
        listeners.splice(index, 1);
        if (listeners.length === 0) delete mutableBus[key];
        if (showLog) logger({ action: 'off', key: String(key) });
    };

    const createSubscription = (
        key: keyof T,
        entry: ListenerEntry<T>,
        generation: number,
    ): BusListener => {
        let cancelled = false;
        const cancel = (): void => {
            if (cancelled) return;
            cancelled = true;
            removeEntry(key, entry, generation);
        };
        return {
            get active() {
                if (cancelled || entry.generation !== generation) return false;
                return mutableBus[key]?.includes(entry) ?? false;
            },
            cancel,
            unsubscribe: cancel,
        };
    };

    const on: EventBusInstance<T>['on'] = (key, handler, name, type = 'DEFAULT') => {
        if (showLog) logger({ action: 'on', key: String(key), type });
        const listeners = getListeners(key);
        const existing = name === undefined
            ? undefined
            : listeners.find((item) => item.name === name);

        if (existing) {
            existing.func = handler as T[keyof T];
            existing.type = type;
            existing.generation += 1;
            return createSubscription(key, existing, existing.generation);
        }

        const entry: ListenerEntry<T> = {
            alias: name ?? '@anonymous',
            name,
            func: handler as T[keyof T],
            type,
            generation: 0,
        };
        listeners.push(entry);
        return createSubscription(key, entry, entry.generation);
    };

    const off: EventBusInstance<T>['off'] = (key, handler) => {
        const listeners = mutableBus[key];
        if (!listeners) return;
        const entry = listeners.find((item) => item.func === handler);
        if (!entry) return;
        removeEntry(key, entry, entry.generation);
    };

    const once: EventBusInstance<T>['once'] = (key, handler) => {
        const listener = on(key, ((...payload: Parameters<T[typeof key]>) => {
            listener.cancel();
            return (handler as EventHandler)(...payload);
        }) as T[typeof key]);
        return listener;
    };

    const reportError = (
        error: unknown,
        key: keyof T,
        handler: T[keyof T],
        phase: 'emit' | 'emitAsync',
    ): void => {
        onError(error, { key, handler, phase });
    };

    const selectSnapshot = (key: keyof T): ListenerEntry<T>[] =>
        (mutableBus[key] ?? []).map((entry) => ({ ...entry }));

    const emit: EventBusInstance<T>['emit'] = (key, ...payload) => {
        if (showLog) logger({ action: 'emit', key: String(key) }, ...payload);
        const snapshot = selectSnapshot(key);
        let invoked = 0;
        let stacked: ListenerEntry<T> | undefined;

        const invoke = (entry: ListenerEntry<T>): void => {
            invoked += 1;
            try {
                (entry.func as EventHandler)(...payload);
            } catch (error) {
                reportError(error, key, entry.func, 'emit');
            }
        };

        for (const entry of snapshot) {
            if (entry.type === 'STACK') {
                stacked = entry;
                continue;
            }
            invoke(entry);
            if (entry.type === 'UNIQUE') return invoked;
        }

        if (stacked) invoke(stacked);
        return invoked;
    };

    const emitAsync: EventBusInstance<T>['emitAsync'] = async (key, ...payload) => {
        if (showLog) logger({ action: 'emit', key: String(key) }, ...payload);
        const snapshot = selectSnapshot(key);
        let invoked = 0;
        let stacked: ListenerEntry<T> | undefined;

        const invoke = async (entry: ListenerEntry<T>): Promise<void> => {
            invoked += 1;
            try {
                await (entry.func as EventHandler)(...payload);
            } catch (error) {
                reportError(error, key, entry.func, 'emitAsync');
            }
        };

        for (const entry of snapshot) {
            if (entry.type === 'STACK') {
                stacked = entry;
                continue;
            }
            await invoke(entry);
            if (entry.type === 'UNIQUE') return invoked;
        }

        if (stacked) await invoke(stacked);
        return invoked;
    };

    const clear: EventBusInstance<T>['clear'] = (key) => {
        if (key === undefined) {
            for (const currentKey of Reflect.ownKeys(mutableBus) as (keyof T)[]) {
                delete mutableBus[currentKey];
            }
            return;
        }
        delete mutableBus[key];
    };

    const listenerCount: EventBusInstance<T>['listenerCount'] = (key) => {
        if (key !== undefined) return mutableBus[key]?.length ?? 0;
        return (Reflect.ownKeys(mutableBus) as (keyof T)[]).reduce(
            (total, currentKey) => total + mutableBus[currentKey]!.length,
            0,
        );
    };

    const eventBus: EventBusInstance<T> = {
        on,
        onUnique: (key, handler, name) => on(key, handler, name, 'UNIQUE'),
        onStack: (key, handler, name) => on(key, handler, name, 'STACK'),
        on_unique: (key, handler, name) => on(key, handler, name, 'UNIQUE'),
        on_stack: (key, handler, name) => on(key, handler, name, 'STACK'),
        once,
        off,
        emit,
        emitAsync,
        clear,
        listenerCount,
        get bus() {
            return mutableBus as EventBusState<T>;
        },
        timestamp: Date.now(),
    };

    return eventBus;
}

/** @deprecated 请使用 `createEventBus()`。 */
export const EventBus: typeof createEventBus = createEventBus;