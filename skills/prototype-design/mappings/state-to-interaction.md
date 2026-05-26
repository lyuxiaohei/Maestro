# 状态流转到交互映射规则

定义如何将状态流转表映射到前端交互逻辑。

---

## 映射原则

**一流转一交互**：每条状态流转记录对应一个状态变更交互逻辑。

---

## 状态流转表结构

```markdown
| 当前状态 | 可执行操作 | 目标状态 | 执行者 |
|----------|-----------|----------|--------|
| {状态A} | {操作} | {状态B} | {执行者} |
```

---

## 状态样式映射

### 后台规范状态颜色

| 状态类型 | 颜色值 | CSS类名 | 使用场景 |
|----------|--------|----------|----------|
| 待处理/待审核 | `#ff9800` 橙色 | `.status-pending` | 待付款、待审核、待发货 |
| 进行中/运输中 | `#2196f3` 蓝色 | `.status-processing` | 运输中、处理中 |
| 成功/已完成/已通过 | `#52c41a` 绿色 | `.status-success` | 已完成、已通过、已签收 |
| 失败/已拒绝/已取消 | `#ee0a24` 红色 | `.status-error` | 已拒绝、已取消、已关闭 |
| 默认/灰色 | `#999` 灰色 | `.status-default` | 已失效、历史记录 |

### 小程序规范状态颜色

| 状态类型 | 颜色值 | CSS类名 | 使用场景 |
|----------|--------|----------|----------|
| 待处理/待审核 | `#ff9800` 橙色 | `.status-pending` | 待付款、待审核 |
| 进行中/运输中 | `#ff9800` 橙色 | `.status-processing` | 待发货、运输中 |
| 成功/已完成/已通过 | `#52c41a` 绿色 | `.status-success` | 已完成、已通过、已签收 |
| 失败/已拒绝/已取消 | `#ee0a24` 红色 | `.status-error` | 已拒绝、已取消 |
| 默认/灰色 | `#999` 灰色 | `.status-default` | 已关闭 |

---

## 状态流转映射流程

### Step 1: 状态节点提取

```
状态流转表 → 提取所有状态 → 生成状态枚举 → 映射状态样式
```

### Step 2: 流转触发提取

```
可执行操作列 → 提取触发动作 → 映射交互事件 → 绑定回调函数
```

### Step 3: 执行者判断

```
执行者列 → 判断用户角色 → 决定权限校验逻辑
```

### Step 4: 交互逻辑生成

```
触发动作 + 状态变更 → 生成 onclick/onsubmit 逻辑 → 生成状态更新代码
```

---

## 流转触发映射矩阵

| 可执行操作关键词 | 交互事件 | 触发组件 | 代码模式 |
|------------------|----------|----------|----------|
| 点击按钮、点击提交 | `onclick` | Button | `onclick="handleAction()"` |
| 点击确认、点击确认收货 | `onclick` | ConfirmButton | `onclick="confirmAction()"` |
| 点击取消、点击取消订单 | `onclick` | CancelButton | `onclick="cancelAction()"` |
| 系统自动、自动流转 | `定时任务` | Timer | `setTimeout/setInterval` |
| 超时、超时自动 | `定时检查` | Timer | `checkTimeout()` |
| 用户操作、用户发起 | `用户触发` | Button/Form | `用户主动操作` |
| 运营审核、运营审批 | `运营触发` | ApproveButton | `onclick="approve()"` |

---

## 执行者权限映射

| 执行者关键词 | 权限校验逻辑 | 前端处理 |
|--------------|--------------|----------|
| 用户 | 用户可操作 | 显示用户操作按钮 |
| 运营、运营人员 | 运营权限校验 | 显示运营操作按钮、隐藏用户按钮 |
| 系统 | 无需用户操作 | 自动流转、定时检查 |
| 管理员、管理员审批 | 管理员权限校验 | 显示管理员操作按钮 |

---

## 状态流转代码模式

### 单向流转（用户触发）

```javascript
// 状态流转：待付款 → 已取消
function cancelOrder(orderId) {
  // 1. 弹出确认弹窗
  showConfirmModal({
    title: '确认取消订单？',
    content: '取消后订单将无法恢复',
    onConfirm: () => {
      // 2. 调用API
      api.cancelOrder(orderId).then(res => {
        // 3. 更新状态
        updateOrderStatus(orderId, '已取消');
        // 4. 提示成功
        showToast('订单已取消');
      });
    }
  });
}
```

### 条件流转（带校验）

```javascript
// 状态流转：待审核 → 已通过（需校验拒绝原因）
function approveApply(applyId, reason) {
  // 1. 校验
  if (!reason && action === 'reject') {
    showToast('请输入拒绝原因');
    return;
  }
  
  // 2. 调用API
  api.approveApply(applyId, action, reason).then(res => {
    // 3. 更新状态
    updateApplyStatus(applyId, action === 'pass' ? '已通过' : '已拒绝');
    showToast(action === 'pass' ? '审核通过' : '审核拒绝');
  });
}
```

