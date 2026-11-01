// 订单 / 聊天 / 统计接口（模拟）
//
// 订单状态流转：
//   待付款 ──支付──▶ 待派单（客服派单）/ 待接单（指定护航）
//   待派单 ──客服派单 / 护航抢单──▶ 已接单
//   待接单 ──护航接单──▶ 已接单        ──护航拒单──▶ 待派单
//   已接单 ──开始──▶ 进行中 ──完成──▶ 已完成
//   待派单 / 待接单 / 已接单 ──用户申请退款──▶ 退款中 ──客服同意──▶ 已退款（拒绝则回到原状态）
//   待付款 ──取消──▶ 已取消
import { db, save, nextId, respond, fail } from './db.js'

export const STATUS = ['待付款', '待派单', '待接单', '已接单', '进行中', '已完成', '退款中', '已退款', '已取消']
export const REFUNDABLE = ['待派单', '待接单', '已接单']

const isStaff = (a) => ['cs', 'admin'].includes(a.role)
const nameOf = (id) => (db().users.find((u) => u.id === id) || {}).name || ''

function find(id) {
  return db().orders.find((o) => o.id === Number(id))
}
function log(o, text) {
  o.logs.push({ t: Date.now(), text })
}
function decorate(o) {
  return { ...o, escortName: nameOf(o.escortId), userName: nameOf(o.userId) }
}
// 谁能看这笔订单
function canSee(o, a) {
  return isStaff(a) || (a.role === 'user' && o.userId === a.id) || (a.role === 'escort' && (o.escortId === a.id || o.status === '待派单'))
}

/**
 * 查询订单
 * scope: 'mine'（用户自己的）| 'assigned'（派给我的护航单）| 'pool'（抢单大厅）| 'all'（客服/管理员）
 */
export function listOrders(actor, { scope = 'mine', status = [] } = {}) {
  let list = db().orders
  if (scope === 'mine') list = list.filter((o) => o.userId === actor.id)
  else if (scope === 'assigned') list = list.filter((o) => o.escortId === actor.id)
  else if (scope === 'pool') list = list.filter((o) => o.status === '待派单')
  else if (scope === 'all' && !isStaff(actor)) return fail('无权限')
  if (status.length) list = list.filter((o) => status.includes(o.status))
  return respond(list.slice().sort((a, b) => b.createdAt - a.createdAt).map(decorate))
}

export function getOrder(actor, id) {
  const o = find(id)
  if (!o || !canSee(o, actor)) return fail('订单不存在')
  return respond(decorate(o))
}

/** 用户下单（创建为待付款） */
export function createOrder(actor, { product, spec, amount, mode, escortId, gameId, note }) {
  if (actor.role !== 'user') return fail('请使用用户身份下单')
  if (!gameId || !gameId.trim()) return fail('请填写游戏昵称 / ID')
  if (mode === 'assign' && !escortId) return fail('请选择护航')
  const d = db()
  const o = {
    id: nextId('order'), userId: actor.id, productId: product.id, productName: product.name, spec, amount,
    mode, escortId: mode === 'assign' ? escortId : null, status: '待付款', gameId: gameId.trim(), note: (note || '').trim(),
    createdAt: Date.now(), paidAt: null, logs: []
  }
  log(o, '创建订单')
  d.orders.push(o)
  save()
  return respond(decorate(o))
}

/** 支付（演示：直接成功。真实环境：后端统一下单 → wx.requestPayment → 支付回调改状态） */
export function payOrder(actor, id) {
  const o = find(id)
  if (!o || o.userId !== actor.id) return fail('订单不存在')
  if (o.status !== '待付款') return fail('订单状态已变化')
  o.paidAt = Date.now()
  o.status = o.mode === 'assign' ? '待接单' : '待派单'
  log(o, o.mode === 'assign' ? `支付成功，等待 ${nameOf(o.escortId)} 接单` : '支付成功，等待客服派单')
  save()
  return respond(decorate(o))
}

export function cancelOrder(actor, id) {
  const o = find(id)
  if (!o || o.userId !== actor.id) return fail('订单不存在')
  if (o.status !== '待付款') return fail('只有待付款订单可以取消')
  o.status = '已取消'
  log(o, '用户取消订单')
  save()
  return respond(decorate(o))
}

