# 自动 MR/PR 生成

---
name: gen-mr
description: "自动生成 Merge Request / Pull Request：从工作流文档提取变更说明，支持 GitLab MR + GitHub PR"
---

验证通过后自动生成 Merge Request 或 Pull Request，从工作流文档提取描述信息。

## 触发场景

- 阶段验证通过后
- 用户请求生成 MR/PR
- 编码完成准备合并

## 前置条件

- 当前分支已推送到远程
- 工作流文档存在（CONTEXT.md / PLAN.md / OUTPUT.md）

## 流程

### Step 1: 读取工作流信息

- `CONTEXT.md` → 提取决策和需求描述
- `PLAN.md` → 提取任务列表和完成状态
- `OUTPUT.md` → 提取变更明细（如有）
- `SUMMARY.md` → 提取执行摘要（如有）

### Step 2: 生成 MR 标题

格式: `[{slug}] {一句话摘要}`

示例: `[user-center] 添加订单管理模块的 CRUD 接口`

### Step 3: 生成 MR 描述

```markdown
## 变更说明
{从 CONTEXT.md Locked Decisions 提取}

## 成功标准
{从 PLAN.md 任务列表提取验收标准}

## 技术方案
{从 OUTPUT.md 变更明细提取}

## 测试验证
{从 SUMMARY.md 执行摘要提取}

## 关联文档
- CONTEXT.md: {workflow_base}/CONTEXT.md
- PLAN.md: {workflow_base}/PLAN.md
```

### Step 4: 确认 Reviewers

- 检查 CODEOWNERS 文件
- 用户指定 reviewers
- 默认: 无

### Step 5: 创建 MR/PR

**GitLab MR**:
```bash
glab mr create --title "{title}" --description "{body}" --target-branch main
```

**GitHub PR**:
```bash
gh pr create --title "{title}" --body "{body}" --base main
```

## Maestro 路径适配

| devkit 路径 | Maestro 路径 |
|------------|-------------|
| openspec/changes/{id}/proposal.md | .planning/{version}/workflows/{slug}/CONTEXT.md |
| openspec/changes/{id}/design.md | .planning/{version}/workflows/{slug}/PLAN.md |

## 完成

- MR/PR 已创建，返回 URL
- 描述包含完整的变更说明和测试验证
