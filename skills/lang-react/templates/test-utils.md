# 工具函数测试模板

> 路径：`src/tests/examples/utils/await-to-js.test.ts`
> 直接 `import` 被测函数，验证输入输出。无需 mock，无需渲染。

```typescript
import { describe, it, expect } from "vitest";
import { to } from "@/utils/await-to-js";

describe("to - 异步错误处理工具", () => {

  describe("成功场景", () => {
    it("当 code 等于默认成功码 200 时，返回 [null, data]", async () => {
      const promise = Promise.resolve({ code: 200, data: { name: "测试" } });
      const [err, data] = await to(promise);
      expect(err).toBeNull();
      expect(data).toEqual({ code: 200, data: { name: "测试" } });
    });

    it("当 code 等于自定义成功码时，返回 [null, data]", async () => {
      const promise = Promise.resolve({ code: 0, data: { id: 1 } });
      const [err, data] = await to(promise, 0);
      expect(err).toBeNull();
      expect(data).toEqual({ code: 0, data: { id: 1 } });
    });
  });

  describe("业务失败场景", () => {
    it("当 code 不等于成功码且有 msg 时，返回 [msg, null]", async () => {
      const promise = Promise.resolve({ code: 500, msg: "服务器错误" });
      const [err, data] = await to(promise);
      expect(err).toBe("服务器错误");
      expect(data).toBeNull();
    });
  });

  describe("异常捕获场景", () => {
    it("当 Promise reject Error 实例时，返回 [error.message, null]", async () => {
      const promise = Promise.reject(new Error("网络超时"));
      const [err, data] = await to(promise);
      expect(err).toBe("网络超时");
      expect(data).toBeNull();
    });
  });
});
```
