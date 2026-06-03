# Mapper 模板

## Mapper 接口

> 路径：`xxx-service/src/main/java/com/hongzhao/platform/{业务域}/mapper/XxxMapper.java`

```java
package com.hongzhao.platform.brand.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.hongzhao.platform.brand.entity.Brand;
import com.hongzhao.platform.model.dto.brand.BrandPageDTO;
import com.hongzhao.platform.model.vo.brand.BrandVO;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface BrandMapper extends BaseMapper<Brand> {   // 继承 MP BaseMapper

    // 分页查询（Page 参数必须放第一位）
    Page<BrandVO> find(Page<Brand> page, @Param("param") BrandPageDTO dto);

    // 列表查询（与分页重载，无 Page 参数）
    List<BrandVO> find(@Param("param") BrandPageDTO dto);

    // 自定义查询
    List<BrandVO> getByGroupId(@Param("groupId") Long groupId);
}
```

## Mapper XML（SQL 映射）

> 路径：`xxx-service/src/main/resources/mapper/{业务域}/XxxMapper.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN"
        "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.hongzhao.platform.brand.mapper.BrandMapper">

    <!-- VO ResultMap（字段名与属性名不一致时使用） -->
    <resultMap type="com.hongzhao.platform.model.vo.brand.BrandVO" id="BrandVOMap">
        <id  property="id"          column="id"/>
        <result property="brandName"   column="brand_name"/>
        <result property="groupId"     column="group_id"/>
        <result property="groupName"   column="group_name"/>
        <result property="brandStatus" column="brand_status"/>
        <result property="createId"    column="create_id"/>
        <result property="createTime"  column="create_time"/>
        <result property="updateId"    column="update_id"/>
        <result property="updateTime"  column="update_time"/>
    </resultMap>

    <!-- 通用查询 SQL 片段 -->
    <sql id="selectBase">
        SELECT a.id,
               a.brand_name,
               a.brand_group_id AS group_id,
               b.group_name,
               a.brand_status,
               a.create_id,
               a.update_id,
               a.create_time,
               a.update_time
        FROM brand a
        LEFT JOIN brand_group b ON a.brand_group_id = b.id
        WHERE a.del_flag = 0
    </sql>

    <!-- 动态条件 SQL 片段 -->
    <sql id="whereCondition">
        <if test="param.brandName != null and param.brandName != ''">
            AND a.brand_name LIKE CONCAT('%', #{param.brandName}, '%')
        </if>
        <if test="param.brandStatus != null">
            AND a.brand_status = #{param.brandStatus}
        </if>
        <if test="param.brandIds != null and param.brandIds.size() > 0">
            AND a.id IN
            <foreach collection="param.brandIds" item="id" open="(" separator="," close=")">
                #{id}
            </foreach>
        </if>
        <if test="param.notBrandIds != null and param.notBrandIds.size() > 0">
            AND a.id NOT IN
            <foreach collection="param.notBrandIds" item="id" open="(" separator="," close=")">
                #{id}
            </foreach>
        </if>
    </sql>

    <!-- 分页查询 -->
    <select id="find" resultMap="BrandVOMap">
        <include refid="selectBase"/>
        <include refid="whereCondition"/>
        ORDER BY a.brand_name_letter ASC, a.create_time DESC
    </select>

    <!-- 自定义查询 -->
    <select id="getByGroupId" resultType="com.hongzhao.platform.model.vo.brand.BrandVO">
        SELECT a.id,
               a.brand_name,
               a.brand_group_id AS group_id,
               b.group_name
        FROM brand a
        LEFT JOIN brand_group b ON a.brand_group_id = b.id
        WHERE a.del_flag = 0
          AND a.brand_group_id = #{groupId}
        ORDER BY a.id DESC
    </select>

</mapper>
```
