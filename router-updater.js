/**
 * 路由合并占位：子工程 router 结构各异，生成后请按需手工合并或使用自定义脚本。
 */

const fs = require('fs');

function updateRouter(routerPath, context, subProject) {
  if (!fs.existsSync(routerPath)) {
    console.warn(`路由文件不存在，跳过写入: ${routerPath}`);
    return;
  }
  console.warn(
    `路由需手动合并（示例 path: ${context.routePath || context.componentName}）子工程: ${subProject}`
  );
}

module.exports = {
  updateRouter,
};
