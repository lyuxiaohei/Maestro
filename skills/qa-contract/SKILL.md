# 契约测试

---
name: qa-contract
description: "微服务契约层 QA：Spring Cloud Contract producer/consumer 验证 + OpenAPI schema diff"
---

微服务接口契约的质量观察哨，验证 producer/consumer 契约一致性和 API schema 变更兼容性。

## 触发场景

- 接口契约变更（新增/修改 Feign API）
- CI 契约验证失败复现
- 季度接口一致性审查

## 前置条件

- 项目使用 Spring Cloud Contract（SCC）
- contracts/ 目录存在

## 流程

### Step 1: 定位 contracts/ 目录

扫描项目模块结构，定位 `src/test/resources/contracts/` 目录。列出全部契约文件。

### Step 2: 跑 producer 契约验证

```bash
mvn verify -pl {producer-module}
```

验证契约编译通过 + stubs JAR 生成。

### Step 3: consumer 端 stub 校验

```bash
mvn verify -pl {consumer-module}
```

验证 `@AutoConfigureStubRunner` 加载 stub 后测试通过。

### Step 4: OpenAPI schema diff（可选）

对 BFF 层面的 OpenAPI spec 做变更检测：
- `oasdiff breaking {base} {revision}` — 检测破坏性变更
- `spectral lint {spec}` — 规则校验

## 完成

- producer BUILD SUCCESS + stubs JAR 生成
- consumer 测试 PASS
- （可选）OpenAPI diff 无破坏性变更

## 失败处置

| 现象 | 处置 |
|------|------|
| 契约编译失败 | 检查 *Base.java 基类方法签名 |
| stub 加载失败 | 检查 stubrunner.ids 配置 |
| consumer 测试失败 | 对照契约定义检查请求/响应格式 |
| OpenAPI breaking | 检查字段删除/类型变更，评估是否需要版本化 |

## 参考文件

- [references/contract-patterns.md](references/contract-patterns.md) — SCC 配置模板 + OpenAPI lint 规则
