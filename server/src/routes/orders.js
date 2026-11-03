/**
 * 订单接口  /api/orders/...
 * 状态流转规则见 services/orderService.js 顶部说明。
 *
 * 查询
 *   GET  /                      列表  ?scope=mine|assigned|pool|all|user &status=待派单,待接单 &userId=（scope=user 时）
 *                                mine 老板自己的 / assigned 派给我的（护航）/ pool 抢单大厅（护航）/ all 全部（客服、管理员）/ user 某个老板的（客服、管理员）
 *   GET  /todo                  工作台待办数（客服、管理员）
 *   GET  /:id                   详情（含进度时间线）
 * 老板
 *   POST /                      下单  { productId, spec, mode: dispatch|assign, escortId?, gameId, note?, couponId? } → 订单（待付款）
 *   POST /:id/pay               支付  { method: wechat|balance } → { order, payParams? }（有 payParams 时前端调 uni.requestPayment）
 *   POST /:id/cancel            取消（待付款）
 *   POST /:id/refund            申请退款  { reason }
 *   POST /:id/confirm           确认完成
 *   POST /:id/reject            还没完成，退回进行中  { reason }
 *   POST /:id/rate              评价  { score: 1-5, text }
 * 客服 / 管理员
 *   POST /:id/refund/handle     处理退款  { approve: true|false }
 *   POST /:id/dispatch          派单 / 改派  { escortId }
 * 护航
 *   POST /:id/grab              抢单（需在线）
 *   POST /:id/respond           指定单接 / 拒  { accept: true|false }
 *   POST /:id/start             开始护航
 *   POST /:id/submit            提交完成  { proofs: [截图地址], note }
 * 订单沟通
 *   GET  /:id/messages          消息列表  ?after=最后一条消息id（只取更新的，用于轮询）
 *   POST /:id/messages          发消息  { text }
 */
const express = require('express')
const db = require('../db')
const os = require('../services/orderService')
const pay = require('../services/pay')
const { audit } = require('../services/audit')
const { need } = require('../middleware/auth')
const { limit } = require('../middleware/rateLimit')
const { wrap, bad, notFound, forbidden, conflict } = require('../utils/errors')
const { clean, toId, now, r2 } = require('../utils/helpers')

const router = express.Router()
const { loadForClient, transition, addLog } = os

// 路由里的 :id 统一转成数字
router.param('id', (req, res, next, v) => {
  req.orderId = toId(v)
  if (!req.orderId) return next(notFound('订单不存在'))
  next()
})

// 读一行原始订单（不带名字），不存在报错
async function raw(id, trx = db) {
  const o = await trx('orders').where({ id }).first()
  if (!o) throw notFound('订单不存在')
  return o
}

// ================= 查询 =================

router.get('/', need(), wrap(async (req, res) => {
  const u = req.user
  const scope = String(req.query.scope || 'mine')
  const status = String(req.query.status || '').split(',').map((s) => s.trim()).filter((s) => os.STATUS.includes(s))
  const q = os.baseQuery().orderBy('o.created_at', 'desc').limit(Math.min(500, Number(req.query.limit) || 300))
  if (scope === 'mine') q.where('o.user_id', u.id)
  else if (scope === 'assigned') q.where('o.escort_id', u.id)
  else if (scope === 'pool') {
    if (u.role !== 'escort' && !os.isStaff(u)) throw forbidden()
    q.where('o.status', '待派单')
  } else if (!os.isStaff(u)) throw forbidden()
  else if (scope === 'user') q.where('o.user_id', toId(req.query.userId))
  if (status.length) q.whereIn('o.status', status)
  res.json((await q).map((r) => os.toClient(r)))
}))

// 工作台待办数
router.get('/todo', need('cs', 'admin'), wrap(async (req, res) => {
  const count = async (table, where) => Number((await db(table).where(where).count({ c: '*' }))[0].c)
  const countIn = async (statuses) => Number((await db('orders').whereIn('status', statuses).count({ c: '*' }))[0].c)
  const start = new Date(); start.setHours(0, 0, 0, 0)
  const today = await db('orders').where('paid_at', '>=', start.getTime()).select('status', 'amount')
  res.json({
    waitDispatch: await countIn(['待派单', '待接单']),
    refunding: await countIn(['退款中']),
    inProgress: await countIn(['已接单', '进行中', '待确认']),
    tickets: Number((await db('tickets').whereNot({ status: '已解决' }).count({ c: '*' }))[0].c),
    applications: await count('applications', { status: '待审核' }),
    withdrawals: await count('withdrawals', { status: '待审核' }),
    todayOrders: today.length,
    todayIncome: r2(today.filter((o) => o.status !== '已退款').reduce((s, o) => s + Number(o.amount), 0))
  })
}))

