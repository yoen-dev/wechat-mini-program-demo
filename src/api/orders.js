// 订单 / 聊天 / 评价接口（模拟）
//
// 订单状态流转：
//   待付款 ──支付──▶ 待派单（客服派单）/ 待接单（指定护航）
//   待派单 ──客服派单 / 护航抢单──▶ 已接单
//   待接单 ──护航接单──▶ 已接单        ──护航拒单──▶ 待派单
//   已接单 ──开始──▶ 进行中 ──护航提交完成（附战绩截图）──▶ 待确认
//   待确认 ──老板确认 / 超时自动确认──▶ 已完成（护航分成此时入账）
//   待确认 ──老板反馈“还没完成”──▶ 进行中
//   待派单 / 待接单 / 已接单 ──老板申请退款──▶ 退款中 ──客服同意──▶ 已退款（拒绝则回到原状态）
//   待付款 ──取消──▶ 已取消
import { db, save, nextId, respond, fail, audit, isStaff, nameOf } from './db.js'

export const STATUS = ['待付款', '待派单', '待接单', '已接单', '进行中', '待确认', '已完成', '退款中', '已退款', '已取消']
export const REFUNDABLE = ['待派单', '待接单', '已接单']
export const ACTIVE = ['待派单', '待接单', '已接单', '进行中', '待确认']

function find(id) {
  return db().orders.find((o) => o.id === Number(id))
}
function log(o, text) {
  o.logs.push({ t: Date.now(), text })
}
function decorate(o) {
  return { ...o, escortName: nameOf(o.escortId), userName: nameOf(o.userId) }
}
function canSee(o, a) {
  return isStaff(a) || (a.role === 'user' && o.userId === a.id) || (a.role === 'escort' && (o.escortId === a.id || o.status === '待派单'))
}
function finish(o, text) {
  const d = db()
  o.status = '已完成'
  o.completedAt = Date.now()
  o.escortShare = Math.round(o.amount * d.settings.shareRate * 100) / 100
  log(o, text)
}

/** 超时未确认的订单自动确认（真实环境由后端定时任务完成） */
export function autoConfirm() {
  const d = db()
  const hours = Number(d.settings.autoConfirmHours) || 0
  if (!hours) return
  let changed = false
  d.orders.forEach((o) => {
    if (o.status === '待确认' && Date.now() - o.submittedAt > hours * 3600 * 1000) {
      finish(o, `超过 ${hours} 小时未确认，系统自动确认完成`)
      changed = true
    }
  })
  if (changed) save()
}

/**
 * 查询订单
 * scope: 'mine'（老板自己的）| 'assigned'（派给我的护航单）| 'pool'（抢单大厅）| 'all'（客服/管理员）| 'user'（客服查某个老板，需 userId）
 */
export function listOrders(actor, { scope = 'mine', status = [], userId } = {}) {
  autoConfirm()
  let list = db().orders
  if (scope === 'mine') list = list.filter((o) => o.userId === actor.id)
  else if (scope === 'assigned') list = list.filter((o) => o.escortId === actor.id)
  else if (scope === 'pool') list = list.filter((o) => o.status === '待派单')
  else if (!isStaff(actor)) return fail('无权限')
  else if (scope === 'user') list = list.filter((o) => o.userId === Number(userId))
  if (status.length) list = list.filter((o) => status.includes(o.status))
  return respond(list.slice().sort((a, b) => b.createdAt - a.createdAt).map(decorate))
}

export function getOrder(actor, id) {
  autoConfirm()
  const o = find(id)
  if (!o || !canSee(o, actor)) return fail('订单不存在')
  return respond(decorate(o))
}

/** 老板下单（创建为待付款）。couponId 为老板选的优惠券 */
export function createOrder(actor, { product, spec, amount, mode, escortId, gameId, note, couponId }) {
  if (actor.role !== 'user') return fail('请使用老板身份下单')
  if (!gameId || !gameId.trim()) return fail('请填写游戏昵称 / ID')
  if (mode === 'assign' && !escortId) return fail('请选择护航')
  const d = db()
  const me = d.users.find((u) => u.id === actor.id)
  if (!me || me.status !== 'active') return fail('账号已被停用，请联系客服')
  let discount = 0, couponName = ''
  if (couponId) {
    const c = d.userCoupons.find((x) => x.id === couponId && x.userId === actor.id && !x.usedOrderId && x.expireAt > Date.now())
    if (!c) return fail('优惠券不可用')
    if (amount < c.minSpend) return fail(`满 ${c.minSpend} 元才能使用这张券`)
    discount = c.amount
    couponName = c.name
  }
  const o = {
    id: nextId('order'), userId: actor.id, productId: product.id, productName: product.name, spec,
    original: amount, discount, couponName, couponId: couponId || null, amount: Math.max(0.01, amount - discount),
    mode, escortId: mode === 'assign' ? escortId : null, status: '待付款', gameId: gameId.trim(), note: (note || '').trim(),
    createdAt: Date.now(), paidAt: null, logs: [], proofs: [], rating: null
  }
  log(o, '创建订单')
  d.orders.push(o)
  me.lastActiveAt = Date.now()
  save()
  return respond(decorate(o))
}

/** 支付（演示：直接成功。真实环境：后端统一下单 → uni.requestPayment → 支付回调改状态） */
export function payOrder(actor, id) {
  const d = db()
  const o = find(id)
  if (!o || o.userId !== actor.id) return fail('订单不存在')
  if (o.status !== '待付款') return fail('订单状态已变化')
  o.paidAt = Date.now()
  o.status = o.mode === 'assign' ? '待接单' : '待派单'
  if (o.couponId) {
    const c = d.userCoupons.find((x) => x.id === o.couponId)
    if (c) c.usedOrderId = o.id
  }
  log(o, o.mode === 'assign' ? `支付成功，等待 ${nameOf(o.escortId)} 接单` : '支付成功，等待客服派单')
  save()
  return respond(decorate(o))
}

