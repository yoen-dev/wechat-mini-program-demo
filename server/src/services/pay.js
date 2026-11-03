/**
 * 微信支付
 * 作用：
 *  - createPayment：给订单或充值发起微信支付，返回小程序 uni.requestPayment 需要的参数；
 *  - queryPaid：向微信查询某笔支付是否真的成功（收到回调后再查一次，防止伪造回调）；
 *  - parseV3Notify：自己服务器模式下解析微信支付回调（验签 + 解密）。
 *
 * 三种模式（环境变量切换）：
 *  1. 模拟（PAY_MOCK=true）：不调用微信，直接返回 { mockPaid: true }，后端视为已支付。只能用于测试！
 *  2. 云托管（PAY_MODE=cloud，默认，推荐）：
 *     用微信云托管「开放接口服务」里的微信支付，不需要商户证书和密钥。
 *     准备：公司开通微信支付商户号 → 云托管控制台「设置 → 其他设置 → 微信支付配置」绑定商户号并授权
 *           → 环境变量填 WXPAY_MCHID（商户号）、CLOUD_ENV（环境 ID）、CLOUD_SERVICE（本服务名称）。
 *     支付成功后微信直接在内网回调本服务的 /api/pay/cloud-notify，不需要公网地址。
 *     文档：https://developers.weixin.qq.com/miniprogram/dev/wxcloudservice/wxcloudrun/src/development/pay/
 *  3. 直连 API v3（PAY_MODE=v3，以后换成自己服务器时用）：需要商户证书，见文件末尾。
 *
 * ⚠️ 正式支付代码在拿到商户号前没法实测。上线前务必用 0.01 元的单子完整走一遍「支付 → 回调 → 订单变已支付」，
 *    如果云托管的接口字段有变化，以上面文档为准修改 cloudUnifiedOrder / queryPaid。
 */
const crypto = require('crypto')
const fs = require('fs')
const config = require('../config')
const { AppError } = require('../utils/errors')

const cents = (yuan) => Math.round(Number(yuan) * 100) // 微信支付金额单位是「分」

// ======================= 对外方法 =======================

/**
 * 发起支付
 * @param tradeNo 我们自己的支付单号（订单 O+订单号+时间，充值 R+充值号+时间），回调时靠它找到是哪一笔
 * @param amount 金额（元）
 * @param description 商品描述，显示在老板的微信账单里
 * @param openid 付款人 openid（只有微信登录的老板才能用微信支付）
 * @param ip 付款人 IP
 */
async function createPayment({ tradeNo, amount, description, openid, ip }) {
  if (config.pay.mock) return { mockPaid: true }
  if (!openid) throw new AppError('请使用微信登录后再支付，或使用余额支付')
  if (config.pay.mode === 'v3') return v3Jsapi({ tradeNo, amount, description, openid })
  return cloudUnifiedOrder({ tradeNo, amount, description, openid, ip })
}

/**
 * 向微信查询这笔支付是否成功
 * @returns { paid: true/false, amount: 实付金额（元） }
 */
async function queryPaid(tradeNo) {
  if (config.pay.mock) return { paid: true, amount: null }
  const r = await cloudApi('/_/pay/queryorder', { out_trade_no: tradeNo, sub_mch_id: config.pay.mchid, nonce_str: nonce() })
  const d = r.respdata || {}
  return { paid: d.trade_state === 'SUCCESS', amount: d.total_fee !== undefined ? Number(d.total_fee) / 100 : null }
}

// ======================= 云托管模式 =======================

const nonce = () => crypto.randomBytes(16).toString('hex')

// 云托管里调用微信开放接口：走内网 http，不需要 access_token
async function cloudApi(path, body) {
  const r = await fetch('http://api.weixin.qq.com' + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  }).then((x) => x.json())
  if (r.errcode) {
    console.error(`[微信支付] ${path} 失败`, r)
    throw new AppError('支付服务暂时不可用，请稍后再试', 502)
  }
  return r
}

