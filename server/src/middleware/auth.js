/**
 * 登录校验与权限控制
 * 作用：
 *  - signToken：登录成功后生成令牌（JWT），前端存起来，之后每次请求放在请求头 Authorization: Bearer xxx；
 *  - auth：解析令牌，把当前用户放到 req.user（未登录时 req.user 为 null，不报错）；
 *  - need(...roles)：要求登录且身份在指定范围内，否则返回 401 / 403。
 *
 * 用法：
 *   router.get('/mine', need('user'), handler)            只有老板能访问
 *   router.post('/dispatch', need('cs', 'admin'), handler) 客服和管理员能访问
 *   router.get('/products', handler)                      不登录也能访问（req.user 可能为 null）
 */
const jwt = require('jsonwebtoken')
const config = require('../config')
const db = require('../db')
const { AppError } = require('../utils/errors')

// 生成令牌。tv = token_version，改密码 / 停用账号时数据库里 +1，旧令牌立即失效
function signToken(u) {
  return jwt.sign({ uid: u.id, tv: u.token_version || 0 }, config.jwtSecret, { expiresIn: `${config.jwtDays}d` })
}

// 每个请求都会经过：有令牌就解析出用户，没有就当作游客
async function auth(req, res, next) {
  req.user = null
  const h = req.headers.authorization || ''
  const token = h.startsWith('Bearer ') ? h.slice(7) : ''
  if (!token) return next()
  try {
    const p = jwt.verify(token, config.jwtSecret)
    const u = await db('users').where({ id: p.uid }).first()
    // 用户不存在、被停用、或令牌版本过期（改过密码）都视为未登录
    if (u && u.status === 'active' && (u.token_version || 0) === p.tv) req.user = u
    else if (u && u.status !== 'active') req.blocked = u.role === 'user' ? '账号已被停用，请联系客服' : '账号已停用，请联系管理员'
  } catch (e) {
    // 令牌过期或伪造：当作未登录
  }
  next()
}

// 要求登录，且身份必须是 roles 之一（不传 roles 表示只要登录即可）
function need(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new AppError(req.blocked || '请先登录', 401))
    if (roles.length && !roles.includes(req.user.role)) return next(new AppError('无权限', 403))
    next()
  }
}

module.exports = { signToken, auth, need }
