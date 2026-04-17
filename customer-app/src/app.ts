import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './app.less'

const App = createApp({
  onShow() {
    console.log('App onShow')
  },
  // 入口组件不需要实现 render 方法，即使实现了也会被 taro 所覆盖
})

// 使用 Pinia
App.use(createPinia())

export default App
