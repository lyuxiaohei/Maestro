# 契约测试配置模式

## Spring Cloud Contract 配置

### Producer 端

```xml
<!-- pom.xml -->
<dependency>
  <groupId>org.springframework.cloud</groupId>
  <artifactId>spring-cloud-starter-contract-verifier</artifactId>
  <version>3.1.7+</version>
  <scope>test</scope>
</dependency>

<plugin>
  <groupId>org.springframework.cloud</groupId>
  <artifactId>spring-cloud-contract-maven-plugin</artifactId>
  <version>3.1.7+</version>
  <extensions>true</extensions>
</plugin>
```

### contracts/ 目录布局

```
src/test/resources/contracts/
├── {consumer-name}/
│   ├── shouldReturnOrderById.groovy
│   └── shouldCreateOrder.groovy
```

### *Base.java 基类约定

```java
@ExtendWith(MockitoExtension.class)
public abstract class OrderContractBase {
    @Mock private OrderService orderService;

    @BeforeEach
    void setup() {
        // setup mock responses
        given(orderService.getById(1L)).willReturn(order);
    }

    // REST controller setup for contract testing
}
```

### Consumer 端

```java
@AutoConfigureStubRunner(
    ids = "com.example:order-service:+:stubs",
    stubsMode = StubRunnerProperties.StubsMode.LOCAL
)
@SpringBootTest
class OrderConsumerContractTest { ... }
```

## OpenAPI Lint 模式

### Spectral 规则

```yaml
# .spectral.yaml
extends: ["spectral:oas"]
rules:
  info-matches-version:
    given: "$.info"
    then:
      field: "version"
      function: pattern
      functionOptions:
        match: "^\\d+\\.\\d+\\.\\d+$"
```

### oasdiff 破坏性变更检测

```bash
# 对比两个版本的 OpenAPI spec
oasdiff breaking base.yaml revision.yaml

# 输出格式: BREAKING CHANGE 或 NO BREAKING CHANGES
```

## CI 集成

### GitLab CI

```yaml
contract-verify:
  stage: test
  script:
    - mvn verify -Pcontract
  artifacts:
    paths:
      - target/stubs/
```

### GitHub Actions

```yaml
- name: Contract Tests
  run: mvn verify -Pcontract
```

## Maestro 适配

| devkit 路径 | Maestro 路径 |
|------------|-------------|
| openspec/changes/{id}/ | .planning/{version}/workflows/{slug}/ |

契约测试结果记录到工作流 OUTPUT.md 中。
