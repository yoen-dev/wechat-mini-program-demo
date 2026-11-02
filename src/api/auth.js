// 登录相关接口（模拟）
// 真实流程：
//   用户：wx.login 拿 code → 后端换 openid → 未绑定手机则要求绑定 → 后端校验短信验证码 → 返回 token
//   员工：账号 + 密码 → 后端校验 → 返回 token 和角色
import { db, save, nextId, respond, fail } from './db.js'

export const DEMO_SMS_CODE = '123456'
const sent = {} // phone -> 最近一次发送时间

function publicUser(u) {
  const { password, openid, ...rest } = u
  return rest
}

function deviceOpenid() {
  let id = uni.getStorageSync('demo_openid')
  if (!id) { id = 'mock-' + Math.random().toString(36).slice(2, 10); uni.setStorageSync('demo_openid', id) }
  return id
}

/** 微信一键登录。返回 { user, needPhone } */
export function wxLogin({ openid, nickname } = {}) {
  const d = db()
  const oid = openid || deviceOpenid()
  let u = d.users.find((x) => x.role === 'user' && x.openid === oid)
  if (!u) {
    u = { id: nextId('user'), role: 'user', name: nickname || '微信用户', openid: oid, phone: '', status: 'active', createdAt: Date.now() }
    d.users.push(u)
    save()
  }
  if (u.status !== 'active') return fail('账号已被停用，请联系客服')
  u.lastActiveAt = Date.now()
  save()
  return respond({ user: publicUser(u), needPhone: !u.phone })
}

/** 发送短信验证码（演示环境固定为 123456） */
export function sendSmsCode(phone) {
  if (!/^1\d{10}$/.test(phone)) return fail('请输入正确的手机号')
  const last = sent[phone] || 0
  if (Date.now() - last < 60000) return fail('发送太频繁，请稍后再试')
  sent[phone] = Date.now()
  return respond({ ok: true, demoCode: DEMO_SMS_CODE })
}

/** 绑定手机号 */
export function bindPhone(userId, phone, code) {
  if (!/^1\d{10}$/.test(phone)) return fail('请输入正确的手机号')
  if (code !== DEMO_SMS_CODE) return fail('验证码错误')
  const d = db()
  const u = d.users.find((x) => x.id === userId)
  if (!u) return fail('用户不存在')
  const other = d.users.find((x) => x.role === 'user' && x.phone === phone && x.id !== userId)
  if (other) return fail('该手机号已绑定其他微信')
  u.phone = phone
  save()
  return respond(publicUser(u))
}

/** 账号密码登录（账号只能由管理员在后台创建，登录后按账号身份进入对应界面） */
export function staffLogin(account, password) {
  const d = db()
  const u = d.users.find((x) => x.role !== 'user' && x.account === account.trim())  // 护航 / 客服 / 管理员 / 负责人
  if (!u || u.password !== password) return fail('账号或密码错误')
  if (u.status !== 'active') return fail('账号已停用，请联系管理员')
  return respond(publicUser(u))
}

export function changePassword(userId, oldPwd, newPwd) {
  const u = db().users.find((x) => x.id === userId)
  if (!u || u.password !== oldPwd) return fail('原密码错误')
  if (!newPwd || newPwd.length < 6) return fail('新密码至少 6 位')
  u.password = newPwd
  save()
  return respond({ ok: true })
}

export function getUser(id) {
  const u = db().users.find((x) => x.id === id)
  return u ? respond(publicUser(u)) : fail('用户不存在')
}

/** 手机号 + 验证码登录：已注册直接登录，没注册自动建号 */
export function phoneLogin(phone, code) {
  if (!/^1\d{10}$/.test(phone)) return fail('请输入正确的手机号')
  if (code !== DEMO_SMS_CODE) return fail('验证码错误')
  const d = db()
  let u = d.users.find((x) => x.phone === phone)
  if (!u) {
    u = { id: nextId('user'), role: 'user', name: '用户' + phone.slice(-4), phone, status: 'active', createdAt: Date.now() }
    d.users.push(u)
    save()
  }
  if (u.status !== 'active') return fail('账号已被停用，请联系客服')
  u.lastActiveAt = Date.now()
  save()
  return respond(publicUser(u))
}
