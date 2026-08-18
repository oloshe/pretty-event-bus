# Pretty Event Bus

一个轻量、类型安全的 TypeScript 事件总线。支持 CommonJS、ESM、同步/异步派发、监听器分组，以及完全可选的 Vite HMR 实例复用。

## 特性

- 事件名称、监听函数参数和派发参数都可由 TypeScript 自动推导。
- 同时提供 ESM、CommonJS 和完整的 `.d.ts` 类型声明。
- 同步派发采用监听器快照，监听器在回调中取消自身时不会跳过其他监听器。
- `once` 在执行回调前注销，能够正确处理同步重入和回调异常。
- 支持 DEFAULT、UNIQUE、STACK 三种监听模式。
- 支持统一管理多个订阅的 `ListenerGroup`。
- Vite HMR 支持位于独立子入口，不会影响 Node、CommonJS 或其他构建工具。
- 运行时代码的行、分支、函数覆盖率均设有 100% 测试阈值。

## 安装

```bash
pnpm add pretty-event-bus
```

也可以使用 npm 或 yarn：

```bash
npm install pretty-event-bus
# 或

yarn add pretty-event-bus
```

## 快速开始

先用“事件名 → 监听函数”的形式声明事件表：

```ts
import {
    createEventBus,
    type EventBus,
    type EventBusOptions,
} from 'pretty-event-bus';

type AppEvents = {
    message: (text: string, count: number) => void;
    loaded: (id: string) => Promise<void>;
};

const options: EventBusOptions<AppEvents> = {
    onError(error, context) {
        console.error(context.key, context.phase, error);
    },
};

export const events: EventBus<AppEvents> = createEventBus(options);
```

订阅和派发时会自动获得完整的字段与参数提示：

```ts
const listener = events.on('message', (text, count) => {
    // text 为 string，count 为 number
    console.log(text, count);
});

const invoked = events.emit('message', '准备完成', 1);
console.log(invoked); // 实际执行的监听函数数量

listener.cancel();
// unsubscribe() 与 cancel() 等价
listener.unsubscribe();
```

错误的事件名或参数会在编译阶段报错：

```ts
// @ts-expect-error message 的第一个参数必须是 string
events.emit('message', 123, 1);

// @ts-expect-error missing 不在 AppEvents 中
events.on('missing', () => {});
```

## 监听模式

### DEFAULT

`on` 默认使用 DEFAULT 模式。一次派发会按注册顺序执行所有普通监听器：

```ts
const first = events.on('message', firstHandler);
const second = events.on('message', secondHandler);
```

### UNIQUE

`onUnique` 注册 UNIQUE 监听器。派发遇到第一个 UNIQUE 监听器并执行后立即结束，不再执行其后的监听器：

```ts
const listener = events.onUnique('message', handler);
```

### STACK

`onStack` 适合只关心最新订阅者的场景。同一事件有多个 STACK 监听器时，一次派发只执行最后注册的那个：

```ts
const oldListener = events.onStack('message', oldHandler);
const latestListener = events.onStack('message', latestHandler);
```

三种模式可以用于同一个事件。普通监听器按顺序执行，STACK 监听器延后选择最后一个执行；如果派发提前遇到 UNIQUE 监听器，则会立即结束。

### 一次性监听

`once` 最多执行一次。监听器会在回调运行前注销，因此同步重入、连续派发或回调抛错都不会造成重复执行：

```ts
events.once('message', (text, count) => {
    console.log(text, count);
});
```

## 具名监听器

`on`、`onUnique` 和 `onStack` 的第三个参数可以传入名称。同一事件中名称重复时，新监听器会替换旧监听器：

```ts
const stale = events.on('message', oldHandler, 'message-view');
const current = events.on('message', newHandler, 'message-view');

console.log(stale.active);   // false
console.log(current.active); // true

// 旧句柄不会误删新一代监听器
stale.cancel();
```

## 同步与异步派发

`emit` 是同步方法。它不会等待监听函数返回的 Promise：

```ts
const count = events.emit('message', '同步消息', 1);
```

异步监听器应配合 `emitAsync`。监听器会按选择顺序逐个等待：

```ts
const count = await events.emitAsync('loaded', '42');
```

监听函数异常不会中断其他已选择的监听器。默认会调用 `console.error`，也可以通过 `onError` 统一处理：

```ts
const events = createEventBus<AppEvents>({
    onError(error, context) {
        console.error('事件处理失败', {
            event: context.key,
            phase: context.phase,
            error,
        });
    },
});
```

## 日志

设置 `log: true` 可以输出订阅、取消和派发日志，也可以提供自定义日志函数：

```ts
const events = createEventBus<AppEvents>({
    log: true,
    logger(data, ...payload) {
        console.log(data.action, data.key, payload);
    },
});
```

## 生命周期管理

### 单个订阅

`on`、`once`、`onUnique` 和 `onStack` 都返回 `BusListener`：

```ts
const listener = events.on('message', handler);

listener.active;
listener.cancel();
listener.unsubscribe();
```

`cancel()` 和 `unsubscribe()` 都可以安全重复调用。

### 批量清理

```ts
events.listenerCount();
events.listenerCount('message');

events.clear('message');
events.clear();
```

`bus` 属性提供当前监听注册的只读诊断视图。业务代码应使用上述生命周期方法，不要直接修改该对象。

## ListenerGroup

推荐从独立的通用子入口导入监听器分组：

