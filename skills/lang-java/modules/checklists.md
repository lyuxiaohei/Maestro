# Java 写代码检查清单

由 /build Step 3.C 按需读取。每段以 `## 写 XXX 前` 命名，按文件类型对号入座，把整段清单粘贴到 response 作为写代码当下的自检证据。

---

## 写 Java Service 前

```
[lang-java Service 检查清单]
当前文件：{path}/XxxServiceImpl.java

[ ] 使用 @RequiredArgsConstructor 构造器注入（禁止 @Autowired）
[ ] Service 接口与 ServiceImpl 分离，类名以 Impl 结尾
[ ] @Transactional 标注在 Service 方法（不在 Controller）
[ ] Service 不直接写 SQL，通过 Mapper 操作
[ ] 业务异常：throw new ServiceException("...")
[ ] @Log4j2 + log.info("订单创建成功, orderId={}, userId={}", orderId, userId)
[ ] 方法命名前缀：get / list / count / save / remove / update
[ ] 继承 ServiceImpl<Mapper, Entity> 时通过反射注入 baseMapper（test-service.md 模板）
```

---

## 写 Java Controller 前

```
[lang-java Controller 检查清单]
当前文件：{path}/XxxController.java

[ ] 实现 Feign API 接口（@FeignClient 对应的 interface）
[ ] 方法体只调 Service，禁止调 Mapper / 写业务判断
[ ] 返回值用 CommonResult.success(data) / CommonResult.status(bool) 包装
[ ] 禁止直接返回 Entity，必须 Service 层转 VO
[ ] URI 遵循 /xxx/admin/资源/动作 或 /xxx/app/资源/动作 或 /xxx/rpc/资源/动作
[ ] 入参 DTO 加 @Validated({Add.class}) / @Validated({Edit.class})
[ ] @RequiredArgsConstructor 构造器注入
```

---

## 写 Java Entity 前

```
[lang-java Entity 检查清单]
当前文件：{path}/entity/XxxEntity.java（或 XxxDO.java）

[ ] 继承 BaseEntity（自带 id/create_time/update_time/del_flag/tenant_id 等）
[ ] 字段类型：日期用 LocalDateTime（禁 Date）；金额用 BigDecimal（禁 float/double）
[ ] 状态字段用 Integer（不用 Boolean，对应数据库 tinyint）
[ ] POJO 布尔字段不加 is 前缀（避免 Jackson 序列化问题）
[ ] 表名注解 @TableName("xxx")，字段名注解 @TableField（仅在 Java 字段名与 SQL 列名不一致时）
[ ] 逻辑删除字段标 @TableLogic
[ ] 类与字段加 Lombok @Getter @Setter @Builder，禁止手写 getter/setter
```

---

## 写 Java DTO 前

```
[lang-java DTO 检查清单]
当前文件：{path}/model/dto/{业务域}/XxxDTO.java

[ ] DTO 用于入参，禁止出参；出参用 VO
[ ] 加分组校验：@NotBlank(groups = Add.class) / @NotNull(groups = Edit.class)
[ ] 字段类型：日期 LocalDateTime；金额 BigDecimal；状态 Integer
[ ] 日期字段加 @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
[ ] 嵌套对象使用 @Valid 触发递归校验
[ ] 分页 DTO 继承 SortablePageParam（提供 getPage()）
[ ] Lombok @Getter @Setter，可选 @Builder
```

---

## 写 Java VO 前

```
[lang-java VO 检查清单]
当前文件：{path}/model/vo/{业务域}/XxxVO.java

[ ] VO 用于出参，禁止直接对外暴露 Entity
[ ] 日期字段加 @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
[ ] 金额字段：BigDecimal + @JsonFormat(shape = STRING) 防前端精度丢失
[ ] 状态字段同时给 status (Integer) + statusName (String) 两个属性
[ ] Service 层负责 Entity → VO 转换，禁止在 Controller 转换
[ ] Lombok @Getter @Setter @Builder
```

---

## 写 Java Mapper 前

```
[lang-java Mapper 检查清单]
当前文件：{path}/mapper/XxxMapper.java + resources/mapper/{业务域}/XxxMapper.xml

[ ] Mapper 接口继承 BaseMapper<Entity>
[ ] 简单查询用 LambdaQueryWrapper / LambdaUpdateWrapper，不写 XML
[ ] 复杂联表查询写在 XML 中（XML 路径与接口包路径对应）
[ ] 方法命名：select / insert / update / delete + Wrapper 自动生成
[ ] 自定义查询方法：findByXxx / countByXxx / pageByXxx
[ ] XML 中禁止 SELECT *，必须显式列字段
[ ] 分页查询用 IPage 参数（MyBatis-Plus 自动分页）
```

