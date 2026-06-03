# 自定义 Hook 模板

## useEnums — 枚举数据 Hook

> 路径：`src/hooks/use-enums/index.tsx`

```typescript
import { useEffect, useState } from "react";
import { Enum } from "@/api/interface";
import { getEnumsApi } from "@/api/modules/enums";
import { to } from "@/utils";

export type EnumOption = { label: string; value: string | number };
export type UseEnumsReturn = [Record<string, EnumOption[]>, boolean, string | null];

/**
 * 批量获取枚举数据 Hook
 *
 * @param {string[]} enumKeys - 枚举 key 数组
 * @param {string[]} [excludeAllOptionKeys] - 不添加"全部"选项的枚举 key
 * @returns {UseEnumsReturn} [enums, loading, error]
 */
export function useEnums(enumKeys: string[], excludeAllOptionKeys?: string[]): UseEnumsReturn {
  const [enums, setEnums] = useState<Record<string, EnumOption[]>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const enumKeysStr = enumKeys?.join(",") ?? "";
  const excludeStr = excludeAllOptionKeys?.join(",") ?? "";

  useEffect(() => {
    const fetchEnumsData = async (): Promise<void> => {
      if (!enumKeys || enumKeys.length === 0) { setLoading(false); return; }
      setLoading(true);
      const [err, result] = await to(getEnumsApi(enumKeys.join(",")));
      if (err || !result?.data) {
        setError(err || "获取枚举数据失败");
        setLoading(false);
        return;
      }
      const processed: Record<string, EnumOption[]> = {};
      enumKeys.forEach((key) => {
        const items = (result.data[key] || []) as Enum.EnumItem[];
        const options: EnumOption[] = items.map((item) => ({ label: item.label, value: item.code }));
        const needAll = !(excludeAllOptionKeys?.includes(key) ?? false);
        processed[key] = needAll ? [{ label: "全部", value: "" }, ...options] : options;
      });
      setEnums(processed);
      setLoading(false);
    };
    fetchEnumsData();
  }, [enumKeysStr, excludeStr]);

  return [enums, loading, error];
}
```

## useListData — 通用列表数据 Hook

> 路径：`src/hooks/use-list-data/index.tsx`

```typescript
import { useEffect, useState } from "react";
import { ResPage, ResultData } from "@/api/interface";
import { to } from "@/utils";

interface UseListDataOptions<P, T> {
  apiFn: (params: P) => Promise<ResultData<ResPage<T>>>;
  initialParams: P;
  immediate?: boolean;
}

/**
 * 通用列表数据获取 Hook
 *
 * @template P - 请求参数类型
 * @template T - 列表项数据类型
 */
export function useListData<P, T>({ apiFn, initialParams, immediate = true }: UseListDataOptions<P, T>) {
  const [list, setList] = useState<T[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchList = async (params: P): Promise<void> => {
    setLoading(true);
    const [error, result] = await to(apiFn(params));
    if (error) {
      setList([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    setList(result?.data?.records || []);
    setTotal(Number(result?.data?.total) || 0);
    setLoading(false);
  };

  useEffect(() => {
    if (immediate) { fetchList(initialParams); }
  }, []);

  return { list, total, loading, refresh: fetchList };
}
```
