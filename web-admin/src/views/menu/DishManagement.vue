<template>
  <div class="dish-management">
    <div class="tab-header">
      <div class="filter-bar">
        <el-select
          v-model="filterCategoryId"
          placeholder="全部分类"
          clearable
          style="width: 160px"
          @change="handleCategoryFilter"
        >
          <el-option
            v-for="cat in menuStore.categories"
            :key="cat.id"
            :label="cat.name"
            :value="cat.id"
          />
        </el-select>
      </div>
      <el-button type="primary" @click="openDishCreate">新增菜品</el-button>
    </div>

    <el-table :data="menuStore.dishes" v-loading="menuStore.loading" border stripe>
      <el-table-column label="图片" width="80" align="center">
        <template #default="{ row }">
          <el-image
            v-if="row.imageUrl"
            :src="row.imageUrl"
            style="width: 48px; height: 48px; border-radius: 4px"
            fit="cover"
          />
          <el-icon v-else style="font-size: 24px; color: #c0c4cc"><Picture /></el-icon>
        </template>
      </el-table-column>
      <el-table-column prop="name" label="菜品名称" min-width="120" />
      <el-table-column label="分类" width="120">
        <template #default="{ row }">
          {{ getCategoryName(row.categoryId) }}
        </template>
      </el-table-column>
      <el-table-column label="价格（元）" width="110" align="right">
        <template #default="{ row }">
          {{ centToYuan(row.price) }}
        </template>
      </el-table-column>
      <el-table-column label="SKU" width="80" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.hasSku" type="info" size="small">有规格</el-tag>
          <span v-else style="color: #c0c4cc">—</span>
        </template>
      </el-table-column>
      <el-table-column label="上架状态" width="110" align="center">
        <template #default="{ row }">
          <el-switch
            :model-value="row.isAvailable"
            :loading="togglingId === row.id"
            @change="(val: boolean) => handleToggleAvailable(row, val)"
          />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160">
        <template #default="{ row }">
          <el-button size="small" @click="openDishEdit(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="handleDeleteDish(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 菜品表单弹窗 -->
    <el-dialog
      v-model="dishDialogVisible"
      :title="editingDish ? '编辑菜品' : '新增菜品'"
      width="640px"
      :close-on-click-modal="false"
      @closed="resetDishForm"
    >
      <el-form
        ref="dishFormRef"
        :model="dishForm"
        :rules="dishRules"
        label-width="90px"
        @submit.prevent
      >
        <el-form-item label="菜品名称" prop="name">
          <el-input v-model="dishForm.name" placeholder="请输入菜品名称" clearable />
        </el-form-item>

        <el-form-item label="所属分类" prop="categoryId">
          <el-select v-model="dishForm.categoryId" placeholder="请选择分类" style="width: 100%">
            <el-option
              v-for="cat in menuStore.categories"
              :key="cat.id"
              :label="cat.name"
              :value="cat.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="价格（元）" prop="priceYuan">
          <el-input-number
            v-model="dishForm.priceYuan"
            :min="0"
            :precision="2"
            :step="1"
            controls-position="right"
            style="width: 100%"
            placeholder="请输入价格"
          />
        </el-form-item>

        <el-form-item label="描述">
          <el-input
            v-model="dishForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入菜品描述（选填）"
          />
        </el-form-item>

        <el-form-item label="上架状态">
          <el-switch v-model="dishForm.isAvailable" active-text="上架" inactive-text="下架" />
        </el-form-item>

        <!-- 图片上传 -->
        <el-form-item label="菜品图片">
          <div class="upload-area">
            <el-upload
              :auto-upload="false"
              :show-file-list="false"
              accept="image/*"
              :on-change="handleImageChange"
            >
              <div class="upload-trigger">
                <el-image
                  v-if="imagePreviewUrl"
                  :src="imagePreviewUrl"
                  style="width: 100px; height: 100px; border-radius: 4px"
                  fit="cover"
                />
                <div v-else class="upload-placeholder">
                  <el-icon style="font-size: 28px; color: #8c939d"><Plus /></el-icon>
                  <div style="margin-top: 8px; font-size: 12px; color: #8c939d">点击上传图片</div>
                </div>
              </div>
            </el-upload>
            <div v-if="uploadProgress > 0 && uploadProgress < 100" class="upload-progress">
              <el-progress :percentage="uploadProgress" />
              <span style="font-size: 12px; color: #606266">上传中 {{ uploadProgress }}%</span>
            </div>
            <div v-if="uploadProgress === 100" class="upload-progress">
              <el-progress :percentage="100" status="success" />
              <span style="font-size: 12px; color: #67c23a">上传成功</span>
            </div>
          </div>
        </el-form-item>

        <!-- SKU 配置 -->
        <el-form-item label="启用规格">
          <el-switch v-model="dishForm.hasSku" active-text="是" inactive-text="否" />
        </el-form-item>

        <template v-if="dishForm.hasSku">
          <el-form-item label="规格列表">
            <div class="sku-list">
              <div v-for="(sku, index) in dishForm.skus" :key="index" class="sku-item">
                <el-input
                  v-model="sku.name"
                  placeholder="规格名称，如：大份"
                  style="width: 180px"
                />
                <span style="margin: 0 8px; color: #606266">价格差（元）</span>
                <el-input-number
                  v-model="sku.priceDeltaYuan"
                  :precision="2"
                  :step="1"
                  controls-position="right"
                  style="width: 130px"
                  placeholder="0.00"
                />
                <el-button
                  type="danger"
                  :icon="Delete"
                  circle
                  size="small"
                  style="margin-left: 8px"
                  @click="removeSku(index)"
                />
              </div>
              <el-button type="primary" plain size="small" :icon="Plus" @click="addSku">
                添加规格
              </el-button>
            </div>
          </el-form-item>
        </template>
      </el-form>

      <template #footer>
        <el-button @click="dishDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="dishSubmitting" @click="handleDishSubmit">
          确认
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import type { FormInstance, FormRules, UploadFile } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Delete, Picture } from '@element-plus/icons-vue'
import { useMenuStore } from '@/stores/menu'
import type { Dish } from '@/api'