---

## 写 Java DDL 前

```
[lang-java DDL 检查清单]

[ ] 表名：小写下划线 + 单数（user_order，不是 user_orders）
[ ] 主键：bigint unsigned（雪花 ID）
[ ] 必备字段：id / create_time / create_user_id / update_time / update_user_id / tenant_id / del_flag / dept_id
[ ] 删除：逻辑删除（del_flag），禁止物理删除
[ ] 索引命名：pk_ / uk_ / idx_
[ ] 字符集：兼容 MySQL 5.7（不用 utf8mb4_0900_ai_ci）
[ ] 禁止：存储过程、函数、触发器
[ ] 状态字段：tinyint unsigned，is_xxx 或 xxx_status
[ ] 金额字段：decimal，禁止 float/double
[ ] 字符串：varchar 不超 5000，超长用 text 独立表
```

---

## 写 Java Feign API 前

```
[lang-java Feign API 检查清单]
当前文件：{path}/api/XxxApi.java（位于 xxx-api 模块）

[ ] 加 @FeignClient(name = "${spring.application.name}-xxx", contextId = "xxxApi")
[ ] 接口路径前缀使用 /xxx/rpc/资源
[ ] 方法签名只声明，不写实现（被 Controller 实现）
[ ] 入参 DTO / 出参 VO 全部位于 xxx-api 模块（避免 service 模块互相依赖）
[ ] 加 fallback 或 fallbackFactory 定义降级
[ ] 方法上加 Swagger / OpenAPI 注解（如 @Operation）
[ ] 禁止跨服务直接 RestTemplate / WebClient 调用，必须经 Feign API
```

---

## 写 Java Service 测试前

```
[lang-java Service 测试检查清单]
当前文件：{path}/test/.../service/XxxServiceImplTest.java

[ ] 测试类命名：被测类 + Test（BrandServiceImplTest）
[ ] 不启动 Spring：纯 JUnit 5 + Mockito（@ExtendWith(MockitoExtension.class)）
[ ] @Mock 标注依赖的 Mapper / 其他 Service
[ ] @InjectMocks 标注被测 ServiceImpl
[ ] 继承 ServiceImpl 的需通过反射注入 baseMapper（见 templates/test-service.md）
[ ] 测试方法命名：shouldXxx_whenYyy()
[ ] 断言风格：given(mock).willReturn(...) → 调用方法 → assertThat(...) → verify(mock)
[ ] 禁止：硬编码常量做断言（用 BDD given 定义）
[ ] 异常断言：assertThatThrownBy(...).isInstanceOf(ServiceException.class)
```

---

## 写 Java Controller 测试前

```
[lang-java Controller 测试检查清单]
当前文件：{path}/test/.../controller/XxxControllerTest.java

[ ] 不启动 Spring：MockMvc.standaloneSetup(controller).build()
[ ] @Mock 标注被注入的 Service
[ ] 验证响应：mockMvc.perform(...).andExpect(status().isOk()).andExpect(jsonPath("$.code").value(0))
[ ] 验证 Service 调用：verify(brandService).insert(any(BrandDTO.class))
[ ] 测试 @Validated 失败场景：传非法入参 → 期望 400
[ ] 测试 ServiceException 透传：模拟 Service 抛 ServiceException → 期望 400 + 错误信息
```

---

## 写 Java DTO 测试前

```
[lang-java DTO 测试检查清单]
当前文件：{path}/test/.../dto/XxxDTOTest.java

[ ] 用 javax.validation.Validation.buildDefaultValidatorFactory().getValidator()
[ ] 校验单字段：validator.validateProperty(dto, "fieldName", Add.class)
[ ] 测试通过场景：正常 DTO → 期望无 ConstraintViolation
[ ] 测试不通过场景：缺必填 → 期望 violations 含对应字段 + 错误消息
[ ] 测试分组：用不同 group（Add.class / Edit.class）应触发不同校验
[ ] 边界值：最大长度 / 最小值 / 边界字符
```

---

## 写 Java AutoConfiguration 测试前

