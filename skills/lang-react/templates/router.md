# 路由配置模板

> 路径：`src/router/index.tsx`（主路由文件）
> 使用 React Router v6 + lazy loading 按需加载页面组件。

## 主路由配置

```typescript
import { createBrowserRouter } from "react-router-dom";
import { lazy, Suspense } from "react";

// 通用的 Suspense loading 组件
const PageLoading = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="w-8 h-8 border-4 border-t-blue-500 border-r-transparent rounded-full animate-spin" />
  </div>
);

// 懒加载页面组件
const LoginPage = lazy(() => import("@/views/auth/login"));
const DashboardPage = lazy(() => import("@/views/dashboard"));
const SupplierListPage = lazy(() => import("@/views/supplier/list"));
const EmployeeListPage = lazy(() => import("@/views/employee/list"));

/**
 * 创建应用路由
 */
const router = createBrowserRouter([
  {
    path: "/login",
    element: (
      <Suspense fallback={<PageLoading />}>
        <LoginPage />
      </Suspense>
    )
  },
  {
    path: "/",
    element: <DashboardPage />,
    children: [
      { index: true, element: <div>仪表盘首页</div> }
    ]
  },
  {
    path: "/supplier",
    element: <div>供应商管理布局</div>,
    children: [
      {
        path: "list",
        element: (
          <Suspense fallback={<PageLoading />}>
            <SupplierListPage />
          </Suspense>
        )
      }
    ]
  },
  {
    path: "/employee",
    element: <div>员工管理布局</div>,
    children: [
      {
        path: "list",
        element: (
          <Suspense fallback={<PageLoading />}>
            <EmployeeListPage />
          </Suspense>
        )
      }
    ]
  },
  {
    path: "*",
    element: <div>404 - 页面不存在</div>
  }
]);

export default router;
```

## App.tsx 集成

```tsx
import { RouterProvider } from "react-router-dom";
import router from "@/router";

function App() {
  return (
    <RouterProvider router={router}>
      {/* 全局布局组件可在此包裹 */}
      <div className="min-h-screen bg-gray-50">
        <Routes />
      </div>
    </RouterProvider>
  );
}

export default App;
```

## 路由守卫（权限控制）

> 路径：`src/router/guards/index.tsx`

```typescript
import { Navigate } from "react-router-dom";
import { useGlobalStore } from "@/stores/globalStore";

/**
 * 路由守卫组件
 * 检查用户是否已登录，未登录则跳转到登录页
 */
const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const token = useGlobalStore((state) => state.token);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default AuthGuard;
```

## 使用示例：带权限的路由

```tsx
import { createBrowserRouter } from "react-router-dom";
import { lazy, Suspense } from "react";
import AuthGuard from "@/router/guards";

const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />
  },
  {
    path: "/",
    element: (
      <AuthGuard>
        <div>主布局</div>
      </AuthGuard>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "supplier/list", element: <SupplierListPage /> }
    ]
  }
]);
```

## 动态路由（菜单路由）

> 路径：`src/router/dynamic-routes.ts`
> 从后端获取菜单配置，动态生成路由

```typescript
import { RouteObject } from "react-router-dom";
import { lazy } from "react";

/**
 * 将后端菜单路由转换为 React Router 配置
 *
 * @param {MenuRoute[]} menuRoutes - 后端返回的菜单配置
 * @returns {RouteObject[]} React Router 配置数组
 */
export function convertMenuToRoutes(menuRoutes: MenuRoute[]): RouteObject[] {
  const routes: RouteObject[] = [];

  menuRoutes.forEach((menu) => {
    if (menu.type === "menu") {
      // 菜单项
      const Component = lazy(() => import(`@/views${menu.path}`));
      routes.push({
        path: menu.path,
        element: (
          <Suspense fallback={<PageLoading />}>
            <Component />
          </Suspense>
        )
      });
    } else if (menu.type === "directory") {
      // 目录（父路由）
      const DirectoryComponent = lazy(() => import(`@/views${menu.path}/index`));
      routes.push({
        path: menu.path,
        element: (
          <Suspense fallback={<PageLoading />}>
            <DirectoryComponent />
          </Suspense>
        ),
        children: menu.children ? convertMenuToRoutes(menu.children) : undefined
      });
    }
  });

  return routes;
}

interface MenuRoute {
  type: "menu" | "directory";
  path: string;
  name: string;
  icon?: string;
  component?: string;
  children?: MenuRoute[];
  redirect?: string;
  hidden?: boolean;
}
```
