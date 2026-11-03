/**
 * 数据格式转换
 * 作用：数据库里的字段是下划线命名（created_at），前端用驼峰（createdAt），
 *       这里统一把数据库的一行转成前端需要的对象格式，前端页面不用关心数据库长什么样。
 * 改了表结构（加字段）后，如果前端要用，记得在对应的函数里加上。
 */
const { parseJson } = require('../utils/helpers')

// 用户（不返回密码、openid、token_version 等敏感字段）
function user(u) {
  if (!u) return null
  const o = {
    id: u.id, role: u.role, name: u.name, account: u.account || undefined, phone: u.phone || '',
    status: u.status, banReason: u.ban_reason || '', createdAt: Number(u.created_at), lastActiveAt: u.last_active_at ? Number(u.last_active_at) : null
  }
  if (u.role === 'user') o.balance = Number(u.balance)
  if (u.role === 'escort') {
    o.online = !!u.online
    o.profile = { rank: u.profile_rank || '', maps: u.profile_maps || '', intro: u.profile_intro || '' }
  }
  return o
}

function product(p) {
  if (!p) return null
  return {
    id: p.id, name: p.name, price: Number(p.price), desc: p.description, cats: parseJson(p.cats, []), tags: parseJson(p.tags, []),
    points: parseJson(p.points, []), onSale: !!p.on_sale, sort: p.sort
  }
}

function banner(b) {
  return { id: b.id, title: b.title, url: b.url, src: b.url, sort: b.sort }
}

const n = (v) => (v === null || v === undefined ? null : Number(v))

/**
 * 订单
 * extra 里可以带上：logs（进度时间线）、escortName、userName
 */
function order(o, extra = {}) {
  if (!o) return null
  return {
    id: o.id, userId: o.user_id, productId: o.product_id, productName: o.product_name, spec: o.spec,
    original: Number(o.original), discount: Number(o.discount), couponName: o.coupon_name, couponId: o.coupon_id,
    amount: Number(o.amount), mode: o.mode, escortId: o.escort_id, status: o.status, prevStatus: o.prev_status,
    gameId: o.game_id, note: o.note, payMethod: o.pay_method, proofs: parseJson(o.proofs, []), proofNote: o.proof_note || '',
    refundReason: o.refund_reason || '', refundedBy: o.refunded_by, escortShare: n(o.escort_share),
    rating: o.rating_score ? { score: o.rating_score, text: o.rating_text || '', t: n(o.rated_at) } : null,
    createdAt: n(o.created_at), paidAt: n(o.paid_at), dispatchedAt: n(o.dispatched_at), submittedAt: n(o.submitted_at),
    completedAt: n(o.completed_at), refundedAt: n(o.refunded_at),
    logs: extra.logs || [], escortName: extra.escortName || '', userName: extra.userName || ''
  }
}

module.exports = { user, product, banner, order, n }
