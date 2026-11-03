// 登录状态
// 作用：保存「当前是谁登录」和登录令牌（token），提供登录后跳转、页面权限检查等方法。
// 用户信息和令牌都存在本机（小程序 storage / 浏览器 localStorage），关掉再打开还是登录状态。
import { reactive } from 'vue'

const KEY = 'demo_session' // 当前用户信息
const TOKEN_KEY = 'api_token' // 后端发的登录令牌（只有接真实后端时才有）
export const session = reactive({ user: uni.getStorageSync(KEY) || null })

// 每种身份登录后进入的首页
export const HOME = {
  user: '/pages/index/index',
  escort: '/pages/staff/escort',
  cs: '/pages/staff/cs',
  admin: '/pages/staff/admin',
  owner: '/pages/staff/owner'
}

// ---------------- 令牌 ----------------
export const getToken = () => uni.getStorageSync(TOKEN_KEY) || ''
export const setToken = (t) => uni.setStorageSync(TOKEN_KEY, t)

/** 保存当前用户（登录成功、资料更新后调用） */
export function setSession(user) {
  session.user = user
  uni.setStorageSync(KEY, user)
}

/** 只清除登录状态，不跳转（登录过期时用） */
export function clearSession() {
  session.user = null
  uni.removeStorageSync(KEY)
  uni.removeStorageSync(TOKEN_KEY)
}

/** 退出登录，回到首页 */
export function logout() {
  clearSession()
  uni.reLaunch({ url: '/pages/index/index' })
}

/** 登录后按身份进入对应首页 */
export function goHome(user = session.user) {
  if (!user || user.role === 'user') uni.switchTab({ url: HOME.user })
  else uni.reLaunch({ url: HOME[user.role] })
}

/**
 * 页面守卫。在 onShow 里调用。
 * roles: 允许的角色；未登录则跳登录页，身份不对则回到自己的首页。返回是否放行。
 */
export function guard(roles) {
  const u = session.user
  if (!u) {
    uni.navigateTo({ url: '/pages/login/login' })
    return false
  }
  if (!roles.includes(u.role)) {
    goHome(u)
    return false
  }
  return true
}

/** 用户端需要登录才能做的操作（下单、看订单等）：没登录去登录，没绑手机去绑定 */
export function needUserLogin() {
  if (session.user && session.user.role === 'user' && session.user.phone) return true
  if (session.user && session.user.role === 'user' && !session.user.phone) {
    uni.navigateTo({ url: '/pages/login/bind-phone' })
    return false
  }
  uni.navigateTo({ url: '/pages/login/login' })
  return false
}
