/**
 * 微信小程序登录：拿到老板的 openid（用户在本小程序里的唯一身份）
 *
 * 三种方式（在 .env / 云托管环境变量里切换）：
 *  1. 云托管（WX_CLOUD=true，正式环境推荐）
 *     小程序用 wx.cloud.callContainer 调后端时，微信会自动在请求头 x-wx-openid 里带上用户的 openid，
 *     后端直接读取即可，不需要 AppSecret，也不用 code 去换。
 *     ⚠️ 安全：请在云托管控制台「服务设置」里关闭「公网访问」，只保留小程序内调用，
 *        否则外部请求可以自己伪造这个请求头冒充别人。
 *  2. 模拟（WX_MOCK=true，本地开发）：用前端传来的 code 拼一个假的 openid。
 *  3. 自己服务器（两者都关）：用 WX_APPID + WX_SECRET 调 code2Session 接口换 openid。
 */
const config = require('../config')
const { AppError } = require('../utils/errors')

/**
 * @param req 当前请求（云托管模式从请求头取 openid）
 * @param code 小程序 uni.login 拿到的一次性 code（非云托管模式用）
 */
async function getOpenid(req, code) {
  if (config.wx.cloud) {
    const openid = req.headers['x-wx-openid']
    if (!openid) throw new AppError('请在微信小程序内登录')
    return String(openid).slice(0, 64)
  }
  if (!code) throw new AppError('缺少登录凭证')
  if (config.wx.mock) return 'mock_' + String(code).slice(0, 40)

  // 官方接口文档：https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/user-login/code2Session.html
  const url = 'https://api.weixin.qq.com/sns/jscode2session?' + new URLSearchParams({
    appid: config.wx.appid, secret: config.wx.secret, js_code: code, grant_type: 'authorization_code'
  })
  const r = await fetch(url).then((x) => x.json())
  if (!r.openid) {
    console.error('[微信登录失败]', r)
    throw new AppError('微信登录失败，请重试')
  }
  return r.openid
}

module.exports = { getOpenid }
