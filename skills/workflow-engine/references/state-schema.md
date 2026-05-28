# State Schema: STATE.md 文件模板与字段规范

本文档定义产研工作流中 STATE.md 文件的命名规范、字段结构和模板格式。

---

## 文件命名规范

- 阶段状态文件：`P##-STATE.md`，其中 `##` 为两位数字（01-18）
- 全局状态文件：`workflow.md`
- 文件位置：`.planning/workflows/{slug}/phases/{domain}/P##-{phase-slug}/` 目录下
- `{slug}` 为工作流标识符（kebab-case），`{domain}` 为阶段所属域（product-manager/architect/development/test-engineer/ops-engineer），由 `phase-definitions.md` 的 domain 字段决定

---

## STATE.md 模板

```markdown
# Phase ##: [阶段名称]

## 状态

- **phase_index**: ##
- **status**: NOT_STARTED | IN_PROGRESS | COMPLETE | BLOCKED | SKIPPED
- **version**: V1.0
- **started_at**: -
- **completed_at**: -
- **human_confirmed**: false

## 输入

- **上游阶段**: P##-[阶段标识]
- **上游输出版本**: -
- **输入文档**: (待填充)

## 输出

- **输出文档**: (待填充)
- **输出版本**: -

## 版本链

| 版本 | 日期 | 变更说明 | 上游版本 |
|------|------|----------|----------|
| V1.0 | - | 初始版本 | - |

## 验证记录

- **自检**: PENDING
- **Agent验证**: PENDING
- **人工确认**: PENDING

## 阶段文档

| 文档 | 路径 | 状态 |
|------|------|------|
| CONTEXT | `.planning/workflows/{slug}/phases/{domain}/P##-{phase-slug}/P##-CONTEXT.md` | PENDING |
| PLAN | `.planning/workflows/{slug}/phases/{domain}/P##-{phase-slug}/P##-PLAN.md` | PENDING |
| OUTPUT | `.planning/workflows/{slug}/phases/{domain}/P##-{phase-slug}/P##-OUTPUT.md` | PENDING |
| SUMMARY | `.planning/workflows/{slug}/phases/{domain}/P##-{phase-slug}/P##-SUMMARY.md` | PENDING |
| VERIFICATION | `.planning/workflows/{slug}/phases/{domain}/P##-{phase-slug}/P##-VERIFICATION.md` | PENDING |
```

---

## 字段说明

### 状态字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `phase_index` | 两位数字 | 阶段索引，01-18 |
| `status` | 枚举值 | `NOT_STARTED` / `IN_PROGRESS` / `COMPLETE` / `BLOCKED` / `SKIPPED` |
| `version` | 字符串 | 当前输出版本号，格式 `V{N}.0` |
| `started_at` | 日期 | 阶段开始时间，格式 `YYYY-MM-DD` |
| `completed_at` | 日期 | 阶段完成时间，格式 `YYYY-MM-DD` |
| `human_confirmed` | 布尔值 | 是否已获人工确认，`true` / `false` |

### 输入字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `上游阶段` | 引用 | 上游阶段标识符，格式 `P##-[slug]` |
| `上游输出版本` | 版本号 | 上游阶段输出版本，格式 `V{N}.0` |
| `输入文档` | 引用 | 上游输出文档路径或内联引用 |

### 输出字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `输出文档` | 引用 | 本阶段输出文档路径或内联引用 |
| `输出版本` | 版本号 | 本阶段输出版本号 |

### 版本链

版本链记录每次输出的版本变更历史：

| 列 | 说明 |
|-----|------|
| 版本 | 版本号，如 `V1.0` |
| 日期 | 版本生成日期 |
| 变更说明 | 本次版本变更的说明 |
| 上游版本 | 依赖的上游阶段版本，格式 `P##@V{N}.0` |

### 验证记录

| 字段 | 值 | 说明 |
|------|-----|------|
| `自检` | `PASS` / `FAIL` / `PENDING` | GATE-02 自检结果 |
| `Agent验证` | `PASS` / `FAIL` / `PENDING` | GATE-05 Agent 验证结果 |
| `人工确认` | `PASS` / `PENDING` | GATE-01 人工确认结果 |

### 阶段文档字段

| 列 | 说明 |
|-----|------|
| `文档` | 文档类型：CONTEXT / PLAN / OUTPUT / SUMMARY / VERIFICATION |
| `路径` | 阶段子目录下的文档路径，格式 `.planning/workflows/{slug}/phases/{domain}/P##-{phase-slug}/P##-{TYPE}.md` |
| `状态` | `PENDING`（未写入）/ `WRITTEN`（文件已存在且非空） |

文档写入职责分配：

| 文档 | 写入者 | 写入时机 |
|------|--------|----------|
| CONTEXT | 编排器（workflow-engine） | 阶段启动时（GATE-03 通过后） |
| PLAN | phase-planner | 规划完成时 |
| OUTPUT | phase-executor | 执行完成时 |
| SUMMARY | phase-executor | 执行完成时（与 OUTPUT 同步） |
| VERIFICATION | phase-validator | 验证完成时（GATE-05） |

### BLOCKED 状态额外字段

当阶段状态为 `BLOCKED` 时，在状态部分追加以下字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `blocked_reason` | 字符串 | 阻塞原因摘要，记录 GATE-04 或 GATE-05 返回的问题描述 |

### SKIPPED 状态额外字段

