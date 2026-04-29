<template>
  <div ref="chartRef" class="chart-container"></div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { Chart } from '@antv/g2'

interface DishData {
  dishId: string
  dishName: string
  quantity: number
  revenue: number
}

interface Props {
  data: DishData[]
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
 * 渲染菜品销量柱状图
 */
function renderChart() {
  if (!chartRef.value || !props.data.length) return
  
  // 销毁旧图表
  if (chart) {
    chart.destroy()
  }
  
  // 按营业额从高到低排序
  const sortedData = [...props.data].sort((a, b) => b.revenue - a.revenue)
  
  // 准备数据：将数据转换为 G2 需要的格式
  const chartData: Array<{ dishName: string; type: string; value: number }> = []
  
  sortedData.forEach(item => {
    chartData.push({
      dishName: item.dishName,
      type: '销量',
      value: item.quantity,
    })
    chartData.push({
      dishName: item.dishName,
      type: '营业额（元）',
      value: formatAmount(item.revenue),
    })
  })
  
  // 创建图表
  chart = new Chart({
    container: chartRef.value,
    autoFit: true,
  })
  
  chart
    .interval()
    .data(chartData)
    .encode('x', 'dishName')
    .encode('y', 'value')
    .encode('color', 'type')
    .transform({ type: 'dodgeX' })
    .scale('color', {
      range: ['#409EFF', '#67C23A'],
    })
    .scale('x', {
      paddingInner: 0.4,  // 分组之间的间距
      paddingOuter: 0.2,  // 两端的间距
    })
    .style('maxWidth', 50)  // 限制每个柱子最大宽度为 50px
    .axis('x', false)
    .axis('y', {
      title: '数值',
    })
    .legend('color', {
      position: 'top',
    })
  
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
