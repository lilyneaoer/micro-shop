# 营业额趋势图 - 复合图表优化

## 需求

将营业额趋势图改为复合图表：

- **营业额**：折线图（保持不变）
- **订单数**：柱状图（新增）

## 实现方案

### 图表类型

使用 G2 的复合图表功能，在同一个 Chart 实例上叠加多个 mark：

1. `.interval()` - 柱状图显示订单数
2. `.line()` - 折线图显示营业额
3. `.point()` - 在折线上添加数据点

### 代码实现

**文件：`web-admin/src/views/stats/index.vue`**

```typescript
function renderRevenueChart(
  data: Array<{ date: string; revenue: number; orderCount: number }>,
) {
  if (!revenueChartRef.value) return;

  if (revenueChart) {
    revenueChart.destroy();
  }

  // 准备数据：分别准备营业额和订单数的数据
  const revenueData = data.map((item) => ({
    date: item.date,
    value: formatAmount(item.revenue),
    type: "营业额（元）",
  }));

  const orderData = data.map((item) => ({
    date: item.date,
    value: item.orderCount,
    type: "订单数",
  }));

  // 创建图表
  revenueChart = new Chart({
    container: revenueChartRef.value,
    autoFit: true,
  });

  // 1. 添加柱状图（订单数）- 背景层
  revenueChart
    .interval()
    .data(orderData)
    .encode("x", "date")
    .encode("y", "value")
    .style("fill", "#67C23A") // 绿色
    .style("fillOpacity", 0.6) // 半透明
    .axis("y", {
      title: "订单数",
      position: "right", // 右侧 Y 轴
    })
    .tooltip({ name: "订单数", channel: "y" });

  // 2. 添加折线图（营业额）- 前景层
  revenueChart
    .line()
    .data(revenueData)
    .encode("x", "date")
    .encode("y", "value")
    .encode("shape", "smooth") // 平滑曲线
    .style("stroke", "#409EFF") // 蓝色
    .style("lineWidth", 3) // 较粗的线条
    .axis("y", {
      title: "营业额（元）",
      position: "left", // 左侧 Y 轴
    })
    .tooltip({ name: "营业额（元）", channel: "y" });

  // 3. 添加数据点（营业额）- 强调数据点
  revenueChart
    .point()
    .data(revenueData)
    .encode("x", "date")
    .encode("y", "value")
    .style("fill", "#409EFF") // 蓝色
    .style("r", 3) // 半径 3px
    .tooltip(false); // 不显示 tooltip（折线已有）

  revenueChart.render();
}
```

## 关键特性

### 1. 双 Y 轴设计

- **左侧 Y 轴**：营业额（元）- 数值较大
- **右侧 Y 轴**：订单数 - 数值较小
- 两个指标使用不同的刻度，避免数值差异导致的显示问题

### 2. 视觉层次

- **柱状图**：半透明（`fillOpacity: 0.6`），作为背景层
- **折线图**：实线（`lineWidth: 3`），作为前景层
- **数据点**：小圆点（`r: 3`），强调关键数据

### 3. 颜色方案

- **营业额**：蓝色（`#409EFF`）- 主要指标
- **订单数**：绿色（`#67C23A`）- 辅助指标

### 4. 交互体验

- 鼠标悬停时分别显示营业额和订单数的 tooltip
- 平滑曲线使趋势更清晰

## 数据流

```
原始数据（API 返回）
  ↓
[
  { date: '2026-04-20', revenue: 318100, orderCount: 37 },
  { date: '2026-04-21', revenue: 339300, orderCount: 39 },
  ...
]
  ↓
分离为两个数据集
  ↓
revenueData: [                    orderData: [
  { date: '2026-04-20',             { date: '2026-04-20',
    value: 3181.00,                   value: 37,
    type: '营业额（元）' },            type: '订单数' },
  ...                               ...
]                                 ]
  ↓                                 ↓
折线图 + 数据点                    柱状图
```

## 视觉效果

```
营业额（元）                                              订单数
    ↑                                                      ↑
4000│                                                      │50
    │         ●━━━●                                       │
3500│       ●━      ━●                                    │45
    │     ●━          ━●                                  │
3000│   ●━              ━●                                │40
    │ ●━                  ━●                              │
2500│━                      ━●                            │35
    │  ▓▓▓  ▓▓▓  ▓▓▓  ▓▓▓  ▓▓▓  ▓▓▓  ▓▓▓                │30
    └────────────────────────────────────────────────→
     4/20  4/21  4/22  4/23  4/24  4/25  4/26

图例：
  ━●━  营业额（元）- 蓝色折线
  ▓▓▓  订单数 - 绿色柱状（半透明）
```

## 优势

1. **信息密度高**：在同一个图表中展示两个关键指标
2. **趋势对比**：可以直观看出营业额和订单数的相关性
3. **视觉清晰**：通过颜色、透明度、图表类型区分不同指标
4. **双 Y 轴**：解决数值量级差异问题

## 测试

可以打开 `web-admin/test-stats-data.html` 在浏览器中预览效果。

## 修改的文件

1. `web-admin/src/views/stats/index.vue` - 营业额趋势图改为复合图表
2. `web-admin/test-stats-data.html` - 更新测试文件

## 状态

✅ 已完成
