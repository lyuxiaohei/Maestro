# API 接口类型定义模板

> 路径：`src/api/interface/index.ts`
> 所有请求/响应类型使用 `namespace` 隔离，公共类型直接 `export interface`。

```typescript
// ── 公共响应结构 ──────────────────────────────────────
/** 基础响应（不含 data） */
export interface Result {
  code: number;
  msg: string;
}

/** 标准响应（含 data） */
export interface ResultData<T = any> extends Result {
  data?: T;
}

/** 分页响应 */
export interface ResPage<T> {
  records: T[];
  current: number;
  size: number;
  total: number;
}

/** 分页请求 */
export interface ReqPage {
  pageNo: number;
  pageSize: number;
}

// ── 业务实体命名空间（以供应商分类为例）────────────────
export namespace SupplierCategory {
  /** 列表查询参数 */
  export interface ReqSupplierCategoryForm extends ReqPage {
    name?: string;
    status?: number;
    updateStartTime?: string;
    updateEndTime?: string;
  }

  /** 更新参数 */
  export interface ReqUpdateSupplierCategoryForm {
    id: number;
    name?: string;
    status?: number;
  }

  /** 列表项响应 */
  export interface ResSupplierCategoryL {
    id?: number;
    name?: string;
    code?: string;
    status?: number;
    sourceType?: number;
    createTime?: string;
    updateTime?: string;
  }
}
```

## 命名规范

- 请求类型：`Req + 业务名 + Form`（例：`ReqSupplierCategoryForm`）
- 响应类型：`Res + 业务名 + L`（列表项）/ `Res + 业务名 + Detail`（详情）
- 所有日期字段类型为 `string`（后端返回字符串，前端用 dayjs 处理）
