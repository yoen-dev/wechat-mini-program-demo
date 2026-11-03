/**
 * 售后工单 / 护航报名 / 用户管理 / 操作日志
 *
 * 售后工单
 *   POST /api/tickets               老板提交  { orderId?, type, content }
 *   GET  /api/tickets               ?mine=1 老板看自己的；不带 mine 为客服 / 管理员看全部
 *   POST /api/tickets/:id/reply     回复  { text, resolve: true 标记已解决 }（员工回复后变「处理中」；老板追加会把已解决重新打开）
 * 成为护航
 *   POST /api/applications          老板报名  { name, phone, rank, maps, intro }
 *   GET  /api/applications/mine     我最近一次报名
 *   GET  /api/applications          全部报名（客服、管理员）
 *   POST /api/applications/:id/handle  审核  { approve, note } → 通过时自动开通护航账号，返回 { application, account: { account, password } }
 * 用户（老板）管理（客服、管理员）
 *   GET  /api/customers             ?keyword=名字或手机号 → 带下单数、消费额、余额，按消费额排序
 *   POST /api/customers/:id/toggle  拉黑 / 解除  { reason }
 * 操作日志（管理员）
 *   GET  /api/logs
 */
const express = require('express')
const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const db = require('../db')
const { audit } = require('../services/audit')
const { need } = require('../middleware/auth')
const { limit } = require('../middleware/rateLimit')
const { wrap, bad, notFound, conflict } = require('../utils/errors')
const { clean, toId, now, r2, isPhone } = require('../utils/helpers')

const router = express.Router()
const TICKET_TYPES = ['服务质量', '退款问题', '护航态度', '其他']
const isStaff = (u) => !!u && ['cs', 'admin'].includes(u.role)

// ================= 售后工单 =================

// 工单 + 回复 → 前端格式
async function ticketsWithReplies(rows) {
  const ids = rows.map((t) => t.id)
  const replies = ids.length ? await db('ticket_replies').whereIn('ticket_id', ids).orderBy('id') : []
  return rows.map((t) => ({
    id: t.id, userId: t.user_id, userName: t.user_name, orderId: t.order_id, type: t.type, content: t.content, status: t.status, createdAt: Number(t.created_at),
    replies: replies.filter((r) => r.ticket_id === t.id).map((r) => ({ by: r.by_id, name: r.name, role: r.role, text: r.text, t: Number(r.created_at) }))
  }))
}
const ticketQuery = () => db('tickets as t').leftJoin('users as u', 'u.id', 't.user_id').select('t.*', 'u.name as user_name')

router.post('/tickets', need('user'), limit({ windowSec: 600, max: 10 }), wrap(async (req, res) => {
  const content = clean(req.body.content, 1000)
  if (content.length < 5) throw bad('请把问题描述清楚（至少 5 个字）')
  const orderId = toId(req.body.orderId) || null
  if (orderId && !(await db('orders').where({ id: orderId, user_id: req.user.id }).first())) throw bad('订单不存在')
  const [id] = await db('tickets').insert({
    user_id: req.user.id, order_id: orderId, type: TICKET_TYPES.includes(req.body.type) ? req.body.type : '其他', content, status: '待处理', created_at: now()
  })
  res.json((await ticketsWithReplies(await ticketQuery().where('t.id', id)))[0])
}))

router.get('/tickets', need(), wrap(async (req, res) => {
  const q = ticketQuery().orderBy('t.id', 'desc').limit(300)
  if (req.query.mine) q.where('t.user_id', req.user.id)
  else if (!isStaff(req.user)) throw bad('无权限')
  res.json(await ticketsWithReplies(await q))
}))

router.post('/tickets/:id/reply', need(), wrap(async (req, res) => {
  const id = toId(req.params.id)
  const t = await db('tickets').where({ id }).first()
  if (!t || (!isStaff(req.user) && t.user_id !== req.user.id)) throw notFound('工单不存在')
  const text = clean(req.body.text, 1000)
  await db.transaction(async (trx) => {
    if (text) await trx('ticket_replies').insert({ ticket_id: id, by_id: req.user.id, name: req.user.name, role: req.user.role, text, created_at: now() })
    if (isStaff(req.user)) {
      await trx('tickets').where({ id }).update({ status: req.body.resolve ? '已解决' : '处理中' })
      await audit(req.user, req.body.resolve ? '解决工单' : '回复工单', `#${id}`, trx)
    } else if (t.status === '已解决') {
      await trx('tickets').where({ id }).update({ status: '待处理' })
    }
  })
  res.json((await ticketsWithReplies(await ticketQuery().where('t.id', id)))[0])
}))

// ================= 成为护航 =================

const application = (a) => ({
  id: a.id, userId: a.user_id, name: a.name, phone: a.phone, rank: a.rank, maps: a.maps, intro: a.intro, status: a.status,
  note: a.note || '', handler: a.handler || '', account: a.account || '', createdAt: Number(a.created_at), handledAt: a.handled_at ? Number(a.handled_at) : null
})

