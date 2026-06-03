# 测试自愈 — AI 填实 + 自动修复

---
name: gen-test-run
description: "测试自愈 Pipeline：消费 gen-test-cases 产出 → AST 解析骨架 → AI 填实 → 实跑 → 失败自愈（2次retry）→ AI_GAVE_UP 降级"
---

消费 gen-test-cases 产出的测试骨架，通过 AST 解析 + AI 推断填实断言，实跑并自动修复失败测试。

## 触发场景

- gen-test-cases 产出需要实跑验证
- CI 前本地测试验证
- 测试修复循环

## 前置条件

- 已有 gen-test-cases 产出（test-cases.md + 骨架代码）
- 目标测试框架就绪（JUnit 5 / Vitest / Playwright）

## Pipeline（5 步）

### Step 1: 检查测试框架就绪

- Java: `mvn --version` + 测试依赖存在
- React: `npx vitest --version` + 测试配置存在
- 输出就绪状态，未就绪则 STOP

### Step 2: 按 strategy 准备 mock 数据

| strategy | mock 方式 |
|----------|----------|
| e2e | 直连真后端（不 mock） |
| component | ts-morph + fixtures |
| integration | DTO 自反射 |

### Step 3: AST 解析骨架 → AI 填实 happy 断言

按 `references/ast-patterns.md` 定位骨架中的 PASS_NOT_YET 占位，AI 推断填实：
- Java: 搜索 `Assertions.fail("PASS_NOT_YET...")` 行
- React/TS: 搜索 `throw new Error('PASS_NOT_YET...')` 行

填实代码写到 `.GENERATED` 后缀文件（保留原骨架便于 diff review）。

### Step 4: 实跑测试

- Java: `mvn test -Dtest={TestClass}`
- React: `npx vitest run {path}`
- 收集 stdout + stderr

### Step 5: 失败自愈（最多 2 次 retry）

- **retry 1**: AI 分析 stderr → 调整选择器/断言 → 重跑
- **retry 2**: AI 更激进调整（改 mock 数据优先级）→ 重跑
- **retry 3 仍失败**: 标记 `AI_GAVE_UP`，写入失败 trace 供人接手

## 输出

- `.GENERATED` 后缀文件（填实代码）
- `test-run-report.md`（PASS/FAIL/AI_GAVE_UP 统计）
- 每个填实文件顶部含 AI marker:
  ```
  // AI-GENERATED: review business correctness before merge
  // Filled by gen-test-run at {timestamp}
  // happy_path source: test-cases.md TC-{id}
  // retry_count: {0|1|2}
  ```

## 完成标准

- [ ] 至少 1 case 跑通 happy path
- [ ] 或留 AI_GAVE_UP 报告供人接手
- [ ] 所有 .GENERATED 文件含 AI marker

## Maestro 路径适配

| devkit 原始 | Maestro |
|------------|---------|
| test/cases/{change_id}/ | .planning/{version}/workflows/{slug}/test-cases/ |

## 参考文件

- [references/ast-patterns.md](references/ast-patterns.md) — AST 模式 + retry 策略 + AI marker 规范
