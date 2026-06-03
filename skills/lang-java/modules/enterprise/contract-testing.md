# Contract Testing —— Spring Cloud Contract 约定

> Java 微服务接口契约测试的目录布局、命名规则、典型陷阱。**写涉及 producer/consumer 跨服务 RPC 的代码前必读**。

## 技术栈

| 组件 | 版本 | 用途 |
|---|---|---|
| Spring Cloud Contract | 3.1.7 | 契约定义 + producer 端 verify + consumer 端 stub-runner |
| Spring Boot | 2.7.18 | 与 Hongzhao SaaS 主线对齐（Java 8 兼容） |
| Java | 8 (1.8.0_202) | 项目目标 |
| Pact Broker | `:2`（pactfoundation/pact-broker） | 跨 pipeline stub 共享 |
| oasdiff | 1.10.x / `tufin/oasdiff:latest` | BFF schema BREAKING change 检测 |
| Stoplight Spectral | 6.x | BFF OpenAPI lint |

完整模板：`skills/qa-contract/assets/`

## 目录布局

### Producer 端（提供契约的服务）

```
<svc>-api/                                # producer module（按 lang-java 约定的 -api 后缀）
├── pom.xml                               # 引 spring-cloud-starter-contract-verifier
└── src/
    ├── main/java/com/hongzhao/.../
    │   ├── controller/                    # 与契约对齐的 controller
    │   ├── service/                       # 业务逻辑
    │   └── dto/ + vo/                     # response 类型（字段名严格匹配 contract）
    └── test/
        ├── java/com/hongzhao/.../
        │   └── ContractBase.java          # @SpringBootTest(MOCK) + WebApplicationContext 基类
        │                                  # SCC plugin 生成的 *ContractVerifierTest 继承自此
        └── resources/
            └── contracts/                 # 契约定义存放点（plugin 自动扫描）
                ├── shouldGetOrderById.groovy
                ├── shouldCreateOrder.groovy
                └── ...
```

### Consumer 端（调用方）

```
<svc>-service/                            # consumer module
├── pom.xml                               # 引 spring-cloud-starter-contract-stub-runner（注意：是 -stub-runner 不是 -verifier）
└── src/
    ├── main/java/com/hongzhao/.../
    │   ├── feign/                         # 推荐用 Feign（@FeignClient + 自动透传 token/tenant-id）
    │   ├── service/                       # 业务侧逻辑
    │   └── dto/                           # 反序列化对应 producer response
    └── test/
        └── java/com/hongzhao/.../
            └── *ContractTest.java         # @AutoConfigureStubRunner LOCAL/REMOTE 模式
```

## 命名规则

| 对象 | 规则 | 示例 |
|---|---|---|
| Contract 文件 | `should<Behavior>.groovy`，驼峰，描述行为 | `shouldGetOrderById.groovy`、`shouldRejectInvalidPayment.groovy` |
| Contract package | 文件路径上的子目录名会作为生成测试的 package 后缀 | `contracts/order/` → `*OrderTest` |
| Producer base class | `*Base.java`，结尾 Base，与 contract 路径对齐 | `OrderBase.java`、`PaymentBase.java` |
| Consumer test class | `*ContractTest.java`，结尾 ContractTest 区别于普通 unit test | `OrderConsumerContractTest.java` |
| StubRunner ids | `groupId:artifactId:version:classifier`，version 用 `+` = latest，classifier 固定 `stubs` | `com.hongzhao.cloud:order-api:+:stubs` |

## 核心配置片段

### Producer pom.xml

```xml
<plugin>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-contract-maven-plugin</artifactId>
    <version>3.1.7</version>
    <extensions>true</extensions>
    <configuration>
        <baseClassForTests>com.hongzhao.<svc>.contract.ContractBase</baseClassForTests>
        <testFramework>JUNIT5</testFramework>
    </configuration>
</plugin>
```

> ⚠️ **JUNIT5 必填**：plugin 默认 JUNIT4，与 Hongzhao SaaS JUnit 5 + Mockito TDD 规约冲突。

### Producer ContractBase.java（MockMvc 模式，无需起 server）

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@WebAppConfiguration
public abstract class ContractBase {
    @Autowired
    private WebApplicationContext context;

    @BeforeEach
    public void setup() {
        RestAssuredMockMvc.webAppContextSetup(context);
    }
}
```

### Consumer Test 模板

```java
@SpringBootTest
@AutoConfigureStubRunner(
    ids = "com.hongzhao.cloud:order-api:+:stubs",
    stubsMode = StubRunnerProperties.StubsMode.LOCAL   // 或 REMOTE 配 Pact Broker
)
public class OrderConsumerContractTest {

    @Autowired
    private StubFinder stubFinder;

