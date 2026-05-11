/**
 * 使用 EJS 渲染 template 目录下的 .ejs 模版（生成期占位），输出为可落地的源码。
 * Vue 运行时仍使用 mustache 风格 {{ }}，与 EJS 默认分隔符 <% %> 不冲突。
 */

const fs = require('fs');
const path = require('path');
const ejs = require('ejs');

const TEMPLATE_ROOT = path.join(__dirname, 'template');

/** @type {Record<string, Record<string, string>>} */
const TEMPLATE_MAP = {
  'vue-component': {
    list: path.join(TEMPLATE_ROOT, 'vue', 'list.vue.ejs'),
    form: path.join(TEMPLATE_ROOT, 'vue', 'form.vue.ejs'),
    detail: path.join(TEMPLATE_ROOT, 'vue', 'form.vue.ejs'),
  },
  'scss-style': {
    default: path.join(TEMPLATE_ROOT, 'scss', 'page.scss.ejs'),
  },
  'api-module': {
    default: path.join(TEMPLATE_ROOT, 'api', 'module-fragment.js.ejs'),
  },
};

/**
 * @param {string} kind - vue-component | scss-style | api-module
 * @param {string} variant - 页面类型 list/form/detail 或 default
 * @param {object} context - 生成上下文（与 index.js / Swagger 解析一致）
 * @returns {string}
 */
function renderTemplate(kind, variant, context = {}) {
  const map = TEMPLATE_MAP[kind];
  if (!map) {
    throw new Error(`未知的模版类型: ${kind}`);
  }

  let filePath = map[variant];
  if (!filePath) {
    filePath = kind === 'vue-component' ? map.form : map.default;
  }
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error(`找不到模版文件: ${kind}/${variant} -> ${filePath}`);
  }

  const templateSource = fs.readFileSync(filePath, 'utf-8');
  const data = buildRenderData(kind, variant, context);

  return ejs.render(templateSource, data, {
    filename: filePath,
    root: TEMPLATE_ROOT,
    strict: false,
  });
}

/**
 * @param {string} kind
 * @param {string} variant
 * @param {object} context
 */
function buildRenderData(kind, variant, context) {
  const rpcNamespace = context.rpcNamespace != null ? context.rpcNamespace : 'demo';
  const componentName =
    context.componentName || (variant && variant !== 'default' ? defaultComponentName(variant) : 'GeneratedView');

  const baseName = String(componentName).replace(/View$/i, '') || 'Page';
  const componentKebab = kebabCase(baseName);

  return {
    rpcNamespace,
    componentName,
    componentKebab,
    module: context.module || '',
    apiEndpoint: context.apiEndpoint || '',
    method: String(context.method || 'GET').toUpperCase(),
    apiFunctionName: context.apiFunctionName || 'fetchData',
    fields: Array.isArray(context.fields) ? context.fields : [],
    queryParams: context.queryParams || [],
    bodyParams: context.bodyParams || [],
    page_type: variant,
    /** SCSS 中 @import 工程内 token 的路径，可按子工程别名覆盖 */
    tokensImport: context.tokensImport || '../styles/project-tokens',
    /** 路由 path 片段，默认由组件名推导 */
    routePath: context.routePath || kebabCase(componentName.replace(/View$/, '')),
    ...context,
  };
}

function defaultComponentName(pageType) {
  const t = String(pageType || 'page').toLowerCase();
  const base = t.charAt(0).toUpperCase() + t.slice(1);
  return `${base}View`;
}

function kebabCase(str) {
  return String(str)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

module.exports = {
  renderTemplate,
  buildRenderData,
  TEMPLATE_ROOT,
};
