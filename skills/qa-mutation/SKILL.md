# 变异测试

---
name: qa-mutation
description: "变异测试质量观察哨：PIT(Java) + Stryker(React/TS)，A/B/C/D 四级评级，建议 schedule-only"
---

变异测试质量观察哨，通过注入代码变异验证测试套件的缺陷检测能力。

## 触发场景

- Nightly schedule（推荐）
- 首次变异测试基线
- 季度测试质量审查

**建议 schedule-only，不阻塞 CI 主流程。**

## 前置条件

- Java: PIT 已配置（pom.xml）
- React/TS: Stryker 已配置（stryker.config.json）

## 流程

### Step 1: 检测语言栈

- `pom.xml` → Java（PIT）
- `package.json` → React/TS（Stryker）

### Step 2: 复制配置到项目

按 `references/mutation-scoring.md` 的配置模板生成项目配置。

### Step 3: 跑变异测试

- Java: `mvn pitest:mutationCoverage`
- React: `npx stryker run`

### Step 4: 解析报告 + 计算评分

- Java: 解析 `mutations.xml` → score = killed / total
- React: 解析 `mutation.json` → mutationScore

### Step 5: 输出评级 + 报告

## 评级体系

| 等级 | 覆盖率 | 建议动作 |
|------|--------|---------|
| A | ≥80% | 优秀，维持 |
| B | 60-79% | 良好，建议补强关键路径 |
| C | 40-59% | 需改进，补测试后重跑 |
| D | <40% | 警告，测试覆盖严重不足 |

默认阈值 60（B 级底线），可在项目配置覆盖到 80/60/50 三档。

## 参考文件

- [references/mutation-scoring.md](references/mutation-scoring.md) — PIT + Stryker 配置模板 + 评级详解
