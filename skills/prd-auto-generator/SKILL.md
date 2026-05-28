---
name: prd-auto-generator
description: "PRD文档自动生成技能。基于业务逻辑清单和源代码生成完整的PRD文档。当用户提到PRD、产品需求文档、需求文档生成时触发。"
risk: low
source: project
date_added: "2026-04-13"
version: "0.51"
---

# PRD文档自动生成技能 V0.51

> 版本管理见 [VERSIONING.md](VERSIONING.md)

---

## 执行流程

### 阶段一：材料收集与分析（用户确认后进入阶段二）

1. **读取原材料** — 按 `rules/material-checklist.md` 规定的顺序读取：业务逻辑清单 → 导航索引 → 现有PRD → 源码
2. **确定版本范围** — 从导航索引提取版本标记，或使用用户指定的页面列表
3. **识别增量变更** — 对比现有PRD，标注每个页面为新增/变更/未变更（仅增量版本需要）
4. **梳理页面关系图** — 分析版本范围内页面的跳转关系，输出依赖关系图，提交用户审阅
5. **梳理操作流程** — 基于页面关系图，生成各页面之间的操作流程，提交用户审阅
6. **制定撰写计划** — 按 `rules/structure-rules.md` 确定模块编排和撰写顺序，提交用户审阅

### 阶段二：生成版本PRD（每章写完提交用户审阅）

7. 生成版本概述（版本范围、核心功能、数据来源、统计口径、示例账号、重置说明）
8. 按模块逐页生成页面章节（使用 `templates/prd-page-section.md` 模板）
   - 新增页面：完整生成全部小节
   - 变更页面：标注变更点，更新受影响小节
   - 未变更页面：引用旧版PRD，标注"同 V{上一版本}"
9. 生成可选章节（数据模型、状态流转等）
10. 生成页面导航章节（含返回导航、登录拦截子节）
11. 质量检查（编号连续性、规则去重、交叉引用一致性）
12. 合并为完整版本PRD，输出到指定路径

## 输入参数

| 参数名称 | 参数说明 | 必填 |
|----------|----------|------|
| 源码目录 | 项目HTML/JS文件根目录 | 是 |
| 项目名称 | 项目根目录的文件夹名称（自动从路径提取） | 是 |
| 版本号 | 目标版本号，如 V0.1、V1.0 | 是 |
| 输出路径 | PRD文档保存路径（默认 PRD/） | 否 |
| 页面列表 | 指定页面清单（覆盖导航索引的版本标记） | 否 |
| 业务逻辑清单路径 | 业务逻辑清单文件路径 | 是 |
| 上一版PRD路径 | 增量版本时提供上一版PRD路径 | 否 |

## 输出规范

### 输出文件

- 输出目录：项目根目录下的 `PRD/` 文件夹，不存在时自动创建
- 文件命名：`PRD-{项目文件夹名称}-V{版本号}.md`（项目名称取当前项目根目录的文件夹名，如项目在 `mini-program/` 下则命名为 `PRD-mini-program-V0.1.md`）
- 一份完整的版本PRD为一个文件
- 文件结构遵循 `rules/structure-rules.md` 定义的章节编排
- 页面章节使用 `templates/prd-page-section.md` 的6节模板
- 整体骨架使用 `templates/version-prd.md`

### 质量检查项

生成完成后自动执行以下检查：

| 检查项 | 说明 |
|--------|------|
| 标题编号连续性 | 页面内小节编号无跳号（2.1.1→2.1.2→2.1.3） |
| 章节编号连续性 | 二级标题中文数字无跳号（一→二→三） |
| 规则编号唯一 | RULE-{MODULE}-{SEQ} 无重复编号 |
| 交叉引用一致 | 页面跳转节中提到的页面在PRD范围内有对应章节 |
| 流程图语法 | Mermaid代码块可正确渲染，无禁止字符 |
| 版本范围对齐 | 页面清单中的每个页面在PRD中有对应章节 |

### 章节结构

详见 `rules/structure-rules.md`。核心结构：

```
一、版本概述       [必选]
二~N-1、模块章节   [必选，按用户操作路径排序]
N、数据模型        [可选]
N+1、页面导航      [必选]
```

---

## 写作决策

| 内容类型 | 写法 | 依据规则 |
|---------|------|---------|
| 操作步骤 / 交互流程 | 叙述体 | [rules/writing-rules.md](rules/writing-rules.md) |
| 字段 / 枚举 / 校验规则 | 表格 | [rules/writing-rules.md](rules/writing-rules.md) |
| 页面跳转关系 | 跳转表 + 流程图 | [rules/flowchart-rules.md](rules/flowchart-rules.md) |
| 状态流转 | 状态表 + 流程图 | [rules/flowchart-rules.md](rules/flowchart-rules.md) |

---

## Anti-patterns

| 反模式 | 正确做法 |
|--------|----------|
| 臆测未实现的流程 | 每条规则必须在源码有对应 |
| 叙述体和表格说同一件事 | 叙述体说 why，表格说 what |
| 跳过质量检查直接输出 | 生成后必须执行检查项 |
| 流程图未保留 Mermaid 备份 | 必须在 `<details>` 中保留 |
| maestro-diagram-design 可用却使用 Mermaid | 优先 maestro-diagram-design |

---

## 模板与规则索引

### 模板

| 模板 | 说明 | 文件 |
|------|------|------|
| 版本PRD骨架 | 整份文档的章节骨架 | [templates/version-prd.md](templates/version-prd.md) |
| 页面章节 | 单个页面的6节结构 | [templates/prd-page-section.md](templates/prd-page-section.md) |

### 规则

| 规则 | 说明 | 文件 |
|------|------|------|
| 材料清单 | 原材料读取顺序和策略 | [rules/material-checklist.md](rules/material-checklist.md) |
| 文档结构 | 章节编排、编号规则、模块排序 | [rules/structure-rules.md](rules/structure-rules.md) |
| 写作规则 | 叙述体写法、表格使用原则、去重规则 | [rules/writing-rules.md](rules/writing-rules.md) |
| 流程图规则 | Mermaid流程图绘制规范 | [rules/flowchart-rules.md](rules/flowchart-rules.md) |
