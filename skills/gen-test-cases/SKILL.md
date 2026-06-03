# 测试用例生成 — AI Pipeline

---
name: gen-test-cases
description: "测试骨架生成：读 CONTEXT.md/PLAN.md → AI pipeline 5 步 → 测试用例 + 骨架代码"
---

编码门测试 scaffolding。在编码前自动或手动触发，按需求设计文档生成测试用例骨架。

## 触发场景

- 编码前自动生成测试骨架（推荐）
- 新项目从零建测试用例集
- 多 strategy 测试需按场景分流

## 前置条件

- `.planning/{version}/workflows/{slug}/CONTEXT.md` 存在且含需求/设计信息
- 已激活对应语言包（lang-react / lang-java）

## AI Pipeline（5 步）

### Step 1: 读上下文提取测试场景

读 `CONTEXT.md` / `PLAN.md` 的需求描述和成功标准，列出测试场景：
- 标题（业务可读）
- 引用原文具体段落
- happy_path（3-5 步）
- 至少 2 个 edge case

### Step 2: 判定 test_strategy

按 `references/strategy-decision.md` 决策树判定：

| strategy | UI 涉入 | 跨服务 | 工具 |
|----------|---------|--------|------|
| e2e | 是 | 是（单场景） | Playwright |
| e2e-flow | 是 | 是（多步业务流） | Playwright 多页编排 |
| component | 是 | 否 | Vitest + MSW |
| integration | 否 | 是 | JUnit 5 + @SpringBootTest |
| unit | 否 | 否 | 归 TDD，本 Skill 不生成 |

### Step 3: 生成 test-cases.md（人读）

输出到 `.planning/{version}/workflows/{slug}/test-cases/`。每个 case 含编号、标题、前置条件、步骤、预期结果。

### Step 4: 生成对应技术栈骨架代码

按 strategy 从 `templates/` 选择模板填充骨架代码。

| strategy | 模板 |
|----------|------|
| integration | `templates/junit5-unit.tmpl` |
| component | `templates/vitest-component.tmpl` |
| e2e / e2e-flow | `templates/playwright-e2e.tmpl` |
| integration (Python) | `templates/pytest-integration.tmpl` |

骨架为不可跑的 TODO 占位，标注 `// AI-GENERATED: review before merge`。

### Step 5: 输出完成确认

确认生成文件清单，输出完成摘要。

## Maestro 路径适配

| devkit 原始路径 | Maestro 路径 |
|----------------|-------------|
| `openspec/changes/active/{id}/proposal.md` | `.planning/{version}/workflows/{slug}/CONTEXT.md` |
| `test/cases/{change_id}/` | `.planning/{version}/workflows/{slug}/test-cases/` |

## 完成标准

- [ ] test-cases.md 含 ≥ 1 case
- [ ] 至少一栈骨架代码已生成
- [ ] 每个 skeleton 顶部含 AI-GENERATED 注释
- [ ] 不引用 openspec/ 目录

## 参考文件

- [references/strategy-decision.md](references/strategy-decision.md) — 5 种 strategy 决策树
