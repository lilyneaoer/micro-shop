<template>
  <div ref="chartRef" class="chart-container"></div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { Chart } from '@antv/g2'

interface RevenueData {
  date: string
  revenue: number
  orderCount: number
}

interface Props {
  data: RevenueData[]
}

const props = defineProps<Props>()

const chartRef = ref<HTMLDivElement>()
let chart: Chart | null = null

/**
 * 将分转换为元
 */
function formatAmount(fen: number): number {
  return fen / 100
}

/**
 * 渲染营业额折线图（复合图表：营业额折线 + 订单数柱状，双 Y 轴独立刻度）
 */
function renderChart() {
  if (!chartRef.value || !props.data.length) return
  
  // 销毁旧图表
  if (chart) {
    chart.destroy()
  }
  
  // 准备数据：分别准备营业额和订单数的数据
  const revenueData = props.data.map(item => ({
    date: item.date,
    value: formatAmount(item.revenue),
    type: '营业额（元）',
  }))
  
  const orderData = props.data.map(item => ({
    date: item.date,
    value: item.orderCount,
    type: '订单数',
  }))
  
  // 创建图表
  chart = new Chart({
    container: chartRef.value,
    autoFit: true,
  })
  
  // 添加柱状图（订单数）- 使用独立的 Y 轴刻度
  chart
    .interval()
    .data(orderData)
    .encode('x', 'date')
    .encode('y', 'value')
    .scale('y', { 
      independent: true,  // 独立刻度
      nice: true,
    })
    .scale('x', {
      paddingInner: 0.6,  // 柱子之间的间距（0-1，值越大柱子越窄）
      paddingOuter: 0.3,  // 两端的间距
    })
    .style('fill', '#67C23A')
    .style('fillOpacity', 0.6)
    .style('maxWidth', 50)  // 限制柱子最大宽度为 50px
    .axis('y', {
      title: '订单数',
      position: 'right',
      grid: null,  // 不显示网格线
    })
    .tooltip({ name: '订单数', channel: 'y' })
  
  // 添加折线图（营业额）- 使用独立的 Y 轴刻度
  chart
    .line()
    .data(revenueData)
    .encode('x', 'date')
    .encode('y', 'value')
    .encode('shape', 'smooth')
    .scale('y', { 
      independent: true,  // 独立刻度
      nice: true,
    })
    .style('stroke', '#409EFF')
    .style('lineWidth', 3)
    .axis('y', {
      title: '营业额（元）',
      position: 'left',
    })
    .tooltip({ name: '营业额（元）', channel: 'y' })
  
  // 添加折线上的点
  chart
    .point()
    .data(revenueData)
    .encode('x', 'date')
    .encode('y', 'value')
    .scale('y', { 
      independent: true,  // 独立刻度
      nice: true,
    })
    .style('fill', '#409EFF')
    .style('r', 3)
    .axis('y', false)  // 隐藏 Y 轴（折线图已显示）
    .tooltip(false)
  
  chart.render()
}

// 监听数据变化，重新渲染图表
watch(() => props.data, () => {
  renderChart()
}, { deep: true })

// 组件挂载后渲染图表
onMounted(() => {
  renderChart()
  window.addEventListener('resize', handleResize)
})

// 组件卸载前销毁图表
onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  if (chart) {
    chart.destroy()
    chart = null
  }
})

/**
 * 窗口大小变化处理
 */
function handleResize() {
  chart?.forceFit()
}

// 暴露方法供父组件调用
defineExpose({
  refresh: () => chart?.forceFit()
})
</script>

<style scoped>
.chart-container {
  width: 100%;
  height: 400px;
}
</style>
