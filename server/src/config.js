/**
 * 配置读取
 * 作用：从 server/.env 读取所有配置，整理成一个对象给其他文件用。
 * 修改配置请改 .env，不要改这里；新增配置项时在这里加一行并在 .env.example 里说明。
 */
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const env = process.env
const bool = (v, d = false) => (v === undefined || v === '' ? d : ['1', 'true', 'yes'].includes(String(v).toLowerCase()))
const num = (v, d) => (v === undefined || v === '' || isNaN(Number(v)) ? d : Number(v))

const config = {
  env: env.NODE_ENV || 'development',
  isProd: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  port: num(env.PORT, 3000),
  publicUrl: (env.PUBLIC_URL || 'http://localhost:3000').replace(/\/$/, ''),

  // 数据库
  db: {
    host: env.DB_HOST || '127.0.0.1',
    port: num(env.DB_PORT, 3306),
    user: env.DB_USER || 'root',
    password: env.DB_PASSWORD || '',
    database: env.DB_NAME || 'escort'
  },

  // 登录令牌
  jwtSecret: env.JWT_SECRET || 'dev-only-secret-change-me',
  jwtDays: num(env.JWT_DAYS, 30),

  // 微信小程序
  wx: { mock: bool(env.WX_MOCK, true), appid: env.WX_APPID || '', secret: env.WX_SECRET || '' },

  // 短信
  sms: {
    mock: bool(env.SMS_MOCK, true),
    mockCode: env.SMS_MOCK_CODE || '123456',
    accessKeyId: env.SMS_ACCESS_KEY_ID || '',
    accessKeySecret: env.SMS_ACCESS_KEY_SECRET || '',
    signName: env.SMS_SIGN_NAME || '',
    templateCode: env.SMS_TEMPLATE_CODE || ''
  },

  // 微信支付
  pay: {
    mock: bool(env.PAY_MOCK, true),
    mchid: env.WXPAY_MCHID || '',
    apiV3Key: env.WXPAY_API_V3_KEY || '',
    serialNo: env.WXPAY_SERIAL_NO || '',
    privateKeyPath: env.WXPAY_PRIVATE_KEY_PATH || '',
    notifyUrl: env.WXPAY_NOTIFY_URL || ''
  },

  corsOrigins: (env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
  uploadDir: path.resolve(__dirname, '..', env.UPLOAD_DIR || 'uploads'),
  uploadMaxMb: num(env.UPLOAD_MAX_MB, 5)
}

// 正式环境的安全检查：关键配置没改就拒绝启动，避免带着测试配置上线
if (config.isProd) {
  const problems = []
  if (config.jwtSecret.length < 32 || config.jwtSecret.includes('请改')) problems.push('JWT_SECRET 太短或未修改')
  if (config.sms.mock) problems.push('SMS_MOCK 仍为 true（验证码是固定的，任何人都能登录任何手机号）')
  if (config.pay.mock) problems.push('PAY_MOCK 仍为 true（不付钱也能下单和充值）')
  if (config.wx.mock) problems.push('WX_MOCK 仍为 true（微信登录是模拟的）')
  if (problems.length && !bool(env.ALLOW_UNSAFE_PROD)) {
    console.error('【拒绝启动】正式环境配置不安全：\n - ' + problems.join('\n - ') + '\n（确认只是内部试运行可临时设置 ALLOW_UNSAFE_PROD=true）')
    process.exit(1)
  }
}

module.exports = config
