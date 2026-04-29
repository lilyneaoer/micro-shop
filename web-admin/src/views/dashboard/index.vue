<template>
  <div class="dashboard">
    <h2 class="page-heading">数据看板</h2>
    <el-row :gutter="16">
      <el-col :span="6">
        <el-card shadow="never">
          <div class="stat-card">
            <div class="stat-label">今日营业额</div>
            <div class="stat-value">¥{{ formatAmount(data?.today_revenue) }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never">
          <div class="stat-card">
            <div class="stat-label">今日订单数</div>
            <div class="stat-value">{{ data?.today_order_count ?? '-' }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never">
          <div class="stat-card">
            <div class="stat-label">今日客单价</div>
            <div class="stat-value">¥{{ formatAmount(data?.today_avg_order_value) }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never">
          <div class="stat-card">
            <div class="stat-label">本月营业额</div>
            <div class="stat-value">¥{{ formatAmount(data?.month_revenue) }}</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 数据报表部分 -->
    <div class="stats-section">
      <!-- <h2 class="section-heading">数据报表</h2> -->

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

      <!-- 图表标签页 -->
      <el-card shadow="never" class="chart-card" v-loading="loading">
        <el-tabs v-model="activeTab">
          <el-tab-pane label="营业额趋势" name="revenue">
            <RevenueChart :data="revenueData" />
          </el-tab-pane>
          <el-tab-pane label="菜品销量排行" name="dish">
            <DishChart :data="dishData" />
          </el-tab-pane>
        </el-tabs>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { statsApi, type DashboardData } from '@/api'
import RevenueChart from './RevenueChart.vue'
import DishChart from './DishChart.vue'

const data = ref<DashboardData | null>(null)

// 日期范围
const dateRange = ref<[string, string]>([])

// 当前激活的标签页
const activeTab = ref('revenue')

// 加载状态
const loading = ref(false)

// 图表数据
const revenueData = ref<Array<{ date: string; revenue: number; orderCount: number }>>([])
const dishData = ref<Array<{ dishId: string; dishName: string; quantity: number; revenue: number }>>([])

/** 将分转换为元，保留两位小数 */
function formatAmount(fen?: number): string {
  if (fen === undefined || fen === null) return '-'
  return (fen / 100).toFixed(2)
}

async function fetchDashboard() {
  try {
    data.value = await statsApi.dashboard()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '获取看板数据失败'
    ElMessage.error(message)
  }
}

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
 * 获取数据
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
    const [revenueResult, dishResult] = await Promise.all([
      statsApi.revenue({ startDate, endDate }),
      statsApi.dishes({ startDate, endDate }),
    ])
    
    // 更新数据
    revenueData.value = revenueResult
    dishData.value = dishResult
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '获取数据失败'
    ElMessage.error(message)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchDashboard()
  // 默认查询最近7天的图表数据
  handleQuickSelect(7)
})
</script>

<style scoped>
.dashboard {
  padding: 0;
}

.page-heading {
  margin-bottom: 20px;
  font-size: 18px;
  color: #303133;
}

.stat-card {
  text-align: center;
  padding: 8px 0;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
}

.stats-section {
  margin-top: 32px;
}

.section-heading {
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
</style>
