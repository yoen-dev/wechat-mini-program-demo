/**
 * 测试工具
 * 作用：测试连接独立的测试库（escort_test，不会动开发数据），每个测试文件开始前重置为演示数据，
 *       并提供「用某个账号登录后发请求」的便捷方法。
 * 运行测试：npm test（需要本机有 MySQL，并建好 escort_test 库，账号同 .env）
 */
process.env.NODE_ENV = 'test'
process.env.DB_NAME = process.env.TEST_DB_NAME || 'escort_test'
process.env.WX_MOCK = 'true'
process.env.WX_CLOUD = 'false'
process.env.SMS_MOCK = 'true'
process.env.PAY_MOCK = 'true'

const request = require('supertest')
const app = require('../src/app')
const db = require('../src/db')
const seed = require('../src/db/seed')

// 重置测试库
async function reset() {
  await db.migrate.latest()
  await seed.demo()
}

// 员工账号密码登录，返回带令牌的请求方法：api.get(url) / api.post(url, body)
async function login(account, password) {
  const r = await request(app).post('/api/auth/login').send({ account, password })
  if (r.status !== 200) throw new Error(`登录失败 ${account}: ${r.body.message}`)
  return client(r.body.token, r.body.user)
}

// 老板微信登录（模拟模式下 code 决定 openid）
async function wxLogin(code = 'seed-openid') {
  const r = await request(app).post('/api/auth/wx').send({ code })
  return client(r.body.token, r.body.user, r.body)
}

function client(token, user, raw) {
  const h = (req) => req.set('Authorization', `Bearer ${token}`)
  return {
    token, user, raw,
    get: (url) => h(request(app).get(url)),
    post: (url, body = {}) => h(request(app).post(url)).send(body),
    del: (url) => h(request(app).delete(url))
  }
}

module.exports = { app, db, request, reset, login, wxLogin }
