# Phase Definitions: 18阶段产研工作流定义

本文档定义产研工作流的 18 个阶段，每个阶段包含索引、名称、标识符、描述、输入输出、子步骤和对应 Skill。

---

## Phase 01: 需求调研

- **phase_index**: 01
- **phase_name**: 需求调研
- **phase_slug**: requirement-research
- **domain**: product-manager
- **role**: product-manager
- **description**: 通过用户访谈、文档分析等方式收集原始需求，整理访谈记录，分类需求条目，排列优先级。
- **inputs**: 用户口头/书面需求描述、业务背景资料
- **outputs**: 需求调研报告、访谈记录、需求分类表、优先级排序列表
- **sub_steps**:
  1. 访谈记录整理
  2. 需求分类
  3. 优先级排序
- **domain_skill**: maestro-meeting-minutes（Phase 3 集成 ✅）
- **discuss_required**: true

---

## Phase 02: 业务现状流程图

- **phase_index**: 02
- **phase_name**: 业务现状流程图
- **phase_slug**: business-flow-chart
- **domain**: product-manager
- **role**: product-manager
- **description**: 绘制当前业务流程的现状图，识别痛点、冗余环节和优化机会。
- **inputs**: 需求调研报告（Phase 01 输出）
- **outputs**: 业务现状流程图（HTML/SVG）、流程分析说明、优化建议
- **sub_steps**:
  1. 业务流程梳理
  2. 现状流程图绘制
  3. 痛点标注与优化建议
- **domain_skill**: maestro-diagram-design（Phase 2 集成 ✅）
- **discuss_required**: true

---

## Phase 03: 会议纪要

- **phase_index**: 03
- **phase_name**: 会议纪要
- **phase_slug**: meeting-minutes
- **domain**: product-manager
- **role**: product-manager
- **description**: 根据会议内容自动生成结构化会议纪要，包括议题、讨论要点、决议和行动项。
- **inputs**: 会议内容记录（音频转写文本/手动记录）
- **outputs**: 结构化会议纪要、行动项列表、议题跟踪表
- **sub_steps**:
  1. 会议信息提取
  2. 议题归纳整理
  3. 决议与行动项识别
  4. 会议纪要文档生成
  5. 行动项分派
  6. 待办事项汇总
  7. 纪要分发与确认
- **domain_skill**: maestro-meeting-minutes（Phase 3 集成 ✅，跨阶段复用）
- **discuss_required**: true

---

## Phase 04: 竞品分析

- **phase_index**: 04
- **phase_name**: 竞品分析
- **phase_slug**: competitive-analysis
- **domain**: product-manager
- **role**: product-manager
- **description**: 对竞品进行功能、体验、技术维度的系统分析，生成竞品对比报告和差异化策略建议。
- **inputs**: 竞品名单、需求调研报告（Phase 01 输出）
- **outputs**: 竞品分析报告、功能对比矩阵、差异化策略建议
- **sub_steps**:
  1. 竞品筛选与确定
  2. 功能维度对比分析
  3. 用户体验对比分析
  4. 技术方案对比分析
  5. 竞品报告生成
  6. 截图采集指引（人工执行）
- **domain_skill**: maestro-competitive-analysis（Phase 2 集成 ✅）
- **discuss_required**: true

---

## Phase 05: 功能清单

- **phase_index**: 05
- **phase_name**: 功能清单
- **phase_slug**: feature-list
- **domain**: product-manager
- **role**: product-manager
- **description**: 从需求文档和调研结果中提取功能清单，评估功能覆盖度，生成功能优先级矩阵。
- **inputs**: 需求调研报告（Phase 01）、会议纪要（Phase 03）、竞品分析报告（Phase 04）
- **outputs**: 功能清单、覆盖度报告、功能优先级矩阵
- **sub_steps**:
  1. 功能条目提取
  2. 功能分类与归组
  3. 覆盖度评估
  4. 优先级矩阵生成
- **domain_skill**: maestro-feature-list（Phase 4 集成 ✅）
- **discuss_required**: true

---

## Phase 06: 原型设计

- **phase_index**: 06
- **phase_name**: 原型设计
- **phase_slug**: prototype-design
- **domain**: product-manager
- **role**: product-manager
- **description**: 根据功能清单和业务逻辑清单设计交互原型，生成可预览的 HTML 原型页面。
- **inputs**: 功能清单（Phase 05）、业务逻辑清单（maestro-logic-list-spec Draft 输出）
- **outputs**: 原型 HTML 文件、交互说明文档
- **sub_steps**:
  1. 页面结构规划
  2. 交互流程设计
  3. 原型页面生成
  4. 交互说明编写
- **domain_skill**: maestro-prototype-design（Phase 2 集成 ✅）
- **discuss_required**: true

---

