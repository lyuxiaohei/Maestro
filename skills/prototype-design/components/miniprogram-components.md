# 小程序组件规范

适用于：商品详情、购物车、下单支付、订单列表、售后申请等移动端用户界面。

### 系统名称

- **小程序名称**: 苏银豆商城
- **所属银行**: 江苏银行

### 色彩规范

| 用途 | 色值 | CSS变量 | 使用场景 |
|------|------|--------|----------|
| 主色渐变起点 | `#ff6034` | `--primary-start` | 按钮、Tab选中态、价格标签 |
| 主色渐变终点 | `#ee0a24` | `--primary-end` | 渐变终点、角标背景 |
| 价格红 | `#ee0a24` | `--price-color` | 商品价格数字 |
| 背景灰 | `#f5f5f5` | `--bg-color` | 页面背景 |
| 卡片白 | `#fff` | `--card-bg` | 卡片、弹窗背景 |
| 状态栏文字 | 白色/黑色 | `--status-text` | 根据背景自动切换 |

### 布局规范

```
┌─────────────────────────────────────┐
│         状态栏 (44px 预留)           │  ← padding-top预留
├─────────────────────────────────────┤
│         导航栏 (44px)                │  ← 标题 + 返回按钮 + 胶囊
├─────────────────────────────────────┤
│                                     │
│         内容区 (可滚动)              │  ← padding-bottom: 60px
│                                     │
├─────────────────────────────────────┤
│         Tab栏 (56px)                │  ← 底部固定，5个入口
└─────────────────────────────────────┘
```

| 参数 | 值 |
|------|-----|
| 手机框架宽度 | 375px |
| 状态栏高度 | 44px（padding-top预留） |
| 导航栏高度 | 44px |
| Tab栏高度 | 56px（底部固定） |
| 卡片圆角 | 12px |
| 按钮圆角 | 22px（全圆角） |
| 内容区底部padding | 60px（为Tab栏预留） |

#### 手机框架容器

```css
.phone-frame {
  width: 375px;
  min-height: 100vh;
  background: #f5f5f5;
  position: relative;
}
.page-scroll {
  min-height: 100vh;
  overflow-y: auto;
  padding-bottom: 60px;
}
```

#### 状态栏 + 导航栏

```css
.status-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 44px;
  padding: 14px 20px 0;
  color: #fff;
  z-index: 2;
}
.status-bar.dark { color: #333; }

.sub-nav {
  position: sticky;
  top: 0;
  z-index: 100;
  padding-top: 44px;
  background: #fff;
}
.nav-bar {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-title {
  font-size: 17px;
  font-weight: 600;
  color: #333;
}
.back-btn {
  position: absolute;
  left: 12px;
  width: 32px;
  height: 32px;
}
```

#### 底部Tab栏

```css
.tab-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  height: 56px;
  border-top: 1px solid #eee;
  z-index: 200;
  padding-bottom: 8px;
}
.tab-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.tab-item span { font-size: 10px; color: #999; }
.tab-item.active svg { color: #ff6034; }
.tab-item.active span { color: #ff6034; font-weight: 600; }
.cart-badge .badge {
  position: absolute;
  top: -4px;
  right: -7px;
  background: #ee0a24;
  color: #fff;
  font-size: 9px;
  min-width: 14px;
  height: 14px;
  border-radius: 7px;
}
```

```html
<div class="tab-bar">
  <a href="home_page.html" class="tab-item">
    <svg>...</svg>
    <span>首页</span>
  </a>
  <div class="tab-item active">
    <svg>...</svg>
    <span>购物车</span>
  </div>
</div>
```

#### 商品网格卡片

```css
.product-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.product-card {
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
}
.product-card .product-img {
  width: 100%;
  aspect-ratio: 1;
  background: #f8f8f8;
}
.product-card .product-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.product-card .price-now {
  color: #ee0a24;
  font-size: 15px;
  font-weight: 700;
}
```

**重要：** 2列布局，aspect-ratio:1 正方形缩略图。

#### 主按钮（全圆角渐变）

```css
.btn-primary {
  background: linear-gradient(135deg, #ff6034, #ee0a24);
  color: #fff;
  border: none;
  border-radius: 22px;
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 600;
}
.btn-primary:active { opacity: 0.85; }
```

```html
<button class="btn-primary">立即购买</button>
```

#### 规格选择弹窗（底部滑入）

```css
.spec-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 300;
}
.spec-popup {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-radius: 16px 16px 0 0;
  transform: translateY(100%);
  transition: transform 0.3s ease;
}
.spec-popup.show { transform: translateY(0); }
.spec-option {
  padding: 6px 14px;
  border-radius: 18px;
  border: 1px solid #ddd;
}
.spec-option.selected {
  border-color: #ff6034;
  color: #ff6034;
  background: #fff5f0;
}
```

#### 收银台弹窗（居中卡片）

```css
.pay-popup-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}
.pay-popup {
  width: calc(100% - 48px);
  max-width: 320px;
  background: #fff;
  border-radius: 16px;
}
.pay-popup-btn {
  width: 100%;
  height: 44px;
  background: #07c160;
  color: #fff;
  border-radius: 8px;
}
```

#### 左滑删除（触屏手势）

```css
.cart-item-wrapper {
  position: relative;
  overflow: hidden;
}
.cart-item-wrapper .delete-btn {
  position: absolute;
  right: 0;
  width: 72px;
  background: #ee0a24;
  color: #fff;
  z-index: 0;
}
.cart-item {
  position: relative;
  z-index: 1;
  transition: transform 0.2s ease;
}
```

#### 地址选择弹窗

```css
.addr-popup {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-radius: 16px 16px 0 0;
  max-height: 60vh;
  overflow-y: auto;
}
.addr-list-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
}
.addr-radio {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid #ddd;
}
.addr-radio.checked {
  background: #ff6034;
  border-color: #ff6034;
}
```

### 小程序开发检查清单

- [ ] 使用 `.phone-frame` 375px 容器
- [ ] 状态栏预留 44px（padding-top）
- [ ] 导航栏高度 44px，标题字号 17px
- [ ] 底部Tab栏高度 56px（如有）
- [ ] 主色使用渐变 `#ff6034 → #ee0a24`
- [ ] 价格使用红色 `#ee0a24`
- [ ] 按钮圆角 22px（全圆角）
- [ ] 卡片圆角 12px
- [ ] 商品网格 2列布局
- [ ] 图片设置 `object-fit: cover` + `aspect-ratio: 1`
- [ ] 引用 `../css/common.css` 公共样式
- [ ] 底部弹窗使用 `border-radius: 16px 16px 0 0`
- [ ] Tab栏/按钮/菜单仅使用纯文字（禁止Emoji）
