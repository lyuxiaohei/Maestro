# 变异测试评分标准

## 评级详解

| 等级 | 覆盖率 | 含义 | 建议动作 |
|------|--------|------|---------|
| A | ≥80% | 测试能捕获大部分变异，测试质量优秀 | 维持，关注新增代码 |
| B | 60-79% | 测试能捕获多数变异，质量良好 | 建议补强核心业务路径的断言 |
| C | 40-59% | 测试缺陷检测能力不足 | 补充边界测试和异常路径测试 |
| D | <40% | 测试覆盖严重不足，变异几乎全存活 | 优先补充 happy path 测试 |

## PIT 配置（Java）

### Maven Plugin

```xml
<plugin>
  <groupId>org.pitest</groupId>
  <artifactId>pitest-maven</artifactId>
  <version>1.16.1</version>
  <configuration>
    <mutationThreshold>60</mutationThreshold>
    <mutators>
      <mutator>STRONGER</mutator>
    </mutators>
    <targetClasses>
      <param>com.example.service.*</param>
    </targetClasses>
    <targetTests>
      <param>com.example.service.*Test</param>
    </targetTests>
    <outputFormats>
      <format>XML</format>
      <format>HTML</format>
    </outputFormats>
  </configuration>
</plugin>
```

### 运行命令

```bash
mvn pitest:mutationCoverage
```

### 报告解析

`target/pit-reports/mutations.xml`:
```xml
<mutations>
  <mutation detected="true" status="KILLED">...</mutation>
  <mutation detected="false" status="SURVIVED">...</mutation>
</mutations>
```

score = killed / (killed + survived) × 100

## Stryker 配置（React/TypeScript）

### stryker.config.json

```json
{
  "$schema": "./node_modules/@stryker-mutator/core/schema/stryker-schema.json",
  "packageManager": "npm",
  "testRunner": "vitest",
  "coverageAnalysis": "perTest",
  "mutate": ["src/**/*.ts", "src/**/*.tsx", "!src/**/*.test.*", "!src/**/*.spec.*"],
  "thresholds": { "high": 80, "low": 60, "break": 40 },
  "reporters": ["html", "json", "clear-text"]
}
```

### 运行命令

```bash
npx stryker run
```

### 报告解析

`reports/mutation/mutation.json`:
```json
{
  "mutationScore": 72.5,
  "killed": 145,
  "survived": 55,
  "timeout": 3
}
```

## Node 版本兼容性

| Node 版本 | Stryker 版本 | 说明 |
|----------|-------------|------|
| 18.x | 7.x | 稳定版 |
| 20.x | 8.x | 推荐，最新特性 |

## CI 集成（schedule-only）

### GitLab CI

```yaml
mutation-test:
  stage: test
  rules:
    - if: $CI_PIPELINE_SOURCE == "schedule"
  script:
    - mvn pitest:mutationCoverage
  artifacts:
    paths:
      - target/pit-reports/
```

### GitHub Actions

```yaml
mutation-test:
  if: github.event_name == 'schedule'
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - run: mvn pitest:mutationCoverage
```

## 复用红线

**应跑变异测试的代码**:
- 核心业务逻辑（Service 层）
- 纯函数 / 工具类
- 状态转换逻辑
- 数据校验规则

**不应跑变异测试的代码**:
- 纯数据类（Entity/DTO/VO）
- 框架配置类
- 第三方封装层
- 简单委托方法
