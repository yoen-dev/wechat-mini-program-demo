/**
 * 后端接口测试
 * 覆盖：五种身份的登录和权限、完整的下单流程（支付 → 派单 → 开始 → 提交 → 确认 → 分成）、
 *       余额支付和退款退回余额、并发抢单只有一人成功、优惠券、充值、提现不能超额、设置、经营数据等。
 */
const { test, before, after, describe } = require('node:test')
const assert = require('node:assert/strict')
const { app, db, request, reset, login, wxLogin } = require('./helpers')

let admin, cs, hh01, hh02, owner, boss

before(async () => {
  await reset()
  ;[admin, cs, hh01, hh02, owner] = await Promise.all([
    login('admin', 'admin123'), login('kefu01', '123456'), login('hh01', '123456'), login('hh02', '123456'), login('boss', 'boss123')
  ])
  boss = await wxLogin('seed-openid') // 示例老板
})
after(() => db.destroy())

describe('登录与权限', () => {
  test('健康检查', async () => {
    const r = await request(app).get('/api/health')
    assert.equal(r.body.ok, true)
  })

  test('密码错误 / 未登录 / 无权限', async () => {
    assert.equal((await request(app).post('/api/auth/login').send({ account: 'admin', password: 'x' })).status, 400)
    assert.equal((await request(app).get('/api/orders')).status, 401)
    assert.equal((await boss.get('/api/staff')).status, 403)
    assert.equal((await cs.post('/api/products', { name: 'x', price: 1 })).status, 403)
    assert.equal((await owner.post('/api/settings', { notice: 'x' })).status, 403) // 负责人只看不改
    assert.equal((await owner.get('/api/analytics?days=30')).status, 200)
    assert.equal((await hh01.get('/api/analytics')).status, 403)
  })

  test('员工登录返回身份，不返回密码', async () => {
    assert.equal(admin.user.role, 'admin')
    assert.equal(owner.user.role, 'owner')
    assert.equal(admin.user.password_hash, undefined)
  })

  test('新微信用户需要绑定手机号', async () => {
    const u = await wxLogin('brand-new')
    assert.equal(u.raw.needPhone, true)
    const sms = await request(app).post('/api/auth/sms').send({ phone: '13700000001' })
    assert.equal(sms.body.demoCode, '123456')
    assert.equal((await u.post('/api/auth/bind-phone', { phone: '13700000001', code: '000000' })).status, 400)
    const ok = await u.post('/api/auth/bind-phone', { phone: '13700000001', code: '123456' })
    assert.equal(ok.body.user.phone, '13700000001')
  })

  test('手机号登录自动注册，验证码只能用一次', async () => {
    await request(app).post('/api/auth/sms').send({ phone: '13700000002' })
    const r = await request(app).post('/api/auth/phone').send({ phone: '13700000002', code: '123456' })
    assert.equal(r.body.user.role, 'user')
    const again = await request(app).post('/api/auth/phone').send({ phone: '13700000002', code: '123456' })
    assert.equal(again.status, 400)
  })

  test('改密码后旧令牌失效', async () => {
    const k = await login('kefu01', '123456')
    const r = await k.post('/api/auth/password', { oldPassword: '123456', newPassword: 'newpass1' })
    assert.ok(r.body.token)
    assert.equal((await k.get('/api/auth/me')).status, 401)
    const k2 = await login('kefu01', 'newpass1')
    await k2.post('/api/auth/password', { oldPassword: 'newpass1', newPassword: '123456' })
    cs = await login('kefu01', '123456')
  })
})

