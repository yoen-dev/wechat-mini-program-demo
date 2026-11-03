/**
 * 微信支付回调  POST /api/pay/notify
 * 作用：老板在微信里付完钱后，微信支付服务器会调用这个地址告诉我们「哪一笔付成功了」。
 *   - 支付单号以 O 开头：订单支付 → 订单变为待派单 / 待接单
 *   - 支付单号以 R 开头：储值充值 → 余额到账
 * 这个地址要填到 .env 的 WXPAY_NOTIFY_URL（必须是 https 的公网地址）。
 * 注意：这里需要原始请求体做验签，所以在 app.js 里挂在 express.json() 之前。
 */
const express = require('express')
const db = require('../db')
const pay = require('../services/pay')
const { markPaid } = require('../services/orderService')
const { markRechargePaid } = require('../services/recharge')

const router = express.Router()

router.post('/notify', express.text({ type: '*/*', limit: '100kb' }), async (req, res) => {
  try {
    const n = pay.parseNotify(req.headers, req.body)
    if (n.success) {
      if (n.tradeNo.startsWith('O')) {
        const o = await db('orders').where({ trade_no: n.tradeNo }).first()
        // 金额对不上的不处理，记录日志人工核查
        if (o && Math.round(Number(o.amount) * 100) === Math.round(n.amount * 100)) await db.transaction((trx) => markPaid(trx, o, 'wechat'))
        else console.error('[支付回调] 订单不存在或金额不符', n)
      } else if (n.tradeNo.startsWith('R')) {
        await markRechargePaid(n.tradeNo)
      }
    }
    res.status(204).end() // 告诉微信「收到了」，否则它会重复通知
  } catch (e) {
    console.error('[支付回调] 处理失败：', e.message)
    res.status(500).json({ code: 'FAIL', message: '处理失败' })
  }
})

module.exports = router
