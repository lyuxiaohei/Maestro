# hz_platform 业务能力索引（业务侧）

> **设计/开发前必查**。本平台的所有业务横切能力（支付、短信、消息、文件、商城内容、导入导出、敏感词、序列号、ERP/OMS 集成）都已落在 **hz-empower** 服务，跨服务通过 Feign 调用。基础工具（Redis 客户端、Excel、防重提交、状态机、统一响应 R<T>、业务枚举）都在 **hz-service-common**，引依赖直接用。
>
> 来源：
> - `hz_platform/hz-support/hz-empower/`（hz-empower-api + hz-empower-service）
> - `hz_platform/hz-service-common/`（hz-common-core + hz-common-dependency）
>
> 用户可根据本平台实际情况增删条目；hz-empower 新增 Feign API 后必须在此登记，否则会被其他业务线重复实现。

---

## 0. 速查决策表（设计阶段照此匹配）

| 你的业务关键词 | 应当调用 / 复用 | 拒绝重复造轮子的理由 |
|---|---|---|
| 微信/支付宝/银联支付下单·查单·关单·退款 | `WxMiniPayAPI` / `PayRecordAPI` / `PayGatewayConfigAPI` | 多渠道、密钥管理、回调幂等已封装 |
| 短信验证码·业务短信发送 | `SendSmsApi` | 多运营商（阿里云/华信）+ MQ 异步发送 |
| 站内信 / 系统公告 / 强制弹窗 | `MessageAPI` | 已支持登录拦截未读、标记已读、未读数 |
| 模板化通知（多渠道、定时、定向） | `NotificationAPI` | 模板 CRUD + 用户关联 + 发送记录 |
| 文件上传后元数据落库 + 业务关联 | `SystemFileAPI` | 自动接 OSS、按 sourceId/sourceType 关联，支持复制/迁移 |
| 商城页面/活动/详情模板 | `TemplateAPI` | 含发布、版本、商城端编辑 |
| 商城图片/视频素材库 | `MaterialAPI` + `MaterialCategoryAPI` | 含分类、批量移动、宽高记录 |
| 多端商城应用元数据 | `MallAppAPI` | 小程序/H5/App 统一管理 |
| 批量数据导入（商品/订单/用户） | `ImportRecordAPI` | 异步处理 + 失败日志 + 源/结果文件 |
| 大批量异步导出 | `ExportRecordAPI` | 后台生成、用户下载、不阻塞 |
| 敏感词过滤（UGC/订单备注） | `SensitiveWordAPI` | 内存缓存 + 后台维护，无需 NLP |
| 操作手册/帮助文档 | `OperationManualAPI` | 后台维护 + 前端检索 |
| 唯一编号（订单号/提案号/发票号） | `SequenceApi` | 统一前缀策略，避免分布式碰撞 |
| 渠道（供应商/分销商/经销商）管理 | `BizChannelAPI` | 含负责人配置 |
| 简道云审批流程对接 | `JdyAPI` | 表单提交、流程查询、文件转换 |
| 金蝶 ERP 商品/订单/库存/采购同步 | `KingdeeProductAPI` / `KingdeeOrderApi` 等 | 双向同步、自动对账 |
| 仓储 OMS 订单流转 | `OmsOrderAPI` | 配货确认、收货回写 |
| 物流单号识别/追踪 | `DeliveryIdentifyProviderAPI` | 快递规则识别 |
| 防重复提交（按用户+URI+参数 MD5） | `@PreventDuplicateSubmit`（hz-common-dependency） | 切面 + Redis setIfAbsent，已就绪 |
| Redis 全数据结构操作 | `RedisClient`（hz-common-dependency） | String/Hash/List/Set/Zset/Bitmap/HyperLogLog/Pipelined 全覆盖 |
| Excel 导入导出（含下拉/列隐藏/合并/格式校验） | `EasyExcelUtils` 系列（hz-common-dependency） | 转换器、监听器、写处理器一揽子 |
| 业务状态机（订单流转/审批） | `BaseStateMachine`（hz-common-dependency） | 继承即可 |
| 统一 REST 响应（200/500） | `R<T>`（hz-common-dependency）/ `CommonResult<T>`（公司框架） | 二选一，新代码统一用框架的 `CommonResult` |
| 业务通用错误码 | `BizCodeEnum`（hz-common-core） | 用户/商品/订单/支付/库存/优惠券/物流/风控/短信全分组 |

