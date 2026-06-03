# Hongzhao 框架能力矩阵（公司级）

> **设计/开发前必查**。所有横切能力（缓存/锁/租户/认证/MQ/调度/文件存储/搜索/链路/Excel/字段翻译……）公司框架已经全部封装为 Spring Boot Starter，引依赖即用。**禁止重复造轮子**——评审会把"自己写了一份本地 Redis Util / 自己写了一个全局异常处理器 / 自己实现租户字段过滤"判为不通过。
>
> 来源：`hongzhao-framework`（GroupId: `com.hongzhao.cloud`，version: `2.7.0-jdk8-SNAPSHOT`）。
> 用户可根据本项目实际接入的 starter 增删条目；新版 starter 应优先在此登记。

---

## 0. 速查决策表（设计阶段照此匹配）

| 你的需求关键词 | 对应 starter / 模块 | 关键 API |
|---|---|---|
| 全局异常 / 参数校验 / 数据脱敏 | `hongzhao-starter-web` | `GlobalExceptionHandler`、`@MobileDesensitize`、`@IdCardDesensitize` |
| 数据库 CRUD / 分页 / 代码生成 | `hongzhao-starter-mysql` | `BaseMapper`、`PageParam.getPage()`、Druid + MyBatis-Plus |
| 缓存 / 分布式锁 | `hongzhao-starter-redis` | `@Cacheable`、Redisson `RLock`、`@Lock4j` |
| 多租户隔离（DB/Cache/MQ/Job 全链路） | `hongzhao-starter-tenant` | `TenantContextHolder`、`@TenantIgnore` |
| 用户认证 / 登录信息 / 密码加密 | `hongzhao-starter-security` | `SecurityUtils.getLoginUser()`、`@Inner` |
| 行级数据权限（部门/角色） | `hongzhao-starter-data-permission` | 基于 MP 拦截器自动注入 SQL 条件 |
| 微服务间 RPC | `hongzhao-starter-feign` | `@FeignClient`、自动透传 Token + 租户 ID |
| 异步消息 / 事件驱动 | `hongzhao-starter-mq` | RabbitMQ + Spring Cloud Stream，自动透传租户 |
| 分布式定时任务 | `hongzhao-starter-job` | `@XxlJob("handler")`，租户上下文自动透传 |
| 本地定时任务 | `hongzhao-starter-scheduled` | Spring `@Scheduled` + 线程池配置 |
| MongoDB | `hongzhao-starter-mongodb` | Spring Data MongoDB |
| 全文搜索 | `hongzhao-starter-elasticsearch` | Easy-ES（类 MyBatis-Plus 风格） |
| 分布式事务 | `hongzhao-starter-seata` | Seata AT/TCC |
| 文件上传 / OSS | `hongzhao-starter-oss` | 阿里云/腾讯云/MinIO/华为云四合一 |
| Excel 导入导出 | `hongzhao-starter-web-tools` | EasyExcel 封装 |
| 字段翻译（userId→userName / 字典码→字典名） | `hongzhao-starter-escape` | `@Trans` + Caffeine + Redis 二级缓存 |
| 操作日志 / 审计 | `hongzhao-starter-log` (含 `operation-log` 子模块) | 注解驱动 |
| 日志收集 | `hongzhao-starter-logstash` | 自动接入 ELK |
| 链路追踪 | `hongzhao-starter-skylog` | SkyWalking traceId 注入 logback |
| 图形验证码 | `hongzhao-captcha` | 开箱即用 |
| 产品授权（试用期/许可证） | `hongzhao-starter-license` | TrueLicense + OSHI |
| 通用工具（StringUtils/DateUtils/JsonUtils/IdWork/SecurityUtils） | `hongzhao-common` | 见 §3 工具类清单 |

---

## 1. Web 基础（必引）— `hongzhao-starter-web`

**坐标**：`com.hongzhao.cloud:hongzhao-starter-web`
**自动配置**：`SaasJacksonAutoConfiguration` / `SaasSwaggerAutoConfiguration` / `SaasWebAutoConfiguration` / `BannerAutoConfiguration`

