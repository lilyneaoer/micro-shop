<template>
  <view class="scan-page">
    <view class="loading">
      <text>{{ loadingText }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Taro, { onLoad } from '@tarojs/taro'
import { useSessionStore } from '../../stores/session'
import { post, setSessionToken } from '../../api'

const sessionStore = useSessionStore()
const loadingText = ref('正在加载...')

/**
 * 创建会话
 */
async function createSession(qrToken: string, openId: string) {
  try {
    loadingText.value = '正在创建会话...'
    
    const response = await post<{
      sessionToken: string
      table: {
        id: string
        tableNo: string
        area?: string
        seatCount?: number
      }
    }>('/api/sessions', {
      qr_token: qrToken,
      open_id: openId
    })

    if (response.code === 0 && response.data) {
      // 保存 Session Token 到本地存储
      setSessionToken(response.data.sessionToken)
      
      // 保存会话信息到 Store
      sessionStore.setSession(
        response.data.sessionToken,
        response.data.table,
        openId
      )

      // 跳转到菜单页
      Taro.redirectTo({
        url: '/pages/menu/index'
      })
    } else if (response.code === 5001) {
      // 桌台不可用
      Taro.showModal({
        title: '提示',
        content: response.message || '该桌台不可用，请联系服务员',
        showCancel: false,
        success: () => {
          // 返回上一页或关闭小程序
          Taro.navigateBack({
            fail: () => {
              // 如果没有上一页，则关闭小程序
              // 注意：小程序无法直接关闭，只能提示用户
              loadingText.value = '请重新扫码'
            }
          })
        }
      })
    } else if (response.code === 5002) {
      // Session 过期（理论上不应该在创建时出现，但保留处理）
      Taro.showToast({
        title: response.message || 'Session 已过期，请重新扫码',
        icon: 'none',
        duration: 2000
      })
      setTimeout(() => {
        loadingText.value = '请重新扫码'
      }, 2000)
    } else {
      // 其他错误
      Taro.showToast({
        title: response.message || '创建会话失败',
        icon: 'none',
        duration: 2000
      })
      setTimeout(() => {
        loadingText.value = '创建会话失败，请重试'
      }, 2000)
    }
  } catch (error) {
    console.error('创建会话失败:', error)
    Taro.showToast({
      title: '网络错误，请重试',
      icon: 'none',
      duration: 2000
    })
    loadingText.value = '网络错误，请重试'
  }
}

/**
 * 获取微信 OpenID
 */
async function getWechatOpenId(): Promise<string> {
  try {
    // 获取微信登录凭证
    const loginRes = await Taro.login()
    
    if (!loginRes.code) {
      throw new Error('获取微信登录凭证失败')
    }

    // 在实际项目中，需要将 code 发送到后端，后端调用微信接口获取 OpenID
    // 这里为了演示，使用 code 作为临时 OpenID
    // TODO: 实际项目中需要后端接口支持
    return loginRes.code
  } catch (error) {
    console.error('获取 OpenID 失败:', error)
    throw error
  }
}

/**
 * 页面加载
 */
onLoad(async (options) => {
  console.log('Scan page loaded with options:', options)

  try {
    // 解析二维码参数
    const qrToken = options?.qr_token || options?.scene

    if (!qrToken) {
      Taro.showModal({
        title: '错误',
        content: '无效的二维码，请重新扫码',
        showCancel: false
      })
      loadingText.value = '无效的二维码'
      return
    }

    // 获取 OpenID
    loadingText.value = '正在获取用户信息...'
    const openId = await getWechatOpenId()

    // 创建会话
    await createSession(qrToken, openId)
  } catch (error) {
    console.error('扫码入口处理失败:', error)
    Taro.showToast({
      title: '初始化失败，请重试',
      icon: 'none',
      duration: 2000
    })
    loadingText.value = '初始化失败，请重试'
  }
})
</script>

<style lang="less" scoped>
.scan-page {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background-color: #f5f5f5;
  
  .loading {
    text-align: center;
    font-size: 32rpx;
    color: #666;
  }
}
</style>