    @Test
    void shouldGetOrderFromProducerStub() {
        String stubUrl = stubFinder.findStubUrl("com.hongzhao.cloud", "order-api").toString();
        // 用 OrderClient (Feign / RestTemplate) 调 stubUrl，跑业务断言
    }
}
```

## StubsMode 选择

| 模式 | 来源 | 适用 |
|---|---|---|
| `LOCAL` | `~/.m2/repository/` 本地 Maven repo | 同 pipeline（先 producer install 再 consumer test）/ 本机开发 |
| `REMOTE` | 远端 Pact Broker | 跨 pipeline、跨团队场景；配 `stubrunner.repository.root` 指向 broker URL |
| `CLASSPATH` | 打包 stubs jar 进 consumer 项目 | 一般不用 |

## 典型陷阱（实战收集）

| 陷阱 | 现象 | 处置 |
|---|---|---|
| 缺 `@SpringBootApplication` | SCC plugin 生成的 ContractVerifierTest 报 `IllegalStateException: Unable to find a @SpringBootConfiguration` | producer module 必须有 `@SpringBootApplication` 标注的 main class（即使本身不启动也要存在，供 test 引导 ApplicationContext） |
| `baseClassForTests` 路径错 | 生成测试找不到基类 → 编译失败 | pom.xml 里的 fully-qualified class name 必须与 ContractBase.java 实际包路径**完全一致**（包括包名大小写） |
| `URL.toURI()` 编译失败 | consumer test 写 `stubFinder.findStubUrl(...).toURI()` 报 unhandled URISyntaxException | 改用 `.toString()`（URL 字符串足够，省 try/catch） |
| StubRunner 版本 | `ids` 用具体版本号锁死后 producer 升级要同步改 | 推荐 `+` 表示 latest，CI 锁版本通过 `--stubs-classifier` 或 SNAPSHOT 控制 |
| Contract response 字段 | producer 改 Controller 返回字段，但 contract 未同步 → `mvn verify` RED | 改字段必须同步改 contract（这正是 SCC 设计目的：契约即文档+测试） |
| Feign 客户端集成 stub | 项目用 `@FeignClient(name = "order-service")` 但 stub server 是随机端口 | 测试侧配 `@LoadBalancerClient` 让 Feign 走 stub 的 service-id（StubRunner 默认按 artifactId 注册 service） |

## CI 集成（contract-verify stage 三 job matrix）

参考 `templates/.gitlab-ci.yml` §A.4.1 实施：

| Job | 镜像 | 触发规则 | 任务 |
|---|---|---|---|
| `scc-verify` | `maven:3.9-eclipse-temurin-8` | `**/*.java` / `**/*.groovy` / `**/contracts/**` | `mvn install` 一次串起 producer mvn verify (生 stubs) + consumer mvn test (LOCAL 加载) |
| `bff-schema-diff` | `tufin/oasdiff:latest` | `bff-*/**/*.{java,yml,yaml}` | `oasdiff breaking BASE HEAD --fail-on ERR` |
| `spectral-lint` | `node:20-alpine` | `bff-*/**/*.java` | `spectral lint --ruleset ... --fail-severity=error` |

## 与项目侧 lang-java 多层结构的衔接

模板里 producer 把 Controller + VO 平铺在单包是**模板简化**；生产代码按 lang-java module-structure 分层：

```
<svc>-api/
├── controller/OrderController.java       ← 模板的 OrderController.java 拆这里
├── service/OrderService.java             ← 业务逻辑（模板无，因为契约示例直接返常量）
├── service/impl/OrderServiceImpl.java
├── dto/OrderResponseDTO.java             ← 模板的 OrderVO.java（service 层用）
└── vo/OrderVO.java                       ← Controller 返回前转 VO（与 contract response 对齐）
```

Contract 永远定义在 `src/test/resources/contracts/`，包路径子目录可与业务 module 同步：

```
contracts/
├── order/
│   ├── shouldGetOrderById.groovy
│   └── shouldCreateOrder.groovy
└── customer/
    └── shouldGetCustomerProfile.groovy
```

## 复用红线

`skills/lang-java/SKILL.md` §13.A 已有"已有能力优先复用"硬规则。对于契约测试，**禁止**：

- ❌ 自己写 contract DSL（用 SCC 的 Groovy DSL，不要自创 JSON/YAML 格式）
- ❌ 跨服务调用不走 Feign 自己 `RestTemplate` 拼 URL（必须用 `@FeignClient` + LoadBalancer，stub 测试时透明衔接）
- ❌ Stub 服务自己起 WireMock（用 `@AutoConfigureStubRunner` 自动从 stub jar 加载）
- ❌ 不写 contract 直接发版（producer 字段变更必须先改 contract，CI scc-verify 阻断）

## 相关资源

- `skills/qa-contract/SKILL.md` —— /qa-contract 入口骨架
- `skills/qa-contract/assets/spring-cloud-contract/producer/` —— producer 完整 Maven 项目模板（§A.1.2 实跑验证）
- `skills/qa-contract/assets/spring-cloud-contract/consumer/` —— consumer 完整 Maven 项目模板（§A.1.3 实跑验证）
- `skills/qa-contract/assets/pact-broker/docker-compose.yml` —— 本地 Pact Broker 一键起（§A.2.1）
- `skills/qa-contract/assets/bff-knife4j-consumer/` —— BFF Knife4j 链路（codegen + oasdiff + 双 fixture TDD）
- `skills/qa-contract/assets/openapi-spectral/` —— OpenAPI lint + 2 条 Hongzhao 自定义规则
- `templates/.gitlab-ci.yml` —— contract-verify stage 三 job matrix（§A.4.1）
