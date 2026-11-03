/**
 * 员工账号 / 护航资料接口
 *
 * 护航列表（老板选护航、客服派单用）
 *   GET  /api/escorts               ?onlineOnly=1   → 每个护航带 在线、手上单数 load、完成单数 done、评分 rating
 *   GET  /api/escorts/:id           护航主页（含评价列表）
 * 护航自己
 *   POST /api/escorts/me/online     切换接单状态  { online: true|false }
 *   POST /api/escorts/me/profile    编辑资料  { rank, maps, intro }
 * 员工账号管理
 *   GET  /api/staff                 员工列表（客服、管理员）  ?role=escort|cs|admin|owner
 *   POST /api/staff                 新建员工账号（管理员）  { role, name, account, password, profile? }
 *   POST /api/staff/:id/reset-password  重置密码（管理员）→ 返回随机生成的新密码
 *   POST /api/staff/:id/toggle      停用 / 启用（管理员）
 */
const express = require('express')
const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const db = require('../db')
const serialize = require('../services/serialize')
const { audit } = require('../services/audit')
const { need } = require('../middleware/auth')
const { wrap, bad, notFound } = require('../utils/errors')
const { clean, toId, now } = require('../utils/helpers')

const router = express.Router()
const ROLE_NAME = { user: '老板', escort: '护航', cs: '客服', admin: '管理员', owner: '负责人' }
const STAFF_ROLES = ['escort', 'cs', 'admin', 'owner']

// 随机初始密码：8 位，去掉了容易看错的 0/O、1/l
const randomPassword = () => Array.from(crypto.randomBytes(8), (b) => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join('')

// 护航的统计：手上单数、完成单数、平均评分
async function escortStats(ids) {
  if (!ids.length) return {}
  const rows = await db('orders').whereIn('escort_id', ids).groupBy('escort_id').select('escort_id')
    .sum({ load: db.raw("CASE WHEN status IN ('已接单','进行中','待确认') THEN 1 ELSE 0 END") })
    .sum({ done: db.raw("CASE WHEN status = '已完成' THEN 1 ELSE 0 END") })
    .avg({ rating: 'rating_score' }).count({ ratingCount: 'rating_score' })
  const out = {}
  rows.forEach((r) => {
    out[r.escort_id] = { load: Number(r.load || 0), done: Number(r.done || 0), rating: r.rating ? Math.round(Number(r.rating) * 10) / 10 : null, ratingCount: Number(r.ratingCount || 0) }
  })
  return out
}
const emptyStats = { load: 0, done: 0, rating: null, ratingCount: 0 }

// ---------------- 护航列表 / 主页 ----------------
router.get('/escorts', wrap(async (req, res) => {
  const q = db('users').where({ role: 'escort', status: 'active' })
  if (req.query.onlineOnly && req.query.onlineOnly !== '0') q.where({ online: true })
  const list = await q
  const stats = await escortStats(list.map((u) => u.id))
  res.json(list.map((u) => ({ id: u.id, name: u.name, online: !!u.online, profile: serialize.user(u).profile, ...(stats[u.id] || emptyStats) }))
    .sort((a, b) => (b.online - a.online) || (a.load - b.load)))
}))

router.get('/escorts/:id', wrap(async (req, res) => {
  const u = await db('users').where({ id: toId(req.params.id), role: 'escort' }).first()
  if (!u) throw notFound('护航不存在')
  const stats = (await escortStats([u.id]))[u.id] || emptyStats
  const reviews = await db('orders').where({ escort_id: u.id }).whereNotNull('rating_score').orderBy('rated_at', 'desc').limit(50)
  const pub = serialize.user(u)
  delete pub.phone; delete pub.account // 老板能看护航主页，不暴露账号和手机号
  res.json({ ...pub, ...stats, reviews: reviews.map((o) => ({ orderId: o.id, productName: o.product_name, score: o.rating_score, text: o.rating_text || '', t: Number(o.rated_at) })) })
}))

// ---------------- 护航自己 ----------------
router.post('/escorts/me/online', need('escort'), wrap(async (req, res) => {
  const online = !!req.body.online
  await db('users').where({ id: req.user.id }).update({ online })
  res.json({ online })
}))

router.post('/escorts/me/profile', need('escort'), wrap(async (req, res) => {
  const p = { profile_rank: clean(req.body.rank, 64), profile_maps: clean(req.body.maps, 128), profile_intro: clean(req.body.intro, 500) }
  await db('users').where({ id: req.user.id }).update(p)
  res.json({ rank: p.profile_rank, maps: p.profile_maps, intro: p.profile_intro })
}))

// ---------------- 员工账号管理 ----------------
router.get('/staff', need('cs', 'admin'), wrap(async (req, res) => {
  const q = db('users').whereIn('role', STAFF_ROLES).orderBy('id')
  if (STAFF_ROLES.includes(req.query.role)) q.where({ role: req.query.role })
  res.json((await q).map(serialize.user))
}))

router.post('/staff', need('admin'), wrap(async (req, res) => {
  const { role, password } = req.body
  const name = clean(req.body.name, 64)
  const account = clean(req.body.account, 32)
  if (!STAFF_ROLES.includes(role)) throw bad('请选择角色')
  if (!name) throw bad('请填写名字')
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(account)) throw bad('账号为 3-20 位字母、数字或下划线')
  if (!password || String(password).length < 6) throw bad('初始密码至少 6 位')
  if (await db('users').where({ account }).first()) throw bad('账号已存在')
  const p = req.body.profile || {}
  const [id] = await db('users').insert({
    role, name, account, password_hash: await bcrypt.hash(String(password), 10), created_at: now(),
    profile_rank: clean(p.rank, 64), profile_maps: clean(p.maps, 128), profile_intro: clean(p.intro, 500)
  })
  await audit(req.user, '新建员工账号', `${ROLE_NAME[role]} ${name}（${account}）`)
  res.json(serialize.user(await db('users').where({ id }).first()))
}))

router.post('/staff/:id/reset-password', need('admin'), wrap(async (req, res) => {
  const u = await db('users').where({ id: toId(req.params.id) }).whereIn('role', STAFF_ROLES).first()
  if (!u) throw notFound('账号不存在')
  const password = randomPassword()
  // token_version +1：对方已登录的设备需要用新密码重新登录
  await db('users').where({ id: u.id }).update({ password_hash: await bcrypt.hash(password, 10), token_version: db.raw('token_version + 1') })
  await audit(req.user, '重置密码', u.name)
  res.json({ ok: true, password })
}))

router.post('/staff/:id/toggle', need('admin'), wrap(async (req, res) => {
  const id = toId(req.params.id)
  if (id === req.user.id) throw bad('不能停用自己')
  const u = await db('users').where({ id }).whereIn('role', STAFF_ROLES).first()
  if (!u) throw notFound('账号不存在')
  const status = u.status === 'active' ? 'disabled' : 'active'
  await db('users').where({ id }).update({ status, online: status === 'active' ? u.online : false })
  await audit(req.user, status === 'active' ? '启用账号' : '停用账号', u.name)
  res.json(serialize.user(await db('users').where({ id }).first()))
}))

module.exports = router
