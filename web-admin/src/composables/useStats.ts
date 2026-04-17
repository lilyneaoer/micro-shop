import { ref } from 'vue'
import { statsApi, type DashboardData, type RevenuePoint, type DishRankItem } from '@/api'

/**
 * useStats — 统计数据查询 Composable
 * 完整实现在 Task 17 中
 */
export function useStats() {
  const dashboardData = ref<DashboardData | null>(null)
  const revenueData = ref<RevenuePoint[]>([])
  const dishRankData = ref<DishRankItem[]>([])
  const loading = ref(false)

  async function fetchDashboard() {
    loading.value = true
    try {
      dashboardData.value = await statsApi.dashboard()
    } finally {
      loading.value = false
    }
  }

  async function fetchRevenue(startDate: string, endDate: string) {
    loading.value = true
    try {
      revenueData.value = await statsApi.revenue({ startDate, endDate })
    } finally {
      loading.value = false
    }
  }

  async function fetchDishRank(startDate: string, endDate: string) {
    loading.value = true
    try {
      dishRankData.value = await statsApi.dishes({ startDate, endDate })
    } finally {
      loading.value = false
    }
  }

  return {
    dashboardData,
    revenueData,
    dishRankData,
    loading,
    fetchDashboard,
    fetchRevenue,
    fetchDishRank,
  }
}
