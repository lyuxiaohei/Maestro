---
name: workflow-engine
description: 产研工作流编排引擎，管理18阶段工作流的状态推进、门禁检查和技能调度。当用户提到工作流、阶段推进、开始某个阶段、继续工作流、查看工作流状态时触发。
---

# 产研工作流编排引擎

## 触发条件

- 开始或继续产研工作流
- 推进到某个特定阶段（如 "开始阶段 06"）
- 跳过某个阶段（如 "跳过阶段 04"、"skip P04"）
- 查看工作流当前状态
- 执行产研阶段相关任务

## 阶段启动检查序列

1. 读取 `.planning/workflow.md` 获取当前 `phase_index` 和 `workflow_status`
2. 读取目标阶段 `.planning/phases/P##-STATE.md` 的状态字段（不读完整输出体）
3. 读取 `references/phase-definitions.md` 获取阶段定义和对应 Skill
4. **GATE-03 防跳步检查**（优先执行）— 遍历 P01 到 P{target-1} 所有 STATE.md，确认 status 为 COMPLETE 或 SKIPPED
5. GATE-03 发现未完成阶段时，询问用户是否跳过（详见 `references/gate-rules.md` 跳过处理流程）
6. 加载目标领域 Skill（单个 turn 内不超过 2-3 个，超出则分多 turn 执行）
7. 读取上游 STATE.md 的输出部分，作为当前阶段输入传递给 Skill（SKIPPED 阶段读取 alternative_inputs）
8. 将阶段状态设为 IN_PROGRESS，写入 started_at

## 阶段规划流水线

GATE-03 通过后，按以下三步流水线执行：

1. **spawn phase-planner**（见 `agents/orchestrator/phase-planner.md`）— 传入 phase_index、skill_name、upstream_outputs
2. planner 返回 `## PLANNING COMPLETE` 后，**spawn plan-checker**（见 `agents/orchestrator/plan-checker.md`）— 传入 phase_index、plan_path
3. checker 返回 `## ISSUES FOUND` 时，将问题清单反馈给 planner 重新规划（最多 2 轮修订）
4. checker 返回 `## VERIFICATION PASSED` 后，进入"阶段完成提交序列"中的 executor 执行流程

## 阶段完成提交序列

1. 收集 Skill 输出，写入当前阶段 STATE.md 的输出部分和版本链
2. **GATE-02 自检** — 对照 phase-definitions.md outputs 检查完整性、版本号、STATE.md 非空
3. 自检 PASS 后调用 **phase-validator Agent**（见 `agents/orchestrator/phase-validator.md`）进行独立验证（GATE-05），传入 phase_index 和 upstream_outputs
4. Agent 返回完成信号（见 `references/agent-contracts.md`），失败时按模型升级协议重试（见 `references/model-profiles.md`）
4. **GATE-01 人工确认** — 向用户展示输出摘要，等待用户明确回复"确认"或"修改"
5. 用户确认后更新 workflow.md 的 `phase_index`，推进到下一阶段

## 阶段跳过序列

当用户请求跳过阶段 N（"跳过阶段 04"、"skip P04"）时：

1. 读取 `references/phase-definitions.md` 获取阶段 N 的名称和 outputs 列表
2. 向用户展示跳过影响：该阶段的 outputs 将不可用于下游阶段
3. 询问用户是否有替代输入文档路径（可选）
4. 询问跳过原因（必填）
5. 用户确认后写入 STATE.md：
   - `status`: SKIPPED
   - `skip_reason`: 用户提供的跳过原因
   - `alternative_inputs`: 替代输入文档路径列表（可为空）
   - `human_confirmed`: true
   - `completed_at`: 当前时间
6. 更新 `workflow.md` 阶段总览中阶段 N 的状态为 SKIPPED
7. 跳过 GATE-02（自检）和 GATE-05（Agent 验证）

## Checkpoint 续接流程

当 phase-executor 输出 `## CHECKPOINT REACHED` 时：

