import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * 购物车商品项
 */
export interface CartItem {
  dishId: string
  dishName: string
  unitPrice: number // 单位：分
  quantity: number
  skuId?: string
  skuName?: string
  imageUrl?: string
}

/**
 * 购物车状态 Store
 */
export const useCartStore = defineStore('cart', () => {
  // 购物车商品列表
  const items = ref<CartItem[]>([])

  /**
   * 计算购物车总金额（单位：分）
   * 总金额 = sum(item.unit_price × item.quantity)
   */
  const totalAmount = computed(() => {
    return items.value.reduce((sum, item) => {
      return sum + item.unitPrice * item.quantity
    }, 0)
  })

  /**
   * 计算购物车商品总数量
   */
  const totalQuantity = computed(() => {
    return items.value.reduce((sum, item) => sum + item.quantity, 0)
  })

  /**
   * 添加商品到购物车
   * 如果商品已存在（相同 dishId 和 skuId），则累加数量
   */
  function addItem(item: Omit<CartItem, 'quantity'> & { quantity?: number }) {
    const existingItem = items.value.find(
      (i) => i.dishId === item.dishId && i.skuId === item.skuId
    )

    if (existingItem) {
      // 商品已存在，累加数量
      existingItem.quantity += item.quantity || 1
    } else {
      // 新商品，添加到购物车
      items.value.push({
        ...item,
        quantity: item.quantity || 1
      })
    }
  }

  /**
   * 更新购物车商品数量
   * 如果数量为 0，自动从购物车中移除该商品
   */
  function updateQuantity(dishId: string, quantity: number, skuId?: string) {
    if (quantity === 0) {
      // 数量为 0，移除商品
      removeItem(dishId, skuId)
      return
    }

    const item = items.value.find(
      (i) => i.dishId === dishId && i.skuId === skuId
    )

    if (item) {
      item.quantity = quantity
    }
  }

  /**
   * 从购物车中移除商品
   */
  function removeItem(dishId: string, skuId?: string) {
    const index = items.value.findIndex(
      (i) => i.dishId === dishId && i.skuId === skuId
    )

    if (index !== -1) {
      items.value.splice(index, 1)
    }
  }

  /**
   * 清空购物车
   */
  function clearCart() {
    items.value = []
  }

  /**
   * 获取指定商品在购物车中的数量
   */
  function getItemQuantity(dishId: string, skuId?: string): number {
    const item = items.value.find(
      (i) => i.dishId === dishId && i.skuId === skuId
    )
    return item ? item.quantity : 0
  }

  return {
    items,
    totalAmount,
    totalQuantity,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    getItemQuantity
  }
})
