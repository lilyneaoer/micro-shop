<template>
  <div class="category-management">
    <div class="tab-header">
      <el-button type="primary" @click="openCategoryCreate">新增分类</el-button>
    </div>

    <el-table
      :data="menuStore.categories"
      v-loading="menuStore.loading"
      border
      stripe
      row-key="id"
    >
      <el-table-column prop="sortOrder" label="排序" width="80" align="center" />
      <el-table-column prop="name" label="分类名称" />
      <el-table-column label="操作" width="200">
        <template #default="{ row }">
          <el-button size="small" @click="openCategoryEdit(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="handleDeleteCategory(row)">
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分类表单弹窗 -->
    <el-dialog
      v-model="categoryDialogVisible"
      :title="editingCategory ? '编辑分类' : '新增分类'"
      width="420px"
      :close-on-click-modal="false"
      @closed="resetCategoryForm"
    >
      <el-form
        ref="categoryFormRef"
        :model="categoryForm"
        :rules="categoryRules"
        label-width="80px"
        @submit.prevent
      >
        <el-form-item label="分类名称" prop="name">
          <el-input v-model="categoryForm.name" placeholder="请输入分类名称" clearable />
        </el-form-item>
        <el-form-item label="排序" prop="sortOrder">
          <el-input-number
            v-model="categoryForm.sortOrder"
            :min="0"
            :max="9999"
            controls-position="right"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="categoryDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="categorySubmitting" @click="handleCategorySubmit">
          确认
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useMenuStore } from '@/stores/menu'
import type { Category } from '@/api'

const menuStore = useMenuStore()

// ─── 分类管理 ─────────────────────────────────────────────────────────────────

const categoryDialogVisible = ref(false)
const editingCategory = ref<Category | null>(null)
const categorySubmitting = ref(false)
const categoryFormRef = ref<FormInstance>()

const categoryForm = reactive({
  name: '',
  sortOrder: 0,
})

const categoryRules: FormRules = {
  name: [
    { required: true, message: '请输入分类名称', trigger: 'blur' },
    { min: 1, max: 50, message: '分类名称长度为 1~50 个字符', trigger: 'blur' },
  ],
}

function openCategoryCreate() {
  editingCategory.value = null
  categoryDialogVisible.value = true
}

function openCategoryEdit(category: Category) {
  editingCategory.value = category
  categoryForm.name = category.name
  categoryForm.sortOrder = category.sortOrder
  categoryDialogVisible.value = true
}

function resetCategoryForm() {
  categoryForm.name = ''
  categoryForm.sortOrder = 0
  editingCategory.value = null
  categoryFormRef.value?.clearValidate()
}

async function handleCategorySubmit() {
  const valid = await categoryFormRef.value?.validate().catch(() => false)
  if (!valid) return

  categorySubmitting.value = true
  try {
    if (editingCategory.value) {
      await menuStore.updateCategory(editingCategory.value.id, {
        name: categoryForm.name,
        sortOrder: categoryForm.sortOrder,
      })
      ElMessage.success('分类更新成功')
    } else {
      await menuStore.createCategory({
        name: categoryForm.name,
        sortOrder: categoryForm.sortOrder,
      })
      ElMessage.success('分类创建成功')
    }
    categoryDialogVisible.value = false
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : '操作失败')
  } finally {
    categorySubmitting.value = false
  }
}

async function handleDeleteCategory(category: Category) {
  try {
    await ElMessageBox.confirm(
      `确认删除分类"${category.name}"？删除后无法恢复。`,
      '删除确认',
      { type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  try {
    await menuStore.deleteCategory(category.id)
    ElMessage.success('删除成功')
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : '删除失败')
  }
}
</script>

<style scoped>
.category-management {
  padding: 0;
}

.tab-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
</style>
