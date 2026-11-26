/**
 * 系统设置 / 护航收入 / 提现接口
 *
 * 系统设置
 *   GET  /api/settings              读取（老板看不到分成比例，员工能看到全部）
 *   POST /api/settings              修改（管理员），只传要改的部分：
 *                                    { shareRate: 0-1, autoConfirmHours: 0-168, notice, faqs: [{q,a}], agreements: {user, privacy},
 *                                      recharge: { tiers: [{pay, bonus}], popup, popupMin } }
 *   POST /api/settings/reset-faqs   常见问题恢复默认（管理员）
 * 护航收入
 *   GET  /api/income                我的收入（护航）→ { rate, total, month, withdrawn, pending, available, waiting, records, withdrawals }
 *   POST /api/withdrawals           申请提现（护航）{ amount }
 * 提现审批（管理员）
 *   GET  /api/withdrawals           全部提现申请（管理员、负责人）；每条带 canHandle = 当前账号能不能处理
 *   POST /api/withdrawals/:id/handle  { approve, note }
 *     两级审批：待审核 ──管理员初审通过──▶ 待打款 ──负责人线下转账后确认──▶ 已打款
 *               两步都可以驳回 ──▶ 已驳回（钱退回护航的可提现余额）
 *     没有启用中的负责人账号时，管理员也可以做第二步（避免没人能打款）
 */
const express = require('express')
const db = require('../db')
const settings = require('../services/settings')
const { audit } = require('../services/audit')
const { need } = require('../middleware/auth')
const { limit } = require('../middleware/rateLimit')
const { wrap, bad, conflict, forbidden } = require('../utils/errors')
const { clean, toId, now, r2 } = require('../utils/helpers')

const router = express.Router()

// ================= 系统设置 =================

router.get('/settings', wrap(async (req, res) => {
  const s = await settings.getAll()
  if (!req.user || req.user.role === 'user') delete s.shareRate // 分成比例是内部信息，不给老板看
  res.json(s)
}))

router.post('/settings', need('admin'), wrap(async (req, res) => {
  const p = req.body || {}
  const s = await settings.getAll()
  const changed = []
  const updates = {}

  if (p.shareRate !== undefined) {
    const r = Number(p.shareRate)
    if (!(r >= 0 && r <= 1)) throw bad('分成比例需在 0–100% 之间')
    if (r !== s.shareRate) changed.push(`分成比例 ${Math.round(s.shareRate * 100)}% → ${Math.round(r * 100)}%`)
    updates.shareRate = r
  }
  if (p.autoConfirmHours !== undefined) {
    const h = Number(p.autoConfirmHours)
    if (!(h >= 0 && h <= 168)) throw bad('自动确认时长需在 0–168 小时之间')
    if (h !== s.autoConfirmHours) changed.push(`自动确认 ${s.autoConfirmHours}h → ${h}h`)
    updates.autoConfirmHours = h
  }
  if (p.recharge) {
    const rc = { ...s.recharge }
    if (p.recharge.tiers) {
      const tiers = p.recharge.tiers.slice(0, 8).map((t) => ({ pay: r2(t.pay), bonus: r2(t.bonus || 0) })).filter((t) => t.pay > 0)
      if (!tiers.length) throw bad('至少保留一个充值档位')
      if (tiers.some((t) => t.bonus < 0 || t.bonus >= t.pay)) throw bad('赠送金额需小于充值金额')
      rc.tiers = tiers.sort((a, b) => a.pay - b.pay)
    }
    if (p.recharge.popup !== undefined) rc.popup = !!p.recharge.popup
    if (p.recharge.popupMin !== undefined) rc.popupMin = Math.max(0, Number(p.recharge.popupMin) || 0)
    updates.recharge = rc
    changed.push('充值设置')
  }
  if (p.notice !== undefined && clean(p.notice, 200) !== s.notice) { updates.notice = clean(p.notice, 200); changed.push('公告') }
  if (Array.isArray(p.faqs)) {
    updates.faqs = p.faqs.slice(0, 30).map((f) => ({ q: clean(f.q, 100), a: clean(f.a, 2000) })).filter((f) => f.q)
    changed.push('常见问题')
  }
  if (p.agreements) {
    updates.agreements = { ...s.agreements }
    if (p.agreements.user !== undefined) updates.agreements.user = clean(p.agreements.user, 50000)
    if (p.agreements.privacy !== undefined) updates.agreements.privacy = clean(p.agreements.privacy, 50000)
    changed.push('协议')
  }

  await db.transaction(async (trx) => {
    for (const [k, v] of Object.entries(updates)) await settings.set(k, v, trx)
    if (changed.length) await audit(req.user, '修改设置', changed.join('；'), trx)
  })
  res.json(await settings.getAll())
}))

router.post('/settings/reset-faqs', need('admin'), wrap(async (req, res) => {
  await settings.set('faqs', settings.DEFAULTS.faqs)
  await audit(req.user, '修改设置', '常见问题恢复默认')
  res.json(await settings.getAll())
}))

// ================= 护航收入 =================

/**
 * 计算护航收入
 * 总收入 = 已完成订单的分成之和；可提现 = 总收入 − 已打款 − 审核中
 * 待确认 = 已提交完成、等老板确认的单，按当前比例预估（确认后才入账）
 */
