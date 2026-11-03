// 前端打包配置
// 关键点：@api 这个路径别名决定页面用哪套接口——
//   VITE_API 没设置或为 mock → src/api/mock（数据存在本机，GitHub Pages 网页预览用这个）
//   VITE_API 为 cloud / http  → src/api/remote（请求真实后端）
// VITE_API 写在根目录的 .env.cloud / .env.localapi 文件里，通过 --mode 选择，见 package.json 的 scripts。
import { defineConfig, loadEnv } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  const api = env.VITE_API && env.VITE_API !== 'mock' ? 'remote' : 'mock'
  console.log(`[打包] 接口模式：${env.VITE_API || 'mock'}（src/api/${api}）`)
  return {
    plugins: [uni()],
    resolve: {
      alias: { '@api': path.resolve(__dirname, 'src/api', api) }
    }
  }
})
