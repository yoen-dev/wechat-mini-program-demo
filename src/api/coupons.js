// 优惠券接口（模拟）
// 管理员建券 → 老板在「我的 → 优惠券」领取 → 下单时自动选最优的一张
import { db, save, nextId, respond, fail, audit, isAdmin } from './db.js'

const D = 24 * 3600 * 1000

export function listCoupons(actor) {
  if (!isAdmin(actor)) return fail('无权限')
  const d = db()
  return respond(d.coupons.slice().reverse().map((c) => ({
    ...c, claimed: d.userCoupons.filter((x) => x.couponId === c.id).length, used: d.userCoupons.filter((x) => x.couponId === c.id && x.usedOrderId).length
  })))
}

export function createCoupon(actor, { name, amount, minSpend, days }) {
  if (!isAdmin(actor)) return fail('无权限')
  const a = Number(amount), m = Number(minSpend || 0), dd = Number(days)
  if (!name || !name.trim()) return fail('请填写名称')
  if (!(a > 0)) return fail('请填写减免金额')
  if (m && m <= a) return fail('使用门槛需大于减免金额')
  if (!(dd > 0)) return fail('请填写有效天数')
  const c = { id: nextId('coupon'), name: name.trim(), amount: a, minSpend: m, days: dd, active: true, createdAt: Date.now() }
  db().coupons.push(c)
  audit(actor, '新建优惠券', c.name)
  save()
  return respond(c)
}

export function toggleCoupon(actor, id) {
  if (!isAdmin(actor)) return fail('无权限')
  const c = db().coupons.find((x) => x.id === id)
  if (!c) return fail('优惠券不存在')
  c.active = !c.active
  audit(actor, c.active ? '上架优惠券' : '停发优惠券', c.name)
  save()
  return respond(c)
}

/** 老板：可领取的券 + 我的券 */
export function couponCenter(actor) {
  const d = db()
  const mine = d.userCoupons.filter((x) => x.userId === actor.id)
  const claimable = d.coupons.filter((c) => c.active && !mine.some((x) => x.couponId === c.id))
  const now = Date.now()
  return respond({
    claimable,
    mine: mine.map((x) => ({ ...x, state: x.usedOrderId ? '已使用' : x.expireAt < now ? '已过期' : '可使用' })).sort((a, b) => b.createdAt - a.createdAt)
  })
}

export function claimCoupon(actor, couponId) {
  if (actor.role !== 'user') return fail('请先登录')
  const d = db()
  const c = d.coupons.find((x) => x.id === couponId && x.active)
  if (!c) return fail('优惠券已停发')
  if (d.userCoupons.some((x) => x.userId === actor.id && x.couponId === couponId)) return fail('已经领过了')
  d.userCoupons.push({ id: nextId('userCoupon'), userId: actor.id, couponId, name: c.name, amount: c.amount, minSpend: c.minSpend, expireAt: Date.now() + c.days * D, usedOrderId: null, createdAt: Date.now() })
  save()
  return respond({ ok: true })
}

/** 下单时可用的券（按减免金额从大到小） */
export function usableCoupons(actor, amount) {
  if (!actor || actor.role !== 'user') return respond([])
  const now = Date.now()
  return respond(db().userCoupons.filter((x) => x.userId === actor.id && !x.usedOrderId && x.expireAt > now && amount >= x.minSpend).sort((a, b) => b.amount - a.amount), 40)
}
