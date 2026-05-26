# 设计系统规范

本文档定义 UI 设计的色彩体系、字体层级、间距系统、阴影和圆角等基础设计 Token。

---

## 一、色彩体系

### 1.1 主色（Primary）

| Token 名称 | 用途 | 色值参考 | 说明 |
|------------|------|---------|------|
| --color-primary-50 | 浅底色 | #EEF2FF | 背景、Hover 底色 |
| --color-primary-100 | 浅色背景 | #E0E7FF | 选中态背景 |
| --color-primary-200 | 边框/分割 | #C7D2FE | 输入框聚焦边框 |
| --color-primary-500 | 主色 | #6366F1 | 按钮、链接、强调 |
| --color-primary-600 | 深主色 | #4F46E5 | 按钮 Hover 态 |
| --color-primary-700 | 深色 | #4338CA | 按钮 Active 态 |
| --color-primary-800 | 深色文字 | #3730A3 | 标题强调 |

### 1.2 辅助色（Secondary）

| Token 名称 | 用途 | 色值参考 |
|------------|------|---------|
| --color-secondary-50 | 浅底色 | #F0F9FF |
| --color-secondary-500 | 辅助色 | #0EA5E9 |
| --color-secondary-600 | 深辅助色 | #0284C7 |

### 1.3 功能色（Semantic）

| Token 名称 | 用途 | 色值参考 |
|------------|------|---------|
| --color-success-500 | 成功/通过 | #22C55E |
| --color-success-50 | 成功背景 | #F0FDF4 |
| --color-warning-500 | 警告/提醒 | #F59E0B |
| --color-warning-50 | 警告背景 | #FFFBEB |
| --color-error-500 | 错误/危险 | #EF4444 |
| --color-error-50 | 错误背景 | #FEF2F2 |
| --color-info-500 | 信息/提示 | #3B82F6 |
| --color-info-50 | 信息背景 | #EFF6FF |

### 1.4 中性色（Neutral）

| Token 名称 | 用途 | 色值参考 |
|------------|------|---------|
| --color-neutral-50 | 页面背景 | #F9FAFB |
| --color-neutral-100 | 区块背景 | #F3F4F6 |
| --color-neutral-200 | 分割线/边框 | #E5E7EB |
| --color-neutral-300 | 禁用边框 | #D1D5DB |
| --color-neutral-400 | 占位文字 | #9CA3AF |
| --color-neutral-500 | 辅助文字 | #6B7280 |
| --color-neutral-600 | 次要文字 | #4B5563 |
| --color-neutral-700 | 正文 | #374151 |
| --color-neutral-800 | 标题 | #1F2937 |
| --color-neutral-900 | 强调标题 | #111827 |

---

## 二、字体层级

### 2.1 字体族

| 类型 | 字体栈 | 说明 |
|------|--------|------|
| 主字体 | "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif | 中文优先 |
| 等宽字体 | "SF Mono", "Fira Code", "Consolas", monospace | 代码/数据 |
| 数字字体 | "DIN Alternate", "Roboto Mono", monospace | 数据展示 |

### 2.2 字号层级

| Token 名称 | 字号 | 行高 | 字重 | 用途 |
|------------|------|------|------|------|
| --font-size-h1 | 24px | 32px | 700 | 页面主标题 |
| --font-size-h2 | 20px | 28px | 600 | 模块标题 |
| --font-size-h3 | 16px | 24px | 600 | 卡片/区块标题 |
| --font-size-body | 14px | 22px | 400 | 正文内容 |
| --font-size-body-sm | 13px | 20px | 400 | 辅助正文 |
| --font-size-caption | 12px | 18px | 400 | 说明文字/标签 |
| --font-size-overline | 11px | 16px | 500 | 极小标注 |

---

## 三、间距系统

采用 4px 基础网格，以 4 的倍数递增。

| Token 名称 | 值 | 用途 |
|------------|-----|------|
| --spacing-1 | 4px | 紧凑元素内间距 |
| --spacing-2 | 8px | 图标与文字间距、小组件内间距 |
| --spacing-3 | 12px | 表单项间距、列表项间距 |
| --spacing-4 | 16px | 卡片内间距、模块内间距 |
| --spacing-5 | 20px | 区块间距 |
| --spacing-6 | 24px | 页面边距（移动端）、大区块间距 |
| --spacing-8 | 32px | 页面边距（PC 端）、模块外间距 |
| --spacing-10 | 40px | 大模块间距 |
| --spacing-12 | 48px | 页面级间距 |

---

## 四、圆角

| Token 名称 | 值 | 用途 |
|------------|-----|------|
| --radius-sm | 4px | 按钮、小标签 |
| --radius-md | 8px | 输入框、卡片、下拉框 |
| --radius-lg | 12px | 弹窗、大卡片 |
| --radius-xl | 16px | 模态框 |
| --radius-full | 9999px | 圆形头像、胶囊标签 |

---

## 五、阴影

| Token 名称 | 值 | 用途 |
|------------|-----|------|
| --shadow-sm | 0 1px 2px rgba(0,0,0,0.05) | 微弱层级 |
| --shadow-md | 0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.05) | 卡片悬浮 |
| --shadow-lg | 0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05) | 弹窗、下拉菜单 |
| --shadow-xl | 0 20px 25px rgba(0,0,0,0.1), 0 8px 10px rgba(0,0,0,0.05) | 模态框 |

---

## 六、断点

| Token 名称 | 值 | 用途 |
|------------|-----|------|
| --breakpoint-sm | 640px | 移动端最大宽度 |
| --breakpoint-md | 768px | 平板 |
| --breakpoint-lg | 1024px | 小屏 PC |
| --breakpoint-xl | 1280px | 标准 PC |

---

## 七、使用原则

1. **Token 优先**：所有设计值通过 Token 引用，避免硬编码
2. **一致性**：同类型元素使用相同 Token（如所有卡片统一 --radius-md + --shadow-md）
3. **对比度**：文字与背景色对比度不低于 4.5:1（WCAG 2.1 AA）
4. **间距递进**：相邻层级间距保持 Token 阶梯关系（如 --spacing-4 内 → --spacing-6 外）
5. **色彩语义**：功能色仅用于对应语义（错误红、成功绿），不可混用
