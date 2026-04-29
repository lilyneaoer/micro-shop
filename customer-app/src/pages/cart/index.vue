<template>
  <view :class="$style.cartPage">
    <!-- 空购物车状态 -->
    <view v-if="cartStore.items.length === 0" :class="$style.emptyCart">
      <view :class="$style.emptyIcon">🛒</view>
      <view :class="$style.emptyText">购物车是空的</view>
      <view :class="$style.btnBack" @tap="goBack">返回菜单</view>
    </view>

    <!-- 购物车商品列表 -->
    <view v-else :class="$style.cartContent">
      <scroll-view :class="$style.cartList" scroll-y>
        <view
          v-for="item in cartStore.items"
          :key="`${item.dishId}-${item.skuId || ''}`"
          :class="$style.cartItem"
        >
          <!-- 商品图片或占位图 -->
          <view :class="$style.itemImageWrapper">
            <image
              v-if="item.imageUrl"
              :src="item.imageUrl"
              :class="$style.itemImage"
              mode="aspectFill"
            />
            <view v-else :class="$style.itemPlaceholder">
              <view :class="$style.placeholderIcon">🍽️</view>
            </view>
          </view>
          
          <view :class="$style.itemInfo">
            <view :class="$style.itemName">{{ item.dishName }}</view>
            <view v-if="item.skuName" :class="$style.itemSku">{{ item.skuName }}</view>
            <view :class="$style.itemFooter">
              <view :class="$style.itemPrice">¥{{ formatPrice(item.unitPrice) }}</view>
              <view :class="$style.quantityControl">
                <view
                  :class="$style.btnMinus"
                  @tap="decreaseQuantity(item)"
                >
                  -
                </view>
                <input
                  :class="$style.quantityInput"
                  type="number"
                  :value="item.quantity"
                  @blur="handleQuantityChange(item, $event)"
                />
                <view
                  :class="$style.btnPlus"
                  @tap="increaseQuantity(item)"
                >
                  +
                </view>
              </view>
            </view>
          </view>
          <view :class="$style.itemSubtotal">
            ¥{{ formatPrice(item.unitPrice * item.quantity) }}
          </view>
        </view>
      </scroll-view>

      <!-- 底部结算栏 -->
      <view :class="$style.cartFooter">
        <view :class="$style.footerInfo">
          <view :class="$style.totalLabel">总计</view>
          <view :class="$style.totalAmount">
            ¥{{ formatPrice(cartStore.totalAmount) }}
          </view>
        </view>
        <view :class="$style.footerActions">
          <view :class="$style.btnClear" @tap="handleClearCart">清空</view>
          <view :class="$style.btnSubmit" @tap="goToOrderConfirm">提交订单</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Taro from '@tarojs/taro'
import { useCartStore, type CartItem } from '../../stores/cart'

// Store
const cartStore = useCartStore()

/**
 * 格式化价格（分 -> 元）
 */
function formatPrice(priceInCents: number): string {
  return (priceInCents / 100).toFixed(2)
}

/**
 * 增加数量
 */
function increaseQuantity(item: CartItem) {
  cartStore.updateQuantity(item.dishId, item.quantity + 1, item.skuId)
}

/**
 * 减少数量
 */
function decreaseQuantity(item: CartItem) {
  if (item.quantity > 1) {
    cartStore.updateQuantity(item.dishId, item.quantity - 1, item.skuId)
  } else {
    // 数量为 1 时，弹出确认删除
    Taro.showModal({
      title: '提示',
      content: '确定要从购物车中移除该商品吗？',
      success: (res) => {
        if (res.confirm) {
          cartStore.updateQuantity(item.dishId, 0, item.skuId)
        }
      }
    })
  }
}

/**
 * 处理数量输入变化
 */