---

## 1. hz-empower 服务定位与调用约定

**hz-empower** 是 hz_platform 的**业务赋能中台**，提供支付、通讯、内容管理、文件存储、第三方集成等核心基础服务。**它不是工具库，是独立部署的微服务**——其他服务通过 Feign RPC 调用。

**接入步骤**：
1. 业务服务 `pom.xml` 引入：
   ```xml
   <dependency>
     <groupId>com.hongzhao.cloud</groupId>
     <artifactId>hz-empower-api</artifactId>
   </dependency>
   ```
2. 启动类 `@EnableFeignClients(basePackages = {"com.hongzhao.platform.empower"})`（或更宽包路径）
3. 直接 `@Resource` 注入对应 API 接口即可

**URI 前缀约定**：
- `/empower/rpc/...` → 内部 RPC 接口（不暴露网关）
- `/file`, `/message`, `/notification`, `/template`, `/material`, `/sensitiveword`, `/sequence` 等 → 业务接口（可走网关）

**Feign 命名约定**：
- 接口类后缀 `API`（如 `PayRecordAPI`）
- 必须给 `contextId`（同 `name` 下多个 Feign 接口避免冲突）
- 入参 DTO / 出参 VO **全部** 在 `hz-empower-api` 模块定义，调用方直接 import 使用，**不要在调用方重复定义**

---

## 2. hz-empower 对外 Feign API 清单

> 完整源码：`hz-empower-api/src/main/java/com/hongzhao/platform/empower/*/api/`

### 2.1 支付（pay）

| Feign 接口 | contextId | 关键方法 | 业务场景 |
|---|---|---|---|
| `PayRecordAPI` | PayRecordAPI | `checkPaySuccess` / `updatePaySuccess` / `updatePayFail` | 支付回调幂等性检查、状态更新 |
| `PayGatewayConfigAPI` | PayGatewayConfigAPI | `getById` | 查询商户密钥/AppID（不要在业务代码里硬编码！） |
| `WxMiniPayAPI` | WxMiniPayAPI | `getOpenId` / `create` / `query` / `close` / `refund` | 小程序微信支付全流程 |

### 2.2 短信（sms）

| Feign 接口 | 关键方法 | 业务场景 |
|---|---|---|
| `SendSmsApi` | `sendSms` / `validateSmsCode` | 验证码发送/校验、业务通知短信 |

### 2.3 站内信 / 通知（message / notification）

| Feign 接口 | 关键方法 | 业务场景 |
|---|---|---|
| `MessageAPI`（前缀 `/message`） | `send` / `page` / `checkUnread` / `markRead/{id}` / `clearUnread` / `unreadCount` | 用户登录时强制弹窗、未读数、消息中心 |
| `NotificationAPI`（前缀 `/notification`） | 模板 CRUD / `sendNotification` / `sendMsg` / `query` / `addTemplateUser` | 系统级广播、营销推送、定向通知 |

### 2.4 文件管理（file）—— **最高频复用**

`SystemFileAPI`（前缀 `/file`）是**所有业务对象**关联文件（订单附件、用户头像、商品图片、证明材料）的唯一入口：

| 方法 | 用途 |
|---|---|
| `saveFile` / `batchSaveFile` / `saveFileBatch` | 单个/批量保存文件元数据（OSS 上传后调用） |
| `saveMultipleSourceFileBatch` | 一次保存多种 sourceType 的文件 |
| `getBySourceId/{sourceId}` | 按业务对象查文件 |
| `getListBySourceIdAndType` / `getMapBySourceIdAndType` | 按 source + type 查询 / 批量映射 |
| `getBySourceIds` | 批量按业务 ID 查询 |
| `deleteByUrl` / `batchUpdateDelFlag` / `deleteBySourceIdList` | 删除文件 |
| `batchUpdateFile` | 批量改文件信息 |
| `copyFilesBySourceIds` | 跨 sourceId 复制（适合"复制订单"场景） |

> **不要自己建文件元数据表**。`system_file` 表已经统一存储，sourceId + sourceType 是关联约定。

### 2.5 商城内容建设（mallbuild）

