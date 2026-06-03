# API 模块测试模板

> 路径：`src/tests/examples/api/someModule.test.ts`
> 使用 `vi.mock` 模拟 HTTP 客户端，验证请求路径和参数，不发起真实网络请求。

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// 1. 先 mock HTTP 模块
vi.mock("@/api/index", () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    service: { post: vi.fn() }
  }
}));

// 2. mock 后再 import 被测模块
import http from "@/api/index";
import { getSupplierListApi, exportSupplierApi } from "@/api/modules/supplier";

describe("supplier API 模块", () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getSupplierListApi", () => {
    it("调用正确的 URL 和参数", async () => {
      const mockResponse = { code: 200, data: { records: [], total: 0 } };
      vi.mocked(http.post).mockResolvedValue(mockResponse as any);

      const params = { pageNo: 1, pageSize: 10, companyName: "测试" };
      await getSupplierListApi(params);

      expect(http.post).toHaveBeenCalledWith("/boss/company/queryCompanyPage", params);
    });

    it("返回服务端响应数据", async () => {
      const mockResponse = {
        code: 200,
        data: { records: [{ id: "1", companyName: "供应商A" }], total: 1 }
      };
      vi.mocked(http.post).mockResolvedValue(mockResponse as any);

      const result = await getSupplierListApi({ pageNo: 1, pageSize: 10 });
      expect(result).toEqual(mockResponse);
    });
  });

  describe("exportSupplierApi - 文件流导出接口", () => {
    it("使用 responseType: blob 配置", async () => {
      const mockBlob = new Blob(["test"], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      vi.mocked(http.post).mockResolvedValue({
        data: mockBlob, status: 200, headers: {}
      } as any);

      await exportSupplierApi({ ids: ["1", "2"] });
      expect(http.post).toHaveBeenCalledWith("/boss/company/excel/export", { ids: ["1", "2"] }, { responseType: "blob" });
    });
  });
});
```
