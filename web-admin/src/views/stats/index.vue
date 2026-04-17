<template>
  <div class="stats-page">
    <h2 class="page-heading">数据报表</h2>

    <!-- 日期范围选择器 -->
    <el-card shadow="never" class="filter-card">
      <el-form :inline="true">
        <el-form-item label="日期范围">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            :disabled-date="disabledDate"
            @change="handleDateChange"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fetchData">查询</el-button>
          <el-button @click="handleQuickSelect(7)">最近7天</el-button>
          <el-button @click="handleQuickSelect(30)">最近30天</el-button>
          <el-button @click="handleQuickSelect(90)">最近90天</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 营业额折线图 -->
    <el-card shadow="never" class="chart-card" v-loading="loading">
      <template #header>
        <div class="card-header">
          <span>营业额趋势</span>
        </div>
      </template>
      <div ref="revenueChartRef" class="chart-container"></div>
    </el-card>

    <!-- 菜品销量柱状图 -->
    <el-card shadow="never" class="chart-card" v-loading="loading">
      <template #header>
        <div class="card-header">
          <span>菜品销量排行（前10）</span>
        </div>
      </template>
      <div ref="dishChartRef" class="chart-container"></div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import type { ECharts } from 'echarts'
import { statsApi } from '@/api'

// 日期范围
const dateRange = ref<[string, string]>([])

// 图表实例
const revenueChartRef = ref<HTMLDivElement>()
const dishChartRef = ref<HTMLDivElement>()
let revenueChart: ECharts | null = null
let dishChart: ECharts | null = null

// 加载状态
const loading = ref(false)

/**
 * 禁用未来日期和超过90天的日期
 */
function disabledDate(date: Date): boolean {
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  
  // 禁用未来日期
  if (date > today) {
    return true
  }
  
  // 如果已选择开始日期，限制结束日期不超过开始日期后90天
  if (dateRange.value && dateRange.value[0]) {
    const start = new Date(dateRange.value[0])
    const maxEnd = new Date(start)
    maxEnd.setDate(maxEnd.getDate() + 89) // 90天范围
    
    if (date < start || date > maxEnd) {
      return true
    }
  }
  
  return false
}

/**
 * 日期范围变化处理
 */
function handleDateChange(value: [string, string] | null) {
  if (!value) {
    dateRange.value = []
    return
  }
  
  // 验证日期范围不超过90天
  const start = new Date(value[0])
  const end = new Date(value[1])
  const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  
  if (diffDays > 90) {
    ElMessage.warning('查询范围不能超过90天')
    // 自动调整结束日期
    const maxEnd = new Date(start)
    maxEnd.setDate(maxEnd.getDate() + 89)
    dateRange.value = [value[0], formatDate(maxEnd)]
  }
}

/**
 * 快速选择日期范围
 */
function handleQuickSelect(days: number) {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days + 1)
  
  dateRange.value = [formatDate(start), formatDate(end)]
  fetchData()
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * 将分转换为元
 */
function formatAmount(fen: number): number {
  return fen / 100
}

/**
 * 获取数据并渲染图表
 */
async function fetchData() {
  if (!dateRange.value || dateRange.value.length !== 2) {
    ElMessage.warning('请选择日期范围')
    return
  }
  
  const [startDate, endDate] = dateRange.value
  
  loading.value = true
  try {
    // 并行请求营业额和菜品数据
    const [revenueData, dishData] = await Promise.all([
      statsApi.revenue({ startDate, endDate }),
      statsApi.dishes({ startDate, endDate }),
    ])
    
    // 渲染图表
    await nextTick()
    renderRevenueChart(revenueData)
    renderDishChart(dishData)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '获取数据失败'
    ElMessage.error(message)
  } finally {
    loading.value = false
  }
}

/**
 * 渲染营业额折线图
 */
function renderRevenueChart(data: Array<{ date: string; revenue: number; order_count: number }>) {
  if (!revenueChartRef.value) return
  
  if (!revenueChart) {
    revenueChart = echarts.init(revenueChartRef.value)
  }
  
  const dates = data.map(item => item.date)
  const revenues = data.map(item => formatAmount(item.revenue))
  const orderCounts = data.map(item => item.order_count)
  
  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
      },
    },
    legend: {
      data: ['营业额（元）', '订单数'],
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
    },
    yAxis: [
      {
        type: 'value',
        name: '营业额（元）',
        position: 'left',
        axisLabel: {
          formatter: '¥{value}',
        },
      },
      {
        type: 'value',
        name: '订单数',
        position: 'right',
      },
    ],
    series: [
      {
        name: '营业额（元）',
        type: 'line',
        smooth: true,
        data: revenues,
        itemStyle: {
          color: '#409EFF',
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(64, 158, 255, 0.3)' },
            { offset: 1, color: 'rgba(64, 158, 255, 0.05)' },
          ]),
        },
      },
      {
        name: '订单数',
        type: 'line',
        smooth: true,
        yAxisIndex: 1,
        data: orderCounts,
        itemStyle: {
          color: '#67C23A',
        },
      },
    ],
  }
  
  revenueChart.setOption(option)
}

/**
 * 渲染菜品销量柱状图
 */
function renderDishChart(data: Array<{ dish_id: string; dish_name: string; quantity: number; revenue: number }>) {
  if (!dishChartRef.value) return
  
  if (!dishChart) {
    dishChart = echarts.init(dishChartRef.value)
  }
  
  const dishNames = data.map(item => item.dish_name)
  const quantities = data.map(item => item.quantity)
  const revenues = data.map(item => formatAmount(item.revenue))
  
  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
    },
    legend: {
      data: ['销量', '营业额（元）'],
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: dishNames,
      axisLabel: {
        interval: 0,
        rotate: 30,
      },
    },
    yAxis: [
      {
        type: 'value',
        name: '销量',
        position: 'left',
      },
      {
        type: 'value',
        name: '营业额（元）',
        position: 'right',
        axisLabel: {
          formatter: '¥{value}',
        },
      },
    ],
    series: [
      {
        name: '销量',
        type: 'bar',
        data: quantities,
        itemStyle: {
          color: '#409EFF',
        },
      },
      {
        name: '营业额（元）',
        type: 'bar',
        yAxisIndex: 1,
        data: revenues,
        itemStyle: {
          color: '#67C23A',
        },
      },
    ],
  }
  
  dishChart.setOption(option)
}

/**
 * 初始化：默认查询最近7天
 */
onMounted(() => {
  handleQuickSelect(7)
  
  // 监听窗口大小变化，自动调整图表大小
  window.addEventListener('resize', handleResize)
})

/**
 * 清理：销毁图表实例
 */
onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  
  if (revenueChart) {
    revenueChart.dispose()
    revenueChart = null
  }
  
  if (dishChart) {
    dishChart.dispose()
    dishChart = null
  }
})

/**
 * 窗口大小变化处理
 */
function handleResize() {
  revenueChart?.resize()
  dishChart?.resize()
}
</script>

<style scoped>
.stats-page {
  padding: 0;
}

.page-heading {
  margin-bottom: 20px;
  font-size: 18px;
  color: #303133;
}

.filter-card {
  margin-bottom: 16px;
}

.chart-card {
  margin-bottom: 16px;
}

.card-header {
  font-weight: 500;
  font-size: 16px;
}

.chart-container {
  width: 100%;
  height: 400px;
}
</style>