router.get('/:id', need(), wrap(async (req, res) => {
  res.json(await loadForClient(req.orderId, req.user))
}))

// ================= 老板 =================

// 下单：金额由服务器根据单子价格和规格计算
router.post('/', need('user'), limit({ windowSec: 60, max: 20 }), wrap(async (req, res) => {
  const b = req.body
  const gameId = clean(b.gameId, 64)
  const mode = b.mode === 'assign' ? 'assign' : 'dispatch'
  if (!gameId) throw bad('请填写游戏昵称 / ID')
  const product = await db('products').where({ id: toId(b.productId), on_sale: true }).first()
  if (!product) throw bad('单子不存在或已下架')
  const original = os.priceOf(product, b.spec)

  let escortId = null
  if (mode === 'assign') {
    escortId = toId(b.escortId)
    const e = escortId && await db('users').where({ id: escortId, role: 'escort', status: 'active' }).first()
    if (!e) throw bad('请选择护航')
  }

  // 优惠券：只检查能不能用，支付成功时才标记为已用
  let discount = 0, couponName = '', couponId = null
  if (b.couponId) {
    const c = await db('user_coupons').where({ id: toId(b.couponId), user_id: req.user.id }).whereNull('used_order_id').where('expire_at', '>', now()).first()
    if (!c) throw bad('优惠券不可用')
    if (original < Number(c.min_spend)) throw bad(`满 ${Number(c.min_spend)} 元才能使用这张券`)
    discount = Number(c.amount); couponName = c.name; couponId = c.id
  }

  const id = await db.transaction(async (trx) => {
    const [oid] = await trx('orders').insert({
      user_id: req.user.id, product_id: product.id, product_name: product.name, spec: b.spec, original, discount, coupon_name: couponName,
      coupon_id: couponId, amount: Math.max(0.01, r2(original - discount)), mode, escort_id: escortId, status: '待付款',
      game_id: gameId, note: clean(b.note, 200), created_at: now()
    })
    await addLog(trx, oid, '创建订单')
    await trx('users').where({ id: req.user.id }).update({ last_active_at: now() })
    return oid
  })
  res.json(await loadForClient(id, req.user))
}))

// 支付
router.post('/:id/pay', need('user'), wrap(async (req, res) => {
  const method = req.body.method === 'balance' ? 'balance' : 'wechat'
  const o = await raw(req.orderId)
  if (o.user_id !== req.user.id) throw notFound('订单不存在')
  if (o.status !== '待付款') throw conflict('订单状态已变化')
  if (o.coupon_id) {
    const c = await db('user_coupons').where({ id: o.coupon_id }).first()
    if (!c || c.used_order_id) throw bad('这张优惠券已被其他订单使用，请重新下单')
  }

  if (method === 'balance') {
    // 余额支付：扣余额和改订单状态放在同一个事务里，要么都成功，要么都不做
    await db.transaction(async (trx) => {
      const n = await trx('users').where({ id: req.user.id }).where('balance', '>=', o.amount).decrement('balance', o.amount)
      if (!n) throw bad('余额不足，请先充值或使用微信支付')
      if (!(await os.markPaid(trx, o, 'balance'))) throw conflict('订单状态已变化')
    })
    return res.json({ order: await loadForClient(o.id, req.user) })
  }

  // 微信支付
  const tradeNo = `O${o.id}T${Date.now()}`
  const p = await pay.createPayment({ tradeNo, amount: Number(o.amount), description: `${o.product_name}（${o.spec}）`, openid: req.user.openid })
  await db('orders').where({ id: o.id }).update({ trade_no: tradeNo })
  if (p.mockPaid) await db.transaction((trx) => os.markPaid(trx, o, 'wechat')) // 模拟模式：直接视为支付成功
  res.json({ order: await loadForClient(o.id, req.user), payParams: p.payParams })
}))