function handleQuantityChange(item: CartItem, event: any) {
  const value = parseInt(event.detail.value)
  
  if (isNaN(value) || value < 0) {
    // 无效输入，恢复原值
    Taro.showToast({
      title: '请输入有效数量',
      icon: 'none'
    })
    return
  }

  if (value === 0) {
    // 数量为 0，弹出确认删除
    Taro.showModal({
      title: '提示',
      content: '确定要从购物车中移除该商品吗？',
      success: (res) => {
        if (res.confirm) {
          cartStore.updateQuantity(item.dishId, 0, item.skuId)
        }
      }
    })
  } else {
    cartStore.updateQuantity(item.dishId, value, item.skuId)
  }
}

/**
 * 清空购物车
 */
function handleClearCart() {
  Taro.showModal({
    title: '提示',
    content: '确定要清空购物车吗？',
    success: (res) => {
      if (res.confirm) {
        cartStore.clearCart()
        Taro.showToast({
          title: '已清空',
          icon: 'success'
        })
      }
    }
  })
}

/**
 * 返回菜单页
 */
function goBack() {
  Taro.navigateBack()
}

/**
 * 跳转到订单确认页
 */
function goToOrderConfirm() {
  if (cartStore.items.length === 0) {
    Taro.showToast({
      title: '购物车是空的',
      icon: 'none'
    })
    return
  }

  Taro.navigateTo({
    url: '/pages/order-confirm/index'
  })
}
</script>

<style lang="less" module>
.cartPage {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f5f5;
}

.emptyCart {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 0;
}

.emptyIcon {
  font-size: 120rpx;
  margin-bottom: 32rpx;
}

.emptyText {
  font-size: 32rpx;
  color: #999;
  margin-bottom: 48rpx;
}

.btnBack {
  padding: 16rpx 48rpx;
  font-size: 28rpx;
  color: #fff;
  background-color: #ff6b35;
  border-radius: 48rpx;
}

.cartContent {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.cartList {
  flex: 1;
  padding: 0 0 160rpx 0;
}

.cartItem {
  display: flex;
  padding: 24rpx 32rpx;
  margin-bottom: 16rpx;
  background-color: #fff;
  border-bottom: 1px solid #f5f5f5;
}

.itemImageWrapper {
  width: 120rpx;
  height: 120rpx;
  margin-right: 24rpx;
  flex-shrink: 0;
}

.itemImage {
  width: 100%;
  height: 100%;
  border-radius: 8rpx;
  object-fit: cover;
}

.itemPlaceholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
  border-radius: 8rpx;
  border: 2rpx dashed #d0d0d0;
}

.placeholderIcon {
  font-size: 48rpx;
  opacity: 0.5;
}

.itemInfo {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.itemName {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
}

.itemSku {
  font-size: 24rpx;
  color: #999;
  margin-bottom: 16rpx;
}

.itemFooter {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.itemPrice {
  font-size: 28rpx;
  color: #ff6b35;
  font-weight: bold;
}

.quantityControl {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.btnMinus,
.btnPlus {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  color: #fff;
  background-color: #ff6b35;
  border-radius: 50%;
}

.quantityInput {
  width: 80rpx;
  height: 48rpx;
  text-align: center;
  font-size: 28rpx;
  font-weight: bold;
  border: 1px solid #ddd;
  border-radius: 8rpx;
}

.itemSubtotal {
  width: 120rpx;
  text-align: right;
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  flex-shrink: 0;
}

.cartFooter {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx 32rpx;
  background-color: #fff;
  box-shadow: 0 -2rpx 16rpx rgba(0, 0, 0, 0.1);
}

.footerInfo {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.totalLabel {
  font-size: 28rpx;
  color: #666;
}

.totalAmount {
  font-size: 40rpx;
  font-weight: bold;
  color: #ff6b35;
}

.footerActions {
  display: flex;
  gap: 24rpx;
}

.btnClear {
  flex: 1;
  padding: 16rpx 0;
  text-align: center;
  font-size: 28rpx;
  color: #666;
  background-color: #f5f5f5;
  border-radius: 48rpx;
}

.btnSubmit {
  flex: 2;
  padding: 16rpx 0;
  text-align: center;
  font-size: 28rpx;
  color: #fff;
  background-color: #ff6b35;
  border-radius: 48rpx;
  font-weight: bold;
}
</style>
