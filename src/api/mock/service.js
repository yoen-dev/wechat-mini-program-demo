// 售后工单 / 护航报名 / 用户管理接口（模拟）
import { db, save, nextId, respond, fail, audit, isStaff, nameOf } from './db.js'

export { TICKET_TYPES } from '../constants.js'

// ---------------- 售后工单 ----------------
const decorateT = (x) => ({ ...x, userName: nameOf(x.userId) })

export function createTicket(actor, { orderId, type, content }) {
  if (actor.role !== 'user') return fail('请先登录')
  if (!content || content.trim().length < 5) return fail('请把问题描述清楚（至少 5 个字）')
  const t = { id: nextId('ticket'), userId: actor.id, orderId: orderId || null, type: type || '其他', content: content.trim(), status: '待处理', createdAt: Date.now(), replies: [] }
  db().tickets.push(t)
  save()
  return respond(t)
}

export function listTickets(actor, { mine = false } = {}) {
  let l = db().tickets
  if (mine) l = l.filter((x) => x.userId === actor.id)
  else if (!isStaff(actor)) return fail('无权限')
  return respond(l.slice().sort((a, b) => b.createdAt - a.createdAt).map(decorateT))
}

/** 回复工单：员工回复会把状态改为处理中；老板也可以追加说明 */
export function replyTicket(actor, id, text, resolve = false) {
  const t = db().tickets.find((x) => x.id === id)
  if (!t || (!isStaff(actor) && t.userId !== actor.id)) return fail('工单不存在')
  if (text && text.trim()) t.replies.push({ by: actor.id, name: actor.name, role: actor.role, text: text.trim(), t: Date.now() })
  if (isStaff(actor)) {
    t.status = resolve ? '已解决' : '处理中'
    audit(actor, resolve ? '解决工单' : '回复工单', `#${t.id}`)
  } else if (t.status === '已解决') t.status = '待处理'
  save()
  return respond(decorateT(t))
}

// ---------------- 成为护航 ----------------
export function submitApplication(actor, { name, phone, rank, maps, intro }) {
  if (actor.role !== 'user') return fail('请先登录')
  if (!name || !name.trim()) return fail('请填写称呼')
  if (!/^1\d{10}$/.test(phone || '')) return fail('请填写正确的手机号')
  if (!rank || !rank.trim()) return fail('请填写段位')
  const d = db()
  if (d.applications.some((a) => a.userId === actor.id && a.status === '待审核')) return fail('你已经提交过了，请等待审核')
  const a = { id: nextId('application'), userId: actor.id, name: name.trim(), phone, rank: rank.trim(), maps: (maps || '').trim(), intro: (intro || '').trim(), status: '待审核', createdAt: Date.now() }
  d.applications.push(a)
  save()
  return respond(a)
}

export function myApplication(actor) {
  const l = db().applications.filter((a) => a.userId === actor.id).sort((a, b) => b.createdAt - a.createdAt)
  return respond(l[0] || null)
}

export function listApplications(actor) {
  if (!isStaff(actor)) return fail('无权限')
  return respond(db().applications.slice().sort((a, b) => (a.status === '待审核' ? -1 : 1) - (b.status === '待审核' ? -1 : 1) || b.createdAt - a.createdAt))
}

/** 通过后自动创建护航账号，返回账号和初始密码，由客服 / 管理员转告 */
export function handleApplication(actor, id, approve, note = '') {
  if (!isStaff(actor)) return fail('无权限')
  const d = db()
  const a = d.applications.find((x) => x.id === id)
  if (!a || a.status !== '待审核') return fail('状态已变化')
  a.status = approve ? '已通过' : '已拒绝'
  a.handledAt = Date.now()
  a.handler = actor.name
  a.note = note
  let account = null
  if (approve) {
    let n = d.users.filter((u) => u.role === 'escort').length + 1
    while (d.users.some((u) => u.account === 'hh' + String(n).padStart(2, '0'))) n++
    account = { account: 'hh' + String(n).padStart(2, '0'), password: '123456' }
    d.users.push({ id: nextId('user'), role: 'escort', name: '护航 ' + a.name, ...account, status: 'active', online: false,
      profile: { rank: a.rank, maps: a.maps, intro: a.intro }, createdAt: Date.now() })
    a.account = account.account
  }
  audit(actor, approve ? '通过护航报名' : '拒绝护航报名', a.name)
  save()
  return respond({ application: a, account })
}

// ---------------- 用户管理 ----------------
export function listCustomers(actor, keyword = '') {
  if (!isStaff(actor)) return fail('无权限')
  const d = db()
  const k = keyword.trim()
  const list = d.users.filter((u) => u.role === 'user' && (!k || u.name.includes(k) || (u.phone || '').includes(k)))
    .map((u) => {
      const os = d.orders.filter((o) => o.userId === u.id && o.paidAt)
      const spent = os.filter((o) => o.status !== '已退款').reduce((s, o) => s + o.amount, 0)
      return { id: u.id, name: u.name, phone: u.phone, status: u.status, createdAt: u.createdAt, orders: os.length, spent, balance: u.balance || 0, lastOrderAt: os.length ? Math.max(...os.map((o) => o.paidAt)) : null }
    })
    .sort((a, b) => b.spent - a.spent)
  return respond(list)
}

/** 拉黑 / 解除拉黑 */
export function toggleCustomer(actor, id, reason = '') {
  if (!isStaff(actor)) return fail('无权限')
  const u = db().users.find((x) => x.id === id && x.role === 'user')
  if (!u) return fail('用户不存在')
  u.status = u.status === 'active' ? 'disabled' : 'active'
  u.banReason = u.status === 'disabled' ? reason : ''
  audit(actor, u.status === 'disabled' ? '拉黑用户' : '解除拉黑', u.name + (reason ? `（${reason}）` : ''))
  save()
  return respond({ status: u.status })
}

// ---------------- 操作日志 ----------------
export function listLogs(actor) {
  if (actor.role !== 'admin') return fail('无权限')
  return respond(db().logs.slice().reverse())
}