router.post('/:id/cancel', need('user'), wrap(async (req, res) => {
  await db.transaction(async (trx) => {
    await transition(trx, req.orderId, ['待付款'], { status: '已取消' }, { user_id: req.user.id }, '只有待付款订单可以取消')
    await addLog(trx, req.orderId, '老板取消订单')
  })
  res.json(await loadForClient(req.orderId, req.user))
}))

router.post('/:id/refund', need('user'), wrap(async (req, res) => {
  const reason = clean(req.body.reason, 200) || '老板申请退款'
  await db.transaction(async (trx) => {
    const o = await raw(req.orderId, trx)
    if (o.user_id !== req.user.id) throw notFound('订单不存在')
    if (!os.REFUNDABLE.includes(o.status)) throw bad('当前状态不能申请退款，请提交售后')
    await transition(trx, o.id, [o.status], { status: '退款中', prev_status: o.status, refund_reason: reason }, { user_id: req.user.id })
    await addLog(trx, o.id, `申请退款：${reason}`)
  })
  res.json(await loadForClient(req.orderId, req.user))
}))

router.post('/:id/confirm', need('user'), wrap(async (req, res) => {
  await raw(req.orderId).then((o) => { if (o.user_id !== req.user.id) throw notFound('订单不存在') })
  const ok = await db.transaction((trx) => os.finish(trx, req.orderId, '老板确认完成'))
  if (!ok) throw conflict('订单状态已变化')
  res.json(await loadForClient(req.orderId, req.user))
}))

router.post('/:id/reject', need('user'), wrap(async (req, res) => {
  const reason = clean(req.body.reason, 200) || '未说明'
  await db.transaction(async (trx) => {
    await transition(trx, req.orderId, ['待确认'], { status: '进行中' }, { user_id: req.user.id })
    await addLog(trx, req.orderId, `老板反馈还没完成：${reason}`)
  })
  res.json(await loadForClient(req.orderId, req.user))
}))

router.post('/:id/rate', need('user'), wrap(async (req, res) => {
  const score = Number(req.body.score)
  if (!(Number.isInteger(score) && score >= 1 && score <= 5)) throw bad('请选择评分')
  const n = await db('orders').where({ id: req.orderId, user_id: req.user.id, status: '已完成' }).whereNull('rating_score')
    .update({ rating_score: score, rating_text: clean(req.body.text, 500), rated_at: now() })
  if (!n) throw bad('只能评价已完成且未评价过的订单')
  res.json(await loadForClient(req.orderId, req.user))
}))

// ================= 客服 / 管理员 =================

router.post('/:id/refund/handle', need('cs', 'admin'), wrap(async (req, res) => {
  const approve = !!req.body.approve
  await db.transaction(async (trx) => {
    const o = await raw(req.orderId, trx)
    if (o.status !== '退款中') throw conflict('订单状态已变化')
    if (approve) {
      await transition(trx, o.id, ['退款中'], { status: '已退款', refunded_by: req.user.id, refunded_at: now() })
      if (o.pay_method === 'balance') await trx('users').where({ id: o.user_id }).increment('balance', o.amount)
      // 微信支付的订单：目前需要在微信支付商户平台手动退款（见 docs/项目指引.md「退款」一节）
      await addLog(trx, o.id, `${req.user.name} 同意退款${o.pay_method === 'balance' ? '，已退回余额' : '，原路退回'}`)
    } else {
      await transition(trx, o.id, ['退款中'], { status: o.prev_status || '待派单' })
      await addLog(trx, o.id, `${req.user.name} 拒绝退款，订单继续`)
    }
    await audit(req.user, approve ? '同意退款' : '拒绝退款', `#${o.id} ¥${Number(o.amount)}`, trx)
  })
  res.json(await loadForClient(req.orderId, req.user))
}))

router.post('/:id/dispatch', need('cs', 'admin'), wrap(async (req, res) => {
  const escortId = toId(req.body.escortId)
  const e = escortId && await db('users').where({ id: escortId, role: 'escort', status: 'active' }).first()
  if (!e) throw bad('请选择护航')
  await db.transaction(async (trx) => {
    const o = await raw(req.orderId, trx)
    const from = ['待派单', '待接单', '已接单']
    if (!from.includes(o.status)) throw conflict('订单状态已变化')
    const re = o.status === '已接单'
    await transition(trx, o.id, [o.status], { status: '已接单', escort_id: e.id, dispatched_at: o.dispatched_at || now() })
    await addLog(trx, o.id, `${req.user.name} ${re ? '改派' : '派单'}给 ${e.name}`)
    await audit(req.user, re ? '改派' : '派单', `#${o.id} → ${e.name}`, trx)
  })
  res.json(await loadForClient(req.orderId, req.user))
}))

