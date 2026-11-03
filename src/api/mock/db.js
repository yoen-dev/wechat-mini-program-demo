// 模拟数据库：数据存在本机（小程序 storage / 浏览器 localStorage），刷新不丢。
// 接真后端后这个文件可以删掉，api/*.js 里的函数改成请求接口即可。

const KEY = 'demo_db_v4'
const H = 3600 * 1000
const D = 24 * H

// 固定种子的随机数，保证每次生成的演示数据一样
function rng(seed) {
  let s = seed
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

export const DEFAULT_FAQS = [
  { q: '怎么下单？', a: '1. 选单子和规格\n2. 选择客服派单或指定护航，填写游戏昵称 / ID\n3. 支付后护航会在「订单沟通」里联系你并拉你进队\n4. 护航打完提交完成，你确认后订单结束' },
  { q: '客服派单和指定护航有什么区别？', a: '客服派单：付款后由客服安排合适的护航，速度最快。\n指定护航：你自己选护航，需要等对方接单；如果对方暂时没空，会转为客服派单。' },
  { q: '可以退款吗？', a: '护航开始前可以在订单里申请退款，客服审核后原路退回；护航进行中有问题请提交售后。' },
  { q: '为什么要我确认完成？', a: '护航打完会上传战绩截图并提交完成，你核对无误后点「确认完成」。超过 24 小时未确认将自动确认。' }
]

function seed() {
  const t = Date.now()
  const r = rng(20261102)
  const pick = (a) => a[Math.floor(r() * a.length)]

  const users = [
    { id: 1, role: 'admin', name: '管理员', account: 'admin', password: 'admin123', status: 'active', createdAt: t - 60 * D },
    { id: 2, role: 'cs', name: '客服小李', account: 'kefu01', password: '123456', status: 'active', createdAt: t - 58 * D },
    { id: 3, role: 'escort', name: '护航 阿峰', account: 'hh01', password: '123456', status: 'active', online: true, createdAt: t - 55 * D,
      profile: { rank: '巅峰 · 绝密常客', maps: '航天基地 / 巴克什', intro: '主打保底，稳字当头，语音全程沟通' } },
    { id: 4, role: 'escort', name: '护航 小七', account: 'hh02', password: '123456', status: 'active', online: true, createdAt: t - 50 * D,
      profile: { rank: '巅峰', maps: '零号大坝 / 长弓溪谷', intro: '清图快，节奏好，新手友好' } },
    { id: 5, role: 'escort', name: '护航 老K', account: 'hh03', password: '123456', status: 'active', online: false, createdAt: t - 45 * D,
      profile: { rank: '钻石', maps: '航天基地', intro: '晚上 8 点后在线' } },
    { id: 6, role: 'owner', name: '公司负责人', account: 'boss', password: 'boss123', status: 'active', createdAt: t - 60 * D }
  ]

  // 老板（下单用户）
  const customers = [{ id: 1001, role: 'user', name: '示例老板', phone: '13800000000', openid: 'seed-openid', status: 'active', createdAt: t - 40 * D, lastActiveAt: t - 1 * H }]
  const nick = ['阿杰', '小雨', 'Kevin', '老王', '大鹏', '奶茶', '阿光', '小北', '鱼丸', 'Leo', '可乐', '火锅', '星河', '木木', '老陈', '阿土', '团子', 'Ray', '橙子', '小满']
  for (let i = 0; i < 38; i++) {
    const created = t - Math.floor(r() * 90) * D - Math.floor(r() * 20) * H
    customers.push({
      id: 1002 + i, role: 'user', name: nick[i % nick.length] + (i >= nick.length ? String(Math.floor(i / nick.length) + 1) : ''),
      phone: '139' + String(10000000 + Math.floor(r() * 89999999)), status: i === 30 ? 'disabled' : 'active',
      createdAt: created, lastActiveAt: Math.min(t - H, created + Math.floor(r() * 90) * D)
    })
  }
  users.push(...customers)

  const products = [
    { id: 1, name: '绝密保底单', price: 88, cats: ['保底单'], onSale: true, sort: 1, desc: '保底 1000 万哈夫币，打不到继续护航', tags: ['不卡保底', '全程语音', '装备归你'],
      points: ['保底 1000 万哈夫币，打不到保底继续护航', '可选客服派单或指定护航', '全程语音沟通', '装备全部归老板所有'] },
    { id: 2, name: '体验清图单', price: 5, cats: ['清图单', '特惠'], onSale: true, sort: 2, desc: '两位护航带你清图，新人首单推荐', tags: ['新人首选', '双人护航'],
      points: ['两位护航带你清图', '不清图不计入保底', '新人首单推荐'] },
    { id: 3, name: '高额保底单', price: 99, cats: ['保底单', '特惠'], onSale: true, sort: 3, desc: '保底 1188 万，超高性价比', tags: ['高额保底', '性价比'],
      points: ['保底 1188 万哈夫币', '绝不卡保底', '售后不满意随时升级处理'] },
    { id: 4, name: '极速清图单', price: 198, cats: ['清图单'], onSale: true, sort: 4, desc: '单局 1000 万 + 限时清图', tags: ['限时清图', '节奏快'],
      points: ['单局 1000 万哈夫币', '限时清图，节奏更快', '按时完成'] },
    { id: 5, name: '明星护航单', price: 168, cats: ['明星护航'], onSale: true, sort: 5, desc: '指定大神，边打边教', tags: ['指定大神', '语音教学'],
      points: ['从明星护航中挑选你想要的人', '全程语音指导', '售后不满意随时升级处理'] }
  ]
  const SPECS = [['单次', 1], ['三次套餐', 2.73], ['五次套餐', 4.41]]
  const RATE = 0.7
  const comments = ['很稳，下次还找', '保底打满了，好评', '语音沟通很舒服', '效率高', '护航很耐心', '一般般，有点慢', '超出预期']

  // 近 60 天的历史订单，越近越多；部分老板消费多（大客户）
  const orders = []
  let oid = 1000
  const heavy = customers.slice(0, 8)
  for (let i = 0; i < 300; i++) {
    const u = r() < 0.45 ? pick(heavy) : pick(customers)
    const p = pick(products)
    const [spec, rate] = r() < 0.75 ? SPECS[0] : pick(SPECS)
    const amount = Math.round(p.price * rate)
    const paidAt = t - Math.floor(Math.pow(r(), 1.25) * 58 * 24) * H - 2 * D
    const escortId = pick([3, 3, 4, 4, 5])
    const roll = r()
    const status = roll < 0.86 ? '已完成' : roll < 0.95 ? '已退款' : '已取消'
    const o = {
      id: ++oid, userId: u.id, productId: p.id, productName: p.name, spec, amount, original: amount, discount: 0, couponName: '',
      mode: r() < 0.6 ? 'dispatch' : 'assign', escortId: status === '已取消' ? null : escortId, status,
      gameId: '[游戏昵称]', note: '', createdAt: paidAt - 2 * 60000, paidAt: status === '已取消' ? null : paidAt, logs: [], proofs: [], rating: null
    }
    if (status !== '已取消') o.dispatchedAt = paidAt + Math.floor(3 + r() * 25) * 60000
    if (status === '已完成') {
      o.submittedAt = o.dispatchedAt + Math.floor(1 + r() * 3) * H
      o.completedAt = o.submittedAt + Math.floor(r() * 6) * H
      o.escortShare = Math.round(amount * RATE * 100) / 100
      if (r() < 0.7) o.rating = { score: r() < 0.8 ? 5 : r() < 0.6 ? 4 : 3, text: pick(comments), t: o.completedAt + H }
    }
    if (status === '已退款') { o.refundReason = pick(['临时有事', '等太久了', '不想打了']); o.refundedBy = 2 }
    o.logs.push({ t: paidAt, text: '下单并支付' })
    orders.push(o)
  }
  orders.sort((a, b) => a.createdAt - b.createdAt)
  orders.forEach((o, i) => { o.id = 1001 + i })
  oid = 1000 + orders.length

  // 示例老板当前的几笔订单
  const live = (extra) => ({ id: ++oid, userId: 1001, gameId: '[游戏昵称]', note: '', original: extra.amount, discount: 0, couponName: '', proofs: [], rating: null, ...extra })
  const o1 = live({ productId: 1, productName: '绝密保底单', spec: '单次', amount: 88, mode: 'assign', escortId: 3, status: '进行中', createdAt: t - 3 * H, paidAt: t - 3 * H, dispatchedAt: t - 2.8 * H,
    logs: [{ t: t - 3 * H, text: '下单并支付' }, { t: t - 2.8 * H, text: '护航 阿峰 已接单' }, { t: t - 2.5 * H, text: '开始护航' }] })
  const o2 = live({ productId: 3, productName: '高额保底单', spec: '三次套餐', amount: 270, mode: 'dispatch', escortId: null, status: '待派单', note: '晚上 9 点后', createdAt: t - 1 * H, paidAt: t - 1 * H,
    logs: [{ t: t - 1 * H, text: '下单并支付，等待客服派单' }] })
  const o3 = live({ productId: 2, productName: '体验清图单', spec: '单次', amount: 5, mode: 'dispatch', escortId: 4, status: '待确认', createdAt: t - 5 * H, paidAt: t - 5 * H, dispatchedAt: t - 4.9 * H, submittedAt: t - 2 * H,
    proofs: [], proofNote: '两局清图完成，截图见上', logs: [{ t: t - 5 * H, text: '下单并支付' }, { t: t - 4.9 * H, text: '客服小李 派单给 护航 小七' }, { t: t - 4 * H, text: '开始护航' }, { t: t - 2 * H, text: '护航 小七 提交完成，等待老板确认' }] })
  orders.push(o1, o2, o3)

  const shareOf = (id) => orders.filter((o) => o.escortId === id && o.status === '已完成').reduce((s, o) => s + o.escortShare, 0)
  const withdrawals = [
    { id: 1, escortId: 3, amount: Math.floor(shareOf(3) * 0.5), status: '已打款', createdAt: t - 10 * D, handledAt: t - 9 * D, handler: '管理员' },
    { id: 2, escortId: 3, amount: 300, status: '待审核', createdAt: t - 5 * H },
    { id: 3, escortId: 4, amount: 200, status: '待审核', createdAt: t - 20 * H }
  ]

  const tickets = [
    { id: 1, userId: 1001, orderId: orders[orders.length - 5].id, type: '服务质量', content: '护航中途掉线了十分钟，希望能补一局', status: '待处理', createdAt: t - 6 * H, replies: [] },
    { id: 2, userId: 1003, orderId: orders[100].id, type: '退款问题', content: '退款什么时候到账？', status: '已解决', createdAt: t - 3 * D,
      replies: [{ by: 2, name: '客服小李', text: '已原路退回，一般 1-3 个工作日到账', t: t - 3 * D + H }] }
  ]

  const applications = [
    { id: 1, userId: 1004, name: '阿光', phone: '13911112222', rank: '巅峰', maps: '航天基地 / 零号大坝', intro: '玩了两个赛季，每天晚上都有空', status: '待审核', createdAt: t - 8 * H },
    { id: 2, userId: 1006, name: '团子', phone: '13933334444', rank: '钻石', maps: '长弓溪谷', intro: '想兼职试试', status: '待审核', createdAt: t - 26 * H }
  ]

  const coupons = [
    { id: 1, name: '新人立减', amount: 10, minSpend: 50, days: 30, active: true, createdAt: t - 30 * D },
    { id: 2, name: '满 100 减 15', amount: 15, minSpend: 100, days: 14, active: true, createdAt: t - 7 * D }
  ]
  const userCoupons = [{ id: 1, userId: 1001, couponId: 1, name: '新人立减', amount: 10, minSpend: 50, expireAt: t + 20 * D, usedOrderId: null, createdAt: t - 2 * D }]

  // 储值充值：档位由管理员配置；历史记录用于首页「刚刚充值」提示和数据统计
  const TIERS = [{ pay: 100, bonus: 0 }, { pay: 300, bonus: 20 }, { pay: 500, bonus: 50 }, { pay: 1000, bonus: 120 }]
  const recharges = []
  for (let i = 0; i < 26; i++) {
    const u = r() < 0.5 ? pick(heavy) : pick(customers)
    const tier = TIERS[Math.min(3, Math.floor(Math.pow(r(), 1.6) * 4))]
    recharges.push({ userId: u.id, pay: tier.pay, bonus: tier.bonus, createdAt: t - Math.floor(r() * 58 * 24) * H - 3 * H })
  }
  // 最近几小时内的几笔，打开首页就能看到提示
  ;[[1003, 2], [1005, 1], [1002, 3], [1009, 2]].forEach(([uid, k], i) => {
    recharges.push({ userId: uid, pay: TIERS[k].pay, bonus: TIERS[k].bonus, createdAt: t - (i * 37 + 6) * 60000 })
  })
  recharges.push({ userId: 1001, pay: 300, bonus: 20, createdAt: t - 3 * D })
  recharges.sort((a, b) => a.createdAt - b.createdAt).forEach((x, i) => { x.id = i + 1 })
  // 余额 = 充值 + 赠送 − 已用（演示：已用掉一部分）
  customers.forEach((u) => {
    const got = recharges.filter((x) => x.userId === u.id).reduce((s, x) => s + x.pay + x.bonus, 0)
    u.balance = u.id === 1001 ? got : Math.round(got * (0.2 + r() * 0.5))
  })

  return {
    seq: { user: 2000, order: oid, product: 5, msg: 10, banner: 10, withdrawal: 3, ticket: 2, application: 2, coupon: 2, userCoupon: 1, log: 3, recharge: recharges.length },
    settings: {
      shareRate: RATE,
      recharge: { tiers: TIERS, popup: true, popupMin: 100 },
      autoConfirmHours: 24,
      notice: '国庆福利单限时开放，新用户领券立减 10 元',
      faqs: DEFAULT_FAQS,
      agreements: {
        user: '【用户协议】\n\n[请在「管理后台 → 分成与设置」中替换为正式的用户协议内容。]',
        privacy: '【隐私政策】\n\n[请在「管理后台 → 分成与设置」中替换为正式的隐私政策内容。]'
      }
    },
    users, products, orders, withdrawals, tickets, applications, coupons, userCoupons, recharges,
    messages: {
      [o1.id]: [
        { id: 1, from: 3, role: 'escort', name: '护航 阿峰', text: '老板好，我是这单的护航，游戏 ID 发我一下，我拉你进队～', t: t - 2.8 * H },
        { id: 2, from: 1001, role: 'user', name: '示例老板', text: '[游戏昵称]', t: t - 2.7 * H },
        { id: 3, from: 3, role: 'escort', name: '护航 阿峰', text: '收到，已发邀请。', t: t - 2.6 * H }
      ]
    },
    logs: [
      { id: 1, t: t - 9 * D, actorId: 1, actorName: '管理员', role: 'admin', action: '提现打款', target: '护航 阿峰' },
      { id: 2, t: t - 3 * D, actorId: 2, actorName: '客服小李', role: 'cs', action: '回复工单', target: '#2' },
      { id: 3, t: t - 2 * D, actorId: 1, actorName: '管理员', role: 'admin', action: '新建优惠券', target: '满 100 减 15' }
    ]
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

/** 记录操作日志（员工的关键操作） */
export function audit(actor, action, target = '') {
  const d = db()
  d.logs.push({ id: nextId('log'), t: Date.now(), actorId: actor.id, actorName: actor.name, role: actor.role, action, target: String(target) })
  if (d.logs.length > 500) d.logs.splice(0, d.logs.length - 500)
}

export const isStaff = (a) => !!a && ['cs', 'admin'].includes(a.role)
export const isAdmin = (a) => !!a && a.role === 'admin'
export const nameOf = (id) => (db().users.find((u) => u.id === id) || {}).name || ''

// 模拟网络延迟，返回深拷贝，避免页面直接改到“数据库”
export function respond(data, ms = 120) {
  return new Promise((resolve) => setTimeout(() => resolve(data === undefined ? data : JSON.parse(JSON.stringify(data))), ms))
}

export function fail(message, ms = 120) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms))
}
