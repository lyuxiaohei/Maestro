# AST 模式 + Retry 策略 + AI Marker 规范

## TODO 定位模式

### Java (JUnit 5)

搜索目标: `Assertions.fail("PASS_NOT_YET...")` 或 `fail("PASS_NOT_YET...")`

```java
// 骨架中的占位
@Test
void shouldInsertBrand_whenNameNotExists() {
    // TODO: implement
    Assertions.fail("PASS_NOT_YET: shouldInsertBrand_whenNameNotExists");
}
```

填实后替换为:
```java
@Test
void shouldInsertBrand_whenNameNotExists() {
    given(mapper.selectById(1L)).willReturn(null);
    Boolean result = service.edit(dto);
    assertThat(result).isTrue();
    verify(mapper).insert(any(Brand.class));
}
```

### React/TypeScript (Vitest)

搜索目标: `throw new Error('PASS_NOT_YET...')`

```typescript
// 骨架中的占位
it('should render product list', () => {
    throw new Error('PASS_NOT_YET: should render product list');
});
```

填实后替换为:
```typescript
it('should render product list', () => {
    render(<ProductList products={mockProducts} />);
    expect(screen.getByText('Product A')).toBeInTheDocument();
});
```

## 填实策略

1. 从 test-cases.md 提取该 case 的 happy_path 步骤
2. 从 fixture-spec.json 提取 mock_source 类型
3. 根据步骤推断需要的断言:
   - e2e: 页面元素可见性 + 交互结果
   - component: 组件渲染 + prop 传递
   - integration: 方法调用 + 返回值 + mock 验证

## AI Marker 注入规则

每个填实文件顶部必须注入:

```
// AI-GENERATED: review business correctness before merge
// Filled by gen-test-run at {ISO8601 timestamp}
// happy_path source: test-cases.md TC-{id}
// retry_count: {0|1|2|AI_GAVE_UP}
```

- retry_count=0: 一次通过
- retry_count=1: 失败 1 次后修复通过
- retry_count=2: 失败 2 次后修复通过
- AI_GAVE_UP: 3 次失败，人工接手

## Retry 策略

### Retry 1 — 保守修复

- 分析 stderr 中的断言失败信息
- 调整选择器（前端）或断言值（后端）
- 保持 mock 数据不变
- 重跑单个测试

### Retry 2 — 激进修复

- 重新评估 mock 数据合理性
- 替换选择器为更稳定的备选（getByRole > getByText > getByTestId）
- 放宽断言精度（exact match → contains）
- 重跑单个测试

### Retry 3 — AI_GAVE_UP

- 标记为 AI_GAVE_UP
- 写入完整失败 trace:
  - 原始 stderr
  - retry 1 调整内容 + 结果
  - retry 2 调整内容 + 结果
  - 建议人工修复方向
- 保留 .GENERATED 文件供参考

## 文件命名约定

| 原始骨架 | 填实文件 |
|---------|---------|
| `BrandServiceTest.java` | `BrandServiceTest.java.GENERATED` |
| `ProductList.spec.ts` | `ProductList.spec.ts.GENERATED` |
| `OrderFlow.spec.ts` | `OrderFlow.spec.ts.GENERATED` |

保留原骨架文件不被修改，便于 diff review。

## Maestro 适配

- 输入路径: `.planning/{version}/workflows/{slug}/test-cases/`
- 输出路径: 同输入目录，`.GENERATED` 后缀
- 技术栈: Java + React（去除 RN/Taro/Python）
