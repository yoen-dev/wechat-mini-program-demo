// 订单操作：根据「谁在看」和「订单状态」给出可用按钮，并执行对应接口。
// 老板、护航、客服、管理员共用，保证各端规则一致。管理员拥有客服的全部操作。
import * as api from '@api/orders.js'
import { listEscorts } from '@api/staff.js'
import { getWallet } from '@api/wallet.js'
import { run, toast, confirm } from '@/utils.js'
import { IS_MOCK } from '@/api/constants.js'

/**
 * 按「当前身份 a」和「订单状态」算出订单上应该显示哪些按钮
 * 返回 [{ key: 操作代号, label: 按钮文字, ghost: 是否为次要按钮 }]，key 对应下面 doAction 里的分支
 */
export function actionsFor(o, a) {
  if (!o || !a) return []
  const s = o.status
  const list = []
  const chat = { key: 'chat', label: '订单沟通' }
  if (a.role === 'user') {
    if (s === '待付款') list.push({ key: 'cancel', label: '取消订单', ghost: true }, { key: 'pay', label: '去支付' })
    if (api.REFUNDABLE.includes(s)) list.push({ key: 'refund', label: '申请退款', ghost: true })
    if (s === '待确认') list.push({ key: 'notDone', label: '还没完成', ghost: true }, { key: 'confirm', label: '确认完成' })
    if (['进行中', '已完成'].includes(s)) list.push({ key: 'ticket', label: '售后', ghost: true })
    if (['待派单', '待接单', '已接单', '进行中', '退款中'].includes(s)) list.push({ ...chat, ghost: s === '待确认' })
    if (s === '已完成' && !o.rating) list.push({ key: 'rate', label: '评价' })
    if (['已完成', '已退款', '已取消'].includes(s)) list.push({ key: 'again', label: '再来一单', ghost: true })
  } else if (a.role === 'escort') {
    if (s === '待派单') list.push({ key: 'grab', label: '抢单' })
    if (o.escortId === a.id) {
      if (s === '待接单') list.push({ key: 'reject', label: '拒单', ghost: true }, { key: 'accept', label: '接单' })
      if (['已接单', '进行中', '待确认'].includes(s)) list.push({ ...chat, ghost: true })
      if (s === '已接单') list.push({ key: 'start', label: '开始护航' })
      if (s === '进行中') list.push({ key: 'submit', label: '提交完成' })
    }
  } else if (['cs', 'admin'].includes(a.role)) {
    if (['待派单', '待接单'].includes(s)) list.push({ key: 'dispatch', label: s === '待派单' ? '派单' : '改派' })
    if (s === '已接单') list.push({ key: 'dispatch', label: '改派', ghost: true })
    if (s === '退款中') list.push({ key: 'refundNo', label: '拒绝退款', ghost: true }, { key: 'refundOk', label: '同意退款' })
    if (!['待付款', '已取消'].includes(s)) list.push({ ...chat, ghost: true })
  }
  return list
}

// 弹出带输入框的确认框（填退款原因等），取消返回 null
function ask(title, placeholder) {
  return new Promise((resolve) => uni.showModal({
    title, editable: true, placeholderText: placeholder,
    success: (r) => resolve(r.confirm ? (r.content || '').trim() || placeholder : null)
  }))
}

/** 派单选护航：显示在线状态和手上单数，在线且空闲的排前面 */
export function pickEscort() {
  return new Promise(async (resolve) => {
    const list = ((await run(listEscorts())) || []).slice(0, 6)
    if (!list.length) { toast('没有可用的护航'); return resolve(null) }
    uni.showActionSheet({
      itemList: list.map((e) => `${e.name}  ${e.online ? '在线' : '休息中'} · 手上 ${e.load} 单`),
      success: async (r) => {
        const e = list[r.tapIndex]
        if (!e.online && !(await confirm(`${e.name} 当前在休息，仍然派给他吗？`))) return resolve(null)
        resolve(e.id)
      },
      fail: () => resolve(null)
    })
  })
}

/** 执行操作，返回更新后的订单；跳转页面、用户取消或失败时返回 null */
export async function doAction(key, o, a) {
  switch (key) {
    case 'chat': uni.navigateTo({ url: `/pages/chat/chat?id=${o.id}` }); return null
    case 'again': uni.navigateTo({ url: `/pages/detail/detail?id=${o.productId}` }); return null
    case 'rate': uni.navigateTo({ url: `/pages/order/rate?id=${o.id}` }); return null
    case 'ticket': uni.navigateTo({ url: `/pages/user/tickets?orderId=${o.id}` }); return null
    case 'submit': uni.navigateTo({ url: `/pages/staff/complete?id=${o.id}` }); return null
    case 'pay': {
      const w = await getWallet(a).catch(() => null)
      let method = 'wechat'
      if (w && w.balance >= o.amount) {
        method = await new Promise((resolve) => uni.showActionSheet({
          itemList: [`余额支付（余额 ¥${w.balance}）`, '微信支付'],
          success: (r) => resolve(r.tapIndex === 0 ? 'balance' : 'wechat'), fail: () => resolve(null)
        }))
        if (!method) return null
      }
      if ((method === 'balance' || IS_MOCK) && !(await confirm(`应付 ¥${o.amount}`, method === 'balance' ? '确认余额支付' : '模拟微信支付'))) return null
      return done(await run(api.payOrder(a, o.id, method)), '支付成功')
    }
    case 'cancel':
      if (!(await confirm('确定取消这笔订单吗？'))) return null
      return done(await run(api.cancelOrder(a, o.id)), '已取消')
    case 'refund': {
      const reason = await ask('申请退款', '不想要了')
      if (reason === null) return null
      return done(await run(api.requestRefund(a, o.id, reason)), '已提交，等待客服处理')
    }
    case 'confirm':
      if (!(await confirm('确认护航已经完成了吗？确认后订单结束。'))) return null
      return done(await run(api.confirmComplete(a, o.id)), '已确认完成')
    case 'notDone': {
      const reason = await ask('哪里还没完成？', '保底还没打满')
      if (reason === null) return null
      return done(await run(api.rejectComplete(a, o.id, reason)), '已反馈给护航')
    }
    case 'grab': return done(await run(api.grabOrder(a, o.id)), '抢单成功')
    case 'accept': return done(await run(api.respondAssign(a, o.id, true)), '已接单')
    case 'reject':
      if (!(await confirm('拒单后会转给客服重新派单，确定吗？'))) return null
      return done(await run(api.respondAssign(a, o.id, false)), '已拒单')
    case 'start': return done(await run(api.startOrder(a, o.id)), '已开始')
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

// 操作成功时提示一下
function done(r, msg) {
  if (r) toast(msg, 'success')
  return r
}
