# React 语言包 — Ant Design + Vite + TypeScript + Zustand

---
name: lang-react
description: "React 语言包：Ant Design 5 + Vite 5 + TypeScript + Zustand + Tailwind CSS。分层约定、to() 错误处理、TDD 规范。"
maturity: mature
---

激活后以下约定全程有效。编码前 Briefing（tool-call-sequence Step 0）必须加载本语言包。

## 0. 与 execute Skill 契约

| 必读资源 | 文件 | 加载时机 |
|----------|------|---------|
| 技术栈 | `modules/tech-stack.md` | 语言包激活时 |
| 模块结构 | `modules/module-structure.md` | Briefing 必读 |
| 检查清单 | `modules/checklists.md` | Briefing 必读对应段 |
| 企业层 | `modules/enterprise/` | 可选，按需加载 |
| 代码模板 | `templates/*.md` | Briefing 按涉及类型加载 |

Briefing 不读 = 编码门违规。

## 1. 技术栈

加载 `modules/tech-stack.md` 获取当前技术栈版本。用户可修改该文件。

## 2. 分层约定（硬规则）

| 规则 | 说明 |
|------|------|
| views/ 按业务模块划分 | 每个页面一个文件夹，含 index.tsx + components/ + hooks/ |
| views/index.tsx < 500 行 | 超过必须拆分到 components/ |
| hooks 封装副作用 | API 调用、store 操作封装在 hooks |
| api/ 只做 HTTP | 不处理业务状态 |
| API 调用必须用 `to()` | 禁止 try-catch 处理 API 调用 |
| 类型定义集中在 api/interface/ | 禁止组件文件内定义共享类型 |
| 全局组件放 components/ | 页面子组件放 views/{module}/components/ |
| 工具函数统一从 @/utils 导入 | src/utils/index.ts 统一导出 |

## 3. TypeScript 严格模式

- 禁止 `any`（用 `unknown` + 类型守卫）
- 禁止 `!` 非空断言（需先 null 检查）
- 禁止 `@ts-ignore`
- 对象属性必须使用 `?.` 可选链

## 4. API 调用规范

所有 API 调用必须用 `to()` 包裹，必须处理 error 和 result 两种情况，错误时必须重置 loading。

## 5. TDD 规范

| 层 | 框架 |
|----|------|
| 工具函数 | Vitest 直接断言 |
| 自定义 Hook | renderHook + act |
| Store | getState() + action |
| API 模块 | vi.mock + mockResolvedValue |
| 组件 | render + screen + userEvent |

## 6. 模板加载表

| 开发场景 | 加载模板 | checklist 段名 |
|----------|---------|---------------|
| 定义 API 类型 | `templates/api-types.md` | 写 React API 层前 |
| 编写 API 模块 | `templates/api-module.md` | 写 React API 层前 |
| 配置 Axios | `templates/axios-instance.md` | 写 React Axios 实例前 |
| 使用 to() | `templates/to-utility.md` | 写 React utils 前 |
| 编写 Store | `templates/store.md` | 写 React Zustand Store 前 |
| 编写 Hook | `templates/hooks.md` | 写 React hooks 前 |
| 列表页面 | `templates/page-list.md` | 写 React 列表页前 |
| 弹框组件 | `templates/modal.md` | 写 React Modal 前 |
| 工具函数 | `templates/utils.md` | 写 React utils 前 |
| 配置路由 | `templates/router.md` | 写 React Router 前 |
| 测试（5 个模板） | `templates/test-*.md` | 写 React 测试前 |

## 7. 自定义模块

| 模块 | 加载时机 |
|------|---------|
| `modules/tech-stack.md` | 激活时 |
| `modules/module-structure.md` | 激活时 |
| `modules/checklists.md` | Briefing 必读对应段（10 段） |
| `modules/enterprise/eslint-config.md` | 配置 ESLint 时（可选） |
| `modules/enterprise/property-testing.md` | 涉及属性测试时（可选） |

企业层模块独立加载，通用层不依赖企业层。