### 超时流转（定时检查）

```javascript
// 状态流转：待付款 → 已关闭（15分钟超时）
function checkPaymentTimeout(orderId, createTime) {
  const timeout = 15 * 60 * 1000; // 15分钟
  const buffer = 3 * 60 * 1000; // 3分钟缓冲期
  
  setInterval(() => {
    const elapsed = Date.now() - createTime;
    if (elapsed > timeout + buffer) {
      // 1. 调用API关闭订单
      api.closeOrder(orderId).then(res => {
        // 2. 更新状态
        updateOrderStatus(orderId, '已关闭');
        // 3. 释放库存
        releaseStock(orderId);
      });
    }
  }, 1000);
}
```

### 循环流转（重新申请）

```javascript
// 状态流转：已拒绝 → 待审核（重新申请）
function reapply(applyId, newData) {
  // 1. 预填充原申请数据
  const formData = getOriginalApplyData(applyId);
  // 2. 用户修改后提交
  api.reapply(applyId, formData).then(res => {
    // 3. 更新状态
    updateApplyStatus(applyId, '待审核');
    showToast('重新申请成功');
    // 4. 跳转进度页
    location.href = 'aftersales_progress.html';
  });
}
```

---

## 映射示例

### 示例流转1

```markdown
| 待付款 | 取消订单 | 已取消 | 用户 |
```

**映射分析：**
- 当前状态：待付款 → 橙色标签 `#ff9800`
- 可执行操作：取消订单 → `CancelButton` + `ConfirmModal`
- 目标状态：已取消 → 红色标签 `#ee0a24`
- 执行者：用户 → 显示用户操作按钮

**映射输出：**
```json
{
  "current_state": "待付款",
  "current_style": {"color": "#ff9800"},
  "trigger_action": "取消订单",
  "trigger_component": {
    "type": "CancelButton",
    "onclick": "cancelOrder(orderId)"
  },
  "target_state": "已取消",
  "target_style": {"color": "#ee0a24"},
  "executor": "user",
  "permission": "user_only"
}
```

### 示例流转2

```markdown
| 待审核 | 审核通过 | 已通过 | 运营 |
```

**映射分析：**
- 当前状态：待审核 → 橙色标签 `#ff9800`
- 可执行操作：审核通过 → `ApproveButton` + `ConfirmModal`
- 目标状态：已通过 → 绿色标签 `#52c41a`
- 执行者：运营 → 运营权限校验

**映射输出：**
```json
{
  "current_state": "待审核",
  "current_style": {"color": "#ff9800"},
  "trigger_action": "审核通过",
  "trigger_component": {
    "type": "ApproveButton",
    "text": "通过",
    "onclick": "approveApply(applyId, 'pass')"
  },
  "target_state": "已通过",
  "target_style": {"color": "#52c41a"},
  "executor": "运营",
  "permission": "operator_only"
}
```

### 示例流转3

```markdown
| 待付款 | 超时未支付（15分钟） | 已关闭 | 系统 |
```

**映射分析：**
- 当前状态：待付款 → 橙色标签
- 可执行操作：超时未支付 → 定时检查逻辑
- 目标状态：已关闭 → 灰色标签 `#999`
- 执行者：系统 → 自动流转

**映射输出：**
```json
{
  "current_state": "待付款",
  "current_style": {"color": "#ff9800"},
  "trigger_action": "超时未支付",
  "trigger_type": "timeout",
  "timeout_config": {
    "duration": "15分钟",
    "buffer": "3分钟"
  },
  "target_state": "已关闭",
  "target_style": {"color": "#999"},
  "executor": "system",
  "permission": "auto"
}
```

---

## 状态标记处理

| 状态标记 | 映射处理 |
|----------|----------|
| `[草案]` | 正常映射，标记来源为草案 |
| 状态含 `[草案]` 标记 | 状态样式正常生成，附加注释 |

---

## 状态流转未映射处理

| 未映射情况 | 处理方式 |
|------------|----------|
| 触发操作无法识别 | 使用基础 `onclick` 逻辑，提示补充 |
| 执行者无法识别 | 默认 `user`，提示补充 |
| 目标状态未定义 | 提示补充目标状态 |

---

## 状态管理代码生成

### 全局状态管理对象

```javascript
// 状态枚举
const STATUS_ENUM = {
  PENDING_PAYMENT: { value: '待付款', color: '#ff9800' },
  PENDING_SHIP: { value: '待发货', color: '#ff9800' },
  SHIPPED: { value: '待收货', color: '#ff9800' },
  COMPLETED: { value: '已完成', color: '#52c41a' },
  CANCELLED: { value: '已取消', color: '#ee0a24' },
  CLOSED: { value: '已关闭', color: '#999' }
};

// 状态更新函数
function updateStatus(id, newStatus) {
  const statusConfig = STATUS_ENUM[newStatus];
  document.querySelector(`#${id} .status-tag`).textContent = statusConfig.value;
  document.querySelector(`#${id} .status-tag`).style.background = statusConfig.color;
}
```