# 工具函数模板

> 路径：`src/utils/index.ts`

```typescript
import dayjs from "dayjs";

/**
 * 格式化金额，保留两位小数并加货币单位
 *
 * @param {unknown} value - 金额值
 * @param {string} [unit="¥"] - 货币单位
 * @param {number} [decimals=2] - 小数位数
 * @param {string} [defaultValue="-"] - 非数字时的默认值
 * @returns {string}
 */
export const formatMoney = (
  value: unknown, unit: string = "¥", decimals: number = 2, defaultValue: string = "-"
): string => {
  if (value === null || value === undefined || value === "") return defaultValue;
  const num = Number(value);
  if (Number.isNaN(num) || !Number.isFinite(num)) return defaultValue;
  return `${unit}${num.toFixed(decimals)}`;
};

/**
 * 格式化日期时间为标准字符串
 *
 * @param {Date | string | undefined} date
 * @param {string} [defaultValue="-"]
 * @returns {string}
 */
export const formatDateTime = (date: Date | string | undefined, defaultValue: string = "-"): string => {
  if (!date) return defaultValue;
  return dayjs(date).format("YYYY-MM-DD HH:mm:ss");
};

/**
 * 获取空值兜底后的显示文本
 *
 * @param {unknown} value
 * @param {string} [defaultValue="-"]
 * @returns {string | number}
 */
export const getDisplayValue = (value: unknown, defaultValue: string = "-"): string | number => {
  if (value === 0) return 0;
  if (value === "" || value === null || value === undefined) return defaultValue;
  return value as string | number;
};

/**
 * 下载文件流（兼容 GET Blob 和 POST AxiosResponse<Blob>）
 *
 * @param {Blob | AxiosResponse<Blob>} response
 * @param {string} defaultFileName - 默认文件名
 * @returns {boolean} 是否成功触发下载
 */
export const downloadBlobFile = (
  response: Blob | import("axios").AxiosResponse<Blob>,
  defaultFileName: string
): boolean => {
  let blob: Blob;
  let headers: Record<string, any> = {};

  if (response instanceof Blob) {
    blob = response;
  } else if (response && typeof response === "object" && "data" in response) {
    if (!response.data || !(response.data instanceof Blob)) return false;
    blob = response.data;
    headers = response.headers || {};
  } else {
    return false;
  }

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = defaultFileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
  return true;
};
```
