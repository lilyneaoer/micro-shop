<template>
  <el-dialog
    v-model="visible"
    title="订单详情"
    width="700px"
    :close-on-click-modal="false"
    @closed="handleClosed"
  >
    <div v-loading="loading">
      <template v-if="order">
        <!-- 基本信息 -->
        <el-descriptions :column="2" border size="small" class="detail-desc">
          <el-descriptions-item label="订单号">{{ order.orderNo }}</el-descriptions-item>
          <el-descriptions-item label="桌号">{{ order.tableNo }}</el-descriptions-item>
          <el-descriptions-item label="区域">{{ order.area }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="statusTagType(order.status)" size="small">
              {{ statusLabel(order.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="下单时间">
            {{ formatDateTime(order.createdAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="支付时间">
            {{ order.paidAt ? formatDateTime(order.paidAt) : '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="实付金额">
            ¥{{ formatAmount(order.totalAmount) }}
          </el-descriptions-item>
          <el-descriptions-item label="顾客备注" :span="2">
            {{ order.customerRemark || '无' }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 菜品列表 -->
        <div class="section-title">菜品明细</div>
        <el-table :data="order.items" size="small" border>
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
            v-if="order.status === 'paid'"
            type="primary"
            :loading="statusLoading"
            @click="handleUpdateStatus('accepted')"
          >
            接单
          </el-button>
          <el-button
            v-if="order.status === 'accepted'"
            type="success"
            :loading="statusLoading"
            @click="handleUpdateStatus('completed')"
          >
            完成订单
          </el-button>
          <el-button
            v-if="order.status === 'completed'"
            type="warning"
            @click="handleOpenRefund"
          >
            退款
          </el-button>
        </div>
      </template>
    </div>

    <!-- 退款弹窗 -->
    <el-dialog
      v-model="refundVisible"
      title="发起退款"
      width="400px"
      :close-on-click-modal="false"
      append-to-body
    >
      <el-form :model="refundForm" :rules="refundRules" ref="refundFormRef" label-width="90px">
        <el-form-item label="实付金额">
          <span>¥{{ formatAmount(order?.totalAmount) }}</span>
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
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { useOrdersStore } from '@/stores/orders'
import type { Order, OrderStatus } from '@/api'

// ─── Props & Emits ────────────────────────────────────────────────────────

interface Props {
  modelValue: boolean
  order: Order | null
  loading?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'update:order', value: Order): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
})
const emit = defineEmits<Emits>()

const ordersStore = useOrdersStore()

// ─── 弹窗显示控制 ─────────────────────────────────────────────────────────

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

function handleClosed() {
  // 弹窗关闭时的清理逻辑
}

// ─── 订单状态更新 ─────────────────────────────────────────────────────────

const statusLoading = ref(false)

async function handleUpdateStatus(status: OrderStatus) {
  if (!props.order) return
  statusLoading.value = true
  try {
    const updated = await ordersStore.updateOrderStatus(props.order.id, status)
    emit('update:order', updated)
    ElMessage.success('订单状态已更新')
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '状态更新失败'
    ElMessage.error(msg)
  } finally {
    statusLoading.value = false
  }
}

// ─── 退款处理 ─────────────────────────────────────────────────────────────

const refundVisible = ref(false)
const refundLoading = ref(false)
const refundFormRef = ref<FormInstance>()
const refundForm = reactive({ amount: '' })

const maxRefundYuan = computed(() =>
  props.order ? props.order.totalAmount / 100 : 0,
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

function handleOpenRefund() {
  refundForm.amount = ''
  refundVisible.value = true
}

async function handleRefund() {
  if (!refundFormRef.value || !props.order) return
  const valid = await refundFormRef.value.validate().catch(() => false)
  if (!valid) return

  refundLoading.value = true
  try {
    // 将元转换为分（整数）
    const amountFen = Math.round(parseFloat(refundForm.amount) * 100)
    await ordersStore.refundOrder(props.order.id, amountFen)
    // 刷新当前订单数据
    const refreshed = ordersStore.orders.find((o) => o.id === props.order!.id)
    if (refreshed) {
      emit('update:order', refreshed)
    }
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
</script>

<style scoped>
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
