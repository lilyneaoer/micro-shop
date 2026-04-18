<template>
  <div class="menu-page">
    <h2 class="page-heading">菜单管理</h2>

    <el-tabs v-model="activeTab">
      <!-- ─── 菜品列表 Tab ─────────────────────────────────────────────────── -->
      <el-tab-pane label="菜品列表" name="dishes">
        <DishManagement />
      </el-tab-pane>
      <!-- ─── 分类管理 Tab ─────────────────────────────────────────────────── -->
      <el-tab-pane label="菜品分类" name="categories">
        <CategoryManagement />
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

const activeTab = ref('dishes')

// ─── 初始化 ───────────────────────────────────────────────────────────────────

onMounted(async () => {
  try {
    // 只加载分类数据，菜品数据由 DishManagement 组件自己加载
    await menuStore.fetchCategories()
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
