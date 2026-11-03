/**
 * 微信小程序登录
 * 作用：小程序端调用 uni.login 拿到一次性 code，后端用 code 向微信换取用户的 openid（用户在本小程序里的唯一身份）。
 *
 * 模拟模式（.env 里 WX_MOCK=true，拿到 AppID 之前用）：
 *   不请求微信，直接把 code 当成 openid 的一部分，方便本地和网页版测试。
 * 正式模式（WX_MOCK=false）：
 *   需要在 .env 填 WX_APPID 和 WX_SECRET（微信公众平台 → 开发管理 → 开发设置）。
 */
const config = require('../config')
const { AppError } = require('../utils/errors')

async function code2session(code) {
  if (!code) throw new AppError('缺少登录凭证')
  if (config.wx.mock) return { openid: 'mock_' + String(code).slice(0, 40) }

  // 官方接口文档：https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/user-login/code2Session.html
  const url = 'https://api.weixin.qq.com/sns/jscode2session?' + new URLSearchParams({
    appid: config.wx.appid, secret: config.wx.secret, js_code: code, grant_type: 'authorization_code'
  })
  const r = await fetch(url).then((x) => x.json())
  if (!r.openid) {
    console.error('[微信登录失败]', r)
    throw new AppError('微信登录失败，请重试')
  }
  return { openid: r.openid, unionid: r.unionid }
}

module.exports = { code2session }
