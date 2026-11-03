/**
 * 登录相关接口  /api/auth/...
 *
 *   POST /wx          微信登录（老板）       { code, nickname }        → { token, user, needPhone }
 *   POST /sms         发短信验证码            { phone }                 → { ok, demoCode? }（只有模拟模式会返回 demoCode）
 *   POST /phone       手机号 + 验证码登录     { phone, code }           → { token, user }
 *   POST /bind-phone  微信用户绑定手机号      { phone, code }           → { user }
 *   POST /login       员工账号密码登录        { account, password }     → { token, user }
 *   POST /password    修改密码（员工）        { oldPassword, newPassword } → { token }（返回新令牌，其他设备上的登录失效）
 *   GET  /me          当前登录用户信息                                   → user
 *
 * 老板账号：微信登录或手机号登录时自动注册；员工账号：只能由管理员在后台创建。
 */
const express = require('express')
const bcrypt = require('bcryptjs')
const db = require('../db')
const config = require('../config')
const serialize = require('../services/serialize')
const wechat = require('../services/wechat')
const sms = require('../services/sms')
const { signToken, need } = require('../middleware/auth')
const { limit } = require('../middleware/rateLimit')
const { wrap, bad, AppError } = require('../utils/errors')
const { clean, now } = require('../utils/helpers')

const router = express.Router()

// 登录成功统一返回：令牌 + 用户信息
const loginResult = (u, extra = {}) => ({ token: signToken(u), user: serialize.user(u), ...extra })

// 被停用的账号不能登录
function checkActive(u) {
  if (u.status !== 'active') throw new AppError(u.role === 'user' ? '账号已被停用，请联系客服' : '账号已停用，请联系管理员', 403)
}

// ---------------- 微信登录 ----------------
router.post('/wx', limit({ windowSec: 600, max: 30 }), wrap(async (req, res) => {
  const openid = await wechat.getOpenid(req, clean(req.body.code, 128))
  let u = await db('users').where({ openid }).first()
  if (!u) {
    // 第一次登录：自动注册成老板
    const [id] = await db('users').insert({ role: 'user', name: clean(req.body.nickname, 32) || '微信用户', openid, created_at: now(), last_active_at: now() })
    u = await db('users').where({ id }).first()
  }
  if (u.role !== 'user') throw bad('该微信未注册为老板账号')
  checkActive(u)
  await db('users').where({ id: u.id }).update({ last_active_at: now() })
  res.json(loginResult(u, { needPhone: !u.phone }))
}))

// ---------------- 短信验证码 ----------------
router.post('/sms', limit({ windowSec: 600, max: 10 }), wrap(async (req, res) => {
  const r = await sms.sendCode(clean(req.body.phone, 20), req.ip)
  res.json({ ok: true, demoCode: r.mock ? config.sms.mockCode : undefined })
}))

// ---------------- 手机号登录（没注册过自动注册） ----------------
router.post('/phone', limit({ windowSec: 600, max: 20 }), wrap(async (req, res) => {
  const phone = clean(req.body.phone, 20)
  await sms.verifyCode(phone, clean(req.body.code, 8))
  let u = await db('users').where({ phone }).first()
  if (!u) {
    const [id] = await db('users').insert({ role: 'user', name: '用户' + phone.slice(-4), phone, created_at: now(), last_active_at: now() })
    u = await db('users').where({ id }).first()
  }
  if (u.role !== 'user') throw bad('该手机号属于员工账号，请使用账号密码登录')
  checkActive(u)
  await db('users').where({ id: u.id }).update({ last_active_at: now() })
  res.json(loginResult(u))
}))

// ---------------- 微信用户绑定手机号 ----------------
router.post('/bind-phone', need('user'), limit({ windowSec: 600, max: 20 }), wrap(async (req, res) => {
  const phone = clean(req.body.phone, 20)
  await sms.verifyCode(phone, clean(req.body.code, 8))
  const other = await db('users').where({ phone }).whereNot({ id: req.user.id }).first()
  if (other) throw bad('该手机号已绑定其他账号，请联系客服处理')
  await db('users').where({ id: req.user.id }).update({ phone })
  res.json({ user: serialize.user(await db('users').where({ id: req.user.id }).first()) })
}))

// ---------------- 员工账号密码登录 ----------------
router.post('/login', limit({ windowSec: 600, max: 20 }), wrap(async (req, res) => {
  const account = clean(req.body.account, 32)
  const password = String(req.body.password || '')
  const u = account ? await db('users').where({ account }).whereNot({ role: 'user' }).first() : null
  // 账号不存在和密码错误给同样的提示，不让别人试出哪些账号存在
  if (!u || !u.password_hash || !(await bcrypt.compare(password, u.password_hash))) throw bad('账号或密码错误')
  checkActive(u)
  await db('users').where({ id: u.id }).update({ last_active_at: now() })
  res.json(loginResult(u))
}))

// ---------------- 修改密码 ----------------
router.post('/password', need(), limit({ windowSec: 600, max: 10 }), wrap(async (req, res) => {
  const { oldPassword, newPassword } = req.body
  if (!req.user.password_hash || !(await bcrypt.compare(String(oldPassword || ''), req.user.password_hash))) throw bad('原密码错误')
  if (!newPassword || String(newPassword).length < 6) throw bad('新密码至少 6 位')
  // token_version +1：其他设备上的旧登录全部失效
  await db('users').where({ id: req.user.id }).update({ password_hash: await bcrypt.hash(String(newPassword), 10), token_version: db.raw('token_version + 1') })
  res.json({ ok: true, token: signToken(await db('users').where({ id: req.user.id }).first()) })
}))

// ---------------- 当前用户 ----------------
router.get('/me', need(), (req, res) => res.json(serialize.user(req.user)))

module.exports = router