const menuStore = useMenuStore()

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

/** 分（后端）→ 元（前端显示），保留两位小数 */
function centToYuan(cents: number): string {
  return (cents / 100).toFixed(2)
}

/** 元（前端输入）→ 分（后端存储），四舍五入取整 */
function yuanToCent(yuan: number): number {
  return Math.round(yuan * 100)
}

function getCategoryName(categoryId: string): string {
  return menuStore.categories.find((c) => c.id === categoryId)?.name ?? '—'
}

// ─── 菜品管理 ─────────────────────────────────────────────────────────────────

const filterCategoryId = ref<string | undefined>(undefined)
const togglingId = ref<string | null>(null)

const dishDialogVisible = ref(false)
const editingDish = ref<Dish | null>(null)
const dishSubmitting = ref(false)
const dishFormRef = ref<FormInstance>()

// 图片上传状态
const imagePreviewUrl = ref<string>('')
const pendingImageFile = ref<File | null>(null)
const uploadProgress = ref(0)

interface SkuFormItem {
  name: string
  priceDeltaYuan: number
}

interface DishFormData {
  name: string
  description: string
  priceYuan: number
  categoryId: string
  isAvailable: boolean
  hasSku: boolean
  sortOrder: number
  skus: SkuFormItem[]
}

const dishForm = reactive<DishFormData>({
  name: '',
  description: '',
  priceYuan: 0,
  categoryId: '',
  isAvailable: true,
  hasSku: false,
  sortOrder: 0,
  skus: [],
})

const dishRules: FormRules = {
  name: [
    { required: true, message: '请输入菜品名称', trigger: 'blur' },
    { min: 1, max: 100, message: '菜品名称长度为 1~100 个字符', trigger: 'blur' },
  ],
  categoryId: [{ required: true, message: '请选择所属分类', trigger: 'change' }],
  priceYuan: [
    { required: true, message: '请输入价格', trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        if (value === null || value === undefined || value < 0) {
          callback(new Error('价格不能为负数'))
        } else {
          callback()
        }
      },
      trigger: 'blur',
    },
  ],
}

function openDishCreate() {
  editingDish.value = null
  dishDialogVisible.value = true
}

function openDishEdit(dish: Dish) {
  editingDish.value = dish
  dishForm.name = dish.name
  dishForm.description = dish.description ?? ''
  dishForm.priceYuan = dish.price / 100
  dishForm.categoryId = dish.categoryId
  dishForm.isAvailable = dish.isAvailable
  dishForm.hasSku = dish.hasSku
  dishForm.sortOrder = dish.sortOrder
  dishForm.skus = (dish.skus ?? []).map((s) => ({
    name: s.name,
    priceDeltaYuan: s.priceDelta / 100,
  }))
  imagePreviewUrl.value = dish.imageUrl ?? ''
  pendingImageFile.value = null
  uploadProgress.value = 0
  dishDialogVisible.value = true
}