```ts
import { createListenerGroup } from 'pretty-event-bus/listeners';

const listeners = createListenerGroup({
    onError(error, listener) {
        console.error('取消订阅失败', listener, error);
    },
});

listeners.add(
    events.on('message', onMessage),
    events.onStack('message', onLatestMessage),
);

console.log(listeners.size);
listeners.destroy();
```

`destroy()` 会继续清理剩余订阅，即使其中某个 `cancel()` 抛出异常；该方法也可以安全重复调用。

## Vite HMR

Vite 支持必须从独立子入口显式导入：

```ts
import { createViteEventBus } from 'pretty-event-bus/vite';

type AppEvents = {
    refresh: () => void;
};

export const events = createViteEventBus<AppEvents>(
    import.meta.hot,
    'app-events',
);
```

`createViteEventBus` 会把事件总线保存到传入的 `hot.data` 中。同一个 key 在模块热更新后会获得同一个实例，从而避免旧模块监听了旧实例、新模块却向新实例派发事件的问题。

### 为什么非 Vite 环境不会报错

- 包根入口不会导入或重新导出 Vite 适配器。
- 核心入口和 `/listeners` 入口中不存在 `import.meta`、`import.meta.hot` 或 Vite 类型引用。
- `/vite` 适配器本身也不会读取 `import.meta`，它只接收调用方传入的最小结构对象。
- 包不依赖 `vite` 或 `vite/client`。

因此 Node、CommonJS、Webpack、Rollup 或其他非 Vite 项目可以直接使用：

```ts
import { createEventBus } from 'pretty-event-bus';
```

在没有热更新上下文时，向适配器传入 `undefined` 会创建普通事件总线：

```ts
const events = createViteEventBus<AppEvents>(undefined, 'app-events');
```

### HMR 清理监听器

复用事件总线只负责保持实例身份，组件或模块创建的监听副作用仍需要清理：

```ts
import { createListenerGroup } from 'pretty-event-bus/listeners';

const listeners = createListenerGroup();
listeners.add(events.on('refresh', handleRefresh));

if (import.meta.hot) {
    import.meta.hot.dispose(() => listeners.destroy());
}
```

## CommonJS

```js
const {
    createEventBus,
    createListenerGroup,
} = require('pretty-event-bus');

const bus = createEventBus();
const listeners = createListenerGroup();
```

Vite 适配器也可以通过子路径单独解析，但非 Vite 项目通常不需要导入它：

```js
const { createViteEventBus } = require('pretty-event-bus/vite');
```

## 导出入口

| 入口 | 内容 | 是否包含 Vite 环境引用 |
|------|------|------------------------|
| `pretty-event-bus` | 核心事件总线、公共类型、ListenerGroup | 否 |
| `pretty-event-bus/listeners` | `createListenerGroup` 及相关类型 | 否 |
| `pretty-event-bus/vite` | `createViteEventBus`、`HotContextLike` | 否；热更新上下文由调用方传入 |

## API 概览

### EventBus

| API | 说明 |
|-----|------|
| `on(key, handler, name?, type?)` | 注册监听器 |
| `onUnique(key, handler, name?)` | 注册 UNIQUE 监听器 |
| `onStack(key, handler, name?)` | 注册 STACK 监听器 |
| `once(key, handler)` | 注册一次性监听器 |
| `off(key, handler)` | 按处理函数移除当前监听器 |
| `emit(key, ...payload)` | 同步派发并返回执行数量 |
| `emitAsync(key, ...payload)` | 顺序异步派发并返回执行数量 |
| `clear(key?)` | 清理指定事件或全部事件 |
| `listenerCount(key?)` | 获取指定事件或全部监听器数量 |
| `bus` | 只读诊断视图 |
| `timestamp` | 兼容保留的实例创建时间 |

### ListenerGroup

| API | 说明 |
|-----|------|
| `add(...listeners)` | 添加一个或多个订阅 |
| `destroy()` | 取消并移除全部订阅 |
| `size` | 当前分组中的订阅数量 |

## 从 1.x 升级到 2.0.0

2.0.0 将源码统一移动到 `src/`，发布包改为明确的 ESM、CommonJS 和类型声明产物，并增加条件导出。建议升级后使用新 API：

| 旧 API | 推荐 API | 2.0.0 状态 |
|--------|----------|------------|
| `EventBus<Events>()` 工厂 | `createEventBus<Events>()` | 保留，已标记废弃 |
| `on_unique()` | `onUnique()` | 保留，已标记废弃 |
| `on_stack()` | `onStack()` | 保留，已标记废弃 |
| `EventBusListeners()` | `createListenerGroup()` | 保留，已标记废弃 |
| `push()` | `add()` | 保留，已标记废弃 |
| `destory()` | `destroy()` | 保留，已标记废弃 |

另外需要注意：

- `emit()` 现在返回实际执行的监听器数量。
- 新增 `emitAsync()`、`clear()` 和 `listenerCount()`。
- 历史深路径建议改为包根入口、`/listeners` 或 `/vite` 三个公开入口。
- Vite 适配器不会从根入口导出，需要显式从 `pretty-event-bus/vite` 导入。

完整变更见 [CHANGELOG.md](./CHANGELOG.md)。

## 开发与验证

源码只位于 `src/`，`dist/` 是构建产物：

```bash
pnpm run typecheck
pnpm run build
pnpm run test:runtime
pnpm run test:types
pnpm test
```

`pnpm run test:runtime` 会在行、分支或函数覆盖率低于 100% 时失败。`pnpm run test:types` 会打出真实 npm tarball，并在 CommonJS、ESM 和多种 TypeScript 模块解析模式下验证所有公开入口与类型提示。

## 许可证

[ISC](./package.json)
