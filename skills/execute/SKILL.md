---
name: execute
description: "执行技能，按PLAN.md逐项执行任务。当用户提到execute、执行计划、开始实施、执行任务时触发。"
risk: low
source: project
version: "1.0"
---

# 轻量执行

## 触发条件

- `/lite-execute` — 执行当前 PLAN.md 中的任务
- `/lite-execute {slug}` — 指定工作流 slug
- 被 workflow-lite 在 execute 步骤调度

## 执行流程

### 1. 加载计划

- 读取 `.planning/workflows/{slug}/PLAN.md`
- 如无 PLAN.md，提示先运行 `/lite-plan`
- 读取 CONTEXT.md 获取决策约束

### 2. 逐项执行

- 按依赖顺序执行 PLAN.md 中的任务
- 每完成一项在 PLAN.md 中标记 ✅
- 遇到阻塞时暂停并报告，不自行跳过

### 3. 执行原则

- **原子性**：每个任务独立完成，失败不影响已完成任务
- **最小变更**：只做计划中的事，不自行扩展范围
- **安全优先**：破坏性操作（删除、覆盖）需确认
- **可验证**：每个任务的结果可被 verify 步骤检查

### 4. 完成报告

- 全部完成后更新 workflow.md step=verify（如适用）
- 报告：完成任务数、跳过/失败任务（如有）
