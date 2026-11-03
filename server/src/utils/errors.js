/**
 * 错误处理工具
 * 作用：
 *  - AppError：业务错误（例如「余额不足」），会把 message 原样返回给前端提示用户；
 *  - wrap：包住 async 路由函数，出错时自动交给统一的错误处理（middleware/error.js）。
 *
 * 用法：
 *   router.post('/xxx', wrap(async (req, res) => {
 *     if (条件不满足) throw new AppError('提示给用户的话', 400)
 *     res.json(结果)
 *   }))
 */
class AppError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status // HTTP 状态码：400 参数/业务错误，401 未登录，403 无权限，404 不存在，409 状态冲突
  }
}

// 常用的几种错误，写起来短一点
const bad = (msg) => new AppError(msg, 400)
const forbidden = (msg = '无权限') => new AppError(msg, 403)
const notFound = (msg = '不存在') => new AppError(msg, 404)
const conflict = (msg = '状态已变化，请刷新后重试') => new AppError(msg, 409)

// 把 async 函数里的异常转给 Express 的 next()
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

module.exports = { AppError, bad, forbidden, notFound, conflict, wrap }
