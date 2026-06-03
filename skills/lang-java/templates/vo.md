# VO 模板

> 路径：`xxx-api/src/main/java/com/hongzhao/platform/model/vo/{业务域}/XxxVO.java`

```java
package com.hongzhao.platform.model.vo.brand;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

@Data
public class BrandVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "品牌ID")
    private Long id;

    @Schema(description = "品牌名称")
    private String brandName;

    @Schema(description = "分组ID")
    private Long groupId;

    @Schema(description = "分组名称")
    private String groupName;

    @Schema(description = "品牌状态：0禁用，1启用")
    private Integer brandStatus;

    @Schema(description = "创建人")
    private String createId;

    @Schema(description = "创建时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private LocalDateTime createTime;        // 统一使用 LocalDateTime

    @Schema(description = "更新时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private LocalDateTime updateTime;

    @Schema(description = "商标注册证数量")
    private Long regCount = 0L;

    @Schema(description = "授权供应商数量")
    private Long providerCount = 0L;
}
```
