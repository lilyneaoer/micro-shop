<template>
  <view :class="$style.searchBar">
    <input
      :value="modelValue"
      :class="$style.searchInput"
      type="text"
      placeholder="搜索菜品"
      @input="handleInput"
    />
  </view>
</template>

<script setup lang="ts">
/**
 * 搜索栏组件
 */

interface Props {
  modelValue: string
}

interface Emits {
  (e: 'update:modelValue', value: string): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

/**
 * 处理输入
 */
function handleInput(event: any) {
  emit('update:modelValue', event.detail.value)
}
</script>

<style lang="less" module>
.searchBar {
  padding: 20rpx 32rpx;
  background-color: #fff;
  border-bottom: 1px solid #eee;
  flex-shrink: 0;
}

.searchInput {
  width: 100%;
  height: 64rpx;
  padding: 0 24rpx;
  background-color: #f5f5f5;
  border-radius: 32rpx;
  font-size: 28rpx;
}
</style>
