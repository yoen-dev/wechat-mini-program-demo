/**
 * 后端启动入口
 * 作用：启动 HTTP 服务，并开启定时任务（超时自动确认订单）。
 * 本地运行：npm run dev（改代码自动重启）；服务器上：用 PM2 运行（见 deploy/ecosystem.config.js）。
 */
const fs = require('fs')
const config = require('./config')
const app = require('./app')
const db = require('./db')
const { startAutoConfirmJob } = require('./jobs/autoConfirm')

// 确保上传目录存在
fs.mkdirSync(config.uploadDir, { recursive: true })

const server = app.listen(config.port, () => {
  console.log(`[启动] 后端已运行：http://localhost:${config.port}  环境：${config.env}`)
  const mocks = [config.wx.mock && '微信登录', config.sms.mock && '短信', config.pay.mock && '支付'].filter(Boolean)
  if (mocks.length) console.log(`[提示] 以下功能处于模拟模式：${mocks.join('、')}（拿到正式资质后在 .env 里关闭）`)
})

const job = startAutoConfirmJob()

// 收到停止信号时（PM2 重启 / Ctrl+C）先停止接新请求，再关闭数据库连接
function shutdown() {
  console.log('[停止] 正在关闭…')
  clearInterval(job)
  server.close(() => db.destroy().then(() => process.exit(0)))
  setTimeout(() => process.exit(0), 5000).unref()
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
