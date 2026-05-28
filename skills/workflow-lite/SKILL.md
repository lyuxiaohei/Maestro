---
name: workflow-lite
description: "轻量工作流引擎，复用单阶段生命周期流水线（讨论→规划→执行→验证），不依赖18阶段状态机。当用户提到workflow-lite、轻量工作流、快速迭代、lite模式时触发。"
risk: low
source: project
version: "1.0"
---

# 轻量工作流

## 触发条件

- `/workflow-lite {slug}` — 创建或恢复轻量工作流
- `/workflow-lite` — 列出已有工作流或创建新的
- 用户提到"轻量工作流"、"快速迭代"、"lite 模式"

## 初始化

1. 解析 slug。无 slug 时列出 `.planning/workflows/` 下所有工作流供选择或输入新名称
2. 检查 `{workflow_base}`（`.planning/workflows/{slug}/`）是否存在
3. **已存在**：读取 workflow.md。检测到 `phase_index` 字段（全量工作流）时提示"此工作流使用18阶段模式，请用 /workflow 继续"。检测到 `mode` 字段（轻量工作流）时从中断点恢复
4. **不存在**：用 AskUserQuestion 交互获取目标描述和工作模式（single/multi），写入 workflow.md（模板见 [lite-state-schema.md](references/lite-state-schema.md)）
5. 初始化后进入迭代流水线的 discuss 步骤

## 迭代流水线

每次迭代按顺序调用 4 个 Skill，完成 discuss→plan→execute→verify 循环：

| 步骤 | 斜杠命令 | 产出 | 完成后 |
|------|----------|------|--------|
| **discuss** | `/maestro-discuss` | CONTEXT.md（D-01...） | step → plan |
| **plan** | `/maestro-plan` | PLAN.md（T-01...） | step → execute |
| **execute** | `/maestro-execute` | 文件变更 | step → verify |
| **verify** | `/maestro-verify` | VERIFICATION.md | 判定 ↓ |

**verify 判定**：目标达成 → single 模式设 status=complete，multi 模式处理下一任务。目标未达 → iteration+1，回到 discuss。

## 跨会话续接

- `/workflow-lite {slug}` 命中已存在的 active 工作流时，读取当前 iteration 和 step，从断点恢复
- status 为 complete 时询问"目标已达成，是否开启新迭代？"

## 引用文件

| 文件 | 用途 |
|------|------|
| [references/lite-state-schema.md](references/lite-state-schema.md) | workflow.md 模板、字段定义、状态流转规则 |
