# 产研AI工作流插件 — Claude Code 项目指引

## 项目概况

Claude Code 插件，将完整产研工作流（需求调研 → 部署上线，18 阶段、55 子步骤）自动化。纯 Markdown Skills + Agents，零运行时依赖。

## 核心架构

- **中央编排器**: workflow-engine skill 管理 18 阶段生命周期
- **状态即 Markdown**: `.planning/workflow.md` 跟踪当前阶段，`.planning/phases/P##-STATE.md` 持久化
- **铁律内嵌 Skill**: 门禁规则在编排器内强制执行（GATE-03 支持用户确认后跳过阶段）
- **Agent-as-Validator**: 独立上下文 agent 验证阶段输出
- **Agent 执行体系**: phase-executor 独立执行 + 完成信号协议 + 模型分级（opus/sonnet/haiku）+ 失败升级机制

## 技术约束

- 纯 Markdown Skills + Agent 定义文件 + Hook 脚本，零外部依赖（Node.js 内置模块）
- SKILL.md 控制在 100 行内，细节放参考文件
- 上下文预算：编排器不同时加载超过 2-3 个 Skill
- 已有 Skill 复制而非修改（原始文件不动，插件内副本）
- 用目录名做 Skill 标识（规避 Bug #22063 frontmatter name 冲突）

## 已有 Skill（Phase 2 集成）

| Skill | 版本 | 功能 |
|-------|------|------|
| logic-list-spec | v0.21 | 业务逻辑清单（Draft/Extract 双模式） |
| prototype-design | v0.50 | 原型 HTML（口述/草案双模式） |
| prd-auto-generator | v0.51 | PRD 自动生成 |
| diagram-design | - | 流程图/架构图生成 |

## 最小闭环链路

```
diagram-design → logic-list-spec(Draft) → prototype-design → logic-list-spec(Extract) → prd-auto-generator
```

## 规划文件

- `.planning/PROJECT.md` — 项目上下文
- `.planning/REQUIREMENTS.md` — 需求清单（37 项，全部映射到 8 阶段）
- `.planning/ROADMAP.md` — 8 阶段路线图
- `.planning/STATE.md` — 当前状态
- `.planning/config.json` — GSD 工作流配置

## 开发流程

使用 GSD 工作流管理开发进度：
- `/gsd:plan-phase <N>` — 规划阶段 N
- `/gsd:execute-phase <N>` — 执行阶段 N
- `/gsd:verify-phase <N>` — 验证阶段 N

当前状态：全部 8 阶段开发完成，21 个 Skill + 11 个 Agent 已交付。

## 语言规范

- 用户输出：中文
- 内部规则标识：英文
- Skill 指令：中文

## Agents

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

### 项目域 Agent（按需 spawn）

| Agent | 职责 | 域 | 模型 |
|-------|------|----|------|
| domain-researcher | 调研项目领域背景 | 产品域 | sonnet |
| competitive-researcher | Web 搜索竞品信息 | 产品域 | sonnet |
| requirement-analyst | 结构化需求分析 | 产品域 | sonnet |
| prototype-reviewer | 原型多维度复核 | 设计域 | sonnet |
| architecture-reviewer | 架构技术审查 | 架构域 | opus |
| frontend-engineer | 前端代码审核 | 前端域 | sonnet |
| backend-engineer | 后端代码审核 | 后端域 | sonnet |
| test-engineer | 测试覆盖度和质量审核 | 测试域 | sonnet |
| ops | 部署方案和环境审核 | 运维域 | sonnet |
| security-reviewer | OWASP Top 10 安全审计 | 安全域 | sonnet |
| integration-reviewer | 跨模块集成验证 | 测试域 | sonnet |

## 关键参考文件

| 文件 | 用途 |
|------|------|
| `references/agent-contracts.md` | Agent 调用协议（传参、返回格式、完成信号） |
| `references/model-profiles.md` | 模型分级策略和失败升级机制 |
| `references/phase-definitions.md` | 18 阶段定义 |
| `references/gate-rules.md` | 铁律门禁规则（GATE-01~05） |
| `references/state-schema.md` | STATE.md 模板和编排器交互规则 |

## Hook 架构

Maestro 内置 6 个 Claude Code Hook，注册在 hooks/hooks.json，脚本位于 scripts/ 目录。所有 Hook 使用纯 Node.js 内置模块，零外部依赖。

| Hook | 事件 | 功能 | 配置键 |
|------|------|------|--------|
| prompt-guard | PreToolUse Write\|Edit | 注入防护 | injection_guard |
| read-injection-scanner | PostToolUse Read | 读取扫描 | read_scanner |
| validate-commit | PreToolUse Bash | 提交校验 | commit_validation |
| phase-boundary | PostToolUse Write\|Edit | 阶段边界 | phase_boundary |
| context-monitor | PostToolUse Write\|Edit | 上下文监控 | context_warnings |
| session-state | SessionStart | 会话状态 | (always on) |

Hook 设计原则：advisory-only（exit 0），fail-open（错误时不拦截），独立配置开关（config.json hooks 节）。仅 validate-commit 为阻断型（exit 2），需显式启用。

## 全局安装

Maestro 支持全局安装，一条命令在所有项目中生效。

| 命令 | 功能 |
|------|------|
| `node scripts/install.js` | 全局安装（默认） |
| `node scripts/install.js --uninstall` | 卸载全局注册 |
| `node scripts/install.js --local` | 仅注册当前项目 |

安装流程：
1. 从 `.claude-plugin/plugin.json` 读取版本号
2. 复制运行时文件到 `~/.claude/plugins/cache/maestro-private/maestro/<version>/`
3. 注册到 `~/.claude/plugins/installed_plugins.json`（scope: "user"）
4. 重启 Claude Code 后生效

注意事项：
- 安装后源码目录可独立删除，插件不依赖源码路径
- 全局 + 项目级双重加载是安全的（hooks 全部 advisory exit 0）
- 更新时重新运行安装命令即可（覆盖安装）

## 双仓库分发

Maestro 使用双仓库架构管理开发与发布：

| 仓库 | 可见性 | 内容 |
|------|--------|------|
| Maestro-dev | 私有 | 全量项目文件（含 .planning/、docs/、分析文档等） |
| Maestro（public） | 公开 | 仅运行时文件（.claude-plugin/、hooks/、scripts/、skills/、agents/、CLAUDE.md、README.md） |

### 发布流程

```bash
# 同步运行时文件到公开仓库（自动 clone/pull + 复制 + commit + push）
node scripts/release.js

# 预览同步内容（不执行 git commit/push）
node scripts/release.js --dry-run
```

### GitHub 安装

```bash
# 从 GitHub 一键安装
node scripts/install.js --from-github
```

### 排除列表

release.js 不会同步以下文件到公开仓库：
- `.planning/`、`docs/`、`.claude/`（开发专用目录）
- `*.xlsx`、`*.test.js`（构建/测试产物）
- `CHANGELOG.md`、`.gitattributes`、`.gitignore`（开发配置）
- 含"分析"字样的文档（调研产物）
