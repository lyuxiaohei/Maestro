# 页面导航到页面流映射规则

定义如何将页面导航关系表映射到前端跳转逻辑。

---

## 映射原则

**一跳转一链接**：每条跳转关系对应一个页面跳转逻辑。

---

## 跳转关系表结构

```markdown
| # | 页面A | 触发条件 | 页面B |
|---|-------|----------|-------|
| 1 | {源页面} | {触发动作} | {目标页面} |
```

---

## 跳转类型映射

| 跳转类型 | 触发条件关键词 | 跳转方式 | 代码模式 |
|----------|----------------|----------|----------|
| **按钮跳转** | 点击按钮、点击提交 | `location.href` | `onclick="location.href='page.html'"` |
| **卡片跳转** | 点击卡片、点击商品区域 | `location.href` | `onclick="location.href='page.html?id='+id"` |
| **图片跳转** | 点击图片、点击缩略图 | `location.href` | `onclick="location.href='page.html'"` |
| **链接跳转** | 点击链接、点击查看 | `location.href` | `<a href="page.html">` |
| **弹窗跳转** | 弹窗确认后跳转 | `弹窗回调` | `onConfirm="location.href='page.html'"` |
| **返回导航** | 点击返回、返回上一页 | `history.back()` | `onclick="history.back()"` |
| **Tab跳转** | 点击Tab、切换Tab | `页面内切换` | `switchTab(index)` |
| **地址切换** | 点击切换地址 | `弹窗选择` | `openAddressModal()` |

---

## 参数传递映射

### 常见参数类型

| 参数关键词 | 参数类型 | 传递方式 | 示例 |
|------------|----------|----------|------|
| 订单ID、订单号 | `order_id` | URL参数 | `order.html?order_id=123` |
| 商品ID、商品编号 | `product_id` | URL参数 | `product.html?product_id=456` |
| 申请ID、售后ID | `apply_id` | URL参数 | `aftersales.html?apply_id=789` |
| 地址ID | `address_id` | URL参数 | `address.html?address_id=111` |
| 状态筛选 | `status` | URL参数 | `order_list.html?status=pending` |
| Tab索引 | `tab_index` | URL参数 | `page.html?tab=1` |

### 参数获取代码

```javascript
// URL参数获取
function getQueryParam(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

// 使用示例
const orderId = getQueryParam('order_id');
const productId = getQueryParam('product_id');
```

---

## 返回导航映射

### 返回导航类型

| 返回类型 | 代码实现 | 适用场景 |
|----------|----------|----------|
| **返回上一页** | `history.back()` | 所有子页面默认返回 |
| **返回指定页** | `location.href='page.html'` | 特定流程返回 |
| **返回首页** | `location.href='home.html'` | 流程结束返回 |
| **返回列表** | `location.href='list.html'` | 详情页返回列表 |

### 返回按钮实现

```javascript
// 通用返回按钮
function goBack() {
  history.back();
}

// 返回指定页面
function goBackTo(page) {
  location.href = page + '.html';
}
```

---

## 登录拦截映射

### 拦截逻辑

```markdown
| 类型 | 页面 |
|------|------|
| 受保护 | {页面列表} |
| 公开 | {页面列表} |
```

### 拦截实现

```javascript
// 登录拦截检查
function checkLogin() {
  const user = localStorage.getItem('user');
  if (!user) {
    // 未登录，跳转登录页
    location.href = 'login.html?redirect=' + encodeURIComponent(location.href);
    return false;
  }
  return true;
}

// 受保护页面加载时检查
if (isProtectedPage()) {
  checkLogin();
}

// 受保护页面列表
const PROTECTED_PAGES = ['order.html', 'cart.html', 'order_list.html', 'order_detail.html'];
function isProtectedPage() {
  const currentPage = location.pathname.split('/').pop();
  return PROTECTED_PAGES.includes(currentPage);
}
```

---

## 映射流程

### Step 1: 跳转关系提取

```
跳转关系表 → 提取页面A/触发条件/页面B → 构建跳转配置
```

### Step 2: 跳转类型判断

```
触发条件 → 关键词匹配 → 判断跳转类型 → 选择代码模式
```

### Step 3: 参数传递判断

```
页面B → 判断是否需要参数 → 确定参数类型 → 生成URL模板
```

### Step 4: 跳转代码生成

