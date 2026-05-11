
/**
 * 解析 Swagger JSON 数据，提取与页面类型匹配的接口信息
 * @param {Object} swaggerData - Swagger JSON 对象
 * @param {String} pageType - 页面类型 (list, form, detail)
 * @returns {Object} 结构化上下文数据
 */
function parseSwagger(swaggerData, pageType) {
  const paths = swaggerData.paths || {};
  const definitions = swaggerData.definitions || swaggerData.components?.schemas || {};
  
  let bestMatch = null;
  let maxScore = 0;

  // 简单 heuristic：寻找包含常见关键词的路径
  const keywords = {
    list: ['list', 'page', 'query', 'search'],
    form: ['add', 'create', 'save', 'update'],
    detail: ['detail', 'get', 'info']
  };

  const targetKeywords = keywords[pageType] || [];

  for (const [path, methods] of Object.entries(paths)) {
    for (const [method, details] of Object.entries(methods)) {
      let score = 0;
      const lowerPath = path.toLowerCase();
      const lowerSummary = (details.summary || '').toLowerCase();
      
      // 评分逻辑：路径或摘要中包含关键词
      targetKeywords.forEach(kw => {
        if (lowerPath.includes(kw) || lowerSummary.includes(kw)) score += 2;
      });

      // 偏好 GET (list/detail) 或 POST/PUT (form)
      if (pageType === 'list' && method === 'get') score += 1;
      if (pageType === 'detail' && method === 'get') score += 1;
      if ((pageType === 'form') && (method === 'post' || method === 'put')) score += 1;

      if (score > maxScore) {
        maxScore = score;
        bestMatch = { path, method, details };
      }
    }
  }

  if (!bestMatch) {
    console.warn('未在 Swagger 中找到匹配的接口，使用默认配置');
    return {};
  }

  // 提取响应数据结构 (假设列表页取 200 响应的 schema)
  let fields = [];
  let apiEndpoint = bestMatch.path;
  let apiFunctionName = `fetch${bestMatch.details.operationId ? capitalize(bestMatch.details.operationId) : 'Data'}`;
  
  // 尝试从 responses 中提取字段
  const successResponse = bestMatch.details.responses['200'] || bestMatch.details.responses['200 OK'];
  if (successResponse && successResponse.schema) {
    const schemaRef = successResponse.schema.$ref || (successResponse.schema.items?.$ref);
    if (schemaRef) {
      const modelName = schemaRef.split('/').pop();
      const modelDef = definitions[modelName];
      if (modelDef && modelDef.properties) {
        fields = Object.entries(modelDef.properties).map(([key, prop]) => ({
          name: key,
          label: prop.description || key,
          type: mapSwaggerTypeToVue(prop.type, prop.format),
          required: (modelDef.required || []).includes(key)
        }));
      }
    }
  }

  // 提取请求参数 (用于表单或搜索栏)
  let queryParams = [];
  let bodyParams = [];
  
  if (bestMatch.details.parameters) {
    bestMatch.details.parameters.forEach(param => {
      if (param.in === 'query') {
        queryParams.push({
          name: param.name,
          label: param.description || param.name,
          type: mapSwaggerTypeToVue(param.type, param.format),
          required: param.required
        });
      } else if (param.in === 'body' || param.in === 'formData') {
         // 简化处理，实际需解析 body schema
         bodyParams.push({
           name: param.name,
           label: param.description || param.name,
           type: 'object', 
           required: param.required
         });
      }
    });
  }

  return {
    apiEndpoint,
    method: bestMatch.method.toUpperCase(),
    apiFunctionName,
    fields: fields.length > 0 ? fields : undefined, // 如果没解析到字段，保留 undefined 让 AI 后续补充
    queryParams,
    bodyParams
  };
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function mapSwaggerTypeToVue(type, format) {
  if (type === 'integer' || type === 'number') return 'number';
  if (type === 'boolean') return 'boolean';
  if (format === 'date' || format === 'date-time') return 'date';
  return 'text';
}

function mergeContext(existing, newContext) {
  // 新上下文优先，但保留已有的非空值
  return {
    ...existing,
    ...newContext,
    fields: newContext.fields || existing.fields,
    queryParams: newContext.queryParams || existing.queryParams
  };
}

module.exports = {
  parseSwagger,
  mergeContext
};
