# Repository 模板（Spring Data MongoDB）

> 数据访问层之一，与 Mapper（MyBatis-Plus + MySQL）平级共存。
> 用于 MongoDB 数据访问；同模块可同时存在 Mapper 与 Repository，分别处理不同存储引擎。

## Repository 接口

> 路径：`xxx-service/src/main/java/com/hongzhao/platform/{业务域}/repository/XxxRepository.java`

```java
package com.hongzhao.platform.{业务域}.repository;

import com.hongzhao.platform.{业务域}.entity.Xxx;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Xxx Repository（Spring Data MongoDB）
 */
public interface XxxRepository extends MongoRepository<Xxx, String> {

    // ──────────────────────────────────────────
    // Spring Data 衍生查询（按命名约定，运行时自动生成实现）
    // ──────────────────────────────────────────

    /** 单条按字段精确匹配 */
    Optional<Xxx> findByFieldA(String fieldA);

    /** 多条按字段精确匹配 */
    List<Xxx> findByFieldB(String fieldB);

    /** 复合条件 And */
    List<Xxx> findByFieldAAndFieldB(String fieldA, Integer fieldB);

    /** In 集合查询 */
    List<Xxx> findByFieldAIn(List<String> fieldAs);

    /** 范围查询 */
    List<Xxx> findByCreateTimeLessThan(LocalDateTime createTime);
    List<Xxx> findByFieldBBetween(Integer min, Integer max);

    /** 排序 */
    List<Xxx> findByFieldAOrderByCreateTimeDesc(String fieldA);

    /** 分页 */
    Page<Xxx> findByFieldA(String fieldA, Pageable pageable);

    /** 计数 */
    long countByFieldA(String fieldA);

    /** 存在判定 */
    boolean existsByFieldA(String fieldA);

    /** 删除（按条件） */
    long deleteByFieldA(String fieldA);

    // ──────────────────────────────────────────
    // 复杂查询用 @Query（仅在衍生查询无法表达时使用）
    // ──────────────────────────────────────────

    /** 嵌套字段 + 条件运算 */
    @Query("{ 'fieldA': ?0, 'subDoc.value': { $gt: ?1 } }")
    List<Xxx> findCustom(String fieldA, Integer threshold);

    /** 文本搜索 */
    @Query("{ 'description': { $regex: ?0, $options: 'i' } }")
    List<Xxx> findByDescriptionLike(String pattern);
}
```

## 关键约定

| 约定 | 说明 |
|---|---|
| ID 类型 | 默认 `String`（MongoDB ObjectId 字符串化）；业务雪花 ID 用 `Long`，显式标注 `MongoRepository<Xxx, Long>` |
| 衍生查询关键词 | `findBy` / `findAllBy` / `countBy` / `existsBy` / `deleteBy` + 字段名 + 操作符（`And` / `Or` / `In` / `NotIn` / `LessThan` / `GreaterThan` / `Between` / `Like` / `OrderBy...Asc/Desc`）|
| 返回类型 | 单条 `Optional<T>`；多条 `List<T>`；分页 `Page<T>` + `Pageable` 参数；流式 `Stream<T>` 用于大数据量；计数 `long`；存在判定 `boolean` |
| @Query 用法 | 仅在衍生查询无法表达时使用；用 MongoDB JSON 原生语法；占位符 `?0 / ?1` 顺序对应方法参数 |
| 自定义实现 | 复杂业务逻辑走 `XxxRepositoryCustom` 接口 + `XxxRepositoryImpl` 实现类；Spring Data 自动组合 |
| Service 层访问 | Service 通过 Repository 调用，**禁止**在 Service 直接注入 `MongoTemplate`（除非确实需要 aggregate 等高级特性，且要在代码评审时说明） |
| 索引声明位置 | 在对应 Document Entity 类上用 `@Indexed` / `@CompoundIndex`，**不在** Repository 接口上 |
| 异常处理 | Repository 不抛业务异常；业务异常在 Service 抛 `ServiceException` |

## 测试策略

| 场景 | 策略 |
|---|---|
| 衍生查询方法（`findByXxx` 等） | **不必单测**——Spring Data 自动生成实现，行为由框架保证。通过 Service 层的集成测试间接覆盖即可 |
| `@Query` 自定义查询 | 用 `@DataMongoTest` + 嵌入式 MongoDB 或 Testcontainers 写集成测试；验证 JSON 语法和返回值正确性 |
| 自定义 `XxxRepositoryImpl` | 同 Service 测试（Mockito + given-when-then），按 `templates/test-service.md` 模式 |
| 大数据量场景 | 用 Stream<T> 或 Pageable 分页避免 OOM；测试时用 1000+ 模拟数据验证内存占用 |

## 与 Mapper 共存的注意点

| 维度 | Mapper（MyBatis-Plus） | Repository（Spring Data） |
|---|---|---|
| 数据源 | MySQL | MongoDB |
| 实体注解 | `@TableName` + `@TableField` + `@TableLogic` + 继承 `BaseEntity` | `@Document` + `@Id` + `@CompoundIndex` + `implements Serializable` |
| 查询方式 | LambdaQueryWrapper / XML SQL | 衍生查询命名 / `@Query` 原生 JSON |
| 事务 | `@Transactional`（MySQL 事务） | MongoDB 4.0+ 副本集才有事务，单机无事务保证 |
| ID 生成 | 雪花 ID（`Long`） | ObjectId（`String`）或业务自定义 |
| 复合索引 | DDL 直接建 | `@CompoundIndex` 启动时自动建（单机/副本集均支持） |

> 同模块若同时含 mapper/ 和 repository/，意味着该模块同时操作 MySQL 和 MongoDB。Service 层负责跨数据源的协调（按业务边界划分，避免分布式事务）。
