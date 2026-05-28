# Gate Rules: 铁律门禁规则

本文档定义产研工作流的 5 条铁律门禁规则。这些规则由 workflow-engine 编排器在阶段推进过程中强制执行，不可绕过。

**编排器调用 Agent-as-Validator 的触发条件:** 编排在 GATE-02 自检通过后自动调用 phase-validator Agent。无需用户手动触发。

---

## GATE-01: 人工确认门禁

- **rule_id**: GATE-01
- **rule_name**: 人工确认门禁
- **gate_type**: Pre-flight
- **enforcement_point**: 阶段输出写入 STATE.md 后、workflow.md phase_index 推进前
- **bypass_allowed**: false

### check_procedure

1. 阶段 Skill 执行完成，编排器将输出写入当前阶段 STATE.md
2. 编排器暂停执行，向用户展示阶段输出摘要（输出文档列表、版本号、关键产出）
3. 编排器明确询问："阶段 [##]「[阶段名]」输出已完成，请确认是否通过。回复'确认'通过，回复'修改'提出修改意见。"
4. 等待用户明确回复"确认"、"通过"或"同意"
5. 用户确认后：将 STATE.md `human_confirmed` 标记为 `true`，更新当前工作流 workflow.md `phase_index` 推进到下一阶段
6. 用户拒绝或要求修改：保持当前阶段，根据修改意见调整输出，重新执行 GATE-01

### 失败处理

- 用户拒绝确认：将阶段状态设为 `BLOCKED`，记录拒绝原因，等待修改后重新检查
- 用户未回复（超时）：保持当前状态，不推进到下一阶段
- 用户要求修改：根据修改意见调整阶段输出，重新执行 GATE-01 检查

---

## GATE-02: 自检强制

- **rule_id**: GATE-02
- **rule_name**: 自检强制
- **gate_type**: Revision
- **enforcement_point**: 调用 Agent-as-Validator 之前
- **bypass_allowed**: false

### check_procedure

1. 阶段 Skill 执行完成后，编排器启动自检流程
2. 读取 `phase-definitions.md` 中该阶段的 `outputs` 列表，逐一检查：
   - 输出文档是否存在且内容非空
   - 输出格式是否符合预期（文档、图表、代码等）
3. 检查 STATE.md 输出部分：
   - `输出文档` 字段是否已填写（非占位符 "待填充"）
   - `输出版本` 字段是否已填写版本号（如 V1.0）
4. 检查版本链表格首行是否包含有效数据
5. 编排器在 STATE.md 验证记录中写入自检结果（`PASS` 或 `FAIL`）
6. 检查阶段文档完整性：确认 P##-CONTEXT.md、P##-PLAN.md、P##-OUTPUT.md、P##-SUMMARY.md 存在于 `{phase_dir}/` 且内容非空
7. 自检 `PASS` 后，编排器才可触发 Agent-as-Validator（GATE-05）

### 失败处理

- 自检 `FAIL`：将失败原因写入 STATE.md 验证记录，将阶段状态设为 `BLOCKED`
- 编排器根据失败原因指导 Skill 修正输出
- 阶段文档缺失：检查 Agent 是否正确接收 phase_dir 参数，确认文档写入流程执行
- 修正后重新执行 GATE-02 自检，直到 `PASS`
- 连续 3 次自检 `FAIL`：暂停阶段，向用户报告问题并请求人工介入

---

## GATE-03: 防跳步规则

- **rule_id**: GATE-03
- **bypass_allowed**: conditional

### check_procedure

0. 确定当前工作流的活跃阶段列表（来自模板定义或自定义工作流）。如果使用模板，仅检查模板包含的阶段。不在活跃阶段列表中的阶段不检查 — 跳过的阶段不视为未完成。示例：热修复模板包含 P14-P18。当启动 P16 时，仅检查 P14 和 P15 的完成状态，P01-P13 不在模板范围内故不检查。
1. 用户请求执行阶段 N 时，编排器获取目标阶段索引 N
2. 编排器遍历活跃阶段列表中 phase_index 小于 N 的所有阶段，读取对应 `{workflow_base}/phases/{domain}/P##-{phase-slug}/P##-STATE.md`（仅检查活跃阶段列表内的前序阶段，不检查列表外的阶段）
3. 读取每个前序 STATE.md 的 `status` 字段（仅读取状态部分，不读完整输出体）
4. 检查条件：每个前序阶段的 `status` 必须为 `COMPLETE` 或 `SKIPPED`，且 `human_confirmed` 必须为 `true`
5. 如所有前序阶段均满足条件，允许执行阶段 N
6. 如发现未完成的前序阶段（status 非 COMPLETE/SKIPPED），列出缺失阶段清单并询问用户是否跳过
7. 用户确认跳过：对每个未完成的前序阶段执行跳过流程（见下方"跳过处理"）
8. 用户不确认跳过：拒绝执行，建议按顺序完成缺失阶段

