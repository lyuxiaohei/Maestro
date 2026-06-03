# to() 异步错误处理工具模板

> 路径：`src/utils/await-to-js.ts`
> 项目统一使用 `to()` 替代 `try-catch`，拒绝使用 `try-catch` 处理 API 调用。

```typescript
/**
 * 将 Promise 转换为 [error, result] 元组，统一错误处理
 *
 * @template T - 响应数据类型
 * @param {Promise<{ code: number; msg?: string; data?: any }>} promise
 * @returns {Promise<[string | null, T | null]>}
 */
export function to<T = Record<string, any>>(
  promise: Promise<{ code: number; msg?: string; data?: any }>,
  successCode: number = 200
): Promise<[string | null, T | null]> {
  return promise
    .then((response): [string | null, T | null] => {
      if (response.code === successCode) {
        return [null, response as unknown as T];
      }
      return [response.msg || `操作失败，状态码: ${response.code}`, null];
    })
    .catch((error): [string | null, T | null] => {
      const msg = error instanceof Error
        ? error.message
        : `请求异常: ${String(error?.msg || error)}`;
      return [msg, null];
    });
}

export default to;
```

## 使用示例

```typescript
import { to } from "@/utils";

// 标准用法
const [error, result] = await to(getSomeListApi(params));
if (error) {
  setLoading(false);
  return; // 错误已由拦截器统一 message.error，此处直接返回
}
const records = result?.data?.records || [];
```
