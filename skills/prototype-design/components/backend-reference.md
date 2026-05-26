# UI 设计规范详细参考

> **注意：本文件为实际项目（React/Antd/Tailwind）的代码参考，不作为纯HTML原型生成规范。**
>
> 原型生成时以 `backend-components.md` 为准，使用纯HTML/CSS/JS实现。
> 本文件仅用于了解实际项目的设计细节（色彩值、间距、动画参数等），供还原视觉一致性时参考。

**系统名称**：商城运营后台 / 运营管理系统

**导航布局**：左侧边栏主导模式
- 顶部导航栏：只显示 Logo 和操作区（刷新、消息、用户信息）
- 左侧边栏：包含所有导航菜单项（支持多级子菜单）

## 一、完整色彩体系

### 功能色

```css
/* 主色系 */
--primary-color: #1890ff;
--primary-hover: #40a9ff;
--primary-active: #096dd9;

/* 功能色 */
--success-color: #52c41a;
--warning-color: #faad14;
--error-color: #ff4d4f;
--info-color: #1890ff;

/* 中性色 */
--heading-color: rgb(0 0 0 / 88%);
--text-color: #585858;
--text-secondary: #666666;
--text-tertiary: #8c8c8c;
```

### 背景色

```css
/* 页面背景 */
background-color: #f5f5f5;

/* 内容区背景 */
background-color: #ffffff;

/* 搜索栏/卡片背景 */
background-color: #fafafa;

/* 登录页背景 */
background-color: #409eff;
```

### 阴影配置

```css
/* Header阴影 */
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

/* 登录卡片阴影 */
box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
```

## 二、完整布局系统

### 页面容器

```less
.supplier-layout {
	display: flex;
	min-width: 1200px;
	height: 100%;
	background-color: #f5f5f5;

	.supplier-layout-container {
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
		overflow: hidden;

		.supplier-content {
			margin-top: 20px;
			flex: 1;
			overflow: hidden;
			background-color: #ffffff;
			max-width: 2000px;
			margin-left: auto;
			margin-right: auto;
			width: calc(100% - 80px);
			padding: 20px 20px 0 20px;
			display: flex;
			flex-direction: column;
			min-height: 0;
			height: 100%;
		}
	}
}
```

### Header布局

```less
.supplier-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	height: 64px;
	padding: 0 24px;
	background-color: #ffffff;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

	.header-logo {
		display: flex;
		align-items: center;
		min-width: 200px;

		.logo-text {
			display: flex;
			flex-direction: column;
			justify-content: center;

			.logo-title {
				font-size: 18px;
				font-weight: 600;
				color: #1890ff;
				line-height: 1.2;
			}

			.logo-version {
				font-size: 12px;
				color: #8c8c8c;
				line-height: 1.2;
				margin-top: 2px;
			}
		}
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 16px;
		min-width: 120px;
		justify-content: flex-end;

		.action-icon {
			font-size: 18px;
			color: #666666;
			cursor: pointer;
			transition: color 0.3s;

			&:hover {
				color: #1890ff;
			}
		}
	}
}
```

### Tab内容区高度计算

```tsx
// Tab内容区高度
style={{
  height: `calc(100vh - ${137}px)`
}}

// 表格滚动高度
scroll: { x: 1600, y: "calc(100vh - 425px)" }
```

## 三、组件详细规范

### BaseTable 完整配置

