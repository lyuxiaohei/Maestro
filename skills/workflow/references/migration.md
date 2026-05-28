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

从旧 6 域目录迁移到新 5 域目录：

| 旧目录 | 新目录 | 阶段范围 | 说明 |
|--------|--------|----------|------|
| product/ | product-manager/ | P01-P04 | 目录重命名 |
| design/ | 合并到 product-manager/ | P05-P08 | design/ 下的阶段目录移入 product-manager/ |
| architecture/ | architect/ | P09-P13 | 目录重命名 |
| development/ | development/ | P14-P15 | 不变（P15 使用 frontend/backend 子目录） |
| testing/ | test-engineer/ | P16-P17 | 目录重命名 |
| deployment/ | ops-engineer/ | P18 | 目录重命名 |

### design/ 合并迁移步骤

design/ 目录下的阶段（P05-P08）需要移入 product-manager/ 目录：

1. 创建 `product-manager/` 目录（如果不存在）
2. 将 `design/` 下所有 `P05-*`、`P06-*`、`P07-*`、`P08-*` 子目录移到 `product-manager/`
3. 删除空的 `design/` 目录
4. 更新相关 STATE.md 和 workflow.md 中的路径引用

### P15 子目录结构

P15 在 development 目录内使用 `frontend/` 和 `backend/` 子目录区分前端和后端工作：

```
development/
  P14-dev-task-planner/
  P15-*/
    frontend/        # 前端开发工作目录
      P15-STATE.md
    backend/         # 后端开发工作目录
      P15-STATE.md
```

## 回滚策略

迁移前备份旧路径结构。失败时从备份恢复。

## MIGRATED.md 模板

```markdown
# MIGRATED

此位置已迁移到多工作流结构。

新路径: .planning/workflows/default/
迁移时间: {timestamp}
```
