# 页面列表组件模板

> 路径：`src/views/{module}/index.tsx`
> 使用 `CustomProTable`（二次封装的 ProTable），支持跨页选择、导入导出。

```tsx
import React, { useRef, useState } from "react";
import type { ActionType, ProColumns, ProFormInstance } from "@ant-design/pro-components";
import { Button, message, Space } from "antd";
import type { AxiosResponse } from "axios";

import { ResPage, ResultData, SupplierCategory } from "@/api/interface";
import {
  deleteSupplierCategoryApi,
  exportSupplierCategoryApi,
  getSupplierCategoryListApi,
  saveSupplierCategoryApi,
  updateSupplierCategoryApi
} from "@/api/modules/supplier";
import CustomProTable from "@/components/CustomProTable";
import { downloadBlobFile, to } from "@/utils";

import CategoryModal from "./components/CategoryModal";

/**
 * 供应商分类列表页面
 * 支持增删改查、批量导出、批量删除
 *
 * @component
 */
const SupplierCategoryPage = React.memo(() => {
  const actionRef = useRef<ActionType>();
  const formRef = useRef<ProFormInstance>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit" | "detail">("add");
  const [currentRecord, setCurrentRecord] = useState<SupplierCategory.ResSupplierCategoryL | null>(null);

  /**
   * 打开新增弹框
   */
  const handleAdd = (): void => {
    setCurrentRecord(null);
    setModalMode("add");
    setModalOpen(true);
  };

  /**
   * 打开编辑弹框
   */
  const handleEdit = (record: SupplierCategory.ResSupplierCategoryL): void => {
    setCurrentRecord(record);
    setModalMode("edit");
    setModalOpen(true);
  };

  /**
   * 处理弹框确认（新增/编辑）
   */
  const handleModalConfirm = async (categoryName: string): Promise<void> => {
    if (modalMode === "add") {
      const [error] = await to(saveSupplierCategoryApi(categoryName));
      if (error) return;
      message.success("新增成功");
    } else {
      if (!currentRecord?.id) return;
      const [error] = await to(updateSupplierCategoryApi({ id: currentRecord.id, name: categoryName }));
      if (error) return;
      message.success("修改成功");
    }
    setModalOpen(false);
    actionRef.current?.reload();
  };

  /**
   * 处理批量删除
   */
  const handleBatchDelete = async (): Promise<void> => {
    if (selectedRowKeys.length === 0) { message.warning("请先选择要删除的数据"); return; }
    const ids = selectedRowKeys.map(String);
    const [error] = await to(deleteSupplierCategoryApi(ids));
    if (error) return;
    message.success("删除成功");
    setSelectedRowKeys([]);
    actionRef.current?.reload();
  };

  /**
   * 处理批量导出
   */
  const handleExport = async (): Promise<void> => {
    const result = (await exportSupplierCategoryApi({})) as unknown as AxiosResponse<Blob>;
    const success = downloadBlobFile(result, "供应商分类.xlsx");
    message.success(success ? "导出成功" : "导出失败");
  };

  const columns: ProColumns<SupplierCategory.ResSupplierCategoryL>[] = [
    { title: "分类名称", dataIndex: "name", align: "center", width: 200,
      fieldProps: { placeholder: "请输入分类名称" },
      render: (_, record) => record.name || "-" },
    { title: "分类编码", dataIndex: "code", align: "center", width: 160, hideInSearch: true,
      render: (_, record) => record.code || "-" },
    { title: "状态", dataIndex: "status", align: "center", width: 100,
      valueType: "select",
      valueEnum: { "": { text: "全部" }, 1: { text: "启用" }, 0: { text: "禁用" } },
      initialValue: "",
      render: (_, record) => (record.status === 1 ? "启用" : "禁用") },
    { title: "更新时间", dataIndex: "updateTime", align: "center", width: 160, hideInSearch: true,
      render: (_, record) => record.updateTime || "-" },
    { title: "操作", key: "action", fixed: "right", align: "center", width: 160, hideInSearch: true,
      render: (_, record) => (
        <Space size={0}>
          <Button type="link" onClick={() => handleEdit(record)}>编辑</Button>
        </Space>
      ) }
  ];

  /**
   * ProTable 数据请求函数
   */
  const requestData = async (params: {
    name?: string; status?: number | string; current?: number; pageSize?: number;
  }): Promise<{ data: SupplierCategory.ResSupplierCategoryL[]; success: boolean; total: number }> => {
    const [error, result] = await to<ResultData<ResPage<SupplierCategory.ResSupplierCategoryL>>>(
      getSupplierCategoryListApi({
        pageNo: params.current || 1, pageSize: params.pageSize || 10,
        name: params.name, status: params.status !== "" ? Number(params.status) : undefined
      })
    );
    if (error) return { data: [], success: false, total: 0 };
    return { data: result?.data?.records || [], success: true, total: Number(result?.data?.total) || 0 };
  };

  return (
    <div className="min-h-full">
      <CustomProTable<SupplierCategory.ResSupplierCategoryL>
        tableKey="supplier-category-table"
        initialColumns={columns}
        actionRef={actionRef}
        formRef={formRef}
        request={requestData}
        rowKey="id"
        rowSelection={{ selectedRowKeys, onChange: (keys) => setSelectedRowKeys(keys) }}
        toolBarRender={() => [
          <Space key="toolbar" size="middle" className="action-bar mb-4">
            <Button type="primary" onClick={handleAdd}>新增</Button>
            <Button onClick={handleBatchDelete}>批量删除</Button>
            <Button onClick={handleExport}>导出</Button>
          </Space>
        ]}
        onReset={() => setSelectedRowKeys([])}
        onSubmit={() => setSelectedRowKeys([])}
      />
      <CategoryModal
        open={modalOpen}
        mode={modalMode}
        initialCategoryName={currentRecord?.name}
        initialStatus={currentRecord?.status}
        onCancel={() => setModalOpen(false)}
        onConfirm={handleModalConfirm}
      />
    </div>
  );
});

SupplierCategoryPage.displayName = "SupplierCategoryPage";
export default SupplierCategoryPage;
```