```tsx
import React from "react";
import { Table } from "antd";
import type { ColumnsType, TableProps } from "antd/es/table";

export interface BaseTablePagination {
	current: number;
	pageSize: number;
	total: number;
}

export interface BaseTableProps<RecordType> {
	loading: boolean;
	columns: ColumnsType<RecordType>;
	dataSource: RecordType[];
	rowKey?: string | ((record: RecordType) => React.Key);
	pagination: BaseTablePagination;
	onPaginationChange: (page: number, pageSize: number) => void;
	rowSelection?: TableProps<RecordType>["rowSelection"];
	scroll?: TableProps<RecordType>["scroll"];
}

function BaseTable<RecordType extends object>({
	loading,
	columns,
	dataSource,
	rowKey = "id",
	pagination,
	onPaginationChange,
	rowSelection,
	scroll
}: BaseTableProps<RecordType>) {
	return (
		<Table<RecordType>
			columns={columns}
			dataSource={dataSource}
			rowKey={rowKey}
			loading={loading}
			rowSelection={rowSelection}
			pagination={{
				current: pagination.current,
				pageSize: pagination.pageSize,
				total: pagination.total,
				showSizeChanger: true,
				showQuickJumper: true,
				showTotal: total => `共 ${total} 条`,
				pageSizeOptions: ["10", "20", "50", "100"],
				onChange: onPaginationChange,
				onShowSizeChange: onPaginationChange
			}}
			scroll={scroll ?? { x: 1600, y: "calc(100vh - 425px)" }}
		/>
	);
}
```

### DebounceSubmitButton 完整配置

```tsx
import React from "react";
import { Button, ButtonProps } from "antd";

export interface DebounceSubmitButtonProps extends Omit<ButtonProps, "onClick" | "loading"> {
	onClick: () => Promise<void> | void;
	debounceWait?: number; // 默认 300ms
	permission?: string | (() => boolean);
	checkPermission?: (permission: string) => boolean;
	noPermissionBehavior?: "disable" | "hidden"; // 默认 hidden
	autoDisableOnSubmit?: boolean; // 默认 true
}

// 使用示例
<DebounceSubmitButton type="primary" onClick={handleSubmit} debounceWait={500} permission="submit:order">
	提交订单
</DebounceSubmitButton>;
```

### ImageUpload 完整配置

```tsx
import { Form, Upload } from "antd";

interface ImageUploadProps {
	form: FormInstance;
	name: string | string[];
	rules?: any[];
	maxCount?: number; // 默认 1
	accept?: string; // 默认 "image/jpeg,image/jpg,image/png"
	showPreview?: boolean; // 默认 true
	exampleImage?: string;
	exampleImageAlt?: string; // 默认 "示例图片"
	uploadText?: string; // 默认 "上传"
	extra?: React.ReactNode;
	className?: string;
	style?: React.CSSProperties;
}

// 使用示例
<ImageUpload
	form={form}
	name="logo"
	rules={[{ required: true, message: "请上传Logo" }]}
	maxCount={1}
	exampleImage="/example.png"
	extra="支持 jpg、png 格式，大小不超过 2MB"
/>;
```

## 四、表单规范

### 登录表单完整样式

```less
.auth-form {
	.ant-input-affix-wrapper,
	.ant-input {
		height: 48px;
		font-size: 16px;
	}

	.ant-input-affix-wrapper {
		display: flex;
		align-items: center;
	}

	.ant-input-prefix {
		display: flex;
		align-items: center;
		margin-right: 8px;
	}

	.ant-input-affix-wrapper .ant-input {
		height: auto;
		line-height: 1.5;
	}
}
```

### 表单项配置

```tsx
// 标准表单项
<Form.Item
  name="fieldName"
  label="字段名称"
  rules={[{ required: true, message: "请输入字段名称" }]}
  className="mb-6"
>
  <Input placeholder="请输入" allowClear />
</Form.Item>

// 选择器
<Form.Item name="status" label="状态">
  <Select placeholder="请选择" allowClear>
    <Select.Option value={1}>启用</Select.Option>
    <Select.Option value={0}>禁用</Select.Option>
  </Select>
</Form.Item>

// 日期选择
<Form.Item name="date" label="日期">
  <DatePicker style={{ width: "100%" }} />
</Form.Item>
```

## 五、响应式断点

### Tailwind 默认断点

```css
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1536px
```

### 登录页响应式配置

```tsx
<div
	className="
  flex 
  w-[95%] 
  sm:w-[90%] 
  md:w-[75%] 
  lg:w-[70%] 
  xl:w-[65%] 
  2xl:max-w-[900px]
"
>
	{/* 内容 */}
</div>
```

## 六、动画详细配置

### 浮动动画

```less
@keyframes float {
	0%,
	100% {
		transform: translateY(0);
	}
	50% {
		transform: translateY(-20px);
	}
}

// 使用: animation: float 20s infinite ease-in-out;
```

