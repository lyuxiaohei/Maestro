# Zustand Store 模板

> 路径：`src/stores/{domain}Store.ts`
> 每个 store 分为 State 接口 + Actions 接口 + `create()`，持久化用 `persist`。

```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";

// ── 类型定义 ──────────────────────────────────────────
export interface ExampleState {
  token: string;
  userInfo: {
    userName: string;
    phone: string;
    pic: string;
  };
  permissionsLoaded: boolean;
}

export interface ExampleActions {
  setToken: (token: string) => void;
  setUserInfo: (userInfo: ExampleState["userInfo"]) => void;
  setPermissionsLoaded: (loaded: boolean) => void;
  reset: () => void;
}

// ── 初始状态 ──────────────────────────────────────────
const initialState: ExampleState = {
  token: "",
  userInfo: { userName: "", phone: "", pic: "" },
  permissionsLoaded: false
};

// ── Store 创建 ────────────────────────────────────────
export const useExampleStore = create<ExampleState & ExampleActions>()(
  persist(
    (set) => ({
      ...initialState,

      setToken: (token: string) => set({ token }),
      setUserInfo: (userInfo) => set({ userInfo }),
      setPermissionsLoaded: (loaded: boolean) => set({ permissionsLoaded: loaded }),
      reset: () => set(initialState)
    }),
    {
      name: "example_store",
      // 只持久化必要字段，避免 React 元素序列化报错
      partialize: (state) => ({
        token: state.token,
        userInfo: state.userInfo
      })
    }
  )
);
```

## 使用方式

```tsx
// 在组件中使用
const { token, setToken, reset } = useExampleStore();

// 在非 React 上下文（如拦截器）中使用
const token = useExampleStore.getState().token;
```
