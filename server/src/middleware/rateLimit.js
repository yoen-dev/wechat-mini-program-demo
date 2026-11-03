/**
 * 简单的频率限制
 * 作用：防止有人刷短信验证码、暴力猜密码。按「IP + 接口」计数，超过次数返回 429。
 * 说明：计数存在内存里，只适合单台服务器；以后多台服务器时改用 Redis。
 *
 * 用法：router.post('/sms', limit({ windowSec: 600, max: 10 }), handler)  10 分钟内最多 10 次
 */
const { AppError } = require('../utils/errors')

const buckets = new Map()

function limit({ windowSec = 60, max = 20, key = '' } = {}) {
  return (req, res, next) => {
    const k = `${key || req.baseUrl + req.path}|${req.ip}`
    const t = Date.now()
    const b = buckets.get(k)
    if (!b || t - b.start > windowSec * 1000) {
      buckets.set(k, { start: t, count: 1 })
      return next()
    }
    b.count++
    if (b.count > max) return next(new AppError('操作太频繁，请稍后再试', 429))
    next()
  }
}

// 每 10 分钟清理一次过期的计数，避免内存一直增长
setInterval(() => {
  const t = Date.now()
  for (const [k, b] of buckets) if (t - b.start > 3600 * 1000) buckets.delete(k)
}, 600 * 1000).unref()

module.exports = { limit }
