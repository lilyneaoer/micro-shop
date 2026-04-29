<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? '编辑桌台' : '新增桌台'"
    width="480px"
    :close-on-click-modal="false"
    @closed="handleClosed"
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
      <el-form-item v-if="isEdit" label="状态" prop="isActive">
        <el-select v-model="formData.isActive" placeholder="请选择状态">
          <el-option label="启用" :value="true" />
          <el-option label="禁用" :value="false" />
        </el-select>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleCancel">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">确认</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { useTablesStore } from '@/stores/tables'
import type { Table } from '@/api'

interface Props {
  modelValue: boolean
  editingTable?: Table | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'success'): void
}

const props = withDefaults(defineProps<Props>(), {
  editingTable: null,
})

const emit = defineEmits<Emits>()

const tablesStore = useTablesStore()

// ─── 弹窗状态 ────────────────────────────────────────────────────────────────

const visible = ref(props.modelValue)
const submitting = ref(false)
const formRef = ref<FormInstance>()

const isEdit = ref(false)

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
    // { required: true, message: '请输入区域', trigger: 'blur' },
    { min: 1, max: 50, message: '区域长度为 1~50 个字符', trigger: 'blur' },
  ],
}

// ─── 监听 Props 变化 ──────────────────────────────────────────────────────────

watch(
  () => props.modelValue,
  (val) => {
    visible.value = val
  },
)

watch(visible, (val) => {
  emit('update:modelValue', val)
})

watch(
  () => props.editingTable,
  (table) => {
    if (table) {
      isEdit.value = true
      formData.tableNo = table.tableNo
      formData.seatCount = table.seatCount
      formData.area = table.area
      formData.isActive = table.isActive
    } else {
      isEdit.value = false
      resetForm()
    }
  },
  { immediate: true },
)

// ─── 表单操作 ────────────────────────────────────────────────────────────────

function resetForm() {
  formData.tableNo = ''
  formData.seatCount = ''
  formData.area = ''
  formData.isActive = true
  formRef.value?.clearValidate()
}

function handleCancel() {
  visible.value = false
}

function handleClosed() {
  resetForm()
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    if (props.editingTable) {
      await tablesStore.updateTable(props.editingTable.id, {
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
    visible.value = false
    emit('success')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '操作失败'
    ElMessage.error(message)
  } finally {
    submitting.value = false
  }
}
</script>
