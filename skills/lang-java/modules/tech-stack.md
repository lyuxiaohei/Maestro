# 技术栈配置

> 本文件定义项目技术栈版本，用户可根据实际项目调整版本和组件。

| 技术 | 版本 | 用途 |
|------|------|------|
| Spring Boot | 2.7.18 | 基础框架 |
| Spring Cloud | 2021.0.5 | 微服务治理 |
| Spring Cloud Alibaba | 2021.0.4.0 | Nacos/Seata 集成 |
| Nacos | 2.1.x | 注册中心 + 配置中心 |
| Spring Cloud Gateway | 3.1.4 | 服务网关 |
| OpenFeign | 随 SC 版本 | 微服务间 RPC |
| Seata | 1.5.2 | 分布式事务 |
| MyBatis-Plus | 3.5.7 | ORM 框架 |
| Spring Data MongoDB | 4.x | MongoDB 数据访问，按模块按需引入；与 MyBatis-Plus 共存 |
| Redis / Redisson | 3.18.0 | 缓存 |
| RabbitMQ | 3.10.x | 消息队列 |
| XXL-Job | 2.3.1 | 定时任务 |
| Knife4j / SpringDoc | 4.0.0 | API 文档 |
| Lombok | 1.18.30 | 代码简化 |
| MapStruct-Plus | 1.5.0 | 对象转换 |
| Log4j2 | — | 日志 |
| Java | 1.8 | 运行环境 |
