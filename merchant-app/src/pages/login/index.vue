<template>
  <view class="login-container">
    <view class="login-card">
      <view class="login-title">商家接单系统</view>

      <!-- 登录错误提示 -->
      <view v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </view>

      <view class="form">
        <view class="form-item">
          <view class="label">用户名</view>
          <input
            v-model="form.username"
            class="input"
            type="text"
            placeholder="请输入用户名"
            :disabled="loading"
          />
        </view>

        <view class="form-item">
          <view class="label">密码</view>
          <input
            v-model="form.password"
            class="input"
            type="password"
            placeholder="请输入密码"
            :disabled="loading"
          />
        </view>

        <button
          class="login-button"
          :disabled="loading"
          @tap="handleLogin"
        >
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import Taro from '@tarojs/taro'
import { useAuthStore } from '@/stores/auth'
import { ApiError } from '@/api'

const authStore = useAuthStore()

const loading = ref(false)
const errorMessage = ref('')

const form = reactive({
  username: '',
  password: '',
})

async function handleLogin() {
  // 清除上次的错误信息
  errorMessage.value = ''

  // 表单验证
  if (!form.username.trim()) {
    errorMessage.value = '请输入用户名'
    return
  }
  if (!form.password.trim()) {
    errorMessage.value = '请输入密码'
    return
  }

  loading.value = true
  try {
    await authStore.login({
      username: form.username.trim(),
      password: form.password.trim(),
    })

    // 登录成功后跳转订单列表
    Taro.showToast({
      title: '登录成功',
      icon: 'success',
      duration: 1500,
    })

    setTimeout(() => {
      Taro.redirectTo({ url: '/pages/order-list/index' })
    }, 1500)
  } catch (error: unknown) {
    if (error instanceof ApiError) {
      // 根据后端错误码显示具体提示
      switch (error.code) {
        case 2001:
          errorMessage.value = '账号已被锁定，请 30 分钟后再试'
          break
        case 2002:
          errorMessage.value = '用户名或密码错误，请重新输入'
          break
        default:
          errorMessage.value = error.message || '登录失败，请重试'
      }
    } else if (error instanceof Error) {
      errorMessage.value = error.message || '登录失败，请重试'
    } else {
      errorMessage.value = '登录失败，请重试'
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="less">
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
  padding: 40px;
}

.login-card {
  width: 100%;
  max-width: 600px;
  background-color: #fff;
  border-radius: 16px;
  padding: 60px 40px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.login-title {
  font-size: 44px;
  font-weight: 600;
  text-align: center;
  margin-bottom: 60px;
  color: #333;
}

.error-message {
  background-color: #fef0f0;
  color: #f56c6c;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 30px;
  font-size: 28px;
  text-align: center;
}

.form {
  .form-item {
    margin-bottom: 40px;

    .label {
      font-size: 28px;
      color: #606266;
      margin-bottom: 16px;
    }

    .input {
      width: 100%;
      height: 88px;
      padding: 0 24px;
      font-size: 32px;
      border: 2px solid #dcdfe6;
      border-radius: 8px;
      box-sizing: border-box;

      &:focus {
        border-color: #409eff;
      }

      &:disabled {
        background-color: #f5f7fa;
        color: #c0c4cc;
      }
    }
  }

  .login-button {
    width: 100%;
    height: 88px;
    line-height: 88px;
    background-color: #409eff;
    color: #fff;
    font-size: 32px;
    border-radius: 8px;
    border: none;
    margin-top: 20px;

    &:disabled {
      background-color: #a0cfff;
    }
  }
}
</style>
