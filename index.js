
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { parseSwagger, mergeContext } = require('./swagger-parser');
const { parseRequirements, parseDesignImage } = require('./ai-parser');
const { renderTemplate } = require('./template-engine');
const { updateRouter } = require('./router-updater');

// 获取 QClaw 传入的参数
const params = JSON.parse(process.env.QCLAW_PARAMS || '{}');

async function main() {
  const { sub_project, page_type, swagger_url, doc_path, design_image } = params;

  if (!sub_project || !page_type) {
    console.error('缺少必要参数: sub_project 或 page_type');
    process.exit(1);
  }

  console.log(`开始为 ${sub_project} 生成 ${page_type} 页面...`);

  let context = {
    componentName: '',
    fields: [],
    apiEndpoint: '',
    method: 'GET',
    module: '',
    queryParams: [],
    bodyParams: []
  };

  // 1. 优先解析 Swagger 接口文档
  if (swagger_url) {
    try {
      console.log(`正在从 Swagger 地址获取接口定义: ${swagger_url}`);
      const swaggerData = await fetchSwaggerJson(swagger_url);
      const swaggerContext = parseSwagger(swaggerData, page_type);
      context = mergeContext(context, swaggerContext);
      console.log('Swagger 解析完成');
    } catch (error) {
      console.warn('Swagger 解析失败，将仅依赖其他输入源:', error.message);
    }
  }

  // 2. 解析本地需求文档（作为补充或主要来源，如果无 Swagger）
  if (doc_path && fs.existsSync(doc_path)) {
    const docContent = fs.readFileSync(doc_path, 'utf-8');
    const docContext = await parseRequirements(docContent, page_type);
    context = mergeContext(context, docContext);
  }

  // 3. 解析设计图（主要用于 UI 布局和非数据类交互）
  if (design_image) {
    const imageContext = await parseDesignImage(design_image, page_type);
    context = mergeContext(context, imageContext);
  }

  // 4. 默认值处理
  if (!context.componentName) {
    context.componentName = `${page_type.charAt(0).toUpperCase()}${page_type.slice(1)}View`;
  }
  if (!context.module) {
    context.module = sub_project.replace('aop-h5-', '');
  }

  // 5. 确定输出路径
  const basePath = path.join(process.cwd(), sub_project, 'src', 'views', context.componentName);
  const apiPath = path.join(process.cwd(), sub_project, 'src', 'api', `${context.module}.js`);
  const routerPath = path.join(process.cwd(), sub_project, 'src', 'router', 'index.js');

  // 6. 创建目录
  if (!fs.existsSync(basePath)) {
    fs.mkdirSync(basePath, { recursive: true });
  }

  // 7. 渲染并写入文件
  try {
    // 生成 Vue 组件
    const vueCode = renderTemplate('vue-component', page_type, context);
    fs.writeFileSync(path.join(basePath, 'index.vue'), vueCode, 'utf-8');
    console.log(`已生成: ${basePath}/index.vue`);

    // 生成 SCSS 样式
    const scssCode = renderTemplate('scss-style', 'default', context);
    fs.writeFileSync(path.join(basePath, 'style.scss'), scssCode, 'utf-8');
    console.log(`已生成: ${basePath}/style.scss`);

    // 生成/更新 API 文件
    const apiCode = renderTemplate('api-module', 'default', context);
    if (!fs.existsSync(apiPath)) {
      fs.writeFileSync(apiPath, apiCode, 'utf-8');
    } else {
      // 检查是否已存在相同函数名，避免重复追加
      const existingContent = fs.readFileSync(apiPath, 'utf-8');
      if (!existingContent.includes(context.apiFunctionName || 'fetchData')) {
        fs.appendFileSync(apiPath, `\n\n// Auto-generated for ${context.componentName}\n${apiCode}`);
      }
    }
    console.log(`已更新: ${apiPath}`);

    // 8. 更新路由配置
    updateRouter(routerPath, context, sub_project);
    console.log(`已更新路由: ${routerPath}`);

    console.log('代码生成完成！');
  } catch (error) {
    console.error('生成过程中出错:', error);
    process.exit(1);
  }
}

async function fetchSwaggerJson(url) {
  const response = await axios.get(url);
  return response.data;
}

main();
