import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import * as fc from 'fast-check'
import { useCartStore, type CartItem } from '../../stores/cart'

/**
 * 购物车状态不变量属性测试
 * 
 * **属性 3：购物车状态不变量**
 * 
 * 对于任意购物车状态和操作序列：
 * - 购物车的总金额始终等于所有购物车项的 unit_price × quantity 之和
 * - 当任意购物车项的数量被设置为 0 时，该项不再出现在购物车中
 * 
 * **验证需求：3.3、3.4**
 */
describe('Cart Store - Property-Based Tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  /**
   * 生成随机菜品 ID
   */
  const dishIdArb = fc.string({ minLength: 1, maxLength: 20 })

  /**
   * 生成随机 SKU ID（可选）
   */
  const skuIdArb = fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined })

  /**
   * 生成随机商品数据
   */
  const dishArb = fc.record({
    dishId: dishIdArb,
    dishName: fc.string({ minLength: 1, maxLength: 50 }),
    unitPrice: fc.integer({ min: 1, max: 100000 }), // 0.01元 到 1000元
    skuId: skuIdArb,
    skuName: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: undefined }),
    imageUrl: fc.option(fc.webUrl(), { nil: undefined })
  })

  /**
   * 生成购物车操作序列
   */
  const cartOperationArb = fc.oneof(
    // 添加商品操作
    fc.record({
      type: fc.constant('add' as const),
      dish: dishArb,
      quantity: fc.integer({ min: 1, max: 10 })
    }),
    // 更新数量操作
    fc.record({
      type: fc.constant('update' as const),
      dishId: dishIdArb,
      skuId: skuIdArb,
      quantity: fc.integer({ min: 0, max: 20 })
    }),
    // 移除商品操作
    fc.record({
      type: fc.constant('remove' as const),
      dishId: dishIdArb,
      skuId: skuIdArb
    })
  )

  /**
   * 属性 3.1：总金额始终等于所有商品的 unitPrice × quantity 之和
   */
  it('属性 3.1：总金额应该始终等于所有商品的 unitPrice × quantity 之和', () => {
    fc.assert(
      fc.property(
        fc.array(cartOperationArb, { minLength: 1, maxLength: 50 }),
        (operations) => {
          const cart = useCartStore()

          // 执行操作序列
          for (const op of operations) {
            try {
              if (op.type === 'add') {
                cart.addItem({
                  dishId: op.dish.dishId,
                  dishName: op.dish.dishName,
                  unitPrice: op.dish.unitPrice,
                  skuId: op.dish.skuId,
                  skuName: op.dish.skuName,
                  imageUrl: op.dish.imageUrl,
                  quantity: op.quantity
                })
              } else if (op.type === 'update') {
                cart.updateQuantity(op.dishId, op.quantity, op.skuId)
              } else if (op.type === 'remove') {
                cart.removeItem(op.dishId, op.skuId)
              }
            } catch (error) {
              // 忽略可能的错误，继续执行
            }
          }

          // 验证总金额等于所有商品的 unitPrice × quantity 之和
          const expectedTotal = cart.items.reduce((sum, item) => {
            return sum + item.unitPrice * item.quantity
          }, 0)

          return cart.totalAmount === expectedTotal
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 3.2：数量为 0 的商品不应该出现在购物车中
   */
  it('属性 3.2：数量为 0 的商品不应该出现在购物车中', () => {
    fc.assert(
      fc.property(
        fc.array(cartOperationArb, { minLength: 1, maxLength: 50 }),
        (operations) => {
          const cart = useCartStore()

          // 执行操作序列
          for (const op of operations) {
            try {
              if (op.type === 'add') {
                cart.addItem({
                  dishId: op.dish.dishId,
                  dishName: op.dish.dishName,
                  unitPrice: op.dish.unitPrice,
                  skuId: op.dish.skuId,
                  skuName: op.dish.skuName,
                  imageUrl: op.dish.imageUrl,
                  quantity: op.quantity
                })
              } else if (op.type === 'update') {
                cart.updateQuantity(op.dishId, op.quantity, op.skuId)
              } else if (op.type === 'remove') {
                cart.removeItem(op.dishId, op.skuId)
              }
            } catch (error) {
              // 忽略可能的错误，继续执行
            }
          }

          // 验证所有购物车中的商品数量都大于 0
          return cart.items.every(item => item.quantity > 0)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 3.3：将商品数量设置为 0 后，该商品应该从购物车中移除
   */
  it('属性 3.3：将商品数量设置为 0 后，该商品应该从购物车中移除', () => {
    fc.assert(
      fc.property(
        fc.array(dishArb, { minLength: 1, maxLength: 20 }),
        fc.integer({ min: 0, max: 19 }),
        (dishes, targetIndex) => {
          const cart = useCartStore()

          // 添加所有商品
          dishes.forEach(dish => {
            cart.addItem({
              dishId: dish.dishId,
              dishName: dish.dishName,
              unitPrice: dish.unitPrice,
              skuId: dish.skuId,
              skuName: dish.skuName,
              imageUrl: dish.imageUrl,
              quantity: 1
            })
          })

          // 选择一个商品将其数量设为 0
          if (targetIndex < cart.items.length) {
            const targetItem = cart.items[targetIndex]
            cart.updateQuantity(targetItem.dishId, 0, targetItem.skuId)

            // 验证该商品已从购物车中移除
            const stillExists = cart.items.some(
              item => item.dishId === targetItem.dishId && item.skuId === targetItem.skuId
            )

            return !stillExists
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 3.4：购物车总数量应该等于所有商品数量之和
   */
  it('属性 3.4：购物车总数量应该等于所有商品数量之和', () => {
    fc.assert(
      fc.property(
        fc.array(cartOperationArb, { minLength: 1, maxLength: 50 }),
        (operations) => {
          const cart = useCartStore()

          // 执行操作序列
          for (const op of operations) {
            try {
              if (op.type === 'add') {
                cart.addItem({
                  dishId: op.dish.dishId,
                  dishName: op.dish.dishName,
                  unitPrice: op.dish.unitPrice,
                  skuId: op.dish.skuId,
                  skuName: op.dish.skuName,
                  imageUrl: op.dish.imageUrl,
                  quantity: op.quantity
                })
              } else if (op.type === 'update') {
                cart.updateQuantity(op.dishId, op.quantity, op.skuId)
              } else if (op.type === 'remove') {
                cart.removeItem(op.dishId, op.skuId)
              }
            } catch (error) {
              // 忽略可能的错误，继续执行
            }
          }

          // 验证总数量等于所有商品数量之和
          const expectedTotalQuantity = cart.items.reduce((sum, item) => {
            return sum + item.quantity
          }, 0)

          return cart.totalQuantity === expectedTotalQuantity
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 3.5：相同商品（相同 dishId 和 skuId）应该合并而不是重复
   */
  it('属性 3.5：相同商品应该合并而不是重复', () => {
    fc.assert(
      fc.property(
        dishArb,
        fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 1, maxLength: 10 }),
        (dish, quantities) => {
          const cart = useCartStore()

          // 多次添加相同商品
          quantities.forEach(qty => {
            cart.addItem({
              dishId: dish.dishId,
              dishName: dish.dishName,
              unitPrice: dish.unitPrice,
              skuId: dish.skuId,
              skuName: dish.skuName,
              imageUrl: dish.imageUrl,
              quantity: qty
            })
          })

          // 验证购物车中只有一个该商品
          const matchingItems = cart.items.filter(
            item => item.dishId === dish.dishId && item.skuId === dish.skuId
          )

          if (matchingItems.length !== 1) {
            return false
          }

          // 验证数量是所有添加数量的总和
          const expectedQuantity = quantities.reduce((sum, qty) => sum + qty, 0)
          return matchingItems[0].quantity === expectedQuantity
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 3.6：清空购物车后，所有状态应该重置
   */
  it('属性 3.6：清空购物车后，所有状态应该重置', () => {
    fc.assert(
      fc.property(
        fc.array(dishArb, { minLength: 1, maxLength: 20 }),
        (dishes) => {
          const cart = useCartStore()

          // 添加所有商品
          dishes.forEach(dish => {
            cart.addItem({
              dishId: dish.dishId,
              dishName: dish.dishName,
              unitPrice: dish.unitPrice,
              skuId: dish.skuId,
              skuName: dish.skuName,
              imageUrl: dish.imageUrl,
              quantity: 1
            })
          })

          // 清空购物车
          cart.clearCart()

          // 验证所有状态都已重置
          return (
            cart.items.length === 0 &&
            cart.totalAmount === 0 &&
            cart.totalQuantity === 0
          )
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 3.7：金额计算不应该溢出或产生负数
   */
  it('属性 3.7：金额计算不应该溢出或产生负数', () => {
    fc.assert(
      fc.property(
        fc.array(cartOperationArb, { minLength: 1, maxLength: 50 }),
        (operations) => {
          const cart = useCartStore()

          // 执行操作序列
          for (const op of operations) {
            try {
              if (op.type === 'add') {
                cart.addItem({
                  dishId: op.dish.dishId,
                  dishName: op.dish.dishName,
                  unitPrice: op.dish.unitPrice,
                  skuId: op.dish.skuId,
                  skuName: op.dish.skuName,
                  imageUrl: op.dish.imageUrl,
                  quantity: op.quantity
                })
              } else if (op.type === 'update') {
                cart.updateQuantity(op.dishId, op.quantity, op.skuId)
              } else if (op.type === 'remove') {
                cart.removeItem(op.dishId, op.skuId)
              }
            } catch (error) {
              // 忽略可能的错误，继续执行
            }
          }

          // 验证总金额是非负数且是有限数
          return (
            cart.totalAmount >= 0 &&
            Number.isFinite(cart.totalAmount) &&
            !Number.isNaN(cart.totalAmount)
          )
        }
      ),
      { numRuns: 100 }
    )
  })
})
