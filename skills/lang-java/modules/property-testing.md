# Property Testing —— jqwik 约定（Java）

> 属性测试用约束生成成百上千组输入，逼出 example-based 测试漏掉的 corner case。**新增纯函数 / 容器操作 / 状态机时建议加 @Property**，比手写 5-10 个 example 覆盖度高一个数量级。

## 技术栈

| 组件 | 版本 | 用途 |
|---|---|---|
| jqwik | 1.8.4 | JUnit5 Platform 上的 property testing engine |
| Java | 8 (1.8.0_202) | jqwik 1.x 兼容 Java 8+ |
| JUnit 5 | 5.10.x | 与 jqwik 共享 platform；example-based 测试仍用 `@Test` |
| Hongzhao framework | 集成 jqwik 时按 test-patterns.md 走 minimal TestApp 或纯 unit | 容器装载 不必要时跳过加速到 ~10ms |

## Maven 依赖

```xml
<dependencies>
  <!-- 仅在 test scope；与 Spring Boot Starter Test 共存 -->
  <dependency>
    <groupId>net.jqwik</groupId>
    <artifactId>jqwik</artifactId>
    <version>1.8.4</version>
    <scope>test</scope>
  </dependency>
  <!-- 已有 spring-boot-starter-test 拉了 JUnit 5；不要再单独引 junit-jupiter -->
</dependencies>
```

> **不要**引 jqwik-spring（社区扩展，目前与 Spring Boot 2.7.18 集成栈不稳）。需要 Spring 容器的属性测试改用 example-based + jqwik 联合（见 §"与 Hongzhao framework 集成"）。

## 5 个示例（覆盖纯函数 / 容器 / 状态机）

### 示例 1：纯函数 —— String reverse 自反性

```java
package com.hongzhao.example.property;

import net.jqwik.api.Property;
import net.jqwik.api.ForAll;
import org.assertj.core.api.Assertions;

class StringReverseProperty {

    @Property
    boolean reverseTwiceIsIdentity(@ForAll String s) {
        return new StringBuilder(new StringBuilder(s).reverse().toString()).reverse().toString().equals(s);
    }

    @Property
    boolean reverseLengthEquals(@ForAll String s) {
        return new StringBuilder(s).reverse().length() == s.length();
    }
}
```

### 示例 2：纯函数 —— 金额格式化不抛异常 + 单调

```java
import net.jqwik.api.Property;
import net.jqwik.api.ForAll;
import net.jqwik.api.constraints.LongRange;
import java.math.BigDecimal;

class MoneyFormatterProperty {

    /** 公司金额格式化工具，分→元，保留 2 位 */
    static String format(long cents) {
        return new BigDecimal(cents).movePointLeft(2).setScale(2).toPlainString();
    }

    @Property
    boolean noExceptionForAnyValidAmount(@ForAll @LongRange(min = 0, max = 1_000_000_00L) long cents) {
        format(cents);  // 应不抛
        return true;
    }

    @Property
    boolean monotonicWithInput(@ForAll @LongRange(min = 0, max = 999_99L) long a,
                                @ForAll @LongRange(min = 1, max = 100L) long delta) {
        return new BigDecimal(format(a + delta)).compareTo(new BigDecimal(format(a))) >= 0;
    }
}
```

### 示例 3：容器 —— List 排序后 first <= last

```java
import net.jqwik.api.Property;
import net.jqwik.api.ForAll;
import net.jqwik.api.constraints.Size;
import java.util.*;

class SortInvariantProperty {

    @Property
    boolean sortedFirstLeqLast(@ForAll @Size(min = 1, max = 100) List<Integer> xs) {
        List<Integer> copy = new ArrayList<>(xs);
        Collections.sort(copy);
        return copy.get(0) <= copy.get(copy.size() - 1);
    }

    @Property
    boolean sortPreservesSize(@ForAll List<Integer> xs) {
        List<Integer> copy = new ArrayList<>(xs);
        Collections.sort(copy);
        return copy.size() == xs.size();
    }
}
```

### 示例 4：容器 —— Map merge 幂等

```java
import net.jqwik.api.Property;
import net.jqwik.api.ForAll;
import java.util.*;

class MapMergeProperty {

    static Map<String, Integer> merge(Map<String, Integer> a, Map<String, Integer> b) {
        Map<String, Integer> out = new HashMap<>(a);
        b.forEach((k, v) -> out.merge(k, v, Integer::sum));
        return out;
    }

    @Property
    boolean mergeWithEmptyIsIdentity(@ForAll Map<String, Integer> a) {
        return merge(a, Collections.emptyMap()).equals(a);
    }

    @Property
    boolean mergeKeySetIsUnion(@ForAll Map<String, Integer> a, @ForAll Map<String, Integer> b) {
        Set<String> expected = new HashSet<>(a.keySet());
        expected.addAll(b.keySet());
        return merge(a, b).keySet().equals(expected);
    }
}
```

### 示例 5：状态机 —— 库存扣减/回补一致性