## Phase 07: 原型复核

- **phase_index**: 07
- **phase_name**: 原型复核
- **phase_slug**: prototype-review
- **domain**: product-manager
- **role**: product-manager
- **description**: 对原型进行多维度复核，包括功能覆盖度、交互合理性、视觉一致性，问题按严重程度分级输出。
- **inputs**: 原型 HTML（Phase 06）、功能清单（Phase 05）
- **outputs**: 复核报告、问题清单（按严重程度分级）、改进建议
- **sub_steps**:
  1. 功能覆盖度复核
  2. 交互合理性检查
  3. 视觉一致性检查
  4. 问题分级输出
  5. 改进建议生成
- **domain_skill**: maestro-prototype-review（Phase 4 集成 ✅）
- **discuss_required**: true

---

## Phase 08: UI 设计

- **phase_index**: 08
- **phase_name**: UI 设计
- **phase_slug**: ui-design
- **domain**: product-manager
- **role**: product-manager
- **description**: 根据原型和功能清单制定 UI 设计规范，生成颜色、字体、间距、组件库等设计要素。
- **inputs**: 原型 HTML（Phase 06）、复核报告（Phase 07）、功能清单（Phase 05）
- **outputs**: UI 设计规范文档、设计稿、组件库定义
- **sub_steps**:
  1. 设计规范制定
  2. 色彩与字体定义
  3. 组件库设计
  4. 页面设计稿生成
  5. 设计评审
- **domain_skill**: maestro-ui-design（Phase 5 集成 ✅）
- **discuss_required**: true

---

## Phase 09: 方案设计

- **phase_index**: 09
- **phase_name**: 方案设计
- **phase_slug**: solution-design
- **domain**: architect
- **role**: architect
- **description**: 综合需求和设计约束，产出技术方案概要，明确技术路线和关键决策点。
- **inputs**: 功能清单（Phase 05）、UI 设计规范（Phase 08）、竞品分析报告（Phase 04）
- **outputs**: 方案设计文档、技术路线图、关键决策记录
- **sub_steps**:
  1. 需求约束梳理
  2. 技术路线选型
  3. 方案概要设计
  4. 关键决策记录
- **domain_skill**: maestro-logic-list-spec Draft 模式（Phase 2 集成 ✅）
- **discuss_required**: true

---

## Phase 10: 架构设计

- **phase_index**: 10
- **phase_name**: 架构设计
- **phase_slug**: architecture-design
- **domain**: architect
- **role**: architect
- **description**: 完成系统架构设计，包括模块拆解、数据库设计、API 设计、流程设计，形成架构评审基线。
- **inputs**: 方案设计文档（Phase 09）
- **outputs**: 架构设计文档、模块拆解图、数据库 ER 图、API 设计文档、流程设计图
- **sub_steps**:
  1. 需求确认
  2. 架构设计
  3. 模块拆解
  4. 数据库设计
  5. API 设计
  6. 流程设计
  7. 评审基线整理
- **domain_skill**: maestro-architecture-design（Phase 6 集成 ✅）
- **discuss_required**: false

---

## Phase 11: 架构评审

- **phase_index**: 11
- **phase_name**: 架构评审
- **phase_slug**: architecture-review
- **domain**: architect
- **role**: architect
- **description**: 对架构设计进行结构化评审，检查技术可行性、扩展性和安全性，输出评审意见。
- **inputs**: 架构设计文档（Phase 10）
- **outputs**: 架构评审报告、问题清单、改进建议
- **sub_steps**:
  1. 评审材料准备
  2. 技术可行性评审
  3. 扩展性评审
  4. 安全性评审
  5. 评审报告生成
- **domain_skill**: maestro-architecture-review（Phase 6 集成 ✅）
- **discuss_required**: false

---

## Phase 12: 架构细化

- **phase_index**: 12
- **phase_name**: 架构细化
- **phase_slug**: architecture-refinement
- **domain**: architect
- **role**: architect
- **description**: 根据架构评审意见细化架构设计，修正问题，输出最终架构文档。
- **inputs**: 架构评审报告（Phase 11）、架构设计文档（Phase 10）
- **outputs**: 细化后的架构文档、架构变更记录
- **sub_steps**:
  1. 评审问题分析
  2. 架构修正设计
  3. 变更影响评估
  4. 最终架构文档输出
- **domain_skill**: maestro-architecture-refinement（Phase 6 集成 ✅）
- **discuss_required**: false

---

## Phase 13: 详细设计

- **phase_index**: 13
- **phase_name**: 详细设计
- **phase_slug**: detailed-design
- **domain**: architect
- **role**: architect
- **description**: 完成详细设计，包括需求拆解、技术选型、模块/接口/数据库/流程详细设计、测试策略制定。
- **inputs**: 最终架构文档（Phase 12）
- **outputs**: 详细设计文档、接口定义、数据库 DDL、流程详细设计、测试策略
- **sub_steps**:
  1. 需求拆解
  2. 技术选型
  3. 模块详细设计
  4. 接口详细设计
  5. 数据库详细设计
  6. 流程详细设计
  7. 测试策略制定
