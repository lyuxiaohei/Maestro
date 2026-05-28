---
name: verify
description: "验证技能，对照PLAN.md检查执行结果。当用户提到verify、验证结果、检查完成度时触发。"
risk: low
source: project
version: "1.0"
---

# 轻量验证

## 触发条件

- `/lite-verify` — 验证当前迭代的执行结果
- `/lite-verify {slug}` — 指定工作流 slug
- 被 workflow-lite 在 verify 步骤调度

## 执行流程

### 1. 加载基准

- 读取 `.planning/workflows/{slug}/PLAN.md`（任务列表）
- 读取 CONTEXT.md（决策约束）
- 收集实际变更（git diff、文件对比）

### 2. 逐项验证

对 PLAN.md 每个任务检查：完整性（是否完成）、正确性（是否符合决策）、一致性（与其他任务结果是否矛盾）。每项判定 PASS / FAIL / PARTIAL。

### 3. 写入 VERIFICATION.md

- 写入 `.planning/workflows/{slug}/VERIFICATION.md`
- 包含：逐项验证结果表格、问题列表（如有）、总体结论

### 4. 判定和推进

- **全部 PASS**：目标达成，展示验证摘要
  - workflow-lite single 模式 → status=complete
  - workflow-lite multi 模式 → 处理下一任务
- **存在 FAIL/PARTIAL**：列出问题，建议开启新迭代
  - workflow-lite → iteration+1，step=discuss

### 5. 用户确认

- 展示验证摘要和判定结果
- 等待用户确认或要求修改