async function cloudUnifiedOrder({ tradeNo, amount, description, openid, ip }) {
  const r = await cloudApi('/_/pay/unifiedOrder', {
    body: description.slice(0, 40),
    openid,
    out_trade_no: tradeNo,
    spbill_create_ip: ip || '127.0.0.1',
    env_id: config.pay.cloudEnv,
    sub_mch_id: config.pay.mchid,
    total_fee: cents(amount),
    callback_type: 2, // 2 = 支付结果回调到云托管容器
    container: { service: config.pay.cloudService, path: '/api/pay/cloud-notify' }
  })
  const payment = r.respdata && r.respdata.payment
  if (!payment) throw new AppError('发起支付失败，请稍后再试', 502)
  return { payParams: payment } // { appId, timeStamp, nonceStr, package, signType, paySign }
}

// ======================= 直连 API v3 模式（以后用自己服务器时） =======================
// 需要额外配置：WXPAY_API_V3_KEY、WXPAY_SERIAL_NO、WXPAY_PRIVATE_KEY_PATH、WXPAY_NOTIFY_URL、WXPAY_PUBLIC_KEY_PATH
// 文档：https://pay.weixin.qq.com/doc/v3/merchant/4012791897

let privateKey = null
const loadKey = () => (privateKey = privateKey || fs.readFileSync(config.pay.privateKeyPath, 'utf8'))
const rsaSign = (message) => crypto.createSign('RSA-SHA256').update(message).sign(loadKey(), 'base64')

async function v3Jsapi({ tradeNo, amount, description, openid }) {
  const body = JSON.stringify({
    appid: config.wx.appid, mchid: config.pay.mchid, description: description.slice(0, 120), out_trade_no: tradeNo,
    notify_url: config.pay.notifyUrl, amount: { total: cents(amount), currency: 'CNY' }, payer: { openid }
  })
  const path = '/v3/pay/transactions/jsapi'
  const ts = Math.floor(Date.now() / 1000).toString()
  const n = nonce()
  const auth = `WECHATPAY2-SHA256-RSA2048 mchid="${config.pay.mchid}",nonce_str="${n}",signature="${rsaSign(`POST\n${path}\n${ts}\n${n}\n${body}\n`)}",timestamp="${ts}",serial_no="${config.pay.serialNo}"`
  const data = await fetch('https://api.mch.weixin.qq.com' + path, { method: 'POST', headers: { Authorization: auth, 'Content-Type': 'application/json', Accept: 'application/json' }, body }).then((x) => x.json())
  if (!data.prepay_id) {
    console.error('[微信支付下单失败]', data)
    throw new AppError('发起支付失败，请稍后再试', 502)
  }
  const pkg = `prepay_id=${data.prepay_id}`
  const nonceStr = nonce()
  const timeStamp = Math.floor(Date.now() / 1000).toString()
  return { payParams: { timeStamp, nonceStr, package: pkg, signType: 'RSA', paySign: rsaSign(`${config.wx.appid}\n${timeStamp}\n${nonceStr}\n${pkg}\n`) } }
}

// 解析 v3 回调：先验签确认来自微信，再用 APIv3 密钥解密
function parseV3Notify(headers, rawBody) {
  const pubPath = process.env.WXPAY_PUBLIC_KEY_PATH
  if (!pubPath) throw new AppError('未配置微信支付公钥', 500)
  const message = `${headers['wechatpay-timestamp']}\n${headers['wechatpay-nonce']}\n${rawBody}\n`
  const ok = crypto.createVerify('RSA-SHA256').update(message).verify(fs.readFileSync(pubPath, 'utf8'), headers['wechatpay-signature'] || '', 'base64')
  if (!ok) throw new AppError('签名错误', 401)
  const { resource } = JSON.parse(rawBody)
  const buf = Buffer.from(resource.ciphertext, 'base64')
  const decipher = crypto.createDecipheriv('aes-256-gcm', config.pay.apiV3Key, resource.nonce)
  decipher.setAuthTag(buf.subarray(buf.length - 16))
  decipher.setAAD(Buffer.from(resource.associated_data || ''))
  const tx = JSON.parse(Buffer.concat([decipher.update(buf.subarray(0, buf.length - 16)), decipher.final()]).toString('utf8'))
  return { tradeNo: tx.out_trade_no, success: tx.trade_state === 'SUCCESS', amount: tx.amount && tx.amount.total / 100 }
}

module.exports = { createPayment, queryPaid, parseV3Notify }
