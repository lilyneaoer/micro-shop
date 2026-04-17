import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './app.less'

const App = createApp({
  onShow() {
    console.log('App onShow')
  },
})

App.use(createPinia())

export default App
