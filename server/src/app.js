/**
 * Express 应用组装
 * 作用：把中间件（安全头、跨域、登录解析）和所有接口路由拼成一个完整的后端应用。
 * 本文件只「组装」，不启动监听；启动在 src/index.js（这样测试时可以直接拿 app 来测）。
 *
 * 请求进来的顺序：
 *   安全头 helmet → 跨域 cors → 支付回调（要原始请求体，所以放在 JSON 解析之前）
 *   → JSON 解析 → 登录解析 auth → /api/xxx 各路由 → 404 → 统一错误处理
 */
const express = require('express')
const helmet = require('helmet')
const cors = require('cors')
const config = require('./config')
const { auth } = require('./middleware/auth')
const { notFound, errorHandler } = require('./middleware/error')

const app = express()

// 部署在 Nginx 后面时，信任 Nginx 传来的真实 IP（频率限制按 IP 计数要用）
app.set('trust proxy', 1)
app.disable('x-powered-by')

// 安全相关的响应头；允许图片被小程序 / 网页跨域显示
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))

// 跨域：小程序本身不受跨域限制；网页版（H5）需要把网页的域名加到 .env 的 CORS_ORIGINS
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || !config.corsOrigins.length || config.corsOrigins.includes(origin)),
  credentials: false
}))

// 微信支付回调：必须拿到原始请求体才能验签，所以单独挂在 JSON 解析之前
app.use('/api/pay', require('./routes/pay').router)

// 解析 JSON 请求体，限制 1MB（图片走上传接口，不走 JSON）
app.use(express.json({ limit: '1mb' }))

// 解析登录令牌，后面的路由通过 req.user 拿到当前用户
app.use(auth)

// 健康检查：部署后访问 https://你的域名/api/health 看到 ok 就说明后端在运行
app.get('/api/health', (req, res) => res.json({ ok: true, env: config.env, time: Date.now() }))

// ---------------- 业务接口 ----------------
app.use('/api/auth', require('./routes/auth')) // 登录、验证码、改密码
app.use('/api/products', require('./routes/products')) // 单子（商品）
app.use('/api/banners', require('./routes/banners')) // 首页轮播图
app.use('/api/orders', require('./routes/orders')) // 订单、订单沟通
app.use('/api/wallet', require('./routes/wallet')) // 余额、储值充值
app.use('/api/coupons', require('./routes/coupons')) // 优惠券
app.use('/api', require('./routes/staff')) // 员工账号、护航列表与资料（/api/staff、/api/escorts）
app.use('/api', require('./routes/finance')) // 系统设置、护航收入、提现（/api/settings、/api/income、/api/withdrawals）
app.use('/api', require('./routes/service')) // 售后工单、护航报名、用户管理、操作日志、待办数
app.use('/api/analytics', require('./routes/analytics')) // 经营数据
app.use('/api/upload', require('./routes/upload')) // 图片上传

// 上传的图片通过 /uploads/文件名 访问（正式环境建议让 Nginx 直接提供，见 deploy/nginx.conf）
app.use('/uploads', express.static(config.uploadDir, { maxAge: '30d', index: false }))

app.use(notFound)
app.use(errorHandler)

module.exports = app
