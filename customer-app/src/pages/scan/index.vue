<template>
  <view class="scan-page">
    <view class="loading">
      <text>{{ loadingText }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Taro, { useLoad, useRouter } from '@tarojs/taro'
import { useSessionStore } from '../../stores/session'
import { post, setSessionToken } from '../../api'

const router = useRouter()
const sessionStore = useSessionStore()
const loadingText = ref('正在加载...')

// 开发模式配置
const DEV_MODE = true // 设置为 false 关闭开发模式
const DEV_TABLE_NO = 'A01' // 开发模式默认桌号
const DEV_QR_TOKEN = '00000000-0000-0000-0000-000000000001' // A01桌台的固定qr_token

/**
 * 开发模式：直接创建会话（不需要二维码）
 */
async function createDevSession(openId: string) {
  try {
    loadingText.value = `正在创建会话（开发模式 - ${DEV_TABLE_NO}号桌）...`
    
    const response = await post<{
      sessionToken: string
      sessionId: string
      tableId: string
      expiresAt: string
    }>('/api/sessions', {
      qrToken: DEV_QR_TOKEN, // 使用固定的qr_token
      openId: openId
    })

    if (response.code === 0 && response.data) {
      // 保存 Session Token 到本地存储
      setSessionToken(response.data.sessionToken)
      
      // 保存会话信息到 Store（使用简化的table对象）
      sessionStore.setSession(
        response.data.sessionToken,
        {
          id: response.data.tableId,
          tableNo: DEV_TABLE_NO, // 使用配置的桌号
          area: undefined,
          seatCount: undefined
        },
        openId
      )

      // 显示提示
      Taro.showToast({
        title: `开发模式：${DEV_TABLE_NO}号桌`,
        icon: 'success',
        duration: 1500
      })

      // 延迟跳转，让用户看到提示
      setTimeout(() => {
        Taro.redirectTo({
          url: '/pages/menu/index'
        })
      }, 1500)
    } else {
      // 错误处理
      Taro.showToast({
        title: response.message || '创建会话失败',
        icon: 'none',
        duration: 2000
      })
      loadingText.value = '创建会话失败，请重试'
    }
  } catch (error) {
    console.error('开发模式创建会话失败:', error)
    Taro.showToast({
      title: '网络错误，请重试',
      icon: 'none',
      duration: 2000
    })
    loadingText.value = '网络错误，请重试'
  }
}

/**
 * 创建会话
 */
async function createSession(qrToken: string, openId: string) {
  try {
    loadingText.value = '正在创建会话...'
    
    const response = await post<{
      sessionToken: string
      sessionId: string
      tableId: string
      expiresAt: string
    }>('/api/sessions', {
      qrToken: qrToken,
      openId: openId
    })

    if (response.code === 0 && response.data) {
      // 保存 Session Token 到本地存储
      setSessionToken(response.data.sessionToken)
      
      // 从qrToken中提取桌号（如果可能）
      // 注意：这是临时方案，理想情况下后端应该返回完整的table信息
      const tableNo = qrToken.includes('table_') 
        ? qrToken.split('table_')[1].split('_')[0] 
        : 'Unknown'
      
      // 保存会话信息到 Store（使用简化的table对象）
      sessionStore.setSession(
        response.data.sessionToken,
        {
          id: response.data.tableId,
          tableNo: tableNo,
          area: undefined,
          seatCount: undefined
        },
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
useLoad(async () => {
  console.log('Scan page loaded with options:', router.params)

  try {
    // 解析二维码参数
    const qrToken = router.params?.qr_token || router.params?.scene

    // 开发模式：如果没有二维码参数，使用默认桌号
    if (!qrToken && DEV_MODE) {
      console.log(`开发模式启用：使用默认 ${DEV_TABLE_NO} 号桌`)
      loadingText.value = `开发模式：${DEV_TABLE_NO}号桌`
      
      // 获取 OpenID
      loadingText.value = '正在获取用户信息...'
      const openId = await getWechatOpenId()

      // 创建开发会话
      await createDevSession(openId)
      return
    }

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
