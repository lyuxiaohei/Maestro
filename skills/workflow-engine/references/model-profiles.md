# Model Profiles: Agent 模型分级策略

本文档定义产研工作流 Agent 的模型分配策略和失败升级机制，参考 GSD 的多档模型体系。

---

## 模型分级

| 级别 | 模型 | 适用场景 | 特点 |
|------|------|----------|------|
| **heavy** | opus | 复杂推理、架构评审、调试分析 | 最强推理能力，成本最高 |
| **standard** | sonnet | 阶段执行、验证、调研 | 平衡性能与成本，默认级别 |
| **light** | haiku | 快速扫描、格式检查、简单映射 | 最快响应，成本最低 |

---

## Agent 默认模型分配

| Agent | 目录 | 默认模型 | 级别 | 说明 |
|-------|------|----------|------|------|
| phase-executor | `orchestrator/` | sonnet | standard | 阶段执行是常规任务，sonnet 足够 |
| phase-validator | `orchestrator/` | sonnet | standard | 验证需要一定推理能力 |
| phase-planner | `orchestrator/` | sonnet | standard | 规划阶段任务，分解目标和依赖 |
| plan-checker | `orchestrator/` | sonnet | standard | 校验计划质量，只读分析 |
| domain-researcher | `domain/` | sonnet | standard | 调研需要综合能力 |
| competitive-researcher | `domain/` | sonnet | standard | Web 搜索和整理 |
| requirement-analyst | `domain/` | sonnet | standard | 需求分析 |
| prototype-reviewer | `domain/` | sonnet | standard | 原型复核 |
| architecture-reviewer | `domain/` | opus | heavy | 架构评审需要深度推理 |
| frontend-engineer | `domain/` | sonnet | standard | 前端开发任务执行 |
| backend-engineer | `domain/` | sonnet | standard | 后端接口/服务层实现 |
| test-engineer | `domain/` | sonnet | standard | 测试用例编写与执行 |
| ops | `domain/` | sonnet | standard | 部署与环境配置 |
| research-synthesizer | `orchestrator/` | sonnet | standard | 合并多 researcher 输出，消重和标注矛盾 |
| security-reviewer | `domain/` | sonnet | standard | OWASP Top 10 安全审计 |
| integration-reviewer | `domain/` | sonnet | standard | 跨模块集成验证 |
| doc-classifier | `orchestrator/` | sonnet | standard | 文档自动分类（ADR/PRD/SPEC/DOC） |
| doc-synthesizer | `orchestrator/` | sonnet | standard | 多文档合并、冲突检测 |
| doc-writer | `orchestrator/` | sonnet | standard | 按模板生成/更新项目文档 |
| doc-verifier | `orchestrator/` | sonnet | standard | 校验文档与代码库一致性 |

---

## 按阶段复杂度的动态升级

编排器可根据阶段复杂度动态调整 phase-executor 的模型：

| 阶段范围 | 默认模型 | 升级条件 |
|----------|----------|----------|
| P01-P08（产品领域） | sonnet | 需求矛盾或逻辑复杂时升级 opus |
| P09-P13（技术领域） | opus | 简单模块可降级 sonnet |
| P14-P15（开发领域） | sonnet | 代码复杂时升级 opus |
| P16-P18（交付领域） | sonnet | 默认不升级 |

---

## 失败升级机制

当 Agent 执行失败时，编排器按以下协议升级：

```
重试 1: 使用默认模型重试
  ↓ 仍然失败
重试 2: 升级到上一级模型（sonnet → opus, haiku → sonnet）
  ↓ 仍然失败
重试 3: 暂停执行，向用户报告失败原因和已尝试的策略，请求人工介入
```

### 升级触发条件

| 条件 | 动作 |
|------|------|
| Agent 输出 `## PHASE BLOCKED` | 使用同模型重试，补充缺失信息后重新执行 |
| Agent 输出 `## VERIFICATION FAILED` | 将问题反馈给 phase-executor，使用同模型修正后重试 |
| 连续 2 次同模型失败 | 自动升级到上一级模型 |
| 连续 3 次失败（含升级） | 暂停，请求人工介入 |
| Agent 超时（maxTurns 耗尽） | 标记为失败，按升级协议处理 |

### 升级日志

每次模型升级记录在 STATE.md 的版本链中：

```markdown
| 版本 | 日期 | 变更说明 | 上游版本 |
|------|------|----------|----------|
| V1.0 | 2026-05-22 | 初始执行（sonnet）— PARTIAL | P05@V1.0 |
| V1.1 | 2026-05-22 | 模型升级重试（opus）— COMPLETE | P05@V1.0 |
```

---

## 成本控制

| 规则 | 说明 |
|------|------|
| 默认 sonnet | 80% 的任务使用 sonnet 完成 |
| 仅架构类用 opus | P10-P13 技术领域默认 opus |
| haiku 预留 | 未来用于格式检查等轻量任务 |
| 人工介入优先 | 3 次失败后不继续烧 token，请求人工 |
