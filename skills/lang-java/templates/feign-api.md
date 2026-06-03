# Feign API 接口模板

> 路径：`xxx-api/src/main/java/com/hongzhao/platform/api/{业务域}/XxxApi.java`

```java
package com.hongzhao.platform.api.brand;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.hongzhao.platform.model.dto.brand.BrandDTO;
import com.hongzhao.platform.model.dto.brand.BrandPageDTO;
import com.hongzhao.platform.model.dto.brand.BrandStatusDTO;
import com.hongzhao.platform.model.vo.brand.BrandVO;
import com.hongzhao.saas.common.group.Add;
import com.hongzhao.saas.common.group.Edit;
import com.hongzhao.saas.common.group.Remove;
import com.hongzhao.saas.common.pojo.CommonResult;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@FeignClient(value = "hz-goods", contextId = "BrandApi")   // value=服务名, contextId 唯一
@Tag(name = "品牌管理")
public interface BrandApi {

    // URI 风格：/服务节点/接口类型/资源/动作
    String PREFIX = "/brand";

    @PostMapping(PREFIX + "/getPage")
    CommonResult<Page<BrandVO>> getPage(@RequestBody BrandPageDTO dto);

    @PostMapping(PREFIX + "/getList")
    CommonResult<List<BrandVO>> getList(@RequestBody BrandPageDTO dto);

    @PostMapping(PREFIX + "/insert")
    CommonResult<Boolean> insert(@RequestBody @Validated({Add.class}) BrandDTO dto);

    @PostMapping(PREFIX + "/edit")
    CommonResult<Boolean> edit(@RequestBody @Validated({Edit.class}) BrandDTO dto);

    @PostMapping(PREFIX + "/deleteBatch")
    CommonResult<Boolean> deleteBatch(@RequestBody @Validated({Remove.class}) BrandDTO dto);

    @PostMapping(PREFIX + "/updateStatus")
    CommonResult<Boolean> updateStatus(@RequestBody @Validated({Edit.class}) BrandStatusDTO dto);

    @GetMapping(PREFIX + "/getByGroupId")
    CommonResult<List<BrandVO>> getByGroupId(@RequestParam("groupId") Long groupId);
}
```
