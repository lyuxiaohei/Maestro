# prototype-design 文件结构对比（V0.4 → V0.5）

> 版本号已于 V0.5 归零。旧版本对应关系：V1.0=V0.1, V2.0=V0.2, V2.1=V0.3, V3.0=V0.4, V3.5=V0.5。
> V3.2、V3.3、V3.4 为 V0.4 内的增量迭代，归入 V0.4。

## V0.4 文件结构（22个文件）

```
prototype-design/
├── SKILL.md                              28,694B    主技能文件（路由+规范+组件+模板+资源）
├── reference.md                          16,767B    后台设计规范详细补充（根目录，未被SKILL.md引用）
│
├── rules/                                           模式识别与解析规则
│   ├── draft-parser.md                    8,240B    草案解析规则
│   ├── keyword-extractor.md               8,214B    口述关键词提取规则
│   ├── mode-detect.md                     4,582B    模式自动检测规则
│   └── page-type-inferencer.md            7,176B    页面类型推断规则
│
├── mappings/                                        草案→UI映射规则
│   ├── field-to-ui-element.md             9,353B    字段→UI元素映射
│   ├── navigation-to-flow.md              7,986B    页面导航→跳转映射
│   ├── state-to-interaction.md            8,918B    状态流转→交互映射
│   └── use-case-to-component.md           9,083B    功能用例→组件映射
│
├── validators/                                      输入输出验证
│   ├── input-validator.md                 8,857B    输入验证规则
│   └── output-validator.md                9,545B    输出HTML验证规则
│
└── reference/                                       参考资料
    └── draft-input-example.md            17,869B    草案输入示例
```

## V0.4 增量迭代（V3.2 阶段，21个文件）

```
prototype-design/
├── SKILL.md                              17,726B    主技能文件（路由+色彩+布局+索引）
├── README.md                              2,930B    仓库说明、文件结构、版本历史
├── reference.md                          16,767B    后台设计规范详细补充（仍待归位）
├── 技能链协作指南.md                       3,629B    技能链协作说明
│
├── rules/                                           模式识别与解析规则
│   ├── draft-parser.md                    8,240B    草案解析规则
│   ├── keyword-extractor.md               8,214B    口述关键词提取规则
│   ├── mode-detect.md                     4,582B    模式自动检测规则
│   └── page-type-inferencer.md            7,176B    页面类型推断规则
│
├── mappings/                                        草案→UI映射规则
│   ├── field-to-ui-element.md             9,353B    字段→UI元素映射
│   ├── navigation-to-flow.md              7,986B    页面导航→跳转映射
│   ├── state-to-interaction.md            8,918B    状态流转→交互映射
│   └── use-case-to-component.md           9,083B    功能用例→组件映射
│
├── validators/                                      输入输出验证
│   ├── input-validator.md                 8,857B    输入验证规则
│   └── output-validator.md                9,545B    输出HTML验证规则
│
├── components/                           [新增]      组件CSS规范
│   ├── backend-components.md              1,334B    后台组件（按钮/网格/分页/分类树）
│   └── miniprogram-components.md          4,432B    小程序组件（框架/导航/Tab/卡片/弹窗等）
│
├── templates/                            [新增]      页面HTML模板
│   ├── backend-template.md                1,098B    后台页面骨架
│   └── miniprogram-template.md            1,163B    小程序页面骨架
│
└── reference/                                       参考资料
    ├── draft-input-example.md            17,869B    草案输入示例
    ├── resources.md                       1,764B    图标/图片素材网站推荐    [新增]
    └── svg-icons.md                       2,145B    小程序SVG图标代码库      [新增]
```

## V0.4 增量迭代（V3.3 阶段，22个文件）

