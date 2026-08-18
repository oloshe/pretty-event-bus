import { createEventBus } from './event-bus.js';
import type { EventBus as EventBusType, EventMap } from './types.js';

export { createEventBus };
export type EventBus<T extends EventMap> = EventBusType<T>;
/** @deprecated 请使用 `createEventBus()`。 */
export const EventBus: typeof createEventBus = createEventBus;
export {
    createListenerGroup,
    EventBusListeners,
} from './listeners.js';
export type {
    BusListeners,
    ListenerGroup,
    ListenerGroupOptions,
} from './listeners.js';
export type {
    BusListener,
    CancelFunc,
    EventBusOptions,
    EventBusState,
    EventErrorContext,
    EventHandler,
    EventKey,
    EventListenerSnapshot,
    EventMap,
    GetEventBusKey,
    ListenType,
    LogData,
    LogDataAction,
    LogDataOn,
    EventBus as EventBusInstance,
} from './types.js';