### 弹跳动画

```less
@keyframes bounce {
	0%,
	100% {
		transform: translateY(0);
	}
	50% {
		transform: translateY(-10px);
	}
}

// 使用: animation: bounce 2s infinite;
```

### 页面切换动画

```less
.fade-enter {
	opacity: 0;
	transform: translateX(-30px);
}
.fade-enter-active,
.fade-exit-active {
	opacity: 1;
	transition: all 0.2s ease-out;
	transform: translateX(0);
}
.fade-exit {
	opacity: 0;
	transform: translateX(30px);
}
```

## 七、滚动条样式

```less
::-webkit-scrollbar {
	width: 8px;
	height: 8px;
	background-color: white;
}
::-webkit-scrollbar-thumb {
	background-color: #dddee0;
	border-radius: 20px;
	box-shadow: inset 0 0 0 white;
}
```

## 十、消息提示规范

```tsx
import { message } from "antd";

// 成功提示
message.success("操作成功");

// 错误提示
message.error("操作失败");

// 警告提示
message.warning("请先选择数据");

// 信息提示
message.info("功能待实现");
```

## 十一、确认弹窗规范

```tsx
import { Modal } from "antd";
import { ExclamationCircleFilled } from "@ant-design/icons";

const { confirm } = Modal;

// 确认删除
confirm({
	title: "确认删除",
	icon: <ExclamationCircleFilled />,
	content: "确定要删除吗？",
	onOk: async () => {
		// 执行删除
	},
	onCancel: () => {
		console.log("Cancel");
	}
});
```

## 十二、CSS Reset

项目使用自定义的 CSS Reset，位于 `src/styles/reset.less`：

- 移除所有元素的默认 padding、margin
- HTML5 语义化标签重置
- 表格边框合并
- html/body/#root 100% 宽高

## 十三、素材网格详细配置

### 5 列固定布局完整样式

```less
.material-grid-wrapper {
  display: block;
  width: 100%;

  .batch-action-bar {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 12px 16px;
    background: #fafafa;
    border-radius: 4px;
    margin-bottom: 16px;
  }

  .material-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 16px;
    padding: 4px;
  }

  .material-card {
    position: relative;
    background: #fff;
    border: 1px solid #f0f0f0;
    border-radius: 8px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.3s;

    &:hover {
      border-color: #1890ff;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

      .card-actions {
        opacity: 1;
      }
    }

    &.selected {
      border-color: #1890ff;
      background: #e6f4ff;

      .card-checkbox {
        opacity: 1;
      }
    }

    .card-checkbox {
      position: absolute;
      top: 8px;
      left: 8px;
      z-index: 10;
      opacity: 0;
      transition: opacity 0.2s;
    }

    &:hover .card-checkbox {
      opacity: 1;
    }

    .card-thumbnail {
      width: 100%;
      height: 120px;
      background: #f5f5f5;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;

      .ant-image {
        width: 100%;
        height: 100%;
        display: block;

        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          display: block;
        }
      }

      .video-thumbnail {
        position: relative;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;

        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          display: block;
        }

        .video-play-icon {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 36px;
          color: rgba(255, 255, 255, 0.9);
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }
      }
    }

    .card-info {
      padding: 10px 12px;

      .card-name-wrapper {
        margin-bottom: 6px;
        min-height: 22px;

        .card-name-editable {
          font-size: 13px;
          color: #333;
          font-weight: 500;
          cursor: pointer;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          padding: 2px 4px;
          border-radius: 2px;
          transition: all 0.2s;

          &:hover {
            background: #f5f5f5;
            color: #1890ff;
          }
        }

        .card-name-input {
          width: 100%;
          
          .ant-input {
            padding: 4px 8px;
            font-size: 13px;
            font-weight: 500;
          }
        }
      }

      .card-meta {
        display: flex;
        gap: 12px;
        font-size: 11px;
        color: #8c8c8c;

        .material-type {
          font-weight: 500;
          color: #722ed1;
          text-transform: uppercase;
        }

        span {
          &::after {
            content: '|';
            margin-left: 12px;
            color: #d9d9d9;
          }

          &:last-child::after {
            display: none;
          }
        }
      }

      .card-dimensions {
        font-size: 11px;
        color: #8c8c8c;
        margin-top: 4px;
      }
    }

    .card-actions {
      position: absolute;
      bottom: 8px;
      right: 8px;
      display: flex;
      gap: 4px;
      opacity: 0;
      transition: opacity 0.2s;
      background: rgba(255, 255, 255, 0.95);
      border-radius: 4px;
      padding: 4px;

      .ant-btn {
        padding: 4px 8px;
      }
    }
  }
}
```

