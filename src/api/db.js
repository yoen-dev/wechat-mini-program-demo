// 模拟数据库：数据存在本机（小程序 storage / 浏览器 localStorage），刷新不丢。
// 接真后端后这个文件可以删掉，api/*.js 里的函数改成请求接口即可。

const KEY = 'demo_db_v1'

const now = () => Date.now()
const H = 3600 * 1000

function seed() {
  const t = now()
  return {
    seq: { user: 2000, order: 1003, product: 5, msg: 10 },
    users: [
      // 员工账号：由管理员在后台创建并发放
      { id: 1, role: 'admin', name: '管理员', account: 'admin', password: 'admin123', status: 'active', createdAt: t - 72 * H },
      { id: 2, role: 'cs', name: '客服小李', account: 'kefu01', password: '123456', status: 'active', createdAt: t - 70 * H },
      { id: 3, role: 'escort', name: '护航 阿峰', account: 'hh01', password: '123456', status: 'active', createdAt: t - 68 * H },
      { id: 4, role: 'escort', name: '护航 小七', account: 'hh02', password: '123456', status: 'active', createdAt: t - 68 * H },
      { id: 5, role: 'escort', name: '护航 老K', account: 'hh03', password: '123456', status: 'active', createdAt: t - 60 * H },
      // 示例用户（微信登录 + 已绑定手机号）
      { id: 1001, role: 'user', name: '示例老板', phone: '13800000000', openid: 'seed-openid', status: 'active', createdAt: t - 48 * H }
    ],
    products: [
      { id: 1, name: '绝密保底单', price: 88, cats: ['保底单'], onSale: true, sort: 1,
        desc: '保底 1000 万哈夫币，打不到继续护航', tags: ['不卡保底', '全程语音', '装备归你'],
        points: ['保底 1000 万哈夫币，打不到保底继续护航', '可选客服派单或指定护航', '全程语音沟通', '装备全部归老板所有'] },
      { id: 2, name: '体验清图单', price: 5, cats: ['清图单', '特惠'], onSale: true, sort: 2,
        desc: '两位护航带你清图，新人首单推荐', tags: ['新人首选', '双人护航'],
        points: ['两位护航带你清图', '不清图不计入保底', '新人首单推荐'] },
      { id: 3, name: '高额保底单', price: 99, cats: ['保底单', '特惠'], onSale: true, sort: 3,
        desc: '保底 1188 万，超高性价比', tags: ['高额保底', '性价比'],
        points: ['保底 1188 万哈夫币', '绝不卡保底', '售后不满意随时升级处理'] },
      { id: 4, name: '极速清图单', price: 198, cats: ['清图单'], onSale: true, sort: 4,
        desc: '单局 1000 万 + 限时清图', tags: ['限时清图', '节奏快'],
        points: ['单局 1000 万哈夫币', '限时清图，节奏更快', '按时完成'] },
      { id: 5, name: '明星护航单', price: 168, cats: ['明星护航'], onSale: true, sort: 5,
        desc: '指定大神，边打边教', tags: ['指定大神', '语音教学'],
        points: ['从明星护航中挑选你想要的人', '全程语音指导', '售后不满意随时升级处理'] }
    ],
    orders: [
      { id: 1001, userId: 1001, productId: 1, productName: '绝密保底单', spec: '单次', amount: 88, mode: 'assign', escortId: 3,
        status: '进行中', gameId: '[游戏昵称]', note: '', createdAt: t - 3 * H, paidAt: t - 3 * H,
        logs: [{ t: t - 3 * H, text: '下单并支付' }, { t: t - 2.8 * H, text: '护航 阿峰 已接单' }, { t: t - 2.5 * H, text: '开始护航' }] },
      { id: 1002, userId: 1001, productId: 3, productName: '高额保底单', spec: '三次套餐', amount: 270, mode: 'dispatch', escortId: null,
        status: '待派单', gameId: '[游戏昵称]', note: '晚上 9 点后', createdAt: t - 1 * H, paidAt: t - 1 * H,
        logs: [{ t: t - 1 * H, text: '下单并支付，等待客服派单' }] },
      { id: 1003, userId: 1001, productId: 2, productName: '体验清图单', spec: '单次', amount: 5, mode: 'dispatch', escortId: 4,
        status: '已完成', gameId: '[游戏昵称]', note: '', createdAt: t - 26 * H, paidAt: t - 26 * H,
        logs: [{ t: t - 26 * H, text: '下单并支付' }, { t: t - 25.8 * H, text: '客服派单给 护航 小七' }, { t: t - 25 * H, text: '开始护航' }, { t: t - 24 * H, text: '护航完成' }] }
    ],
    messages: {
      1001: [
        { id: 1, from: 3, role: 'escort', name: '护航 阿峰', text: '老板好，我是这单的护航，游戏 ID 发我一下，我拉你进队～', t: t - 2.8 * H },
        { id: 2, from: 1001, role: 'user', name: '示例老板', text: '[游戏昵称]', t: t - 2.7 * H },
        { id: 3, from: 3, role: 'escort', name: '护航 阿峰', text: '收到，已发邀请。', t: t - 2.6 * H }
      ]
    }
  }
}

let cache = null

export function db() {
  if (!cache) {
    try { cache = uni.getStorageSync(KEY) || null } catch (e) { cache = null }
    if (!cache || !cache.seq) { cache = seed(); save() }
  }
  return cache
}

export function save() {
  try { uni.setStorageSync(KEY, cache) } catch (e) { /* 存储满或不可用时忽略 */ }
}

export function resetDb() {
  cache = seed()
  save()
}

export function nextId(kind) {
  const d = db()
  d.seq[kind] = (d.seq[kind] || 0) + 1
  return d.seq[kind]
}

// 模拟网络延迟，返回深拷贝，避免页面直接改到“数据库”
export function respond(data, ms = 120) {
  return new Promise((resolve) => setTimeout(() => resolve(data === undefined ? data : JSON.parse(JSON.stringify(data))), ms))
}

export function fail(message, ms = 120) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms))
}
