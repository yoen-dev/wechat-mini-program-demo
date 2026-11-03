/**
 * 初始化数据 / 演示数据
 *
 * 用法（在 server 目录下）：
 *   npm run seed:init    只创建必须的数据：管理员账号、两张示例轮播图（已存在就跳过，可以重复执行）
 *   npm run seed:demo    ⚠️ 清空所有表，生成一整套演示数据（和网页预览版一样的账号和 60 天历史订单），只用于本地 / 测试环境！
 *
 * 云托管上不用手动执行：服务启动时会自动执行 init（见 src/bootstrap.js）。
 */
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const db = require('./index')
const config = require('../config')

const H = 3600 * 1000
const D = 24 * H

/**
 * 必要的初始数据
 * 管理员密码：取环境变量 ADMIN_INIT_PASSWORD；没设置就随机生成一个并打印在日志里（云托管在「日志」里能看到）
 */
async function init() {
  const hasAdmin = await db('users').where({ role: 'admin' }).first()
  if (!hasAdmin) {
    const password = config.initAdmin.password || crypto.randomBytes(6).toString('base64url')
    await db('users').insert({
      role: 'admin', name: '管理员', account: config.initAdmin.account, password_hash: await bcrypt.hash(password, 10), created_at: Date.now()
    })
    console.log(`[初始化] 已创建管理员账号：${config.initAdmin.account}  密码：${config.initAdmin.password ? '（环境变量 ADMIN_INIT_PASSWORD 的值）' : password}  —— 登录后请立即修改密码`)
  }
  const [{ c }] = await db('banners').count({ c: '*' })
  if (!Number(c)) {
    await db('banners').insert([
      { title: '老板权益', url: 'builtin:rights', sort: 1, created_at: Date.now() },
      { title: '售后说明', url: 'builtin:aftersale', sort: 2, created_at: Date.now() }
    ])
  }
}

