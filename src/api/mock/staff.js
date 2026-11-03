// 员工账号 / 护航资料接口（模拟）
import { db, save, nextId, respond, fail, audit, isAdmin, isStaff } from './db.js'

import { ROLE_NAME, STAFF_ROLES } from '../constants.js'
export { ROLE_NAME, STAFF_ROLES }

const pub = ({ password, openid, ...rest }) => rest

function escortStats(u) {
  const d = db()
  const mine = d.orders.filter((o) => o.escortId === u.id)
  const rated = mine.filter((o) => o.rating)
  return {
    load: mine.filter((o) => ['已接单', '进行中', '待确认'].includes(o.status)).length,
    done: mine.filter((o) => o.status === '已完成').length,
    rating: rated.length ? Math.round((rated.reduce((s, o) => s + o.rating.score, 0) / rated.length) * 10) / 10 : null,
    ratingCount: rated.length
  }
}

export function listStaff(actor, role = '') {
  if (!isStaff(actor)) return fail('无权限')
  return respond(db().users.filter((u) => STAFF_ROLES.includes(u.role) && (!role || u.role === role)).map(pub))
}

/**
 * 护航列表（老板指定护航、客服派单时用）
 * 带上在线状态、手上单数、评分，在线的排前面
 */
export function listEscorts({ onlineOnly = false } = {}) {
  const list = db().users
    .filter((u) => u.role === 'escort' && u.status === 'active' && (!onlineOnly || u.online))
    .map((u) => ({ id: u.id, name: u.name, online: !!u.online, profile: u.profile || {}, ...escortStats(u) }))
    .sort((a, b) => (b.online - a.online) || (a.load - b.load))
  return respond(list)
}

export function getEscort(id) {
  const u = db().users.find((x) => x.id === Number(id) && x.role === 'escort')
  if (!u) return fail('护航不存在')
  const reviews = db().orders.filter((o) => o.escortId === u.id && o.rating).sort((a, b) => b.rating.t - a.rating.t)
    .map((o) => ({ orderId: o.id, productName: o.productName, ...o.rating }))
  return respond({ ...pub(u), ...escortStats(u), reviews })
}

/** 护航切换接单状态 */
export function setOnline(actor, online) {
  const u = db().users.find((x) => x.id === actor.id && x.role === 'escort')
  if (!u) return fail('无权限')
  u.online = !!online
  save()
  return respond({ online: u.online })
}

/** 护航编辑资料（显示给老板看） */
export function saveProfile(actor, { rank, maps, intro }) {
  const u = db().users.find((x) => x.id === actor.id && x.role === 'escort')
  if (!u) return fail('无权限')
  u.profile = { rank: (rank || '').trim(), maps: (maps || '').trim(), intro: (intro || '').trim() }
  save()
  return respond(u.profile)
}

export function createStaff(actor, { role, name, account, password, profile }) {
  if (!isAdmin(actor)) return fail('无权限')
  if (!STAFF_ROLES.includes(role)) return fail('请选择角色')
  if (!name || !name.trim()) return fail('请填写名字')
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(account || '')) return fail('账号为 3-20 位字母、数字或下划线')
  if (!password || password.length < 6) return fail('初始密码至少 6 位')
  const d = db()
  if (d.users.some((u) => u.account === account)) return fail('账号已存在')
  const u = { id: nextId('user'), role, name: name.trim(), account, password, status: 'active', createdAt: Date.now() }
  if (role === 'escort') { u.online = false; u.profile = profile || { rank: '', maps: '', intro: '' } }
  d.users.push(u)
  audit(actor, '新建员工账号', `${ROLE_NAME[role]} ${u.name}（${account}）`)
  save()
  return respond(pub(u))
}

export function resetPassword(actor, id) {
  if (!isAdmin(actor)) return fail('无权限')
  const u = db().users.find((x) => x.id === id && STAFF_ROLES.includes(x.role))
  if (!u) return fail('账号不存在')
  u.password = '123456'
  audit(actor, '重置密码', u.name)
  save()
  return respond({ ok: true, password: '123456' })
}

export function toggleStaff(actor, id) {
  if (!isAdmin(actor)) return fail('无权限')
  if (id === actor.id) return fail('不能停用自己')
  const u = db().users.find((x) => x.id === id && STAFF_ROLES.includes(x.role))
  if (!u) return fail('账号不存在')
  u.status = u.status === 'active' ? 'disabled' : 'active'
  if (u.status !== 'active') u.online = false
  audit(actor, u.status === 'active' ? '启用账号' : '停用账号', u.name)
  save()
  return respond(pub(u))
}
