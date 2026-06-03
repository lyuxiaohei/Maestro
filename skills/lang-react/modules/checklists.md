# React 写代码检查清单

由 /build Step 3.C 按需读取。每段以 `## 写 XXX 前` 命名，按文件类型对号入座，把整段清单粘贴到 response 作为写代码当下的自检证据。

---

## 写 React 视图组件前

```
[lang-react 视图检查清单]
当前文件：{path}/views/{module}/index.tsx

[ ] 文件预计 < 500 行（接近时立即拆到 components/ 子目录）
[ ] API 调用封装在 hooks/ 中，不在组件内 await
[ ] API 调用用 to() 处理错误（const [err, res] = await to(api.xxx())），不用 try-catch
[ ] 类型定义在 api/interface/，不在组件文件内定义跨文件类型
[ ] 工具函数从 @/utils 导入，禁止深路径导入
[ ] React.memo 必须设置 displayName
[ ] 禁止：any / ! 非空断言 / @ts-ignore
[ ] 全局公共组件放 components/，页面级子组件放 views/{module}/components/
```

---

## 写 React 列表页（page-list）前

```
[lang-react 列表页检查清单]
当前文件：{path}/views/{module}/index.tsx 或 pages/{module}/list.tsx

[ ] 顶部筛选区独立组件：components/SearchForm.tsx
[ ] 主体 Table 列定义独立常量：columns.ts
[ ] 操作列（编辑/删除）用 Button.Group 或独立 ActionColumn 组件
[ ] 分页用 Antd Pagination 或 Table.pagination；分页参数 { page, size, total }
[ ] 数据加载用专属 hook：useXxxList()，返回 { data, loading, refetch }
[ ] 空状态：Empty 组件 + 文案；加载状态：Skeleton
[ ] URL 同步分页参数（useSearchParams）
[ ] 删除前确认：Modal.confirm 二次确认
```

---

## 写 React Modal 前

```
[lang-react Modal 检查清单]
当前文件：{path}/views/{module}/components/XxxModal.tsx

[ ] 显隐用 useDisclosure 或父组件 visible 受控
[ ] Form 用 Antd Form + useForm；提交用 form.validateFields().then(...)
[ ] onCancel 必须 form.resetFields() 防止污染下次打开
[ ] 异步提交用 to() 包装 + loading 态
[ ] 关闭后通过 onSuccess 通知父组件 refetch 列表
[ ] Modal title 区分"新增 / 编辑 / 查看"模式
[ ] destroyOnClose=true 避免表单状态残留
```

---

## 写 React hooks 前

```
[lang-react hooks 检查清单]
当前文件：{path}/views/{module}/hooks/useXxx.ts

[ ] 命名以 use 开头
[ ] API 调用 + store 操作集中在这里
[ ] 用 to() 处理 API 错误
[ ] 返回对象包含 { data, loading, error, ...actions }
[ ] 不在 hook 内部直接 console.error（错误暴露给调用方处理）
[ ] 依赖项数组完整，禁止 // eslint-disable react-hooks/exhaustive-deps
[ ] cleanup 函数清理订阅 / 定时器
```

---

## 写 React API 层前

```
[lang-react API 检查清单]
当前文件：{path}/api/xxx.ts

[ ] 只发 HTTP 请求，不处理业务状态
[ ] 类型定义在 api/interface/xxx.ts，跨文件 import 使用
[ ] 函数命名：getXxx / listXxx / createXxx / updateXxx / deleteXxx
[ ] axios 实例从统一封装 import，禁止裸用
[ ] 入参/返回类型显式标注，禁止 any
[ ] 不在 API 函数内 try-catch，错误抛出由调用方 to() 处理
```

---

## 写 React Axios 实例前

```
[lang-react Axios 实例检查清单]
当前文件：{path}/utils/request.ts 或 api/instance.ts

[ ] baseURL 从 import.meta.env 读取，禁止硬编码
[ ] 请求拦截器：注入 Authorization Header（从 store 取 token）
[ ] 响应拦截器：根据 code 字段分发成功/失败；401 自动跳登录
[ ] timeout 配置外置
[ ] 错误日志结构化：含 url / method / status / requestId
[ ] 不在拦截器内 message.error（让调用方决定）
```

---

## 写 React Zustand Store 前

```
[lang-react Zustand Store 检查清单]
当前文件：{path}/store/useXxxStore.ts

[ ] 命名以 use 开头 + Store 后缀
[ ] 大型 store 按 slice 拆分（user / config / auth 各一）
[ ] 持久化用 persist middleware，明确白名单字段
[ ] devtools middleware 仅开发模式启用
[ ] 不存大对象（图片 / 列表全量）；列表用 React Query 管理
[ ] action 命名：setXxx / addXxx / removeXxx / clearXxx
[ ] 选择器用 shallow 比较防止过度渲染：useStore(s => s.x, shallow)
```

---

## 写 React Router 前

```
[lang-react Router 检查清单]
当前文件：{path}/router/index.tsx 或 routes/index.ts

[ ] 路由配置用 createBrowserRouter + RouterProvider
[ ] 大模块用 React.lazy + Suspense 懒加载
[ ] 路由守卫：登录态校验放统一 ProtectedRoute 组件
[ ] 嵌套路由用 children 而非 path 拼接
[ ] 404 兜底路由放最后
[ ] 路径常量化：routes.userList = '/admin/user/list'，禁止散落字符串
[ ] errorElement 处理路由级错误
```

---

## 写 React utils 前

```
[lang-react utils 检查清单]
当前文件：{path}/utils/xxx.ts

[ ] 纯函数：相同入参相同输出，无副作用
[ ] 不依赖 React hooks（hook 类工具放 hooks/）
[ ] to() 工具：const [err, res] = await to(promise)，禁止抛
[ ] 日期格式化：dayjs，禁止 moment
[ ] 金额格式化：BigNumber 或 toFixed(2)，禁止直接 *100/100
[ ] 单元测试覆盖率 > 80%
```

---

## 写 React 测试前（合段：API/hooks/page/store/utils）

```
[lang-react 测试检查清单]
当前文件：{path}/**/*.test.tsx 或 .test.ts

[ ] 测试框架：Vitest + Testing Library
[ ] 文件位置：与被测文件同目录的 *.test.ts(x)
[ ] API 测试：mock fetch / axios，验证调用参数和处理逻辑
[ ] hooks 测试：renderHook + act
[ ] 组件测试：render + screen.getByRole / getByText 优先；testid 兜底
[ ] store 测试：直接调 store 方法，验证 state 变化
[ ] utils 测试：纯函数 input/output 表驱动
[ ] mock 模块用 vi.mock，setup/teardown 用 beforeEach / afterEach
[ ] 异步用 await waitFor(...)，禁止 setTimeout
[ ] 测试命名：should xxx when yyy（中英文都可）
```
