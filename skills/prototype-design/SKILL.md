---
name: prototype-design
description: "原型设计技能。支持口述和草案双模式，包含后台管理和小程序两套设计规范。当用户提到原型设计、页面原型、HTML原型时触发。"
version: "0.50"
date_added: "2026-04-24"
---

# 原型设计规范 V0.50

> 版本管理见 [VERSIONING.md](VERSIONING.md)

本技能定义了项目的UI设计标准和规范，确保生成的页面与现有系统风格保持一致。项目采用**纯HTML/CSS/JavaScript**实现，无需任何构建工具或框架依赖。

**双模式支持**：纯口述模式 + 草案模式（接收logic-list-spec输出）。

---

## 模式自动检测

系统自动检测输入类型，优先级：**草案模式 > 口述模式**

**草案模式触发条件（满足任一即可）：**

| 检测类型 | 触发条件 |
|----------|----------|
| 结构化标记 | 包含 `[草案]`、`[待原型]`、`[待确认]`、`[必验]` |
| HMW关键字 | 包含 `How Might We` 或 `HMW` 问题陈述格式 |
| Not Doing标识 | 包含 `Not Doing 清单` 章节或标识 |
| 表格结构 | 包含 `功能用例表`、`状态流转表`、`关键字段数据来源` 表格 |
| 章节结构 | 包含 `页面定位`、`假设清单` 章节 |
| 显式声明 | 用户明确提到"草案"、"业务逻辑清单"、"logic-list-spec输出" |

**口述模式判定：** 不满足草案触发条件的纯文本输入。

详细检测规则见：[rules/mode-detect.md](rules/mode-detect.md)

---

## 模式处理路由

### 口述模式

```
口述输入 → 关键词提取 → 页面类型推断 → 规范选择 → 组件选择 → HTML生成 → 输出验证
```

详细规则：[rules/keyword-extractor.md](rules/keyword-extractor.md) → [rules/page-type-inferencer.md](rules/page-type-inferencer.md)

### 草案模式

```
草案输入 → 草案解析 → 用例映射 → 字段映射 → 状态映射 → 导航映射 → HTML生成 → 输出验证
```

详细规则：[rules/draft-parser.md](rules/draft-parser.md) → [mappings/](mappings/) 目录

草案输入示例见：[references/draft-input-example.md](references/draft-input-example.md)

---

## 设计决策

**快速判断：**
- 运营人员使用的工具 → 后台规范
- 用户浏览/下单的界面 → 小程序规范

| 页面类型 | 使用规范 | 关键特征 |
|----------|----------|----------|
| 素材库管理页 | 后台规范 | PC端、5列网格、左侧导航 |
| 页面装修配置 | 后台规范 | PC端、拖拽操作 |
| 商品详情页 | 小程序规范 | 移动端、用户浏览、购买按钮 |
| 购物车 | 小程序规范 | 移动端、左滑删除、结算按钮 |
| 确认订单页 | 小程序规范 | 移动端、支付方式选择、收银台弹窗 |
| 订单列表（用户侧） | 小程序规范 | 移动端、查看自己的订单 |
| 订单管理（运营侧） | 后台规范 | PC端、查看所有用户订单 |
| 售后申请页 | 小程序规范 | 移动端、用户发起申请 |
| 售后审批页 | 后台规范 | PC端、运营审批处理 |

---

## 共享规范

### 技术栈

- **HTML5**: 语义化标签
- **CSS3**: 原生CSS + CSS变量
- **JavaScript**: ES6+ 原生语法
- **运行方式**: 直接在浏览器中打开HTML文件

### 使用原则

1. **零依赖**: 不依赖Node.js、npm、构建工具
2. **内联样式**: CSS直接写在`<style>`标签内
3. **原生JS**: 使用ES6+语法，无需编译
4. **禁止Emoji**: 所有UI元素禁止使用Emoji，使用SVG图标替代。常用SVG见 [references/svg-icons.md](references/svg-icons.md)

### 字体规范

| 元素 | 字号 | 字重 |
|------|------|------|
| Logo 标题 / 导航标题 | 17-18px | 600 |
| 页面标题 | 15-16px | 600-700 |
| 正文 | 13-14px | 400 |
| 次要文字 | 11-12px | 400 |
| 辅助信息 | 9-10px | 400 |

---

## 后台设计规范

适用于：素材库、页面装修、订单管理（运营侧）、售后审批等PC端运营工具。

- 组件规范：[components/backend-components.md](components/backend-components.md)（含色彩、布局、组件CSS、检查清单）
- 补充参考：[components/backend-reference.md](components/backend-reference.md)（实际项目代码参考，非原型生成规范）
- 页面模板：[templates/backend-template.md](templates/backend-template.md)

---

## 小程序设计规范

适用于：商品详情、购物车、下单支付、订单列表、售后申请等移动端用户界面。

- 组件规范：[components/miniprogram-components.md](components/miniprogram-components.md)（含色彩、布局、组件CSS、检查清单）
- 页面模板：[templates/miniprogram-template.md](templates/miniprogram-template.md)

---

## 文件索引

### 规则文件

| 文件 | 作用 |
|------|------|
| [rules/mode-detect.md](rules/mode-detect.md) | 模式识别规则（口述/草案自动检测） |
| [rules/draft-parser.md](rules/draft-parser.md) | 草案解析规则（含状态标记处理） |
| [rules/keyword-extractor.md](rules/keyword-extractor.md) | 口述关键词提取规则 |
| [rules/page-type-inferencer.md](rules/page-type-inferencer.md) | 页面类型推断规则 |

### 映射文件

| 文件 | 作用 |
|------|------|
| [mappings/use-case-to-component.md](mappings/use-case-to-component.md) | 功能用例→组件映射 |
| [mappings/field-to-ui-element.md](mappings/field-to-ui-element.md) | 字段→UI元素映射 |
| [mappings/state-to-interaction.md](mappings/state-to-interaction.md) | 状态流转→交互映射 |
| [mappings/navigation-to-flow.md](mappings/navigation-to-flow.md) | 页面导航→跳转映射 |

### 验证文件

| 文件 | 作用 |
|------|------|
| [validators/input-validator.md](validators/input-validator.md) | 输入验证规则 |
| [validators/output-validator.md](validators/output-validator.md) | 输出HTML验证规则 |

### 参考文件

| 文件 | 作用 |
|------|------|
| [references/draft-input-example.md](references/draft-input-example.md) | 草案输入示例 |
| [references/svg-icons.md](references/svg-icons.md) | SVG图标代码 |
| [references/resources.md](references/resources.md) | 图标/图片素材网站 |
