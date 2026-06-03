# Document 模板（MongoDB Entity）

> 数据库实体之一，与 MyBatis-Plus Entity（`templates/entity.md`）平级共存。
> 用于 Spring Data MongoDB 的 `@Document` 文档映射；同模块可同时含 MyBatis Entity 与 MongoDB Document。

## MongoDB Document 实体

> 路径：`xxx-service/src/main/java/com/hongzhao/platform/{业务域}/entity/Xxx.java`

```java
package com.hongzhao.platform.{业务域}.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.Accessors;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.format.annotation.DateTimeFormat;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Xxx 文档（MongoDB）
 */
@Data
@Document("xxx_collection")            // ← MongoDB 集合名（snake_case 单数）
@Accessors(chain = true)
@AllArgsConstructor
@NoArgsConstructor
@CompoundIndex(name = "idx_a_b", def = "{'fieldA': 1, 'fieldB': 1}")    // 复合索引（如需）
public class Xxx implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 主键（业务无明确语义建议 String + ObjectId；雪花 ID 用 Long）
     */
    @Id
    @Schema(description = "ID")
    private String id;

    /**
     * 单字段索引（如需）
     */
    @Indexed
    @Schema(description = "字段 A")
    private String fieldA;

    @Schema(description = "字段 B")
    private Integer fieldB;

    /**
     * 金额：BigDecimal，禁 float/double
     */
    @Schema(description = "金额")
    private BigDecimal amount;

    /**
     * 创建时间：LocalDateTime + JsonFormat + DateTimeFormat
     */
    @Schema(description = "创建时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createTime;

    /**
     * 嵌套对象（MongoDB 原生支持嵌套，无需 Join）
     */
    private SubDoc subDoc;

    /**
     * 嵌套数组
     */
    private List<ItemInfo> items;

    /**
     * 默认值用初始化表达式（无需读 DB 默认）
     */
    private Integer source = 0;
}
```

## 嵌套对象类（不加 @Document）

```java
package com.hongzhao.platform.{业务域}.entity;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.Accessors;

import java.io.Serializable;

/**
 * Xxx 嵌套对象
 */
@Data
@Accessors(chain = true)
@AllArgsConstructor
@NoArgsConstructor
public class SubDoc implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "嵌套字段")
    private String value;

    @Schema(description = "嵌套金额")
    private java.math.BigDecimal price;
}
```

## 关键约定

| 注解 / 用法 | 说明 |
|---|---|
| `@Document("name")` | 集合名 snake_case 单数（`trade_order` / `drop_ship_order`），与 MyBatis 表名同规约 |
| `@Id` | 来自 `org.springframework.data.annotation.Id`，**不是** MyBatis-Plus 的 `@TableId`，**不是** `org.springframework.data.mongodb.core.mapping.MongoId` |
| `@Indexed` | 单字段索引，注在字段上 |
| `@CompoundIndex(name, def)` | 复合索引，注在类上；`def` 用 MongoDB JSON 语法（`1` 升序、`-1` 降序） |
| `@Data` + `@Accessors(chain=true)` + `@AllArgsConstructor` + `@NoArgsConstructor` | Lombok 必备 4 件套 |
| `implements Serializable` + `serialVersionUID` | 必需（缓存 / RPC 场景） |
| `@Schema(description="...")` | 字段级 Swagger 文档；对外暴露字段必加 |
| 日期处理 | `LocalDateTime` + `@JsonFormat(pattern="yyyy-MM-dd HH:mm:ss", timezone="GMT+8")` + `@DateTimeFormat`；不存 `String` 时间 |
| 金额处理 | `BigDecimal`，禁 `float` / `double` |
| 嵌套对象 | 直接作为字段类型，MongoDB 原生支持嵌套；嵌套类用 `@Data` 但**不加** `@Document` |
| 默认值 | 用字段初始化表达式（如 `private Integer source = 0;`），不依赖数据库默认 |

## 与 MyBatis Entity 的互斥

MongoDB Document **不能**：

| 不能用 | 原因 |
|---|---|
| `extends BaseEntity` | BaseEntity 是 MyBatis-Plus 的，含 `@TableField` 等 MyBatis 注解 |
| `@TableName` / `@TableField` / `@TableLogic` / `@Version` | MyBatis-Plus 专用，MongoDB 无效 |
| MyBatis-Plus 的 `@TableId(type = IdType.ASSIGN_ID)` | MongoDB 用 `@Id`（来自 Spring Data） |
| 逻辑删除字段 `del_flag` 配合 `@TableLogic` | MongoDB 没有等价机制；如需软删自己加状态字段 |

如同模块同时存在 MySQL 与 MongoDB 数据源：

- MySQL Entity → 命名 `XxxEntity.java` / `XxxDO.java`，按 `entity.md` 模板
- MongoDB Document → 命名为业务名（`Xxx.java`，不带 Entity/DO 后缀），按本模板
- 两类文件可放在同一 `entity/` 目录；Repository / Mapper 各自引用各自的实体类