router.post('/applications', need('user'), limit({ windowSec: 600, max: 5 }), wrap(async (req, res) => {
  const b = req.body
  const name = clean(b.name, 64), phone = clean(b.phone, 20), rank = clean(b.rank, 64)
  if (!name) throw bad('请填写称呼')
  if (!isPhone(phone)) throw bad('请填写正确的手机号')
  if (!rank) throw bad('请填写段位')
  if (await db('applications').where({ user_id: req.user.id, status: '待审核' }).first()) throw bad('你已经提交过了，请等待审核')
  const [id] = await db('applications').insert({ user_id: req.user.id, name, phone, rank, maps: clean(b.maps, 128), intro: clean(b.intro, 500), status: '待审核', created_at: now() })
  res.json(application(await db('applications').where({ id }).first()))
}))

router.get('/applications/mine', need('user'), wrap(async (req, res) => {
  const a = await db('applications').where({ user_id: req.user.id }).orderBy('id', 'desc').first()
  res.json(a ? application(a) : null)
}))

router.get('/applications', need('cs', 'admin'), wrap(async (req, res) => {
  // 待审核的排在最前面
  const list = await db('applications').orderByRaw("status = '待审核' DESC").orderBy('id', 'desc').limit(300)
  res.json(list.map(application))
}))

router.post('/applications/:id/handle', need('cs', 'admin'), wrap(async (req, res) => {
  const id = toId(req.params.id)
  const approve = !!req.body.approve
  let account = null
  await db.transaction(async (trx) => {
    const a = await trx('applications').where({ id }).first()
    const n = a ? await trx('applications').where({ id, status: '待审核' }).update({ status: approve ? '已通过' : '已拒绝', handled_at: now(), handler: req.user.name, note: clean(req.body.note, 200) }) : 0
    if (!n) throw conflict('状态已变化')
    if (approve) {
      // 自动生成账号 hh01、hh02…（跳过已被占用的），密码随机
      let k = Number((await trx('users').where({ role: 'escort' }).count({ c: '*' }))[0].c) + 1
      while (await trx('users').where({ account: 'hh' + String(k).padStart(2, '0') }).first()) k++
      const password = Array.from(crypto.randomBytes(8), (b) => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join('')
      account = { account: 'hh' + String(k).padStart(2, '0'), password }
      await trx('users').insert({
        role: 'escort', name: '护航 ' + a.name, account: account.account, password_hash: await bcrypt.hash(password, 10),
        profile_rank: a.rank, profile_maps: a.maps, profile_intro: a.intro, created_at: now()
      })
      await trx('applications').where({ id }).update({ account: account.account })
    }
    await audit(req.user, approve ? '通过护航报名' : '拒绝护航报名', a.name, trx)
  })
  res.json({ application: application(await db('applications').where({ id }).first()), account })
}))

// ================= 用户管理 =================

router.get('/customers', need('cs', 'admin'), wrap(async (req, res) => {
  const k = clean(req.query.keyword, 30)
  // 每个老板的下单数、消费额（不含已退款）、最近下单时间
  const stats = db('orders').whereNotNull('paid_at').groupBy('user_id').select('user_id')
    .count({ orders: '*' })
    .sum({ spent: db.raw("CASE WHEN status = '已退款' THEN 0 ELSE amount END") })
    .max({ last: 'paid_at' }).as('s')
  const q = db('users as u').leftJoin(stats, 's.user_id', 'u.id').where('u.role', 'user')
    .select('u.id', 'u.name', 'u.phone', 'u.status', 'u.balance', 'u.created_at', 's.orders', 's.spent', 's.last')
    .orderByRaw('COALESCE(s.spent, 0) DESC').limit(300)
  if (k) q.where((w) => w.where('u.name', 'like', `%${k}%`).orWhere('u.phone', 'like', `%${k}%`))
  res.json((await q).map((u) => ({
    id: u.id, name: u.name, phone: u.phone || '', status: u.status, createdAt: Number(u.created_at),
    orders: Number(u.orders || 0), spent: r2(u.spent || 0), balance: Number(u.balance), lastOrderAt: u.last ? Number(u.last) : null
  })))
}))

router.post('/customers/:id/toggle', need('cs', 'admin'), wrap(async (req, res) => {
  const u = await db('users').where({ id: toId(req.params.id), role: 'user' }).first()
  if (!u) throw notFound('用户不存在')
  const status = u.status === 'active' ? 'disabled' : 'active'
  const reason = status === 'disabled' ? clean(req.body.reason, 200) : ''
  await db('users').where({ id: u.id }).update({ status, ban_reason: reason })
  await audit(req.user, status === 'disabled' ? '拉黑用户' : '解除拉黑', u.name + (reason ? `（${reason}）` : ''))
  res.json({ status })
}))

// ================= 操作日志 =================

router.get('/logs', need('admin'), wrap(async (req, res) => {
  const list = await db('audit_logs').orderBy('id', 'desc').limit(500)
  res.json(list.map((l) => ({ id: l.id, t: Number(l.created_at), actorId: l.actor_id, actorName: l.actor_name, role: l.role, action: l.action, target: l.target })))
}))

module.exports = router
