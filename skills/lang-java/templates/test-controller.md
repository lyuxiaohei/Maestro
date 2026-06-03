# Controller 单元测试模板

> 使用 `MockMvcBuilders.standaloneSetup()` 构建轻量级 MockMvc，不启动 Spring 容器。
> 通过 `Mockito.mock()` 创建 Service mock，构造器注入到 Controller。

```java
// hz-goods-service/src/test/java/.../BrandControllerTest.java
package com.hongzhao.platform.brand.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.hongzhao.platform.brand.service.BrandService;
import com.hongzhao.platform.model.dto.brand.BrandDTO;
import com.hongzhao.platform.model.dto.brand.BrandPageDTO;
import com.hongzhao.platform.model.vo.brand.BrandVO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Arrays;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class BrandControllerTest {

    private MockMvc mockMvc;
    private BrandService mockBrandService;

    @BeforeEach
    void setUp() {
        mockBrandService = org.mockito.Mockito.mock(BrandService.class);
        BrandController controller = new BrandController(mockBrandService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Nested
    @DisplayName("POST /brand/getPage - 分页查询品牌")
    class GetPageTests {

        @Test
        @DisplayName("成功返回分页数据")
        void shouldReturnPagedData() throws Exception {
            // given
            Page<BrandVO> mockPage = new Page<>(1, 10, 2);
            BrandVO vo = new BrandVO();
            vo.setId(1L);
            vo.setBrandName("测试品牌");
            mockPage.setRecords(Arrays.asList(vo));
            given(mockBrandService.getPage(any(BrandPageDTO.class))).willReturn(mockPage);

            // when & then
            mockMvc.perform(post("/brand/getPage")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value(200));
        }
    }

    @Nested
    @DisplayName("POST /brand/insert - 新增品牌")
    class InsertTests {

        @Test
        @DisplayName("新增成功返回 true")
        void shouldReturnTrue_whenInsertSucceeds() throws Exception {
            // given
            given(mockBrandService.insert(any(BrandDTO.class))).willReturn(true);

            // when & then
            mockMvc.perform(post("/brand/insert")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"brandName\":\"新品牌\",\"groupId\":1}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data").value(true));

            // 验证 Service 接收到的参数
            then(mockBrandService).should().insert(argThat(dto ->
                    "新品牌".equals(dto.getBrandName()) && dto.getGroupId().equals(1L)
            ));
        }
    }

    @Nested
    @DisplayName("GET /brand/getByGroupId - 按分组查询品牌")
    class GetByGroupIdTests {

        @Test
        @DisplayName("成功返回品牌列表")
        void shouldReturnBrandList() throws Exception {
            // given
            BrandVO vo = new BrandVO();
            vo.setId(1L);
            vo.setBrandName("品牌A");
            given(mockBrandService.getByGroupId(100L)).willReturn(Arrays.asList(vo));

            // when & then
            mockMvc.perform(get("/brand/getByGroupId").param("groupId", "100"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data[0].brandName").value("品牌A"));
        }
    }
}
```
