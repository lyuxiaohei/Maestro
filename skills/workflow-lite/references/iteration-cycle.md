# 迭代循环流程

轻量工作流的核心循环：discuss → plan → execute → verify。每个循环称为一次"迭代"。

## Discuss（讨论）

1. 读取 workflow.md 获取目标和已有决策
2. 如 CONTEXT.md 已存在，读取上次决策作为上下文
3. 用 AskUserQuestion 逐项澄清：
   - 范围边界（做什么、不做什么）
   - 技术方案选择
   - 优先级排序
4. 将决策记录为 D-01、D-02... 写入 CONTEXT.md
5. 更新 workflow.md：当前迭代 step=plan

## Plan（规划）

1. 读取 CONTEXT.md 中的决策
2. 分解为具体任务列表，编号 T-01、T-02...
3. 标注任务依赖关系
4. 写入 PLAN.md
5. 向用户展示计划摘要，等待确认或修改
6. 确认后更新 workflow.md：step=execute

## Execute（执行）

1. 读取 PLAN.md 的任务列表
2. 按 T-01、T-02... 顺序逐项执行
3. 每完成一项在 PLAN.md 中标记 ✅
4. 全部完成后更新 workflow.md：step=verify

## Verify（验证）

1. 读取 PLAN.md 对照实际变更
2. 逐项检查：是否完成、是否符合决策约束
3. 写入 VERIFICATION.md，列出 PASS/FAIL 项
4. 向用户展示验证摘要

**判定结果：**
- 全部 PASS 且目标已达成 → 更新 workflow.md status=complete（single 模式）或处理下一任务（multi 模式）
- 存在 FAIL 或目标未达 → iteration+1，step=discuss，开启新一轮循环

## 迭代产物的覆盖策略

每次新迭代开始时，CONTEXT.md、PLAN.md、VERIFICATION.md 被覆盖写。如需保留历史，在 workflow.md 的迭代历史表中记录关键信息即可。
