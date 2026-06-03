# 弹框组件测试模板（表单校验 + 模式切换）

> 路径：`src/tests/examples/views/categoryModal.test.tsx`
> 适用：含 add / edit / detail 三种模式的表单弹框组件。
> **列表页 + CRUD 测试见 `test-page-list.md`（imports 含 API mock，结构更完整）。**

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CategoryModal from "@/views/supplier/category/components/CategoryModal";

describe("CategoryModal - 分类弹框组件", () => {
  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 新增模式：初始状态下确认按钮应该禁用
   */
  it("新增模式下分类名称为空时确认按钮禁用", () => {
    render(
      <CategoryModal
        open={true}
        mode="add"
        onCancel={mockOnCancel}
        onConfirm={mockOnConfirm}
      />
    );

    const confirmButton = screen.getByRole("button", { name: /确认|提交/ });
    expect(confirmButton).toBeDisabled();
  });

  /**
   * 新增模式：输入分类名称后确认按钮可用
   */
  it("新增模式下输入分类名称后确认按钮可用", async () => {
    render(
      <CategoryModal
        open={true}
        mode="add"
        onCancel={mockOnCancel}
        onConfirm={mockOnConfirm}
      />
    );

    const input = screen.getByPlaceholderText("输入分类名称");
    await userEvent.type(input, "测试分类");

    await waitFor(() => {
      const confirmButton = screen.getByRole("button", { name: /确认|提交/ });
      expect(confirmButton).not.toBeDisabled();
    });
  });

  /**
   * 编辑模式：初始化时显示当前分类名称
   */
  it("编辑模式下打开弹框时应该显示当前分类名称", () => {
    render(
      <CategoryModal
        open={true}
        mode="edit"
        initialCategoryName="已有分类"
        initialStatus={1}
        onCancel={mockOnCancel}
        onConfirm={mockOnConfirm}
      />
    );

    expect(screen.getByDisplayValue("已有分类")).toBeInTheDocument();
  });

  /**
   * 编辑模式：分类名称未变化时确认按钮禁用
   */
  it("编辑模式下分类名称未变化时确认按钮禁用", () => {
    render(
      <CategoryModal
        open={true}
        mode="edit"
        initialCategoryName="已有分类"
        onCancel={mockOnCancel}
        onConfirm={mockOnConfirm}
      />
    );

    const confirmButton = screen.getByRole("button", { name: /确认|提交/ });
    expect(confirmButton).toBeDisabled();
  });

  /**
   * 确认操作：应该调用 onConfirm 回调并传入分类名称
   */
  it("点击确认按钮应该调用 onConfirm 并传入分类名称", async () => {
    render(
      <CategoryModal
        open={true}
        mode="add"
        onCancel={mockOnCancel}
        onConfirm={mockOnConfirm}
      />
    );

    const input = screen.getByPlaceholderText("输入分类名称");
    await userEvent.type(input, "新分类名称");

    const confirmButton = screen.getByRole("button", { name: /确认|提交/ });
    await userEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledWith("新分类名称");
    });
  });

  /**
   * 查看模式：所有输入字段禁用，无确认按钮
   */
  it("查看模式下所有字段禁用且无确认按钮", () => {
    render(
      <CategoryModal
        open={true}
        mode="detail"
        initialCategoryName="查看分类"
        initialStatus={1}
        onCancel={mockOnCancel}
        onConfirm={mockOnConfirm}
      />
    );

    expect(screen.getByDisplayValue("查看分类")).toBeInTheDocument();
    expect(screen.getByText("启用")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /确认|提交/ })).not.toBeInTheDocument();
  });
});
```

## 弹框测试速查

| 场景 | 验证方式 |
|------|---------|
| 弹框显示 | `getByText` 弹框标题 + `getByRole` 按钮 |
| 按钮状态 | `toBeDisabled()` / `not.toBeDisabled()` |
| 表单填值 | `userEvent.type` / `getByDisplayValue` |
| 模式区分 | `mode="add" / "edit" / "detail"` 三态 |
| 回调验证 | `mockOnConfirm` + `toHaveBeenCalledWith` |
| 字段禁用 | `queryByRole(...).not.toBeInTheDocument()` |

**注意事项：**
- 弹框测试不需要 API mock，只测交互和回调
- 表单校验通过"按钮禁用 ↔ 启用"状态切换验证
- detail 模式必须验证"无确认按钮"，不要错断
