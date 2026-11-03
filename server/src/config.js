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
  // 微信云托管开通 MySQL 后会自动注入 MYSQL_ADDRESS（格式 地址:端口）、MYSQL_USERNAME、MYSQL_PASSWORD，优先用它们
  db: {
    host: env.MYSQL_ADDRESS ? env.MYSQL_ADDRESS.split(':')[0] : env.DB_HOST || '127.0.0.1',
    port: env.MYSQL_ADDRESS ? num(env.MYSQL_ADDRESS.split(':')[1], 3306) : num(env.DB_PORT, 3306),
    user: env.MYSQL_USERNAME || env.DB_USER || 'root',
    password: env.MYSQL_PASSWORD || env.DB_PASSWORD || '',
    database: env.DB_NAME || 'escort'
  },

  // 登录令牌
  jwtSecret: env.JWT_SECRET || 'dev-only-secret-change-me',
  jwtDays: num(env.JWT_DAYS, 30),

  // 微信小程序登录方式（三选一，见 src/services/wechat.js）：
  //   WX_CLOUD=true  部署在微信云托管：openid 由微信直接放在请求头里（推荐，不需要 AppSecret）
  //   WX_MOCK=true   本地开发：模拟 openid
  //   都为 false     自己服务器：用 WX_APPID + WX_SECRET 调微信接口换 openid
  wx: { cloud: bool(env.WX_CLOUD, false), mock: bool(env.WX_MOCK, true) && !bool(env.WX_CLOUD, false), appid: env.WX_APPID || '', secret: env.WX_SECRET || '' },

  // 启动时自动建表 / 升级表结构（云托管上没有命令行，默认开启）
  autoMigrate: bool(env.AUTO_MIGRATE, true),
  // 第一次启动时自动创建的管理员账号和密码（只在数据库里还没有管理员时生效，登录后请马上改密码）
  initAdmin: { account: env.ADMIN_ACCOUNT || 'admin', password: env.ADMIN_INIT_PASSWORD || '' },

  // 短信
  sms: {
    mock: bool(env.SMS_MOCK, true),
    mockCode: env.SMS_MOCK_CODE || '123456',
    accessKeyId: env.SMS_ACCESS_KEY_ID || '',
    accessKeySecret: env.SMS_ACCESS_KEY_SECRET || '',
    signName: env.SMS_SIGN_NAME || '',
    templateCode: env.SMS_TEMPLATE_CODE || ''
  },

  // 微信支付方式（见 src/services/pay.js）：
  //   PAY_MOCK=true                 测试：不付钱直接成功
  //   PAY_MODE=cloud（云托管推荐）    用云托管自带的微信支付通道，不需要证书和密钥，只要在云托管控制台绑定商户号
  //   PAY_MODE=v3                   自己服务器：用商户证书直连微信支付 API v3
  pay: {
    mock: bool(env.PAY_MOCK, true),
    mode: env.PAY_MODE || 'cloud',
    cloudEnv: env.CLOUD_ENV || '', // 云托管环境 ID（控制台左上角，形如 prod-xxxx）
    cloudService: env.CLOUD_SERVICE || 'api', // 本后端在云托管里的服务名称（支付成功后微信回调这个服务）
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
  if (config.wx.mock) problems.push('WX_MOCK 仍为 true（微信登录是模拟的）；云托管请设置 WX_CLOUD=true')
  if (problems.length && !bool(env.ALLOW_UNSAFE_PROD)) {
    console.error('【拒绝启动】正式环境配置不安全：\n - ' + problems.join('\n - ') + '\n（确认只是内部试运行可临时设置 ALLOW_UNSAFE_PROD=true）')
    process.exit(1)
  }
}

module.exports = config
