// 登录相关接口（真实后端版）  对应后端 server/src/routes/auth.js
// 函数名和参数与模拟版 src/api/mock/auth.js 完全一致，页面不用改。
import { get, post, setToken } from './request.js'

export const DEMO_SMS_CODE = '' // 真实环境没有固定验证码

function deviceCode() {
  // 非小程序环境（网页联调）没有 uni.login，用本机随机 id 当 code，后端模拟模式会转成 openid
  let id = uni.getStorageSync('demo_openid')
  if (!id) { id = 'h5-' + Math.random().toString(36).slice(2, 10); uni.setStorageSync('demo_openid', id) }
  return id
}

// 拿微信登录 code（云托管模式后端直接从请求头读 openid，这个 code 不会用到，但不影响）
function wxCode() {
  return new Promise((resolve) => {
    // #ifdef MP-WEIXIN
    uni.login({ provider: 'weixin', success: (r) => resolve(r.code), fail: () => resolve('') })
    return
    // #endif
    resolve(deviceCode())
  })
}

/** 微信登录。返回 { user, needPhone }。openid 参数只在网页联调时用来模拟指定用户 */
export async function wxLogin({ openid, nickname } = {}) {
  const code = openid || (await wxCode())
  const r = await post('/auth/wx', { code, nickname })
  setToken(r.token)
  return { user: r.user, needPhone: r.needPhone }
}

/** 发短信验证码 → { ok, demoCode }（demoCode 只有后端开着模拟短信时才有） */
export const sendSmsCode = (phone) => post('/auth/sms', { phone })

/** 微信用户绑定手机号，返回新的用户信息 */
export async function bindPhone(userId, phone, code) {
  return (await post('/auth/bind-phone', { phone, code })).user
}

/** 员工账号密码登录，返回用户信息 */
export async function staffLogin(account, password) {
  const r = await post('/auth/login', { account: account.trim(), password })
  setToken(r.token)
  return r.user
}

/** 手机号 + 验证码登录（没注册自动注册） */
export async function phoneLogin(phone, code) {
  const r = await post('/auth/phone', { phone, code })
  setToken(r.token)
  return r.user
}

/** 修改密码：成功后后端发新令牌，其他设备上的登录会失效 */
export async function changePassword(userId, oldPassword, newPassword) {
  const r = await post('/auth/password', { oldPassword, newPassword })
  setToken(r.token)
  return { ok: true }
}

/** 当前登录用户的最新信息 */
export const getUser = () => get('/auth/me')
