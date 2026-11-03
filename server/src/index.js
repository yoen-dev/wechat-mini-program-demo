/**
 * 后端启动入口
 * 作用：先准备数据库（自动建表、创建管理员），再启动 HTTP 服务，并开启定时任务（超时自动确认订单）。
 * 本地运行：npm run dev（改代码自动重启）；云托管：Dockerfile 里的 CMD 会执行 npm start。
 */
const fs = require('fs')
const config = require('./config')
const app = require('./app')
const db = require('./db')
const { bootstrap } = require('./bootstrap')
const { startAutoConfirmJob } = require('./jobs/autoConfirm')

async function main() {
  fs.mkdirSync(config.uploadDir, { recursive: true }) // 本地开发时的图片上传目录
  await bootstrap()

  const server = app.listen(config.port, () => {
    console.log(`[启动] 后端已运行：http://localhost:${config.port}  环境：${config.env}`)
    const mocks = [config.wx.mock && '微信登录', config.sms.mock && '短信', config.pay.mock && '支付'].filter(Boolean)
    if (mocks.length) console.log(`[提示] 以下功能处于模拟模式：${mocks.join('、')}（拿到正式资质后在环境变量里关闭）`)
  })
  const job = startAutoConfirmJob()

  // 收到停止信号时（重新部署 / Ctrl+C）先停止接新请求，再关闭数据库连接
  const shutdown = () => {
    console.log('[停止] 正在关闭…')
    clearInterval(job)
    server.close(() => db.destroy().then(() => process.exit(0)))
    setTimeout(() => process.exit(0), 5000).unref()
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main().catch((e) => {
  console.error('[启动失败]', e)
  process.exit(1)
})
