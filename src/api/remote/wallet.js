// 余额 / 储值充值接口（真实后端版）  对应 server/src/routes/wallet.js
import { get, post, requestPayment } from './request.js'
export { maskName } from '../constants.js'

export const getTiers = () => get('/wallet/tiers')
export async function getWallet(actor) {
  if (!actor || actor.role !== 'user') throw new Error('请先登录')
  return get('/wallet')
}

/**
 * 充值：后端创建充值单 → 微信支付 → 查询到账（最多等几秒）
 * 返回 { balance }
 */
export async function recharge(actor, tierIndex) {
  const r = await post('/wallet/recharge', { tierIndex })
  if (!r.payParams) return { balance: r.balance }
  if (!(await requestPayment(r.payParams))) throw new Error('已取消支付')
  for (let i = 0; i < 5; i++) {
    const s = await get(`/wallet/recharge/${r.rechargeId}`)
    if (s.status === '已支付') return { balance: s.balance }
    await new Promise((ok) => setTimeout(ok, 1500))
  }
  throw new Error('支付成功，余额到账可能有几秒延迟，请稍后刷新')
}

/** 首页「某某刚刚充值」提示 */
export const recentRecharges = () => get('/wallet/recent')
