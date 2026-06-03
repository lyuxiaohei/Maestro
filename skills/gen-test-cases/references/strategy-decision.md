# test_strategy 决策树

## 决策树

```
涉及 UI 交互（按钮/表单/页面渲染）？
├─ 是 → 涉及跨服务调用链？
│       ├─ 是 → 多步业务流？（≥2 页跳转 且 ≥2 业务动作串联）
│       │       ├─ 是 → strategy = e2e-flow（多页编排）
│       │       └─ 否 → strategy = e2e（单场景联调）
│       └─ 否 → strategy = component（纯前端）
└─ 否 → 涉及多服务交互（Feign/DB/缓存）？
        ├─ 是 → strategy = integration
        └─ 否 → strategy = unit（归 TDD，本 Skill 不生成）
```

## 5 strategy 速查

| strategy | UI 涉入 | 跨服务 | 工具 | 骨架模板 |
|----------|---------|--------|------|---------|
| e2e | 是 | 是（单场景） | Playwright | playwright-e2e.tmpl |
| e2e-flow | 是 | 是（多步业务流） | Playwright 多页编排 | playwright-e2e.tmpl |
| component | 是 | 否 | Vitest + MSW | vitest-component.tmpl |
| integration | 否 | 是 | JUnit 5 + @SpringBootTest | junit5-unit.tmpl |
| unit | 否 | 否 | （归 TDD） | — |

## 分类案例

### e2e

> 用户在商城首页登录后，看到「我的订单」列表。
> UI 涉入 ✓ + 跨服务 ✓ → strategy = e2e

### e2e-flow

> 用户 登录 → 浏览商品 → 加购 → 下单，跨多页多服务。
> UI 涉入 ✓ + 跨服务 ✓ + 多步 ✓ → strategy = e2e-flow

### component

> ProductList 组件渲染商品卡片网格，加载更多追加 10 张卡。
> UI 涉入 ✓ + 跨服务 ✗ → strategy = component

### integration

> OrderService.createOrder() 调 CustomerFeignAPI + GoodsFeignAPI + 写 DB + 发 MQ。
> UI 涉入 ✗ + 跨 3 服务 ✓ → strategy = integration

### unit

> PriceUtil.calcDiscount(price, rate) 纯函数。
> UI 涉入 ✗ + 跨服务 ✗ → strategy = unit（归 TDD）

## 边界规则

1. 同一 case 含 e2e + integration 子流程 → 拆 2 个 case（一个 case 一个 strategy）
2. Java 不做 e2e，前端 e2e 用 React Playwright
3. React 不做 integration，Java integration 用 JUnit 5
4. strategy=unit 不进入本 Skill 输出
5. e2e-flow 需 ≥2 页跳转 + ≥2 业务动作串联