```java
import net.jqwik.api.Property;
import net.jqwik.api.ForAll;
import net.jqwik.api.constraints.IntRange;
import java.util.List;

class StockStateMachineProperty {

    enum Op { DEDUCT, ADD }

    /** 库存模型：deduct(n) 当 stock>=n 才扣，否则 noop；add(n) 直接加。 */
    static int apply(int stock, Op op, int n) {
        if (op == Op.DEDUCT) return stock >= n ? stock - n : stock;
        return stock + n;
    }

    @Property
    boolean stockNeverNegative(@ForAll @IntRange(min = 0, max = 10_000) int initial,
                                @ForAll List<@IntRange(min = 1, max = 100) Integer> deducts) {
        int stock = initial;
        for (int n : deducts) stock = apply(stock, Op.DEDUCT, n);
        return stock >= 0;
    }

    @Property
    boolean deductThenAddPreservesOrIncreases(@ForAll @IntRange(min = 0, max = 1_000) int initial,
                                                @ForAll @IntRange(min = 1, max = 100) int n) {
        int after = apply(apply(initial, Op.DEDUCT, n), Op.ADD, n);
        return after >= initial;  // 扣失败时 after = initial + n > initial；扣成功时 after = initial
    }
}
```

## 与 JUnit 5 / Hongzhao framework 集成

### 单独跑属性测试

```bash
# 跑某个 @Property 类
mvn test -Dtest=StringReverseProperty

# 跑全部 @Property (jqwik 自动被 JUnit 5 Platform 发现，与 @Test 一起跑)
mvn test
```

### 与 Spring 容器的关系

- **不需要 Spring 容器的纯函数 / 容器 / 状态机**：直接 `@Property`，~10ms/200 个 example
- **需要 Service Bean 注入的业务逻辑**：改 example-based `@Test` + jqwik `@ForAll` 不混用（jqwik-spring 不稳）；或者把 service 抽成纯静态工具 + property 跑工具层
- **Hongzhao framework 测试场景**：见 `modules/test-patterns.md` minimal TestApp + 17 条必填属性，property 测试通常跑在 unit 层不进 SpringExtension

## 典型陷阱

1. **`@ForAll List<Integer>` 默认 size 0-50**：跑 list 不设 `@Size` 时会产生空 list 触发 IndexOutOfBoundsException —— 必须 `@Size(min = 1)` 或代码加判空
2. **`@ForAll String` 默认 unicode 范围广**：会生成 控制字符 / surrogate / 表情符号 —— BigDecimal/JSON parse 容易炸；按场景加 `@CharRange` / `@StringLength` 收窄
3. **shrink 慢**：失败时 jqwik 会"缩小"输入找最小反例，复杂结构（嵌套 Map）shrink 可能耗时 30s+ —— 用 `@Property(shrinking = ShrinkingMode.OFF)` 在 CI 关掉
4. **try 次数默认 1000**：与 unit 测试比慢 100×；CI 跑超时风险高 —— 用 `@Property(tries = 100)` 收窄
5. **不要在 `@Property` 里写 mock**：mock 会破坏纯函数语义，反复 try 同一 mock state 不稳；mock 场景留给 `@Test`
6. **jqwik 1.8.x 与 Java 8**：✅ 兼容；切勿升 jqwik 2.x（要求 Java 17）

## CI 集成

属性测试默认随 `mvn test` 一起跑（jqwik 走 JUnit 5 Platform 发现）。不需要单独 stage。

```yaml
# .gitlab-ci.yml （已有 unit-tests-java stage 自动覆盖 @Property，无需新增）
unit-tests-java:
  stage: test
  image: maven:3.9-eclipse-temurin-21
  script:
    - mvn $MAVEN_CLI_OPTS test -q
  artifacts:
    when: always
    reports:
      junit:
        - target/surefire-reports/TEST-*.xml  # jqwik 生成的报告也在这里
```

## 与 RED → GREEN → REFACTOR 循环

- **RED 阶段**：写 `@Property` 表达不变量 → 跑 `mvn test` 看 jqwik shrink 出最小反例 → 实现可以从 0 开始 → 反例先通过
- **GREEN 阶段**：实现填 → `@Property` 在 1000 try 内全过 → PASS
- **REFACTOR 阶段**：`@Property` 是回归网 —— 重构后跑 1000 个新输入仍 PASS 证明语义不变
- 详见 `skills/build/SKILL.md` 的 TDD 段（含属性测试占位说明）

## 复用红线

- ✅ 纯函数 / 数据结构操作 / 状态机 → 优先 `@Property`
- ✅ 边界值（0、负数、空、超长）→ jqwik 自动生成比手写 example 全
- ⚠️ Service 层涉及数据库 / 外部 RPC → 用 `@Test` 不用 `@Property`（IO 不能 1000 次重复）
- ❌ 不要为了用 jqwik 而把业务逻辑硬塞进纯函数 —— 业务复杂性属于 Service，property 测试服务于工具层

## 相关资源

- 官网：https://jqwik.net/
- 与 JUnit 5 集成：https://jqwik.net/docs/current/user-guide.html#junit5-extension
- Constraint annotations 全表：https://jqwik.net/docs/current/user-guide.html#constraining-default-generation
- 与 `modules/test-patterns.md`（Spring 集成测试场景的边界判断）配套