| Feign 接口 | 用途 |
|---|---|
| `TemplateAPI`（`/template`） | 商城页面模板，含发布、版本、商城端二次编辑 |
| `MaterialAPI`（`/material`） | 图片/视频素材库，支持宽高、批量移动 |
| `MaterialCategoryAPI`（`/materialCategory`） | 素材分类树 |
| `MallAppAPI`（`/mallApp`） | 商城应用（小程序/H5/App）元数据 |
| `TemplateTagAPI`（`/templateTag`） | 模板标签 |

### 2.6 数据导入导出（import / export）

| Feign 接口 | 关键方法 | 用途 |
|---|---|---|
| `ImportRecordAPI`（`/importRecord`） | `create` / `updateStatus` / `page` / `sourceFileUrl` / `resultFileUrl` | 异步导入任务追踪（含失败日志结果文件） |
| `ExportRecordAPI`（`/exportRecord-mall`） | `create` / `updateStatus` / `page` / `fileUrl` / `resultFileUrl` | 异步导出（大批量数据后台生成、用户下载） |

> 写新的"批量导入商品"、"导出订单 Excel" 之类需求 **必须** 走这两个 API，不要自己存任务表。

### 2.7 内容审核 / 文档（sensitiveword / manual）

| Feign 接口 | 关键方法 | 用途 |
|---|---|---|
| `SensitiveWordAPI`（`/sensitiveword`） | `page` / `add` / `update` / `delete` / `check` | UGC、订单备注、商品名敏感词检测 |
| `OperationManualAPI` | `list` / `update` / `saveFile` | 操作手册、FAQ |

### 2.8 序列生成（sequence）

`SequenceApi`（前缀 `/sequence`）：

| 方法 | 用途 |
|---|---|
| `getNextVal` | 通用获取下一个序列值（带前缀策略） |
| `generalOrderNo` | 生成订单号 |
| `getSequence` / `updataSequence` | 查询/更新序列配置 |

> 业务需要"PO20260508-0001"、"INV-...."、"提案号" 之类编码 → **直接调这个**，不要自己 redis incr。

### 2.9 渠道管理（channel）

`BizChannelAPI`（前缀 `/channel`）：渠道（供应商/分销商/经销商）CRUD + 负责人关系（`channel_user_leader` 表）。

### 2.10 第三方集成

| Feign 接口 | 集成对象 | 用途 |
|---|---|---|
| `JdyAPI`（`/jdy`） | 简道云 | 工作流审批（采购/报销/请假），含表单提交、流程查询、文件转换 |
| `KingdeeProductAPI` / `KingdeeOrderApi` / `KingdeeOrgStockApi` / `KingdeePurchaserApi` / `KingdeeOrganizationsApi` / `KingdeeProviderApi` | 金蝶 ERP | 商品 SKU/订单/库存/采购/组织/供应商双向同步 |
| `OmsOrderAPI`（`/empower/rpc/oms/order`） | 仓储 OMS | 配货单确认收货 |
| `DeliveryIdentifyProviderAPI` | 物流 | 物流识别、状态回调 |

---

## 3. hz-empower 已落库的数据库表（避免重建）

| 表 | 内容 | 复用建议 |
|---|---|---|
| `pay_trade_record` / `pay_gateway` / `pay_gateway_config` / `pay_channel_item` | 支付审计日志、渠道、密钥配置 | 走 PayRecordAPI / PayGatewayConfigAPI |
| `sms_config` / `sms_template` / `sms_setting` / `send_record` / `sms_send_detail` | 短信配置、模板、记录 | 走 SendSmsApi |
| `message_info_record` | 站内信 | 走 MessageAPI |
| `notification_template` / `notification_record` / `notification_user_template` | 模板化通知 | 走 NotificationAPI |
| `system_file` | 文件元数据 + 业务关联 | 走 SystemFileAPI |
| `email_config` / `email_template` | 邮件 SMTP 配置和模板 | 调用 hz-empower email Service |
| `template` / `material` / `material_category` / `mall_app` / `template_tag` | 商城内容 | 走对应 API |
| `import_record` / `export_record` | 导入导出任务 | 走 ImportRecordAPI / ExportRecordAPI |
| `sensitive_word` | 敏感词库 | 走 SensitiveWordAPI |
| `sequence` | 序列号配置 | 走 SequenceApi |
| `biz_channel` / `channel_user_leader` | 渠道与负责人 | 走 BizChannelAPI |
| `delivery_identify` | 物流识别规则 | 走 DeliveryIdentifyProviderAPI |
| `operation_manual` | 操作手册 | 走 OperationManualAPI |

