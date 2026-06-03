# DTO 模板

## 请求 DTO

> 路径：`xxx-api/src/main/java/com/hongzhao/platform/model/dto/{业务域}/XxxDTO.java`

```java
package com.hongzhao.platform.model.dto.brand;

import com.hongzhao.saas.common.group.Add;
import com.hongzhao.saas.common.group.Edit;
import com.hongzhao.saas.common.group.Remove;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import org.hibernate.validator.constraints.Length;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotEmpty;
import javax.validation.constraints.NotNull;
import java.io.Serializable;
import java.util.List;

@Data
public class BrandDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "品牌ID（编辑/删除时必填）")
    @NotNull(groups = {Edit.class}, message = "品牌ID不能为空")
    private Long id;

    @Schema(description = "品牌ID列表（批量删除时必填）")
    @NotEmpty(groups = {Remove.class}, message = "品牌ID不能为空")
    private List<Long> idList;

    @Schema(description = "品牌名称")
    @NotBlank(groups = {Add.class, Edit.class}, message = "品牌名称不能为空")
    @Length(groups = {Add.class, Edit.class}, max = 50, message = "品牌名称不能超过50字符")
    private String brandName;

    @Schema(description = "分组ID")
    @NotNull(groups = {Add.class, Edit.class}, message = "分组ID不能为空")
    private Long groupId;
}
```

## 分页请求 DTO

> 路径：`xxx-api/src/main/java/com/hongzhao/platform/model/dto/{业务域}/XxxPageDTO.java`

```java
package com.hongzhao.platform.model.dto.brand;

import com.hongzhao.saas.common.annotations.Trim;
import com.hongzhao.saas.common.pojo.SortablePageParam;   // 继承分页基类
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.io.Serializable;
import java.util.Set;

@Data
public class BrandPageDTO extends SortablePageParam implements Serializable {

    private static final long serialVersionUID = 1L;

    @Trim
    @Schema(description = "品牌名称（模糊搜索）")
    private String brandName;

    @Schema(description = "品牌状态：0禁用，1启用")
    private Integer brandStatus;

    // 内部传参字段（不对外暴露含义）
    private Set<Long> brandIds;
    private Set<Long> notBrandIds;
}
```
