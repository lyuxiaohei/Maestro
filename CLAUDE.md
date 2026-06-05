# 产研AI工作流插件 — Claude Code 项目指引

## 项目概况

Claude Code 插件，将完整产研工作流（需求调研 → 部署上线，18 阶段、55 子步骤）自动化。纯 Markdown Skills + Agents，零运行时依赖。

## 核心架构

- **中央编排器**: workflow skill 管理 18 阶段生命周期，支持多工作流并行
- **状态即 Markdown**: `.planning/{version}/workflows/{slug}/workflow.md` 跟踪当前阶段，`{phase_dir}/STATE.md` 持久化（version 为 YYYYMM.PATCH 格式）
- **版本归档**: 每个版本独立目录，发布后归档只读，完整可追溯
- **多工作流架构**: 同一版本内多条独立工作流，domain 信息存储在 STATE.md 元数据中
- **铁律内嵌 Skill**: 门禁规则在编排器内强制执行（GATE-03 支持用户确认后跳过阶段）
- **Agent-as-Validator**: 独立上下文 agent 验证阶段输出
- **Agent 执行体系**: phase-executor 独立执行 + 完成信号协议 + 模型分级（opus/sonnet/haiku）+ 失败升级机制

## 技术约束

- 纯 Markdown Skills + Agent 定义文件 + Hook 脚本，零外部依赖（Node.js 内置模块）
- SKILL.md 控制在 150 行内，细节放参考文件
- 上下文预算：编排器不同时加载超过 2-3 个 Skill
- 用目录名做 Skill 标识（规避 Bug #22063 frontmatter name 冲突）

## Skills（37 个）

### 18 阶段领域 Skill（21 个）

| Skill | 阶段 | 功能 |
|-------|------|------|
| meeting-minutes | P01/P03 | 会议纪要 |
| diagram-design | P02 | 流程图/架构图（14 种图表） |
| competitive-analysis | P04 | 竞品分析 |
| feature-list | P05 | 功能清单 |
| prototype-design | P06 | 原型 HTML（口述/草案双模式） |
| logic-list-spec | P06/P09 | 业务逻辑清单（Draft/Extract 双模式） |
| prototype-review | P07 | 原型复核 |
| ui-design | P08 | UI 设计 |
| architecture-design | P10 | 架构设计 |
| architecture-review | P11 | 架构评审 |
| architecture-refinement | P12 | 架构细化 |
| detailed-design | P13 | 详细设计 |
| dev-task-planner | P14 | 开发任务规划 |
| frontend-dev | P15 | 前端开发 |
| backend-dev | P15 | 后端开发 |
| code-review | P15 | 代码审核 |
| test-engineering | P16 | 系统测试 |
| training-materials | P16 | 培训材料 |
| acceptance-testing | P17 | 验收测试 |
| deployment | P18 | 部署上线 |
| prd-auto-generator | — | PRD 自动生成 |

### 编排器 Skill（2 个）

| Skill | 功能 |
|-------|------|
| workflow | 18 阶段中央编排器 |
| workflow-lite | 轻量工作流引擎（discuss → plan → execute → verify） |

### 轻量步骤 Skill（4 个）

| Skill | 功能 |
|-------|------|
| discuss | 讨论技能（灰色区域识别 + 交互决策） |
| plan | 轻量规划（任务分解和计划制定） |
| execute | 轻量执行（按计划逐项实施） |
| verify | 轻量验证（对照计划检查结果） |

### DevKit 集成 Skill（10 个）

| Skill | 融入阶段 | 功能 |
|-------|---------|------|
| tdd-discipline | P15（可跳过） | TDD 纪律（RED-GREEN-REFACTOR 铁律） |
| lang-pack | P15（前置） | 语言包框架（自动检测技术栈并激活） |
| lang-react | P15（前端） | React/TypeScript 语言包 |
| lang-java | P15（后端） | Java/Spring 语言包 |
| gen-test-cases | P16 | 测试用例 AI 生成（5 步 Pipeline） |
| gen-test-run | P16 | 测试自愈（AST 填实 + 失败自愈） |
| ci-template | P18 | CI/CD 模板生成（GitLab CI / GitHub Actions） |
| gen-mr | P15 | 自动 MR/PR 生成 |
| qa-contract | P16（可选） | 契约测试（Spring Cloud Contract） |
| qa-mutation | P16（可选） | 变异测试（PIT / Stryker） |

## Agents（24 个）

### 调度域 Agent（编排器直接调用）