**已经为你做好的事**：
- **全局异常处理**：`GlobalExceptionHandler` 统一捕获 `ServiceException` / `MethodArgumentNotValidException` / `Throwable`，转 `CommonResult`。**不要自己写 `@RestControllerAdvice`**。
- **API 请求/错误日志**：`ApiRequestFilter` + `ApiErrorLog`，自动落库。
- **Jackson 时间序列化**：`LocalDateTime` ↔ `yyyy-MM-dd HH:mm:ss` 已配置全局，VO/DTO 上**无需**再加 `@JsonFormat`（除非要覆盖默认）。
- **Knife4j / SpringDoc**：Swagger UI 自动暴露。
- **Undertow + Nacos 注册/配置**：`bootstrap.yml` 直接读 Nacos。

**数据脱敏注解**（用于 VO 输出层）：
```
@MobileDesensitize  → 手机号 138****8888
@IdCardDesensitize  → 身份证后四位脱敏
@EmailDesensitize   → 邮箱 a***@b.com
@BankCardDesensitize、@ChineseNameDesensitize、@PasswordDesensitize、@RegexDesensitize
```

---

## 2. 数据访问 — `hongzhao-starter-mysql`

**坐标**：`com.hongzhao.cloud:hongzhao-starter-mysql`
**栈**：Druid + MyBatis-Plus 3.5.7 + PageHelper 2.1.0 + 代码生成器

**用法要点**：
```java
// 分页：DTO 继承 SortablePageParam，Service 中
Page<Brand> page = brandMapper.selectPage(pageDTO.getPage(), wrapper);

// 单表 CRUD：直接用 BaseMapper
mapper.selectById(id);
mapper.insert(entity);
mapper.update(entity, new LambdaUpdateWrapper<Brand>().eq(Brand::getId, id));
```

**避免自建**：分页参数、连接池、慢 SQL 监控、代码生成模板已就绪。新表生成基础类用框架自带的代码生成器（参考 `doc/代码生成/esaycode.md`）。

---

## 3. 通用工具类 — `hongzhao-common`

> 这是公司级"基础设施 jar"，几乎所有 starter 都依赖它。**新建工具类前先到这里搜一遍**。

**坐标**：`com.hongzhao.cloud:hongzhao-common`
**包路径前缀**：`com.hongzhao.saas.common`

### 3.1 统一返回值 / 异常 / 错误码

| 类 | 全限定名 | 职责 |
|---|---|---|
| `CommonResult<T>` | `com.hongzhao.saas.common.pojo.CommonResult` | 统一响应包装。`success(data)` / `error(code,msg)` / `status(bool)` / `getCheckedData()` |
| `ServiceException` | `com.hongzhao.saas.common.exception.ServiceException` | 业务异常基类，带 `code`+`message` |
| `ErrorCode` | `com.hongzhao.saas.common.exception.ErrorCode` | 错误码接口 |
| `GlobalErrorCodeConstants` | `…exception.enums.GlobalErrorCodeConstants` | 全局错误码：SUCCESS=0、BAD_REQUEST=400、UNAUTHORIZED=401、FORBIDDEN=403、NOT_FOUND=404、INTERNAL_SERVER_ERROR=500 |

### 3.2 分页

| 类 | 全限定名 | 说明 |
|---|---|---|
| `PageParam` | `…common.pojo.PageParam` | 分页基类。`pageNo`(≥1)、`pageSize`(1-100)、常量 `PAGE_SIZE_NONE=-1` 不分页。`getPage()` 返回 MP 的 `Page` |
| `SortablePageParam` | `…common.pojo.SortablePageParam` | 带排序的分页基类，业务 DTO 继承它 |

### 3.3 安全 / 用户上下文

