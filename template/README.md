# 工程模版（aop-h5-l5 / aop_projectmanage 风格）

本目录供 QClaw Skill / `template-engine.js`（**EJS**）读取并渲染为落地源码。约定与 **`src/modules/aop_projectmanage/core/mixin`** 一致：**纯 JavaScript**，接口层使用 **`proxy` / `app.api.rpc`**，入参/出参用 **`rpc/map/*.js` 内 JSDoc `@typedef`** 描述（不使用 TypeScript）。

## EJS 约定

- **生成期**：由 Node 的 `ejs` 包解析，占位符使用 **`<%`** / **`<%=`** / **`<%_`**（去除前导空白）等标签。
- **Vue 运行时**：模版里保留 **`{{ }}`**（mustache），与 EJS 默认分隔符 **不冲突**，无需转义。
- **样式**：`styles/_project-tokens.scss` 仍为静态 SCSS；页面级样式模版为 `scss/page.scss.ejs`。
- **入口**：仓库根目录 `template-engine.js` 中 `renderTemplate(kind, variant, context)` 映射如下：

| kind | variant | 文件 |
|------|---------|------|
| `vue-component` | `list` | `vue/list.vue.ejs` |
| `vue-component` | `form` / `detail` | `vue/form.vue.ejs`（detail 复用表单模版） |
| `vue-component` | 其他未知类型 | 回退到 `form.vue.ejs` |
| `scss-style` | `default` | `scss/page.scss.ejs` |
| `api-module` | `default` | `api/module-fragment.js.ejs` |

常用 **`context` 字段**：`componentName`、`rpcNamespace`（默认 `demo`）、`fields`、`apiEndpoint`、`method`、`apiFunctionName`、`tokensImport`（`@import` 路径）、`routePath`、`componentKebab`（由引擎注入，用于类名/路径）。

## 目录说明

| 目录/文件 | 说明 |
|-----------|------|
| `mixin-rpc/` | 对齐 **`core/mixin`**：`index.js` 挂载 `this.rpc`，`rpc/proxy.js`，`rpc/index.js` 聚合，`rpc/map/demoTemplate.js` 示例命名空间 + JSDoc。详见 `mixin-rpc/README.md`。 |
| `vue/*.vue.ejs` | 列表 / 表单页：EJS 注入 `name`、`this.rpc.<namespace>` 等；Swagger 解析出 `fields` 时可生成动态列与表单项。 |
| `router/route-map.example.js.ejs` | 与 **`core/router/map/*.js`** 相同的懒加载与 `meta` 写法（示例，需自行接入渲染或复制修改）。 |
| `styles/_project-tokens.scss` | 与 `assets/css/mixin.scss` 对齐的变量/混入片段；落地子模块可改为 `@import '@m/assets/css/mixin.scss'`。 |

**接入子模块**：将 `mixin-rpc/` 复制到 **`core/mixin/`**（或对照合并），在 **`core/mixin/rpc/index.js`** 中注册你的 `map`；页面 **`mixins: [mixin]`** 后即可 **`this.rpc.<命名空间>.<方法>(payload)`**。