## 十四、分页器详细配置

### 完整样式

```less
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 24px 0;
  background: transparent;
  border-top: none;
  margin-top: 16px;

  .total-text {
    margin-right: 24px;
    font-size: 14px;
    color: #666;
    font-weight: 400;
  }

  .ant-pagination {
    margin: 0;
    
    .ant-pagination-item {
      min-width: 36px;
      height: 36px;
      line-height: 34px;
      font-size: 14px;
      border-color: #e5e7eb;
      background: #fff;
      border-radius: 6px;
      transition: all 0.2s ease;
      
      &:hover {
        border-color: #1890ff;
        background: #fff;
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
        
        a {
          color: #1890ff;
        }
      }
      
      &.ant-pagination-item-active {
        background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
        border-color: #1890ff;
        font-weight: 500;
        box-shadow: 0 2px 8px rgba(24, 144, 255, 0.3);
        
        a {
          color: #fff;
        }
      }
    }
    
    .ant-pagination-prev,
    .ant-pagination-next {
      margin: 0 4px;
      
      .ant-pagination-item-link {
        border-color: #e5e7eb;
        border-radius: 6px;
        font-size: 14px;
        color: #666;
        background: #fff;
        transition: all 0.2s ease;
      }
      
      &:hover {
        .ant-pagination-item-link {
          border-color: #1890ff;
          color: #1890ff;
          background: #fff;
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
        }
      }
    }
    
    .ant-pagination-options {
      margin-left: 20px;
      
      .ant-select {
        margin-right: 0;
        
        .ant-select-selector {
          height: 36px !important;
          border-color: #e5e7eb;
          border-radius: 6px;
          background: #fff;
          font-size: 14px;
          color: #666;
          transition: all 0.2s ease;
          
          &:hover {
            border-color: #1890ff;
          }
          
          &.ant-select-focused {
            .ant-select-selector {
              border-color: #1890ff;
              box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
            }
          }
        }
      }
    }
    
    .ant-pagination-options-quick-jumper {
      margin-left: 16px;
      font-size: 14px;
      color: #666;
      
      input {
        width: 50px;
        height: 36px;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        padding: 4px 8px;
        font-size: 14px;
        text-align: center;
        transition: all 0.2s ease;
        
        &:hover,
        &:focus {
          border-color: #1890ff;
          box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
        }
      }
    }
  }
}
```

## 十五、Flex 布局容器最佳实践

### 问题场景

当使用 flex 布局时，如果内容分页切换，可能会出现卡片高度异常的问题。

### 解决方案

```less
// 右侧面板
.right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 20px;
  min-width: 0;

  // 固定区域必须设置 flex-shrink: 0
  .action-bar,
  .category-info,
  .pagination-wrapper {
    flex-shrink: 0; // 防止被压缩
  }

  // 可滚动容器
  .material-grid-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-height: 0; // 关键：允许缩小到内容以下
  }
}

// 素材网格容器不使用 flex 布局
.material-grid-wrapper {
  display: block;
  width: 100%;
}

// 素材网格使用 grid 布局
.material-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  padding: 4px;
}
```

### 关键要点

1. **滚动位置**：滚动应该发生在整个内容区域，而不是子元素内部
2. **flex-shrink: 0**：防止固定高度的元素被压缩
3. **min-height: 0**：允许 flex 子项缩小到内容以下（关键！）
4. **避免嵌套 flex**：素材网格使用 grid 而不是 flex
5. **正确的高度计算**：不要随意使用 height: 100%