export function requestRefund(actor, id, reason) {
  const o = find(id)
  if (!o || o.userId !== actor.id) return fail('订单不存在')
  if (!REFUNDABLE.includes(o.status)) return fail('当前状态不能申请退款，请联系客服')
  o.prevStatus = o.status
  o.status = '退款中'
  o.refundReason = reason || '用户申请退款'
  log(o, `申请退款：${o.refundReason}`)
  save()
  return respond(decorate(o))
}

/** 客服 / 管理员处理退款 */
export function handleRefund(actor, id, approve) {
  if (!isStaff(actor)) return fail('无权限')
  const o = find(id)
  if (!o || o.status !== '退款中') return fail('订单状态已变化')
  o.status = approve ? '已退款' : o.prevStatus
  log(o, approve ? `${actor.name} 同意退款` : `${actor.name} 拒绝退款，订单继续`)
  save()
  return respond(decorate(o))
}

/** 客服 / 管理员派单 */
export function dispatchOrder(actor, id, escortId) {
  if (!isStaff(actor)) return fail('无权限')
  const o = find(id)
  if (!o || !['待派单', '待接单'].includes(o.status)) return fail('订单状态已变化')
  o.escortId = escortId
  o.status = '已接单'
  log(o, `${actor.name} 派单给 ${nameOf(escortId)}`)
  save()
  return respond(decorate(o))
}

/** 护航抢单 */
export function grabOrder(actor, id) {
  if (actor.role !== 'escort') return fail('无权限')
  const o = find(id)
  if (!o || o.status !== '待派单') return fail('手慢了，这单已被接走')
  o.escortId = actor.id
  o.status = '已接单'
  log(o, `${actor.name} 抢单成功`)
  save()
  return respond(decorate(o))
}

/** 护航处理指定给自己的单：接 / 拒 */
export function respondAssign(actor, id, accept) {
  const o = find(id)
  if (!o || o.escortId !== actor.id || o.status !== '待接单') return fail('订单状态已变化')
  if (accept) { o.status = '已接单'; log(o, `${actor.name} 已接单`) }
  else { o.status = '待派单'; o.escortId = null; log(o, `${actor.name} 暂时无法接单，转客服派单`) }
  save()
  return respond(decorate(o))
}

export function startOrder(actor, id) {
  const o = find(id)
  if (!o || o.escortId !== actor.id || o.status !== '已接单') return fail('订单状态已变化')
  o.status = '进行中'
  log(o, '开始护航')
  save()
  return respond(decorate(o))
}

export function completeOrder(actor, id) {
  const o = find(id)
  if (!o || o.escortId !== actor.id || o.status !== '进行中') return fail('订单状态已变化')
  o.status = '已完成'
  log(o, '护航完成')
  save()
  return respond(decorate(o))
}

// ---------------- 聊天 ----------------
export function listMessages(actor, orderId) {
  const o = find(orderId)
  if (!o || !canSee(o, actor)) return fail('无权限')
  return respond(db().messages[orderId] || [], 60)
}

export function sendMessage(actor, orderId, text) {
  const o = find(orderId)
  if (!o || !canSee(o, actor)) return fail('无权限')
  if (!text.trim()) return fail('消息不能为空')
  const d = db()
  if (!d.messages[orderId]) d.messages[orderId] = []
  const m = { id: nextId('msg'), from: actor.id, role: actor.role, name: actor.name, text: text.trim(), t: Date.now() }
  d.messages[orderId].push(m)
  save()
  return respond(m, 60)
}

// ---------------- 统计（管理员） ----------------
export function getStats(actor) {
  if (actor.role !== 'admin') return fail('无权限')
  const d = db()
  const start = new Date(); start.setHours(0, 0, 0, 0)
  const paid = d.orders.filter((o) => o.paidAt)
  const today = paid.filter((o) => o.paidAt >= start.getTime())
  const income = (list) => list.filter((o) => o.status !== '已退款').reduce((s, o) => s + o.amount, 0)
  return respond({
    todayOrders: today.length,
    todayIncome: income(today),
    totalOrders: paid.length,
    totalIncome: income(paid),
    waitDispatch: d.orders.filter((o) => o.status === '待派单').length,
    refunding: d.orders.filter((o) => o.status === '退款中').length,
    inProgress: d.orders.filter((o) => ['已接单', '进行中'].includes(o.status)).length,
    users: d.users.filter((u) => u.role === 'user').length
  })
}
