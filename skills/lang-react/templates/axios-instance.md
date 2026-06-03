# Axios 实例模板

> 路径：`src/api/index.ts`
> 已封装好，一般无需修改。核心逻辑说明：

```typescript
class RequestHttp {
  service: AxiosInstance;

  constructor(config: AxiosRequestConfig) {
    this.service = axios.create(config);

    // 请求拦截器：自动注入 Authorization token
    this.service.interceptors.request.use((config) => {
      const token = useGlobalStore.getState().token;
      if (token) {
        return { ...config, headers: { ...config.headers, Authorization: token } };
      }
      return config;
    });

    // 响应拦截器：
    // 1. blob 响应直接返回（GET→Blob，POST→AxiosResponse）
    // 2. code !== 200 时 message.error 并 reject
    // 3. 登录失效（599）跳转登录页
    this.service.interceptors.response.use((response) => {
      const { data, config } = response;
      if (config.responseType === "blob") {
        return config.method?.toLowerCase() === "get" ? data : response;
      }
      if (data.code !== ResultEnum.SUCCESS) {
        message.error(data.msg || "请求失败");
        return Promise.reject(data);
      }
      return data;
    });
  }

  get<T>(url: string, params?: object, _object = {}): Promise<ResultData<T>> {
    return this.service.get(url, { params, ..._object });
  }

  post<T>(url: string, params?: object, _object = {}): Promise<ResultData<T>> {
    return this.service.post(url, params, _object);
  }
}

export default new RequestHttp(config);
```