| 类 | 用途 |
|---|---|
| `SecurityUtils` | `getLoginUser()` / `getUserId()` / `getUsername()` / `getToken()` / `encryptPassword()` / `matchesPassword()` / `isAdmin(userId)` |
| `SecurityContextHolder` | 线程级安全上下文，跨线程用 TTL 透传 |
| `LoginUserInfo` | 登录用户视图模型 |
| `@AdminAuth` / `@AppAuth` | 权限注解 |
| `@Inner` | 标记内部 RPC 接口，跳过认证 |

### 3.4 工具类清单（按需 import）

```
日期：DateUtils / LocalDateTimeUtils
集合：CollectionUtils / ArrayUtils / SetUtils / MapUtils
字符串：StringUtils / StrUtils
对象：BeanUtils / KsBeanUtil / Convert / ObjectUtils / PageUtils
JSON：JsonUtils
枚举：EnumUtil
HTTP：HttpUtils
ID：IdWork（雪花算法）
文件：FileUtils / IoUtils
缓存：CacheUtils
Spring：SpringUtils / SpringContextUtil / ServletUtils
```

### 3.5 业务枚举与校验分组

```
枚举基类：BaseEnum
通用：CommonStatusEnum / DeletedEnum / UserTypeEnum / SexEnum / TerminalEnum
权限：RoleCodeEnum / RoleTypeEnum / DataScopeEnum / MenuTypeEnum
校验分组：Add.class / Edit.class / DetailQuery.class / Copy.class
枚举值校验：@EnumValid

字段处理：@Trim（自动去空格）/ @CanEmpty（允许空）/ @OptColumn（可选列）
```

### 3.6 业务/缓存常量

```
CacheConstants            缓存键前缀
SystemCodeConstants       系统编码
SystemApiConstants        系统 API 路径
SecurityConstants / TokenConstants / AuthConstants
BizCodeEnum               业务错误码
```

---

## 4. 缓存与锁 — `hongzhao-starter-redis`

**坐标**：`com.hongzhao.cloud:hongzhao-starter-redis`
**栈**：Lettuce + Redisson + Spring Cache + Caffeine（本地一级缓存）+ Lock4j

**典型用法**：
```java
// 注解缓存
@Cacheable(cacheNames = "brand", key = "#id")
public BrandVO getById(Long id) { ... }

@CacheEvict(cacheNames = "brand", key = "#dto.id")
public Boolean update(BrandUpdateDTO dto) { ... }

// 分布式锁（Lock4j 注解风格，推荐）
@Lock4j(keys = {"#orderId"}, waitTime = 0, expire = 30000)
public void payCallback(Long orderId) { ... }

// 编程式锁
@Resource RedissonClient redissonClient;
RLock lock = redissonClient.getLock("lock:" + bizKey);
```

**避免自建**：不要直接 `RedisTemplate` 写自定义封装；先看 `hongzhao-common.CacheUtils` 与 hz-platform 的 `RedisClient`（hz-service-common 提供，覆盖 String/Hash/List/Set/Zset/Bitmap/HyperLogLog 全部数据结构，1028 行实现）。

---

## 5. 多租户 — `hongzhao-starter-tenant`

**坐标**：`com.hongzhao.cloud:hongzhao-starter-tenant`

**全链路自动隔离**（这是 SaaS 的命脉，**严禁自己手动拼 SQL 处理 tenant_id**）：

| 链路点 | 组件 | 行为 |
|---|---|---|
| HTTP 入口 | Filter | 解析 `tenantId` 写入 `TenantContextHolder` |
| 数据库 | `TenantDatabaseHandler` | MyBatis 拦截器自动给 SQL 注入 `tenant_id = ?` |
| Feign 调用 | `TenantFeignRequestInterceptor` | Header 自动带租户 ID |
| RabbitMQ | `TenantRabbitMQInitializer` + `TenantRabbitMQMessagePostProcessor` | 生产/消费时透传 |
| XXL-Job | `TenantJob` + `TenantJobAspect` | 任务执行时还原租户上下文 |
| Redis 缓存 | `TenantRedisCacheManager` | Key 自动加租户前缀 |

