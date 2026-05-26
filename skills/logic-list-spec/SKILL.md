---
name: logic-list-spec
description: "业务逻辑清单生成技能。支持双模式：Draft模式（从需求正向生成）和Extract模式（从原型反向提取）。当用户提到业务逻辑清单、逻辑梳理、功能用例表、logic-list-spec时触发。"
risk: low
source: project
date_added: "2026-04-21"
version: "0.21"
---

# 业务逻辑清单生成技能 V0.21

> 版本管理见 [VERSIONING.md](VERSIONING.md)

双模式支持：**Draft模式**（需求正向生成草案）+ **Extract模式**（源码逆向提取）。

---

## 双模式说明

| 模式 | 输入来源 | 适用场景 | 输出文件 |
|------|----------|----------|----------|
| **Draft** | 需求描述 + codebase扫描 | 无原型页面，首次设计 | `业务逻辑清单_V{版本}-草案.md` |
| **Extract** | HTML源码逆向提取 | 有原型页面 | `业务逻辑清单_V{版本}.md` |

---

## 模式自动检测规则

1. **用户指定** `--mode=draft` 或 `--mode=extract`
2. **检测页面存在**：`page-index.md` 中页面文件存在 → Extract模式
3. **用户口述**："没有原型"/"首次设计"/"新功能"/"草案" → Draft模式
4. **默认**：Extract模式

---

## 一、Draft模式流程

适用于无原型HTML的首次设计场景，深度融合 idea-refine 方法论。

```
需求输入 → 需求收集 → 页面收敛 → 输出草案 → 用户确认
```

| 阶段 | 目标 | 详细规则 |
|------|------|---------|
| 一、需求收集 | HMW重述 → 澄清问题 → 变体生成 → 上下文扫描 | [rules/requirement-collection.md](rules/requirement-collection.md) |
| 二、页面收敛 | 聚类页面 → 压力测试 → 显性假设 → Not Doing | [rules/draft-generation.md](rules/draft-generation.md) |
| 三、输出草案 | 功能大纲→用例表 → 数据需求→字段表 → 规则→增强表 | [rules/draft-generation.md](rules/draft-generation.md) |

**关键约束：**
- 不进入阶段二，直到用户画像 + 成功标准已明确
- 每页至少 2 条假设，标注 `[必验]`/`[风险]`/`[暂略]`
- Not Doing 清单项 ≥ Doing 项的 50%
- 总页面数 ≤ 10

**输出：** `doc/V{版本}/业务逻辑清单_V{版本}-草案.md`，无截图，页面标注 `[待原型]`

---

## 二、Extract模式流程（原有流程）

适用于有原型HTML的验证场景。

### 阶段一：材料收集与范围确认

1. **读取导航索引** — `page-index.md` 提取带版本标记的页面列表
2. **读取现有文档** — 避免重复/识别增量
3. **读取页面源码** — 按 `reference/material-checklist.md` 逐页读取
4. **制定文档计划** — 提交用户审阅

### 阶段二：逐页生成文档内容

5. **逐页生成三表**：
   - 功能用例表（从源码提取交互场景）
   - 关键字段数据来源
   - 业务逻辑增强（可选）
6. **生成全局章节**：
   - 跳转关系表
   - 返回导航
   - 登录拦截
   - 状态流转表

### 阶段三：截图、渲染与输出

7. **自动截图** — `scripts/screenshot.py` 为每个页面截图
8. **流程图渲染** — 将 mermaid 流程图渲染为 SVG（详见 `rules/flowchart-rules.md` 的渲染方案）
9. **合并输出** — 插入截图路径和SVG引用，输出完整文档

---

## 三、输入参数

| 参数名称 | 参数说明 | 必填 |
|----------|----------|------|
| 模式 | `--mode=draft` 或 `--mode=extract` | 否（自动检测） |
| 版本号 | 目标版本号，如 V0.3 | 是 |
| 需求描述 | Draft模式的输入 | Draft模式必填 |
| 页面列表 | Extract模式覆盖范围 | Extract模式可选 |
| 输出路径 | 文档保存路径 | 否（默认 `doc/V{版本}/`） |