describe('订单完整流程', () => {
  test('客服派单 → 护航开始 → 提交 → 老板确认 → 分成入账', async () => {
    const o = (await boss.post('/api/orders', { productId: 1, spec: '三次套餐', mode: 'dispatch', gameId: 'TestID' })).body
    assert.equal(o.status, '待付款')
    assert.equal(o.amount, Math.round(88 * 2.73)) // 金额由服务器计算
    const paid = (await boss.post(`/api/orders/${o.id}/pay`, { method: 'wechat' })).body.order
    assert.equal(paid.status, '待派单')
    assert.equal((await cs.post(`/api/orders/${o.id}/dispatch`, { escortId: 3 })).body.status, '已接单')
    assert.equal((await hh02.post(`/api/orders/${o.id}/start`)).status, 409) // 不是自己的单
    assert.equal((await hh01.post(`/api/orders/${o.id}/start`)).body.status, '进行中')
    assert.equal((await hh01.post(`/api/orders/${o.id}/submit`, { proofs: [] })).status, 400)
    const sub = (await hh01.post(`/api/orders/${o.id}/submit`, { proofs: ['cloud://env/proof.jpg'], note: '完成' })).body
    assert.equal(sub.status, '待确认')
    const back = (await boss.post(`/api/orders/${o.id}/reject`, { reason: '还差一局' })).body
    assert.equal(back.status, '进行中')
    await hh01.post(`/api/orders/${o.id}/submit`, { proofs: ['cloud://env/proof.jpg'] })
    const done = (await boss.post(`/api/orders/${o.id}/confirm`)).body
    assert.equal(done.status, '已完成')
    assert.equal(done.escortShare, Math.round(o.amount * 0.7 * 100) / 100)
    assert.ok(done.logs.length >= 6)
    const rated = (await boss.post(`/api/orders/${o.id}/rate`, { score: 5, text: '好' })).body
    assert.equal(rated.rating.score, 5)
    assert.equal((await boss.post(`/api/orders/${o.id}/rate`, { score: 4 })).status, 400) // 不能重复评价
  })

  test('两个护航同时抢一单，只有一个成功', async () => {
    const o = (await boss.post('/api/orders', { productId: 2, spec: '单次', mode: 'dispatch', gameId: 'G' })).body
    await boss.post(`/api/orders/${o.id}/pay`, { method: 'wechat' })
    const rs = await Promise.all([hh01.post(`/api/orders/${o.id}/grab`), hh02.post(`/api/orders/${o.id}/grab`)])
    assert.deepEqual(rs.map((r) => r.status).sort(), [200, 409])
  })

  test('指定护航拒单后转为待派单', async () => {
    const o = (await boss.post('/api/orders', { productId: 5, spec: '单次', mode: 'assign', escortId: 4, gameId: 'G' })).body
    assert.equal((await boss.post(`/api/orders/${o.id}/pay`, { method: 'wechat' })).body.order.status, '待接单')
    const r = (await hh02.post(`/api/orders/${o.id}/respond`, { accept: false })).body
    assert.equal(r.status, '待派单')
    assert.equal(r.escortId, null)
  })

  test('余额支付 → 申请退款 → 同意 → 退回余额', async () => {
    const before = (await boss.get('/api/wallet')).body.balance
    const o = (await boss.post('/api/orders', { productId: 3, spec: '单次', mode: 'dispatch', gameId: 'G' })).body
    await boss.post(`/api/orders/${o.id}/pay`, { method: 'balance' })
    assert.equal((await boss.get('/api/wallet')).body.balance, before - 99)
    assert.equal((await boss.post(`/api/orders/${o.id}/refund`, { reason: '不想打了' })).body.status, '退款中')
    assert.equal((await cs.post(`/api/orders/${o.id}/refund/handle`, { approve: true })).body.status, '已退款')
    assert.equal((await boss.get('/api/wallet')).body.balance, before)
  })

  test('拒绝退款回到原状态', async () => {
    const o = (await boss.post('/api/orders', { productId: 2, spec: '单次', mode: 'dispatch', gameId: 'G' })).body
    await boss.post(`/api/orders/${o.id}/pay`, { method: 'wechat' })
    await boss.post(`/api/orders/${o.id}/refund`, {})
    assert.equal((await admin.post(`/api/orders/${o.id}/refund/handle`, { approve: false })).body.status, '待派单')
  })

  test('余额不足不能支付', async () => {
    const u = await wxLogin('poor-guy')
    const o = (await u.post('/api/orders', { productId: 4, spec: '单次', mode: 'dispatch', gameId: 'G' })).body
    const r = await u.post(`/api/orders/${o.id}/pay`, { method: 'balance' })
    assert.equal(r.status, 400)
    assert.match(r.body.message, /余额不足/)
  })

  test('看不到别人的订单；订单沟通', async () => {
    const other = await wxLogin('someone-else')
    const list = (await boss.get('/api/orders?scope=mine')).body
    assert.equal((await other.get(`/api/orders/${list[0].id}`)).status, 404)
    const ongoing = list.find((o) => o.status === '进行中')
    await boss.post(`/api/orders/${ongoing.id}/messages`, { text: '你好' })
    const msgs = (await hh01.get(`/api/orders/${ongoing.id}/messages`)).body
    assert.equal(msgs[msgs.length - 1].text, '你好')
    assert.equal((await hh02.get(`/api/orders/${ongoing.id}/messages`)).status, 403)
  })

  test('超时自动确认', async () => {
    const { autoConfirm } = require('../src/services/orderService')
    await db('orders').where({ status: '待确认' }).update({ submitted_at: Date.now() - 25 * 3600 * 1000 })
    assert.ok((await autoConfirm()) >= 1)
    assert.equal(Number((await db('orders').where({ status: '待确认' }).count({ c: '*' }))[0].c), 0)
  })
})

