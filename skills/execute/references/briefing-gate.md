# Briefing Gate — 编码前强制加载上下文

## 概念

Briefing Gate 是编码前的上下文加载门禁。每个编码类任务开始前，必须先加载对应语言包的模块和模板，确保编码有完整上下文。

**违规**: 未做 Briefing 直接调用 Write/Edit 代码文件 = TDD 违规级别。

## Briefing 块结构

编码类任务开始时，必须输出以下结构化 Briefing 块：

```
Briefing 已加载 — Task T{N}
涉及文件:
  + 新增 path/to/File.java → 模板 xxx.md
  + 修改 path/to/Existing.java → 模板 yyy.md
已加载:
  [x] modules/module-structure.md
  [x] templates/service.md
  [x] templates/controller.md
关键约束:
  - [从 checklists.md 对应段粘贴关键约束]
```

## 文件类型 → 模板映射表

### Java 映射（13 种）

| 文件模式 | 加载模板 |
|---------|---------|
| `*Service.java` / `*ServiceImpl.java` | templates/service.md |
| `*Controller.java` | templates/controller.md |
| `*Entity.java` / `*DO.java` | templates/entity.md |
| `*DTO.java` / `*Param.java` | templates/dto.md |
| `*VO.java` / `*Resp.java` | templates/vo.md |
| `*Mapper.java` | templates/mapper.md |
| `*Repository.java` | templates/repository.md |
| `*Document.java` | templates/document.md |
| `*FeignAPI.java` / `*FeignClient.java` | templates/feign-api.md |
| `*.sql` / DDL 文件 | templates/ddl.md |
| `*Test.java` / `*Tests.java` | templates/test-service.md / test-controller.md / test-dto.md |
| `*Config.java` / `*Configuration.java` | 无特定模板 |

### React 映射（11 种）

| 文件模式 | 加载模板 |
|---------|---------|
| `src/api/**/*.ts` | templates/api-module.md + api-types.md |
| `src/api/interface/**/*.ts` | templates/api-types.md |
| `src/hooks/use*.ts` | templates/hooks.md |
| `src/store/**/*.ts` | templates/store.md |
| `src/views/**/index.tsx` | templates/page-list.md 或 modal.md |
| `src/components/**/*.tsx` | templates/modal.md 或 utils.md |
| `src/utils/**/*.ts` | templates/utils.md + to-utility.md |
| `src/router/**/*.tsx` | templates/router.md |
| `src/**/axios*.ts` | templates/axios-instance.md |
| `**/*.test.ts(x)` / `**/*.spec.ts(x)` | templates/test-*.md（按被测类型） |
| `vitest.config.*` / `jest.config.*` | templates/test-config.md |

## 违规判定

| 违规模式 | 判定 |
|---------|------|
| 没输出 Briefing 块就调用 Write/Edit | 违规 |
| Briefing 缺"已加载"段 | 违规（未真正 Read） |
| 文件类型与已加载模板不匹配 | 违规 |
| Briefing 中 Read 的模板不存在 | 违规（加载了不存在的模板） |
| 声称已加载但无 Read 调用记录 | 违规 |

## 与语言包的集成

Briefing 时自动读取匹配的语言包：

1. 检测项目语言栈（pom.xml → lang-java / package.json → lang-react）
2. Read 对应语言包 SKILL.md 的模板加载表
3. 按 Briefing 块涉及文件推断需要的模块和模板
4. Bulk Read: modules/module-structure.md + 对应 templates

## maturity 联动

| maturity | Briefing 行为 |
|----------|-------------|
| mature | 完整 Briefing 流程（三件套 + templates + checklists） |
| preview | 暂行规则提示（仅 tech-stack + 基础模板） |
| 无语言包 | 跳过 Briefing Gate（无强制加载） |

## 与 tool-call-sequence.md 的协同

Briefing Gate 对应 tool-call-sequence.md 的 Step 0（Read 语言包 modules + templates）。

完整编码顺序:
1. **Briefing Gate** (本文件) → Read 语言包上下文
2. **Baseline** → Bash 运行测试确认全绿
3. **RED** → Write 测试 + Bash 确认 FAIL
4. **GREEN** → Write 实现 + Bash 确认 PASS
5. **REFACTOR** → Edit 重构 + Bash 重跑
6. **Commit** → Bash 提交代码 + Edit 更新 PLAN.md

Briefing 不读 = 编码门违规，等同于 tool-call-sequence Step 0 缺失。
