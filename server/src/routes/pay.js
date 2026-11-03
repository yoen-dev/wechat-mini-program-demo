/**
 * 微信支付回调
 * 作用：老板付完钱后，微信会通知我们「哪一笔付成功了」，这里负责入账：
 *   - 支付单号 O 开头：订单支付 → 订单变为待派单 / 待接单
 *   - 支付单号 R 开头：储值充值 → 余额到账
 * 重复通知没关系：入账逻辑用「待支付 → 已支付」的有条件更新，同一笔只会处理一次。
 *
 *   POST /api/pay/cloud-notify   云托管模式的回调（微信从内网调用，JSON 格式）
 *   POST /api/pay/notify         直连 v3 模式的回调（需要原始请求体验签，所以本路由挂在 express.json() 之前）
 */
const express = require('express')
const db = require('../db')
const pay = require('../services/pay')
const { markPaid } = require('../services/orderService')
const { markRechargePaid } = require('../services/recharge')

const router = express.Router()

/**
 * 确认支付成功后入账
 * @param amount 微信告诉我们的实付金额（元），和我们记录的金额对不上就不处理，打日志人工核查
 */
async function settle(tradeNo, amount) {
  if (tradeNo.startsWith('O')) {
    const o = await db('orders').where({ trade_no: tradeNo }).first()
    if (!o || (amount !== null && Math.round(Number(o.amount) * 100) !== Math.round(amount * 100))) {
      return console.error('[支付回调] 订单不存在或金额不符', tradeNo, amount)
    }
    await db.transaction((trx) => markPaid(trx, o, 'wechat'))
  } else if (tradeNo.startsWith('R')) {
    const r = await db('recharges').where({ trade_no: tradeNo }).first()
    if (!r || (amount !== null && Math.round(Number(r.pay) * 100) !== Math.round(amount * 100))) {
      return console.error('[支付回调] 充值单不存在或金额不符', tradeNo, amount)
    }
    await markRechargePaid(tradeNo)
  }
}

// ---------------- 云托管模式 ----------------
router.post('/cloud-notify', express.json({ limit: '100kb' }), async (req, res) => {
  try {
    const tradeNo = String((req.body && (req.body.outTradeNo || req.body.out_trade_no)) || '')
    if (tradeNo) {
      // 不直接相信回调内容，向微信再查一次这笔是否真的付成功了（防止有人伪造回调）
      const q = await pay.queryPaid(tradeNo)
      if (q.paid) await settle(tradeNo, q.amount)
    }
    res.json({ errcode: 0, errmsg: '' }) // 告诉微信「收到了」，否则会重复通知
  } catch (e) {
    console.error('[支付回调] 处理失败：', e.message)
    res.status(500).json({ errcode: 1, errmsg: '处理失败' })
  }
})

// ---------------- 直连 v3 模式 ----------------
router.post('/notify', express.text({ type: '*/*', limit: '100kb' }), async (req, res) => {
  try {
    const n = pay.parseV3Notify(req.headers, req.body)
    if (n.success) await settle(n.tradeNo, n.amount)
    res.status(204).end()
  } catch (e) {
    console.error('[支付回调] 处理失败：', e.message)
    res.status(500).json({ code: 'FAIL', message: '处理失败' })
  }
})

module.exports = { router, settle }
