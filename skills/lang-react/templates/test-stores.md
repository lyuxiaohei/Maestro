# Store 测试模板

> 路径：`src/tests/examples/stores/globalStore.test.ts`
> 直接调用 store 的 `getState()` 方法，测试 action 行为和状态变化。
> 注意：使用 persist 中间件时，每个测试前必须 reset + localStorage.clear()。

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { useGlobalStore } from "@/stores/globalStore";

describe("useGlobalStore - 全局状态管理", () => {

  beforeEach(() => {
    useGlobalStore.getState().reset();
    localStorage.clear();
  });

  describe("初始状态", () => {
    it("token 初始为空字符串", () => {
      expect(useGlobalStore.getState().token).toBe("");
    });
    it("menuPermissions 初始为空数组", () => {
      expect(useGlobalStore.getState().menuPermissions).toEqual([]);
    });
    it("permissionsLoaded 初始为 false", () => {
      expect(useGlobalStore.getState().permissionsLoaded).toBe(false);
    });
  });

  describe("setToken", () => {
    it("设置 token 后能正确获取", () => {
      useGlobalStore.getState().setToken("test-token-abc");
      expect(useGlobalStore.getState().token).toBe("test-token-abc");
    });
    it("重复设置 token 会覆盖旧值", () => {
      useGlobalStore.getState().setToken("token-1");
      useGlobalStore.getState().setToken("token-2");
      expect(useGlobalStore.getState().token).toBe("token-2");
    });
  });

  describe("setMenuPermissions", () => {
    it("设置权限列表同时标记已加载", () => {
      useGlobalStore.getState().setMenuPermissions(["system:menu:create"]);
      const state = useGlobalStore.getState();
      expect(state.menuPermissions).toEqual(["system:menu:create"]);
      expect(state.permissionsLoaded).toBe(true);
    });
  });

  describe("reset", () => {
    it("重置所有状态回初始值", () => {
      useGlobalStore.getState().setToken("some-token");
      useGlobalStore.getState().setMenuPermissions(["perm1"]);
      useGlobalStore.getState().reset();
      const state = useGlobalStore.getState();
      expect(state.token).toBe("");
      expect(state.menuPermissions).toEqual([]);
      expect(state.permissionsLoaded).toBe(false);
    });
  });
});
```
