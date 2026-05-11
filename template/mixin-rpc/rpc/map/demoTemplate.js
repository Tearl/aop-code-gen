import { proxy, proxyUrl } from '../proxy'

/**
 * 入参/出参约定用 JSDoc 描述（纯 JS，无 TS）
 *
 * @typedef {Object} QryDemoPageListReq
 * @property {number} currentPage 当前页
 * @property {number} turnPageShowNum 每页条数
 * @property {string} [keyword] 关键词
 * @property {string} [status] 状态
 *
 * @typedef {Object} DemoRow
 * @property {string} id
 * @property {string} name
 * @property {string} status
 *
 * @typedef {Object} QryDemoPageListRes
 * @property {DemoRow[]} list 列表数据（字段名按真实接口调整）
 * @property {number|string} turnPageTotalNum 总条数
 *
 * @typedef {Object} GetDemoDetailReq
 * @property {string} id
 *
 * @typedef {Object} GetDemoDetailRes
 * @property {string} id
 * @property {string} name
 * @property {string} code
 * @property {string} [sortNo]
 * @property {string} [remark]
 *
 * @typedef {Object} SaveDemoReq
 * @property {string} [id] 编辑时传
 * @property {string} name
 * @property {string} code
 * @property {string} [sortNo]
 * @property {string} [remark]
 *
 * @typedef {Object} SaveDemoRes
 * @property {string} id
 */

/**
 * 演示命名空间：复制到子模块后把 interfaceId 换成真实网关 ID，
 * 并在 rpc/index.js 中 import 本文件、展开到 export default。
 */
export default {
  demo: {
    /**
     * 分页列表
     * @param {QryDemoPageListReq} data
     * @returns {Promise<QryDemoPageListRes>}
     */
    qryPageList: proxy('demo/qryDemoPageList'),

    /**
     * 详情
     * @param {GetDemoDetailReq} data
     * @returns {Promise<GetDemoDetailRes>}
     */
    getDetail: proxy('demo/getDemoDetail'),

    /**
     * 新增/保存
     * @param {SaveDemoReq} data
     * @returns {Promise<SaveDemoRes>}
     */
    save: proxy('demo/save'),

    /** 需要直链地址等场景可用 proxyUrl */
    exportList: proxyUrl('demo/exportList'),
  },
}