- **domain_skill**: maestro-detailed-design（Phase 6 集成 ✅）
- **discuss_required**: false

---

## Phase 14: 开发任务规划

- **phase_index**: 14
- **phase_name**: 开发任务规划
- **phase_slug**: dev-task-planner
- **domain**: development
- **role**: frontend-developer, backend-developer
- **description**: 将详细设计拆解为开发任务，分配资源和排期，明确依赖关系和交付里程碑。
- **inputs**: 详细设计文档（Phase 13）
- **outputs**: 开发任务列表、资源分配表、排期计划、依赖关系图
- **sub_steps**:
  1. 任务基础信息定义
  2. 数据建模任务拆解
  3. 后端逻辑/接口拆解
  4. 前端交互拆解
  5. 联调任务定义
  6. 依赖关系梳理
  7. 资源排期
  8. 汇总确认
  9. 里程碑定义
- **domain_skill**: maestro-dev-task-planner（Phase 7 集成 ✅）
- **discuss_required**: false

---

## Phase 15: 前后端开发

- **phase_index**: 15
- **phase_name**: 前后端开发
- **phase_slug**: development
- **domain**: development
- **role**: frontend-developer, backend-developer
- **description**: 按开发任务规划执行前后端开发，包含接口层、服务层、持久层、前端路由、状态管理等环节。
- **inputs**: 开发任务列表（Phase 14）、详细设计文档（Phase 13）
- **outputs**: 源代码、API 实现文档、前后端联调记录
- **sub_steps**:
  1. 接口层开发（后端）
  2. 服务层开发（后端）
  3. 持久层开发（后端）
  4. 中间件集成（后端）
  5. 异常处理（后端）
  6. 路由规划（前端）
  7. 类型定义（前端）
  8. 业务逻辑开发（前端）
  9. API 封装（前端）
  10. 状态管理（前端）
  11. 安全处理（前端）
  12. AI 审核（前后端）
  13. 联调自测
- **domain_skill**: maestro-frontend-dev + maestro-backend-dev + maestro-code-review（Phase 7 集成 ✅）
- **discuss_required**: true

> **注意**：P15 在 development 目录内使用 frontend/backend 子目录区分前端和后端工作。

---

## Phase 16: 系统测试

- **phase_index**: 16
- **phase_name**: 系统测试
- **phase_slug**: system-testing
- **domain**: test-engineer
- **role**: test-engineer
- **description**: 执行系统级测试，包括用例编写、冒烟测试、功能测试、回归测试和缺陷管理。
- **inputs**: 源代码（Phase 15）、详细设计文档（Phase 13）、测试策略（Phase 13）
- **outputs**: 测试用例、测试报告、缺陷列表、回归测试记录
- **sub_steps**:
  1. 需求评审（测试视角）
  2. 测试用例编写
  3. 用例评审
  4. 冒烟测试
  5. 功能测试执行
  6. 缺陷管理
  7. 回归测试
  8. 测试报告生成
  9. 测试归档
- **domain_skill**: maestro-test-engineering（Phase 8 集成 ✅）
- **discuss_required**: false

---

## Phase 17: 验收测试

- **phase_index**: 17
- **phase_name**: 验收测试
- **phase_slug**: acceptance-testing
- **domain**: test-engineer
- **role**: test-engineer
- **description**: 组织验收测试，按模块逐项验收，修复验收问题，最终完成集成验收。
- **inputs**: 测试报告（Phase 16）、功能清单（Phase 05）
- **outputs**: 验收报告、验收问题清单、验收签核记录
- **sub_steps**:
  1. 验收排期
  2. 模块验收
  3. 问题修复
  4. 复核验证
  5. 集成验收
  6. 验收报告生成
  7. 验收签核
- **domain_skill**: maestro-acceptance-testing（Phase 8 集成 ✅）
- **discuss_required**: false

---

## Phase 18: 部署上线

- **phase_index**: 18
- **phase_name**: 部署上线
- **phase_slug**: deployment
- **domain**: ops-engineer
- **role**: ops-engineer
- **description**: 完成上线准备、生产环境配置、灰度发布和全量发布，确保系统稳定运行。
- **inputs**: 验收报告（Phase 17）、架构文档（Phase 12）
- **outputs**: 部署方案、上线检查清单、灰度发布记录、全量发布记录
- **sub_steps**:
  1. 上线准备
  2. 生产环境配置
  3. 灰度发布
  4. 全量发布