1. **解析 checkpoint** — 提取已完成步骤、剩余步骤、中间产物路径
2. **记录 checkpoint** — 将 checkpoint 状态写入 STATE.md 的 checkpoint 部分
3. **续接执行** — spawn 新 phase-executor，传入 checkpoint 上下文：
   - `phase_index`: 阶段编号
   - `skill_name`: 目标 Skill
   - `upstream_outputs`: 上游产出物路径
   - `checkpoint_context`: 已完成步骤 + 剩余步骤 + 中间产物路径
4. 新 executor 从剩余步骤的第一个开始执行，跳过已完成的步骤

## 并行调研调度

当阶段需要多维度调研时：

1. **并行 spawn** — 同时 spawn 3 个 researcher Agent：
   - `domain-researcher`（领域知识）
   - `competitive-researcher`（竞品信息）
   - `requirement-analyst`（需求分析）
2. **等待全部完成** — 收集所有 researcher 的输出
3. **spawn research-synthesizer**（见 `agents/orchestrator/research-synthesizer.md`）— 传入所有 researcher 输出路径
4. synthesizer 返回 `## SYNTHESIS COMPLETE` 后，将合并摘要传递给后续阶段

## 专项验证调度

在特定阶段自动 spawn 专项验证 Agent（与 phase-validator 并行运行）：

- **P13（详细设计）**: spawn `security-reviewer`（见 `agents/domain/security-reviewer.md`），传入代码设计产物路径
- **P15-P16（开发/测试）**: spawn `integration-reviewer`（见 `agents/domain/integration-reviewer.md`），传入模块路径和设计文档
- 专项验证结果与 phase-validator 结果合并，统一进入 GATE-01 人工确认

## 文档管道

GATE-05（phase-validator）通过后，GATE-01 人工确认前，运行四步文档管道：

1. **spawn doc-classifier**（见 `agents/orchestrator/doc-classifier.md`）— 对本阶段产出的规划文档逐一分类，输出 ADR/PRD/SPEC/DOC/UNKNOWN
2. **spawn doc-synthesizer**（见 `agents/orchestrator/doc-synthesizer.md`）— 合并已分类文档，消重、标注冲突、生成 INGEST-CONFLICTS.md
3. **spawn doc-writer**（见 `agents/orchestrator/doc-writer.md`）— 按模板生成阶段摘要文档，传入 doc_assignment（doc_type=summary, sources=STATE.md+PLAN.md）
4. **spawn doc-verifier**（见 `agents/orchestrator/doc-verifier.md`）— 校验生成文档中的事实性声明是否与代码库一致

doc-verifier 发现不一致时反馈给 doc-writer 修正（最多 1 轮）。

## 执行中中断处理（GATE-04）

- Skill 执行中检测到"假设"、"可能"、"推测"等不确定表述时暂停
- 必需输入文档缺失或关键字段为空时暂停并提问用户
- 编排器严禁自行编造或推断缺失信息
- 中断时将阶段状态标记为 BLOCKED，记录阻塞原因

## 跨会话续接

- 首次激活时读取 workflow.md，如 workflow_status 为 IN_PROGRESS 或 BLOCKED，从中断点恢复
- 向用户报告中断位置和待续接步骤，等待确认后继续

## 独立阶段启动

- 用户指定阶段编号时，先执行 GATE-03 检查所有前序阶段
- 前序阶段全部为 COMPLETE 或 SKIPPED 时，按"阶段启动检查序列"正常启动
- 前序阶段存在未完成时，询问用户是否跳过未完成阶段，确认后按"阶段跳过序列"处理
- 用户也可直接请求跳过特定阶段，按"阶段跳过序列"处理

## 引用文件

| 文件 | 用途 |
|------|------|
| `references/phase-definitions.md` | 18 阶段定义（名称、输入输出、子步骤、对应 Skill） |
| `references/gate-rules.md` | 铁律门禁详细规则（GATE-01~05 检查步骤和失败处理） |
| `references/state-schema.md` | STATE.md 模板、字段规范和编排器交互规则 |
| `references/agent-contracts.md` | Agent 调用协议（传参、返回格式、完成信号） |
| `references/model-profiles.md` | Agent 模型分级策略和失败升级机制 |
| `references/doc-templates.md` | doc-writer 使用的标准化文档模板（summary/adr/prd/spec/changelog） |
