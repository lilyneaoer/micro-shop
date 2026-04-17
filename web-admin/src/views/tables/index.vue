<template>
  <div class="tables-page">
    <!-- 页头 -->
    <div class="page-header">
      <h2>桌台管理</h2>
      <el-button type="primary" @click="openCreateDialog">新增桌台</el-button>
    </div>

    <!-- 桌台列表 -->
    <el-table :data="tablesStore.tables" v-loading="tablesStore.loading" border stripe>
      <el-table-column prop="tableNo" label="桌号" width="120" />
      <el-table-column prop="area" label="区域" width="150" />
      <el-table-column prop="seatCount" label="座位数" width="100" align="center" />
      <el-table-column label="状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="row.isActive ? 'success' : 'info'">
            {{ row.isActive ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" min-width="240">
        <template #default="{ row }">
          <el-button size="small" @click="openEditDialog(row)">编辑</el-button>
          <el-button
            size="small"
            type="primary"
            :loading="downloadingId === row.id"
            @click="downloadQrcode(row)"
          >
            下载二维码
          </el-button>
          <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 新增 / 编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingTable ? '编辑桌台' : '新增桌台'"
      width="480px"
      :close-on-click-modal="false"
      @closed="resetForm"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="80px"
        @submit.prevent
      >
        <el-form-item label="桌号" prop="tableNo">
          <el-input v-model="formData.tableNo" placeholder="请输入桌号，如 A01" clearable />
        </el-form-item>
        <el-form-item label="座位数" prop="seatCount">
          <el-input
            v-model.number="formData.seatCount"
            type="number"
            placeholder="请输入座位数"
            :min="1"
            clearable
          />
        </el-form-item>
        <el-form-item label="区域" prop="area">
          <el-input v-model="formData.area" placeholder="请输入区域，如 大厅" clearable />
        </el-form-item>
        <el-form-item v-if="editingTable" label="状态" prop="isActive">
          <el-select v-model="formData.isActive" placeholder="请选择状态">
            <el-option label="启用" :value="true" />
            <el-option label="禁用" :value="false" />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import { tableApi, type Table } from '@/api'
import { useTablesStore } from '@/stores/tables'
import QRCode from 'qrcode'

const tablesStore = useTablesStore()

// ─── 弹窗状态 ────────────────────────────────────────────────────────────────

const dialogVisible = ref(false)
const editingTable = ref<Table | null>(null)
const submitting = ref(false)
const formRef = ref<FormInstance>()

interface FormData {
  tableNo: string
  seatCount: number | ''
  area: string
  isActive: boolean
}

const formData = reactive<FormData>({
  tableNo: '',
  seatCount: '',
  area: '',
  isActive: true,
})

const formRules: FormRules = {
  tableNo: [
    { required: true, message: '请输入桌号', trigger: 'blur' },
    { min: 1, max: 20, message: '桌号长度为 1~20 个字符', trigger: 'blur' },
  ],
  seatCount: [
    { required: true, message: '请输入座位数', trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        const num = Number(value)
        if (!Number.isInteger(num) || num < 1) {
          callback(new Error('座位数必须为正整数'))
        } else {
          callback()
        }
      },
      trigger: 'blur',
    },
  ],
  area: [
    { required: true, message: '请输入区域', trigger: 'blur' },
    { min: 1, max: 50, message: '区域长度为 1~50 个字符', trigger: 'blur' },
  ],
}

function openCreateDialog() {
  editingTable.value = null
  dialogVisible.value = true
}

function openEditDialog(table: Table) {
  editingTable.value = table
  formData.tableNo = table.tableNo
  formData.seatCount = table.seatCount
  formData.area = table.area
  formData.isActive = table.isActive
  dialogVisible.value = true
}

function resetForm() {
  formData.tableNo = ''
  formData.seatCount = ''
  formData.area = ''
  formData.isActive = true
  editingTable.value = null
  formRef.value?.clearValidate()
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    if (editingTable.value) {
      await tablesStore.updateTable(editingTable.value.id, {
        tableNo: formData.tableNo,
        seatCount: Number(formData.seatCount),
        area: formData.area,
        isActive: formData.isActive,
      })
      ElMessage.success('桌台更新成功')
    } else {
      await tablesStore.createTable({
        tableNo: formData.tableNo,
        seatCount: Number(formData.seatCount),
        area: formData.area,
      })
      ElMessage.success('桌台创建成功')
    }
    dialogVisible.value = false
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '操作失败'
    ElMessage.error(message)
  } finally {
    submitting.value = false
  }
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
