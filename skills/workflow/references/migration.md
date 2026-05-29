# Migration Guide: 多工作流结构到版本化结构迁移

## 迁移触发条件

编排器首次启动时检测以下旧路径标志：
- `.planning/workflows/{slug}/phases/` 目录存在（含 domain 中间层）
- `.planning/workflows/{slug}/` 下存在 `workflow.md` 但无版本目录

## 结构变更概览

### 旧结构

```
.planning/
  workflows/
    {slug}/
      workflow.md
      phases/
        {domain}/              ← 5 个域目录
          P##-{phase-slug}/
            P##-STATE.md       ← 带前缀文件名
            P##-CONTEXT.md
            P##-PLAN.md
            P##-OUTPUT.md
            P##-SUMMARY.md
            P##-VERIFICATION.md
```

### 新结构

```
.planning/
  {YYYYMM.PATCH}/              ← 版本目录（来自 STATE.md current_milestone）
    workflows/
      {slug}/
        workflow.md
        P##-{phase-slug}/      ← 无 domain 中间层
          STATE.md             ← 无前缀文件名
          CONTEXT.md
          PLAN.md
          OUTPUT.md
          SUMMARY.md
          VERIFICATION.md
```

---

## 路径映射表

| 旧路径 | 新路径 | 说明 |
|--------|--------|------|
| `.planning/workflows/{slug}/workflow.md` | `.planning/{version}/workflows/{slug}/workflow.md` | 移入版本目录 |
| `.planning/workflows/{slug}/phases/{domain}/P##-{phase-slug}/` | `.planning/{version}/workflows/{slug}/P##-{phase-slug}/` | 移除 domain 中间层 |
| `.planning/workflows/{slug}/phases/{domain}/P##-{phase-slug}/P##-STATE.md` | `.planning/{version}/workflows/{slug}/P##-{phase-slug}/STATE.md` | 移除文件名前缀 |
| `.planning/workflows/{slug}/phases/{domain}/P##-{phase-slug}/P##-CONTEXT.md` | `.planning/{version}/workflows/{slug}/P##-{phase-slug}/CONTEXT.md` | 移除文件名前缀 |
| `.planning/workflows/{slug}/phases/{domain}/P##-{phase-slug}/P##-PLAN.md` | `.planning/{version}/workflows/{slug}/P##-{phase-slug}/PLAN.md` | 移除文件名前缀 |
| `.planning/workflows/{slug}/phases/{domain}/P##-{phase-slug}/P##-OUTPUT.md` | `.planning/{version}/workflows/{slug}/P##-{phase-slug}/OUTPUT.md` | 移除文件名前缀 |
| `.planning/workflows/{slug}/phases/{domain}/P##-{phase-slug}/P##-SUMMARY.md` | `.planning/{version}/workflows/{slug}/P##-{phase-slug}/SUMMARY.md` | 移除文件名前缀 |
| `.planning/workflows/{slug}/phases/{domain}/P##-{phase-slug}/P##-VERIFICATION.md` | `.planning/{version}/workflows/{slug}/P##-{phase-slug}/VERIFICATION.md` | 移除文件名前缀 |

---

## 文件命名变更

| 旧文件名 | 新文件名 | 说明 |
|-----------|----------|------|
| `P##-STATE.md` | `STATE.md` | 阶段状态文件 |
| `P##-CONTEXT.md` | `CONTEXT.md` | 阶段上下文文档 |
| `P##-PLAN.md` | `PLAN.md` | 阶段执行计划 |
| `P##-OUTPUT.md` | `OUTPUT.md` | 阶段交付物文档 |
| `P##-SUMMARY.md` | `SUMMARY.md` | 阶段执行摘要 |
| `P##-VERIFICATION.md` | `VERIFICATION.md` | 阶段验证报告 |

---

## Domain 目录移除

旧结构中 5 个 domain 中间层目录被移除：

| 旧 domain 目录 | 阶段范围 | 新结构 |
|----------------|----------|--------|
| `product-manager/` | P01-P08 | 直接放在 `{slug}/` 下 |
| `architect/` | P09-P13 | 直接放在 `{slug}/` 下 |
| `development/` | P14-P15 | 直接放在 `{slug}/` 下 |
| `test-engineer/` | P16-P17 | 直接放在 `{slug}/` 下 |
| `ops-engineer/` | P18 | 直接放在 `{slug}/` 下 |

domain 信息不再体现在路径中，改为存储在 STATE.md 元数据中（`domain` 字段），用于：
- 角色分配（哪个岗位 Agent 负责该阶段）
- 岗位 Agent 映射（product-manager → P01-P08 等）

---

## 版本目录创建

版本目录名从 `.planning/STATE.md` 的 `current_milestone` 字段获取：

```
.planning/STATE.md:
  current_milestone: "202505.0"

→ 版本目录: .planning/202505.0/
```

如果 `current_milestone` 不存在，默认使用 `000000.0` 作为版本目录名。

---

## 迁移步骤

### 1. 确定版本号

读取 `.planning/STATE.md` 中的 `current_milestone` 字段，格式为 `YYYYMM.PATCH`（如 `202505.0`）。如果不存在，使用默认值 `000000.0`。

### 2. 创建版本目录结构

```
.planning/{version}/workflows/{slug}/
```

### 3. 迁移工作流文件

将 `.planning/workflows/{slug}/workflow.md` 复制到 `.planning/{version}/workflows/{slug}/workflow.md`。

### 4. 迁移阶段目录

对每个 `phases/{domain}/P##-{phase-slug}/` 目录：

1. 创建目标目录 `.planning/{version}/workflows/{slug}/P##-{phase-slug}/`
2. 移动所有文件，同时重命名（移除 `P##-` 前缀）：
   - `P##-STATE.md` → `STATE.md`
   - `P##-CONTEXT.md` → `CONTEXT.md`
   - `P##-PLAN.md` → `PLAN.md`
   - `P##-OUTPUT.md` → `OUTPUT.md`
   - `P##-SUMMARY.md` → `SUMMARY.md`
   - `P##-VERIFICATION.md` → `VERIFICATION.md`
3. 其他文件保持原名不变（如原型 HTML、图表等）

### 5. 更新 STATE.md 元数据

在每个 `STATE.md` 中添加 `domain` 字段，记录该阶段所属域：

```yaml
domain: product-manager
```

### 6. 更新路径引用

更新以下文件中的路径引用：
- `workflow.md` 中的阶段路径
- `STATE.md` 中的上下游引用路径
- 其他文档中的交叉引用

### 7. 写入迁移标记

在旧路径写入 MIGRATED.md 指向新位置：

```markdown
# MIGRATED

此位置已迁移到版本化结构。

新路径: .planning/{version}/workflows/{slug}/
迁移时间: {timestamp}
```

### 8. 保留旧目录

迁移完成后保留旧目录（不自动删除），由用户确认后手动清理。

---

## 回滚策略

迁移前备份旧路径结构（`.planning/workflows/` → `.planning/workflows.bak/`）。失败时从备份恢复。

---

## 迁移脚本

使用 `scripts/migrate-version-paths.js` 执行自动迁移：

```bash
# 预览迁移操作（不执行）
node scripts/migrate-version-paths.js --dry-run

# 执行迁移
node scripts/migrate-version-paths.js

# 指定版本号
node scripts/migrate-version-paths.js --version 202505.1
```
