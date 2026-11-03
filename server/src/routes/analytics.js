/**
 * 经营数据（负责人、管理员）  GET /api/analytics?days=1|7|30|90
 *
 * 金额口径：
 *   成交额 gmv = 时间段内已支付订单金额
 *   退款 refund = 其中已退款的金额
 *   实收 net = 成交额 − 退款
 *   护航分成 share = 其中已完成订单的护航分成
 *   毛利 profit = 实收 − 护航分成
 *   储值：充值的钱是预收款，老板用余额下单时才算成交（避免重复计算）
 *
 * 实现方式：把时间段（和上一个同样长度的时间段，用来算环比）的订单读出来在内存里统计。
 * 订单量每天几百单以内完全够用；以后数据很大时可以改成 SQL 汇总或每天预先算好存一张统计表。
 */
const express = require('express')
const db = require('../db')
const { need } = require('../middleware/auth')
const { wrap } = require('../utils/errors')
const { r2 } = require('../utils/helpers')

const router = express.Router()
const DAY = 24 * 3600 * 1000
const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0)
const change = (a, b) => (b ? Math.round(((a - b) / b) * 1000) / 10 : null)
// 日期标签，按北京时间（容器里设置了 TZ=Asia/Shanghai）
const dayKey = (t) => { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()}` }

// 一组订单的金额汇总
function money(list) {
  const gmv = list.reduce((s, o) => s + o.amount, 0)
  const refund = list.filter((o) => o.status === '已退款').reduce((s, o) => s + o.amount, 0)
  const share = list.filter((o) => o.status === '已完成').reduce((s, o) => s + (o.share || 0), 0)
  return { gmv: r2(gmv), refund: r2(refund), net: r2(gmv - refund), share: r2(share), profit: r2(gmv - refund - share), orders: list.length }
}

router.get('/', need('owner', 'admin'), wrap(async (req, res) => {
  const days = [1, 7, 30, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 7
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const start = today.getTime() - (days - 1) * DAY
  const end = Date.now()
  const prevStart = start - days * DAY
  const inRange = (t, s = start, e = end) => t && t >= s && t <= e

  // 读取两个时间段内已支付的订单
  const rows = await db('orders').where('paid_at', '>=', prevStart)
    .select('id', 'user_id', 'escort_id', 'product_name', 'amount', 'escort_share', 'status', 'mode', 'pay_method', 'paid_at', 'dispatched_at', 'refunded_by')
  const all = rows.map((o) => ({
    userId: o.user_id, escortId: o.escort_id, productName: o.product_name, amount: Number(o.amount), share: Number(o.escort_share || 0),
    status: o.status, mode: o.mode, payMethod: o.pay_method, paidAt: Number(o.paid_at), dispatchedAt: o.dispatched_at ? Number(o.dispatched_at) : null, refundedBy: o.refunded_by
  }))
  const paid = all.filter((o) => inRange(o.paidAt))
  const cur = money(paid)
  const prev = money(all.filter((o) => inRange(o.paidAt, prevStart, start - 1)))

  // 每日趋势
  const trend = []
  for (let i = 0; i < days; i++) {
    const s = start + i * DAY
    const l = paid.filter((o) => o.paidAt >= s && o.paidAt < s + DAY)
    trend.push({ label: dayKey(s), net: money(l).net, orders: l.length })
  }

  // 用户
  const customers = await db('users').where({ role: 'user' }).select('id', 'name', 'created_at', 'last_active_at', 'balance')
  const nameOf = {}
  customers.forEach((u) => { nameOf[u.id] = u.name })
  const buyers = {}
  paid.filter((o) => o.status !== '已退款').forEach((o) => {
    const b = (buyers[o.userId] = buyers[o.userId] || { id: o.userId, orders: 0, spent: 0, last: 0 })
    b.orders++
    b.spent += o.amount
    b.last = Math.max(b.last, o.paidAt)
  })
  const buyerList = Object.values(buyers)
  const validOrders = paid.filter((o) => o.status !== '已退款').length
  const users = {
    total: customers.length,
    newUsers: customers.filter((u) => inRange(Number(u.created_at))).length,
    active: customers.filter((u) => inRange(Number(u.last_active_at)) || buyers[u.id]).length,
    buyers: buyerList.length,
    repeatRate: pct(buyerList.filter((b) => b.orders >= 2).length, buyerList.length),
    avgOrder: buyerList.length ? r2(cur.net / Math.max(1, validOrders)) : 0,
    arpu: buyerList.length ? r2(cur.net / buyerList.length) : 0
  }
  const topSpenders = buyerList.sort((a, b) => b.spent - a.spent).slice(0, 10).map((b) => ({ ...b, spent: r2(b.spent), name: nameOf[b.id] || '' }))

  // 单子排行
  const byProduct = {}
  paid.filter((o) => o.status !== '已退款').forEach((o) => {
    const p = (byProduct[o.productName] = byProduct[o.productName] || { name: o.productName, count: 0, revenue: 0 })
    p.count++
    p.revenue += o.amount
  })
  const products = Object.values(byProduct).sort((a, b) => b.revenue - a.revenue).map((p) => ({ ...p, revenue: r2(p.revenue), share: pct(p.revenue, cur.net) }))

  // 护航表现（评分按全部历史订单算）
  const escortRows = await db('users').where({ role: 'escort' }).select('id', 'name', 'online')
  const ratings = await db('orders').whereNotNull('rating_score').groupBy('escort_id').select('escort_id').avg({ r: 'rating_score' })
  const ratingOf = {}
  ratings.forEach((x) => { ratingOf[x.escort_id] = Math.round(Number(x.r) * 10) / 10 })
  const escorts = escortRows.map((u) => {
    const mine = paid.filter((o) => o.escortId === u.id)
    const done = mine.filter((o) => o.status === '已完成')
    return {
      id: u.id, name: u.name, online: !!u.online, orders: mine.length, done: done.length,
      completion: pct(done.length, mine.filter((o) => o.status !== '已取消').length),
      refundRate: pct(mine.filter((o) => o.status === '已退款').length, mine.length),
      income: r2(done.reduce((s, o) => s + o.share, 0)),
      rating: ratingOf[u.id] ?? null
    }
  }).sort((a, b) => b.done - a.done)

  // 客服效率
  const dispatched = paid.filter((o) => o.mode === 'dispatch' && o.dispatchedAt)
  const count = async (q) => Number((await q.count({ c: '*' }))[0].c)
  const cs = {
    avgDispatchMin: dispatched.length ? Math.round(dispatched.reduce((s, o) => s + (o.dispatchedAt - o.paidAt), 0) / dispatched.length / 60000) : null,
    refundsHandled: paid.filter((o) => o.refundedBy).length,
    ticketsSolved: await count(db('tickets').where({ status: '已解决' }).whereBetween('created_at', [start, end])),
    ticketsOpen: await count(db('tickets').whereNot({ status: '已解决' }))
  }

  // 储值
  const rc = await db('recharges').where({ status: '已支付' }).whereBetween('paid_at', [start, end]).select('user_id', 'pay', 'bonus')
  const recharge = {
    count: rc.length,
    users: new Set(rc.map((x) => x.user_id)).size,
    pay: r2(rc.reduce((s, x) => s + Number(x.pay), 0)),
    bonus: r2(rc.reduce((s, x) => s + Number(x.bonus), 0)),
    balanceTotal: r2(customers.reduce((s, u) => s + Number(u.balance), 0)), // 所有老板余额合计（对公司来说是负债）
    balancePaid: r2(paid.filter((o) => o.payMethod === 'balance' && o.status !== '已退款').reduce((s, o) => s + o.amount, 0))
  }

  res.json({
    days, money: cur, recharge,
    vs: { gmv: change(cur.gmv, prev.gmv), net: change(cur.net, prev.net), orders: change(cur.orders, prev.orders) },
    trend, users, topSpenders, products, escorts, cs
  })
}))

module.exports = router
