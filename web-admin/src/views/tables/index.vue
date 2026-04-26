<template>
  <div class="tables-page">
    <!-- 页头 -->
    <div class="page-header">
      <h2>桌台管理</h2>
      <el-button type="primary" @click="openCreateDialog">新增桌台</el-button>
    </div>

    <!-- 桌台列表 -->
    <el-table :data="tablesStore.tables" v-loading="tablesStore.loading" border stripe>
      <el-table-column prop="tableNo" label="桌号" min-width="100" />
      <el-table-column prop="area" label="区域" min-width="120" />
      <el-table-column prop="seatCount" label="座位数" min-width="100" align="center" />
      <el-table-column label="状态" width="100" align="right">
        <template #default="{ row }">
          <el-tag :type="row.isActive ? 'success' : 'info'">
            {{ row.isActive ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="280" align="right">
        <template #default="{ row }">
          <el-button size="small" @click="openEditDialog(row)">编辑</el-button>
          <el-button
            size="small"
            type="primary"
            :loading="downloadingId === row.id"
            @click="downloadQrcode(row)"
          >
            二维码
          </el-button>
          <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 新增 / 编辑弹窗 -->
    <TableForm v-model="dialogVisible" :editing-table="editingTable" @success="handleFormSuccess" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { tableApi, type Table } from '@/api'
import { useTablesStore } from '@/stores/tables'
import QRCode from 'qrcode'
import TableForm from './TableForm.vue'

const tablesStore = useTablesStore()

// ─── 弹窗状态 ────────────────────────────────────────────────────────────────

const dialogVisible = ref(false)
const editingTable = ref<Table | null>(null)

function openCreateDialog() {
  editingTable.value = null
  dialogVisible.value = true
}

function openEditDialog(table: Table) {
  editingTable.value = table
  dialogVisible.value = true
}

function handleFormSuccess() {
  // 表单提交成功后的回调（可选）
}

// ─── 删除 ─────────────────────────────────────────────────────────────────────

async function handleDelete(table: Table) {
  try {
    await ElMessageBox.confirm(
      `确认删除桌台 "${table.tableNo}"？删除后无法恢复。`,
      '删除确认',
      {
        type: 'warning',
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
      },
    )
  } catch {
    // 用户取消
    return
  }

  try {
    await tablesStore.deleteTable(table.id)
    ElMessage.success('删除成功')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '删除失败'
    ElMessage.error(message)
  }
}

// ─── 二维码下载 ───────────────────────────────────────────────────────────────

const downloadingId = ref<string | null>(null)

async function downloadQrcode(table: Table) {
  downloadingId.value = table.id
  try {
    // 1. 从后端获取 qr_token
    const { qrToken } = await tableApi.getQrcode(table.id)

    // 2. 构造扫码跳转 URL
    const scanUrl = `${window.location.origin}/scan?token=${qrToken}`

    // 3. 使用 qrcode 库生成 PNG Data URL（宽度 ≥ 300px）
    const dataUrl = await QRCode.toDataURL(scanUrl, {
      width: 300,
      margin: 2,
      errorCorrectionLevel: 'M',
    })

    // 4. 触发浏览器下载
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = `table-${table.tableNo}-qrcode.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    ElMessage.success('二维码下载成功')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '生成二维码失败'
    ElMessage.error(message)
  } finally {
    downloadingId.value = null
  }
}

// ─── 初始化 ───────────────────────────────────────────────────────────────────

onMounted(async () => {
  try {
    await tablesStore.fetchTables()
  } catch {
    ElMessage.error(tablesStore.error ?? '获取桌台列表失败')
  }
})
</script>

<style scoped>
.tables-page {
  padding: 0;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  font-size: 18px;
  color: #303133;
}
</style>
