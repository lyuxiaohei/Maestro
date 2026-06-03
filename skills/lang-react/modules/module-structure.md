# 模块目录结构配置

> 本文件定义项目目录结构，用户可根据实际项目调整布局。

```
src/
├── api/                    # API 层
│   ├── config/             # axios 配置（baseURL、端口）
│   ├── enums/              # HTTP 枚举（状态码等）
│   ├── helper/             # 工具（请求取消、状态检查）
│   ├── interface/          # 类型定义（DTO/VO/命名空间）
│   │   └── index.ts        # 统一导出入口
│   ├── modules/            # 各业务模块 API 函数
│   └── index.ts            # Axios 实例封装（拦截器）
├── views/                  # 页面组件（按业务模块划分）
│   └── {module}/
│       ├── index.tsx       # 页面主入口（< 500行）
│       ├── components/     # 页面级子组件
│       └── hooks/          # 页面级自定义 Hook
├── components/             # 全局公共业务组件
├── stores/                 # Zustand 状态仓库
├── routers/                # 路由配置
├── hooks/                  # 全局自定义 React Hooks
├── layouts/                # 页面布局组件
├── utils/                  # 工具函数
│   ├── await-to-js.ts      # to() 异步工具
│   └── index.ts            # 统一导出
├── styles/                 # 全局样式
├── config/                 # 配置文件（主题、NProgress 等）
├── mock/                   # Mock 数据
└── typings/                # 全局 TypeScript 类型
```