export function cancelOrder(actor, id) {
  const o = find(id)
  if (!o || o.userId !== actor.id) return fail('订单不存在')
  if (o.status !== '待付款') return fail('只有待付款订单可以取消')
  o.status = '已取消'
  log(o, '老板取消订单')
  save()
  return respond(decorate(o))
}

export function requestRefund(actor, id, reason) {
  const o = find(id)
  if (!o || o.userId !== actor.id) return fail('订单不存在')
  if (!REFUNDABLE.includes(o.status)) return fail('当前状态不能申请退款，请提交售后')
  o.prevStatus = o.status
  o.status = '退款中'
  o.refundReason = reason || '老板申请退款'
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
  if (approve) o.refundedBy = actor.id
  log(o, approve ? `${actor.name} 同意退款` : `${actor.name} 拒绝退款，订单继续`)
  audit(actor, approve ? '同意退款' : '拒绝退款', `#${o.id} ¥${o.amount}`)
  save()
  return respond(decorate(o))
}

/** 客服 / 管理员派单或改派 */
export function dispatchOrder(actor, id, escortId) {
  if (!isStaff(actor)) return fail('无权限')
  const o = find(id)
  if (!o || !['待派单', '待接单', '已接单'].includes(o.status)) return fail('订单状态已变化')
  const re = o.status === '已接单'
  o.escortId = escortId
  o.status = '已接单'
  o.dispatchedAt = o.dispatchedAt || Date.now()
  log(o, `${actor.name} ${re ? '改派' : '派单'}给 ${nameOf(escortId)}`)
  audit(actor, re ? '改派' : '派单', `#${o.id} → ${nameOf(escortId)}`)
  save()
  return respond(decorate(o))
}

export function grabOrder(actor, id) {
  if (actor.role !== 'escort') return fail('无权限')
  const me = db().users.find((u) => u.id === actor.id)
  if (!me.online) return fail('请先切换到「接单中」')
  const o = find(id)
  if (!o || o.status !== '待派单') return fail('手慢了，这单已被接走')
  o.escortId = actor.id
  o.status = '已接单'
  o.dispatchedAt = Date.now()
  log(o, `${actor.name} 抢单成功`)
  save()
  return respond(decorate(o))
}

export function respondAssign(actor, id, accept) {
  const o = find(id)
  if (!o || o.escortId !== actor.id || o.status !== '待接单') return fail('订单状态已变化')
  if (accept) { o.status = '已接单'; o.dispatchedAt = Date.now(); log(o, `${actor.name} 已接单`) }
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

/** 护航提交完成：需上传战绩截图，等待老板确认 */
export function submitComplete(actor, id, { proofs = [], note = '' }) {
  const o = find(id)
  if (!o || o.escortId !== actor.id || o.status !== '进行中') return fail('订单状态已变化')
  if (!proofs.length) return fail('请至少上传 1 张战绩截图')
  o.status = '待确认'
  o.proofs = proofs
  o.proofNote = note.trim()
  o.submittedAt = Date.now()
  log(o, `${actor.name} 提交完成，等待老板确认`)
  save()
  return respond(decorate(o))
}

/** 老板确认完成 */
export function confirmComplete(actor, id) {
  const o = find(id)
  if (!o || o.userId !== actor.id || o.status !== '待确认') return fail('订单状态已变化')
  finish(o, '老板确认完成')
  save()
  return respond(decorate(o))
}

/** 老板认为还没完成：退回进行中 */
export function rejectComplete(actor, id, reason) {
  const o = find(id)
  if (!o || o.userId !== actor.id || o.status !== '待确认') return fail('订单状态已变化')
  o.status = '进行中'
  log(o, `老板反馈还没完成：${reason || '未说明'}`)
  save()
  return respond(decorate(o))
}

/** 老板评价（完成后） */
export function rateOrder(actor, id, score, text) {
  const o = find(id)
  if (!o || o.userId !== actor.id || o.status !== '已完成') return fail('只能评价已完成的订单')
  if (o.rating) return fail('已经评价过了')
  if (!(score >= 1 && score <= 5)) return fail('请选择评分')
  o.rating = { score, text: (text || '').trim(), t: Date.now() }
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

// ---------------- 待办数（工作台首页用） ----------------
export function getTodo(actor) {
  if (!isStaff(actor)) return fail('无权限')
  autoConfirm()
  const d = db()
  const start = new Date(); start.setHours(0, 0, 0, 0)
  const today = d.orders.filter((o) => o.paidAt && o.paidAt >= start.getTime())
  return respond({
    waitDispatch: d.orders.filter((o) => ['待派单', '待接单'].includes(o.status)).length,
    refunding: d.orders.filter((o) => o.status === '退款中').length,
    inProgress: d.orders.filter((o) => ['已接单', '进行中', '待确认'].includes(o.status)).length,
    tickets: d.tickets.filter((x) => x.status !== '已解决').length,
    applications: d.applications.filter((x) => x.status === '待审核').length,
    withdrawals: d.withdrawals.filter((x) => x.status === '待审核').length,
    todayOrders: today.length,
    todayIncome: today.filter((o) => o.status !== '已退款').reduce((s, o) => s + o.amount, 0)
  })
}
