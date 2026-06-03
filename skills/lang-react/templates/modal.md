# 弹框子组件模板

> 路径：`src/views/{module}/components/XxxModal.tsx`
> 弹框组件渲染成本高，使用 `React.memo`，必须设置 `displayName`。

```tsx
import React, { useEffect, useMemo, useState } from "react";
import { Form, Input, Modal } from "antd";
import { to } from "@/utils";

interface CategoryModalProps {
  open: boolean;
  mode: "add" | "edit" | "detail";
  onCancel: () => void;
  onConfirm: (categoryName: string) => Promise<void>;
  initialCategoryName?: string;
  initialStatus?: number;
}

/**
 * 供应商分类弹框组件
 * 支持新增、编辑、查看三种模式
 *
 * @component
 */
const CategoryModal: React.FC<CategoryModalProps> = React.memo(
  ({ open, mode, onCancel, onConfirm, initialCategoryName, initialStatus }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const currentCategoryName = Form.useWatch("categoryName", form);

    /**
     * 判断确认按钮是否禁用
     */
    const isConfirmDisabled = useMemo(() => {
      if (mode === "detail") return false;
      if (mode === "add") return !currentCategoryName?.trim();
      return currentCategoryName?.trim() === (initialCategoryName?.trim() || "") || !currentCategoryName?.trim();
    }, [mode, currentCategoryName, initialCategoryName]);

    /**
     * 弹框打开时同步表单初始值
     */
    useEffect(() => {
      if (open) {
        setLoading(false);
        if ((mode === "edit" || mode === "detail") && initialCategoryName) {
          form.setFieldsValue({ categoryName: initialCategoryName });
        } else {
          form.resetFields();
        }
      }
    }, [open, mode, initialCategoryName, form]);

    /**
     * 处理确认操作
     */
    const handleConfirm = async (): Promise<void> => {
      let values;
      try { values = await form.validateFields(); } catch { return; }
      setLoading(true);
      const wrappedPromise = onConfirm(values.categoryName.trim())
        .then(() => ({ code: 200, msg: "成功", data: null }))
        .catch(() => ({ code: 500, msg: "操作失败", data: null }));
      const [error] = await to(wrappedPromise);
      if (error) { setLoading(false); return; }
      setLoading(false);
    };

    /**
     * 处理取消操作
     */
    const handleCancel = (): void => {
      if (!loading) { form.resetFields(); onCancel(); }
    };

    const getModalTitle = (): string => {
      const titleMap = { add: "新增分类", edit: "编辑分类", detail: "查看分类" };
      return titleMap[mode] || "";
    };

    return (
      <Modal
        title={getModalTitle()}
        open={open}
        onCancel={handleCancel}
        onOk={mode === "detail" ? handleCancel : handleConfirm}
        okText="确认"
        cancelText="取消"
        confirmLoading={loading}
        okButtonProps={{ disabled: isConfirmDisabled }}
        footer={mode === "detail" ? null : undefined}
        destroyOnHidden
        width={500}
        styles={{ body: { padding: "24px", minHeight: "120px" } }}
      >
        <Form form={form} layout="horizontal" labelCol={{ span: 6 }} wrapperCol={{ span: 18 }}>
          <Form.Item
            name="categoryName"
            label="分类名称"
            rules={mode !== "detail" ? [{ required: true, message: "请输入分类名称" }, { max: 50, message: "最多50个字符" }] : []}
          >
            {mode === "detail" ? <span>{initialCategoryName}</span> : <Input placeholder="输入分类名称" maxLength={50} />}
          </Form.Item>
          {mode === "detail" && (
            <Form.Item label="分类状态">
              <span>{initialStatus === 1 ? "启用" : "禁用"}</span>
            </Form.Item>
          )}
        </Form>
      </Modal>
    );
  }
);

CategoryModal.displayName = "CategoryModal";
export default CategoryModal;
```