async function incomeOf(escortId, trx = db) {
  const rate = Number(await settings.get('shareRate', trx))
  const sum = async (q, col) => Number((await q.sum({ s: col }))[0].s || 0)
  const total = await sum(trx('orders').where({ escort_id: escortId, status: '已完成' }), 'escort_share')
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
  const month = await sum(trx('orders').where({ escort_id: escortId, status: '已完成' }).where('completed_at', '>=', monthStart.getTime()), 'escort_share')
  const withdrawn = await sum(trx('withdrawals').where({ escort_id: escortId, status: '已打款' }), 'amount')
  // 审核中 = 待初审 + 待打款，这部分钱暂时不能再提
  const pending = await sum(trx('withdrawals').where({ escort_id: escortId }).whereIn('status', ['待审核', '待打款']), 'amount')
  const waitingAmount = await sum(trx('orders').where({ escort_id: escortId, status: '待确认' }), 'amount')
  return { rate, total: r2(total), month: r2(month), withdrawn: r2(withdrawn), pending: r2(pending), available: r2(total - withdrawn - pending), waiting: r2(waitingAmount * rate) }
}

const withdrawal = (w, canHandle = false) => ({
  id: w.id, escortId: w.escort_id, escortName: w.escort_name, amount: Number(w.amount), status: w.status, note: w.note || '',
  reviewer: w.reviewer || '', reviewedAt: w.reviewed_at ? Number(w.reviewed_at) : null,
  handler: w.handler || '', createdAt: Number(w.created_at), handledAt: w.handled_at ? Number(w.handled_at) : null, canHandle
})

// 有没有启用中的负责人账号（没有的话第二步由管理员代做）
const hasOwner = async (trx = db) => !!(await trx('users').where({ role: 'owner', status: 'active' }).first('id'))

// 当前账号在这一步能不能处理：待审核 → 管理员；待打款 → 负责人（没有负责人时管理员）
function canHandle(w, u, ownerExists) {
  if (w.status === '待审核') return u.role === 'admin'
  if (w.status === '待打款') return u.role === 'owner' || (u.role === 'admin' && !ownerExists)
  return false
}

router.get('/income', need('escort'), wrap(async (req, res) => {
  const inc = await incomeOf(req.user.id)
  const records = await db('orders').where({ escort_id: req.user.id, status: '已完成' }).orderBy('completed_at', 'desc').limit(50)
  const ws = await db('withdrawals').where({ escort_id: req.user.id }).orderBy('id', 'desc').limit(50)
  res.json({
    ...inc,
    records: records.map((o) => ({ id: o.id, productName: o.product_name, amount: Number(o.amount), share: Number(o.escort_share), t: Number(o.completed_at) })),
    withdrawals: ws.map(withdrawal)
  })
}))

router.post('/withdrawals', need('escort'), limit({ windowSec: 60, max: 5 }), wrap(async (req, res) => {
  const amount = r2(req.body.amount)
  if (!(amount > 0)) throw bad('请输入提现金额')
  await db.transaction(async (trx) => {
    // 锁住这个护航的账号行，防止同时点两次提现导致超额
    await trx('users').where({ id: req.user.id }).forUpdate().first('id')
    const inc = await incomeOf(req.user.id, trx)
    if (amount > inc.available) throw bad(`最多可提现 ¥${inc.available}`)
    await trx('withdrawals').insert({ escort_id: req.user.id, amount, status: '待审核', created_at: now() })
  })
  res.json({ ok: true })
}))

// ================= 提现审批 =================

router.get('/withdrawals', need('admin', 'owner'), wrap(async (req, res) => {
  const list = await db('withdrawals as w').leftJoin('users as u', 'u.id', 'w.escort_id').orderBy('w.id', 'desc').limit(500).select('w.*', 'u.name as escort_name')
  const ownerExists = await hasOwner()
  res.json(list.map((w) => withdrawal(w, canHandle(w, req.user, ownerExists))))
}))

router.post('/withdrawals/:id/handle', need('admin', 'owner'), wrap(async (req, res) => {
  const id = toId(req.params.id)
  const approve = !!req.body.approve
  const note = clean(req.body.note, 200)
  await db.transaction(async (trx) => {
    const w = await trx('withdrawals as w').leftJoin('users as u', 'u.id', 'w.escort_id').where('w.id', id).first('w.*', 'u.name as escort_name')
    if (!w) throw conflict('状态已变化')
    if (!canHandle(w, req.user, await hasOwner(trx))) {
      if (w.status === '待审核') throw forbidden('需要管理员先初审')
      if (w.status === '待打款') throw forbidden('需要负责人确认打款')
      throw conflict('状态已变化')
    }
    let patch
    let action
    if (!approve) {
      patch = { status: '已驳回', handled_at: now(), handler: req.user.name, note }
      action = w.status === '待审核' ? '驳回提现（初审）' : '驳回提现（打款前）'
    } else if (w.status === '待审核') {
      patch = { status: '待打款', reviewed_at: now(), reviewer: req.user.name, note }
      action = '提现初审通过'
    } else {
      patch = { status: '已打款', handled_at: now(), handler: req.user.name, note: note || w.note }
      action = '提现打款'
    }
    // 条件更新：状态没被别人改过才生效（防止两人同时点）
    const n = await trx('withdrawals').where({ id, status: w.status }).update(patch)
    if (!n) throw conflict('状态已变化')
    await audit(req.user, action, `${w.escort_name} ¥${Number(w.amount)}`, trx)
  })
  const w = await db('withdrawals as w').leftJoin('users as u', 'u.id', 'w.escort_id').where('w.id', id).first('w.*', 'u.name as escort_name')
  res.json(withdrawal(w, canHandle(w, req.user, await hasOwner())))
}))

module.exports = router
