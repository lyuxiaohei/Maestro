# 模块目录结构配置

> 本文件定义项目模块结构，用户可根据实际项目调整模块划分和命名。

---

## Monorepo 根结构

```
saas-monorepo/
├── hongzhao-saas/          # Java 后端
├── scp-boss/               # 运营后台前端
└── scp-mall/               # 品牌商城前端
```

---

## 后端模块结构

```
hongzhao-saas/
└── hz_platform/
    ├── hz-service-common/          # 公共工具包
    │   ├── hz-common-core/         # 核心工具类
    │   └── hz-common-dependency/   # 依赖管理（BOM）
    ├── hz-business/                # 业务服务（每个独立部署）
    │   ├── hz-goods/               # 商品服务
    │   ├── hz-order/               # 订单服务
    │   ├── hz-account/             # 账户服务
    │   └── ...
    └── hz-support/                 # 支撑服务
        ├── hz-empower/             # 权限服务
        ├── hz-gateway/             # 网关
        └── hz-system/              # 系统服务
```

---

## 单个业务模块结构（以 hz-goods 为例）

```
hz-goods/
├── hz-goods-api/                           # API 层（对外暴露，供其他服务 Feign 调用）
│   └── src/main/java/com/hongzhao/platform/
│       ├── api/                            # Feign 接口定义
│       ├── model/dto/{业务域}/              # 请求 DTO
│       ├── model/vo/{业务域}/               # 响应 VO
│       └── enums/                          # 业务枚举
└── hz-goods-service/                       # 实现层（业务逻辑，独立部署）
    └── src/
        ├── main/java/com/hongzhao/platform/{业务域}/
        │   ├── controller/                  # Controller（实现 API 接口）
        │   ├── service/                     # Service 接口 + impl/
        │   ├── mapper/                      # MyBatis-Plus Mapper（MySQL）
        │   ├── repository/                  # Spring Data MongoDB Repository（MongoDB；与 mapper/ 平级，按存储引擎选用）
        │   └── entity/                      # 数据库实体（MyBatis Entity 或 MongoDB Document，按文件命名/注解区分）
        ├── main/resources/
        │   └── mapper/{业务域}/             # MySQL XML 映射
        └── test/                            # 单元测试
```


---

## 数据层选型说明

| 存储引擎 | 入口 | 适用场景 |
|---|---|---|
| **MySQL（MyBatis-Plus）** | `mapper/` | 强一致、强事务、固定 schema 的核心业务（订单主流程、账户、库存、支付） |
| **MongoDB（Spring Data）** | `repository/` | 嵌套结构、灵活 schema、读多写少的业务（商品详情快照、配货单、操作日志、AI 对话历史、消息记录） |

**同模块可共存**：一个 `xxx-service` 模块可同时含 `mapper/` 与 `repository/`，分别处理 MySQL 与 MongoDB 数据源。Service 层负责跨数据源协调（按业务边界划分子事务，避免分布式事务）。

**Entity 文件夹混放**：MyBatis Entity（继承 `BaseEntity` / `@TableName`）与 MongoDB Document（`@Document`）放在同一 `entity/` 目录；按文件命名约定与类注解区分：

- 命名 `*Entity.java` / `*DO.java` 并继承 `BaseEntity` → MyBatis Entity（`mapper.md` / `entity.md` 模板）
- 命名为业务名（如 `TradeOrder.java` / `DropShipOrder.java`）并加 `@Document` → MongoDB Document（`document.md` 模板）