当阶段状态为 `SKIPPED` 时，在状态部分追加以下字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `skip_reason` | 字符串 | 跳过原因，由用户提供（必填） |
| `alternative_inputs` | 列表 | 用户提供的替代输入文档路径列表（可选，可为空） |
| `human_confirmed` | 布尔值 | 跳过操作是否经用户确认，始终为 `true` |

### Agent 验证记录详情

Agent 验证通过后，STATE.md 验证记录中的 `Agent验证` 字段记录以下信息：

```
- **Agent验证**: PASS (timestamp, phase-validator run)
```

Agent 验证失败时：

```
- **Agent验证**: FAIL (timestamp, phase-validator run) — 见问题清单
```

---

## 编排器与 STATE.md 交互规范

### 编排器读取规则

- 编排器仅读取 STATE.md 的状态字段部分（frontmatter 级别字段：status, phase_index, version）
- 不读取完整输出体（输出文档内容），仅在需要传递给下游阶段时读取输出部分的引用路径
- 批量检查前序阶段时（GATE-03），仅检查 status 和 human_confirmed 两个字段
- `SKIPPED` 状态与 `COMPLETE` 等价，视为已通过的前序阶段（`human_confirmed` 隐含为 `true`）

### 编排器写入规则

- 编排器写入以下字段：status、version、started_at、completed_at、human_confirmed、输出部分、版本链、阶段文档状态
- 写入时机：阶段启动时写 status=IN_PROGRESS 和 started_at；阶段完成时写输出部分、版本链、completed_at
- 阶段初始化时创建阶段子目录 `.planning/workflows/{slug}/phases/{domain}/P##-{phase-slug}/` 并写入 P##-CONTEXT.md，更新 STATE.md 阶段文档节
- 阶段文档状态更新：各文档写入后，将对应行的状态从 PENDING 更新为 WRITTEN
- 跳过时写入：status=SKIPPED、skip_reason、alternative_inputs、human_confirmed=true、completed_at，跳过 GATE-02 和 GATE-05
- 版本链追加：每次输出变更时在版本链表格中追加一行，不修改已有行

### 上游输出传递

- 编排器读取上游阶段 STATE.md 的输出部分（`输出文档` 和 `输出版本` 字段）
- 将上游输出文档路径作为当前阶段的输入传递给领域 Skill
- 传递格式：`P{upstream_index}@V{version}` 引用 + 输出文档路径列表
- 如果上游阶段有多个版本，默认传递最新版本
- 如果上游阶段状态为 SKIPPED 且有 alternative_inputs，传递 alternative_inputs 中列出的文档路径；如 alternative_inputs 为空，传递空输入，下游 Skill 需自行判断

### 跨工作流引用

- 跨工作流引用格式：`{workflow-slug}@P{phase}@V{version}`，如 `user-center@P05@V1.0`
- 编排器通过 slug 定位 `.planning/workflows/{slug}/` 目录
- 同工作流内引用保持 `P{upstream_index}@V{version}` 格式不变
- 跨工作流引用时，编排器读取目标工作流 `.planning/workflows/{target-slug}/phases/{domain}/P##-{phase-slug}/P##-STATE.md` 的输出部分

---

## workflow.md 全局状态模板

```markdown
# 产研工作流状态 — {slug}

## 当前阶段

- **workflow_slug**: {slug}
- **phase_index**: 01
- **phase_name**: 需求调研
- **workflow_status**: NOT_STARTED

## 阶段总览

### product-manager（产品域）

| # | 阶段名称 | 域 | phase_status | 版本 |
|---|----------|----|------|------|
| 01 | 需求调研 | product-manager | NOT_STARTED | - |
| 02 | 业务现状流程图 | product-manager | NOT_STARTED | - |
| 03 | 会议纪要 | product-manager | NOT_STARTED | - |
| 04 | 竞品分析 | product-manager | NOT_STARTED | - |
| 05 | 功能清单 | product-manager | NOT_STARTED | - |
| 06 | 原型设计 | product-manager | NOT_STARTED | - |
| 07 | 原型复核 | product-manager | NOT_STARTED | - |
| 08 | UI 设计 | product-manager | NOT_STARTED | - |

> **状态值说明**：`NOT_STARTED`（未开始）→ `IN_PROGRESS`（进行中）→ `COMPLETE`（已完成）→ `SKIPPED`（已跳过）→ `BLOCKED`（已阻塞）

### architect（架构域）

| # | 阶段名称 | 域 | phase_status | 版本 |
|---|----------|----|------|------|
| 09 | 方案设计 | architect | NOT_STARTED | - |
| 10 | 架构设计 | architect | NOT_STARTED | - |
| 11 | 架构评审 | architect | NOT_STARTED | - |
| 12 | 架构细化 | architect | NOT_STARTED | - |
| 13 | 详细设计 | architect | NOT_STARTED | - |

### development（开发域）

| # | 阶段名称 | 域 | phase_status | 版本 |
|---|----------|----|------|------|
| 14 | 开发任务规划 | development | NOT_STARTED | - |
| 15 | 前后端开发 | development | NOT_STARTED | - |

### test-engineer（测试域）

| # | 阶段名称 | 域 | phase_status | 版本 |
|---|----------|----|------|------|
| 16 | 系统测试 | test-engineer | NOT_STARTED | - |
| 17 | 验收测试 | test-engineer | NOT_STARTED | - |

### ops-engineer（部署域）

| # | 阶段名称 | 域 | phase_status | 版本 |
|---|----------|----|------|------|
| 18 | 部署上线 | ops-engineer | NOT_STARTED | - |

## 最后更新

- **updated_at**: -
- **last_completed_phase**: -
```
