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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { statsApi, type DashboardData } from '@/api'

const data = ref<DashboardData | null>(null)

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

onMounted(fetchDashboard)
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
</style>
