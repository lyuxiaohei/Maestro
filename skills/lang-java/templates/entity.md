# Entity 模板

> 路径：`xxx-service/src/main/java/com/hongzhao/platform/{业务域}/entity/Xxx.java`

```java
package com.hongzhao.platform.brand.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.hongzhao.saas.common.pojo.BaseEntity;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@TableName("brand")                          // 对应数据库表名（单数、小写下划线）
public class Brand extends BaseEntity {      // BaseEntity 含公共字段

    private static final long serialVersionUID = 1L;

    @TableId(value = "id", type = IdType.ASSIGN_ID)   // 雪花 ID
    private Long id;

    @Schema(name = "品牌分组ID")
    @TableField("brand_group_id")
    private Long brandGroupId;

    @Schema(name = "品牌名称")
    @TableField("brand_name")
    private String brandName;

    @Schema(name = "品牌状态：0禁用，1启用")
    @TableField("brand_status")
    private Integer brandStatus;             // 状态字段用 Integer，不用 Boolean

    @Schema(name = "品牌名称英文首字母")
    @TableField("brand_name_letter")
    private String brandNameLetter;
}
```

## BaseEntity 约定字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `createTime` | `LocalDateTime` | 创建时间 |
| `updateTime` | `LocalDateTime` | 更新时间 |
| `createId` | `String` | 创建人 ID |
| `updateId` | `String` | 更新人 ID |
| `tenantId` | `Long` | 租户 ID |
| `delFlag` | `Integer` | 逻辑删除（0未删，1已删）|
| `deptId` | `Long` | 部门 ID |
