# mixin-rpc 模版（对齐 `aop_projectmanage/core/mixin`）

将本目录内容复制到子模块：

`src/modules/<你的模块>/core/mixin/`

| 文件 | 对应工程路径 |
|------|----------------|
| `index.js` | `core/mixin/index.js` |
| `rpc/proxy.js` | `core/mixin/rpc/proxy.js` |
| `rpc/index.js` | `core/mixin/rpc/index.js` |
| `rpc/map/demoTemplate.js` | `core/mixin/rpc/map/<你的业务>.js`（可复制改名） |

页面中：`import mixin from '@m/core/mixin'`，`mixins: [mixin]`，通过 **`this.rpc.demo.qryPageList(...)`** 调用。

入参/出参类型：写在 **`rpc/map/*.js` 文件顶部的 `@typedef`**，与工程现有纯 JS 方式一致，无需 TypeScript。