**关键 API**：
```java
Long tenantId = TenantContextHolder.getTenantId();  // 当前租户
TenantContextHolder.setTenantId(tenantId);          // 手动设置（极少用）
TenantContextHolder.clear();                        // 清理（Filter 末尾）

@TenantIgnore                                        // 标记跨租户方法（数据字典、超管接口）
public List<DictDO> listAllTenantsDict() { ... }
```

---

## 6. 安全认证 — `hongzhao-starter-security`

**坐标**：`com.hongzhao.cloud:hongzhao-starter-security`

**已封装**：
- 密码加密（`BCryptPasswordEncoder`，通过 `SecurityUtils.encryptPassword/matchesPassword` 调用）
- Token 解析、登录用户上下文（`SecurityUtils.getLoginUser()`）
- Header / Inner 拦截器（自动放行 `@Inner` 标记的内部接口）

**业务侧严禁**：自建 `JwtUtil`、自建 `LoginInterceptor`、自建 `PasswordEncoder`。

---

## 7. 微服务调用 — `hongzhao-starter-feign`

**坐标**：`com.hongzhao.cloud:hongzhao-starter-feign`
**栈**：OpenFeign + OkHttp + Spring Cloud LoadBalancer

**自动能力**：
- 通过 `FeignRequestInterceptor` 自动透传 Token、租户 ID、traceId
- 支持 `@Validated` 在 consumer 侧本地校验

**模板**（与 `templates/feign-api.md` 一致）：
```java
@FeignClient(name = "hz-empower", contextId = "PayRecordAPI", path = "/empower/rpc/pay/record")
public interface PayRecordAPI {
    @GetMapping("/checkPaySuccess")
    CommonResult<Boolean> checkPaySuccess(@RequestParam Long orderId);
}
```

---

## 8. 消息队列 — `hongzhao-starter-mq`

**坐标**：`com.hongzhao.cloud:hongzhao-starter-mq`
**栈**：Spring Cloud Stream + RabbitMQ + Spring AMQP，租户自动透传

**配置示例**（参 `doc/配置文件/common-mq.yaml`）：
```yaml
spring:
  rabbitmq:
    host: ${MQ_HOST}
    port: 5672
```

**业务侧选用约定**：
- 同步轻量调用 → Feign
- 异步解耦/削峰/广播 → MQ
- 短信/推送/批处理触发 → MQ

> hz-service-common 进一步提供了 `RabbitMqConfig`（已配置 Publisher Confirms + Returns）+ `AbstractMqConsumer` 基类，写消费者直接继承。

---

## 9. 定时任务 — `hongzhao-starter-job` & `-scheduled`

**`hongzhao-starter-job`**：XXL-Job 2.3.1，分布式调度、可视化管理、租户透传。
```java
@XxlJob("syncOrderHandler")
public ReturnT<String> execute(String param) { ... }
```

**`hongzhao-starter-scheduled`**：Spring `@Scheduled` + 自定义线程池，仅适合单机轻量任务。

> 选哪个：需要后台启停/分片/失败重试 → XXL-Job；只是定时清理本地缓存 → scheduled。

---

## 10. 数据权限 — `hongzhao-starter-data-permission`

**坐标**：`com.hongzhao.cloud:hongzhao-starter-data-permission`
**作用**：行级数据权限（按部门/角色/数据范围过滤），基于 MP 拦截器自动注入 SQL 条件。
**依赖**：mysql + redis starter。

**关键场景**：销售只看自己部门数据、跨部门主管看下属数据。**不要在 Service 里自己拼 `where dept_id in (...)`**。

---

## 11. 文件存储 — `hongzhao-starter-oss`

**坐标**：`com.hongzhao.cloud:hongzhao-starter-oss`
**支持后端**：阿里云 OSS / 腾讯云 COS / MinIO / 华为云 OBS（一套接口适配四种）

**业务侧调用方式**：直接通过 hz-empower 的 `SystemFileAPI`（详见 hz-platform-services.md），它内部已经接好 OSS。

---

## 12. Excel 导入导出 — `hongzhao-starter-web-tools`

