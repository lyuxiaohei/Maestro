---
name: verify
description: "验证技能，对照PLAN.md检查执行结果。当用户提到verify、验证结果、检查完成度时触发。"
risk: low
source: project
version: "1.2"
---

# 轻量验证（编排器）

## 触发条件

- `/lite-verify` — 验证当前迭代的执行结果
- `/lite-verify {slug}` — 指定工作流 slug
- 被 workflow-lite 在 verify 步骤调度

## 编排流程

### 1. 确定工作流路径

- 读取 `.planning/STATE.md` 获取 `current_milestone`，确定 `{workflow_base}` = `.planning/{current_milestone}/workflows/{slug}/`
- 无 slug 时扫描 `.planning/{current_milestone}/workflows/` 查找 active 的轻量工作流
- 读取 `{workflow_base}/workflow.md` 确认是轻量模式

### 2. 前置检查

- 确认 `{workflow_base}/PLAN.md` 存在
- 确认当前步骤为 verify 或可直接进入 verify

### 3. spawn lite-verifier Agent

```
Agent(subagent_type="lite-verifier", prompt="## Task Parameters\n- workflow_slug: {slug}\n- workflow_base: {workflow_base}\n")
```

等待 Agent 返回完成信号。

### 4. 处理结果

- 将验证结果写入 `{workflow_base}/VERIFICATION.md`
- 更新 `{workflow_base}/workflow.md`：step=verify（保持当前步骤不变）
- STOP，输出模式相关提示：
  - lite 模式：`verify 完成。输入 /maestro-workflow-lite {slug} 查看结果。`
  - full 模式：`verify 完成。输入 /maestro-workflow {slug} 继续下一阶段。`

### 5. 用户确认

- 展示验证摘要
- 等待用户确认或要求修改
- 确认后 STOP，不自动推进
