# Agent Contracts: Agent 调用协议

本文档定义 workflow-engine 编排器与各 Agent 之间的调用协议，包括传参格式、返回格式和完成信号。

---

## Agent 分类

### 调度域 Agent（编排器直接 spawn）

| Agent | 目录 | 模型 | 工具权限 | 上下文隔离 |
|-------|------|------|----------|-----------|
| phase-executor | `orchestrator/` | sonnet | Read, Write, Edit, Glob, Grep | worktree |
| phase-validator | `orchestrator/` | sonnet | Read, Write, Grep, Glob | worktree |
| phase-planner | `orchestrator/` | sonnet | Read, Write, Glob, Grep | worktree |
| plan-checker | `orchestrator/` | sonnet | Read, Grep, Glob | worktree |
| research-synthesizer | `orchestrator/` | sonnet | Read, Write, Glob, Grep | worktree |
| doc-classifier | `orchestrator/` | sonnet | Read, Grep, Glob | worktree |
| doc-synthesizer | `orchestrator/` | sonnet | Read, Write, Glob, Grep | worktree |
| doc-writer | `orchestrator/` | sonnet | Read, Write, Glob, Grep | worktree |
| doc-verifier | `orchestrator/` | sonnet | Read, Grep, Glob | worktree |

### 项目域 Agent（按需 spawn）

| Agent | 目录 | 模型 | 工具权限 | 上下文隔离 |
|-------|------|------|----------|-----------|
| domain-researcher | `domain/` | sonnet | Read, Grep, Glob, WebSearch | worktree |
| competitive-researcher | `domain/` | sonnet | Read, Grep, Glob, WebSearch | — |
| requirement-analyst | `domain/` | sonnet | Read, Grep, Glob, WebSearch | — |
| product-manager | `domain/` | opus | Read, Write, Grep, Glob | worktree |
| architect | `domain/` | opus | Read, Write, Grep, Glob | worktree |
| frontend-developer | `domain/` | opus | Read, Write, Grep, Glob | worktree |
| backend-developer | `domain/` | opus | Read, Write, Grep, Glob | worktree |
| test-engineer | `domain/` | opus | Read, Write, Grep, Glob | worktree |
| ops-engineer | `domain/` | opus | Read, Write, Grep, Glob | worktree |
| security-reviewer | `domain/` | sonnet | Read, Grep, Glob | worktree |
| integration-reviewer | `domain/` | sonnet | Read, Grep, Glob | worktree |

---

## 通用调用协议

### 编排器传参格式

编排器调用 Agent 时，在 prompt 中传递以下结构化参数：

```
## 任务参数

- **phase_index**: 06
- **skill_name**: prototype-design
- **workflow_slug**: user-center
- **upstream_outputs**:
  - P05@V1.0: .planning/workflows/user-center/phases/product-manager/P05-feature-list/P05-STATE.md (功能清单)
  - P09@V1.0: doc/V0.3/logic-list-draft.md (逻辑清单草案)
- **task_description**: 执行阶段 06「原型设计」，根据逻辑清单生成原型 HTML
```

**参数说明：**
- `workflow_slug`: 当前工作流标识符，编排器在所有 Agent 调用时传递，用于跨工作流引用解析

### Agent 返回格式

所有 Agent 必须在执行完成后输出完成信号标记，后跟结构化摘要：

#### 成功

```
## PHASE EXECUTION COMPLETE

### 执行摘要
- 阶段: P06 原型设计
- 执行步骤: 4/4
- 输出文件:
  - prototype-order-list.html
  - prototype-cart.html
- 写入: {phase_dir}/P06-STATE.md
```

#### 阻塞

```
## PHASE BLOCKED

### 阻塞原因
- 缺少上游输入: P05 功能清单未包含「订单模块」功能条目
- 需要用户补充: 订单状态流转规则
```

#### 部分完成

```
## PHASE PARTIAL

### 已完成步骤
- 1. 页面结构规划
- 2. 交互流程设计

### 未完成步骤
- 3. 原型页面生成（缺少：订单详情页交互规则）
- 4. 交互说明编写（依赖步骤 3）
```

#### 检查点

```
## CHECKPOINT REACHED

### Checkpoint 状态
- **已完成步骤**:
  1. [步骤名称] — 产出: [文件路径]
  2. [步骤名称] — 产出: [文件路径]
- **剩余步骤**:
  3. [步骤名称]
  4. [步骤名称]
- **中间产物路径**:
  - {phase_dir}/P##-STATE.md (部分更新)
  - [其他中间文件路径]
- **当前任务进度**: 2/4
```

---

## 完成信号清单

编排器通过正则匹配以下标记判断 Agent 状态：

