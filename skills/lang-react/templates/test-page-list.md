# 列表页测试模板（CRUD + 表格 + 搜索 + 导出）

> 路径：`src/tests/examples/views/supplierCategoryList.test.tsx`
> 适用：含 CustomProTable + 增删改查 + 搜索 + 导出的列表页面。
> **页面内的弹框组件测试见 `test-page-modal.md`（独立文件，imports 更简单）。**

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { setupServer } from "msw/node";
import SupplierCategoryPage from "@/views/supplier/category/index";

// Mock API 响应
vi.mock("@/api/modules/supplierCategory", () => ({
  getSupplierCategoryListApi: vi.fn(),
  saveSupplierCategoryApi: vi.fn(),
  updateSupplierCategoryApi: vi.fn(),
  deleteSupplierCategoryApi: vi.fn(),
  exportSupplierCategoryApi: vi.fn()
}));

import {
  getSupplierCategoryListApi,
  saveSupplierCategoryApi,
  updateSupplierCategoryApi,
  deleteSupplierCategoryApi,
  exportSupplierCategoryApi
} from "@/api/modules/supplierCategory";

// Mock 图片和静态资源
vi.mock("antd", async () => {
  const actual = await vi.importActual<typeof import("antd")>;
  return {
    ...actual,
    Image: { ...actual.Image, prefetch: vi.fn(), decode: vi.fn() }
  };
});

describe("SupplierCategoryPage - 供应商分类列表页", () => {
  const mockListData = [
    { id: 1, name: "分类A", code: "CAT_A", status: 1, createTime: "2024-01-01 10:00:00" },
    { id: 2, name: "分类B", code: "CAT_B", status: 0, createTime: "2024-01-02 10:00:00" }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // 默认 mock 成功响应
    (getSupplierCategoryListApi as any).mockResolvedValue({
      code: 200,
      data: { records: mockListData, total: 2 }
    });
  });

  /**
   * 渲染页面并显示表格
   */
  it("应该渲染表格并显示分类列表", async () => {
    render(<SupplierCategoryPage />);

    // 等待表格加载
    await waitFor(() => {
      expect(screen.getByText("分类A")).toBeInTheDocument();
      expect(screen.getByText("分类B")).toBeInTheDocument();
    });

    // 验证分页信息
    expect(screen.getByText("共 2 条")).toBeInTheDocument();
  });

  /**
   * 测试搜索功能
   */
  it("输入搜索关键词后应该触发表格重新请求", async () => {
    render(<SupplierCategoryPage />);

    const searchInput = screen.getByPlaceholderText("请输入分类名称");
    await userEvent.type(searchInput, "测试搜索");

    // 等待防抖（如果有的话）
    await waitFor(() => {
      expect(getSupplierCategoryListApi).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "测试搜索"
        })
      );
    }, { timeout: 3000 });
  });

  /**
   * 测试新增弹框
   */
  it("点击新增按钮应该打开新增弹框", async () => {
    render(<SupplierCategoryPage />);

    const addButton = screen.getByText("新增");
    await userEvent.click(addButton);

    // 验证弹框是否显示
    expect(screen.getByText("新增分类")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "取消" })).toBeInTheDocument();
  });

  /**
   * 测试编辑功能
   */
  it("点击编辑按钮应该打开编辑弹框并填充当前数据", async () => {
    render(<SupplierCategoryPage />);

    // 等待数据加载后，点击编辑按钮
    await waitFor(() => {
      const editButtons = screen.getAllByText("编辑");
      if (editButtons.length > 0) {
        await userEvent.click(editButtons[0]);
      }
    });

    // 验证弹框标题
    expect(screen.getByText("编辑分类")).toBeInTheDocument();
  });

  /**
   * 测试批量删除
   */
  it("选中行后点击批量删除应该调用删除接口", async () => {
    (deleteSupplierCategoryApi as any).mockResolvedValue({ code: 200, data: true });

    render(<SupplierCategoryPage />);

    // 等待表格加载
    await waitFor(() => {
      const checkboxes = screen.getAllByRole("checkbox");
      if (checkboxes.length > 0) {
        await userEvent.click(checkboxes[0]);
      }
    });

    const deleteButton = screen.getByText("批量删除");
    await userEvent.click(deleteButton);

    // 验证删除 API 被调用
    await waitFor(() => {
      expect(deleteSupplierCategoryApi).toHaveBeenCalled();
    });
  });

  /**
   * 测试导出功能
   */
  it("点击导出按钮应该调用导出接口", async () => {
    const mockBlob = new Blob(["test"], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    (exportSupplierCategoryApi as any).mockResolvedValue(mockBlob);

    // Mock URL.createObjectURL 和 link.click
    const mockUrl = "blob:test-url";
    global.URL.createObjectURL = vi.fn(() => mockUrl);
    const linkClickSpy = vi.fn();
    global.HTMLAnchorElement.prototype.click = linkClickSpy;

    render(<SupplierCategoryPage />);

    const exportButton = screen.getByText("导出");
    await userEvent.click(exportButton);

    await waitFor(() => {
      expect(exportSupplierCategoryApi).toHaveBeenCalled();
      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });
  });

  /**
   * 测试空数据状态
   */
  it("当 API 返回空列表时应该显示空状态", async () => {
    (getSupplierCategoryListApi as any).mockResolvedValue({
      code: 200,
      data: { records: [], total: 0 }
    });

    render(<SupplierCategoryPage />);

    await waitFor(() => {
      expect(screen.getByText("暂无数据")).toBeInTheDocument();
    });
  });

  /**
   * 测试 API 错误处理
   */
  it("当 API 请求失败时应该显示错误提示", async () => {
    (getSupplierCategoryListApi as any).mockRejectedValue(new Error("网络错误"));

    // Mock message.error
    const mockError = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<SupplierCategoryPage />);

    await waitFor(() => {
      expect(mockError).toHaveBeenCalled();
    });

    mockError.mockRestore();
  });
});
```

## 列表页测试速查

| 场景 | 验证方式 |
|------|---------|
| 渲染成功 | `waitFor` + `getByText` / `getByRole` |
| 用户输入 | `userEvent.type` / `userEvent.click` |
| API 调用 | `vi.fn()` + `expect(...).toHaveBeenCalled()` |
| 空状态 | Mock 空数据 + `getByText("暂无数据")` |
| 错误处理 | `mockRejectedValue` + 验证错误提示 |
| 防抖等待 | `waitFor(..., { timeout: 3000 })` |
| 文件下载 | Mock `URL.createObjectURL` + `link.click` |

**注意事项：**
- 使用 `userEvent` 代替 `fireEvent`，更接近真实用户交互
- 异步操作使用 `waitFor` 等待 DOM 更新
- Mock API 函数时使用 `vi.fn().mockResolvedValue` 和 `mockRejectedValue`
- 测试前使用 `vi.clearAllMocks()` 清除 mock 状态
- 图片/静态资源需要 mock，避免加载失败