- **domain_skill**: maestro-deployment（Phase 8 集成 ✅）
- **discuss_required**: false

---

## 域映射总览

| 域 | 阶段范围 | 说明 |
|----|----------|------|
| product-manager | P01-P08 | 需求调研、业务流程图、会议纪要、竞品分析、功能清单、原型设计、原型复核、UI设计 |
| architect | P09-P13 | 方案设计、架构设计、架构评审、架构细化、详细设计 |
| development | P14-P15 | 开发任务规划、前后端开发 |
| test-engineer | P16-P17 | 系统测试、验收测试 |
| ops-engineer | P18 | 部署上线 |

> **注意**：P15 在 development 目录内使用 frontend/backend 子目录区分前端和后端工作。

---

## 全量 Skill 映射汇总

共 22 个 Skill，覆盖全部 18 个产研阶段。

| 需求编号 | Skill | 类型 | 开发阶段 | 覆盖阶段 |
|---------|-------|------|---------|----------|
| EXIST-01 | maestro-logic-list-spec | 已有复制 | Phase 2 ✅ | P06, P09 |
| EXIST-02 | maestro-prototype-design | 已有复制 | Phase 2 ✅ | P06 |
| EXIST-03 | maestro-prd-auto-generator | 已有复制 | Phase 2 ✅ | P09+ |
| EXIST-04 | maestro-diagram-design | 已有复制 | Phase 2 ✅ | P02 |
| PROD-01 | meeting-minutes | 新开发 | Phase 3 ✅ | P01, P03（跨阶段复用） |
| PROD-02 | competitive-analysis | 新开发 | Phase 2 ✅ | P04 |
| PROD-03 | feature-list | 新开发 | Phase 4 ✅ | P05 |
| PROD-04 | prototype-review | 新开发 | Phase 4 ✅ | P07 |
| PROD-05 | ui-design | 新开发 | Phase 5 ✅ | P08 |
| TECH-01 | architecture-design | 新开发 | Phase 6 ✅ | P10 |
| TECH-02 | architecture-review | 新开发 | Phase 6 ✅ | P11 |
| TECH-03 | architecture-refinement | 新开发 | Phase 6 ✅ | P12 |
| TECH-04 | detailed-design | 新开发 | Phase 6 ✅ | P13 |
| DEVL-01 | dev-task-planner | 新开发 | Phase 7 ✅ | P14 |
| DEVL-02 | backend-dev | 新开发 | Phase 7 ✅ | P15 |
| DEVL-03 | frontend-dev | 新开发 | Phase 7 ✅ | P15 |
| DEVL-04 | code-review | 新开发 | Phase 7 ✅ | P15 |
| DLVR-01 | test-engineering | 新开发 | Phase 8 ✅ | P16 |
| DLVR-02 | training-materials | 新开发 | Phase 8 ✅ | P16（MVP） |
| DLVR-03 | acceptance-testing | 新开发 | Phase 8 ✅ | P17 |
| DLVR-04 | deployment | 新开发 | Phase 8 ✅ | P18 |
| CROSS-01 | discuss-phase | 新开发 | P14-A ✅ | 全阶段（按需） |

**开发阶段汇总：**

| 开发阶段 | Skill | 数量 |
|---------|-------|------|
| Phase 2（已有复制 + 新开发） | maestro-diagram-design, maestro-logic-list-spec, maestro-prototype-design, maestro-prd-auto-generator, maestro-competitive-analysis | 5 |
| Phase 3 ✅ | meeting-minutes | 1 |
| Phase 4 ✅ | feature-list, prototype-review | 2 |
| Phase 5 ✅ | ui-design | 1 |
| Phase 6 ✅ | architecture-design, architecture-review, architecture-refinement, detailed-design | 4 |
| Phase 7 ✅ | dev-task-planner, backend-dev, frontend-dev, code-review | 4 |
| Phase 8 ✅ | test-engineering, training-materials, acceptance-testing, deployment | 4 |
| **合计** | | **22** |

---

## 岗位映射总览

| 岗位 Agent | 覆盖阶段 | 规划时关注点 | 验证时关注点 |
|-----------|---------|-------------|-------------|
| product-manager | P01-P08 | 需求可追溯性、功能覆盖度 | 需求完整性、用户价值交付 |
| architect | P09-P13 | 技术选型合理性、模块边界 | 架构可行性、扩展性、安全性 |
| frontend-developer | P14-P15 | 前端任务拆解粒度 | 组件设计、状态管理、安全性 |
| backend-developer | P14-P15 | 后端任务拆解、接口依赖 | API 安全性、性能、规范 |
| test-engineer | P16-P17 | 测试策略完整性 | 覆盖度、缺陷管理、验收覆盖 |
| ops-engineer | P18 | 部署方案完整性 | 生产安全、回滚能力、监控 |
