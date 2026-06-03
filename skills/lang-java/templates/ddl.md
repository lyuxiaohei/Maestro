# 数据库建表模板

```sql
CREATE TABLE `brand` (
  `id`               bigint unsigned    NOT NULL COMMENT '主键ID（雪花）',
  `brand_name`       varchar(50)        NOT NULL COMMENT '品牌名称',
  `brand_group_id`   bigint unsigned    NOT NULL COMMENT '品牌分组ID',
  `brand_status`     tinyint unsigned   NOT NULL DEFAULT 1 COMMENT '状态：0禁用，1启用',
  `tenant_id`        bigint unsigned    NOT NULL DEFAULT 0 COMMENT '租户ID',
  `dept_id`          bigint unsigned    NOT NULL DEFAULT 0 COMMENT '部门ID',
  `create_user_id`   varchar(64)        NOT NULL DEFAULT '' COMMENT '创建人ID',
  `update_user_id`   varchar(64)        NOT NULL DEFAULT '' COMMENT '更新人ID',
  `create_time`      datetime           NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time`      datetime           NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `del_flag`         tinyint unsigned   NOT NULL DEFAULT 0 COMMENT '逻辑删除：0未删，1已删',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_brand_name` (`brand_name`),
  KEY `idx_brand_group_id` (`brand_group_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='品牌表';
```

## 建表强制约定

- 主键：`bigint unsigned`，雪花 ID
- 时间字段：`datetime` 类型（对应 Java `LocalDateTime`）
- 状态/是否字段：`tinyint unsigned`，命名 `is_xxx` 或 `xxx_status`
- 金额字段：`decimal`，禁止 `float`/`double`
- 表必备字段：`create_time`、`create_user_id`、`update_time`、`update_user_id`、`tenant_id`、`del_flag`、`dept_id`
- 逻辑删除：`del_flag`（0未删，1已删），禁止物理删除
- 不使用存储过程、触发器、函数
- 索引命名：主键 `pk_`、唯一 `uk_`、普通 `idx_`
- 兼容 MySQL 5.7 字符集（不用 `utf8mb4_0900_ai_ci`）
