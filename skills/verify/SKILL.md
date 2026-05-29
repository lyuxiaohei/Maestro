---
name: verify
description: "验证技能，对照PLAN.md检查执行结果。当用户提到verify、验证结果、检查完成度时触发。"
risk: low
source: project
version: "1.1"
---

# 轻量验证

## 触发条件

- `/lite-verify` — 验证当前迭代的执行结果
- `/lite-verify {slug}` — 指定工作流 slug
- 被 workflow-lite 在 verify 步骤调度

## 执行流程

### 1. 加载基准

- 读取 `.planning/workflows/{slug}/PLAN.md`（或 PLAN-01.md... 多计划时）
- 读取 CONTEXT.md（决策约束）
- 收集实际变更（git diff、文件对比）

### 2. 逐项验证

对 PLAN.md 每个任务检查三项：

| 检查维度 | 说明 |
|----------|------|
| **完整性** | 任务是否完成（对照 `<done>` 验收标准或描述） |
| **正确性** | 是否符合 Locked Decisions 约束（不得简化或降级） |
| **一致性** | 与其他任务结果是否矛盾 |

每项判定 **PASS** / **FAIL** / **PARTIAL**。

### 3. 决策覆盖审计

对照 CONTEXT.md 三级决策检查覆盖情况：

- 逐个 Locked Decision (D-01...) 检查是否有对应任务实现，实现是否符合决策原文
- Deferred Ideas (DEF-01...) 确认未出现在实现中
- Discretion (CLD-01...) 确认有合理的选择和记录

**未覆盖的 Locked Decision → 自动 FAIL**。

### 4. 写入 VERIFICATION.md

写入 `.planning/workflows/{slug}/VERIFICATION.md`，包含：

```markdown
## 任务验证
| 任务 | 验证项 | 结果 |
|------|--------|------|
| T-01 | [验收标准] | PASS/FAIL/PARTIAL |

## 决策覆盖
| 决策 | 覆盖状态 | 说明 |
|------|----------|------|
| D-01 | COVERED | [实现位置] |
| DEF-01 | NOT_PRESENT | OK — 已延议 |

## 问题列表
（如有 FAIL/PARTIAL 项，列出具体问题）

## 总体结论
PASS / FAIL — [说明]
```

### 5. 判定和推进

- **全部 PASS 且决策全部覆盖**：目标达成
  - workflow-lite single 模式 → status=complete
  - workflow-lite multi 模式 → 处理下一任务
- **存在 FAIL/PARTIAL 或决策未覆盖**：列出问题，建议开启新迭代
  - workflow-lite → iteration+1，step=discuss

### 6. 用户确认

- 展示验证摘要和判定结果
- 等待用户确认或要求修改
