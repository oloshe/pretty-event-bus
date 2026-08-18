# 更新日志

本文档记录 Pretty Event Bus 的重要变更。版本格式遵循语义化版本。

## [2.0.0] - 2026-08-18

### 重大变更

- 源码统一迁移到 `src/`，删除根目录旧版 `index.ts` 和 `index.js`。
- 发布结构改为独立的 ESM、CommonJS 和 `.d.ts` 产物，并通过条件 `exports` 暴露公开入口。
- `emit()` 现在返回本次实际执行的监听器数量。
- 历史深路径应迁移到 `pretty-event-bus`、`pretty-event-bus/listeners` 或 `pretty-event-bus/vite`。

### 新增

- 新增 `createEventBus()` 工厂函数。
- 新增 `onUnique()` 和 `onStack()` 驼峰命名方法。
- 新增 `emitAsync()`，按顺序等待异步监听器并返回执行数量。
- 新增 `clear()` 和 `listenerCount()` 生命周期方法。
- 新增 `createListenerGroup()` 与独立的 `pretty-event-bus/listeners` 子入口。
- 新增 `BusListener.active`、`cancel()` 和 `unsubscribe()` 订阅状态与取消能力。
- 新增 `EventBusOptions.onError` 统一错误处理。
- 新增完全可选的 `pretty-event-bus/vite` 子入口，通过调用方传入的 `hot.data` 在 HMR 更新之间复用事件总线实例。
- 新增完整的 ESM、CommonJS、Node16、Bundler 类型消费验证。

### 修复

- 修复监听器在派发期间取消自身时，后续监听器可能被跳过的问题。
- 修复 `once` 在同步连续派发、重入派发或处理函数抛错时可能重复执行的问题。
- 修复具名监听器替换后，旧取消句柄可能影响新一代监听器的生命周期歧义。
- 修复 Vite HMR 重建模块后，订阅和派发落在不同事件总线实例而导致事件丢失的问题。
- 监听器分组清理时，即使某个取消函数抛错，也会继续清理剩余监听器。

### 环境兼容

- 核心入口和 `pretty-event-bus/listeners` 不包含 `import.meta`、Vite 运行时变量或 Vite 类型依赖。
- `pretty-event-bus/vite` 本身也不主动读取 `import.meta.hot`，仅使用调用方显式传入的最小结构对象。
- 非 Vite 用户无需安装 Vite，也不会因导入核心包而解析不存在的环境变量。

### 兼容保留

以下旧名称仍可使用，但已通过 TypeScript 标记为废弃：

- `EventBus()` → `createEventBus()`
- `on_unique()` → `onUnique()`
- `on_stack()` → `onStack()`
- `EventBusListeners()` → `createListenerGroup()`
- `push()` → `add()`
- `destory()` → `destroy()`

### 测试

- 运行时代码的行覆盖率、分支覆盖率和函数覆盖率均设为 100% 硬阈值。
- 增加真实 npm tarball 的 CommonJS、ESM、子路径导出和类型声明消费测试。
- 增加核心构建产物环境隔离扫描，防止 Vite/HMR 引用泄漏到通用入口。

### 升级建议

1. 将工厂调用改为 `createEventBus<Events>()`。
2. 将监听分组改为从 `pretty-event-bus/listeners` 导入 `createListenerGroup()`。
3. 仅在 Vite 项目中从 `pretty-event-bus/vite` 导入 `createViteEventBus()`，并由调用处传入 `import.meta.hot`。
4. 将历史深路径导入替换为公开的包入口。
5. 如需处理异步监听器，使用 `emitAsync()` 代替同步 `emit()`。