// ================= 护航 =================

router.post('/:id/grab', need('escort'), wrap(async (req, res) => {
  if (!req.user.online) throw bad('请先切换到「接单中」')
  await db.transaction(async (trx) => {
    await transition(trx, req.orderId, ['待派单'], { status: '已接单', escort_id: req.user.id, dispatched_at: now() }, {}, '手慢了，这单已被接走')
    await addLog(trx, req.orderId, `${req.user.name} 抢单成功`)
  })
  res.json(await loadForClient(req.orderId, req.user))
}))

router.post('/:id/respond', need('escort'), wrap(async (req, res) => {
  const accept = !!req.body.accept
  await db.transaction(async (trx) => {
    const mine = { escort_id: req.user.id }
    if (accept) {
      await transition(trx, req.orderId, ['待接单'], { status: '已接单', dispatched_at: now() }, mine)
      await addLog(trx, req.orderId, `${req.user.name} 已接单`)
    } else {
      await transition(trx, req.orderId, ['待接单'], { status: '待派单', escort_id: null }, mine)
      await addLog(trx, req.orderId, `${req.user.name} 暂时无法接单，转客服派单`)
    }
  })
  // 拒单后这单不再属于自己，但仍在抢单大厅，能看到
  res.json(await loadForClient(req.orderId, req.user))
}))

router.post('/:id/start', need('escort'), wrap(async (req, res) => {
  await db.transaction(async (trx) => {
    await transition(trx, req.orderId, ['已接单'], { status: '进行中' }, { escort_id: req.user.id })
    await addLog(trx, req.orderId, '开始护航')
  })
  res.json(await loadForClient(req.orderId, req.user))
}))

router.post('/:id/submit', need('escort'), wrap(async (req, res) => {
  const proofs = (Array.isArray(req.body.proofs) ? req.body.proofs : []).map((s) => clean(s, 500)).filter((s) => /^(https?:\/\/|\/uploads\/)/.test(s)).slice(0, 9)
  if (!proofs.length) throw bad('请至少上传 1 张战绩截图')
  await db.transaction(async (trx) => {
    await transition(trx, req.orderId, ['进行中'], { status: '待确认', proofs: JSON.stringify(proofs), proof_note: clean(req.body.note, 500), submitted_at: now() }, { escort_id: req.user.id })
    await addLog(trx, req.orderId, `${req.user.name} 提交完成，等待老板确认`)
  })
  res.json(await loadForClient(req.orderId, req.user))
}))

// ================= 订单沟通 =================

// 检查能不能进这个订单的聊天：老板本人、接这单的护航、客服 / 管理员
async function chatGuard(req) {
  const o = await raw(req.orderId)
  const u = req.user
  const ok = os.isStaff(u) || (u.role === 'user' && o.user_id === u.id) || (u.role === 'escort' && o.escort_id === u.id)
  if (!ok) throw forbidden()
  return o
}

router.get('/:id/messages', need(), wrap(async (req, res) => {
  await chatGuard(req)
  const after = toId(req.query.after)
  const q = db('messages').where({ order_id: req.orderId }).orderBy('id', 'desc').limit(200)
  if (after) q.where('id', '>', after)
  const list = (await q).reverse()
  res.json(list.map((m) => ({ id: m.id, from: m.from_id, role: m.role, name: m.name, text: m.text, t: Number(m.created_at) })))
}))

router.post('/:id/messages', need(), limit({ windowSec: 60, max: 30 }), wrap(async (req, res) => {
  await chatGuard(req)
  const text = clean(req.body.text, 1000)
  if (!text) throw bad('消息不能为空')
  const m = { order_id: req.orderId, from_id: req.user.id, role: req.user.role, name: req.user.name, text, created_at: now() }
  const [id] = await db('messages').insert(m)
  res.json({ id, from: m.from_id, role: m.role, name: m.name, text, t: m.created_at })
}))

module.exports = router
