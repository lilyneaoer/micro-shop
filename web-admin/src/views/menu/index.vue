<template>
  <div class="menu-page">
    <h2 class="page-heading">菜单管理</h2>

    <el-tabs v-model="activeTab">
      <!-- ─── 分类管理 Tab ─────────────────────────────────────────────────── -->
      <el-tab-pane label="菜品分类" name="categories">
        <CategoryManagement />
      </el-tab-pane>

      <!-- ─── 菜品列表 Tab ─────────────────────────────────────────────────── -->
      <el-tab-pane label="菜品列表" name="dishes">
        <DishManagement />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useMenuStore } from '@/stores/menu'
import CategoryManagement from './CategoryManagement.vue'
import DishManagement from './DishManagement.vue'

const menuStore = useMenuStore()

// ─── Tab 状态 ─────────────────────────────────────────────────────────────────

const activeTab = ref('categories')

// ─── 初始化 ───────────────────────────────────────────────────────────────────

onMounted(async () => {
  try {
    await Promise.all([menuStore.fetchCategories(), menuStore.fetchDishes()])
  } catch {
    ElMessage.error(menuStore.error ?? '数据加载失败')
  }
})
</script>

<style scoped>
.menu-page {
  padding: 0;
}

.page-heading {
  margin-bottom: 20px;
  font-size: 18px;
  color: #303133;
}
</style>
