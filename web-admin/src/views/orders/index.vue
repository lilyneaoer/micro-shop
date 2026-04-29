<template>
  <div class="orders-page">
    <h2 class="page-heading">订单管理</h2>

    <!-- 筛选栏 -->
    <el-card shadow="never" class="filter-card">
      <el-form :model="filters" inline>
        <el-form-item label="日期范围">
          <el-date-picker
            v-model="filters.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 240px"
          />
        </el-form-item>
        <el-form-item label="订单状态">
          <el-select
            v-model="filters.status"
            placeholder="全部状态"
            clearable
            style="width: 140px"
          >
            <el-option
              v-for="opt in statusOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="桌号">
          <el-input
            v-model="filters.tableNo"
            placeholder="请输入桌号"
            clearable
            style="width: 120px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 订单列表 -->
    <el-card shadow="never" class="table-card">
      <el-table
        v-loading="ordersStore.loading"
        :data="ordersStore.orders"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="orderNo" label="订单号" min-width="180" />
        <el-table-column prop="tableNo" label="桌号" width="80" />
        <el-table-column prop="area" label="区域" width="100" />
        <el-table-column label="金额" width="100">
          <template #default="{ row }">
            ¥{{ formatAmount(row.totalAmount) }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="下单时间" min-width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="openDetail(row)">查看详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="ordersStore.total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @update:current-page="handleSearch"
          @update:page-size="handleSearch"
        />
      </div>
    </el-card>

    <!-- 订单详情组件 -->
    <OrderDetail
      v-model="detailVisible"
      :order="currentOrder"
      :loading="detailLoading"
      @update:order="handleOrderUpdate"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useOrdersStore } from '@/stores/orders'
import type { Order, OrderStatus } from '@/api'
import OrderDetail from './OrderDetail.vue'

const ordersStore = useOrdersStore()

// ─── 筛选 ─────────────────────────────────────────────────────────────────

const filters = reactive({
  dateRange: null as [string, string] | null,
  status: '' as OrderStatus | '',
  tableNo: '',
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
})

const statusOptions: { label: string; value: OrderStatus }[] = [
  { label: '待支付', value: 'pending_payment' },
  { label: '已支付/待接单', value: 'paid' },
  { label: '已接单/制作中', value: 'accepted' },
  { label: '已完成', value: 'completed' },
  { label: '已取消', value: 'cancelled' },
  { label: '已退款', value: 'refunded' },
]

function buildParams() {
  return {
    startDate: filters.dateRange?.[0],
    endDate: filters.dateRange?.[1],
    status: filters.status || undefined,
    tableNo: filters.tableNo || undefined,
    page: pagination.page,
    pageSize: pagination.pageSize,
  }
}

async function handleSearch() {
  try {
    await ordersStore.fetchOrders(buildParams())
  } catch {
    ElMessage.error('获取订单列表失败')
  }
}

function handleReset() {
  filters.dateRange = null
  filters.status = ''
  filters.tableNo = ''
  pagination.page = 1
  handleSearch()
}

// ─── 详情弹窗 ─────────────────────────────────────────────────────────────

const detailVisible = ref(false)
const currentOrder = ref<Order | null>(null)
const detailLoading = ref(false)

async function openDetail(order: Order) {
  detailVisible.value = true
  detailLoading.value = true
  currentOrder.value = null
  
  try {
    // 获取完整的订单详情（包含 items）
    const { orderApi } = await import('@/api')
    const fullOrder = await orderApi.detail(order.id)
    currentOrder.value = fullOrder
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '获取订单详情失败'
    ElMessage.error(msg)
    detailVisible.value = false
  } finally {
    detailLoading.value = false
  }
}

function handleOrderUpdate(updatedOrder: Order) {
  currentOrder.value = updatedOrder
}

// ─── 工具函数 ─────────────────────────────────────────────────────────────

/** 将分转换为元，保留两位小数 */
function formatAmount(fen?: number | null): string {
  if (fen === undefined || fen === null) return '0.00'
  return (fen / 100).toFixed(2)
}

/** 格式化日期时间 */
function formatDateTime(iso?: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

/** 订单状态中文标签 */
function statusLabel(status: OrderStatus): string {
  const map: Record<OrderStatus, string> = {
    pending_payment: '待支付',
    paid: '已支付/待接单',
    accepted: '已接单/制作中',
    completed: '已完成',
    cancelled: '已取消',
    refunded: '已退款',
  }
  return map[status] ?? status
}

/** 订单状态对应的 Element Plus Tag 类型 */
function statusTagType(
  status: OrderStatus,
): 'primary' | 'success' | 'info' | 'warning' | 'danger' {
  const map: Record<OrderStatus, 'primary' | 'success' | 'info' | 'warning' | 'danger'> = {
    pending_payment: 'info',
    paid: 'warning',
    accepted: 'primary',
    completed: 'success',
    cancelled: 'danger',
    refunded: 'info',
  }
  return map[status] ?? 'info'
}

// ─── 生命周期 ─────────────────────────────────────────────────────────────

onMounted(() => {
  ordersStore.initWebSocket()
  handleSearch()
})
</script>

<style scoped>
.orders-page {
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

.filter-card :deep(.el-card__body) {
  padding-bottom: 0;
}

.table-card :deep(.el-card__body) {
  padding: 0;
}

.table-card :deep(.el-table) {
  border-radius: 0;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 16px;
}
</style>