> 评审会查：是否新建了与上表语义重复的表 / 是否绕过 hz-empower 直连其表。

---

## 4. hz-service-common 业务侧公共能力

> 来自 `hz_platform/hz-service-common`，所有业务服务都应引入。
> 包路径前缀：`com.hongzhao.platform.common`

### 4.1 hz-common-core（10 个文件，业务常量与枚举）

| 类 | 内容 |
|---|---|
| `constant.MQConstant` | MQ 路由常量：`Q_SMS_SERVICE_PUSH_ADD` / `Q_SMS_SEND_MESSAGE_ADD` / `Q_SMS_SEND_CODE_MESSAGE_ADD` |
| `constant.OmsConstant` | 订单系统状态：`DPO_STATUS_LIST` / `OMS_DPO_ALL_STATUS_LIST` / `OMS_DPO_CANCEL_STATUS` / `DROP_SHIP_WAREHOUSE_LIST` |
| `constant.SqlDefaultOrderConstant` | SQL 默认排序字段（`CREATE_TIME`） |
| `enums.BizCodeEnum` | 业务错误码（按模块分组：通用 200-503、用户 1001-1007、商品 2001-2004、订单 3001-3005、支付 4001-4004、库存 5001-5003、优惠券 6001-6004、物流 7001-7003、风控 8001-8003、短信 9000）。`getByCode(String)` 反查 |
| `enums.UserStatusEnum` | `ENABLE(0)` / `DISABLE(1)` |
| `enums.TrueAndFalseEnum` | `SHI(1)` / `FOU(0)`，含 `getLabel/getCode` |
| `enums.redis.SmsRedisEnum` | 短信验证码缓存 key 模板（含过期时间）：普通验证码/登录/注册/改密/改手机号 各 5 分钟 |
| `enums.redis.UserRedisEnum` | 用户缓存 key：`USER_INFO`(3h) / `LOGIN_FREEZE_ACCOUNT`(10m) / `LOGIN_FAIL_COUNT`(永久) / `USER_ADDRESS_RECOGNITION_LIMIT`(1h)。`getKey(Object...)` 格式化 |
| `exception.UserErrorConstant` | 用户业务错误信息常量（18 条：密码错、账户冻结、手机号重复、协议未配置等） |
| `exception.SmsErrorConstant` | 短信错误：验证码过期/错误/超限/国家不支持等 |

### 4.2 hz-common-dependency（99 个文件，业务公共能力库）

#### 注解 / 切面（业务级 AOP）

| 注解 | 切面 | 用途 |
|---|---|---|
| `@PreventDuplicateSubmit(expire=3, timeUnit, message)` | `PreventDuplicateSubmitAspect` | 防重复提交：基于 userId + URI + 参数 MD5 + Redis setIfAbsent。**写新 Controller 必查**——绝大多数 POST 接口直接加这个注解即可 |
| `@DefaultTranslator` / `@LogValueTranslator` | — | 日志值翻译 |
| `@ExcelColumnHidden` | `ExcelColumnHiddenHandler` | Excel 列隐藏 |
| `@JdyField` | — | 简道云表单字段映射 |
| `@ProductChangeRecord` | — | 产品变更记录 |
| — | `TraceIdFieldAspect` | 自动填充 traceId 字段 |

#### 配置类

| 类 | 用途 |
|---|---|
| `FeignConfig` | multipart 表单编码（支持 Feign 上传文件）。**注意不带 `@Configuration`**，需在 FeignClient 上显式 `configuration = FeignConfig.class` 引用 |
| `JdyConfig` | 简道云 API 配置 |

#### 统一响应

| 类 | 说明 |
|---|---|
| `R<T>` | 业务统一响应。`SUCCESS=200` / `ERROR=500`；工厂方法 `R.ok()` / `R.ok(data)` / `R.error()` / `R.error(msg)` / `R.error(code, msg)` / `R.status(boolean)` |

> ⚠️ 项目中同时存在公司框架的 `CommonResult<T>` 与业务侧的 `R<T>`。**新代码统一用 `CommonResult`**（与全局异常处理器对齐）；只有维护历史接口时沿用 `R`。

