# Hongzhao Framework Spring 测试适配模板

> **写 Hongzhao 框架（hongzhao-starter-*）Spring 集成测试必读**。
> 来源：§A.6.1 SCC pilot 实战发现（2026-05-13）。直接复制下文 boilerplate 到测试类即可。

## 为什么需要这个模板

Hongzhao 框架 18 个 starter 的 auto-config 设计假定**完整 production stack**（MySQL/Redis/Mongo/Nacos/xxl-job）存在。Spring Boot 标准测试切片（`@WebMvcTest`、`@DataJpaTest`、`spring.autoconfigure.exclude`）对 Hongzhao starter **无效**：

| Spring Boot 标准做法 | 在 Hongzhao 框架的行为 |
|---|---|
| `@WebMvcTest(MyController.class)` | starter auto-config 仍全量加载，DataSource/Redis 不在场 → bean creation fails |
| `spring.autoconfigure.exclude=com.hongzhao.saas.xxx.XxxAutoConfiguration` | **完全无效**（实测 SaasXxlJobAutoConfiguration 仍加载） |
| `@MockBean` 替换 | 被 starter 重新覆盖，BeanDefinitionOverrideException |
| `@DataJpaTest` | 与 MyBatis-Plus + Druid 冲突 |

→ **唯一可工作模式**：完整 `@SpringBootTest` + 本机 docker 中间件 + 最小 TestApp + 关键属性填充。

## 推荐模式：本机 docker stack + 最小 TestApp

### 前置条件

```bash
# 本机 docker stack 必须运行（来自 skills/start-local-stack/config/）
docker ps --format "{{.Names}}" | grep -E "hongzhao-(mysql|redis|mongodb)"
# 期望输出 3 行
```

如未启动，先 `./skills/start-local-stack/config/docker-compose.yml up -d`。

### 1. 最小 TestApp（每个 service 一次性建，所有测试复用）

```java
// src/test/java/com/hongzhao/.../<svc>/test/<Svc>TestApp.java
package com.hongzhao.<svc>.test;

import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * 测试用最小 SpringBootApplication。
 * 限定 ComponentScan 到 test 子包，避开生产 @SpringBootApplication 的全包扫描
 * （否则拉全部 Controller/Service/Mapper，连带需要 oms.url 等业务集成配置）。
 */
@SpringBootApplication(scanBasePackages = "com.hongzhao.<svc>.test")
public class <Svc>TestApp {
}
```

### 2. 测试基类（继承复用）

```java
// src/test/java/com/hongzhao/.../<svc>/test/HongzhaoTestBase.java
package com.hongzhao.<svc>.test;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

@SpringBootTest(
    classes = <Svc>TestApp.class,
    webEnvironment = SpringBootTest.WebEnvironment.MOCK
)
@TestPropertySource(properties = {
    // ── Hongzhao framework 关掉云原生集成（避免 Nacos 8848 连接尝试） ──
    "spring.cloud.nacos.config.enabled=false",
    "spring.cloud.nacos.discovery.enabled=false",
    "spring.main.allow-bean-definition-overriding=true",

    // ── Hongzhao license 框架关闭（避免试图加载授权文件） ──
    "hongzhao.license.enabled=false",

    // ── xxl-job：必须填值，不能纯 disable（auto-config 加载即触发 @NotEmpty 校验） ──
    "xxl.job.admin.addresses=http://127.0.0.1:28890/xxl-job-admin",
    "xxl.job.executor.appname=<svc>-test",
    "xxl.job.executor.port=39999",
    "xxl.job.executor.logpath=/tmp/xxl-job",
    "xxl.job.executor.logretentiondays=1",

    // ── 本机 docker MySQL（hongzhao-mysql 容器，端口 3306） ──
    "spring.datasource.url=jdbc:mysql://127.0.0.1:3306/saas_<svc>?useSSL=false&serverTimezone=Asia/Shanghai&allowPublicKeyRetrieval=true",
    "spring.datasource.username=root",
    "spring.datasource.password=Hz@@2025",
    "spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver",
    // Druid 走单独前缀（hongzhao-starter-mysql 用 Druid 包 DataSource）
    "spring.datasource.druid.url=jdbc:mysql://127.0.0.1:3306/saas_<svc>?useSSL=false&serverTimezone=Asia/Shanghai&allowPublicKeyRetrieval=true",
    "spring.datasource.druid.username=root",
    "spring.datasource.druid.password=Hz@@2025",

    // ── 本机 docker Redis（hongzhao-redis 容器，端口 6379） ──
    "spring.redis.host=127.0.0.1",
    "spring.redis.port=6379",

    // ── 本机 docker MongoDB（hongzhao-mongodb 容器，端口 27017） ──
    "spring.data.mongodb.host=127.0.0.1",
    "spring.data.mongodb.port=27017",
    "spring.data.mongodb.database=saas_<svc>"
})
public abstract class HongzhaoTestBase {
    // 子类按需 @Autowired 业务 bean、用 @MockBean 替换
}
```

