# Service 模板

## Service 接口

> 路径：`xxx-service/src/main/java/com/hongzhao/platform/{业务域}/service/XxxService.java`

```java
package com.hongzhao.platform.brand.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.hongzhao.platform.brand.entity.Brand;
import com.hongzhao.platform.model.dto.brand.BrandDTO;
import com.hongzhao.platform.model.dto.brand.BrandPageDTO;
import com.hongzhao.platform.model.dto.brand.BrandStatusDTO;
import com.hongzhao.platform.model.vo.brand.BrandVO;

import java.util.List;
import java.util.Map;
import java.util.Set;

public interface BrandService extends IService<Brand> {    // 继承 MP 的 IService

    /** 分页查询 */
    Page<BrandVO> getPage(BrandPageDTO dto);

    /** 列表查询 */
    List<BrandVO> getList(BrandPageDTO dto);

    /** 新增 */
    Boolean insert(BrandDTO dto);

    /** 编辑 */
    Boolean edit(BrandDTO dto);

    /** 批量删除（逻辑删除） */
    Boolean deleteBatch(BrandDTO dto);

    /** 启用/禁用 */
    Boolean updateStatus(BrandStatusDTO dto);

    /** 根据分组查询 */
    List<BrandVO> getByGroupId(Long groupId);

    /** 工具方法：根据 ID 集合获取名称映射 */
    Map<Long, String> getBrandNameMap(Set<Long> brandIds);
}
```

## ServiceImpl 实现

> 路径：`xxx-service/src/main/java/com/hongzhao/platform/{业务域}/service/impl/XxxServiceImpl.java`

```java
package com.hongzhao.platform.brand.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.hongzhao.platform.brand.entity.Brand;
import com.hongzhao.platform.brand.mapper.BrandMapper;
import com.hongzhao.platform.brand.service.BrandService;
import com.hongzhao.platform.model.dto.brand.BrandDTO;
import com.hongzhao.platform.model.dto.brand.BrandPageDTO;
import com.hongzhao.platform.model.dto.brand.BrandStatusDTO;
import com.hongzhao.platform.model.vo.brand.BrandVO;
import com.hongzhao.saas.common.exception.ServiceException;
import com.hongzhao.saas.common.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Log4j2
public class BrandServiceImpl extends ServiceImpl<BrandMapper, Brand> implements BrandService {

    private final BrandMapper brandMapper;

    @Override
    public Page<BrandVO> getPage(BrandPageDTO dto) {
        log.info("分页查询品牌，参数：{}", dto);
        return brandMapper.find(dto.getPage(), dto);
    }

    @Override
    public List<BrandVO> getList(BrandPageDTO dto) {
        return brandMapper.find(dto);
    }

    @Override
    public Boolean insert(BrandDTO dto) {
        log.info("新增品牌：{}", dto);
        checkNameUnique(dto.getBrandName(), null);
        Brand brand = Brand.builder()
                .brandName(dto.getBrandName())
                .brandGroupId(dto.getGroupId())
                .brandStatus(1)              // 默认启用
                .build();
        baseMapper.insert(brand);
        return true;
    }

    @Override
    public Boolean edit(BrandDTO dto) {
        log.info("编辑品牌：{}", dto);
        Brand brand = baseMapper.selectById(dto.getId());
        if (brand == null) {
            throw new ServiceException("品牌不存在");
        }
        if (!brand.getBrandName().equals(dto.getBrandName())) {
            checkNameUnique(dto.getBrandName(), dto.getId());
        }
        brand.setBrandName(dto.getBrandName());
        brand.setBrandGroupId(dto.getGroupId());
        brand.setUpdateId(SecurityUtils.getUserId());
        brand.setUpdateTime(LocalDateTime.now());
        updateById(brand);
        return true;
    }

    @Override
    public Boolean deleteBatch(BrandDTO dto) {
        log.info("批量删除品牌：{}", dto.getIdList());
        // 逻辑删除，MyBatis-Plus 自动处理 delFlag
        removeByIds(dto.getIdList());
        return true;
    }

    @Override
    public Boolean updateStatus(BrandStatusDTO dto) {
        Brand brand = new Brand();
        brand.setId(dto.getId());
        brand.setBrandStatus(dto.getStatus());
        brand.setUpdateId(SecurityUtils.getUserId());
        brand.setUpdateTime(LocalDateTime.now());
        updateById(brand);
        return true;
    }

    @Override
    public List<BrandVO> getByGroupId(Long groupId) {
        return brandMapper.getByGroupId(groupId);
    }

    @Override
    public Map<Long, String> getBrandNameMap(Set<Long> brandIds) {
        return list(new LambdaQueryWrapper<Brand>().in(Brand::getId, brandIds))
                .stream()
                .collect(Collectors.toMap(Brand::getId, Brand::getBrandName));
    }

    // 私有校验方法
    private void checkNameUnique(String brandName, Long excludeId) {
        LambdaQueryWrapper<Brand> wrapper = new LambdaQueryWrapper<Brand>()
                .eq(Brand::getBrandName, brandName);
        if (excludeId != null) {
            wrapper.ne(Brand::getId, excludeId);
        }
        if (baseMapper.selectCount(wrapper) > 0) {
            throw new ServiceException("品牌名称已存在");
        }
    }
}
```
