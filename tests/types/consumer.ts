import * as core from 'pretty-event-bus';
import {
    createListenerGroup,
    EventBusListeners,
    type ListenerGroup,
    type ListenerGroupOptions,
} from 'pretty-event-bus/listeners';
import {
    createViteEventBus,
    type HotContextLike,
} from 'pretty-event-bus/vite';

type AppEvents = {
    message: (value: number, label?: string) => void;
    loaded: (id: string) => Promise<void>;
};

const options: core.EventBusOptions<AppEvents> = {
    log: true,
    logger(data, ...payload) {
        const action: 'on' | 'off' | 'emit' = data.action;
        const values: unknown[] = payload;
        void action;
        void values;
    },
    onError(error, context) {
        const key: 'message' | 'loaded' = context.key;
        const phase: 'emit' | 'emitAsync' = context.phase;
        void error;
        void key;
        void phase;
    },
};

const bus = core.createEventBus<AppEvents>(options);
const legacyBus = core.EventBus<AppEvents>();
const typedBus: core.EventBus<AppEvents> = bus;
const instanceAlias: core.EventBusInstance<AppEvents> = legacyBus;
void typedBus;
void instanceAlias;

const subscription: core.BusListener = bus.on('message', (value, label) => {
    const count: number = value;
    const optionalLabel: string | undefined = label;
    void count;
    void optionalLabel;
});
const active: boolean = subscription.active;
subscription.unsubscribe();
void active;

const emitted: number = bus.emit('message', 1, 'ready');
const emittedAsync: Promise<number> = bus.emitAsync('loaded', '42');
const count: number = bus.listenerCount('message');
const snapshot = bus.bus.message?.[0];
if (snapshot) {
    const mode: core.ListenType = snapshot.type;
    snapshot.func(1, 'typed');
    void mode;
}
void emitted;
void emittedAsync;
void count;

type Keys = core.GetEventBusKey<typeof bus>;
const key: Keys = 'loaded';
void key;

const groupOptions: ListenerGroupOptions = {
    onError(error, listener) {
        const isActive: boolean = listener.active;
        void error;
        void isActive;
    },
};
const group: ListenerGroup = createListenerGroup(groupOptions);
const groupSize: number = group.add(bus.onStack('message', () => {}));
group.destroy();
EventBusListeners().destory();
void groupSize;

const hot: HotContextLike = { data: {} };
const hotBus: core.EventBus<AppEvents> = createViteEventBus<AppEvents>(hot, 'app');
const productionBus = createViteEventBus<AppEvents>(undefined, 'app');
void hotBus;
void productionBus;

// @ts-expect-error 根入口有意不导出 Vite 辅助函数。
core.createViteEventBus;
// @ts-expect-error 事件参数必须保持类型安全。
bus.emit('message', 'wrong');
// @ts-expect-error 事件键必须保持类型安全。
bus.on('missing', () => {});
// @ts-expect-error 日志参数在类型收窄前必须保持 unknown。
options.logger?.({ action: 'emit', key: 'message' }, 1).missing;