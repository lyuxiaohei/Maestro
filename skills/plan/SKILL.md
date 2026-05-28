---
name: plan
description: "规划技能，基于讨论决策分解任务并制定执行计划。当用户提到plan、制定计划、任务分解、规划任务时触发。"
risk: low
source: project
version: "1.0"
---

# 轻量规划

## 触发条件

- `/lite-plan` — 基于已有 CONTEXT.md 制定计划
- `/lite-plan {slug}` — 指定工作流 slug
- 被 workflow-lite 在 plan 步骤调度

## 执行流程

### 1. 加载输入

- 读取 `.planning/workflows/{slug}/CONTEXT.md`（决策和范围）
- 读取 workflow.md 获取目标描述
- 如无 CONTEXT.md，直接交互获取目标后继续

### 2. 任务分解

- 根据 CONTEXT.md 的决策将目标分解为具体任务
- 每个任务编号 T-01、T-02...，包含：
  - 描述（祈使句）
  - 类型（新建/修改/删除/验证）
  - 涉及文件路径
  - 依赖关系（阻塞于哪个任务）

### 3. 排序

- 按依赖关系拓扑排序
- 标注关键路径和可并行任务组

### 4. 写入 PLAN.md

- 写入 `.planning/workflows/{slug}/PLAN.md`
- 包含：任务列表表格、依赖关系、关键路径、影响范围

### 5. 用户确认

- 展示计划摘要（任务数、关键路径、风险点）
- 等待用户确认或修改
- 确认后更新 workflow.md step=execute（如适用）
