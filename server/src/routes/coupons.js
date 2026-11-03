/**
 * 优惠券接口  /api/coupons/...
 * 流程：管理员建券 → 老板在「我的 → 优惠券」领取 → 下单时选用（支付成功才算用掉）
 *
 * 管理员
 *   GET  /               全部券（含领取数、使用数）
 *   POST /               新建  { name, amount: 减免金额, minSpend: 满多少可用, days: 领取后有效天数 }
 *   POST /:id/toggle     停发 / 恢复发放
 * 老板
 *   GET  /center         领券中心 → { claimable: 可领的券, mine: 我的券（带 state：可使用 / 已使用 / 已过期） }
 *   POST /:id/claim      领取
 *   GET  /usable         下单时可用的券  ?amount=订单金额（按减免从大到小）
 */
const express = require('express')
const db = require('../db')
const { audit } = require('../services/audit')
const { need } = require('../middleware/auth')
const { wrap, bad, notFound } = require('../utils/errors')
const { clean, toId, now } = require('../utils/helpers')

const router = express.Router()
const DAY = 24 * 3600 * 1000

// 数据库行 → 前端格式
const coupon = (c) => ({ id: c.id, name: c.name, amount: Number(c.amount), minSpend: Number(c.min_spend), days: c.days, active: !!c.active, createdAt: Number(c.created_at) })
const userCoupon = (x) => ({
  id: x.id, userId: x.user_id, couponId: x.coupon_id, name: x.name, amount: Number(x.amount), minSpend: Number(x.min_spend),
  expireAt: Number(x.expire_at), usedOrderId: x.used_order_id, createdAt: Number(x.created_at)
})

// ---------------- 管理员 ----------------
router.get('/', need('admin'), wrap(async (req, res) => {
  const list = await db('coupons as c')
    .leftJoin(db('user_coupons').select('coupon_id').count({ claimed: '*' }).sum({ used: db.raw('CASE WHEN used_order_id IS NULL THEN 0 ELSE 1 END') }).groupBy('coupon_id').as('s'), 's.coupon_id', 'c.id')
    .orderBy('c.id', 'desc').select('c.*', 's.claimed', 's.used')
  res.json(list.map((c) => ({ ...coupon(c), claimed: Number(c.claimed || 0), used: Number(c.used || 0) })))
}))

router.post('/', need('admin'), wrap(async (req, res) => {
  const name = clean(req.body.name, 64)
  const amount = Number(req.body.amount), minSpend = Number(req.body.minSpend || 0), days = Number(req.body.days)
  if (!name) throw bad('请填写名称')
  if (!(amount > 0)) throw bad('请填写减免金额')
  if (minSpend && minSpend <= amount) throw bad('使用门槛需大于减免金额')
  if (!(Number.isInteger(days) && days > 0 && days <= 365)) throw bad('请填写有效天数（1-365）')
  const [id] = await db('coupons').insert({ name, amount, min_spend: minSpend, days, active: true, created_at: now() })
  await audit(req.user, '新建优惠券', name)
  res.json(coupon(await db('coupons').where({ id }).first()))
}))

router.post('/:id/toggle', need('admin'), wrap(async (req, res) => {
  const c = await db('coupons').where({ id: toId(req.params.id) }).first()
  if (!c) throw notFound('优惠券不存在')
  await db('coupons').where({ id: c.id }).update({ active: !c.active })
  await audit(req.user, c.active ? '停发优惠券' : '上架优惠券', c.name)
  res.json(coupon({ ...c, active: !c.active }))
}))

// ---------------- 老板 ----------------
router.get('/center', need('user'), wrap(async (req, res) => {
  const mine = await db('user_coupons').where({ user_id: req.user.id }).orderBy('id', 'desc')
  const claimable = await db('coupons').where({ active: true }).whereNotIn('id', mine.map((x) => x.coupon_id).concat([0])).orderBy('id', 'desc')
  const t = now()
  res.json({
    claimable: claimable.map(coupon),
    mine: mine.map((x) => ({ ...userCoupon(x), state: x.used_order_id ? '已使用' : Number(x.expire_at) < t ? '已过期' : '可使用' }))
  })
}))

router.post('/:id/claim', need('user'), wrap(async (req, res) => {
  const c = await db('coupons').where({ id: toId(req.params.id), active: true }).first()
  if (!c) throw bad('优惠券已停发')
  try {
    await db('user_coupons').insert({
      user_id: req.user.id, coupon_id: c.id, name: c.name, amount: c.amount, min_spend: c.min_spend, expire_at: now() + c.days * DAY, created_at: now()
    })
  } catch (e) {
    // 表上有「每人每种券一张」的唯一约束，重复领取会撞到这里
    if (e.code === 'ER_DUP_ENTRY') throw bad('已经领过了')
    throw e
  }
  res.json({ ok: true })
}))

router.get('/usable', need('user'), wrap(async (req, res) => {
  const amount = Number(req.query.amount) || 0
  const list = await db('user_coupons').where({ user_id: req.user.id }).whereNull('used_order_id')
    .where('expire_at', '>', now()).where('min_spend', '<=', amount).orderBy('amount', 'desc')
  res.json(list.map(userCoupon))
}))

module.exports = router
