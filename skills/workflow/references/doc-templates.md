# Document Templates: 文档模板

本文档定义产研工作流中 doc-writer Agent 使用的标准化文档模板。

---

## summary — 阶段执行摘要

```markdown
---
phase: [phase-id]
status: [complete|blocked|partial]
plans: [N]
completed: [YYYY-MM-DD]
---

# Phase [N]: [阶段名称]

## 执行摘要

[一句话概述本阶段完成的工作]

## 变更清单

### 新增文件（N 个）
- `[文件路径]` — [简述]

### 修改文件（N 个）
- `[文件路径]` — [变更说明]

## 需求覆盖

- [REQ-ID]: [描述] ✓
- [REQ-ID]: [描述] ✓

## 偏差

[无偏差 / 偏差描述]
```

---

## context — 阶段上下文文档

编排器在阶段启动时写入，记录阶段范围、决策和上游引用。不使用 doc-writer 管道。

```markdown
---
phase: [P##]
status: [draft|locked]
created: [YYYY-MM-DD]
---

# Phase P##: [阶段名称] - Context

## 阶段边界

**包含:** [本阶段交付物范围]
**不包含:** [明确不在范围内的事项]

## 上下文决策

- **D-01:** [决策内容]
  - 原因: [决策理由]
  - 影响: [对上下游的影响]

## 规范参考

下游 Agent 必读文件列表：

- `[文件路径]` — [文件说明]

## 代码上下文

### 可复用资产
- [已有组件/工具]: [如何复用]

### 已建立模式
- [模式]: [约束/能力]

### 集成点
- [新代码与现有系统的连接点]

## 具体想法

[特定实现建议 / "无特定要求"]

## 延迟项

- [本阶段不处理的事项]
```

---

## output — 阶段交付物文档

phase-executor 在执行完成时写入，记录本阶段产出的交付物、文件变更和需求覆盖。

```markdown
---
phase: [P##]
status: [complete|partial]
created: [YYYY-MM-DD]
---

# Phase P##: [阶段名称] - Output

## 交付物清单

### 产出文件
- `[文件路径]` — [文件描述]

### 产出文档
- `[文档路径]` — [文档描述]

## 文件变更明细

| 操作 | 文件路径 | 变更说明 |
|------|----------|----------|
| 新增 | [路径] | [说明] |
| 修改 | [路径] | [说明] |

## 需求覆盖表

| 需求编号 | 描述 | 状态 | 产出文件 |
|----------|------|------|----------|
| [REQ-01] | [描述] | COVERED | [文件路径] |

## 偏差说明

[无偏差 / 偏差描述及原因]
```

---

## verification — 阶段验证报告

phase-validator 在验证完成时写入，记录验证结果和问题清单。

```markdown
---
phase: [P##]
result: [PASS|FAIL]
date: [YYYY-MM-DD]
---

## 验证结果: [PASS 或 FAIL]

| 检查项 | 结果 | 说明 |
|--------|------|------|
| 输出完整性 | [PASS/FAIL] | [是否所有 outputs 项均已产出] |
| 输入输出一致性 | [PASS/FAIL] | [输出是否与上游输入逻辑衔接] |
| 版本链完整 | [PASS/FAIL] | [版本号、日期、上游版本是否填写] |
| 自检状态 | [PASS/FAIL] | [STATE.md 验证记录中自检是否 PASS] |
| 上游引用完整性 | [PASS/FAIL] | [被引用的上游文件是否存在且有效] |
| 需求覆盖率 | [PASS/FAIL] | [上游需求条目是否被当前输出覆盖] |

### 问题清单

1. [问题描述]（通过时为空）
```

---

## adr — 架构决策记录

```markdown
---
adr_id: [ADR-NNN]
title: [决策标题]
status: [proposed|accepted|deprecated|superseded]
date: [YYYY-MM-DD]
supersedes: [ADR-NNN]（如有）
---

# [ADR-NNN]: [决策标题]

## 状态

[proposed|accepted|deprecated|superseded]

## 背景

[触发此决策的背景和问题]

## 决策

[做出的决策内容]

## 理由

[为什么选择这个方案]

## 后果

### 正面
- [好处 1]
- [好处 2]

### 负面
- [代价 1]
- [代价 2]

## 备选方案

| 方案 | 优点 | 缺点 | 放弃原因 |
|------|------|------|----------|
| [方案 A] | ... | ... | ... |
| [方案 B] | ... | ... | ... |
```

---

## prd — 产品需求文档

```markdown
---
prd_id: [PRD-NNN]
title: [产品需求标题]
version: [V1.0]
date: [YYYY-MM-DD]
author: [作者]
status: [draft|review|approved]
---

# [PRD-NNN]: [产品需求标题]

## 背景

[产品背景和业务价值]

## 目标用户

[目标用户描述]

## 功能需求

### FR-01: [功能名称]

**优先级**: [P0/P1/P2]
**描述**: [功能描述]
**验收标准**:
- [ ] [标准 1]
- [ ] [标准 2]

### FR-02: ...

## 非功能需求

| 类型 | 要求 | 指标 |
|------|------|------|
| 性能 | [要求] | [量化指标] |
| 安全 | [要求] | [量化指标] |

## 里程碑

| 阶段 | 交付物 | 日期 |
|------|--------|------|
| [阶段 1] | [交付物] | [日期] |
```

---

## spec — 技术规格文档

```markdown
---
spec_id: [SPEC-NNN]
title: [技术规格标题]
version: [V1.0]
date: [YYYY-MM-DD]
status: [draft|review|approved]
depends_on: [SPEC-NNN]（如有）
---

# [SPEC-NNN]: [技术规格标题]

## 概述

[技术方案一句话概述]

## 接口定义

### [接口名称]

```
METHOD /api/path
Request: { ... }
Response: { ... }
```

## 数据模型

```
EntityName {
  field: Type  // 说明
}
```

## 技术约束

| 约束 | 说明 |
|------|------|
| [约束 1] | [详情] |

## 依赖关系

| 依赖 | 版本 | 用途 |
|------|------|------|
| [依赖名] | [版本] | [用途] |
```

---

## changelog — 版本变更记录

```markdown
# Changelog

## [版本号] - [YYYY-MM-DD]

### Added
- [新增功能 1]
- [新增功能 2]

### Changed
- [变更 1]

### Fixed
- [修复 1]

### Removed
- [移除 1]
```

---

## 使用说明

doc-writer Agent 根据 `doc_type` 字段选择对应模板，从 `sources` 中提取数据填充。模板中 `[占位符]` 标记的位置由数据源内容替换，无法填充的标记为 `[待补充]`。

**内联文档模板**（context、output、verification）由各 Agent 直接写入阶段子目录（`.planning/{version}/workflows/{slug}/P##-{phase-slug}/`），不走 doc-writer 管道。doc-writer 管道用于事后文档整理（summary、adr、prd、spec、changelog）。

`phase_dir` 参数格式：`.planning/{version}/workflows/{slug}/P##-{phase-slug}/`，由编排器根据 slug 和版本号构建。