| 信号 | 含义 | 编排器动作 |
|------|------|-----------|
| `## PHASE EXECUTION COMPLETE` | 阶段执行完成 | 进入 GATE-02 自检 |
| `## PHASE BLOCKED` | 阶段被阻塞 | 标记 STATE.md status=BLOCKED，向用户报告 |
| `## PHASE PARTIAL` | 部分完成 | 记录已完成步骤，等待用户补充信息后续接 |
| `## PHASE SKIPPED` | 阶段已跳过 | 标记 STATE.md status=SKIPPED，直接推进到下一阶段 |
| `## VERIFICATION PASSED` | 验证通过 | 进入 GATE-01 人工确认 |
| `## VERIFICATION CONDITIONAL` | 验证有条件通过 | 合并域问题清单展示给用户，用户决定是否继续 |
| `## VERIFICATION FAILED` | 验证失败 | 标记 STATE.md 验证记录 FAIL，反馈问题清单 |
| `## RESEARCH COMPLETE` | 调研完成 | 将调研结果传递给目标 Skill |
| `## RESEARCH BLOCKED` | 调研受阻 | 向用户报告，请求补充调研方向 |
| `## PLANNING COMPLETE` | 规划完成 | spawn plan-checker 校验计划 |
| `## ISSUES FOUND` | 计划有问题 | 将问题反馈给 phase-planner 重新规划（最多 2 轮） |
| `## CHECKPOINT REACHED` | 执行检查点 | 解析 checkpoint 状态，spawn 新 executor 续接剩余步骤 |
| `## SYNTHESIS COMPLETE` | 调研合并完成 | 将合并摘要传递给后续阶段 |
| `## SYNTHESIS BLOCKED` | 调研合并受阻 | 向用户报告矛盾点，请求裁决 |
| `## SECURITY AUDIT COMPLETE` | 安全审计完成 | 将安全问题合并到阶段验证结果 |
| `## INTEGRATION VERIFICATION COMPLETE` | 集成验证完成 | 将集成问题合并到阶段验证结果 |
| `## CLASSIFICATION COMPLETE` | 文档分类完成 | 将分类结果传给 doc-synthesizer |
| `## DOC WRITE COMPLETE` | 文档生成完成 | 将生成文档传给 doc-verifier |
| `## DOC VERIFICATION COMPLETE` | 文档验证完成 | 进入 GATE-01 人工确认 |

---

## 模型升级协议

当 Agent 连续失败时，编排器可自动升级模型：

| 重试次数 | 模型 | 适用场景 |
|----------|------|----------|
| 第 1 次 | sonnet（默认） | 所有 Agent |
| 第 2 次 | opus | 执行类、验证类 Agent |
| 第 3 次 | 暂停，请求人工介入 | 所有 Agent |

---

## 各 Agent 专用协议

### phase-executor

- **触发时机**: GATE-03 通过后、阶段任务开始前
- **传参**: phase_index, skill_name, workflow_slug, upstream_outputs, task_description, phase_dir, phase_slug, checkpoint_context（续接时可选）
- **返回**: PHASE EXECUTION COMPLETE / BLOCKED / PARTIAL / CHECKPOINT REACHED
- **写入权限**: 可写入 {phase_dir}/ 下的 STATE.md 输出部分和版本链、P##-OUTPUT.md、P##-SUMMARY.md

### phase-validator

- **触发时机**: GATE-02 自检通过后（GATE-05）
- **传参**: phase_index, workflow_slug, upstream_outputs, phase_dir
- **返回**: VERIFICATION PASSED / VERIFICATION FAILED + 问题清单
- **写入权限**: 可写入 {phase_dir}/P##-VERIFICATION.md，不可修改其他文件（Edit 禁用）

### domain-researcher

- **触发时机**: 工作流首次启动或用户请求领域调研
- **传参**: project_description, domain_keywords
- **返回**: RESEARCH COMPLETE / RESEARCH BLOCKED + 领域知识摘要
- **写入权限**: 只读，结果返回给编排器

### competitive-researcher

- **触发时机**: competitive-analysis Skill 执行过程中
- **传参**: competitor_names, research_dimensions
- **返回**: RESEARCH COMPLETE / RESEARCH BLOCKED + 竞品调研数据
- **写入权限**: 只读，结果返回给 Skill

### phase-planner

- **触发时机**: GATE-03 通过后，阶段执行前（规划流水线第 1 步）
- **传参**: phase_index, skill_name, workflow_slug, upstream_outputs, phase_dir
- **返回**: PLANNING COMPLETE / PHASE BLOCKED
- **写入权限**: 可写入 `{phase_dir}/P##-PLAN.md`

### plan-checker

- **触发时机**: phase-planner 返回 PLANNING COMPLETE 后（规划流水线第 2 步）
- **传参**: phase_index, plan_path（如 `{phase_dir}/P##-PLAN.md`）
- **返回**: VERIFICATION PASSED / ISSUES FOUND + 结构化问题清单
- **写入权限**: 只读，不修改任何文件

### research-synthesizer

- **触发时机**: 并行调研全部完成后（并行调研调度第 3 步）
- **传参**: research_outputs, research_dimensions
- **返回**: SYNTHESIS COMPLETE / SYNTHESIS BLOCKED
- **写入权限**: 可写入调研合并摘要文件

### security-reviewer

