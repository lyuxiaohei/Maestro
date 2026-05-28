# 工作流模板指南

本文档定义工作流模板的 JSON Schema、内置模板、自定义模板创建流程和选择机制。

---

## 模板 JSON Schema

每个模板是一个 JSON 对象，包含以下字段：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `display_name` | string | 是 | 模板显示名称（中文） |
| `description` | string | 是 | 模板简要描述 |
| `phases` | string[] | 是 | 包含的阶段列表，使用 P## 格式（如 ["P01","P02"]） |

模板中的阶段顺序决定工作流执行顺序。阶段定义来自 `phase-definitions.md`。

---

## 内置模板

### 从零到一（zero-to-one）

- **描述**：完整产研流程，从需求调研到部署上线
- **阶段**：P01-P18（全部 18 个阶段）
- **适用场景**：全新项目或大版本迭代

### 热修复（hotfix）

- **描述**：快速修复流程，覆盖开发、测试和部署
- **阶段**：P14（开发任务规划）、P15（前后端开发）、P16（系统测试）、P17（验收测试）、P18（部署上线）
- **适用场景**：线上问题修复、紧急补丁发布

---

## 自定义模板创建流程

### 1. 选择岗位

用户从以下岗位中选择参与工作流的角色：

| 岗位 | 阶段范围 | 域目录 |
|------|----------|--------|
| product-manager | P01-P08 | product-manager |
| architect | P09-P13 | architect |
| frontend-developer | P14-P15 | development |
| backend-developer | P14-P15 | development |
| test-engineer | P16-P17 | test-engineer |
| ops-engineer | P18 | ops-engineer |

### 2. 按 role 字段筛选阶段

系统根据 `phase-definitions.md` 中每个阶段的 `role` 字段，筛选出所选岗位对应的阶段列表：

- 选择 `product-manager` → P01, P02, P03, P04, P05, P06, P07, P08
- 选择 `architect` → P09, P10, P11, P12, P13
- 选择 `frontend-developer` 或 `backend-developer` → P14, P15
- 选择 `test-engineer` → P16, P17
- 选择 `ops-engineer` → P18

### 3. 确认阶段顺序

系统按 phase_index 升序排列筛选结果并展示给用户。用户可以：
- 取消勾选不需要的阶段
- 确认最终阶段列表和执行顺序

### 4. 保存模板

确认后系统将模板保存到项目级路径：

```
.planning/templates/{name}.json
```

`{name}` 使用 kebab-case 命名（如 `backend-only`、`ui-refresh`）。

保存后该模板出现在后续的模板选择列表中。

---

## 模板选择方式

### 方式一：交互式选择

不传 `--template` 参数时，编排器展示选择列表：

1. 列出内置模板（zero-to-one、hotfix）
2. 扫描 `.planning/templates/` 目录，列出所有自定义模板
3. 提供「自定义」选项（进入自定义创建流程）
4. 默认选中「从零到一」（与当前 18 阶段行为一致）

### 方式二：CLI 参数指定

```
/workflow-engine {slug} --template {name}
```

- `{name}` 为内置模板名（如 `hotfix`）时，从 config.json `templates.built_in` 读取
- `{name}` 为自定义模板名时，从 `.planning/templates/{name}.json` 读取
- 模板不存在时报错并列出可用模板

---

## 模板与阶段编号

自定义模板使用与标准流程相同的 P## 编号体系：

- 阶段编号和定义始终来自 `phase-definitions.md`，模板仅控制「哪些阶段参与」和「执行顺序」
- GATE-03 防跳步检查仅在模板范围内执行：只检查模板内 phase_index 小于目标阶段的前序阶段
- 模板不改变阶段的 domain、role、inputs/outputs 定义

---

## 模板存储位置汇总

| 来源 | 路径 | 说明 |
|------|------|------|
| 内置模板 | config.json `templates.built_in` | 随插件安装，不可修改 |
| 项目自定义模板 | `.planning/templates/{name}.json` | 项目级，可版本控制 |
