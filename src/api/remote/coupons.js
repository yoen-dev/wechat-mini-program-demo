// 优惠券接口（真实后端版）  对应 server/src/routes/coupons.js
import { get, post } from './request.js'

export const listCoupons = () => get('/coupons')
export const createCoupon = (actor, data) => post('/coupons', data)
export const toggleCoupon = (actor, id) => post(`/coupons/${id}/toggle`)
export const couponCenter = () => get('/coupons/center')
export const claimCoupon = (actor, couponId) => post(`/coupons/${couponId}/claim`)
/** 下单时可用的券（未登录老板返回空） */
export async function usableCoupons(actor, amount) {
  if (!actor || actor.role !== 'user') return []
  return get('/coupons/usable', { amount })
}