describe('优惠券 / 充值 / 提现', () => {
  test('领券、下单用券、支付后券变已使用', async () => {
    const c = (await admin.post('/api/coupons', { name: '测试券', amount: 20, minSpend: 100, days: 7 })).body
    assert.equal((await boss.post(`/api/coupons/${c.id}/claim`)).status, 200)
    assert.equal((await boss.post(`/api/coupons/${c.id}/claim`)).status, 400)
    const usable = (await boss.get('/api/coupons/usable?amount=198')).body
    const mine = usable.find((x) => x.couponId === c.id)
    const o = (await boss.post('/api/orders', { productId: 4, spec: '单次', mode: 'dispatch', gameId: 'G', couponId: mine.id })).body
    assert.equal(o.amount, 178)
    await boss.post(`/api/orders/${o.id}/pay`, { method: 'wechat' })
    const center = (await boss.get('/api/coupons/center')).body
    assert.equal(center.mine.find((x) => x.id === mine.id).state, '已使用')
  })

  test('充值到账并出现在首页提示', async () => {
    const before = (await boss.get('/api/wallet')).body.balance
    const r = (await boss.post('/api/wallet/recharge', { tierIndex: 1 })).body
    assert.equal(r.balance, before + 320)
    const recent = (await request(app).get('/api/wallet/recent')).body
    assert.equal(recent[0].name, '示***')
  })

  test('提现不能超过可提现金额，并发申请也不会超额', async () => {
    const inc = (await hh02.get('/api/income')).body
    assert.equal((await hh02.post('/api/withdrawals', { amount: inc.available + 1 })).status, 400)
    const half = Math.floor(inc.available * 0.6)
    const rs = await Promise.all([hh02.post('/api/withdrawals', { amount: half }), hh02.post('/api/withdrawals', { amount: half })])
    assert.deepEqual(rs.map((r) => r.status).sort(), [200, 400])
    const list = (await admin.get('/api/withdrawals')).body
    const w = list.find((x) => x.escortId === 4 && x.status === '待审核')
    assert.equal((await admin.post(`/api/withdrawals/${w.id}/handle`, { approve: true })).body.status, '已打款')
    assert.equal((await admin.post(`/api/withdrawals/${w.id}/handle`, { approve: true })).status, 409)
  })
})

