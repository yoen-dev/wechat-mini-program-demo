// 请求后端的统一入口
// 作用：所有真实接口都通过 request() 发请求：自动带上登录令牌、统一处理错误提示、登录过期自动跳登录页。
//
// 两种方式（打包时由 .env.cloud / .env.localapi 里的 VITE_API 决定）：
//   cloud：微信云托管。小程序里用 wx.cloud.callContainer 调用，不需要域名和备案，微信会自动带上用户 openid。
//          需要填 VITE_CLOUD_ENV（云托管环境 ID）和 VITE_CLOUD_SERVICE（服务名称）。
//   http ：普通 HTTP 请求到 VITE_API_BASE（本地联调：网页版 + 本机后端）。
import { session, getToken, setToken, clearSession } from '@/store/session.js'

const MODE = import.meta.env.VITE_API
const BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')
const CLOUD_ENV = import.meta.env.VITE_CLOUD_ENV
const CLOUD_SERVICE = import.meta.env.VITE_CLOUD_SERVICE || 'api'

let cloudReady = false
/** 初始化云开发（只做一次）。云托管模式下 callContainer 和上传图片都需要 */
export function initCloud() {
  if (MODE !== 'cloud' || cloudReady) return
  // #ifdef MP-WEIXIN
  wx.cloud.init({ env: CLOUD_ENV })
  cloudReady = true
  // #endif
}

// 发出请求，返回 { statusCode, data }
function send(method, path, data, header) {
  // #ifdef MP-WEIXIN
  if (MODE === 'cloud') {
    initCloud()
    return wx.cloud.callContainer({
      config: { env: CLOUD_ENV },
      path: '/api' + path,
      method,
      header: { 'X-WX-SERVICE': CLOUD_SERVICE, 'content-type': 'application/json', ...header },
      data
    })
  }
  // #endif
  return new Promise((resolve, reject) => {
    uni.request({
      url: BASE + '/api' + path, method, data, header: { 'content-type': 'application/json', ...header }, timeout: 15000,
      success: resolve, fail: reject
    })
  })
}

/**
 * 调用后端接口
 * @param method GET / POST / DELETE
 * @param path 接口路径，不带 /api，例如 '/orders'
 * @param data 请求参数（GET 会自动拼到网址后面）
 * 成功返回后端的数据；失败抛出 Error(提示文字)，页面里用 run() 包着会自动弹提示
 */
export async function request(method, path, data) {
  const token = getToken()
  const header = token ? { Authorization: 'Bearer ' + token } : {}
  // GET 参数拼到网址上（去掉空值）
  if (method === 'GET' && data) {
    const qs = Object.keys(data).filter((k) => data[k] !== undefined && data[k] !== null && data[k] !== '')
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(data[k])}`).join('&')
    if (qs) path += (path.includes('?') ? '&' : '?') + qs
    data = undefined
  }
  let res
  try {
    res = await send(method, path, data, header)
  } catch (e) {
    throw new Error('网络不太好，请稍后再试')
  }
  if (res.statusCode >= 200 && res.statusCode < 300) return res.data
  const message = (res.data && res.data.message) || `请求失败（${res.statusCode}）`
  // 登录过期 / 账号被停用：清掉登录状态，跳到登录页
  if (res.statusCode === 401 && session.user) {
    clearSession()
    setTimeout(() => uni.reLaunch({ url: '/pages/login/login' }), 800)
  }
  throw new Error(message)
}

export const get = (path, data) => request('GET', path, data)
export const post = (path, data = {}) => request('POST', path, data)
export const del = (path) => request('DELETE', path)
export { setToken }

/**
 * 微信支付：后端返回 payParams 时调起支付
 * 返回 true 表示用户付完了；取消支付返回 false
 */
export function requestPayment(payParams) {
  return new Promise((resolve, reject) => {
    uni.requestPayment({
      provider: 'wxpay', ...payParams,
      success: () => resolve(true),
      fail: (e) => (String(e.errMsg || '').includes('cancel') ? resolve(false) : reject(new Error('支付失败，请重试')))
    })
  })
}

/**
 * 上传一张图片，返回保存用的地址
 * 云托管：传到云托管自带的对象存储，返回 cloud:// 文件 ID（小程序 <image> 可直接显示）
 * http  ：传到后端 /api/upload，返回网址
 */
export async function uploadImage(filePath) {
  // #ifdef MP-WEIXIN
  if (MODE === 'cloud') {
    initCloud()
    const ext = (filePath.match(/\.(jpe?g|png|webp|gif)$/i) || ['', 'jpg'])[1]
    const r = await wx.cloud.uploadFile({
      config: { env: CLOUD_ENV },
      cloudPath: `uploads/${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${ext}`,
      filePath
    })
    return r.fileID
  }
  // #endif
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: BASE + '/api/upload', filePath, name: 'file', header: { Authorization: 'Bearer ' + getToken() },
      success: (r) => {
        let d = {}
        try { d = JSON.parse(r.data) } catch (e) { /* 忽略 */ }
        r.statusCode === 200 && d.url ? resolve(d.url) : reject(new Error(d.message || '上传失败'))
      },
      fail: () => reject(new Error('上传失败，请重试'))
    })
  })
}