### 3. pom.xml 测试依赖

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-test</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>mysql</groupId>
    <artifactId>mysql-connector-java</artifactId>
    <version>8.0.33</version>
    <scope>test</scope>
</dependency>
```

> `mysql-connector-java` 父 pom 不管 version，必须显式指定。

## 不同测试场景的模板裁剪

### 场景 A：纯 Controller 测试（需 MVC + RestAssured/MockMvc）

```java
@SpringBootTest(classes = <Svc>TestApp.class, webEnvironment = MOCK)
@AutoConfigureMockMvc
@TestPropertySource(/* 上述 17 条 */)
class OrderControllerTest extends HongzhaoTestBase {
    @Autowired private MockMvc mockMvc;
    // ...
}
```

### 场景 B：Service 测试（需 DataSource + MyBatis Mapper）

```java
@SpringBootTest(classes = <Svc>TestApp.class)
@TestPropertySource(/* 上述 17 条 */)
class OrderServiceTest extends HongzhaoTestBase {
    @Autowired private OrderService service;
    // 注意：测试会读真实 docker MySQL，不要写脏数据
    // 推荐 @Transactional + rollback 隔离
}
```

### 场景 C：SCC contract verify 基类（producer 端）

见 §A.5.1 `contract-testing.md` 或 §A.6.1 PILOT-A.6.1.md。本模式 + `RestAssuredMockMvc.webAppContextSetup(context)` 即可。

### 场景 D：Service mock 单元测试（不需 Spring context）

如果只测纯逻辑：

```java
@ExtendWith(MockitoExtension.class)
class OrderServicePureUnitTest {
    @Mock private OrderMapper mapper;
    @InjectMocks private OrderServiceImpl service;
    // ...无 Spring context，5s 内跑完
}
```

**优先选 D**：能纯 mock 跑通的逻辑不要拉 Spring。Spring 启动~15-20s/class，纯 mock 测试 0.5-2s。

## 已知限制与陷阱

### 1. `spring.autoconfigure.exclude` 对 Hongzhao starter 失效

实测无效。**不要试图 exclude `SaasXxlJobAutoConfiguration` / `SaasTenantAutoConfiguration` / `SaasRedisAutoConfiguration`** —— 它们会继续加载。改用属性填充策略。

### 2. ComponentScan 全包陷阱

如果测试基类不显式指定 `classes = <Svc>TestApp.class`，`@SpringBootTest` 会自动发现 main 包的 `@SpringBootApplication`（如 `OrderApplication`），它的 ComponentScan 默认扫 `com.hongzhao.platform.*` —— 拉所有 Controller/Service/Mapper，连带需要业务集成配置（`oms.url` / `jdy.api-key` / `kingdee.app-secret` 等）。

→ **每个 service 必须有 `<Svc>TestApp`**，限定 scan 到 `test` 子包。

### 3. xxl.job 不能纯 disable

`xxl.job.executor.enabled=false` 或 `xxl.enabled=false` 都**无效**。必须填齐 5 条属性（addresses/appname/port/logpath/logretentiondays），即使 xxl-job-admin (28890) 不响应。xxlJobExecutor 有 retry，不阻塞测试。

### 4. 测试间 DB 状态共享

所有测试连同一个 docker MySQL/Mongo，**数据会污染**。推荐：
- `@Transactional` 包测试方法（自动 rollback）
- 或测试名隔离前缀（`test_*` 表名）
- 或专用 test db schema (`saas_<svc>_test`)

### 5. Windows Docker Desktop + TestContainers 不可用

TestContainers Java SDK 在 Windows Docker Desktop（默认 npipe + tcp://localhost:2375 返 stub）找不到 daemon。
**绕过**：用本机已 docker compose 起的 stack（本模板默认方案），不要试图 TestContainers `MySQLContainer.start()`。
CI 场景换 GitLab `services` 关键字起 MySQL/Redis/Mongo，env 注入连接参数。

### 6. ApplicationContextRunner 测试 `@Validated @ConfigurationProperties` 需补 validation provider

**现象**：用 `ApplicationContextRunner.withConfiguration(AutoConfigurations.of(...))` 隔离测试 auto-config 时，若被测的 `@ConfigurationProperties` 类带 `@Validated`（如 `XxlJobProperties`），bean 创建立即失败：

```
Caused by: jakarta.validation.NoProviderFoundException:
  Unable to create a Configuration, because no Jakarta Bean Validation provider could be found.
  Add a provider like Hibernate Validator (RI) to your classpath.