```
[lang-java AutoConfiguration 测试检查清单]
当前文件：{path}/test/.../config/XxxAutoConfigurationTest.java
适用：hongzhao-starter-* 模块 / 任何带 @AutoConfiguration / @Configuration 的 starter 类

[ ] 测试不启动 Spring：用 ApplicationContextRunner，不是 @SpringBootTest
[ ] 加载目标 auto-config：.withConfiguration(AutoConfigurations.of(XxxAutoConfiguration.class))
[ ] property 通过 .withPropertyValues("key=value", ...) 注入（不依赖 yaml）
[ ] @Validated @ConfigurationProperties 必须在 pom 加 spring-boot-starter-validation (test scope)，见 test-patterns.md §6
[ ] 断言 bean 注册：.run(ctx -> assertThat(ctx).hasSingleBean(XxxBean.class))
[ ] 断言 bean 不注册（@ConditionalOnProperty 验证）：.run(ctx -> assertThat(ctx).doesNotHaveBean(XxxBean.class))
[ ] @ConditionalOnProperty 测试同时覆盖三态：property=true / property=false / property 不设（matchIfMissing 路径）
[ ] @ConfigurationProperties 带 @NotEmpty / @NotNull 字段：未触发 condition 拒绝时必须提供占位值（否则 BindValidationException）
[ ] 测试方法命名：shouldRegisterXxx_whenYyy / shouldNotRegisterXxx_whenZzz
[ ] 模板来源参考：hongzhao-framework SaasXxlJobAutoConfigurationTest（spike 0.9.21 沉淀）
```

> Cross-link：本段对应的 framework 测试基础设施陷阱（hibernate-validator 缺失）见 `test-patterns.md` §6。

---

## 写 Java Repository 前

```
[lang-java Repository 检查清单]
当前文件：{path}/repository/XxxRepository.java（Spring Data MongoDB）

[ ] 接口 extends MongoRepository<Entity, ID>，ID 类型显式标注（默认 String）
[ ] 查询方法命名遵循 Spring Data 衍生关键词：findBy / findByXxxAnd / In / LessThan / Between / OrderBy
[ ] 单条查询返回 Optional<T>；多条返回 List<T>；分页用 Page<T> + Pageable 参数
[ ] 复杂条件用 @Query("{...}")（原生 MongoDB JSON），仅在衍生查询无法表达时使用
[ ] 不在 Repository 写实现，自定义实现走 XxxRepositoryCustom + XxxRepositoryImpl 模式
[ ] Service 层不直接用 MongoTemplate；统一通过 Repository 调用
[ ] 不在 Repository 抛业务异常（业务异常在 Service 抛 ServiceException）
[ ] 测试策略：Spring Data 衍生方法不必单测；自定义 @Query 用 @DataMongoTest 集成测试
[ ] 索引建在对应 Document Entity 类（@Indexed / @CompoundIndex），不在 Repository 注解
[ ] 大数据量查询用 Stream<T> 或 Pageable 分页避免 OOM
```

---

## 写 Java MongoDB Document 前

```
[lang-java MongoDB Document 检查清单]
当前文件：{path}/entity/Xxx.java（MongoDB 文档；与 MyBatis Entity 命名/注解互斥）

[ ] 类注解：@Data + @Document("collection_name") + @Accessors(chain=true) + @AllArgsConstructor + @NoArgsConstructor
[ ] 集合名 snake_case 单数（trade_order，不是 trade_orders / TradeOrder）
[ ] implements Serializable + serialVersionUID
[ ] @Id 来自 org.springframework.data.annotation.Id（不是 MongoId / TableId）
[ ] ID 类型默认 String；业务雪花 ID 显式 Long
[ ] 复合索引类级 @CompoundIndex(name="idx_xxx", def="{...}")，单字段索引 @Indexed
[ ] 日期字段 LocalDateTime + @JsonFormat(pattern="yyyy-MM-dd HH:mm:ss", timezone="GMT+8") + @DateTimeFormat
[ ] 字段加 @Schema(description="...") 用于 Swagger / OpenAPI
[ ] 嵌套对象作为字段类型（无需 Join），嵌套类用 @Data 但不加 @Document
[ ] 默认值用字段初始化表达式，禁止依赖数据库默认
[ ] 不继承 BaseEntity，不用 @TableName/@TableField/@TableLogic/@Version（这些是 MyBatis-Plus）
```
