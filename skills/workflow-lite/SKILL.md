---
name: workflow-lite
description: "轻量工作流引擎，复用单阶段生命周期流水线（讨论→规划→执行→验证），不依赖18阶段状态机。当用户提到workflow-lite、轻量工作流、快速迭代、lite模式时触发。"
risk: low
source: project
version: "1.0"
---

# 轻量工作流

## 触发条件

- `/maestro-workflow-lite {slug}` — 创建或恢复轻量工作流
- `/maestro-workflow-lite` — 列出已有工作流或创建新的
- 用户提到"轻量工作流"、"快速迭代"、"lite 模式"

## 初始化

1. 确定工作流基路径。若 `.planning/STATE.md` 存在，读取 `current_milestone` 确定版本基路径 `{version_base}` = `.planning/{current_milestone}/`；若不存在，直接以 `.planning/` 为基路径，扫描其下所有子目录查找 `workflows/` 目录
2. 解析 slug。无 slug 时在 `{version_base}workflows/` 下列出所有工作流供选择或输入新名称。若 `workflows/` 目录不存在，直接创建
3. 检查 `{workflow_base}`（`{version_base}workflows/{slug}/`）是否存在
4. **已存在**：读取 workflow.md。检测到 `phase_index` 字段（全量工作流）时提示"此工作流使用18阶段模式，请用 /maestro-workflow 继续"。检测到 `mode` 字段（轻量工作流）时从中断点恢复
5. **不存在**：用 AskUserQuestion 交互获取目标描述和工作模式（single/multi），写入 workflow.md（模板见 [lite-state-schema.md](references/lite-state-schema.md)）
6. 初始化后进入 discuss 步骤。discuss 完成后 STOP，不自动推进

## discuss 步骤

discuss 直接在主会话执行（需要 AskUserQuestion）。加载 `discuss` Skill，传入 workflow_slug 和 workflow_base。discuss 完成后 STOP，输出：`discuss 完成。输入 /maestro-plan {slug} 继续 plan 步骤。`

## 迭代管理

当用户调用 `/maestro-workflow-lite {slug}` 且 workflow.md 当前 step=verify 时，读取 `{workflow_base}/VERIFICATION.md` 判定结果：

- **PASSED**：single 模式 → 更新 workflow.md status=complete；multi 模式 → 更新 iteration+1、step=discuss
- **FAILED**：建议用户开启新迭代，用户确认后更新 workflow.md iteration+1、step=discuss

## 跨会话续接

- `/maestro-workflow-lite {slug}` 命中已存在的 active 工作流时，读取当前 iteration 和 step，从断点恢复
- status 为 complete 时询问"目标已达成，是否开启新迭代？"

## 引用文件

| 文件 | 用途 |
|------|------|
| [references/lite-state-schema.md](references/lite-state-schema.md) | workflow.md 模板、字段定义、状态流转规则 |
