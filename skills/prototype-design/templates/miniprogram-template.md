# 小程序页面模板

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>商品详情 - 苏银豆商城</title>
  <link rel="stylesheet" href="../css/common.css">
  <style>
    /* 页面特定样式 */
  </style>
</head>
<body>
<div class="phone-frame">

  <!-- 状态栏 + 导航栏 -->
  <div class="sub-nav">
    <div class="status-bar dark">
      <span class="time">09:41</span>
      <div class="icons">...</div>
    </div>
    <div class="nav-bar">
      <div class="back-btn" onclick="history.back()">
        <svg>...</svg>
      </div>
      <span class="nav-title">商品详情</span>
      <div class="capsule-btn">...</div>
    </div>
  </div>

  <!-- 可滚动内容区 -->
  <div class="page-scroll">
    <!-- 页面内容 -->
  </div>

  <!-- 底部Tab栏（可选） -->
  <div class="tab-bar">...</div>

</div>
<script src="../js/common.js"></script>
<script>
  // 页面逻辑
</script>
</body>
</html>
```

> Tab栏/导航栏SVG图标代码见 [reference/svg-icons.md](../reference/svg-icons.md)
