// 系统设置 / 护航收入 / 提现接口（真实后端版）  对应 server/src/routes/finance.js
import { get, post } from './request.js'

export const getSettings = () => get('/settings')
export const saveSettings = (actor, patch) => post('/settings', patch)
export const resetFaqs = () => post('/settings/reset-faqs')

export const getIncome = () => get('/income')
export const requestWithdraw = (actor, amount) => post('/withdrawals', { amount })
export const listWithdrawals = () => get('/withdrawals')
/** approve=true 表示已线下打款；false 为驳回 */
export const handleWithdraw = (actor, id, approve, note = '') => post(`/withdrawals/${id}/handle`, { approve, note })
