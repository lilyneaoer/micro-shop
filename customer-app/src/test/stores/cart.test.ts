import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCartStore } from '../../stores/cart'

/**
 * 购物车 Store 单元测试
 * 
 * **验证需求：3.2、3.3、3.4**
 */
describe('Cart Store', () => {
  beforeEach(() => {
    // 为每个测试创建新的 Pinia 实例
    setActivePinia(createPinia())
  })

  describe('添加商品', () => {
    it('应该能添加新商品到购物车', () => {
      const cart = useCartStore()

      cart.addItem({
        dishId: 'dish-1',
        dishName: '宫保鸡丁',
        unitPrice: 2800 // 28元 = 2800分
      })

      expect(cart.items).toHaveLength(1)
      expect(cart.items[0]).toMatchObject({
        dishId: 'dish-1',
        dishName: '宫保鸡丁',
        unitPrice: 2800,
        quantity: 1
      })
    })

    it('应该能添加带 SKU 的商品', () => {
      const cart = useCartStore()

      cart.addItem({
        dishId: 'dish-1',
        dishName: '可乐',
        unitPrice: 500,
        skuId: 'sku-large',
        skuName: '大杯'
      })

      expect(cart.items).toHaveLength(1)
      expect(cart.items[0]).toMatchObject({
        dishId: 'dish-1',
        skuId: 'sku-large',
        skuName: '大杯',
        quantity: 1
      })
    })

    it('应该能指定初始数量添加商品', () => {
      const cart = useCartStore()

      cart.addItem({
        dishId: 'dish-1',
        dishName: '米饭',
        unitPrice: 200,
        quantity: 3
      })

      expect(cart.items[0].quantity).toBe(3)
    })

    it('相同商品应该累加数量而不是新增条目', () => {
      const cart = useCartStore()

      // 第一次添加
      cart.addItem({
        dishId: 'dish-1',
        dishName: '宫保鸡丁',
        unitPrice: 2800
      })

      // 第二次添加相同商品
      cart.addItem({
        dishId: 'dish-1',
        dishName: '宫保鸡丁',
        unitPrice: 2800
      })

      expect(cart.items).toHaveLength(1)
      expect(cart.items[0].quantity).toBe(2)
    })

    it('不同 SKU 的相同菜品应该作为不同条目', () => {
      const cart = useCartStore()

      cart.addItem({
        dishId: 'dish-1',
        dishName: '可乐',
        unitPrice: 500,
        skuId: 'sku-small',
        skuName: '小杯'
      })

      cart.addItem({
        dishId: 'dish-1',
        dishName: '可乐',
        unitPrice: 600,
        skuId: 'sku-large',
        skuName: '大杯'
      })

      expect(cart.items).toHaveLength(2)
    })
  })

  describe('更新数量', () => {
    it('应该能更新商品数量', () => {
      const cart = useCartStore()

      cart.addItem({
        dishId: 'dish-1',
        dishName: '宫保鸡丁',
        unitPrice: 2800
      })

      cart.updateQuantity('dish-1', 5)

      expect(cart.items[0].quantity).toBe(5)
    })

    it('数量为 0 时应该自动移除商品', () => {
      const cart = useCartStore()

      cart.addItem({
        dishId: 'dish-1',
        dishName: '宫保鸡丁',
        unitPrice: 2800
      })

      cart.updateQuantity('dish-1', 0)

      expect(cart.items).toHaveLength(0)
    })

    it('应该能更新带 SKU 商品的数量', () => {
      const cart = useCartStore()

      cart.addItem({
        dishId: 'dish-1',
        dishName: '可乐',
        unitPrice: 500,
        skuId: 'sku-large',
        skuName: '大杯'
      })

      cart.updateQuantity('dish-1', 3, 'sku-large')

      expect(cart.items[0].quantity).toBe(3)
    })
  })

  describe('移除商品', () => {
    it('应该能移除指定商品', () => {
      const cart = useCartStore()

      cart.addItem({
        dishId: 'dish-1',
        dishName: '宫保鸡丁',
        unitPrice: 2800
      })

      cart.addItem({
        dishId: 'dish-2',
        dishName: '鱼香肉丝',
        unitPrice: 2600
      })

      cart.removeItem('dish-1')

      expect(cart.items).toHaveLength(1)
      expect(cart.items[0].dishId).toBe('dish-2')
    })

    it('应该能移除带 SKU 的商品', () => {
      const cart = useCartStore()

      cart.addItem({
        dishId: 'dish-1',
        dishName: '可乐',
        unitPrice: 500,
        skuId: 'sku-small',
        skuName: '小杯'
      })

      cart.addItem({
        dishId: 'dish-1',
        dishName: '可乐',
        unitPrice: 600,
        skuId: 'sku-large',
        skuName: '大杯'
      })

      cart.removeItem('dish-1', 'sku-small')

      expect(cart.items).toHaveLength(1)
      expect(cart.items[0].skuId).toBe('sku-large')
    })
  })

  describe('总金额计算', () => {
    it('空购物车总金额应该为 0', () => {
      const cart = useCartStore()
      expect(cart.totalAmount).toBe(0)
    })

    it('应该正确计算单个商品的总金额', () => {
      const cart = useCartStore()

      cart.addItem({
        dishId: 'dish-1',
        dishName: '宫保鸡丁',
        unitPrice: 2800, // 28元
        quantity: 2
      })

      // 2800 × 2 = 5600分 = 56元
      expect(cart.totalAmount).toBe(5600)
    })

    it('应该正确计算多个商品的总金额', () => {
      const cart = useCartStore()

      cart.addItem({
        dishId: 'dish-1',
        dishName: '宫保鸡丁',
        unitPrice: 2800, // 28元
        quantity: 2
      })

      cart.addItem({
        dishId: 'dish-2',
        dishName: '鱼香肉丝',
        unitPrice: 2600, // 26元
        quantity: 1
      })

      cart.addItem({
        dishId: 'dish-3',
        dishName: '米饭',
        unitPrice: 200, // 2元
        quantity: 3
      })

      // (2800 × 2) + (2600 × 1) + (200 × 3) = 5600 + 2600 + 600 = 8800分 = 88元
      expect(cart.totalAmount).toBe(8800)
    })

    it('更新数量后应该重新计算总金额', () => {
      const cart = useCartStore()

      cart.addItem({
        dishId: 'dish-1',
        dishName: '宫保鸡丁',
        unitPrice: 2800,
        quantity: 2
      })

      expect(cart.totalAmount).toBe(5600)

      cart.updateQuantity('dish-1', 5)

      // 2800 × 5 = 14000分 = 140元
      expect(cart.totalAmount).toBe(14000)
    })

    it('移除商品后应该重新计算总金额', () => {
      const cart = useCartStore()

      cart.addItem({
        dishId: 'dish-1',
        dishName: '宫保鸡丁',
        unitPrice: 2800,
        quantity: 2
      })

      cart.addItem({
        dishId: 'dish-2',
        dishName: '鱼香肉丝',
        unitPrice: 2600,
        quantity: 1
      })

      expect(cart.totalAmount).toBe(8200)

      cart.removeItem('dish-1')

      expect(cart.totalAmount).toBe(2600)
    })
  })

  describe('总数量计算', () => {
    it('空购物车总数量应该为 0', () => {
      const cart = useCartStore()
      expect(cart.totalQuantity).toBe(0)
    })

    it('应该正确计算总数量', () => {
      const cart = useCartStore()

      cart.addItem({
        dishId: 'dish-1',
        dishName: '宫保鸡丁',
        unitPrice: 2800,
        quantity: 2
      })

      cart.addItem({
        dishId: 'dish-2',
        dishName: '鱼香肉丝',
        unitPrice: 2600,
        quantity: 3
      })

      expect(cart.totalQuantity).toBe(5)
    })
  })

  describe('清空购物车', () => {
    it('应该能清空购物车', () => {
      const cart = useCartStore()

      cart.addItem({
        dishId: 'dish-1',
        dishName: '宫保鸡丁',
        unitPrice: 2800
      })

      cart.addItem({
        dishId: 'dish-2',
        dishName: '鱼香肉丝',
        unitPrice: 2600
      })

      cart.clearCart()

      expect(cart.items).toHaveLength(0)
      expect(cart.totalAmount).toBe(0)
      expect(cart.totalQuantity).toBe(0)
    })
  })

  describe('获取商品数量', () => {
    it('不存在的商品应该返回 0', () => {
      const cart = useCartStore()
      expect(cart.getItemQuantity('non-existent')).toBe(0)
    })

    it('应该返回正确的商品数量', () => {
      const cart = useCartStore()

      cart.addItem({
        dishId: 'dish-1',
        dishName: '宫保鸡丁',
        unitPrice: 2800,
        quantity: 3
      })

      expect(cart.getItemQuantity('dish-1')).toBe(3)
    })

    it('应该能获取带 SKU 商品的数量', () => {
      const cart = useCartStore()

      cart.addItem({
        dishId: 'dish-1',
        dishName: '可乐',
        unitPrice: 500,
        skuId: 'sku-large',
        skuName: '大杯',
        quantity: 2
      })

      expect(cart.getItemQuantity('dish-1', 'sku-large')).toBe(2)
      expect(cart.getItemQuantity('dish-1', 'sku-small')).toBe(0)
    })
  })

  describe('购物车状态不变量（属性 3）', () => {
    it('总金额应该始终等于所有商品的 unitPrice × quantity 之和', () => {
      const cart = useCartStore()

      // 添加多个商品
      cart.addItem({
        dishId: 'dish-1',
        dishName: '宫保鸡丁',
        unitPrice: 2800,
        quantity: 2
      })

      cart.addItem({
        dishId: 'dish-2',
        dishName: '鱼香肉丝',
        unitPrice: 2600,
        quantity: 3
      })

      cart.addItem({
        dishId: 'dish-3',
        dishName: '米饭',
        unitPrice: 200,
        quantity: 5
      })

      // 手动计算总金额
      const expectedTotal = cart.items.reduce((sum, item) => {
        return sum + item.unitPrice * item.quantity
      }, 0)

      expect(cart.totalAmount).toBe(expectedTotal)

      // 更新数量后再次验证
      cart.updateQuantity('dish-1', 5)

      const newExpectedTotal = cart.items.reduce((sum, item) => {
        return sum + item.unitPrice * item.quantity
      }, 0)

      expect(cart.totalAmount).toBe(newExpectedTotal)
    })

    it('数量为 0 的商品不应该出现在购物车中', () => {
      const cart = useCartStore()

      cart.addItem({
        dishId: 'dish-1',
        dishName: '宫保鸡丁',
        unitPrice: 2800,
        quantity: 2
      })

      cart.addItem({
        dishId: 'dish-2',
        dishName: '鱼香肉丝',
        unitPrice: 2600,
        quantity: 1
      })

      // 将第一个商品数量设为 0
      cart.updateQuantity('dish-1', 0)

      // 验证该商品已被移除
      expect(cart.items.every(item => item.quantity > 0)).toBe(true)
      expect(cart.items.find(item => item.dishId === 'dish-1')).toBeUndefined()
      expect(cart.items).toHaveLength(1)
    })

    it('任何操作后，购物车中所有商品的数量都应该大于 0', () => {
      const cart = useCartStore()

      // 执行一系列操作
      cart.addItem({
        dishId: 'dish-1',
        dishName: '宫保鸡丁',
        unitPrice: 2800,
        quantity: 3
      })

      cart.addItem({
        dishId: 'dish-2',
        dishName: '鱼香肉丝',
        unitPrice: 2600,
        quantity: 2
      })

      cart.updateQuantity('dish-1', 5)
      cart.updateQuantity('dish-2', 0) // 应该被移除

      cart.addItem({
        dishId: 'dish-3',
        dishName: '米饭',
        unitPrice: 200,
        quantity: 1
      })

      cart.removeItem('dish-3')

      // 验证所有剩余商品数量都大于 0
      expect(cart.items.every(item => item.quantity > 0)).toBe(true)
    })
  })
})
