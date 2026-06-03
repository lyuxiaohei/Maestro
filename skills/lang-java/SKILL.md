# Java 语言包 — Spring Cloud Alibaba + MyBatis-Plus

---
name: lang-java
description: "Java 语言包：Spring Cloud Alibaba + MyBatis-Plus 微服务分层约定、JUnit5+Mockito TDD 规范、命名/建表规约。"
maturity: mature
---

激活后以下约定全程有效。编码前 Briefing（tool-call-sequence Step 0）必须加载本语言包。

## 0. 与 execute Skill 契约

| 必读资源 | 文件 | 加载时机 |
|----------|------|---------|
| 技术栈 | `modules/tech-stack.md` | 激活时 |
| 模块结构 | `modules/module-structure.md` | Briefing 必读 |
| 检查清单 | `modules/checklists.md` | Briefing 必读对应段（14 段） |
| 属性测试 | `modules/property-testing.md` | 涉及纯函数时按需加载 |
| 企业层 | `modules/enterprise/` | 可选，按需加载 |
| 代码模板 | `templates/*.md` | Briefing 按涉及类型加载 |

Briefing 不读 = 编码门违规。

## 1. 技术栈

加载 `modules/tech-stack.md`。用户可修改。

## 2. 分层约定（硬规则）

| 规则 | 说明 |
|------|------|
| Controller 实现 API 接口 | 方法体只调 Service |
| Controller 禁止业务逻辑 | 禁止直接调 Mapper 或写业务判断 |
| Service 禁止写 SQL | 通过 Mapper 操作数据 |
| Service 事务边界 | `@Transactional` 只标注 Service 方法 |
| DTO 不跨层泄漏 | VO 在 Service 层转换，禁止直接返回 Entity |
| 构造器注入 | `@RequiredArgsConstructor`，禁止 `@Autowired` |
| 统一响应包装 | `CommonResult.success(data)` |
| 异常抛出 | `throw new ServiceException("错误信息")` |
| 跨服务调用 | 注入 Feign 接口，不直接调 Service |
| Repository 限制 | 用衍生查询或 `@Query` |

## 3. 命名规约

| 类型 | 规范 | 示例 |
|------|------|------|
| 类名 | UpperCamelCase | `BrandService` / `UserDO` |
| 方法名 | lowerCamelCase，动词开头 | `getById` / `listByStatus` |
| 常量 | UPPER_SNAKE_CASE | `MAX_STOCK_COUNT` |
| 包名 | 全小写，单数形式 | `com.example.system.util` |
| Service 实现 | Impl 后缀 | `CacheServiceImpl` |
| 异常类 | Exception 结尾 | `ServiceException` |
| 测试类 | 被测类名 + Test | `BrandServiceTest` |

禁止：下划线/美元符号开头、拼音混合、不规范缩写。布尔字段不加 `is` 前缀。

## 4. 数据库建表规约

表名小写下划线分隔、必备字段（id/create_time/update_time/del_flag）、主键 bigint unsigned 雪花 ID、时间 datetime、金额 decimal、逻辑删除。建表模板见 `templates/ddl.md`。

## 5. TDD 规范

| 层 | 框架 | 启动 Spring |
|----|------|------------|
| DTO 校验 | javax.validation.Validator | 否 |
| Service | JUnit 5 + Mockito | 否 |
| Controller | MockMvc standaloneSetup | 否 |
| 集成测试 | @SpringBootTest | 是（按需） |

BDD 风格：given-when-then 三段式。测试命名：`shouldXxx_whenYyy()`。

## 6. 模板加载表

| 开发场景 | 加载模板 | checklist 段名 |
|----------|---------|---------------|
| 建表 | `templates/ddl.md` | 写 Java DDL 前 |
| Entity | `templates/entity.md` | 写 Java Entity 前 |
| DTO | `templates/dto.md` | 写 Java DTO 前 |
| VO | `templates/vo.md` | 写 Java VO 前 |
| Feign API | `templates/feign-api.md` | 写 Java Feign API 前 |
| Controller | `templates/controller.md` | 写 Java Controller 前 |
| Service | `templates/service.md` | 写 Java Service 前 |
| Mapper | `templates/mapper.md` | 写 Java Mapper 前 |
| Repository | `templates/repository.md` | 写 Java Repository 前 |
| Document | `templates/document.md` | 写 Java MongoDB Document 前 |
| 测试（3 个） | `templates/test-*.md` | 写 Java 测试前 |

## 7. 自定义模块

| 模块 | 加载时机 |
|------|---------|
| `modules/tech-stack.md` | 激活时 |
| `modules/module-structure.md` | 激活时 |
| `modules/checklists.md` | Briefing 必读（14 段） |
| `modules/property-testing.md` | 涉及纯函数时 |
| `modules/enterprise/hongzhao-framework.md` | 设计/编码前（可选推荐） |
| `modules/enterprise/hz-platform-services.md` | 设计/编码前（可选推荐） |
| `modules/enterprise/contract-testing.md` | 跨服务 RPC 时（可选） |
| `modules/enterprise/test-patterns.md` | Spring 集成测试时（可选） |
| `modules/enterprise/spring-ai.md` | AI 集成任务时（可选） |

企业层模块标注为"可选推荐"，通用层不依赖企业层。
