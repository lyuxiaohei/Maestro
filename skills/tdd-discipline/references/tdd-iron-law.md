# TDD Iron Law — 完整规则

## 铁律完整解释

代码先于测试写出来了？删掉。从头开始。

**没有例外：**
- 不能"留作参考"
- 不能"边写测试边改它"
- 不能再看它一眼
- 删就是删

从测试出发，重新实现。Period.

## 为什么顺序重要

### "我事后写测试也能验证"

事后写的测试马上就通过。马上通过证明不了任何事：可能测了错的东西、可能测的是实现细节、可能漏掉你忘记的边界。

测试先行，强迫你看到测试失败，证明它真的在测什么。

### "我已经手动测了所有边界"

手测是即兴的。没有记录、代码改了不能复跑、压力下容易忘 case。

### "已经写了 X 小时代码，删掉浪费"

沉没成本谬误。保留未验证的代码是技术债。

### "TDD 教条，务实点应该灵活"

TDD 就是务实：提交前发现 bug（比生产 debug 快）、防回归、文档化行为、让重构变可能。

### "事后测试也能达到同样目标"

不。事后测试回答"这段代码做了啥"；事前测试回答"这段代码应该做啥"。事后测试受实现偏见污染。

## 常见合理化借口

| 借口 | 现实 |
|------|------|
| "太简单不用测" | 简单代码也会坏。测试 30 秒就写完 |
| "我事后再测" | 马上通过的测试证明不了任何事 |
| "事后测试达到同样目标" | 事后 = "这做了啥"；事前 = "这应该做啥" |
| "我已经手动测过" | 即兴 ≠ 系统。无记录、不可复跑 |
| "删掉 X 小时浪费" | 沉没成本谬误。保留未验证的代码是技术债 |
| "保留作参考，先写测试" | 你会改它。那就是事后测试。删就是删 |
| "需要先探索一下" | 可以。然后扔掉探索代码，从 TDD 开始 |
| "测起来难 = 设计不清楚" | 听测试的话。难测试 = 难使用 |
| "TDD 让我变慢" | TDD 比 debug 快。务实 = 测试先行 |
| "手测更快" | 手测无法证明边界。每次改代码还要重测 |
| "已有代码也没测试" | 那你正在改进它。给已有代码补测试 |

## 红旗信号 — 立刻停下从头来

- 实现先于测试
- 测试是事后补的
- 测试马上就通过了
- 不能解释测试为什么失败
- 测试"稍后再补"
- 合理化"就这一次"
- "我已经手动测过了"
- "事后测试也是同样目的"
- "留作参考"或"改造已有代码"
- "已经花了 X 小时，删了浪费"
- "TDD 教条，我在务实"
- "这次情况特殊，因为……"

**以上任何一项 = 删代码，用 TDD 从头开始。**

## 违规判定表

| 违规模式 | 判定依据 |
|----------|---------|
| 实现先于测试 | Write(impl) 出现在 Write(test) 之前 |
| 测试没跑就写实现 | Write(test) → Write(impl)，中间无 Bash(test) |
| 测试覆盖已有行为 | Bash(test) 输出 PASS 但这是新测试 |
| 根本没写测试 | Write(impl) → Bash(PASS)，无任何测试文件 |
| 未做 Briefing | 无 Read(template) 但已 Write(impl) |

## Bug 修复完整示例

**Bug**: 空邮箱被接受

**RED**:
```java
@Test
void shouldRejectEmptyEmail() {
    SubmitResult result = service.submit(FormData.of("email", ""));
    assertThat(result.getError()).isEqualTo("Email required");
}
```

**验证 RED**:
```bash
$ mvn test -Dtest=FormServiceTest#shouldRejectEmptyEmail
FAILED: expected 'Email required' but was null
```

**GREEN**:
```java
public SubmitResult submit(FormData data) {
    if (StringUtils.isBlank(data.getEmail())) {
        return SubmitResult.error("Email required");
    }
    // ...
}
```

**验证 GREEN**:
```bash
$ mvn test -Dtest=FormServiceTest#shouldRejectEmptyEmail
PASS
```

**REFACTOR**: 如有多字段需要类似校验，提取通用 validator。

## 测试反模式

- 测的是 mock 行为而非真实行为
- 给生产类加只在测试里用的方法
- 不理解依赖就 mock
- 不完整的 mock 数据

## 与 Maestro 工具调用顺序的协同

references/tool-call-sequence.md 定义了编码类任务的 9 步工具调用顺序，是本 Iron Law 的执行端体现。两者一致：
- 本文档提供原则、合理化借口表、红旗信号
- tool-call-sequence.md 提供可机器检查的工具调用序列和违规判定
