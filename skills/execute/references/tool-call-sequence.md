# 工具调用顺序约束

编码类任务（涉及 Write/Edit 代码文件）的工具调用必须严格按以下顺序出现。违反顺序 = TDD 违规 = 必须删除代码重来。

## 9 步工具调用顺序

| 序号 | 工具 | 用途 | 跳过/错序的后果 |
|------|------|------|---------------|
| ⓪ | Read（语言包 modules + templates） | Briefing 加载上下文 | 未出现 = Briefing 假执行，违规 |
| ① | Bash（运行测试命令） | 基线确认（全绿） | 不知道基线 → 后续验证无效 |
| ② | Write/Edit（测试文件） | 创建失败测试 | 必须早于实现文件，否则违规 |
| ③ | Bash（运行测试命令） | RED 证据：必须 FAIL | 没运行 = 未过 RED GATE |
| ④ | Write/Edit（实现文件） | 写最小实现 | 必须在 ③ 之后，早于 ③ 即违规 |
| ⑤ | Bash（运行测试命令） | GREEN 证据：必须 PASS | 没运行 = 未过 GREEN GATE |
| ⑥ | Edit（重构，可选多次） | REFACTOR 阶段 | 每次改动后必须重跑 ⑤ |
| ⑦ | Bash（git commit 代码） | 提交 Task 代码 | — |
| ⑧ | Edit（PLAN.md 任务状态标记） | 更新进度 | 缺此步 = 进度不可追踪 |
| ⑨ | Bash（git commit 进度文件） | 提交进度 | — |

## 违规判定表

| 违规模式 | 实际序列 | 判定 |
|----------|---------|------|
| 实现先于测试 | Write(impl) → Write(test) | 违规 |
| 测试没跑就写实现 | Write(test) → Write(impl)，中间无 Bash(test) | 违规 |
| 测试覆盖已有行为 | Bash(test) 显示 PASS 但这是新测试 | 违规 |
| 根本没写测试 | Write(impl) → Bash(PASS)，无测试文件 | 违规 |
| 未做 Briefing | 无 Read(template) 但已 Write(impl) | 违规 |
| Briefing 漏覆盖 | Files 涉及类型 X，但无 templates/X.md 的 Read | 违规 |

发现违规 → 删除已写的实现代码 → 从 ② 重新开始。

## 各语言测试命令

| 语言 | 运行单个测试 | 运行全部 |
|------|------------|---------|
| Java | `mvn test -Dtest={ClassName}#{methodName}` | `mvn test` |
| React/TS | `npx vitest run {path/to/test}` | `npx vitest run` |
| Python | `pytest {path}::{test_func}` | `pytest` |

## Maestro 适配说明

| devkit 原始步骤 | Maestro 适配 |
|----------------|-------------|
| ⓪ Briefing: Read 语言包模板 | 读取匹配的语言包 modules/ + templates/（P2 Briefing Gate 实现） |
| ⑧ Progress: Edit tasks.md `## Progress` | Edit PLAN.md 的任务状态标记（Maestro 轻量工作流） |
| Subagent 调度 | 使用 Maestro Agent 调用协议（agent-contracts.md） |
| tdd-guard.sh 物理保险丝 | P3 阶段重写为 tdd-guard.js（默认 OFF） |

## 与 tdd-discipline Skill 的协同

- tdd-discipline 提供 TDD 原则、Iron Law、合理化借口表、红旗信号
- 本文档提供可机器检查的工具调用序列和违规判定
- 两者共同构成编码门的认知层防线
