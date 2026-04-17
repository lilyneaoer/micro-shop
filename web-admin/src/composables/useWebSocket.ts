import { ref, onUnmounted } from 'vue'
import { io, type Socket } from 'socket.io-client'

/**
 * WebSocket 连接状态
 */
export type WsStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

/**
 * 指数退避重连配置
 */
interface ReconnectConfig {
  /** 初始重连延迟（毫秒），默认 1000ms */
  initialDelay?: number
  /** 最大重连延迟（毫秒），默认 30000ms */
  maxDelay?: number
  /** 退避倍数，默认 2 */
  multiplier?: number
}

/**
 * WebSocket 事件监听器类型
 */
type EventListener<T = unknown> = (data: T) => void

/**
 * useWebSocket — WebSocket 连接管理 Composable
 *
 * 功能：
 * - 建立 socket.io 连接，携带 JWT Token 鉴权
 * - 支持指数退避重连（1s → 2s → 4s → 8s，最大 30s）
 * - 提供连接状态响应式变量
 * - 组件卸载时自动断开连接
 *
 * @param url WebSocket 服务地址，默认连接当前域名
 * @param reconnectConfig 重连配置
 */
export function useWebSocket(
  url: string = '/',
  reconnectConfig: ReconnectConfig = {},
) {
  const {
    initialDelay = 1000,
    maxDelay = 30000,
    multiplier = 2,
  } = reconnectConfig

  // ─── 响应式状态 ──────────────────────────────────────────────────────────

  const status = ref<WsStatus>('disconnected')
  const socket = ref<Socket | null>(null)

  // ─── 内部状态 ────────────────────────────────────────────────────────────

  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let currentDelay = initialDelay
  let manualDisconnect = false

  // 事件监听器注册表，用于重连后重新绑定
  const eventListeners = new Map<string, EventListener[]>()

  // ─── 工具函数 ────────────────────────────────────────────────────────────

  /**
   * 计算下一次重连延迟（指数退避）
   * 序列：1s → 2s → 4s → 8s → 16s → 30s（上限）
   */
  function nextDelay(): number {
    const delay = currentDelay
    currentDelay = Math.min(currentDelay * multiplier, maxDelay)
    return delay
  }

  /** 重置退避延迟至初始值 */
  function resetDelay(): void {
    currentDelay = initialDelay
  }

  /** 清除重连定时器 */
  function clearReconnectTimer(): void {
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  /**
   * 将已注册的事件监听器绑定到 socket 实例
   */
  function bindEventListeners(s: Socket): void {
    for (const [event, listeners] of eventListeners.entries()) {
      for (const listener of listeners) {
        s.on(event, listener)
      }
    }
  }

  // ─── 核心连接逻辑 ────────────────────────────────────────────────────────

  /**
   * 建立 WebSocket 连接
   * 自动从 localStorage 读取 JWT Token 注入到握手参数
   */
  function connect(): void {
    if (socket.value?.connected) return

    manualDisconnect = false
    status.value = 'connecting'

    const token = localStorage.getItem('token')

    const s = io(url, {
      // 禁用 socket.io 内置重连，由本 composable 手动管理
      reconnection: false,
      auth: token ? { token } : undefined,
      transports: ['websocket', 'polling'],
    })

    socket.value = s

    s.on('connect', () => {
      status.value = 'connected'
      resetDelay()
      clearReconnectTimer()
      console.log('===========Connected to WebSocket============');
    })

    s.on('disconnect', (reason) => {
      status.value = 'disconnected'

      // 主动断开时不重连
      if (manualDisconnect) return

      // 服务端主动断开（如 Token 失效），不重连
      if (reason === 'io server disconnect') return

      scheduleReconnect()
    })

    s.on('connect_error', () => {
      status.value = 'error'

      if (manualDisconnect) return

      scheduleReconnect()
    })

    // 重新绑定已注册的业务事件
    bindEventListeners(s)
  }

  /**
   * 安排下一次重连（指数退避）
   */
  function scheduleReconnect(): void {
    clearReconnectTimer()

    const delay = nextDelay()

    reconnectTimer = setTimeout(() => {
      if (!manualDisconnect) {
        // 销毁旧 socket 再重建
        socket.value?.removeAllListeners()
        socket.value?.disconnect()
        socket.value = null
        connect()
      }
    }, delay)
  }

  /**
   * 主动断开连接，停止重连
   */
  function disconnect(): void {
    manualDisconnect = true
    clearReconnectTimer()

    if (socket.value) {
      socket.value.removeAllListeners()
      socket.value.disconnect()
      socket.value = null
    }

    status.value = 'disconnected'
  }

  // ─── 事件订阅 API ────────────────────────────────────────────────────────

  /**
   * 监听 WebSocket 事件
   * 重连后会自动重新绑定
   *
   * @param event 事件名称
   * @param listener 事件处理函数
   */
  function on<T = unknown>(event: string, listener: EventListener<T>): void {
    // 注册到监听器表
    if (!eventListeners.has(event)) {
      eventListeners.set(event, [])
    }
    eventListeners.get(event)!.push(listener as EventListener)

    // 若当前已连接，立即绑定
    if (socket.value) {
      socket.value.on(event, listener)
    }
  }

  /**
   * 取消监听 WebSocket 事件
   *
   * @param event 事件名称
   * @param listener 要移除的处理函数（不传则移除该事件所有监听器）
   */
  function off<T = unknown>(event: string, listener?: EventListener<T>): void {
    if (listener) {
      const listeners = eventListeners.get(event)
      if (listeners) {
        const idx = listeners.indexOf(listener as EventListener)
        if (idx !== -1) listeners.splice(idx, 1)
      }
      socket.value?.off(event, listener)
    } else {
      eventListeners.delete(event)
      socket.value?.off(event)
    }
  }

  /**
   * 向服务端发送事件
   *
   * @param event 事件名称
   * @param data 事件数据
   */
  function emit<T = unknown>(event: string, data?: T): void {
    if (socket.value?.connected) {
      socket.value.emit(event, data)
    }
  }

  // ─── 生命周期 ────────────────────────────────────────────────────────────

  // 组件卸载时自动断开，防止内存泄漏
  onUnmounted(() => {
    disconnect()
  })

  return {
    /** 当前连接状态 */
    status,
    /** socket.io 实例（只读，通常不需要直接操作） */
    socket,
    /** 建立连接 */
    connect,
    /** 断开连接 */
    disconnect,
    /** 监听事件 */
    on,
    /** 取消监听 */
    off,
    /** 发送事件 */
    emit,
  }
}