**坐标**：`com.hongzhao.cloud:hongzhao-starter-web-tools`
**栈**：EasyExcel

> hz-service-common 进一步封装了 `EasyExcelUtils`、`ExcelListener`、`BigDecimalConvert`、`DropDownSheetWriteHandler`、`HeaderCommentHandler` 等。**写新的导入导出 Controller 前，先去 hz-platform-services.md §3 看一遍**。

---

## 13. 字段翻译 — `hongzhao-starter-escape`

**坐标**：`com.hongzhao.cloud:hongzhao-starter-escape`
**栈**：Easy-Trans + Caffeine + Redis 二级缓存

**典型用法**：
```java
public class OrderVO {
    private Long userId;
    @Trans(type = UserIdToUserName.class, prop = "userId", ref = "userName")
    private String userName;     // 自动填充
    
    private Integer status;
    @Trans(type = DictTrans.class, key = "order_status", prop = "status", ref = "statusName")
    private String statusName;   // 自动填充
}
```

**避免**：在 Service 里手动循环翻 user 名 / 字典名——是反模式。

---

## 14. 链路追踪 / 日志 / 操作审计

| Starter | 职责 |
|---|---|
| `hongzhao-starter-skylog` | SkyWalking traceId 注入 logback，链路追踪 |
| `hongzhao-starter-logstash` | 日志推送到 ELK |
| `hongzhao-starter-log` | 日志门面 |
| `hongzhao-starter-operation-log` | 操作日志（注解驱动审计） |
| `hongzhao-starter-log-consumer` | 日志消费者 |

---

## 15. 其他能力

| Starter / 模块 | 用途 |
|---|---|
| `hongzhao-starter-mongodb` | Spring Data MongoDB |
| `hongzhao-starter-elasticsearch` | Easy-ES（Easy-Trans 团队作品，类 MyBatis-Plus 风格的 ES ORM）|
| `hongzhao-starter-seata` | Seata 分布式事务（AT/TCC）|
| `hongzhao-starter-license` | 产品授权（TrueLicense + OSHI 硬件指纹）|
| `hongzhao-captcha` | 图形验证码 |
| `hongzhao-dependencies` | 依赖管理 BOM（统一锁版本） |
| `gitlab-cicd/` | GitLab CI 模板 |

---

## 16. 复用红线（评审硬规则）

设计/编码时**只要满足以下任一条件即视为重复造轮子，必须返工**：

1. ❌ 自己写 `@RestControllerAdvice` 全局异常处理器（已有 `GlobalExceptionHandler`）
2. ❌ 自己实现统一响应包装类（已有 `CommonResult<T>`）
3. ❌ 自己写 Jackson `LocalDateTime` 序列化器（starter-web 已配置）
4. ❌ 自己写 `BCrypt` 密码工具（用 `SecurityUtils`）
5. ❌ 自己写 JWT/Token 解析（用 `SecurityUtils.getLoginUser()`）
6. ❌ 自己实现租户字段过滤拦截器（用 `hongzhao-starter-tenant` + `@TenantIgnore`）
7. ❌ 自己写分布式锁工具（用 `@Lock4j` 或 Redisson `RLock`）
8. ❌ 自己写 Redis 操作工具类（用 hz-service-common 的 `RedisClient`）
9. ❌ 自己造分页 DTO（继承 `SortablePageParam`）
10. ❌ 自己写脱敏函数（用 `@MobileDesensitize` 等注解）
11. ❌ 自己拼 SQL 翻译 userId→userName（用 `@Trans`）
12. ❌ 在 Controller 里直接 `RestTemplate.getForObject` 调别的服务（必须 Feign）
13. ❌ 自己写 OSS SDK 直接对接（必须经 hz-empower `SystemFileAPI`）
14. ❌ 自己写文件元数据表（用 hz-empower 的 `system_file` 表 + `SystemFileAPI`）
15. ❌ 自己写敏感词检查、订单号生成、短信发送、支付回调（这些 hz-empower 全有，详见 hz-platform-services.md）

> Review/Verify 阶段会逐条核对。
