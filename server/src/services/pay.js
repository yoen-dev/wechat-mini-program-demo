/**
 * 微信支付（JSAPI / 小程序支付，API v3）
 * 作用：
 *  - createPayment：给订单或充值创建微信支付，返回小程序调用 uni.requestPayment 需要的参数；
 *  - parseNotify：解析微信支付成功后发来的回调通知（验签 + 解密），得到是哪笔支付成功了。
 *
 * 模拟模式（PAY_MOCK=true）：不调用微信，createPayment 返回 { mockPaid: true }，后端直接把这笔视为已支付。只能用于测试！
 * 正式模式（PAY_MOCK=false）需要：
 *   1. 公司主体开通微信支付商户号，并在商户平台关联小程序 AppID；
 *   2. .env 填 WXPAY_MCHID（商户号）、WXPAY_API_V3_KEY（APIv3 密钥）、WXPAY_SERIAL_NO（商户 API 证书序列号）、
 *      WXPAY_PRIVATE_KEY_PATH（商户 API 证书私钥 apiclient_key.pem 的路径）、WXPAY_NOTIFY_URL（https://你的域名/api/pay/notify）、
 *      WXPAY_PUBLIC_KEY_PATH 和 WXPAY_PUBLIC_KEY_ID（商户平台下载的「微信支付公钥」，用来验证回调确实来自微信）。
 * 注意：正式支付代码在拿到商户号前没法实测，上线前务必先用 0.01 元的单子完整走一遍「支付 → 回调 → 订单变已支付」。
 * 官方文档：https://pay.weixin.qq.com/doc/v3/merchant/4012791897
 */
const crypto = require('crypto')
const fs = require('fs')
const config = require('../config')
const { AppError } = require('../utils/errors')

const API = 'https://api.mch.weixin.qq.com'
let privateKey = null
const loadKey = () => (privateKey = privateKey || fs.readFileSync(config.pay.privateKeyPath, 'utf8'))

// 用商户私钥签名（请求微信接口和生成小程序支付参数都要用）
const rsaSign = (message) => crypto.createSign('RSA-SHA256').update(message).sign(loadKey(), 'base64')

/**
 * 创建支付
 * @param tradeNo 我们自己的支付单号（订单用 O+订单号+时间，充值用 R+充值号+时间），回调时靠它找到是哪笔
 * @param amount 金额（元）
 * @param description 商品描述，显示在用户的微信账单里
 * @param openid 付款用户的 openid（只有微信登录的用户才能用微信支付）
 */
async function createPayment({ tradeNo, amount, description, openid }) {
  if (config.pay.mock) return { mockPaid: true }
  if (!openid) throw new AppError('请使用微信登录后再支付')
  const body = JSON.stringify({
    appid: config.wx.appid, mchid: config.pay.mchid, description: description.slice(0, 120), out_trade_no: tradeNo,
    notify_url: config.pay.notifyUrl, amount: { total: Math.round(amount * 100), currency: 'CNY' }, payer: { openid }
  })
  const path = '/v3/pay/transactions/jsapi'
  const ts = Math.floor(Date.now() / 1000).toString()
  const nonce = crypto.randomBytes(16).toString('hex')
  const signature = rsaSign(`POST\n${path}\n${ts}\n${nonce}\n${body}\n`)
  const authHeader = `WECHATPAY2-SHA256-RSA2048 mchid="${config.pay.mchid}",nonce_str="${nonce}",signature="${signature}",timestamp="${ts}",serial_no="${config.pay.serialNo}"`
  const r = await fetch(API + path, { method: 'POST', headers: { Authorization: authHeader, 'Content-Type': 'application/json', Accept: 'application/json' }, body })
  const data = await r.json()
  if (!data.prepay_id) {
    console.error('[微信支付下单失败]', data)
    throw new AppError('发起支付失败，请稍后再试', 502)
  }
  // 小程序端 uni.requestPayment 需要的参数
  const pkg = `prepay_id=${data.prepay_id}`
  const nonceStr = crypto.randomBytes(16).toString('hex')
  const timeStamp = Math.floor(Date.now() / 1000).toString()
  const paySign = rsaSign(`${config.wx.appid}\n${timeStamp}\n${nonceStr}\n${pkg}\n`)
  return { payParams: { timeStamp, nonceStr, package: pkg, signType: 'RSA', paySign } }
}

/**
 * 解析支付回调
 * @param headers 请求头（用来验签）
 * @param rawBody 原始请求体字符串（验签必须用原文）
 * @returns { tradeNo, transactionId, success }
 */
function parseNotify(headers, rawBody) {
  // 1. 验证签名，确认通知确实来自微信支付
  const pubPath = process.env.WXPAY_PUBLIC_KEY_PATH
  if (!pubPath) throw new AppError('未配置微信支付公钥', 500)
  const message = `${headers['wechatpay-timestamp']}\n${headers['wechatpay-nonce']}\n${rawBody}\n`
  const ok = crypto.createVerify('RSA-SHA256').update(message).verify(fs.readFileSync(pubPath, 'utf8'), headers['wechatpay-signature'] || '', 'base64')
  if (!ok) throw new AppError('签名错误', 401)
  // 2. 用 APIv3 密钥解密通知内容（AES-256-GCM）
  const { resource } = JSON.parse(rawBody)
  const buf = Buffer.from(resource.ciphertext, 'base64')
  const decipher = crypto.createDecipheriv('aes-256-gcm', config.pay.apiV3Key, resource.nonce)
  decipher.setAuthTag(buf.subarray(buf.length - 16))
  decipher.setAAD(Buffer.from(resource.associated_data || ''))
  const plain = Buffer.concat([decipher.update(buf.subarray(0, buf.length - 16)), decipher.final()]).toString('utf8')
  const tx = JSON.parse(plain)
  return { tradeNo: tx.out_trade_no, transactionId: tx.transaction_id, success: tx.trade_state === 'SUCCESS', amount: tx.amount && tx.amount.total / 100 }
}

module.exports = { createPayment, parseNotify }
