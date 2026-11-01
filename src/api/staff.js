// 员工账号接口（模拟，管理员使用）
import { db, save, nextId, respond, fail } from './db.js'

export const ROLE_NAME = { user: '用户', escort: '护航', cs: '客服', admin: '管理员' }

const pub = ({ password, openid, ...rest }) => rest

export function listStaff(actor, role = '') {
  if (!['admin', 'cs'].includes(actor.role)) return fail('无权限')
  return respond(db().users.filter((u) => u.role !== 'user' && (!role || u.role === role)).map(pub))
}

/** 可接单的护航（派单 / 指定护航时用） */
export function listEscorts() {
  return respond(db().users.filter((u) => u.role === 'escort' && u.status === 'active').map((u) => ({ id: u.id, name: u.name })))
}

export function createStaff(actor, { role, name, account, password }) {
  if (actor.role !== 'admin') return fail('无权限')
  if (!['escort', 'cs', 'admin'].includes(role)) return fail('请选择角色')
  if (!name || !name.trim()) return fail('请填写名字')
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(account || '')) return fail('账号为 3-20 位字母、数字或下划线')
  if (!password || password.length < 6) return fail('初始密码至少 6 位')
  const d = db()
  if (d.users.some((u) => u.account === account)) return fail('账号已存在')
  const u = { id: nextId('user'), role, name: name.trim(), account, password, status: 'active', createdAt: Date.now() }
  d.users.push(u)
  save()
  return respond(pub(u))
}

export function resetPassword(actor, id) {
  if (actor.role !== 'admin') return fail('无权限')
  const u = db().users.find((x) => x.id === id && x.role !== 'user')
  if (!u) return fail('账号不存在')
  u.password = '123456'
  save()
  return respond({ ok: true, password: '123456' })
}

export function toggleStaff(actor, id) {
  if (actor.role !== 'admin') return fail('无权限')
  if (id === actor.id) return fail('不能停用自己')
  const u = db().users.find((x) => x.id === id && x.role !== 'user')
  if (!u) return fail('账号不存在')
  u.status = u.status === 'active' ? 'disabled' : 'active'
  save()
  return respond(pub(u))
}
