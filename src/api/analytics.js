// 经营数据（负责人 / 管理员）
import { db, respond, fail, nameOf } from './db.js'
import { autoConfirm } from './orders.js'

const D = 24 * 3600 * 1000
const r2 = (n) => Math.round(n * 100) / 100
const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0)

function dayKey(t) {
  const d = new Date(t)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

/**
 * days: 1（今天）| 7 | 30 | 90
 * 金额口径：成交额 = 已支付订单金额；退款 = 已退款订单金额；实收 = 成交额 − 退款；
 *          护航分成 = 已完成订单的护航分成；毛利 = 实收 − 护航分成
 */
export function getAnalytics(actor, days = 7) {
  if (!['owner', 'admin'].includes(actor.role)) return fail('无权限')
  autoConfirm()
  const d = db()
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const start = today.getTime() - (days - 1) * D
  const end = Date.now()
  const prevStart = start - days * D
  const inRange = (t, s = start, e = end) => t && t >= s && t <= e

  const paid = d.orders.filter((o) => inRange(o.paidAt))
  const paidPrev = d.orders.filter((o) => inRange(o.paidAt, prevStart, start - 1))
  const money = (list) => {
    const gmv = list.reduce((s, o) => s + o.amount, 0)
    const refund = list.filter((o) => o.status === '已退款').reduce((s, o) => s + o.amount, 0)
    const share = list.filter((o) => o.status === '已完成').reduce((s, o) => s + (o.escortShare || 0), 0)
    return { gmv: r2(gmv), refund: r2(refund), net: r2(gmv - refund), share: r2(share), profit: r2(gmv - refund - share), orders: list.length }
  }
  const cur = money(paid)
  const prev = money(paidPrev)
  const change = (a, b) => (b ? Math.round(((a - b) / b) * 1000) / 10 : null)

  // 每日趋势
  const trend = []
  for (let i = 0; i < days; i++) {
    const s = start + i * D
    const l = paid.filter((o) => o.paidAt >= s && o.paidAt < s + D)
    const m = money(l)
    trend.push({ label: dayKey(s), net: m.net, orders: l.length })
  }

  // 用户
  const customers = d.users.filter((u) => u.role === 'user')
  const buyers = {}
  paid.forEach((o) => {
    if (o.status === '已退款') return
    const b = (buyers[o.userId] = buyers[o.userId] || { id: o.userId, orders: 0, spent: 0, last: 0 })
    b.orders++
    b.spent += o.amount
    b.last = Math.max(b.last, o.paidAt)
  })
  const buyerList = Object.values(buyers)
  const users = {
    total: customers.length,
    newUsers: customers.filter((u) => inRange(u.createdAt)).length,
    active: customers.filter((u) => inRange(u.lastActiveAt) || buyers[u.id]).length,
    buyers: buyerList.length,
    repeatRate: pct(buyerList.filter((b) => b.orders >= 2).length, buyerList.length),
    avgOrder: buyerList.length ? r2(cur.net / Math.max(1, paid.filter((o) => o.status !== '已退款').length)) : 0,
    arpu: buyerList.length ? r2(cur.net / buyerList.length) : 0
  }
  const topSpenders = buyerList.sort((a, b) => b.spent - a.spent).slice(0, 10)
    .map((b) => ({ ...b, spent: r2(b.spent), name: nameOf(b.id) }))

  // 单子
  const byProduct = {}
  paid.filter((o) => o.status !== '已退款').forEach((o) => {
    const p = (byProduct[o.productName] = byProduct[o.productName] || { name: o.productName, count: 0, revenue: 0 })
    p.count++
    p.revenue += o.amount
  })
  const products = Object.values(byProduct).sort((a, b) => b.revenue - a.revenue)
    .map((p) => ({ ...p, revenue: r2(p.revenue), share: pct(p.revenue, cur.net) }))

  // 护航
  const escorts = d.users.filter((u) => u.role === 'escort').map((u) => {
    const mine = paid.filter((o) => o.escortId === u.id)
    const done = mine.filter((o) => o.status === '已完成')
    const rated = d.orders.filter((o) => o.escortId === u.id && o.rating)
    return {
      id: u.id, name: u.name, online: !!u.online, orders: mine.length, done: done.length,
      completion: pct(done.length, mine.filter((o) => o.status !== '已取消').length),
      refundRate: pct(mine.filter((o) => o.status === '已退款').length, mine.length),
      income: r2(done.reduce((s, o) => s + (o.escortShare || 0), 0)),
      rating: rated.length ? Math.round((rated.reduce((s, o) => s + o.rating.score, 0) / rated.length) * 10) / 10 : null
    }
  }).sort((a, b) => b.done - a.done)

  // 客服
  const dispatched = paid.filter((o) => o.mode === 'dispatch' && o.dispatchedAt)
  const cs = {
    avgDispatchMin: dispatched.length ? Math.round(dispatched.reduce((s, o) => s + (o.dispatchedAt - o.paidAt), 0) / dispatched.length / 60000) : null,
    refundsHandled: paid.filter((o) => o.refundedBy).length,
    ticketsSolved: d.tickets.filter((x) => x.status === '已解决' && inRange(x.createdAt)).length,
    ticketsOpen: d.tickets.filter((x) => x.status !== '已解决').length
  }

  return respond({
    days, money: cur,
    vs: { gmv: change(cur.gmv, prev.gmv), net: change(cur.net, prev.net), orders: change(cur.orders, prev.orders) },
    trend, users, topSpenders, products, escorts, cs
  })
}