```
跳转类型 + 参数 → 生成 onclick/href 代码 → 绑定到触发组件
```

---

## 映射示例

### 示例跳转1

```markdown
| 1 | 订单详情 | 点击"申请售后" | 申请页 |
```

**映射分析：**
- 页面A：订单详情 → `order_detail.html`
- 触发条件：点击"申请售后"按钮 → Button跳转
- 页面B：申请页 → `aftersales_apply.html`
- 参数：需要订单ID → `?order_id={id}`

**映射输出：**
```json
{
  "from_page": "order_detail.html",
  "trigger": "点击申请售后按钮",
  "trigger_component": {
    "type": "Button",
    "text": "申请售后",
    "onclick": "location.href='aftersales_apply.html?order_id=' + orderId"
  },
  "to_page": "aftersales_apply.html",
  "params": ["order_id"]
}
```

### 示例跳转2

```markdown
| 2 | 申请页 | 提交成功 | 进度页 |
```

**映射分析：**
- 页面A：申请页 → `aftersales_apply.html`
- 触发条件：提交成功 → 弹窗回调跳转
- 页面B：进度页 → `aftersales_progress.html`
- 参数：需要申请ID → `?apply_id={id}`

**映射输出：**
```json
{
  "from_page": "aftersales_apply.html",
  "trigger": "提交成功",
  "trigger_type": "modal_callback",
  "trigger_component": {
    "type": "ConfirmModal",
    "onConfirm": "location.href='aftersales_progress.html?apply_id=' + applyId"
  },
  "to_page": "aftersales_progress.html",
  "params": ["apply_id"]
}
```

### 示例跳转3

```markdown
| 3 | 进度页 | 点击申请卡片 | 详情页 |
```

**映射分析：**
- 页面A：进度页 → `aftersales_progress.html`
- 触发条件：点击申请卡片 → Card跳转
- 页面B：详情页 → `aftersales_detail.html`
- 参数：需要申请ID → `?apply_id={id}`

**映射输出：**
```json
{
  "from_page": "aftersales_progress.html",
  "trigger": "点击申请卡片",
  "trigger_component": {
    "type": "Card",
    "onclick": "location.href='aftersales_detail.html?apply_id=' + applyId"
  },
  "to_page": "aftersales_detail.html",
  "params": ["apply_id"]
}
```

### 示例跳转4

```markdown
| 4 | 审核详情页 | 审核完成 | 审核列表页 |
```

**映射分析：**
- 页面A：审核详情页 → `admin_aftersales_detail.html`
- 触发条件：审核完成 → 操作完成跳转
- 页面B：审核列表页 → `admin_aftersales_list.html`
- 参数：无参数

**映射输出：**
```json
{
  "from_page": "admin_aftersales_detail.html",
  "trigger": "审核完成",
  "trigger_type": "action_complete",
  "trigger_component": {
    "type": "ApproveButton",
    "onComplete": "location.href='admin_aftersales_list.html'"
  },
  "to_page": "admin_aftersales_list.html",
  "params": []
}
```

---

## 状态标记处理

| 状态标记 | 映射处理 |
|----------|----------|
| `[待原型]` | 正常映射，页面文件名可能不存在（使用草案定义的文件名） |
| `[草案]` | 正常映射，标记来源为草案 |

---

## 跳转未映射处理

| 未映射情况 | 处理方式 |
|------------|----------|
| 触发条件无法识别 | 使用基础 `onclick` 逻辑，提示补充 |
| 目标页面未定义 | 提示补充目标页面名称 |
| 参数类型未定义 | 默认不传参数，提示补充 |

---

## 全局导航管理

### 导航配置对象

```javascript
// 导航配置
const NAVIGATION_CONFIG = {
  'order_detail': {
    buttons: [
      { text: '申请售后', href: 'aftersales_apply.html', params: ['order_id'] }
    ]
  },
  'aftersales_apply': {
    onSuccess: { href: 'aftersales_progress.html', params: ['apply_id'] }
  },
  'aftersales_progress': {
    cards: [
      { onclick: 'aftersales_detail.html', params: ['apply_id'] }
    ]
  }
};

// 导航跳转函数
function navigateTo(page, params = {}) {
  let url = page + '.html';
  if (Object.keys(params).length > 0) {
    url += '?' + Object.entries(params).map(([k, v]) => `${k}=${v}`).join('&');
  }
  location.href = url;
}
```