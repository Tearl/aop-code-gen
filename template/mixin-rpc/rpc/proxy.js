/**
 * 接口代理（与 aop_projectmanage/core/mixin/rpc/proxy.js 一致）
 * 依赖门户注入的 app.api.rpc / app.api.rpcurl
 * @param {String} interfaceId 接口 ID（后端网关配置）
 * @param {Object} [proxyOptions] 默认 axios 配置，可与调用时 options 合并
 * @returns {(data?: Object, options?: Object) => Promise<any>}
 */
export function proxy(interfaceId, proxyOptions = {}) {
  return (data = {}, options = {}) => {
    const config = Object.assign({}, proxyOptions, options)
    return app.api.rpc(interfaceId, data, config)
  }
}

/**
 * 接口地址代理
 * @param {String} interfaceId
 * @returns {(data?: Object) => any}
 */
export function proxyUrl(interfaceId) {
  return (data = {}) => {
    return app.api.rpcurl(interfaceId, data)
  }
}