### 跳过处理

当用户确认跳过未完成的前序阶段时：

1. 向用户逐阶段展示待跳过阶段名称及其下游影响（该阶段的 outputs 将不可用）
2. 询问用户是否有替代输入文档（如有，记录文档路径；如无，标记为空）
3. 询问跳过原因（必填）
4. 对每个待跳过阶段：
   - 写入 `status=SKIPPED`
   - 写入 `skip_reason`（用户提供的跳过原因）
   - 写入 `alternative_inputs`（用户提供的替代输入路径列表，可为空）
   - 写入 `human_confirmed=true`
   - 写入 `completed_at`（跳过时间）
   - 跳过 GATE-02 自检和 GATE-05 Agent 验证
5. 更新当前工作流的 `workflow.md` 阶段总览中对应阶段的 phase_status 为 SKIPPED
6. 全部跳过完成后，按正常流程启动目标阶段 N

### 失败处理

- 存在未完成的前序阶段且用户未确认跳过：拒绝执行，建议按顺序完成缺失阶段
- 存在已完成但未确认的阶段（human_confirmed 为 false）：提示用户需要先确认相关阶段
- 跳过阶段缺少替代输入：提示用户下游阶段可能缺少必要输入，由用户决定是否继续

---

## GATE-04: 防脑补规则

- **rule_id**: GATE-04
- **rule_name**: 防脑补规则
- **gate_type**: Escalation
- **enforcement_point**: Skill 执行过程中检测到信息不完整时
- **bypass_allowed**: false

### check_procedure

1. Skill 执行过程中，编排器持续监控信息完整性
2. 当检测到以下情况时触发规则：
   - 必需输入文档缺失或内容为空
   - Skill 返回内容中包含不确定表述："假设"、"可能"、"推测"、"猜测"、"估计"、"大概"
   - 业务逻辑描述存在明显漏洞或矛盾
   - 关键配置信息（如技术选型、数据结构）未明确
   - 上游输出中的关键字段为空或占位符
   - Skill 返回内容中包含未解答的问题标记（如 "TODO"、"FIXME"、"待确认"）
3. 触发后，编排器立即暂停 Skill 执行
4. 编排器向用户列出缺失信息清单，明确说明哪些信息是必需的
5. 等待用户提供缺失信息后恢复执行

### 失败处理

- 信息缺失：暂停执行，向用户展示缺失信息清单，等待补充
- 用户无法提供：将阶段状态设为 `BLOCKED`，记录阻塞原因
- 编排器严禁自行编造或推断缺失信息 — 这是本规则的核心约束
- 已推断但未确认的信息：标记为"待确认"，不作为后续阶段的可靠输入

---

## GATE-05: Agent-as-Validator 独立验证

- **rule_id**: GATE-05
- **rule_name**: Agent-as-Validator 独立验证
- **gate_type**: Revision
- **enforcement_point**: 编排在自检（GATE-02）通过之后、人工确认（GATE-01）之前调用
- **bypass_allowed**: false

### check_procedure

1. 编排器将阶段编号（如 P06）传递给 phase-validator Agent
2. 编排器读取 phase-definitions.md 中该阶段的 `role` 字段，确定对应岗位 Agent
3. 编排器并行 spawn phase-validator（结构化检查）和岗位 Agent（域视角审核，verification_reviewer 模式）
4. phase-validator 在独立上下文窗口中读取该阶段 STATE.md，对照 phase-definitions.md 的 outputs 列表逐项验证
5. 岗位 Agent 在独立上下文窗口中从域专业角度审阅阶段产出物
6. 两者分别返回验证报告，phase-validator 写入 P##-VERIFICATION.md 到 `{phase_dir}/`
7. 确认 P##-VERIFICATION.md 已生成且验证结果与报告内容一致
8. 岗位 Agent 返回域评审报告（PASS/CONDITIONAL/FAIL + 域问题清单），结果与 phase-validator 结果合并
9. 编排器根据合并结果决定：
   - **两者均 PASS** → 进入人工确认环节（GATE-01）
   - **任一 FAIL 或 CONDITIONAL** → 合并问题清单展示给用户，标记阶段状态为 BLOCKED

### 失败处理

- 验证结果为 FAIL：编排器将 Agent 返回的问题清单展示给用户
- 岗位 Agent 返回 CONDITIONAL：列出域问题，允许用户决定是否继续
- 岗位 Agent 返回 FAIL：与 phase-validator FAIL 相同处理
- VERIFICATION.md 未生成：检查 phase-validator 是否正确接收 phase_dir 参数和 Write 工具权限
- 将阶段状态标记为 BLOCKED，在 STATE.md 中记录 blocked_reason（问题摘要）
- 要求修正输出后重新执行：自检（GATE-02）→ Agent 验证（GATE-05）→ 人工确认（GATE-01）
- 修正后 Agent 验证再次 FAIL：暂停阶段，建议用户人工审查
