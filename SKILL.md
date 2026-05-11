# AOP-H5 代码生成助手

## 简介
基于 Swagger 接口文档、需求文档和设计图，自动生成符合 aop-h5 微前端架构规范的 Vue2 + Element UI 代码。支持列表页、表单页等常见场景。

## 触发关键词
- 生成页面
- 新建模块
- 代码生成
- Swagger生成

## 使用示例
> @QClaw 生成页面，子工程 aop-h5-l2，类型 list，Swagger地址 http://api.example.com/v2/api-docs

## 参数说明
| 参数名 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| sub_project | string | 是 | 目标子工程名称 (如 aop-h5-l1) |
| page_type | string | 是 | 页面类型 (list, form, detail) |
| swagger_url | string | 否 | Swagger/OpenAPI JSON 地址 |
| doc_path | string | 否 | 本地需求文档路径 |
| design_image | string | 否 | 原型设计图路径 |

## 注意事项
1. 确保 QClaw 运行环境已安装 `axios`, `ejs` 等依赖。
2. Swagger 地址需在网络可达范围内。
3. 生成的代码会自动写入对应子工程的 `src/views` 和 `src/api` 目录。
