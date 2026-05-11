/**
 * Kimi（Moonshot）OpenAI 兼容接口：解析需求文档与设计图，产出与 swagger-parser / template-engine 对齐的上下文字段。
 *
 * 环境变量（任选其一配置密钥）：
 * - MOONSHOT_API_KEY 或 KIMI_API_KEY（必填方可调用云端模型）
 * - MOONSHOT_BASE_URL 默认 https://api.moonshot.cn/v1（也可用 https://api.moonshot.ai/v1 等）
 * - MOONSHOT_MODEL 文本模型，默认 moonshot-v1-8k
 * - MOONSHOT_VISION_MODEL 视觉模型，默认 moonshot-v1-8k-vision-preview
 *
 * 未配置密钥时解析函数返回 {}，不阻塞本地/Swagger 生成流程。
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const DEFAULT_BASE_URL = 'https://api.moonshot.cn/v1';
const DEFAULT_TEXT_MODEL = 'moonshot-v1-8k';
const DEFAULT_VISION_MODEL = 'moonshot-v1-8k-vision-preview';
const MAX_DOC_CHARS = 120000;
const REQUEST_TIMEOUT_MS = 120000;

function getApiKey() {
  return process.env.MOONSHOT_API_KEY || process.env.KIMI_API_KEY || '';
}

function getBaseUrl() {
  return (process.env.MOONSHOT_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
}

/**
 * @param {object} options
 * @param {Array<{role:string, content:string|Array}>} options.messages
 * @param {string} [options.model]
 * @param {number} [options.temperature]
 */
async function kimiChatCompletions({ messages, model, temperature = 0.2 }) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('缺少 MOONSHOT_API_KEY 或 KIMI_API_KEY');
  }

  const url = `${getBaseUrl()}/chat/completions`;
  const body = {
    model: model || process.env.MOONSHOT_MODEL || DEFAULT_TEXT_MODEL,
    messages,
    temperature,
    max_tokens: 4096,
  };

  let data;
  try {
    const res = await axios.post(url, body, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: REQUEST_TIMEOUT_MS,
    });
    data = res.data;
  } catch (e) {
    if (e.response && e.response.data) {
      const d = e.response.data;
      const msg =
        (d.error && (d.error.message || d.error)) || d.message || e.message;
      throw new Error(`Kimi 请求失败: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`);
    }
    throw e;
  }

  if (data.error) {
    const msg = data.error.message || JSON.stringify(data.error);
    throw new Error(`Kimi API 错误: ${msg}`);
  }

  const choice = data.choices && data.choices[0];
  const content = choice && choice.message && choice.message.content;
  if (content == null || content === '') {
    throw new Error('Kimi API 返回空内容');
  }
  return typeof content === 'string' ? content : String(content);
}

const JSON_SCHEMA_HINT = `你必须只输出一个 JSON 对象，不要 Markdown 代码围栏以外的说明文字。结构如下（未知项用空字符串 "" 或空数组 []）：
{
  "componentName": "PascalCase 组件名，如 OrderListView",
  "module": "业务模块短名，如 l1",
  "rpcNamespace": "RPC map 命名空间，如 order",
  "routePath": "kebab-case 路由片段，如 order-list",
  "apiEndpoint": "接口路径",
  "method": "GET|POST|PUT|DELETE",
  "apiFunctionName": "camelCase 函数名",
  "fields": [
    { "name": "字段英文标识", "label": "中文标签", "type": "text|number|boolean|date", "required": true }
  ],
  "queryParams": [ { "name": "", "label": "", "type": "text", "required": false } ],
  "bodyParams": [ { "name": "", "label": "", "type": "text", "required": false } ]
}`;

/**
 * 从模型回复中截取 JSON 对象并解析
 * @param {string} text
 * @returns {object}
 */
function parseJsonObjectFromText(text) {
  const trimmed = String(text).trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1].trim() : trimmed;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('模型回复中未找到 JSON 对象');
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

/**
 * @param {unknown} t
 * @returns {'text'|'number'|'boolean'|'date'}
 */
function normalizeFieldType(t) {
  const s = String(t || 'text').toLowerCase();
  if (s === 'number' || s === 'boolean' || s === 'date' || s === 'text') return s;
  return 'text';
}

/**
 * @param {object} raw
 */
function normalizeAiContext(raw) {
  if (!raw || typeof raw !== 'object') return {};

  /** @type {Record<string, unknown>} */
  const out = {};

  if (typeof raw.componentName === 'string' && raw.componentName.trim()) {
    out.componentName = raw.componentName.trim();
  }
  if (typeof raw.module === 'string' && raw.module.trim()) {
    out.module = raw.module.trim();
  }
  if (typeof raw.rpcNamespace === 'string' && raw.rpcNamespace.trim()) {
    out.rpcNamespace = raw.rpcNamespace.trim();
  }
  if (typeof raw.routePath === 'string' && raw.routePath.trim()) {
    out.routePath = raw.routePath.trim();
  }
  if (typeof raw.apiEndpoint === 'string' && raw.apiEndpoint.trim()) {
    out.apiEndpoint = raw.apiEndpoint.trim();
  }
  if (typeof raw.method === 'string' && raw.method.trim()) {
    out.method = raw.method.trim().toUpperCase();
  }
  if (typeof raw.apiFunctionName === 'string' && raw.apiFunctionName.trim()) {
    out.apiFunctionName = raw.apiFunctionName.trim();
  }

  if (Array.isArray(raw.fields)) {
    out.fields = raw.fields
      .map((f) => ({
        name: String((f && f.name) || '').trim(),
        label: String((f && f.label) || (f && f.name) || '').trim(),
        type: normalizeFieldType(f && f.type),
        required: Boolean(f && f.required),
      }))
      .filter((f) => f.name);
  }

  if (Array.isArray(raw.queryParams)) {
    out.queryParams = raw.queryParams
      .map((p) => ({
        name: String((p && p.name) || '').trim(),
        label: String((p && p.label) || (p && p.name) || '').trim(),
        type: normalizeFieldType(p && p.type),
        required: Boolean(p && p.required),
      }))
      .filter((p) => p.name);
  }

  if (Array.isArray(raw.bodyParams)) {
    out.bodyParams = raw.bodyParams
      .map((p) => ({
        name: String((p && p.name) || '').trim(),
        label: String((p && p.label) || (p && p.name) || '').trim(),
        type: normalizeFieldType(p && p.type),
        required: Boolean(p && p.required),
      }))
      .filter((p) => p.name);
  }

  return out;
}

