# 字段到UI元素映射规则

定义如何将关键字段数据来源表中的字段映射到具体的UI元素。

---

## 映射原则

**一字段一元素**：每个字段对应至少一个UI展示或输入元素。

---

## 字段类型推断矩阵

| 字段名称关键词 | 推断字段类型 | 后台UI元素 | 小程序UI元素 |
|----------------|--------------|------------|--------------|
| 名称、标题、标题名 | `string(短)` | `Text` | `文本` |
| 描述、内容、说明、备注 | `string(长)` | `TextArea` | `多行文本` |
| 价格、金额、费用 | `price` | `PriceTag` | `红色价格标签` |
| 数量、件数、数量 | `number` | `InputNumber` | `数量调整器` |
| 状态、订单状态、售后状态 | `enum(status)` | `StatusTag` | `状态标签(彩色)` |
| 类型、申请类型、支付类型 | `enum` | `Select` | `Tab/选择器` |
| 时间、日期、下单时间 | `datetime` | `TimeText` | `时间文本` |
| 手机号、电话、联系方式 | `phone` | `PhoneText` | `脱敏手机号` |
| 地址、收货地址、配送地址 | `address` | `AddressCard` | `地址卡片` |
| 图片、图片、凭证图片 | `image[]` | `ImageList` | `图片网格(3列)` |
| 头像、用户头像 | `avatar` | `Avatar` | `圆形头像` |
| 规格、商品规格、SKU | `spec` | `SpecText` | `规格标签(灰色)` |
| 订单号、编号、运单号 | `id` | `CopyableText` | `可复制文本` |
| 是否、开关、启用状态 | `boolean` | `Switch` | `开关/勾选` |
| 评分、星级、好评率 | `rating` | `RatingStars` | `星级展示` |

---

## 数据来源映射规则

### 数据来源类型 → UI可编辑性

| 数据来源关键词 | 数据来源类型 | UI可编辑性 | 组件样式 |
|----------------|--------------|------------|----------|
| 用户操作、用户输入、用户填写 | `user_input` | **可编辑** | 输入组件、placeholder |
| 用户选择、Tab选择、下拉选择 | `user_select` | **可选择** | 选择组件、选项列表 |
| 系统生成、自动记录、自动生成 | `system_generated` | **不可编辑** | 展示组件、灰色背景 |
| 品牌商城后台、后台、API查询 | `api_query` | **动态加载** | 展示组件、loading状态 |
| 上一页面传入、上一页传入 | `prev_page` | **预填充** | 展示组件、可修改 |
| 前端实时计算、实时计算 | `frontend_calc` | **动态展示** | 展示组件、实时更新 |

---

## 映射流程

### Step 1: 字段类型推断

```
字段名称 → 关键词匹配 → 推断字段类型 → 确定UI元素类型
```

### Step 2: 数据来源可编辑性判断

```
数据来源 → 关键词匹配 → 推断数据来源类型 → 确定可编辑性
```

### Step 3: UI元素配置生成

```
字段类型 + 数据来源类型 → 选择具体组件 → 生成配置JSON
```

---

## 后台规范UI元素详解

### 展示类元素

| UI元素 | HTML结构 | 样式配置 |
|--------|----------|----------|
| `Text` | `<span class="text">{value}</span>` | `font-size: 14px; color: #333` |
| `PriceTag` | `<span class="price">¥{value}</span>` | `font-size: 14px; color: #ee0a24; font-weight: 500` |
| `StatusTag` | `<span class="status-tag {status}">{text}</span>` | 颜色映射表 |
| `TimeText` | `<span class="time">{formatted}</span>` | `font-size: 13px; color: #8c8c8c` |
| `PhoneText` | `<span class="phone">{masked}</span>` | 11位脱敏为 `138****8888` |
| `AddressCard` | `<div class="address-card">...</div>` | 卡片布局、收件人+地址 |
| `CopyableText` | `<span class="copyable">{value}</span><button class="copy-btn">复制</button>` | 复制按钮、Toast提示 |
| `Avatar` | `<img class="avatar" src="{url}">` | `width: 40px; height: 40px; border-radius: 50%` |
| `ImageList` | `<div class="image-grid">...</div>` | 3列网格、缩略图 |
| `RatingStars` | `<div class="stars">★★★★★</div>` | 星级SVG图标 |

### 输入类元素

| UI元素 | HTML结构 | 样式配置 |
|--------|----------|----------|
| `Input` | `<input class="input" placeholder="..." maxlength="...">` | 圆角6px、边框#d9d9d9 |
| `InputNumber` | `<input class="input-number" type="number" min="..." max="...">` | 数字键盘、步长 |
| `TextArea` | `<textarea class="textarea" rows="..." maxlength="...">` | 多行、计数器 |
| `Select` | `<select class="select">...</select>` | 下拉选项、默认值 |
| `Switch` | `<input type="checkbox" class="switch">` | 开关样式 |

---

## 小程序规范UI元素详解

### 展示类元素

