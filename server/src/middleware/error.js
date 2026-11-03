/**
 * 统一错误处理
 * 作用：所有接口出错最后都到这里，统一返回 { message: '错误说明' } 给前端。
 *  - 业务错误（AppError）：原样返回提示，比如「余额不足」；
 *  - 程序 bug / 数据库异常：前端只看到「服务器开小差了」，详细错误打印在服务器日志里，方便排查。
 */
const config = require('../config')

// 找不到接口
function notFound(req, res) {
  res.status(404).json({ message: `接口不存在：${req.method} ${req.path}` })
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err && err.status && err.status < 500) return res.status(err.status).json({ message: err.message })
  // 上传文件超过大小限制
  if (err && err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ message: `图片不能超过 ${config.uploadMaxMb}MB` })
  // 请求体不是合法 JSON
  if (err && err.type === 'entity.parse.failed') return res.status(400).json({ message: '请求格式错误' })
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}\n`, err)
  res.status(500).json({ message: config.isProd ? '服务器开小差了，请稍后再试' : String(err && err.message) })
}

module.exports = { notFound, errorHandler }
