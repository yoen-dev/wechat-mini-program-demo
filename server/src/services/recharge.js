/**
 * 充值到账
 * 作用：充值单支付成功后（微信支付回调或模拟支付），把「实付 + 赠送」加到老板余额。
 * 用「待支付 → 已支付」的有条件更新保证：微信重复发回调也只加一次钱。
 */
const db = require('../db')
const { now } = require('../utils/helpers')

// 返回 true 表示这次真的到账了；已经处理过的返回 false
async function markRechargePaid(tradeNo) {
  return db.transaction(async (trx) => {
    const r = await trx('recharges').where({ trade_no: tradeNo }).first()
    if (!r) return false
    const n = await trx('recharges').where({ id: r.id, status: '待支付' }).update({ status: '已支付', paid_at: now() })
    if (!n) return false
    await trx('users').where({ id: r.user_id }).update({
      balance: trx.raw('balance + ?', [Number(r.pay) + Number(r.bonus)]),
      last_active_at: now()
    })
    return true
  })
}

module.exports = { markRechargePaid }
