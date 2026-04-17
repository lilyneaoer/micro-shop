import { defineStore } from 'pinia'
import { ref } from 'vue'
import { tableApi, type Table, type CreateTableParams, type UpdateTableParams } from '@/api'

/**
 * 桌台状态 Store
 * 提供桌台列表的增删改查操作，以及 loading / error 状态管理
 */
export const useTablesStore = defineStore('tables', () => {
  const tables = ref<Table[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * 获取桌台列表
   */
  async function fetchTables(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      tables.value = await tableApi.list()
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : '获取桌台列表失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 创建桌台
   */
  async function createTable(params: CreateTableParams): Promise<Table> {
    const newTable = await tableApi.create(params)
    tables.value.push(newTable)
    return newTable
  }

  /**
   * 更新桌台
   */
  async function updateTable(id: string, params: UpdateTableParams): Promise<Table> {
    const updated = await tableApi.update(id, params)
    const index = tables.value.findIndex((t) => t.id === id)
    if (index !== -1) {
      tables.value[index] = updated
    }
    return updated
  }

  /**
   * 删除桌台
   */
  async function deleteTable(id: string): Promise<void> {
    await tableApi.remove(id)
    tables.value = tables.value.filter((t) => t.id !== id)
  }

  return {
    tables,
    loading,
    error,
    fetchTables,
    createTable,
    updateTable,
    deleteTable,
  }
})
