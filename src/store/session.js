// 登录态。真实环境这里还会存后端返回的 token。
import { reactive } from 'vue'

const KEY = 'demo_session'
export const session = reactive({ user: uni.getStorageSync(KEY) || null })

export const HOME = {
  user: '/pages/index/index',
  escort: '/pages/staff/escort',
  cs: '/pages/staff/cs',
  admin: '/pages/staff/admin'
}

export function setSession(user) {
  session.user = user
  uni.setStorageSync(KEY, user)
}

export function logout() {
  session.user = null
  uni.removeStorageSync(KEY)
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

/** 用户端需要登录才能做的操作（下单、看订单等） */
export function needUserLogin() {
  if (session.user && session.user.role === 'user' && session.user.phone) return true
  if (session.user && session.user.role === 'user' && !session.user.phone) {
    uni.navigateTo({ url: '/pages/login/bind-phone' })
    return false
  }
  uni.navigateTo({ url: '/pages/login/login' })
  return false
}