/**
 * 解析本地需求文档，调用 Kimi 抽取生成上下文
 * @param {string} docContent
 * @param {string} pageType - list | form | detail 等
 */
async function parseRequirements(docContent, pageType) {
  if (!getApiKey()) {
    console.warn('[ai-parser] 未设置 MOONSHOT_API_KEY / KIMI_API_KEY，跳过需求文档 Kimi 解析');
    return {};
  }

  let text = docContent || '';
  if (text.length > MAX_DOC_CHARS) {
    console.warn(`[ai-parser] 需求文档过长，已截断至 ${MAX_DOC_CHARS} 字符`);
    text = text.slice(0, MAX_DOC_CHARS);
  }

  const userPrompt = `页面类型 page_type 为：${pageType}。

请阅读下列需求说明，抽取用于 Vue2 + Element UI 列表/表单代码生成的结构化信息。
${JSON_SCHEMA_HINT}

--- 需求正文 ---
${text}`;

  try {
    const assistant = await kimiChatCompletions({
      model: process.env.MOONSHOT_MODEL || DEFAULT_TEXT_MODEL,
      messages: [
        {
          role: 'system',
          content:
            '你是资深前端架构师，擅长从需求文档中提取接口与表单字段。输出必须是合法 JSON 对象。',
        },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
    });
    const parsed = parseJsonObjectFromText(assistant);
    const normalized = normalizeAiContext(parsed);
    console.log('[ai-parser] Kimi 需求解析完成，字段数:', (normalized.fields && normalized.fields.length) || 0);
    return normalized;
  } catch (e) {
    console.warn('[ai-parser] Kimi 需求解析失败:', (e && e.message) || e);
    return {};
  }
}

/**
 * @param {string} imagePath
 */
function mimeFromPath(imagePath) {
  const ext = path.extname(imagePath).toLowerCase();
  const map = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  };
  return map[ext] || 'image/png';
}

/**
 * 解析设计图（本地文件路径），使用视觉模型抽取 UI 相关上下文
 * @param {string} designImagePath
 * @param {string} pageType
 */
async function parseDesignImage(designImagePath, pageType) {
  if (!getApiKey()) {
    console.warn('[ai-parser] 未设置 MOONSHOT_API_KEY / KIMI_API_KEY，跳过设计图 Kimi 解析');
    return {};
  }

  const resolved = path.resolve(designImagePath);
  if (!fs.existsSync(resolved)) {
    console.warn('[ai-parser] 设计图文件不存在:', resolved);
    return {};
  }

  let buf;
  try {
    buf = fs.readFileSync(resolved);
  } catch (e) {
    console.warn('[ai-parser] 读取设计图失败:', (e && e.message) || e);
    return {};
  }

  const maxBytes = Number(process.env.MOONSHOT_IMAGE_MAX_BYTES) || 5 * 1024 * 1024;
  if (buf.length > maxBytes) {
    console.warn(`[ai-parser] 设计图超过 ${maxBytes} 字节，跳过 Kimi 视觉解析`);
    return {};
  }

  const mime = mimeFromPath(resolved);
  const b64 = buf.toString('base64');
  const dataUrl = `data:${mime};base64,${b64}`;

  const userInstruction = `页面类型 page_type：${pageType}。

这是一张产品原型或 UI 设计图。请根据可见的列表列、搜索条件、按钮、表单项等，抽取与代码生成相关的信息。
重点输出字段列表 fields（英文 name + 中文 label + 合理 type）、以及若有体现的 routePath、componentName 建议。
${JSON_SCHEMA_HINT}`;

  try {
    const assistant = await kimiChatCompletions({
      model: process.env.MOONSHOT_VISION_MODEL || DEFAULT_VISION_MODEL,
      messages: [
        {
          role: 'system',
          content:
            '你是资深前端与交互设计师，擅长从界面稿中提取表单字段与列表结构。输出必须是合法 JSON 对象。',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: userInstruction },
            {
              type: 'image_url',
              image_url: { url: dataUrl },
            },
          ],
        },
      ],
      temperature: 0.2,
    });
    const parsed = parseJsonObjectFromText(assistant);
    const normalized = normalizeAiContext(parsed);
    console.log(
      '[ai-parser] Kimi 设计图解析完成，字段数:',
      (normalized.fields && normalized.fields.length) || 0
    );
    return normalized;
  } catch (e) {
    console.warn('[ai-parser] Kimi 设计图解析失败:', (e && e.message) || e);
    return {};
  }
}

module.exports = {
  parseRequirements,
  parseDesignImage,
  kimiChatCompletions,
  normalizeAiContext,
  parseJsonObjectFromText,
};
