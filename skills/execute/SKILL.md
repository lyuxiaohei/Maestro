---
name: execute
description: "执行技能，按PLAN.md逐项执行任务。当用户提到execute、执行计划、开始实施、执行任务时触发。"
risk: low
source: project
version: "1.2"
---

# 轻量执行（编排器）

## 触发条件

- `/lite-execute` — 执行当前 PLAN.md 中的任务
- `/lite-execute {slug}` — 指定工作流 slug
- 被 workflow-lite 在 execute 步骤调度

## 编排流程

### 1. 确定工作流路径

- 读取 `.planning/STATE.md` 获取 `current_milestone`，确定 `{workflow_base}` = `.planning/{current_milestone}/workflows/{slug}/`
- 无 slug 时扫描 `.planning/{current_milestone}/workflows/` 查找 active 的轻量工作流
- 读取 `{workflow_base}/workflow.md` 确认是轻量模式

### 2. 前置检查

- 确认 `{workflow_base}/PLAN.md` 存在（如不存在，提示先运行 plan）
- 确认当前步骤为 execute 或可直接进入 execute

### 3. spawn lite-executor Agent

```
Agent(subagent_type="lite-executor", prompt="## Task Parameters\n- workflow_slug: {slug}\n- workflow_base: {workflow_base}\n")
```

等待 Agent 返回完成信号。

### 4. 处理结果

**`## EXECUTION COMPLETE`**：
- 展示执行摘要（完成任务数、偏差调整、受影响文件）
- 更新 `{workflow_base}/workflow.md`：step=verify
- STOP，输出：`execute 完成。输入 /maestro-verify {slug} 继续 verify 步骤。`

**`## EXECUTION BLOCKED`**：
- 向用户展示阻塞原因
- 用户可选择：
  - 提供缺失信息后重新 spawn Agent
  - 跳过阻塞任务继续
  - 放弃本次执行