// 固定种子的随机数，保证每次生成的演示数据一样
function rng(seed) {
  let s = seed
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

/**
 * 演示数据（和前端模拟数据 src/api/mock/db.js 基本一致）
 * 账号：admin/admin123（管理员）、kefu01/123456（客服）、hh01~hh03/123456（护航）、boss/boss123（负责人）
 */
async function demo() {
  if (config.isProd) throw new Error('正式环境禁止生成演示数据')
  const t = Date.now()
  const r = rng(20261102)
  const pick = (a) => a[Math.floor(r() * a.length)]

  // 清空所有业务表
  const tables = ['sms_codes', 'audit_logs', 'settings', 'user_coupons', 'coupons', 'applications', 'ticket_replies', 'tickets',
    'withdrawals', 'recharges', 'messages', 'order_logs', 'orders', 'banners', 'products', 'users']
  for (const tb of tables) await db(tb).del()

  const hash = async (p) => bcrypt.hash(p, 8)
  const pw123 = await hash('123456')
  await db('users').insert([
    { id: 1, role: 'admin', name: '管理员', account: 'admin', password_hash: await hash('admin123'), created_at: t - 60 * D },
    { id: 2, role: 'cs', name: '客服小李', account: 'kefu01', password_hash: pw123, created_at: t - 58 * D },
    { id: 3, role: 'escort', name: '护航 阿峰', account: 'hh01', password_hash: pw123, online: true, created_at: t - 55 * D, profile_rank: '巅峰 · 绝密常客', profile_maps: '航天基地 / 巴克什', profile_intro: '主打保底，稳字当头，语音全程沟通' },
    { id: 4, role: 'escort', name: '护航 小七', account: 'hh02', password_hash: pw123, online: true, created_at: t - 50 * D, profile_rank: '巅峰', profile_maps: '零号大坝 / 长弓溪谷', profile_intro: '清图快，节奏好，新手友好' },
    { id: 5, role: 'escort', name: '护航 老K', account: 'hh03', password_hash: pw123, online: false, created_at: t - 45 * D, profile_rank: '钻石', profile_maps: '航天基地', profile_intro: '晚上 8 点后在线' },
    { id: 6, role: 'owner', name: '公司负责人', account: 'boss', password_hash: await hash('boss123'), created_at: t - 60 * D }
  ])

  // 老板
  const customers = [{ id: 1001, role: 'user', name: '示例老板', phone: '13800000000', openid: 'mock_seed-openid', status: 'active', created_at: t - 40 * D, last_active_at: t - H }]
  const nick = ['阿杰', '小雨', 'Kevin', '老王', '大鹏', '奶茶', '阿光', '小北', '鱼丸', 'Leo', '可乐', '火锅', '星河', '木木', '老陈', '阿土', '团子', 'Ray', '橙子', '小满']
  for (let i = 0; i < 38; i++) {
    const created = t - Math.floor(r() * 90) * D - Math.floor(r() * 20) * H
    customers.push({
      id: 1002 + i, role: 'user', name: nick[i % nick.length] + (i >= nick.length ? String(Math.floor(i / nick.length) + 1) : ''),
      phone: '139' + String(10000000 + Math.floor(r() * 89999999)), status: i === 30 ? 'disabled' : 'active',
      created_at: created, last_active_at: Math.min(t - H, created + Math.floor(r() * 90) * D)
    })
  }

  // 单子
  const products = [
    [1, '绝密保底单', 88, ['保底单'], '保底 1000 万哈夫币，打不到继续护航', ['不卡保底', '全程语音', '装备归你'], ['保底 1000 万哈夫币，打不到保底继续护航', '可选客服派单或指定护航', '全程语音沟通', '装备全部归老板所有']],
    [2, '体验清图单', 5, ['清图单', '特惠'], '两位护航带你清图，新人首单推荐', ['新人首选', '双人护航'], ['两位护航带你清图', '不清图不计入保底', '新人首单推荐']],
    [3, '高额保底单', 99, ['保底单', '特惠'], '保底 1188 万，超高性价比', ['高额保底', '性价比'], ['保底 1188 万哈夫币', '绝不卡保底', '售后不满意随时升级处理']],
    [4, '极速清图单', 198, ['清图单'], '单局 1000 万 + 限时清图', ['限时清图', '节奏快'], ['单局 1000 万哈夫币', '限时清图，节奏更快', '按时完成']],
    [5, '明星护航单', 168, ['明星护航'], '指定大神，边打边教', ['指定大神', '语音教学'], ['从明星护航中挑选你想要的人', '全程语音指导', '售后不满意随时升级处理']]
  ].map(([id, name, price, cats, description, tags, points]) => ({ id, name, price, cats, description, tags, points, sort: id }))
  await db('products').insert(products.map((p) => ({ ...p, cats: JSON.stringify(p.cats), tags: JSON.stringify(p.tags), points: JSON.stringify(p.points), on_sale: true, created_at: t - 60 * D })))

  // 近 60 天历史订单
  const SPECS = [['单次', 1], ['三次套餐', 2.73], ['五次套餐', 4.41]]
  const RATE = 0.7
  const comments = ['很稳，下次还找', '保底打满了，好评', '语音沟通很舒服', '效率高', '护航很耐心', '一般般，有点慢', '超出预期']
  const heavy = customers.slice(0, 8)
  const orders = []
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
      user_id: u.id, product_id: p.id, product_name: p.name, spec, original: amount, amount, discount: 0, coupon_name: '',
      mode: r() < 0.6 ? 'dispatch' : 'assign', escort_id: status === '已取消' ? null : escortId, status, game_id: '[游戏昵称]', note: '',
      created_at: paidAt - 2 * 60000, paid_at: status === '已取消' ? null : paidAt, pay_method: status === '已取消' ? null : 'wechat'
    }
    if (status !== '已取消') o.dispatched_at = paidAt + Math.floor(3 + r() * 25) * 60000
    if (status === '已完成') {
      o.submitted_at = o.dispatched_at + Math.floor(1 + r() * 3) * H
      o.completed_at = o.submitted_at + Math.floor(r() * 6) * H
      o.escort_share = Math.round(amount * RATE * 100) / 100
      if (r() < 0.7) Object.assign(o, { rating_score: r() < 0.8 ? 5 : r() < 0.6 ? 4 : 3, rating_text: pick(comments), rated_at: o.completed_at + H })
    }
    if (status === '已退款') Object.assign(o, { refund_reason: pick(['临时有事', '等太久了', '不想打了']), refunded_by: 2, refunded_at: paidAt + H })
    orders.push(o)
  }
  orders.sort((a, b) => a.created_at - b.created_at)

  // 示例老板当前进行中的几笔
  const live = (x) => ({ user_id: 1001, game_id: '[游戏昵称]', note: '', original: x.amount, discount: 0, coupon_name: '', pay_method: 'wechat', ...x })
  orders.push(
    live({ product_id: 1, product_name: '绝密保底单', spec: '单次', amount: 88, mode: 'assign', escort_id: 3, status: '进行中', created_at: t - 3 * H, paid_at: t - 3 * H, dispatched_at: t - 2.8 * H }),
    live({ product_id: 3, product_name: '高额保底单', spec: '三次套餐', amount: 270, mode: 'dispatch', escort_id: null, status: '待派单', note: '晚上 9 点后', created_at: t - H, paid_at: t - H }),
    live({ product_id: 2, product_name: '体验清图单', spec: '单次', amount: 5, mode: 'dispatch', escort_id: 4, status: '待确认', created_at: t - 5 * H, paid_at: t - 5 * H, dispatched_at: t - 4.9 * H, submitted_at: t - 2 * H, proofs: '[]', proof_note: '两局清图完成，截图见上' })
  )
  for (let i = 0; i < orders.length; i++) orders[i].id = 1001 + i
  for (let i = 0; i < orders.length; i += 100) await db('orders').insert(orders.slice(i, i + 100))
  const [o1, o2, o3] = orders.slice(-3)

  // 进度时间线
  const logs = []
  orders.slice(0, -3).forEach((o) => logs.push({ order_id: o.id, text: '下单并支付', created_at: o.paid_at || o.created_at }))
  logs.push(
    { order_id: o1.id, text: '下单并支付', created_at: t - 3 * H }, { order_id: o1.id, text: '护航 阿峰 已接单', created_at: t - 2.8 * H }, { order_id: o1.id, text: '开始护航', created_at: t - 2.5 * H },
    { order_id: o2.id, text: '下单并支付，等待客服派单', created_at: t - H },
    { order_id: o3.id, text: '下单并支付', created_at: t - 5 * H }, { order_id: o3.id, text: '客服小李 派单给 护航 小七', created_at: t - 4.9 * H },
    { order_id: o3.id, text: '开始护航', created_at: t - 4 * H }, { order_id: o3.id, text: '护航 小七 提交完成，等待老板确认', created_at: t - 2 * H }
  )
  for (let i = 0; i < logs.length; i += 100) await db('order_logs').insert(logs.slice(i, i + 100))
  await db('messages').insert([
    { order_id: o1.id, from_id: 3, role: 'escort', name: '护航 阿峰', text: '老板好，我是这单的护航，游戏 ID 发我一下，我拉你进队～', created_at: t - 2.8 * H },
    { order_id: o1.id, from_id: 1001, role: 'user', name: '示例老板', text: '[游戏昵称]', created_at: t - 2.7 * H },
    { order_id: o1.id, from_id: 3, role: 'escort', name: '护航 阿峰', text: '收到，已发邀请。', created_at: t - 2.6 * H }
  ])

  // 提现
  const shareOf = (id) => orders.filter((o) => o.escort_id === id && o.status === '已完成').reduce((s, o) => s + o.escort_share, 0)
  await db('withdrawals').insert([
    { escort_id: 3, amount: Math.floor(shareOf(3) * 0.5), status: '已打款', created_at: t - 10 * D, handled_at: t - 9 * D, handler: '管理员' },
    { escort_id: 3, amount: 300, status: '待审核', created_at: t - 5 * H },
    { escort_id: 4, amount: 200, status: '待审核', created_at: t - 20 * H }
  ])

  // 工单、报名
  const [tk1] = await db('tickets').insert({ user_id: 1001, order_id: orders[orders.length - 5].id, type: '服务质量', content: '护航中途掉线了十分钟，希望能补一局', status: '待处理', created_at: t - 6 * H })
  const [tk2] = await db('tickets').insert({ user_id: 1003, order_id: orders[100].id, type: '退款问题', content: '退款什么时候到账？', status: '已解决', created_at: t - 3 * D })
  await db('ticket_replies').insert({ ticket_id: tk2, by_id: 2, name: '客服小李', role: 'cs', text: '已原路退回，一般 1-3 个工作日到账', created_at: t - 3 * D + H })
  void tk1
  await db('applications').insert([
    { user_id: 1004, name: '阿光', phone: '13911112222', rank: '巅峰', maps: '航天基地 / 零号大坝', intro: '玩了两个赛季，每天晚上都有空', status: '待审核', created_at: t - 8 * H },
    { user_id: 1006, name: '团子', phone: '13933334444', rank: '钻石', maps: '长弓溪谷', intro: '想兼职试试', status: '待审核', created_at: t - 26 * H }
  ])

  // 优惠券
  await db('coupons').insert([
    { id: 1, name: '新人立减', amount: 10, min_spend: 50, days: 30, active: true, created_at: t - 30 * D },
    { id: 2, name: '满 100 减 15', amount: 15, min_spend: 100, days: 14, active: true, created_at: t - 7 * D }
  ])
  await db('user_coupons').insert({ user_id: 1001, coupon_id: 1, name: '新人立减', amount: 10, min_spend: 50, expire_at: t + 20 * D, created_at: t - 2 * D })

  // 储值充值记录 + 老板余额
  const TIERS = [{ pay: 100, bonus: 0 }, { pay: 300, bonus: 20 }, { pay: 500, bonus: 50 }, { pay: 1000, bonus: 120 }]
  const rc = []
  for (let i = 0; i < 26; i++) {
    const u = r() < 0.5 ? pick(heavy) : pick(customers)
    const tier = TIERS[Math.min(3, Math.floor(Math.pow(r(), 1.6) * 4))]
    rc.push({ user_id: u.id, ...tier, at: t - Math.floor(r() * 58 * 24) * H - 3 * H })
  }
  ;[[1003, 2], [1005, 1], [1002, 3], [1009, 2]].forEach(([uid, k], i) => rc.push({ user_id: uid, ...TIERS[k], at: t - (i * 37 + 6) * 60000 }))
  rc.push({ user_id: 1001, pay: 300, bonus: 20, at: t - 3 * D })
  rc.sort((a, b) => a.at - b.at)
  await db('recharges').insert(rc.map((x) => ({ user_id: x.user_id, pay: x.pay, bonus: x.bonus, status: '已支付', trade_no: null, created_at: x.at, paid_at: x.at })))
  customers.forEach((u) => {
    const got = rc.filter((x) => x.user_id === u.id).reduce((s, x) => s + x.pay + x.bonus, 0)
    u.balance = u.id === 1001 ? got : Math.round(got * (0.2 + r() * 0.5))
  })
  await db('users').insert(customers)

  // 设置、轮播图、日志
  await db('settings').insert([
    { k: 'notice', v: JSON.stringify('国庆福利单限时开放，新用户领券立减 10 元') },
    { k: 'shareRate', v: JSON.stringify(RATE) }
  ])
  await db('banners').insert([
    { title: '老板权益', url: 'builtin:rights', sort: 1, created_at: t },
    { title: '售后说明', url: 'builtin:aftersale', sort: 2, created_at: t }
  ])
  await db('audit_logs').insert([
    { actor_id: 1, actor_name: '管理员', role: 'admin', action: '提现打款', target: '护航 阿峰', created_at: t - 9 * D },
    { actor_id: 2, actor_name: '客服小李', role: 'cs', action: '回复工单', target: `#${tk2}`, created_at: t - 3 * D },
    { actor_id: 1, actor_name: '管理员', role: 'admin', action: '新建优惠券', target: '满 100 减 15', created_at: t - 2 * D }
  ])
  console.log(`[演示数据] 已生成：${customers.length} 个老板、${orders.length} 个订单、${rc.length} 笔充值`)
}

module.exports = { init, demo }

// 命令行直接执行：node src/db/seed.js init|demo
if (require.main === module) {
  const cmd = process.argv[2]
  const fn = { init, demo }[cmd]
  if (!fn) { console.log('用法：node src/db/seed.js init | demo'); process.exit(1) }
  db.migrate.latest().then(fn).then(() => db.destroy()).catch((e) => { console.error(e); process.exit(1) })
}
