// 订单 / 聊天 / 评价接口（真实后端版）  对应 server/src/routes/orders.js
// 订单状态流转规则见 server/src/services/orderService.js 顶部说明。
import { get, post, requestPayment } from './request.js'
import { STATUS, REFUNDABLE, ACTIVE } from '../constants.js'
export { STATUS, REFUNDABLE, ACTIVE }

/** 超时自动确认由后端定时任务完成，前端什么都不用做（保留这个函数是为了和模拟版一致） */
export function autoConfirm() {}

/** 查询订单。scope: mine | assigned | pool | all | user（需 userId） */
export const listOrders = (actor, { scope = 'mine', status = [], userId } = {}) => get('/orders', { scope, status: status.join(','), userId })
export const getOrder = (actor, id) => get(`/orders/${id}`)

/** 下单。金额由后端按单子价格和规格计算，这里传的 amount 只用于页面显示 */
export const createOrder = (actor, { product, spec, mode, escortId, gameId, note, couponId }) =>
  post('/orders', { productId: product.id, spec, mode, escortId, gameId, note, couponId })

/**
 * 支付。method: wechat | balance
 * 微信支付：后端返回 payParams → 调起微信支付 → 付完再请后端查一次结果
 * 用户取消支付时抛出错误「已取消支付」，订单保持待付款，可以在订单里继续支付
 */
export async function payOrder(actor, id, method = 'wechat') {
  const r = await post(`/orders/${id}/pay`, { method })
  if (!r.payParams) return r.order
  const paid = await requestPayment(r.payParams)
  if (!paid) throw new Error('已取消支付')
  const o = await post(`/orders/${id}/pay/check`)
  if (o.status === '待付款') throw new Error('支付结果确认中，请稍后刷新订单')
  return o
}

export const cancelOrder = (actor, id) => post(`/orders/${id}/cancel`)
export const requestRefund = (actor, id, reason) => post(`/orders/${id}/refund`, { reason })
export const handleRefund = (actor, id, approve) => post(`/orders/${id}/refund/handle`, { approve })
export const dispatchOrder = (actor, id, escortId) => post(`/orders/${id}/dispatch`, { escortId })
export const grabOrder = (actor, id) => post(`/orders/${id}/grab`)
export const respondAssign = (actor, id, accept) => post(`/orders/${id}/respond`, { accept })
export const startOrder = (actor, id) => post(`/orders/${id}/start`)
export const submitComplete = (actor, id, { proofs = [], note = '' }) => post(`/orders/${id}/submit`, { proofs, note })
export const confirmComplete = (actor, id) => post(`/orders/${id}/confirm`)
export const rejectComplete = (actor, id, reason) => post(`/orders/${id}/reject`, { reason })
export const rateOrder = (actor, id, score, text) => post(`/orders/${id}/rate`, { score, text })

// ---------------- 订单沟通 ----------------
export const listMessages = (actor, orderId) => get(`/orders/${orderId}/messages`)
export const sendMessage = (actor, orderId, text) => post(`/orders/${orderId}/messages`, { text })

// ---------------- 工作台待办数 ----------------
export const getTodo = () => get('/orders/todo')
