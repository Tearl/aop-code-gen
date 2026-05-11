import rpc from './rpc'

export default {
  created() {
    // 挂载 rpc 到 Vue 实例（与 aop_projectmanage/core/mixin/index.js 一致）
    this.rpc = rpc
  },
}
