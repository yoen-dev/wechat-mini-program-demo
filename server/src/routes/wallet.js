/**
 * 余额 / 储值充值接口  /api/wallet/...
 *
 *   GET  /tiers       充值档位（不用登录）
 *   GET  /recent      首页「某某刚刚充值」提示：最近 48 小时、达到最低金额的真实充值，名字打码（不用登录）
 *   GET  /            我的余额和明细（老板）→ { balance, logs }
 *   POST /recharge    充值（老板） { tierIndex } → { balance } 或 { payParams, rechargeId }（正式支付时前端拿 payParams 调起微信支付）
 *   GET  /recharge/:id  查询充值单状态（前端支付完成后轮询，确认到账）
 *
 * 说明：储值的钱属于预收款，老板用余额下单时才算成交；退款时余额支付的订单退回余额。
 */
const express = require('express')
const db = require('../db')
const settings = require('../services/settings')
const pay = require('../services/pay')
const { markRechargePaid } = require('../services/recharge')
const { need } = require('../middleware/auth')
const { limit } = require('../middleware/rateLimit')
const { wrap, bad, notFound } = require('../utils/errors')
const { maskName, now, r2, toId } = require('../utils/helpers')

const router = express.Router()

router.get('/tiers', wrap(async (req, res) => {
  res.json((await settings.get('recharge')).tiers)
}))

router.get('/recent', wrap(async (req, res) => {
  const cfg = await settings.get('recharge')
  if (!cfg.popup) return res.json([])
  const rows = await db('recharges as r').join('users as u', 'u.id', 'r.user_id')
    .where('r.status', '已支付').where('r.paid_at', '>=', now() - 48 * 3600 * 1000).where('r.pay', '>=', cfg.popupMin || 0)
    .orderBy('r.paid_at', 'desc').limit(10).select('r.id', 'r.pay', 'r.bonus', 'r.paid_at', 'u.name')
  res.json(rows.map((x) => ({ id: x.id, name: maskName(x.name), pay: Number(x.pay), bonus: Number(x.bonus), t: Number(x.paid_at) })))
}))

// 我的余额和明细：充值、余额支付、退回余额 三类记录合在一起按时间倒序
router.get('/', need('user'), wrap(async (req, res) => {
  const uid = req.user.id
  const logs = []
  const rc = await db('recharges').where({ user_id: uid, status: '已支付' }).orderBy('id', 'desc').limit(100)
  rc.forEach((x) => logs.push({
    t: Number(x.paid_at), title: '充值', amount: r2(Number(x.pay) + Number(x.bonus)),
    sub: Number(x.bonus) ? `实付 ¥${Number(x.pay)}，赠送 ¥${Number(x.bonus)}` : `实付 ¥${Number(x.pay)}`
  }))
  const os = await db('orders').where({ user_id: uid, pay_method: 'balance' }).whereNotNull('paid_at').orderBy('id', 'desc').limit(100)
  os.forEach((o) => {
    logs.push({ t: Number(o.paid_at), title: '余额支付', sub: `${o.product_name} #${o.id}`, amount: -Number(o.amount) })
    if (o.status === '已退款') logs.push({ t: Number(o.refunded_at || o.paid_at), title: '退回余额', sub: `${o.product_name} #${o.id}`, amount: Number(o.amount) })
  })
  logs.sort((a, b) => b.t - a.t)
  const u = await db('users').where({ id: uid }).first('balance')
  res.json({ balance: Number(u.balance), logs })
}))

router.post('/recharge', need('user'), limit({ windowSec: 60, max: 10 }), wrap(async (req, res) => {
  const tiers = (await settings.get('recharge')).tiers
  const tier = tiers[Number(req.body.tierIndex)]
  if (!tier) throw bad('请选择充值金额')
  const [id] = await db('recharges').insert({ user_id: req.user.id, pay: tier.pay, bonus: tier.bonus || 0, status: '待支付', created_at: now() })
  const tradeNo = `R${id}T${Date.now()}`
  await db('recharges').where({ id }).update({ trade_no: tradeNo })
  const p = await pay.createPayment({ tradeNo, amount: Number(tier.pay), description: `余额充值 ¥${tier.pay}`, openid: req.user.openid, ip: req.ip })
  if (p.mockPaid) {
    await markRechargePaid(tradeNo) // 模拟模式：直接到账
    const u = await db('users').where({ id: req.user.id }).first('balance')
    return res.json({ balance: Number(u.balance), rechargeId: id })
  }
  res.json({ payParams: p.payParams, rechargeId: id })
}))

router.get('/recharge/:id', need('user'), wrap(async (req, res) => {
  const r = await db('recharges').where({ id: toId(req.params.id), user_id: req.user.id }).first()
  if (!r) throw notFound('充值记录不存在')
  // 还没到账的话主动向微信查一次（回调可能比前端慢几秒）
  if (r.status === '待支付' && r.trade_no) {
    const q = await pay.queryPaid(r.trade_no)
    if (q.paid) await require('./pay').settle(r.trade_no, q.amount)
  }
  const u = await db('users').where({ id: req.user.id }).first('balance')
  res.json({ status: (await db('recharges').where({ id: r.id }).first('status')).status, balance: Number(u.balance) })
}))

module.exports = router
