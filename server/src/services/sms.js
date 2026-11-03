/**
 * 短信验证码
 * 作用：生成验证码、发送短信、校验验证码。
 *
 * 模拟模式（SMS_MOCK=true）：不真发短信，验证码固定为 SMS_MOCK_CODE（默认 123456）。只能用于测试！
 * 正式模式（SMS_MOCK=false）：用阿里云短信服务发送。需要在 .env 填：
 *   SMS_ACCESS_KEY_ID / SMS_ACCESS_KEY_SECRET（阿里云 AccessKey）、SMS_SIGN_NAME（短信签名）、
 *   SMS_TEMPLATE_CODE（验证码模板，模板内容里的变量名要叫 code，例如「您的验证码为 ${code}，5 分钟内有效」）。
 *   换成腾讯云等其他服务商时，只需要改 sendAliyun 这个函数。
 * 注意：正式短信代码在拿到阿里云账号前没法实测，第一次上线前请先用自己的手机号测一遍。
 */
const crypto = require('crypto')
const config = require('../config')
const db = require('../db')
const { AppError } = require('../utils/errors')
const { isPhone } = require('../utils/helpers')

const VALID_MS = 5 * 60 * 1000 // 验证码 5 分钟有效
const RESEND_MS = 60 * 1000 // 同一手机号 60 秒内只能发一次
const MAX_ATTEMPTS = 5 // 输错 5 次作废

// 发送验证码
async function sendCode(phone, ip) {
  if (!isPhone(phone)) throw new AppError('请输入正确的手机号')
  const last = await db('sms_codes').where({ phone }).orderBy('id', 'desc').first()
  if (last && Date.now() - Number(last.created_at) < RESEND_MS) throw new AppError('发送太频繁，请 1 分钟后再试')
  // 同一手机号一天最多 10 条，防止被刷
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const [{ c }] = await db('sms_codes').where({ phone }).where('created_at', '>=', today.getTime()).count({ c: '*' })
  if (Number(c) >= 10) throw new AppError('今天发送次数太多了，请明天再试')

  const code = config.sms.mock ? config.sms.mockCode : String(crypto.randomInt(100000, 1000000))
  await db('sms_codes').insert({ phone, code, created_at: Date.now(), ip: String(ip || '').slice(0, 64) })
  if (!config.sms.mock) await sendAliyun(phone, code)
  return { mock: config.sms.mock }
}

// 校验验证码，正确则作废这条验证码（只能用一次）
async function verifyCode(phone, code) {
  if (!isPhone(phone)) throw new AppError('请输入正确的手机号')
  const row = await db('sms_codes').where({ phone, used: false }).orderBy('id', 'desc').first()
  if (!row || Date.now() - Number(row.created_at) > VALID_MS) throw new AppError('验证码已过期，请重新获取')
  if (row.attempts >= MAX_ATTEMPTS) throw new AppError('输错次数太多，请重新获取验证码')
  if (String(code) !== row.code) {
    await db('sms_codes').where({ id: row.id }).increment('attempts', 1)
    throw new AppError('验证码错误')
  }
  await db('sms_codes').where({ id: row.id }).update({ used: true })
}

// 阿里云短信 SendSms 接口（RPC 签名方式），文档：https://help.aliyun.com/document_detail/419273.html
async function sendAliyun(phone, code) {
  const s = config.sms
  if (!s.accessKeyId || !s.accessKeySecret || !s.signName || !s.templateCode) throw new AppError('短信服务未配置', 500)
  const params = {
    AccessKeyId: s.accessKeyId, Action: 'SendSms', Format: 'JSON', PhoneNumbers: phone, RegionId: 'cn-hangzhou',
    SignName: s.signName, SignatureMethod: 'HMAC-SHA1', SignatureNonce: crypto.randomUUID(), SignatureVersion: '1.0',
    TemplateCode: s.templateCode, TemplateParam: JSON.stringify({ code }), Timestamp: new Date().toISOString().replace(/\.\d+Z$/, 'Z'), Version: '2017-05-25'
  }
  const enc = (v) => encodeURIComponent(v).replace(/\+/g, '%20').replace(/\*/g, '%2A').replace(/%7E/g, '~')
  const query = Object.keys(params).sort().map((k) => `${enc(k)}=${enc(params[k])}`).join('&')
  const sign = crypto.createHmac('sha1', s.accessKeySecret + '&').update(`GET&${enc('/')}&${enc(query)}`).digest('base64')
  const r = await fetch(`https://dysmsapi.aliyuncs.com/?Signature=${enc(sign)}&${query}`).then((x) => x.json())
  if (r.Code !== 'OK') {
    console.error('[短信发送失败]', r)
    throw new AppError('短信发送失败，请稍后再试', 502)
  }
}

module.exports = { sendCode, verifyCode }
