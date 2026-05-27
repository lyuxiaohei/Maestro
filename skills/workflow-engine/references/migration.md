# Migration Guide: 旧路径到多工作流结构迁移

## 迁移触发条件

编排器首次启动时检测以下旧路径标志：
- `.planning/workflow.md` 存在（全局 workflow.md）
- `.planning/phases/P*-STATE.md` 存在（扁平 STATE.md 文件）

## 迁移流程

1. 创建 `workflows/default/` 目录
2. 移动 `.planning/workflow.md` 到 `.planning/workflows/default/workflow.md`
3. 在 workflow.md 中添加 `workflow_slug: default` 字段
4. 读取 phase-definitions.md 的 domain 映射，为每个阶段：
   a. 创建 `.planning/workflows/default/phases/{domain}/P##-{phase-slug}/` 目录
   b. 移动 `.planning/phases/P##-STATE.md` 到新目录
   c. 移动 `.planning/phases/P##-{slug}/` 下所有过程文档到新目录
5. 更新 STATE.md 中阶段文档路径为新格式
6. 在旧路径写入 MIGRATED.md 指向新位置

## Domain 映射

| Domain | 阶段范围 |
|--------|----------|
| product | P01-P04 |
| design | P05-P08 |
| architecture | P09-P13 |
| development | P14-P15 |
| testing | P16-P17 |
| deployment | P18 |

## 回滚策略

迁移前备份旧路径结构。失败时从备份恢复。

## MIGRATED.md 模板

```markdown
# MIGRATED

此位置已迁移到多工作流结构。

新路径: .planning/workflows/default/
迁移时间: {timestamp}
```