- **触发时机**: P13 阶段 phase-validator 并行（专项验证调度）
- **传参**: phase_index, target_paths
- **返回**: SECURITY AUDIT COMPLETE / AUDIT BLOCKED
- **写入权限**: 只读，不修改任何文件

### integration-reviewer

- **触发时机**: P16 阶段 phase-validator 并行（专项验证调度）
- **传参**: phase_index, module_paths, design_docs
- **返回**: INTEGRATION VERIFICATION COMPLETE / INTEGRATION BLOCKED
- **写入权限**: 只读，不修改任何文件

### doc-classifier

- **触发时机**: GATE-05 通过后，文档管道第 1 步
- **传参**: doc_path
- **返回**: CLASSIFICATION COMPLETE / CLASSIFICATION FAILED
- **写入权限**: 只读，不修改任何文件

### doc-synthesizer

- **触发时机**: doc-classifier 完成后，文档管道第 2 步
- **传参**: classified_docs, output_path
- **返回**: SYNTHESIS COMPLETE / SYNTHESIS BLOCKED
- **写入权限**: 可写入 INGEST-CONFLICTS.md

### doc-writer

- **触发时机**: doc-synthesizer 完成后，文档管道第 3 步
- **传参**: doc_assignment（doc_type, mode, target_path, sources, context）
- **返回**: DOC WRITE COMPLETE / DOC WRITE FAILED
- **写入权限**: 可写入目标文档路径

### doc-verifier

- **触发时机**: doc-writer 完成后，文档管道第 4 步
- **传参**: doc_path
- **返回**: DOC VERIFICATION COMPLETE / DOC VERIFICATION FAILED
- **写入权限**: 只读，不修改任何文件

---

## 岗位 Agent 专用协议

岗位 Agent 以双模式接入编排器：规划时作为域顾问（plan_advisor）审阅计划，验证时作为域审核者（verification_reviewer）并行运行。所有岗位 Agent 统一使用 opus 模型，工具权限为 Read, Write, Grep, Glob（Write 仅限 `{phase_dir}/P##-VERIFICATION.md`）。

### product-manager

- **触发时机**: phase-planner 规划审阅（D-08）+ GATE-05 岗位验证（D-09）
- **传参**: phase_index, workflow_slug, upstream_outputs, phase_dir, review_mode (plan_advisor | verification_reviewer)
- **返回**: VERIFICATION PASSED / VERIFICATION CONDITIONAL / VERIFICATION FAILED + 产品域评审报告
- **写入权限**: 可写入 {phase_dir}/P##-VERIFICATION.md，不可修改其他文件

### architect

- **触发时机**: phase-planner 规划审阅（D-08）+ GATE-05 岗位验证（D-09）
- **传参**: phase_index, workflow_slug, upstream_outputs, phase_dir, review_mode (plan_advisor | verification_reviewer)
- **返回**: VERIFICATION PASSED / VERIFICATION CONDITIONAL / VERIFICATION FAILED + 架构域评审报告
- **写入权限**: 可写入 {phase_dir}/P##-VERIFICATION.md，不可修改其他文件

### frontend-developer

- **触发时机**: phase-planner 规划审阅（D-08）+ GATE-05 岗位验证（D-09）
- **传参**: phase_index, workflow_slug, upstream_outputs, phase_dir, review_mode (plan_advisor | verification_reviewer)
- **返回**: VERIFICATION PASSED / VERIFICATION CONDITIONAL / VERIFICATION FAILED + 前端域评审报告
- **写入权限**: 可写入 {phase_dir}/P##-VERIFICATION.md，不可修改其他文件

### backend-developer

- **触发时机**: phase-planner 规划审阅（D-08）+ GATE-05 岗位验证（D-09）
- **传参**: phase_index, workflow_slug, upstream_outputs, phase_dir, review_mode (plan_advisor | verification_reviewer)
- **返回**: VERIFICATION PASSED / VERIFICATION CONDITIONAL / VERIFICATION FAILED + 后端域评审报告
- **写入权限**: 可写入 {phase_dir}/P##-VERIFICATION.md，不可修改其他文件

### test-engineer

- **触发时机**: phase-planner 规划审阅（D-08）+ GATE-05 岗位验证（D-09）
- **传参**: phase_index, workflow_slug, upstream_outputs, phase_dir, review_mode (plan_advisor | verification_reviewer)
- **返回**: VERIFICATION PASSED / VERIFICATION CONDITIONAL / VERIFICATION FAILED + 测试域评审报告
- **写入权限**: 可写入 {phase_dir}/P##-VERIFICATION.md，不可修改其他文件

### ops-engineer

- **触发时机**: phase-planner 规划审阅（D-08）+ GATE-05 岗位验证（D-09）
- **传参**: phase_index, workflow_slug, upstream_outputs, phase_dir, review_mode (plan_advisor | verification_reviewer)
- **返回**: VERIFICATION PASSED / VERIFICATION CONDITIONAL / VERIFICATION FAILED + 运维域评审报告
- **写入权限**: 可写入 {phase_dir}/P##-VERIFICATION.md，不可修改其他文件
