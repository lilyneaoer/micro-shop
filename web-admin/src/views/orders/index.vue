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
          @size-change="handleSearch"
          @current-change="handleSearch"
        />
      </div>
    </el-card>

    <!-- 订单详情弹窗 -->
    <el-dialog
      v-model="detailVisible"
      title="订单详情"
      width="700px"
      :close-on-click-modal="false"
      @closed="currentOrder = null"
    >
      <template v-if="currentOrder">
        <!-- 基本信息 -->
        <el-descriptions :column="2" border size="small" class="detail-desc">
          <el-descriptions-item label="订单号">{{ currentOrder.orderNo }}</el-descriptions-item>
          <el-descriptions-item label="桌号">{{ currentOrder.tableNo }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="statusTagType(currentOrder.status)" size="small">
              {{ statusLabel(currentOrder.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="下单时间">
            {{ formatDateTime(currentOrder.createdAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="支付时间">
            {{ currentOrder.paidAt ? formatDateTime(currentOrder.paidAt) : '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="实付金额">
            ¥{{ formatAmount(currentOrder.totalAmount) }}
          </el-descriptions-item>
          <el-descriptions-item label="顾客备注" :span="2">
            {{ currentOrder.customerRemark || '无' }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 菜品列表 -->
        <div class="section-title">菜品明细</div>
        <el-table :data="currentOrder.items" size="small" border>
          <el-table-column prop="dishName" label="菜品名称" min-width="120" />
          <el-table-column label="规格" width="100">
            <template #default="{ row }">
              {{ row.skuName || '—' }}
            </template>
          </el-table-column>
          <el-table-column label="单价" width="90">
            <template #default="{ row }">
              ¥{{ formatAmount(row.unitPrice) }}
            </template>
          </el-table-column>
          <el-table-column prop="quantity" label="数量" width="70" />
          <el-table-column label="小计" width="90">
            <template #default="{ row }">
              ¥{{ formatAmount(row.subtotal) }}
            </template>
          </el-table-column>
        </el-table>

        <!-- 状态操作按钮 -->
        <div class="action-row">
          <el-button
            v-if="currentOrder.status === 'paid'"
            type="primary"
            :loading="statusLoading"
            @click="handleUpdateStatus('accepted')"
          >
            接单
          </el-button>
          <el-button
            v-if="currentOrder.status === 'accepted'"
            type="success"
            :loading="statusLoading"
            @click="handleUpdateStatus('completed')"
          >
            完成订单
          </el-button>
          <el-button
            v-if="currentOrder.status === 'completed'"
            type="warning"
            @click="openRefund"
          >
            退款
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 退款弹窗 -->
    <el-dialog
      v-model="refundVisible"
      title="发起退款"
      width="400px"
      :close-on-click-modal="false"
    >
      <el-form :model="refundForm" :rules="refundRules" ref="refundFormRef" label-width="90px">
        <el-form-item label="实付金额">
          <span>¥{{ formatAmount(currentOrder?.totalAmount) }}</span>
        </el-form-item>
        <el-form-item label="退款金额" prop="amount">
          <el-input
            v-model="refundForm.amount"
            type="number"
            placeholder="请输入退款金额（元）"
            :min="0.01"
            :max="maxRefundYuan"
          >
            <template #prefix>¥</template>
          </el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="refundVisible = false">取消</el-button>
        <el-button type="primary" :loading="refundLoading" @click="handleRefund">
          确认退款
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { useOrdersStore } from '@/stores/orders'
import type { Order, OrderStatus } from '@/api'

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
const statusLoading = ref(false)

function openDetail(order: Order) {
  currentOrder.value = order
  detailVisible.value = true
}

async function handleUpdateStatus(status: OrderStatus) {
  if (!currentOrder.value) return
  statusLoading.value = true
  try {
    const updated = await ordersStore.updateOrderStatus(currentOrder.value.id, status)
    currentOrder.value = updated
    ElMessage.success('订单状态已更新')
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '状态更新失败'
    ElMessage.error(msg)
  } finally {
    statusLoading.value = false
  }
}

// ─── 退款弹窗 ─────────────────────────────────────────────────────────────

const refundVisible = ref(false)
const refundLoading = ref(false)
const refundFormRef = ref<FormInstance>()
const refundForm = reactive({ amount: '' })

const maxRefundYuan = computed(() =>
  currentOrder.value ? currentOrder.value.totalAmount / 100 : 0,
)

const refundRules: FormRules = {
  amount: [
    { required: true, message: '请输入退款金额', trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        const num = parseFloat(value)
        if (isNaN(num) || num <= 0) {
          callback(new Error('退款金额必须大于 0'))
        } else if (num > maxRefundYuan.value) {
          callback(new Error(`退款金额不能超过实付金额 ¥${maxRefundYuan.value.toFixed(2)}`))
        } else {
          callback()
        }
      },
      trigger: 'blur',
    },
  ],
}

function openRefund() {
  refundForm.amount = ''
  refundVisible.value = true
}

async function handleRefund() {
  if (!refundFormRef.value || !currentOrder.value) return
  const valid = await refundFormRef.value.validate().catch(() => false)
  if (!valid) return

  refundLoading.value = true
  try {
    // 将元转换为分（整数）
    const amountFen = Math.round(parseFloat(refundForm.amount) * 100)
    await ordersStore.refundOrder(currentOrder.value.id, amountFen)
    // 刷新当前订单数据
    const refreshed = ordersStore.orders.find((o) => o.id === currentOrder.value!.id)
    if (refreshed) currentOrder.value = refreshed
    refundVisible.value = false
    ElMessage.success('退款申请已提交')
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '退款失败，请稍后重试'
    ElMessage.error(msg)
  } finally {
    refundLoading.value = false
  }
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
): 'info' | 'warning' | 'primary' | 'success' | 'danger' | '' {
  const map: Record<OrderStatus, 'info' | 'warning' | 'primary' | 'success' | 'danger' | ''> = {
    pending_payment: 'info',
    paid: 'warning',
    accepted: 'primary',
    completed: 'success',
    cancelled: 'danger',
    refunded: '',
  }
  return map[status] ?? ''
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

.detail-desc {
  margin-bottom: 16px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin: 16px 0 8px;
}

.action-row {
  display: flex;
  gap: 8px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}
</style>