#### 数据模型

```
domain/R<T>
model/dto/IdDTO       单 ID 请求（删除/详情）
model/dto/IdsDTO      批量 ID 请求
model/dto/JdyAddressDTO
model/dto/UploadFileContext
model/vo/DropdownVO   下拉选项
model/vo/ExcelImportResultVO / ExcelImportRowVO
model/vo/ChannelVO / SelectionVO / SpecColumnPair
model/vo/JdyFormModel / AddCompanyInfoVO / GetUploadTokenVO / JdyUploadResultVO / TokenAndUrlVO
```

#### Redis 客户端 — 1028 行实现，**全数据结构覆盖**

`redis.RedisClient`（注入即用）：

| 数据结构 | 方法 |
|---|---|
| String | `set` / `get` / `getSet` / `setNx` / `increment` / `decrement` |
| Hash | `hSet` / `hGet` / `hMultiGet` / `hGetAll` / `hDelete` / `hIncrement` |
| Set | `sAdd` / `sMembers` / `sRemove` / `sIntersect` / `sUnion` / `sDifference` |
| List | `lPush` / `lPop` / `lRange` / `lIndex` / `lSet` / `lTrim` |
| Zset | `zAdd` / `zRemove` / `zRange` / `zRangeByScore` / `zScore` / `zRank` |
| HyperLogLog | `pfAdd` / `pfCount` |
| Bitmap | `setBit` / `getBit` / `bitCount` / `bitField` |
| 高级 | `scan(pattern)` / `pipelined(callback)` |

> **写新的 Redis 操作前先看这个类**，几乎所有数据结构都有对应方法。

#### 状态机

```java
// statemachine.StateMachine<STATE, EVENT>          接口
// statemachine.BaseStateMachine<STATE, EVENT>      实现，HashMap 存 "source_event" → target

public class OrderStateMachine extends BaseStateMachine<OrderStatus, OrderEvent> {
    public OrderStateMachine() {
        putTransition(CREATED, PAY,    PAID);
        putTransition(PAID,    SHIP,   SHIPPED);
        putTransition(SHIPPED, RECEIVE, COMPLETED);
    }
}
```

> 订单流转、审批流、工单流转都应继承 `BaseStateMachine`，不要 if/else 拼接。

#### Excel 工具集（封装 EasyExcel，15 个类）

| 类 | 用途 |
|---|---|
| `EasyExcelUtils` | 入口工具：`readExcelOneSheet` / `importExcel(file, class, listener)` / `exportExcel` |
| `BaseListener` / `ExcelListener` / `ProductImportListener` | 行监听器基类 |
| `BigDecimalConvert` / `IntegerConverter` / `SafeBigDecimalConverter` | 类型转换器（避免精度丢失） |
| `ExcelColumnHiddenHandler` | 配合 `@ExcelColumnHidden` 隐藏列 |
| `DropDownSheetWriteHandler` | 下拉框写处理 |
| `CustomSheetWriteHandler` / `TextFormatWriteHandler` | 自定义样式 / 文本格式 |
| `HeaderCommentHandler` | 表头批注 |
| `LongNumberAutoTextFormatHandler` | 长数字自动转文本 |
| `QtyConditionalFormattingHandler` | 数量条件格式 |
| `ExcelValid` / `ExcelPropertyCheck` / `ExcelImportValid` | 数据校验 |
| `RegexUtils` | 正则工具 |

#### MQ 模块（RabbitMQ 可靠发送基础设施）

```
mq/
├── callback/  MqConfirmCallback / MqReturnsCallback   Publisher Confirms + Returns
├── config/    RabbitMqConfig（已配置 JSON 转换器、回调）/ RabbitMqBindingConfig（队列/交换机绑定）
├── constants/ RabbitMqConstants / RabbitMqRoute        路由配置
├── consumer/  AbstractMqConsumer                       消费者基类，继承即用
├── model/     MessageCorrelationData / OrderSyncToMallDTO
└── producer/  Producer                                 生产者接口
```

#### 工具类（20+ 个）

