---
name: execute
description: "执行技能，按PLAN.md逐项执行任务。当用户提到execute、执行计划、开始实施、执行任务时触发。"
risk: low
source: project
version: "1.1"
---

# 轻量执行

## 触发条件

- `/lite-execute` — 执行当前 PLAN.md 中的任务
- `/lite-execute {slug}` — 指定工作流 slug
- 被 workflow-lite 在 execute 步骤调度

## 执行流程

### 1. 加载计划

- 读取 `.planning/workflows/{slug}/PLAN.md`（或 PLAN-01.md... 多计划时）
- 读取 CONTEXT.md 获取决策约束
- 如无 PLAN.md，提示先运行 `/lite-plan`

### 2. 决策保真（执行前检查）

对 CONTEXT.md 三级决策逐项确认：

- **Locked Decisions**：实现中不得简化、降级或替换。如 D-01 要求"用 Redis 缓存"，不得实现为"内存 Map 缓存"
- **Deferred Ideas**：不得在执行中顺手实现。如果发现延议项其实需要做，先更新 CONTEXT.md 将其升级为 Locked，再执行
- **Discretion**：按自己的判断实现，但必须在完成报告中说明选择了什么

**禁止的简化表述**："v1 版本"、"暂时硬编码"、"先简化"、"后续完善"——遇到这些想法时拆分为新任务而非降级实现。

### 3. 按计划顺序执行

- 多计划时按 wave 顺序执行（同 wave 可并行）
- 每个任务开始前检查其依赖任务是否已完成
- 每完成一项在 PLAN.md 中标记 ✅
- 遇到阻塞时暂停并报告，不自行跳过

### 4. 执行原则

- **原子性**：每个任务独立完成，失败不影响已完成任务
- **最小变更**：只做计划中的事，不自行扩展范围
- **安全优先**：破坏性操作（删除、覆盖）需确认
- **可验证**：每个任务的结果可被 verify 步骤检查

### 5. 偏差处理

执行中发现计划需要调整时：
- 不影响其他任务的小调整：直接执行，在 PLAN.md 中标注调整原因
- 影响其他任务或违反 Locked Decision：暂停，报告用户等待确认
- 发现新需求：记录但不在本次执行中实现，建议加入下一迭代

### 6. 完成报告

- 全部完成后更新 workflow.md step=verify（如适用）
- 报告：完成任务数、偏差调整（如有）、Deferred → Locked 升级（如有）
