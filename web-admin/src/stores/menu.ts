import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  menuApi,
  type Category,
  type Dish,
  type Sku,
} from '@/api'

/**
 * 菜单状态 Store
 * 提供分类和菜品的增删改查操作，以及 loading / error 状态管理
 */
export const useMenuStore = defineStore('menu', () => {
  const categories = ref<Category[]>([])
  const dishes = ref<Dish[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ─── 分类操作 ──────────────────────────────────────────────────────────────

  /**
   * 获取分类列表
   */
  async function fetchCategories(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      categories.value = await menuApi.listCategories()
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : '获取分类列表失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 创建分类
   */
  async function createCategory(params: { name: string; sortOrder?: number }): Promise<Category> {
    const newCategory = await menuApi.createCategory(params)
    categories.value.push(newCategory)
    return newCategory
  }

  /**
   * 更新分类
   */
  async function updateCategory(
    id: string,
    params: { name?: string; sortOrder?: number },
  ): Promise<Category> {
    const updated = await menuApi.updateCategory(id, params)
    const index = categories.value.findIndex((c) => c.id === id)
    if (index !== -1) {
      categories.value[index] = updated
    }
    return updated
  }

  /**
   * 删除分类
   */
  async function deleteCategory(id: string): Promise<void> {
    await menuApi.deleteCategory(id)
    categories.value = categories.value.filter((c) => c.id !== id)
  }

  // ─── 菜品操作 ──────────────────────────────────────────────────────────────

  /**
   * 获取菜品列表
   */
  async function fetchDishes(params?: { categoryId?: string; isAvailable?: boolean }): Promise<void> {
    loading.value = true
    error.value = null
    try {
      dishes.value = await menuApi.listDishes(params)
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : '获取菜品列表失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 创建菜品
   */
  async function createDish(
    params: Omit<Dish, 'id' | 'imageUrl' | 'skus' | 'createdAt' | 'updatedAt'>,
  ): Promise<Dish> {
    const newDish = await menuApi.createDish(params)
    dishes.value.push(newDish)
    return newDish
  }

  /**
   * 更新菜品
   */
  async function updateDish(
    id: string,
    params: Partial<Omit<Dish, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Dish> {
    const updated = await menuApi.updateDish(id, params)
    const index = dishes.value.findIndex((d) => d.id === id)
    if (index !== -1) {
      dishes.value[index] = updated
    }
    return updated
  }

  /**
   * 删除菜品
   */
  async function deleteDish(id: string): Promise<void> {
    await menuApi.deleteDish(id)
    dishes.value = dishes.value.filter((d) => d.id !== id)
  }

  /**
   * 上传菜品图片
   */
  async function uploadDishImage(
    id: string,
    formData: FormData,
    onProgress?: (percent: number) => void,
  ): Promise<string> {
    // Use axios directly for progress tracking
    const { default: request } = await import('@/api')
    const result = await request.post<unknown, { imageUrl: string }>(
      `/dishes/${id}/image`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (event) => {
          if (onProgress && event.total) {
            onProgress(Math.round((event.loaded * 100) / event.total))
          }
        },
      },
    )
    // Update the dish imageUrl in local state
    const index = dishes.value.findIndex((d) => d.id === id)
    if (index !== -1) {
      dishes.value[index] = { ...dishes.value[index], imageUrl: result.imageUrl }
    }
    return result.imageUrl
  }

  return {
    categories,
    dishes,
    loading,
    error,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    fetchDishes,
    createDish,
    updateDish,
    deleteDish,
    uploadDishImage,
  }
})

export type { Category, Dish, Sku }