```
DateUtil                日期时间（格式化、季度、天数差）
ConvertUtil             类型转换
BigDecimalConvertUtil   BigDecimal 转换
HttpUtils / HttpRequestUtil / BaiduSearchHttp   HTTP 请求
MD5Util / HexUtil       加密工具
PinyinUtils             拼音处理（首字母排序）
SmsSendUtil             短信工具
WxUtil                  微信工具
RequestHolder           HTTP 请求上下文
CustomDateTimeSerializer / Deserializer  Jackson 自定义序列化
ExcelStyleUtil          Excel 样式
ExpressOneClickValidator / HaversineDistance   快递验证 / 地理距离
```

> **新建 Util 之前**：先 grep `hz-common-dependency/.../utils/` 看有没有已存在的同类工具。

#### 简道云 / 微信 / 金蝶 集成工具

```
JdyHttpUtil / JdySsoUtils / JdyFormDataConvertUtil / JdyFormWriter
WxUtil
```

---

## 5. hz-service-common 接入方式

```xml
<dependency>
    <groupId>com.hongzhao.cloud</groupId>
    <artifactId>hz-common-core</artifactId>
</dependency>
<dependency>
    <groupId>com.hongzhao.cloud</groupId>
    <artifactId>hz-common-dependency</artifactId>
</dependency>
```

引入后**自动获得**：
- 注入 `RedisClient` Bean
- `@PreventDuplicateSubmit` 切面生效
- Jackson 日期序列化器全局注册
- RabbitMQ Publisher Confirms + Returns 配置
- 所有常量/枚举/数据模型直接 import

---

## 6. hz-service-common vs hongzhao-framework 边界

| 关注点 | 归属 |
|---|---|
| Web 异常处理 / Jackson / Swagger | **framework**（`hongzhao-starter-web`） |
| BaseEntity / 分页基类 / 统一响应 `CommonResult` / 安全认证 | **framework**（`hongzhao-common` + `hongzhao-starter-*`） |
| 多租户隔离全链路 | **framework**（`hongzhao-starter-tenant`） |
| MyBatis-Plus + Druid + 代码生成 | **framework**（`hongzhao-starter-mysql`） |
| —— 以上都是公司级，跨平台复用 —— | |
| 业务级常量 / 状态枚举 / 错误码 | **hz-common-core** |
| 防重提交切面 / Redis 全数据结构客户端 / 状态机基类 | **hz-common-dependency** |
| 业务级 Excel 工具 / RabbitMQ 配置和消费者基类 | **hz-common-dependency** |
| 简道云/金蝶/微信集成工具类 | **hz-common-dependency** |
| 通用 DTO/VO（IdDTO/IdsDTO/DropdownVO） | **hz-common-dependency** |

> 一句话：**框架管"怎么做"（横切技术），hz-service-common 管"业务里通用的怎么做"，hz-empower 管"业务能力本身"**。设计时三层都查。

---

## 7. 复用红线（评审硬规则）

设计/编码时**只要满足以下任一条件即视为重复造轮子，必须返工**：

1. ❌ 自己写订单号/编号生成器（用 `SequenceApi.getNextVal/generalOrderNo`）
2. ❌ 自己写敏感词检测（用 `SensitiveWordAPI.check`）
3. ❌ 自己写文件元数据表（用 `system_file` + `SystemFileAPI`）
4. ❌ 自己接微信/支付宝/银联 SDK（用 `WxMiniPayAPI` + `PayRecordAPI`）
5. ❌ 自己接阿里云/华信短信 SDK（用 `SendSmsApi`）
6. ❌ 自己写消息中心（用 `MessageAPI` + `NotificationAPI`）
7. ❌ 自己写"批量异步导入/导出任务表"（用 `ImportRecordAPI` / `ExportRecordAPI`）
8. ❌ 自己写防重复提交逻辑（加 `@PreventDuplicateSubmit` 注解）
9. ❌ 自己写 RedisTemplate Util（用 `RedisClient`）
10. ❌ 用 if/else 拼状态流转（继承 `BaseStateMachine`）
11. ❌ 自己写 EasyExcel listener / converter（看 hz-common-dependency 的 excel/ 包有没有现成的）
12. ❌ 业务错误码自由定义（用 `BizCodeEnum` 既有分组扩展）
13. ❌ 调金蝶/简道云/OMS 直接 HTTP 调（走对应 Feign API）
14. ❌ 在调用方重新定义 hz-empower-api 已有的 DTO/VO（直接 import）

> Review 阶段会逐条核对；新增 Feign API 必须同步更新本文 §2 表格，否则归档不通过。
