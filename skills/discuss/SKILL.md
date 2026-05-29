---
name: discuss
description: "讨论技能。在规划前识别灰色区域，与用户交互讨论，产出三级分类决策的 CONTEXT.md。当用户提到讨论、discuss、确认范围时触发。"
risk: low
source: project
version: "1.1"
---

# 阶段讨论（discuss-phase）

## 触发条件

- `/discuss-phase {slug} P{N}` — 对指定工作流的某个阶段启动讨论
- 编排器在 GATE-03 通过后、规划流水线前自动调用（`discuss_required: true` 的阶段）
- 用户要求确认范围、讨论方案、对齐目标

## 执行流程

### 步骤 1：加载上下文

- 读取 `{workflow_base}/workflow.md` 获取工作流状态
- 检测工作流模式：有 `phase_index` 为全量，有 `mode` 为 lite
- 全量模式：读取 `references/phase-definitions.md` 获取目标阶段定义，读取上游 STATE.md 输出
- lite 模式：读取目标描述和已有迭代历史
- 检查 CONTEXT.md 是否已存在（存在则恢复中断讨论）

### 步骤 2：识别灰色区域

- 通用检查：范围确认、输入质量、与已有决策冲突
- 全量模式：根据 `references/gray-area-patterns.md` 按阶段域识别域特定灰色区域
- lite 模式：检查以下通用维度
  - **范围边界**：做什么、不做什么
  - **技术方案**：实现路径选择
  - **优先级**：多个功能点时的排序
  - **复杂度**：哪些部分需要简化或延后
- 过滤：排除已有决策已明确回答的区域

### 步骤 3：交互讨论

- 用 AskUserQuestion 逐区域提问（每轮最多 3 个问题）
- 每个问题提供 2-4 个选项，附带简短说明
- 用户可自由输入替代方案
- 用户说"跳过"时记录为延决议，进入下一区域

### 步骤 4：决策三级分类

对每个决策判定归属：

| 级别 | 含义 | planner 处理方式 |
|------|------|-----------------|
| **Locked** (D-01...) | 用户明确选择，不可更改 | 必须精确实现，任务中引用决策编号 |
| **Deferred** (DEF-01...) | 用户延议或"跳过" | 不得出现在本次计划中 |
| **Discretion** (CLD-01...) | 用户说"你决定"或未明确 | 使用判断力处理，在任务中说明选择理由 |

**分类规则**：
- 用户选择某个选项 → Locked
- 用户说"跳过"、"以后再说"、"延议" → Deferred
- 用户说"你决定"、"都行"、"看情况" → Discretion
- 用户直接给出具体要求 → Locked

### 步骤 5：写入 CONTEXT.md

写入 `{phase_dir}/P##-CONTEXT.md`（全量）或 `{workflow_base}/CONTEXT.md`（lite），包含三节：

```markdown
## Locked Decisions（必须实现）
- **D-01:** [决策内容]
  - 原因: [用户给出的原因]
  - 影响: [对下游的影响]

## Deferred Ideas（本次不实现）
- **DEF-01:** [延议内容] — 原因: [用户选择延议]

## Claude's Discretion（自主判断）
- **CLD-01:** [自主判断区域] — 选择: [你的建议方案]
```

全量模式同时更新 STATE.md 阶段文档节 CONTEXT 状态为 WRITTEN。

### 步骤 6：确认

- 向用户展示分类决策摘要（表格形式：编号 + 级别 + 内容）
- 等待用户确认或要求修改
- 确认后返回，编排器继续进入规划流水线

## 输出规范

| 产物 | 路径 | 说明 |
|------|------|------|
| CONTEXT.md | `{phase_dir}/P##-CONTEXT.md` 或 `{workflow_base}/CONTEXT.md` | 三级分类决策上下文 |

## 引用文件

| 文件 | 用途 |
|------|------|
| `references/gray-area-patterns.md` | 按域分类的灰色区域识别规则 |
| `references/question-templates.md` | 讨论提问格式和选项构建模板 |
