# 轻量工作流状态模板

## 目录结构

```
.planning/workflows/{slug}/
  workflow.md        — 状态追踪（唯一必需文件）
  CONTEXT.md         — 当前迭代范围和决策（每次迭代覆盖写）
  PLAN.md            — 当前迭代任务计划（每次迭代覆盖写）
  VERIFICATION.md    — 当前迭代验证结果（每次迭代覆盖写）
```

扁平结构，无域子目录，无阶段编号。

## workflow.md 模板

```markdown
# 轻量工作流 — {slug}

## 元信息
- **slug**: {slug}
- **mode**: single | multi
- **status**: active | complete | paused
- **created_at**: {YYYY-MM-DD}
- **updated_at**: {YYYY-MM-DD}

## 目标
{用户描述的目标}

## 当前迭代
- **iteration**: 1
- **step**: discuss | plan | execute | verify
- **started_at**: {YYYY-MM-DD}

## 迭代历史
| # | 步骤 | 状态 | 完成时间 | 备注 |
|---|------|------|----------|------|
| 1 | discuss | COMPLETE | {date} | D-01~D-03 |
| 1 | plan | COMPLETE | {date} | 5 项任务 |
| 1 | execute | IN_PROGRESS | - | - |
| 1 | verify | PENDING | - | - |

## 任务队列（multi 模式）
| # | 任务 | 状态 | 当前迭代 |
|---|------|------|----------|
| 1 | {任务描述} | COMPLETE | 1 |
| 2 | {任务描述} | IN_PROGRESS | 2 |

## 决策记录
- **D-01**: {决策内容}
```

## 字段说明

| 字段 | 值域 | 说明 |
|------|------|------|
| mode | `single` / `multi` | 单目标迭代 or 多任务队列 |
| status | `active` / `complete` / `paused` | 工作流整体状态 |
| iteration | 正整数 | 当前迭代编号，从 1 开始 |
| step | `discuss` / `plan` / `execute` / `verify` | 当前迭代内的步骤 |

## 状态流转

```
初始化 → discuss → plan → execute → verify
                                              ↓
                                    目标达成 → complete
                                    目标未达 → iteration+1, step=discuss
```

multi 模式下，verify 通过后检查任务队列：
- 有待处理任务 → 开始下一个任务的迭代
- 全部完成 → status=complete

## 与全量工作流的区分

workflow.md 包含 `mode` 字段（非 `template` 字段）且无 `phase_index`，据此区分轻量和全量工作流。全量工作流的 workflow skill 检测到 `mode` 字段时应提示用户使用 `/workflow-lite`。
