# Controller 模板

> 路径：`xxx-service/src/main/java/com/hongzhao/platform/{业务域}/controller/XxxController.java`
>
> **规则：Controller 实现 API 接口，方法体只调用 Service，不写任何业务逻辑。**

```java
package com.hongzhao.platform.brand.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.hongzhao.platform.api.brand.BrandApi;
import com.hongzhao.platform.brand.service.BrandService;
import com.hongzhao.platform.model.dto.brand.BrandDTO;
import com.hongzhao.platform.model.dto.brand.BrandPageDTO;
import com.hongzhao.platform.model.dto.brand.BrandStatusDTO;
import com.hongzhao.platform.model.vo.brand.BrandVO;
import com.hongzhao.saas.common.pojo.CommonResult;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor                     // 构造器注入，不用 @Autowired
public class BrandController implements BrandApi {

    private final BrandService brandService;

    @Override
    public CommonResult<Page<BrandVO>> getPage(BrandPageDTO dto) {
        return CommonResult.success(brandService.getPage(dto));
    }

    @Override
    public CommonResult<List<BrandVO>> getList(BrandPageDTO dto) {
        return CommonResult.success(brandService.getList(dto));
    }

    @Override
    public CommonResult<Boolean> insert(BrandDTO dto) {
        return CommonResult.success(brandService.insert(dto));
    }

    @Override
    public CommonResult<Boolean> edit(BrandDTO dto) {
        return CommonResult.success(brandService.edit(dto));
    }

    @Override
    public CommonResult<Boolean> deleteBatch(BrandDTO dto) {
        return CommonResult.success(brandService.deleteBatch(dto));
    }

    @Override
    public CommonResult<Boolean> updateStatus(BrandStatusDTO dto) {
        return CommonResult.success(brandService.updateStatus(dto));
    }

    @Override
    public CommonResult<List<BrandVO>> getByGroupId(Long groupId) {
        return CommonResult.success(brandService.getByGroupId(groupId));
    }
}
```
