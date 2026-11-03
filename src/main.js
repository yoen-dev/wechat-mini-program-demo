// 前端入口：创建 Vue 应用（uni-app 固定写法，一般不用改）
// 全局样式和启动逻辑在 App.vue；页面列表和底部导航在 pages.json。
import { createSSRApp } from 'vue'
import App from './App.vue'

export function createApp() {
  const app = createSSRApp(App)
  return { app }
}
