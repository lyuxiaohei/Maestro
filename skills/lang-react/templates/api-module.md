# API 模块函数模板

> 路径：`src/api/modules/{module}.ts`
> 每个业务对应一个文件，所有函数必须写 JSDoc，使用 `http.get/post` 封装。

```typescript
// src/api/modules/supplierCategory.ts
import http from "@/api";
import { ResPage, ResultData, SupplierCategory } from "../interface";

const baseUrl = "/boss";

/**
 * 查询分类列表（分页）
 *
 * @param {SupplierCategory.ReqSupplierCategoryForm} params - 查询参数
 * @returns {Promise<ResultData<ResPage<SupplierCategory.ResSupplierCategoryL>>>}
 */
export const getSupplierCategoryListApi = (params: SupplierCategory.ReqSupplierCategoryForm) => {
  return http.post<ResultData<ResPage<SupplierCategory.ResSupplierCategoryL>>>(
    `${baseUrl}/companyType/queryPage`,
    params
  );
};

/**
 * 新增分类
 *
 * @param {string} companyTypeName - 分类名称
 * @returns {Promise<ResultData<boolean>>}
 */
export const saveSupplierCategoryApi = (companyTypeName: string) => {
  const formData = new FormData();
  formData.append("companyTypeName", companyTypeName);
  return http.post<ResultData<boolean>>(`${baseUrl}/companyType/save`, formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
};

/**
 * 更新分类
 *
 * @param {SupplierCategory.ReqUpdateSupplierCategoryForm} params
 * @returns {Promise<ResultData<boolean>>}
 */
export const updateSupplierCategoryApi = (params: SupplierCategory.ReqUpdateSupplierCategoryForm) => {
  return http.post<ResultData<boolean>>(`${baseUrl}/companyType/update`, params);
};

/**
 * 批量删除分类
 *
 * @param {string[]} ids - 分类ID数组
 * @returns {Promise<ResultData<boolean>>}
 */
export const deleteSupplierCategoryApi = (ids: string[]) => {
  const formData = new FormData();
  formData.append("ids", ids.join(","));
  return http.post<ResultData<boolean>>(`${baseUrl}/companyType/batchDel`, formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
};

/**
 * 导出分类列表（文件流）
 *
 * @param {object} params - 筛选参数
 * @returns {Promise<Blob>}
 */
export const exportSupplierCategoryApi = (params: {
  name?: string;
  status?: number;
  ids?: string[];
}) => {
  return http.post(`${baseUrl}/companyType/excel/export`, params, { responseType: "blob" });
};
```
