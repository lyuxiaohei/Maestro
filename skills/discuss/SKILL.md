---
name: discuss
description: "讨论技能。在规划前识别灰色区域，与用户交互讨论，产出锁定决策的 CONTEXT.md。当用户提到讨论、discuss、确认范围时触发。"
risk: low
source: project
version: "1.0"
---

# 阶段讨论（discuss-phase）

## 触发条件

- `/discuss-phase {slug} P{N}` — 对指定工作流的某个阶段启动讨论
- 编排器在 GATE-03 通过后、规划流水线前自动调用（`discuss_required: true` 的阶段）
- 用户要求确认范围、讨论方案、对齐目标

## 执行流程

### 步骤 1：加载上下文

- 读取 `{workflow_base}/workflow.md` 获取工作流状态
- 读取 `references/phase-definitions.md`（workflow 的）获取目标阶段定义
- 读取上游 STATE.md 的输出部分（作为当前阶段输入上下文）
- 检查 `{phase_dir}/P##-CONTEXT.md` 是否已存在（存在则恢复中断讨论）
- 输出：上下文摘要（阶段目标、上游产出、已有决策）

### 步骤 2：识别灰色区域

- 根据 `references/gray-area-patterns.md` 按阶段域识别灰色区域
- 通用检查：范围确认、上游输入质量、与已有决策的冲突
- 域检查：按 domain 字段匹配域特定灰色区域列表
- 过滤：排除上游 STATE.md 已明确回答的区域
- 输出：灰色区域列表（编号 + 名称 + 为什么需要决策）

### 步骤 3：交互讨论

- 用 AskUserQuestion 逐区域提问（每轮最多 3 个问题）
- 每个问题提供 2-4 个选项，附带简短说明
- 用户可自由输入替代方案
- 记录每个决策为 D-01、D-02... 格式
- 用户说"跳过"时记录为延决议，进入下一区域
- 输出：决策列表（编号 + 决策内容 + 原因）

### 步骤 4：写入 CONTEXT.md

- 使用 workflow `references/doc-templates.md` 的 context 模板
- 填入：阶段边界（包含/不包含）、上下文决策（D-01...）、规范参考、代码上下文、延迟项
- 写入 `{phase_dir}/P##-CONTEXT.md`
- 更新 STATE.md 阶段文档节 CONTEXT 状态为 WRITTEN
- 输出：P##-CONTEXT.md 文件路径

### 步骤 5：确认

- 向用户展示决策摘要（表格形式：决策编号 + 内容）
- 等待用户确认或要求修改
- 确认后返回，编排器继续进入规划流水线

## 输入规范

| 参数 | 来源 | 说明 |
|------|------|------|
| phase_index | 编排器传入 | 目标阶段编号 |
| workflow_slug | 编排器传入 | 当前工作流标识 |
| upstream_outputs | 编排器传入 | 上游 STATE.md 输出部分 |

## 输出规范

| 产物 | 路径 | 说明 |
|------|------|------|
| CONTEXT.md | `{phase_dir}/P##-CONTEXT.md` | 锁定决策的阶段上下文 |
| 决策列表 | STATE.md CONTEXT 状态更新 | D-01/D-02... 格式决策 |

## 引用文件

| 文件 | 用途 |
|------|------|
| `references/gray-area-patterns.md` | 按域分类的灰色区域识别规则 |
| `references/question-templates.md` | 讨论提问格式和选项构建模板 |
