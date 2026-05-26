# 后台页面模板

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>商城运营后台</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    :root { --primary-color: #1890ff; --bg-color: #f5f5f5; --card-bg: #fff; }
    .app { display: flex; flex-direction: column; height: 100vh; }
    .header { height: 64px; padding: 0 24px; background: #fff; }
    .header-title { font-size: 18px; font-weight: 600; color: #1890ff; }
    .main { display: flex; flex: 1; }
    .sider { width: 200px; background: #fff; }
    .menu-item { padding: 16px 20px; cursor: pointer; }
    .menu-item.active { background: #e6f7ff; color: #1890ff; }
    .content { flex: 1; padding: 20px; overflow: auto; }
  </style>
</head>
<body>
  <div class="app">
    <header class="header">
      <div class="header-title">商城运营后台</div>
    </header>
    <div class="main">
      <aside class="sider">
        <div class="menu-item active">素材库</div>
      </aside>
      <main class="content">内容区域</main>
    </div>
  </div>
</body>
</html>
```
