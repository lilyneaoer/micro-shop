/**
 * 菜单相关类型定义
 */

/**
 * 分类接口
 */
export interface Category {
  id: string
  name: string
  sortOrder: number
}

/**
 * 菜品接口
 */
export interface Dish {
  id: string
  name: string
  description: string
  price: number // 单位：分
  imageUrl?: string
  categoryId: string
  isAvailable: boolean
  category?: {
    id: string
    name: string
    sortOrder: number
  }
}

/**
 * 分组后的菜品
 */
export interface GroupedDishes {
  categoryId: string
  categoryName: string
  dishes: Dish[]
}