describe('管理功能', () => {
  test('单子：新建、改价留日志、下架后老板看不到', async () => {
    await admin.post('/api/products', { name: '测试单', price: 50, cats: ['特惠'] })
    const p = (await admin.get('/api/products?includeOff=1')).body.find((x) => x.name === '测试单')
    await admin.post('/api/products', { id: p.id, name: '测试单', price: 60 })
    await admin.post(`/api/products/${p.id}/toggle`)
    assert.equal((await request(app).get(`/api/products/${p.id}`)).status, 404)
    const logs = (await admin.get('/api/logs')).body
    assert.ok(logs.some((l) => l.action === '修改价格'))
  })

  test('轮播图：添加、排序、删除', async () => {
    await admin.post('/api/banners', { src: 'cloud://env/b.jpg', title: '活动' })
    let list = (await request(app).get('/api/banners')).body
    assert.equal(list.length, 3)
    await admin.post(`/api/banners/${list[2].id}/move`, { dir: -1 })
    list = (await request(app).get('/api/banners')).body
    assert.equal(list[1].title, '活动')
    await admin.del(`/api/banners/${list[1].id}`)
    assert.equal((await request(app).get('/api/banners')).body.length, 2)
    assert.equal((await admin.post('/api/banners', { src: 'javascript:alert(1)' })).status, 400)
  })

  test('员工账号：新建、重置密码（随机）、停用后不能登录', async () => {
    const u = (await admin.post('/api/staff', { role: 'cs', name: '客服二', account: 'kefu02', password: '123456' })).body
    const rp = (await admin.post(`/api/staff/${u.id}/reset-password`)).body
    assert.equal(rp.password.length, 8)
    await login('kefu02', rp.password)
    await admin.post(`/api/staff/${u.id}/toggle`)
    assert.equal((await request(app).post('/api/auth/login').send({ account: 'kefu02', password: rp.password })).status, 403)
  })

  test('护航报名通过后自动开号', async () => {
    const list = (await cs.get('/api/applications')).body
    const r = (await cs.post(`/api/applications/${list[0].id}/handle`, { approve: true })).body
    assert.match(r.account.account, /^hh\d+$/)
    const e = await login(r.account.account, r.account.password)
    assert.equal(e.user.role, 'escort')
  })

  test('拉黑老板后无法访问', async () => {
    const u = await wxLogin('bad-guy')
    await cs.post(`/api/customers/${u.user.id}/toggle`, { reason: '恶意退款' })
    const r = await u.get('/api/orders?scope=mine')
    assert.equal(r.status, 401)
    assert.match(r.body.message, /停用/)
  })

  test('设置：老板看不到分成比例；修改后生效', async () => {
    assert.equal((await request(app).get('/api/settings')).body.shareRate, undefined)
    await admin.post('/api/settings', { shareRate: 0.65, notice: '新公告', recharge: { tiers: [{ pay: 200, bonus: 10 }] } })
    const s = (await hh01.get('/api/settings')).body
    assert.equal(s.shareRate, 0.65)
    assert.equal(s.notice, '新公告')
    assert.deepEqual((await request(app).get('/api/wallet/tiers')).body, [{ pay: 200, bonus: 10 }])
    assert.equal((await admin.post('/api/settings', { shareRate: 2 })).status, 400)
  })

  test('工单：提交、客服回复、解决', async () => {
    const t = (await boss.post('/api/tickets', { type: '其他', content: '这是一个测试问题' })).body
    const r = (await cs.post(`/api/tickets/${t.id}/reply`, { text: '收到', resolve: true })).body
    assert.equal(r.status, '已解决')
    assert.equal(r.replies[0].text, '收到')
  })

  test('经营数据和待办数', async () => {
    const a = (await owner.get('/api/analytics?days=30')).body
    assert.ok(a.money.gmv > 0)
    assert.equal(a.trend.length, 30)
    assert.ok(a.escorts.length >= 3)
    const todo = (await cs.get('/api/orders/todo')).body
    assert.ok(todo.waitDispatch >= 1)
    const users = (await cs.get('/api/customers')).body
    assert.ok(users[0].spent >= users[users.length - 1].spent)
  })
})