| UI元素 | HTML结构 | 样式配置 |
|--------|----------|----------|
| `文本` | `<span class="text">{value}</span>` | `font-size: 13px; color: #333` |
| `红色价格标签` | `<span class="price-tag">¥{value}</span>` | `color: #ee0a24; font-size: 18px; font-weight: 600` |
| `状态标签(彩色)` | `<span class="status-tag {status}">{text}</span>` | 圆角标签、颜色映射 |
| `时间文本` | `<span class="time-text">{formatted}</span>` | `font-size: 12px; color: #8c8c8c` |
| `脱敏手机号` | `<span class="phone-text">{masked}</span>` | 11位脱敏展示 |
| `地址卡片` | `<div class="address-card">...</div>` | 收件人+手机+地址+彩色锯齿线 |
| `可复制文本` | `<span class="copy-text">{value}<button>复制</button></span>` | 复制按钮、Toast |
| `圆形头像` | `<img class="avatar-circle">` | `width: 36px; border-radius: 50%` |
| `图片网格(3列)` | `<div class="image-grid">...</div>` | 3列布局、间距8px |
| `星级展示` | `<div class="rating-stars">★★★★★</div>` | 橙色星级 |

### 输入类元素

| UI元素 | HTML结构 | 样式配置 |
|--------|----------|----------|
| `输入框` | `<input class="input-field">` | 圆角12px、placeholder |
| `数字输入` | `<input class="number-input" type="number">` | 数字键盘 |
| `多行文本` | `<textarea class="textarea-field">` | 圆角12px、多行 |
| `选择器` | `<div class="selector">...</div>` | 底部滑入弹窗 |
| `Tab栏` | `<div class="tabs">...</div>` | 横向Tab、选中下划线 |

---

## 映射示例

### 示例字段1

```markdown
| 申请类型 | 用户操作 — Tab选择 `[草案]` |
```

**映射分析：**
- 字段名称：申请类型 → `enum` 类型
- 数据来源：用户操作 — Tab选择 → `user_select` → 可选择

**映射输出（小程序）：**
```json
{
  "field_name": "申请类型",
  "field_type": "enum",
  "data_source": "user_select",
  "ui_element": "Tab栏",
  "config": {
    "items": ["仅退款", "退货退款"],
    "selected_style": "orange-gradient",
    "default_selected": 0
  }
}
```

### 示例字段2

```markdown
| 凭证图片 | 用户操作 — 图片上传 `[草案]` |
```

**映射分析：**
- 字段名称：凭证图片 → `image[]` 类型
- 数据来源：用户操作 — 图片上传 → `user_input` → 可编辑（上传）

**映射输出（小程序）：**
```json
{
  "field_name": "凭证图片",
  "field_type": "image[]",
  "data_source": "user_input",
  "ui_element": "Upload",
  "config": {
    "max_count": 3,
    "accept": "image/*",
    "show_preview": true,
    "preview_grid": "3-column"
  }
}
```

### 示例字段3

```markdown
| 申请状态 | 品牌商城后台售后管理 `[待确认]` |
```

**映射分析：**
- 字段名称：申请状态 → `enum(status)` 类型
- 数据来源：品牌商城后台 → `api_query` → 不可编辑（动态加载）

**映射输出（小程序）：**
```json
{
  "field_name": "申请状态",
  "field_type": "enum(status)",
  "data_source": "api_query",
  "ui_element": "状态标签(彩色)",
  "config": {
    "status_colors": {
      "待审核": "#ff9800",
      "已通过": "#52c41a",
      "已拒绝": "#ee0a24"
    },
    "pending_confirm": true
  }
}
```

---

## 状态标记处理

| 状态标记 | 映射处理 |
|----------|----------|
| `[草案]` | 正常映射，标记来源为草案 |
| `[待确认]` | 映射后附加 `pending_confirm: true`，生成确认提示占位符 |

---

## 字段未映射处理

| 未映射情况 | 处理方式 |
|------------|----------|
| 字段类型无法推断 | 默认 `string(短)` → Text展示 |
| 数据来源无法推断 | 默认 `api_query` → 展示组件 |
| 字段名称含特殊业务词 | 提示补充字段类型 |

---

## 特殊字段处理

### 商品信息字段

```markdown
| 商品信息（图片/名称/规格/价格） | 品牌商城后台商品管理 |
```

**映射输出：**
```json
{
  "field_name": "商品信息",
  "field_type": "composite",
  "sub_fields": [
    {"name": "图片", "type": "image", "ui": "商品图片"},
    {"name": "名称", "type": "string", "ui": "商品名称"},
    {"name": "规格", "type": "spec", "ui": "规格标签"},
    {"name": "价格", "type": "price", "ui": "价格标签"}
  ],
  "ui_element": "商品卡片"
}
```

### 订单信息字段

```markdown
| 订单信息（订单号/下单时间/支付方式） | 品牌商城后台订单系统 |
```

**映射输出：**
```json
{
  "field_name": "订单信息",
  "field_type": "composite",
  "sub_fields": [
    {"name": "订单号", "type": "id", "ui": "可复制文本"},
    {"name": "下单时间", "type": "datetime", "ui": "时间文本"},
    {"name": "支付方式", "type": "enum", "ui": "支付方式标签"}
  ],
  "ui_element": "订单信息卡"
}
```