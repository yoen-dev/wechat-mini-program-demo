/**
 * 通用小工具
 * 作用：金额取两位小数、名字打码、手机号校验、JSON 安全解析等，在各个接口里复用。
 */

// 金额保留两位小数（避免 0.1 + 0.2 = 0.30000000000000004 这类问题）
const r2 = (n) => Math.round(Number(n || 0) * 100) / 100

// 当前毫秒时间戳（数据库里所有时间都用它）
const now = () => Date.now()

// 名字打码：Kevin → K***，小雨 → 小*（首页充值提示用）
function maskName(name = '') {
  if (!name) return '用户'
  return name.slice(0, 1) + '*'.repeat(Math.min(3, Math.max(1, name.length - 1)))
}

// 中国大陆手机号格式
const isPhone = (s) => /^1\d{10}$/.test(String(s || ''))

// 安全解析 JSON 字符串，解析失败返回默认值
function parseJson(s, fallback) {
  if (s === null || s === undefined || s === '') return fallback
  try { return JSON.parse(s) } catch (e) { return fallback }
}

// 去掉首尾空格并限制长度
const clean = (s, max = 200) => String(s === undefined || s === null ? '' : s).trim().slice(0, max)

// 把路由参数转成正整数 id，非法时返回 0
const toId = (v) => (Number.isInteger(Number(v)) && Number(v) > 0 ? Number(v) : 0)

module.exports = { r2, now, maskName, isPhone, parseJson, clean, toId }
