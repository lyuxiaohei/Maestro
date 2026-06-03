# DTO Bean Validation 测试模板

> 直接使用 `Validator` API，不启动 Spring 容器。验证分组校验注解是否正确。

```java
// hz-goods-api/src/test/java/.../BrandDTOValidationTest.java
package com.hongzhao.platform.model.dto.brand;

import com.hongzhao.saas.common.group.Add;
import com.hongzhao.saas.common.group.Edit;
import com.hongzhao.saas.common.group.Remove;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import javax.validation.ConstraintViolation;
import javax.validation.Validation;
import javax.validation.Validator;
import javax.validation.ValidatorFactory;
import java.util.Arrays;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class BrandDTOValidationTest {

    private final Validator validator;

    BrandDTOValidationTest() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        this.validator = factory.getValidator();
    }

    @Nested
    @DisplayName("Add 校验组 - 新增品牌")
    class AddGroupTests {

        @Test
        @DisplayName("全部字段合法 - 校验通过")
        void shouldPass_whenAllFieldsValid() {
            BrandDTO dto = new BrandDTO();
            dto.setBrandName("合法品牌名");
            dto.setGroupId(100L);

            Set<ConstraintViolation<BrandDTO>> violations = validator.validate(dto, Add.class);

            assertThat(violations).isEmpty();
        }

        @Test
        @DisplayName("品牌名称为空 - 校验失败")
        void shouldFail_whenBrandNameIsBlank() {
            BrandDTO dto = new BrandDTO();
            dto.setBrandName("");
            dto.setGroupId(100L);

            Set<ConstraintViolation<BrandDTO>> violations = validator.validate(dto, Add.class);

            assertThat(violations).isNotEmpty();
            assertThat(violations).anyMatch(v -> v.getMessage().contains("品牌名称不能为空"));
        }

        @Test
        @DisplayName("品牌名称超长（>50字符）- 校验失败")
        void shouldFail_whenBrandNameExceedsMaxLength() {
            BrandDTO dto = new BrandDTO();
            dto.setBrandName("A".repeat(51));
            dto.setGroupId(100L);

            Set<ConstraintViolation<BrandDTO>> violations = validator.validate(dto, Add.class);

            assertThat(violations).anyMatch(v -> v.getMessage().contains("品牌名称长度不能超过50"));
        }

        @Test
        @DisplayName("品牌名称恰好50字符 - 校验通过")
        void shouldPass_whenBrandNameExactlyMaxLength() {
            BrandDTO dto = new BrandDTO();
            dto.setBrandName("A".repeat(50));
            dto.setGroupId(100L);

            Set<ConstraintViolation<BrandDTO>> violations = validator.validate(dto, Add.class);

            assertThat(violations).noneMatch(v -> v.getPropertyPath().toString().equals("brandName"));
        }

        @Test
        @DisplayName("分组ID为空 - 校验失败")
        void shouldFail_whenGroupIdIsNull() {
            BrandDTO dto = new BrandDTO();
            dto.setBrandName("品牌名");
            dto.setGroupId(null);

            Set<ConstraintViolation<BrandDTO>> violations = validator.validate(dto, Add.class);

            assertThat(violations).anyMatch(v -> v.getMessage().contains("分组id不能为空"));
        }
    }

    @Nested
    @DisplayName("Edit 校验组 - 编辑品牌")
    class EditGroupTests {

        @Test
        @DisplayName("品牌ID为空 - 校验失败")
        void shouldFail_whenIdIsNull() {
            BrandDTO dto = new BrandDTO();
            dto.setId(null);
            dto.setBrandName("品牌名");
            dto.setGroupId(100L);

            Set<ConstraintViolation<BrandDTO>> violations = validator.validate(dto, Edit.class);

            assertThat(violations).anyMatch(v -> v.getMessage().contains("品牌id不能为空"));
        }
    }

    @Nested
    @DisplayName("Remove 校验组 - 批量删除品牌")
    class RemoveGroupTests {

        @Test
        @DisplayName("ID列表不为空 - 校验通过")
        void shouldPass_whenIdListNotEmpty() {
            BrandDTO dto = new BrandDTO();
            dto.setIdList(Arrays.asList(1L, 2L, 3L));

            Set<ConstraintViolation<BrandDTO>> violations = validator.validate(dto, Remove.class);

            assertThat(violations).isEmpty();
        }

        @Test
        @DisplayName("ID列表为空 - 校验失败")
        void shouldFail_whenIdListIsEmpty() {
            BrandDTO dto = new BrandDTO();
            dto.setIdList(Arrays.asList());

            Set<ConstraintViolation<BrandDTO>> violations = validator.validate(dto, Remove.class);

            assertThat(violations).anyMatch(v -> v.getMessage().contains("品牌id不能为空"));
        }
    }
}
```
