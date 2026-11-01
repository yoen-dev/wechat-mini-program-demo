// 订单操作：根据「谁在看」和「订单状态」给出可用按钮，并执行对应接口。
// 用户端、护航、客服、管理员共用，保证各端规则一致。
import * as api from '@/api/orders.js'
import { listEscorts } from '@/api/staff.js'
import { run, toast, confirm } from '@/utils.js'

export function actionsFor(o, a) {
  if (!o || !a) return []
  const s = o.status
  const list = []
  const chat = { key: 'chat', label: '订单沟通' }
  if (a.role === 'user') {
    if (s === '待付款') list.push({ key: 'cancel', label: '取消订单', ghost: true }, { key: 'pay', label: '去支付' })
    if (api.REFUNDABLE.includes(s)) list.push({ key: 'refund', label: '申请退款', ghost: true })
    if (['待派单', '待接单', '已接单', '进行中', '退款中'].includes(s)) list.push(chat)
    if (['已完成', '已退款', '已取消'].includes(s)) list.push({ key: 'again', label: '再来一单', ghost: true })
  } else if (a.role === 'escort') {
    if (s === '待派单') list.push({ key: 'grab', label: '抢单' })
    if (o.escortId === a.id) {
      if (s === '待接单') list.push({ key: 'reject', label: '拒单', ghost: true }, { key: 'accept', label: '接单' })
      if (['已接单', '进行中'].includes(s)) list.push({ ...chat, ghost: true })
      if (s === '已接单') list.push({ key: 'start', label: '开始护航' })
      if (s === '进行中') list.push({ key: 'complete', label: '完成订单' })
    }
  } else if (['cs', 'admin'].includes(a.role)) {
    if (['待派单', '待接单'].includes(s)) list.push({ key: 'dispatch', label: s === '待派单' ? '派单' : '改派' })
    if (s === '退款中') list.push({ key: 'refundNo', label: '拒绝退款', ghost: true }, { key: 'refundOk', label: '同意退款' })
    if (!['待付款', '已取消'].includes(s)) list.push({ ...chat, ghost: true })
  }
  return list
}

function ask(title, placeholder) {
  return new Promise((resolve) => uni.showModal({
    title, editable: true, placeholderText: placeholder,
    success: (r) => resolve(r.confirm ? (r.content || '').trim() || placeholder : null)
  }))
}

function pickEscort() {
  return new Promise(async (resolve) => {
    const list = (await run(listEscorts())) || []
    if (!list.length) { toast('没有可用的护航'); return resolve(null) }
    uni.showActionSheet({ itemList: list.slice(0, 6).map((e) => e.name), success: (r) => resolve(list[r.tapIndex].id), fail: () => resolve(null) })
  })
}

/** 执行操作，返回更新后的订单；用户取消或失败返回 null */
export async function doAction(key, o, a) {
  switch (key) {
    case 'chat': uni.navigateTo({ url: `/pages/chat/chat?id=${o.id}` }); return null
    case 'again': uni.navigateTo({ url: `/pages/detail/detail?id=${o.productId}` }); return null
    case 'pay':
      if (!(await confirm(`应付 ¥${o.amount}`, '模拟微信支付'))) return null
      return done(await run(api.payOrder(a, o.id)), '支付成功')
    case 'cancel':
      if (!(await confirm('确定取消这笔订单吗？'))) return null
      return done(await run(api.cancelOrder(a, o.id)), '已取消')
    case 'refund': {
      const reason = await ask('申请退款', '不想要了')
      if (reason === null) return null
      return done(await run(api.requestRefund(a, o.id, reason)), '已提交，等待客服处理')
    }
    case 'grab': return done(await run(api.grabOrder(a, o.id)), '抢单成功')
    case 'accept': return done(await run(api.respondAssign(a, o.id, true)), '已接单')
    case 'reject':
      if (!(await confirm('拒单后会转给客服重新派单，确定吗？'))) return null
      return done(await run(api.respondAssign(a, o.id, false)), '已拒单')
    case 'start': return done(await run(api.startOrder(a, o.id)), '已开始')
    case 'complete':
      if (!(await confirm('确认这单已经完成了吗？'))) return null
      return done(await run(api.completeOrder(a, o.id)), '订单已完成')
    case 'dispatch': {
      const id = await pickEscort()
      if (!id) return null
      return done(await run(api.dispatchOrder(a, o.id, id)), '派单成功')
    }
    case 'refundOk':
      if (!(await confirm(`同意退款 ¥${o.amount}？`))) return null
      return done(await run(api.handleRefund(a, o.id, true)), '已退款')
    case 'refundNo':
      if (!(await confirm('拒绝退款，订单将继续进行？'))) return null
      return done(await run(api.handleRefund(a, o.id, false)), '已拒绝')
  }
  return null
}

function done(r, msg) {
  if (r) toast(msg, 'success')
  return r
}