| Agent | 职责 | 域 | 模型 |
|-------|------|----|------|
| phase-executor | 独立上下文执行阶段任务 | 工作流调度 | sonnet |
| phase-validator | 独立验证阶段输出质量 | 工作流调度 | sonnet |
| phase-planner | 规划阶段任务，分解目标和依赖 | 工作流调度 | sonnet |
| plan-checker | 校验计划质量（只读） | 工作流调度 | sonnet |
| research-synthesizer | 合并多个 researcher 输出 | 工作流调度 | sonnet |
| doc-classifier | 文档自动分类（ADR/PRD/SPEC/DOC） | 工作流调度 | sonnet |
| doc-synthesizer | 多文档合并、冲突检测 | 工作流调度 | sonnet |
| doc-writer | 按模板生成/更新项目文档 | 工作流调度 | sonnet |
| doc-verifier | 校验文档与代码库一致性 | 工作流调度 | sonnet |
| lite-planner | 轻量工作流规划 | 轻量工作流 | sonnet |
| lite-executor | 轻量工作流执行 | 轻量工作流 | sonnet |
| lite-verifier | 轻量工作流验证 | 轻量工作流 | sonnet |

### 项目域 Agent（按需 spawn）

| Agent | 职责 | 域 | 模型 |
|-------|------|----|------|
| domain-researcher | 调研项目领域背景 | 产品域 | sonnet |
| competitive-researcher | Web 搜索竞品信息 | 产品域 | sonnet |
| requirement-analyst | 结构化需求分析 | 产品域 | sonnet |
| product-manager | 产品域+设计域规划审阅和验证（P01-P08） | 产品/设计域 | opus |
| architect | 架构域规划审阅和验证（P09-P13） | 架构域 | opus |
| frontend-developer | 前端开发规划审阅和代码验证（P14-P15） | 开发域 | opus |
| backend-developer | 后端开发规划审阅和代码验证（P14-P15） | 开发域 | opus |
| test-engineer | 测试域规划审阅和验证（P16-P17） | 测试域 | opus |
| ops-engineer | 部署域规划审阅和验证（P18） | 部署域 | opus |
| security-reviewer | OWASP Top 10 安全审计 | 安全域 | sonnet |
| integration-reviewer | 跨模块集成验证 | 测试域 | sonnet |
| code-reviewer | 多角色代码审查（spec/quality/cross-task） | 测试域 | sonnet |

## Hook 架构

Maestro 内置 11 个 Claude Code Hook，由 install.js 以绝对路径注册到 `~/.claude/settings.json`，脚本位于 scripts/ 目录。所有 Hook 使用纯 Node.js 内置模块，零外部依赖。

| Hook | 事件 | 功能 | 配置键 |
|------|------|------|--------|
| prompt-guard | PreToolUse Write\|Edit | 注入防护 | injection_guard |
| workflow-guard | PreToolUse Write\|Edit | 工作流外编辑提醒 | workflow_guard |
| read-injection-scanner | PostToolUse Read | 读取扫描 | read_scanner |
| validate-commit | PreToolUse Bash | 提交校验 | commit_validation |
| phase-boundary | PostToolUse Write\|Edit | 阶段边界 | phase_boundary |
| context-monitor | PostToolUse Write\|Edit | 上下文监控（剩余百分比提醒 60%/75%/88%） | context_warnings |
| session-state | SessionStart | 会话状态 | (always on) |
| code-graph-update | PostToolUse Write\|Edit | 代码索引增量更新 | code_graph_index |
| stale-check | PreToolUse Bash | 远程新提交过期检查 | stale_check |
| tdd-guard | PreToolUse Write\|Edit | TDD 物理保险丝（默认 OFF） | tdd_guard |
| lang-guard | PreToolUse Write\|Edit | 语言包模板强制加载（默认 OFF） | lang_guard |

Hook 设计原则：advisory-only（exit 0），fail-open（错误时不拦截），独立配置开关（config.json hooks 节）。仅 validate-commit 和 tdd-guard/lang-guard（需显式启用）为阻断型（exit 2）。

## 全局安装

Maestro 支持全局安装，一条命令在所有项目中生效。

| 命令 | 功能 |
|------|------|
| `node scripts/install.js` | 全局安装（默认） |
| `node scripts/install.js --uninstall` | 卸载全局注册 |
| `node scripts/install.js --local` | 仅注册当前项目 |
| `node scripts/install.js --from-github` | 从 GitHub 一键安装 |

安装采用直接写入策略：
1. 从 `.claude-plugin/plugin.json` 读取版本号
2. 复制运行时文件到 `~/.claude/plugins/cache/maestro-private/maestro/<version>/`
3. **Skills** → 直接复制到 `~/.claude/skills/maestro-<name>/`
4. **Agents** → 直接复制到 `~/.claude/agents/maestro-<name>.md`
5. **Hooks** → 绝对路径写入 `~/.claude/settings.json` 的 hooks 字段
6. **StatusLine** → 写入 `~/.claude/settings.json` 的 statusLine 字段
7. 注册到 `~/.claude/plugins/installed_plugins.json`（scope: "user"）
8. 重启 Claude Code 后生效

## 语言规范

- 用户输出：中文
- 内部规则标识：英文
- Skill 指令：中文
