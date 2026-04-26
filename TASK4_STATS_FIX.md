# Task 4: 修复数据报表页面数据显示异常

## 问题描述

数据报表页面（`web-admin/src/views/stats/index.vue`）的营业额趋势图无法正常显示营业额和订单数。

## 根本原因

有两个主要问题：

### 1. 数据键名不匹配（已修复）

前端 API 拦截器（`web-admin/src/api/index.ts`）会自动将后端返回的 snake_case 键名转换为 camelCase 键名，但 Vue 组件中的代码仍在使用 snake_case 键名访问数据。

### 2. G2 图表配置错误（本次修复）

原来的实现方式有问题：

- 在 Chart 实例上先调用 `.data()` 和 `.encode()`，然后再添加 mark（`.area()`, `.line()`）
- 这种方式会导致数据绑定混乱，图表无法正确渲染

**错误的写法：**

```typescript
revenueChart
  .data(chartData)           // ❌ 在 Chart 实例上设置数据
  .encode('x', 'date')       // ❌ 在 Chart 实例上设置编码
  .encode('y', 'value')
  .encode('color', 'type')

revenueChart
  .area()                    // ❌ 然后添加 mark，数据绑定会出问题
  .transform(...)

revenueChart
  .line()                    // ❌ 再添加另一个 mark
  .transform(...)
```

**正确的写法：**

```typescript
revenueChart
  .line() // ✅ 直接在 mark 上设置所有配置
  .data(chartData)
  .encode("x", "date")
  .encode("y", "value")
  .encode("color", "type")
  .encode("shape", "smooth");
// ... 其他配置
```

## 解决方案

### 1. 修复营业额趋势图

**文件：`web-admin/src/views/stats/index.vue`**

```typescript
function renderRevenueChart(
  data: Array<{ date: string; revenue: number; orderCount: number }>,
) {
  if (!revenueChartRef.value) return;

  if (revenueChart) {
    revenueChart.destroy();
  }

  // 准备数据
  const chartData: Array<{ date: string; type: string; value: number }> = [];
  data.forEach((item) => {
    chartData.push({
      date: item.date,
      type: "营业额（元）",
      value: formatAmount(item.revenue),
    });
    chartData.push({
      date: item.date,
      type: "订单数",
      value: item.orderCount,
    });
  });

  // 创建图表 - 使用简化的配置
  revenueChart = new Chart({
    container: revenueChartRef.value,
    autoFit: true,
  });

  revenueChart
    .line() // ✅ 直接在 mark 上配置
    .data(chartData)
    .encode("x", "date")
    .encode("y", "value")
    .encode("color", "type")
    .encode("shape", "smooth") // 平滑曲线
    .scale("color", {
      range: ["#409EFF", "#67C23A"],
    })
    .style("lineWidth", 2)
    .axis("y", {
      title: "数值",
    })
    .legend("color", {
      position: "top",
    });

  revenueChart.render();
}
```

### 2. 修复菜品销量图

**文件：`web-admin/src/views/stats/index.vue`**

```typescript
function renderDishChart(
  data: Array<{
    dishId: string;
    dishName: string;
    quantity: number;
    revenue: number;
  }>,
) {
  if (!dishChartRef.value) return;

  if (dishChart) {
    dishChart.destroy();
  }

  // 准备数据
  const chartData: Array<{
    dishName: string;
    type: string;
    value: number;
  }> = [];
  data.forEach((item) => {
    chartData.push({
      dishName: item.dishName,
      type: "销量",
      value: item.quantity,
    });
    chartData.push({
      dishName: item.dishName,
      type: "营业额（元）",
      value: formatAmount(item.revenue),
    });
  });

  // 创建图表 - 使用简化的配置
  dishChart = new Chart({
    container: dishChartRef.value,
    autoFit: true,
  });

  dishChart
    .interval() // ✅ 直接在 mark 上配置
    .data(chartData)
    .encode("x", "dishName")
    .encode("y", "value")
    .encode("color", "type")
    .transform({ type: "dodgeX" }) // 分组柱状图
    .scale("color", {
      range: ["#409EFF", "#67C23A"],
    })
    .axis("x", {
      labelFormatter: (text: string) => {
        return text.length > 6 ? text.substring(0, 6) + "..." : text;
      },
      labelTransform: "rotate(30)",
    })
    .axis("y", {
      title: "数值",
    })
    .legend("color", {
      position: "top",
    });

  dishChart.render();
}
```

## 关键改进

1. **简化图表配置**：直接在 mark（`.line()`, `.interval()`）上链式调用所有配置方法
2. **移除复杂的 transform filter**：不再需要多个 mark 叠加，G2 会自动根据 `color` 编码分组显示
3. **添加图例**：使用 `.legend('color', { position: 'top' })` 显示图例
4. **平滑曲线**：营业额趋势图使用 `.encode('shape', 'smooth')` 使曲线更平滑

## 测试文件

创建了 `web-admin/test-stats-data.html` 用于独立测试图表渲染，可以直接在浏览器中打开查看效果。

## 修改的文件

1. `web-admin/src/views/stats/index.vue` - 修复图表渲染逻辑
2. `web-admin/src/api/index.ts` - 更新 TypeScript 类型定义（之前已修复）
3. `web-admin/test-stats-data.html` - 新增测试文件

## 验证步骤

1. 启动后端：`cd backend && npm run dev`
2. 启动前端：`cd web-admin && npm run dev`
3. 访问 http://localhost:3001
4. 登录后进入"数据报表"页面
5. 验证：
   - ✅ 营业额趋势图显示两条线（营业额和订单数）
   - ✅ 菜品销量图显示分组柱状图（销量和营业额）
   - ✅ 图例正确显示
   - ✅ 数据正确转换（分 → 元）
   - ✅ 日期范围选择器正常工作

## 状态

✅ 已完成并测试通过
