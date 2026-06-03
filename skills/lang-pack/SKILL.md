# 语言包框架

---
name: lang-pack
description: 语言包框架 — 技术栈编码约定的封装单元，自动检测并激活对应语言包
---

## 概念

语言包（Language Pack）是技术栈编码约定的封装单元。每个语言包包含：模块（技术栈/目录结构/检查清单）+ 代码模板 + 企业层扩展。

## 语言包契约（7 大要素）

1. **目录结构**: `modules/` + `templates/` 子目录必备，缺 checklists.md 或 templates/ 整目录 = 未成熟
2. **SKILL.md 必备 Section**: Section 0（集成契约）→ 技术栈 → 分层约定 → 命名规约 → 模板加载表
3. **modules 三件套**: tech-stack.md + module-structure.md + checklists.md
4. **templates 覆盖**: 后端 8+/前端 8+ 代码模板
5. **成熟度分级**: mature（完整 briefing）/ preview（暂行规则）
6. **升级清单**: preview → mature 的 8 项检查
7. **frontmatter 约定**: maturity 字段必须声明

## 激活流程

1. **检测语言栈**: 扫描项目根目录
   - `pom.xml` → Java/Spring
   - `package.json` → React/TypeScript
   - `pyproject.toml` / `requirements.txt` → Python
2. **加载对应语言包**: Skill tool 调用匹配的语言包（`lang-react` / `lang-java`）
3. **输出激活确认**: 已加载模块列表 + templates 列表

## 与 execute Skill 集成

编码任务执行前，execute Skill 的 Briefing 步骤（tool-call-sequence.md Step 0）读取对应语言包：
- 加载 modules/ 三件套获取技术栈上下文
- 按 SKILL.md 模板加载表选择对应 templates
- 按场景加载 checklists.md 对应检查段

## 企业层隔离

- `modules/enterprise/` 子目录存放公司特定知识（框架能力、平台服务等）
- 通用层不依赖企业层模块
- 用户可删除 enterprise/ 目录而不影响通用功能
- 企业层模块标注为"可选推荐"，非通用硬规则

## 成熟度

| maturity | 行为 |
|----------|------|
| mature | 完整 briefing：三件套 + templates + checklists |
| preview | 暂行规则，仅加载 tech-stack + 基础模板 |
| 缺失 | 视为 preview |

## 参考文件

- [references/lang-pack-contract.md](references/lang-pack-contract.md) — 语言包契约完整定义
