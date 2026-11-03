/**
 * 订单核心逻辑
 * 作用：订单状态流转、支付成功处理、完成结算、超时自动确认等，被 routes/orders.js、routes/pay.js、jobs/autoConfirm.js 共用。
 *
 * 订单状态流转（和前端 src/api/mock/orders.js 顶部说明一致）：
 *   待付款 ──支付──▶ 待派单（客服派单）/ 待接单（指定护航）
 *   待派单 ──客服派单 / 护航抢单──▶ 已接单
 *   待接单 ──护航接单──▶ 已接单        ──护航拒单──▶ 待派单
 *   已接单 ──开始──▶ 进行中 ──护航提交完成（附战绩截图）──▶ 待确认
 *   待确认 ──老板确认 / 超时自动确认──▶ 已完成（护航分成此时入账）
 *   待确认 ──老板反馈「还没完成」──▶ 进行中
 *   待派单 / 待接单 / 已接单 ──老板申请退款──▶ 退款中 ──同意──▶ 已退款（拒绝则回到原状态）
 *   待付款 ──取消──▶ 已取消
 *
 * 防止并发出错的做法：
 *   改状态时一律用「UPDATE … WHERE id=? AND status=旧状态」，看影响行数；
 *   两个人同时操作（比如两个护航同时抢一单），只有一个能改成功，另一个会收到「手慢了」。
 */
const db = require('../db')
const settings = require('./settings')
const serialize = require('./serialize')
const { AppError, conflict, notFound } = require('../utils/errors')
const { now } = require('../utils/helpers')

const STATUS = ['待付款', '待派单', '待接单', '已接单', '进行中', '待确认', '已完成', '退款中', '已退款', '已取消']
const REFUNDABLE = ['待派单', '待接单', '已接单'] // 可以申请退款的状态
const ACTIVE = ['待派单', '待接单', '已接单', '进行中', '待确认'] // 进行中的单
const STAFF = ['cs', 'admin'] // 能处理订单的员工（管理员拥有客服的全部权限）

const isStaff = (u) => !!u && STAFF.includes(u.role)

// 查订单时顺便带上老板和护航的名字
function baseQuery(trx = db) {
  return trx('orders as o')
    .leftJoin('users as eu', 'eu.id', 'o.escort_id')
    .leftJoin('users as uu', 'uu.id', 'o.user_id')
    .select('o.*', 'eu.name as escort_name', 'uu.name as user_name')
}

// 一行数据 → 前端格式
const toClient = (row, logs) => serialize.order(row, { logs, escortName: row.escort_name, userName: row.user_name })

// 谁能看这个订单：员工都能看；老板只能看自己的；护航能看派给自己的和抢单大厅里的
function canSee(o, u) {
  if (!u) return false
  if (isStaff(u)) return true
  if (u.role === 'user') return o.user_id === u.id
  if (u.role === 'escort') return o.escort_id === u.id || o.status === '待派单'
  return false
}

// 读取单个订单（含进度时间线），不存在或无权查看时报错
async function loadForClient(id, u, trx = db) {
  const row = await baseQuery(trx).where('o.id', id).first()
  if (!row || (u && !canSee(row, u))) throw notFound('订单不存在')
  const logs = await trx('order_logs').where({ order_id: id }).orderBy('id').select('created_at as t', 'text')
  return toClient(row, logs.map((l) => ({ t: Number(l.t), text: l.text })))
}

// 写一条进度记录
const addLog = (trx, orderId, text) => trx('order_logs').insert({ order_id: orderId, text: String(text).slice(0, 255), created_at: now() })

/**
 * 有条件地改状态（核心防并发方法）
 * @param where 额外条件，例如 { escort_id: 3 } 表示必须是这个护航的单
 * @param from 允许的旧状态（数组）
 * @param patch 要更新的字段
 * @param msg 改失败时提示的话
 */
async function transition(trx, id, from, patch, where = {}, msg) {
  const n = await trx('orders').where({ id, ...where }).whereIn('status', from).update(patch)
  if (!n) throw conflict(msg)
}

/**
 * 支付成功（余额支付、微信支付回调、模拟支付都走这里）
 * 待付款 → 待派单 / 待接单；同时把使用的优惠券标记为已用
 * 返回 true 表示这次真的改了状态（回调重复通知时返回 false，不重复处理）
 */
async function markPaid(trx, order, method) {
  const next = order.mode === 'assign' ? '待接单' : '待派单'
  const n = await trx('orders').where({ id: order.id, status: '待付款' }).update({ status: next, pay_method: method, paid_at: now() })
  if (!n) return false
  if (order.coupon_id) {
    const used = await trx('user_coupons').where({ id: order.coupon_id }).whereNull('used_order_id').update({ used_order_id: order.id })
    if (!used) console.warn(`[优惠券] 订单 #${order.id} 的优惠券已被其他订单使用`)
  }
  let text = '支付成功，等待客服派单'
  if (order.mode === 'assign') {
    const e = await trx('users').where({ id: order.escort_id }).first('name')
    text = `支付成功，等待 ${(e && e.name) || '护航'} 接单`
  }
  await addLog(trx, order.id, text)
  return true
}

/**
 * 完成结算：待确认 → 已完成，按当前分成比例计算护航分成
 * 返回 true 表示改成功
 */
async function finish(trx, id, text) {
  const rate = Number(await settings.get('shareRate', trx))
  const n = await trx('orders').where({ id, status: '待确认' })
    .update({ status: '已完成', completed_at: now(), escort_share: trx.raw('ROUND(amount * ?, 2)', [rate]) })
  if (n) await addLog(trx, id, text)
  return !!n
}

/**
 * 超时自动确认：护航提交完成后，老板超过 N 小时没确认，系统自动确认
 * 由 jobs/autoConfirm.js 每分钟调用一次；返回本次自动确认的订单数
 */
async function autoConfirm() {
  const hours = Number(await settings.get('autoConfirmHours')) || 0
  if (!hours) return 0
  const ids = await db('orders').where({ status: '待确认' }).where('submitted_at', '<', now() - hours * 3600 * 1000).pluck('id')
  let count = 0
  for (const id of ids) {
    await db.transaction(async (trx) => {
      if (await finish(trx, id, `超过 ${hours} 小时未确认，系统自动确认完成`)) count++
    })
  }
  return count
}

/**
 * 「顺便」检查一次超时自动确认，最多 30 秒一次
 * 云托管没人访问时实例会缩到 0，定时任务不运行；所以在有人查订单时也触发一下，保证状态及时更新
 */
let lastAuto = 0
function autoConfirmSoon() {
  if (Date.now() - lastAuto < 30 * 1000) return Promise.resolve()
  lastAuto = Date.now()
  return autoConfirm().catch((e) => console.error('[自动确认] 出错：', e.message))
}

/**
 * 计算下单金额（以服务器的价格为准，不信任前端传来的金额）
 * 规格倍数和前端 src/api/constants.js 的 SPECS 保持一致，改的时候两边一起改
 */
const SPECS = { 单次: 1, 三次套餐: 2.73, 五次套餐: 4.41 }
function priceOf(product, spec) {
  const rate = SPECS[spec]
  if (!rate) throw new AppError('请选择规格')
  return Math.round(Number(product.price) * rate)
}

module.exports = { STATUS, REFUNDABLE, ACTIVE, SPECS, isStaff, baseQuery, toClient, canSee, loadForClient, addLog, transition, markPaid, finish, autoConfirm, autoConfirmSoon, priceOf }