```
prototype-design/
├── SKILL.md                              17,881B    主技能文件（路由+色彩+布局+索引）
├── README.md                              2,930B    仓库说明、文件结构、版本历史
├── 技能链协作指南.md                       3,629B    技能链协作说明
│
├── rules/                                           模式识别与解析规则
│   ├── draft-parser.md                    8,240B    草案解析规则
│   ├── keyword-extractor.md               8,214B    口述关键词提取规则
│   ├── mode-detect.md                     4,582B    模式自动检测规则
│   └── page-type-inferencer.md            7,176B    页面类型推断规则
│
├── mappings/                                        草案→UI映射规则
│   ├── field-to-ui-element.md             9,353B    字段→UI元素映射
│   ├── navigation-to-flow.md              7,986B    页面导航→跳转映射
│   ├── state-to-interaction.md            8,918B    状态流转→交互映射
│   └── use-case-to-component.md           9,083B    功能用例→组件映射
│
├── validators/                                      输入输出验证
│   ├── input-validator.md                 8,857B    输入验证规则
│   └── output-validator.md                9,545B    输出HTML验证规则
│
├── components/                                       后台/小程序组件规范
│   ├── backend-components.md              1,334B    后台组件CSS（按钮/网格/分页/分类树）
│   ├── backend-reference.md              16,767B    后台详细规范（色彩/布局/表单/动画/响应式）  ← 从根目录移入
│   └── miniprogram-components.md          4,432B    小程序组件CSS（框架/导航/Tab/卡片/弹窗等）
│
├── templates/                                        页面HTML模板
│   ├── backend-template.md                1,098B    后台页面骨架
│   └── miniprogram-template.md            1,163B    小程序页面骨架
│
├── reference/                                        参考资料
│   ├── draft-input-example.md            17,869B    草案输入示例
│   ├── resources.md                       1,764B    图标/图片素材网站推荐
│   └── svg-icons.md                       2,145B    小程序SVG图标代码库
│
└── docs/                                            文档
    └── file-structure-comparison.md       5,300B    版本文件结构对比文档      [新增]
```

## 变化对比

| 指标 | V0.4 (V3.0) | V0.4 (V3.2) | V0.4 (V3.3) | V0.5 |
|------|------|------|------|------|
| 文件总数 | 13 | 21 | 22 | 22 |
| 新增目录 | - | `components/`、`templates/` | `docs/` | - |
| SKILL.md 大小 | 28,694B | 17,726B | 17,881B | 6,275B |
| SKILL.md 行数 | 942行 | 460行 | 462行 | 159行 |
| 根目录散落文件 | 2个 | 3个 | 3个 | 3个 |
| 文件总数 | 13 | 21 | 22 |
| 新增目录 | - | `components/`、`templates/` | `docs/` |
| SKILL.md 大小 | 28,694B | 17,726B | 17,881B |
| SKILL.md 行数 | 942行 | 460行 | 462行 |
| 根目录散落文件 | 2个（SKILL.md、reference.md） | 3个（+README.md、技能链协作指南） | 2个（SKILL.md、README.md、技能链协作指南） |

### V0.4 内 V3.0 → V3.2 变更

| 操作 | 内容 | 新位置 |
|------|------|--------|
| 拆出 | 后台组件CSS | `components/backend-components.md` |
| 拆出 | 后台HTML模板 | `templates/backend-template.md` |
| 拆出 | 小程序组件CSS | `components/miniprogram-components.md` |
| 拆出 | 小程序HTML模板 | `templates/miniprogram-template.md` |
| 拆出 | 资源推荐网站 | `reference/resources.md` |
| 拆出 | SVG图标代码 | `reference/svg-icons.md` |
| 拆出 | 版本历史 | `README.md` |
| 新增 | 仓库说明 | `README.md` |

### V0.4 内 V3.2 → V3.3 变更

| 操作 | 内容 | 说明 |
|------|------|------|
| 移动 | `reference.md` → `components/backend-reference.md` | 后台规范详细补充归入 components/，与 backend-components.md 互补 |
| 新增 | SKILL.md 补充引用链接 | 模型生成后台页面时按需读取 backend-reference.md |
| 新增 | `docs/file-structure-comparison.md` | 版本文件结构对比文档 |

### 始终未变更的文件（V0.4 全程内容完全一致）

- `rules/` 全部4个文件
- `mappings/` 全部4个文件
- `validators/` 全部2个文件
- `reference/draft-input-example.md`