---

## 四、输出规范

### 输出文件

| 模式 | 文件名 | 截图 |
|------|--------|------|
| Draft | `业务逻辑清单_V{版本}-草案.md` | 无 |
| Extract | `业务逻辑清单_V{版本}.md` | `screenshots/*.png` |

### 草案→正式版转换规则

| 草案标记 | 正式版替换 |
|----------|-----------|
| `[草案]` | 移除，替换为源码实现描述 |
| `[待原型]` | 移除，页面文件已存在 |
| `[待确认]` | 替换为确认结果或保留建议格式 |
| `[必验]`/`[风险]` | 标注验证结果 |

### 质量检查项

| 检查项 | Draft模式 | Extract模式 |
|--------|-----------|-------------|
| 标题编号连续 | ✓ | ✓ |
| 三表完整性 | ✓（标注草案） | ✓ |
| 截图引用 | 无 | ✓ |
| Not Doing清单 | ✓（≥Doing的50%） | 无 |
| 假设清单 | ✓（每页≥2条） | 无 |

---

## 五、模板与参考资料索引

### 模板

| 模板 | 说明 | 文件 |
|------|------|------|
| 文档骨架 | 正式版+草案版骨架 | [templates/doc-skeleton.md](templates/doc-skeleton.md) |
| 页面章节 | 正式版+草案版三表结构 | [templates/page-section.md](templates/page-section.md) |

### 规则

| 规则 | 说明 | 文件 |
|------|------|------|
| 需求收集 | Draft模式Phase 1流程（融合idea-refine） | [rules/requirement-collection.md](rules/requirement-collection.md) |
| 草案生成 | Draft模式Phase 2-3流程 | [rules/draft-generation.md](rules/draft-generation.md) |
| 文档结构 | 标题层级、编号规则 | [rules/document-structure.md](rules/document-structure.md) |
| 用例生成 | Extract模式从源码提取用例 | [rules/use-case-generation.md](rules/use-case-generation.md) |
| 流程图规则 | mermaid flowchart规范 + Mermaid→SVG渲染方案 | [rules/flowchart-rules.md](rules/flowchart-rules.md) |

### 参考资料

| 参考资料 | 说明 | 文件 |
|----------|------|------|
| 材料清单 | 双模式输入材料 | [reference/material-checklist.md](reference/material-checklist.md) |
| 草案示例 | 售后流程完整草案 | [reference/draft-example.md](reference/draft-example.md) |

### 脚本

| 脚本 | 说明 | 文件 |
|------|------|------|
| 截图脚本 | Chrome CDP自动截图 | [scripts/screenshot.py](scripts/screenshot.py) |

---

## 六、Anti-patterns（反模式）

| 反模式 | 正确做法 |
|--------|----------|
| Draft模式不标注假设 | 每页必须标注假设清单（≥2条） |
| Draft模式无Not Doing | Not Doing ≥ Doing的50% |
| Draft模式预期结果模糊 | 具体到交互元素、颜色、页面名 |
| Draft模式跳过codebase扫描 | 必须扫描现有组件和约束 |
| Extract模式臆测未实现功能 | 每条用例必须在源码有对应 |
| 模式判断错误 | 优先用户指定，其次检测页面存在 |

---

## 七、验证清单

**Draft模式验证：**

- [ ] HMW问题陈述已写入头部
- [ ] 成功标准已定义
- [ ] Not Doing清单已列出（≥Doing的50%）
- [ ] 每个页面有假设清单（≥2条）
- [ ] 假设已区分 [必验]/[风险]/[暂略]
- [ ] 功能用例预期结果具体且标注 [草案]
- [ ] 跳转关系和状态流转已定义

**Extract模式验证：**

- [ ] 页面范围与版本标记一致
- [ ] 每条用例能在源码找到对应实现
- [ ] 截图已插入相对路径
- [ ] 跳转关系完整
- [ ] 标题编号连续