```

**根因**：`spring-boot-starter-test` 不传递 `hibernate-validator`。生产 stack 是其他 starter（如 `spring-boot-starter-web` / `spring-boot-starter-validation`）间接拉入的；`ApplicationContextRunner` 把 starter 链路剥离掉了，validator provider 跟着消失。

**修复**：对应模块的 `pom.xml` 追加 test-scope 依赖：

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-validation</artifactId>
    <scope>test</scope>
</dependency>
```

> 即使被测 starter 自己未声明 `spring-boot-starter-web` / `validation`，本依赖也必须加；否则 `ApplicationContextRunner` 一上来就 fail-fast，根本走不到 `@ConditionalOnProperty` 的 condition 评估。

**适用范围**：所有 17 个 `hongzhao-starter-*` 模块写 `ApplicationContextRunner` 隔离测试时统一前置补丁。来源：framework 仓 spike `2026-05-14-add-starter-enabled-toggles` T2 实测沉淀。

**Cross-link**：写 AutoConfiguration 测试的完整 checklist 见 `checklists.md` "写 Java AutoConfiguration 测试前" 段。

## CI 适配（GitLab）

测试在 CI 跑时，本机 docker stack 不在。改用 GitLab `services`：

```yaml
test-java:
  stage: test
  image: maven:3.9-eclipse-temurin-8
  services:
    - name: mysql:8.0
      alias: mysql
    - name: redis:7-alpine
      alias: redis
    - name: mongo:6.0
      alias: mongo
  variables:
    MYSQL_ROOT_PASSWORD: Hz@@2025
    MYSQL_DATABASE: saas_<svc>
    # Spring 测试用环境变量覆盖（与 @TestPropertySource 优先级斗）
    SPRING_DATASOURCE_URL: jdbc:mysql://mysql:3306/saas_<svc>?...
    SPRING_DATASOURCE_USERNAME: root
    SPRING_DATASOURCE_PASSWORD: Hz@@2025
    SPRING_REDIS_HOST: redis
    SPRING_DATA_MONGODB_HOST: mongo
  script:
    - mvn $MAVEN_CLI_OPTS test -q
```

CI 测试启动时间：~30-60s 拉 service 镜像 + ~15-20s Spring context 启动/test class = 总耗时取决于 test class 数量。

## 与 §C P0 集成点（重要）

**§C1 `/gen-test-cases` 生成的 Java skeleton 必须使用本模板**：

```java
// AI 生成的产物示例
@SpringBootTest(classes = <Svc>TestApp.class, webEnvironment = MOCK)
@TestPropertySource(properties = {
    /* 17 条 Hongzhao framework 适配模板，详见 skills/lang-java/modules/test-patterns.md */
})
class <Feature>Test extends HongzhaoTestBase {
    // ...
}
```

**§C1 验收**：生成的 Java skeleton 含 Hongzhao framework 适配 boilerplate；**否则 §C 输出实跑不动 = §C 失败**。

**§C2 `/gen-test-run` 实跑前**：
1. 检查本机 docker stack 在跑（hongzhao-mysql/redis/mongodb 三容器）
2. 如不在 → 提示用户 `./skills/start-local-stack/config/docker-compose.yml up -d`，再续

## 长期方向：framework 改造

本模块是**临时解决方案**。长期最佳路径是 framework 团队加 `@ConditionalOnProperty`：

```java
// 提议：每个 hongzhao-starter-* 加
@Configuration
@ConditionalOnProperty(name = "hongzhao.starter.<x>.enabled", matchIfMissing = true)
public class XxxAutoConfiguration { ... }
```

→ 测试侧 `hongzhao.starter.mysql.enabled=false` 即可关掉，恢复 Spring Boot 标准测试切片可用性。

**何时推动 framework 改造**：
- P0 §C 全量上线，AI 测试生成在生产团队普及
- 测试卡 Hongzhao framework 阻力开始累积（年化工时浪费 1000+ 小时）
- 与 framework 团队对齐"测试可关 starter"的诉求

**完整改造提案**（含 PR 模板 / 改造步骤 / 风险评估）：
[FRAMEWORK-REFACTOR-PROPOSAL.md](../../../openspec/changes/active/2026-05-09-p0-contract-test-scaffolding/FRAMEWORK-REFACTOR-PROPOSAL.md) ——
可以直接交给 framework 团队作为改造依据。

详见 §A.6.1 PILOT-A.6.1.md "长期方向：framework 改造" 段。
