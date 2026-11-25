/**
 * 微信相关：拿老板的 openid（登录用），以及微信手机号一键绑定（getPhoneNumber，见文件下半部分）
 *
 * 一、登录：拿到老板的 openid（用户在本小程序里的唯一身份）
 * 三种方式（在 .env / 云托管环境变量里切换）：
 *  1. 云托管（WX_CLOUD=true，正式环境推荐）
 *     小程序用 wx.cloud.callContainer 调后端时，微信会自动在请求头 x-wx-openid 里带上用户的 openid，
 *     后端直接读取即可，不需要 AppSecret，也不用 code 去换。
 *     ⚠️ 安全：请在云托管控制台「服务设置」里关闭「公网访问」，只保留小程序内调用，
 *        否则外部请求可以自己伪造这个请求头冒充别人。
 *  2. 模拟（WX_MOCK=true，本地开发）：用前端传来的 code 拼一个假的 openid。
 *  3. 自己服务器（两者都关）：用 WX_APPID + WX_SECRET 调 code2Session 接口换 openid。
 */
const crypto = require('crypto')
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

/**
 * 微信手机号一键绑定：小程序 <button open-type="getPhoneNumber"> 拿到的 code 换成真实手机号
 * 官方文档：https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/user-info/phone-number/getPhoneNumber.html
 * 费用：微信按成功次数收费（每次约 0.03 元，每个小程序有 1000 次免费体验额度），费用从小程序账户余额里扣。
 *
 *  1. 云托管：走「开放接口服务」，不需要 access_token。
 *     ⚠️ 要在云托管控制台「云调用 → 微信令牌权限配置」里添加接口 /wxa/business/getuserphonenumber
 *  2. 模拟（WX_MOCK=true）：按 code 算一个固定的假手机号（139 开头）
 *  3. 自己服务器：用 WX_APPID + WX_SECRET 先换 access_token
 * @returns 11 位中国大陆手机号
 */
async function getPhoneNumber(code) {
  if (!code) throw new AppError('缺少手机号授权凭证')
  if (!config.wx.cloud && config.wx.mock) {
    const n = parseInt(crypto.createHash('md5').update(String(code)).digest('hex').slice(0, 8), 16) % 1e8
    return '139' + String(n).padStart(8, '0')
  }
  const url = config.wx.cloud
    ? 'http://api.weixin.qq.com/wxa/business/getuserphonenumber'
    : 'https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=' + await accessToken()
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) }).then((x) => x.json())
  const info = r.phone_info
  if (r.errcode || !info) {
    console.error('[获取手机号失败]', r)
    throw new AppError('获取手机号失败，请重试或用验证码绑定')
  }
  if (String(info.countryCode) !== '86') throw new AppError('目前只支持中国大陆手机号')
  return info.purePhoneNumber
}

// 自己服务器模式下的 access_token（2 小时有效，提前 5 分钟刷新）
let token = { value: '', expireAt: 0 }
async function accessToken() {
  if (token.value && Date.now() < token.expireAt) return token.value
  const url = 'https://api.weixin.qq.com/cgi-bin/token?' + new URLSearchParams({ grant_type: 'client_credential', appid: config.wx.appid, secret: config.wx.secret })
  const r = await fetch(url).then((x) => x.json())
  if (!r.access_token) {
    console.error('[获取 access_token 失败]', r)
    throw new AppError('微信接口暂时不可用，请稍后再试', 500)
  }
  token = { value: r.access_token, expireAt: Date.now() + (r.expires_in - 300) * 1000 }
  return token.value
}

module.exports = { getOpenid, getPhoneNumber }