function resetDishForm() {
  dishForm.name = ''
  dishForm.description = ''
  dishForm.priceYuan = 0
  dishForm.categoryId = ''
  dishForm.isAvailable = true
  dishForm.hasSku = false
  dishForm.sortOrder = 0
  dishForm.skus = []
  imagePreviewUrl.value = ''
  pendingImageFile.value = null
  uploadProgress.value = 0
  editingDish.value = null
  dishFormRef.value?.clearValidate()
}

function addSku() {
  dishForm.skus.push({ name: '', priceDeltaYuan: 0 })
}

function removeSku(index: number) {
  dishForm.skus.splice(index, 1)
}

function handleImageChange(file: UploadFile) {
  if (!file.raw) return
  pendingImageFile.value = file.raw
  imagePreviewUrl.value = URL.createObjectURL(file.raw)
  uploadProgress.value = 0
}

async function handleDishSubmit() {
  const valid = await dishFormRef.value?.validate().catch(() => false)
  if (!valid) return

  dishSubmitting.value = true
  try {
    const payload = {
      name: dishForm.name,
      description: dishForm.description,
      price: yuanToCent(dishForm.priceYuan),
      categoryId: dishForm.categoryId,
      isAvailable: dishForm.isAvailable,
      hasSku: dishForm.hasSku,
      sortOrder: dishForm.sortOrder,
    }

    let savedDish: Dish

    if (editingDish.value) {
      // 更新菜品（含 SKU）
      const updatePayload: Parameters<typeof menuStore.updateDish>[1] = { ...payload }
      if (dishForm.hasSku) {
        updatePayload.skus = dishForm.skus.map((s) => ({
          id: '',
          dishId: editingDish.value!.id,
          name: s.name,
          priceDelta: yuanToCent(s.priceDeltaYuan),
          isAvailable: true,
        }))
      }
      savedDish = await menuStore.updateDish(editingDish.value.id, updatePayload)
      ElMessage.success('菜品更新成功')
    } else {
      // 创建菜品（含 SKU）
      const createPayload: Parameters<typeof menuStore.createDish>[0] = { ...payload }
      if (dishForm.hasSku) {
        createPayload.skus = dishForm.skus.map((s) => ({
          id: '',
          dishId: '',
          name: s.name,
          priceDelta: yuanToCent(s.priceDeltaYuan),
          isAvailable: true,
        }))
      }
      savedDish = await menuStore.createDish(createPayload)
      ElMessage.success('菜品创建成功')
    }

    // 如果有待上传的图片，上传图片
    if (pendingImageFile.value) {
      uploadProgress.value = 0
      const fd = new FormData()
      fd.append('image', pendingImageFile.value)
      try {
        await menuStore.uploadDishImage(savedDish.id, fd, (pct) => {
          uploadProgress.value = pct
        })
        ElMessage.success('图片上传成功')
      } catch (imgErr: unknown) {
        ElMessage.warning(
          `菜品已保存，但图片上传失败：${imgErr instanceof Error ? imgErr.message : '未知错误'}`,
        )
      }
    }

    dishDialogVisible.value = false
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : '操作失败')
  } finally {
    dishSubmitting.value = false
  }
}

async function handleToggleAvailable(dish: Dish, val: boolean) {
  togglingId.value = dish.id
  try {
    await menuStore.updateDish(dish.id, { isAvailable: val })
    ElMessage.success(val ? '已上架' : '已下架')
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : '操作失败')
  } finally {
    togglingId.value = null
  }
}

async function handleDeleteDish(dish: Dish) {
  try {
    await ElMessageBox.confirm(
      `确认删除菜品"${dish.name}"？删除后无法恢复。`,
      '删除确认',
      { type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  try {
    await menuStore.deleteDish(dish.id)
    ElMessage.success('删除成功')
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : '删除失败')
  }
}

async function handleCategoryFilter() {
  try {
    await menuStore.fetchDishes(
      filterCategoryId.value ? { categoryId: filterCategoryId.value } : undefined,
    )
  } catch {
    ElMessage.error(menuStore.error ?? '获取菜品列表失败')
  }
}
</script>

<style scoped>
.dish-management {
  padding: 0;
}

.tab-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.filter-bar {
  display: flex;
  gap: 12px;
}

.upload-area {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.upload-trigger {
  width: 100px;
  height: 100px;
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: border-color 0.2s;
}

.upload-trigger:hover {
  border-color: #409eff;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.upload-progress {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 240px;
}

.sku-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.sku-item {
  display: flex;
  align-items: center;
}
</style>
