# Service 单元测试模板

> `@ExtendWith(MockitoExtension.class)` + `@Mock` 模拟依赖。
> 注意：继承 `ServiceImpl` 的 Service 需通过**反射**注入 `baseMapper`。

```java
// hz-goods-service/src/test/java/.../BrandServiceTest.java
package com.hongzhao.platform.brand.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hongzhao.platform.brand.entity.Brand;
import com.hongzhao.platform.brand.mapper.BrandMapper;
import com.hongzhao.platform.brand.service.impl.BrandServiceImpl;
import com.hongzhao.platform.model.dto.brand.BrandDTO;
import com.hongzhao.platform.model.vo.brand.BrandVO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class BrandServiceTest {

    @Mock
    private BrandMapper brandMapper;

    // 其他被 Service 依赖的 Bean 也需要 @Mock
    @Mock
    private BrandAuthService brandAuthService;

    private BrandServiceImpl brandService;

    @BeforeEach
    void setUp() throws Exception {
        brandService = new BrandServiceImpl(brandAuthService, brandMapper);

        // 关键：手动通过反射将 @Mock 的 brandMapper 注入 ServiceImpl 的父类 baseMapper 字段
        Field baseMapperField = com.baomidou.mybatisplus.extension.service.impl.ServiceImpl.class
                .getDeclaredField("baseMapper");
        baseMapperField.setAccessible(true);
        baseMapperField.set(brandService, brandMapper);
    }

    @Nested
    @DisplayName("insert - 新增品牌")
    class InsertTests {

        @Test
        @DisplayName("新增品牌成功 - 名称不重复")
        void shouldInsertBrand_whenNameNotExists() {
            // given
            given(brandMapper.selectOne(any(LambdaQueryWrapper.class))).willReturn(null);
            given(brandMapper.insert(any(Brand.class))).willReturn(1);

            BrandDTO dto = new BrandDTO();
            dto.setBrandName("测试品牌");
            dto.setGroupId(100L);

            // when
            Boolean result = brandService.insert(dto);

            // then
            assertThat(result).isTrue();
            ArgumentCaptor<Brand> captor = ArgumentCaptor.forClass(Brand.class);
            verify(brandMapper).insert(captor.capture());
            assertThat(captor.getValue().getBrandName()).isEqualTo("测试品牌");
            assertThat(captor.getValue().getBrandGroupId()).isEqualTo(100L);
        }

        @Test
        @DisplayName("新增品牌失败 - 名称已存在时抛出异常")
        void shouldThrowException_whenNameAlreadyExists() {
            // given
            Brand existing = Brand.builder().id(1L).brandName("已存在品牌").build();
            given(brandMapper.selectOne(any(LambdaQueryWrapper.class))).willReturn(existing);

            BrandDTO dto = new BrandDTO();
            dto.setBrandName("已存在品牌");
            dto.setGroupId(100L);

            // when & then
            assertThatThrownBy(() -> brandService.insert(dto))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("品牌名称已存在");

            verify(brandMapper, never()).insert(any(Brand.class));
        }
    }

    @Nested
    @DisplayName("getByGroupId - 根据分组ID查询品牌")
    class GetByGroupIdTests {

        @Test
        @DisplayName("查询成功 - 返回品牌列表")
        void shouldReturnBrandList_whenGroupIdExists() {
            // given
            List<BrandVO> mockList = Arrays.asList(createBrandVO(1L, "品牌A"), createBrandVO(2L, "品牌B"));
            given(brandMapper.getByGroupId(100L)).willReturn(mockList);

            // when
            List<BrandVO> result = brandService.getByGroupId(100L);

            // then
            assertThat(result).hasSize(2);
            assertThat(result.get(0).getBrandName()).isEqualTo("品牌A");
        }

        @Test
        @DisplayName("查询成功 - 分组下无品牌返回空列表")
        void shouldReturnEmptyList_whenNoBrandsFound() {
            given(brandMapper.getByGroupId(999L)).willReturn(Collections.emptyList());

            assertThat(brandService.getByGroupId(999L)).isEmpty();
        }
    }

    // 辅助方法
    private BrandVO createBrandVO(Long id, String name) {
        BrandVO vo = new BrandVO();
        vo.setId(id);
        vo.setBrandName(name);
        return vo;
    }
}
```

