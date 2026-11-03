// 余额 / 储值充值接口（模拟）
// 真实环境：充值走微信支付，支付回调后才给余额加钱；余额变动由后端记账。
import { db, save, nextId, respond, fail, nameOf } from './db.js'

const r2 = (n) => Math.round(n * 100) / 100

/** 名字打码：Kevin → K***，小雨 → 小* */
export function maskName(name = '') {
  if (!name) return '用户'
  return name.slice(0, 1) + '*'.repeat(Math.min(3, Math.max(1, name.length - 1)))
}

export function getTiers() {
  return respond(db().settings.recharge.tiers, 40)
}

/** 我的余额和明细（充值、余额支付、余额退款） */
export function getWallet(actor) {
  if (!actor || actor.role !== 'user') return fail('请先登录')
  const d = db()
  const u = d.users.find((x) => x.id === actor.id)
  const logs = []
  d.recharges.filter((x) => x.userId === actor.id).forEach((x) =>
    logs.push({ t: x.createdAt, title: '充值', sub: x.bonus ? `实付 ¥${x.pay}，赠送 ¥${x.bonus}` : `实付 ¥${x.pay}`, amount: x.pay + x.bonus }))
  d.orders.filter((o) => o.userId === actor.id && o.payMethod === 'balance' && o.paidAt).forEach((o) => {
    logs.push({ t: o.paidAt, title: '余额支付', sub: `${o.productName} #${o.id}`, amount: -o.amount })
    if (o.status === '已退款') logs.push({ t: o.refundedAt || o.paidAt + 1, title: '退回余额', sub: `${o.productName} #${o.id}`, amount: o.amount })
  })
  logs.sort((a, b) => b.t - a.t)
  return respond({ balance: r2(u.balance || 0), logs })
}

/** 充值（演示：直接成功） */
export function recharge(actor, tierIndex) {
  if (!actor || actor.role !== 'user') return fail('请先登录')
  const d = db()
  const tier = d.settings.recharge.tiers[tierIndex]
  if (!tier) return fail('请选择充值金额')
  const u = d.users.find((x) => x.id === actor.id)
  if (!u || u.status !== 'active') return fail('账号已被停用，请联系客服')
  d.recharges.push({ id: nextId('recharge'), userId: u.id, pay: tier.pay, bonus: tier.bonus, createdAt: Date.now() })
  u.balance = r2((u.balance || 0) + tier.pay + tier.bonus)
  u.lastActiveAt = Date.now()
  save()
  return respond({ balance: u.balance })
}

/**
 * 首页「刚刚充值」提示用：最近 48 小时、达到最低金额的真实充值记录，名字打码
 */
export function recentRecharges() {
  const d = db()
  const cfg = d.settings.recharge
  if (!cfg.popup) return respond([], 40)
  const since = Date.now() - 48 * 3600 * 1000
  const list = d.recharges.filter((x) => x.createdAt >= since && x.pay >= (cfg.popupMin || 0))
    .sort((a, b) => b.createdAt - a.createdAt).slice(0, 10)
    .map((x) => ({ id: x.id, name: maskName(nameOf(x.userId)), pay: x.pay, bonus: x.bonus, t: x.createdAt }))
  return respond(list, 40)
}

// ---- 供订单接口调用：扣余额 / 退余额 ----
export function deductBalance(userId, amount) {
  const u = db().users.find((x) => x.id === userId)
  if (!u || (u.balance || 0) < amount) return false
  u.balance = r2(u.balance - amount)
  return true
}
export function refundBalance(userId, amount) {
  const u = db().users.find((x) => x.id === userId)
  if (u) u.balance = r2((u.balance || 0) + amount)
}
