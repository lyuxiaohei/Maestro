# Hook 测试模板

> 路径：`src/tests/examples/hooks/useTableSelection.test.ts`
> 使用 `@testing-library/react` 的 `renderHook` + `act` 测试 Hook 状态变化。

```typescript
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTableSelection } from "@/hooks/use-table-selection";

describe("useTableSelection - 跨页选择 Hook", () => {
  type RowType = { id: number; name: string };
  const createRow = (id: number, name: string): RowType => ({ id, name });

  describe("初始状态", () => {
    it("初始选中列表为空", () => {
      const { result } = renderHook(() =>
        useTableSelection<RowType>({ currentPageData: [] })
      );
      expect(result.current.selectedRowKeys).toEqual([]);
      expect(result.current.selectedRowsMap.size).toBe(0);
    });
  });

  describe("handleSelectionChange", () => {
    it("选中当前页的行", () => {
      const pageData = [createRow(1, "A"), createRow(2, "B"), createRow(3, "C")];
      const { result } = renderHook(() =>
        useTableSelection<RowType>({ currentPageData: pageData })
      );
      act(() => {
        result.current.handleSelectionChange([1, 2], [createRow(1, "A"), createRow(2, "B")]);
      });
      expect(result.current.selectedRowKeys).toEqual([1, 2]);
      expect(result.current.selectedRowsMap.get(1)).toEqual(createRow(1, "A"));
    });
  });

  describe("跨页选择", () => {
    it("切换页面后保留之前页的选中状态", () => {
      const page1Data = [createRow(1, "A"), createRow(2, "B")];
      const { result, rerender } = renderHook(
        ({ pageData }) => useTableSelection<RowType>({ currentPageData: pageData }),
        { initialProps: { pageData: page1Data } }
      );
      act(() => { result.current.handleSelectionChange([1], [createRow(1, "A")]); });
      rerender({ pageData: [createRow(3, "C"), createRow(4, "D")] });
      act(() => { result.current.handleSelectionChange([3], [createRow(3, "C")]); });
      expect(result.current.selectedRowKeys).toEqual([1, 3]);
      expect(result.current.selectedRowsMap.size).toBe(2);
    });
  });

  describe("clearSelection", () => {
    it("清空所有选中状态", () => {
      const pageData = [createRow(1, "A"), createRow(2, "B")];
      const { result } = renderHook(() =>
        useTableSelection<RowType>({ currentPageData: pageData })
      );
      act(() => { result.current.handleSelectionChange([1, 2], pageData); });
      act(() => { result.current.clearSelection(); });
      expect(result.current.selectedRowKeys).toEqual([]);
      expect(result.current.selectedRowsMap.size).toBe(0);
    });
  });
});
```