---

## ServiceImpl chain-wrapper（`this.lambdaQuery()` / `lambdaUpdate()`）方法测试

> **何时用**：被测 Service 方法用 `this.lambdaQuery()...page()/list()/one()` 这类**链式 wrapper**
> 而不是直接 `baseMapper.selectXxx(...)` 时。
>
> **坑（§G.5 实证）**：直接 mock `baseMapper` 后调 `this.lambdaQuery()` 会抛
> `MybatisPlusException: Unable to get MybatisMapperProxy`——因为真实 `lambdaQuery()` 要从
> mapper **代理**提取实体元数据，而 Mockito mock 不是代理。
>
> **解法两件**：
> 1. `@BeforeAll` 用 `TableInfoHelper.initTableInfo(...)` 装载实体的 lambda 列缓存，
>    使 `wrapper.getTargetSql()` 能把 `Entity::getXxx` 解析成列名（断言 SQL 片段需要）。
> 2. `Mockito.spy(service)` + `doReturn(new LambdaQueryChainWrapper<>(mockMapper)).when(spy).lambdaQuery()`
>    绕开真实 `lambdaQuery()` 的代理提取；链式 `.like/.eq/...` 条件构建逻辑仍真实执行，
>    最后用 `ArgumentCaptor` 抓传给 `baseMapper.selectPage(page, wrapper)` 的 wrapper，断言其 `getTargetSql()`。

```java
// 被测：BrandServiceImpl.pageList(reqVO) { return this.lambdaQuery().like(...).page(sortPage); ... }
@ExtendWith(MockitoExtension.class)
class BrandChainQueryServiceTest {

    @Mock
    private BrandMapper brandMapper;

    private BrandServiceImpl brandService;

    @BeforeAll
    static void initTableInfo() {
        // 装载 Brand 的 MyBatis-Plus lambda 列缓存（否则 getTargetSql 无法解析 Brand::getXxx 列名）
        TableInfoHelper.initTableInfo(
                new MapperBuilderAssistant(new MybatisConfiguration(), ""), Brand.class);
    }

    @BeforeEach
    void setUp() throws Exception {
        brandService = new BrandServiceImpl(brandMapper);   // 或无参 + 反射注入
        Field f = ServiceImpl.class.getDeclaredField("baseMapper");
        f.setAccessible(true);
        f.set(brandService, brandMapper);
    }

    @Test
    @DisplayName("分页查询按 name 模糊过滤 - wrapper 含 name LIKE")
    void shouldFilterByNameLike_whenNameProvided() {
        // given：spy 服务并 stub lambdaQuery() 返回以 mock mapper 直接构造的 chain wrapper
        BrandServiceImpl spy = Mockito.spy(brandService);
        doReturn(new LambdaQueryChainWrapper<>(brandMapper)).when(spy).lambdaQuery();
        given(brandMapper.selectPage(any(IPage.class), any())).willReturn(new Page<>());

        BrandPageDTO dto = new BrandPageDTO();
        dto.setBrandName("茅台");

        // when
        spy.getPage(dto);

        // then：捕获传给 selectPage 的 wrapper，断言其 target SQL
        ArgumentCaptor<Wrapper> captor = ArgumentCaptor.forClass(Wrapper.class);
        verify(brandMapper).selectPage(any(IPage.class), captor.capture());
        assertThat(captor.getValue().getTargetSql()).contains("name LIKE");
    }
}
```

> 需要的额外 import：
> `com.baomidou.mybatisplus.core.MybatisConfiguration`、`com.baomidou.mybatisplus.core.metadata.TableInfoHelper`、
> `com.baomidou.mybatisplus.core.metadata.IPage`、`com.baomidou.mybatisplus.core.conditions.Wrapper`、
> `com.baomidou.mybatisplus.extension.conditions.query.LambdaQueryChainWrapper`、
> `org.apache.ibatis.builder.MapperBuilderAssistant`、`org.junit.jupiter.api.BeforeAll`。
>
> `nickname` 为空白时不追加条件的反向断言：`assertThat(wrapper.getTargetSql()).doesNotContain("name")`。
