---
name: plan
description: "规划技能，基于讨论决策分解任务并制定执行计划。当用户提到plan、制定计划、任务分解、规划任务时触发。"
risk: low
source: project
version: "1.2"
---

# 轻量规划（编排器）

## 触发条件

- `/maestro-plan` — 基于已有 CONTEXT.md 制定计划
- `/maestro-plan {slug}` — 指定工作流 slug
- 被 workflow-lite 在 plan 步骤调度

## 编排流程

### 1. 确定工作流路径

- 确定工作流基路径 `{workflow_base}`。若 `.planning/STATE.md` 存在，读取 `current_milestone` 确定版本路径 `{version_base}` = `.planning/{current_milestone}/`，则 `{workflow_base}` = `{version_base}workflows/{slug}/`；若 STATE.md 不存在，直接在 `.planning/workflows/{slug}/` 下查找或创建
- 无 slug 时扫描对应 `workflows/` 目录查找 active 的轻量工作流
- 读取 `{workflow_base}/workflow.md` 确认是轻量模式（有 `mode` 字段）

### 2. 前置检查

- 确认 `{workflow_base}/CONTEXT.md` 存在（如不存在，提示先运行 discuss）
- 确认当前步骤为 plan 或可直接进入 plan

### 3. spawn lite-planner Agent

```
Agent(subagent_type="lite-planner", prompt="## Task Parameters\n- workflow_slug: {slug}\n- workflow_base: {workflow_base}\n")
```

等待 Agent 返回 `## PLANNING COMPLETE`。

### 4. 展示结果

Agent 完成后，读取产出的 PLAN.md，向用户展示摘要：
- 计划数、任务数、执行波次
- 决策覆盖情况
- 关键路径和风险点

### 5. 用户确认

- 用 AskUserQuestion 等待用户确认或修改
- 确认后更新 `{workflow_base}/workflow.md`：step=execute，STOP，输出：`plan 完成。输入 /maestro-execute {slug} 继续 execute 步骤。`
- 用户要求修改时，描述修改要求后重新 spawn Agent
