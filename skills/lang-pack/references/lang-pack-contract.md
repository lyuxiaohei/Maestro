# 语言包契约 — 完整定义

Maestro 语言包（`skills/lang-*`）必须满足本契约才能被视为 mature。

## 1. 目录结构（强制）

```
skills/lang-{name}/
├── SKILL.md                      # 必须
├── modules/                      # 必须
│   ├── tech-stack.md             # 必须
│   ├── module-structure.md       # 必须
│   ├── checklists.md             # 必须（成熟标志之一）
│   └── enterprise/               # 可选（公司特定知识隔离）
│       ├── {company-module-1}.md
│       └── {company-module-2}.md
└── templates/                    # 必须（成熟标志之二）
    ├── {file-type-1}.md
    └── test-{file-type-N}.md
```

缺 `modules/checklists.md` 或 `templates/` 整个目录 = 未成熟。

## 2. SKILL.md 必备 Section

| Section | 内容 |
|---------|------|
| 0. 与 execute Skill 契约 | Briefing 集成点说明；三件套清单；标注"Briefing 不读 = 编码门违规" |
| 1. 技术栈 | 加载 `modules/tech-stack.md` |
| 2. 分层约定 | 硬规则表 |
| 3. 命名规约 | 强制项 + 推荐项 |
| 4+ | 语言特定约定 |
| N. 模板加载表 | 开发场景 → 模板 → **checklist 段名（强制第三列）** |

## 3. modules/checklists.md 格式

- 每段以 `## 写 XXX 前` 命名（XXX 与 templates/{type}.md 一一对应）
- 每段包含 8-15 条 `[ ]` 检查项

## 4. modules/module-structure.md 格式

- 项目根结构图
- 模块划分图
- 单模块内部目录约定

## 5. templates 覆盖范围

| 后端语言 | 必须模板 |
|----------|---------|
| Java/Spring | service / controller / entity / dto / vo / ddl + test-service / test-controller / test-dto；mapper 或 repository 至少一个 |
| Python | router / service / schema / model / migration + test-* |

| 前端语言 | 必须模板 |
|----------|---------|
| React | api-module / hooks / page-list / modal / store / router / utils / axios-instance + test-* |

## 6. 成熟度标记

SKILL.md frontmatter 必须含 `maturity` 字段：

| 值 | Briefing 行为 |
|----|-------------|
| mature | 完整 briefing：三件套 + templates + checklists |
| preview | 仅 tech-stack + 基础模板 |
| 缺失 | 视为 preview |

## 7. preview → mature 升级清单

```
[ ] modules/tech-stack.md 已写
[ ] modules/module-structure.md 已写
[ ] modules/checklists.md 段名与 templates/ 文件名一一对应
[ ] templates/ 包含本契约 Section 5 列出的全部模板
[ ] SKILL.md Section 0 集成契约段已加
[ ] SKILL.md 模板表第三列已填 checklist 段名
[ ] frontmatter maturity 改为 mature
[ ] 企业层模块独立加载，通用层不依赖企业层
```

## Maestro 适配说明

| devkit 原始 | Maestro 适配 |
|------------|-------------|
| /build Step 3.C briefing | execute Skill Briefing 步骤（tool-call-sequence Step 0） |
| openspec/changes/{id}/ | .planning/{version}/workflows/{slug}/ |
| 语言检测在 Hook 中 | 统一到 Skill 激活流程 |
| 公司模块与通用混合 | modules/enterprise/ 独立隔离 |
