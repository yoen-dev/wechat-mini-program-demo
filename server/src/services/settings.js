/**
 * 系统设置读写
 * 作用：分成比例、自动确认时长、公告、常见问题、协议、充值档位等都存在 settings 表里（键值对），
 *       这里负责读取（没设置过就用默认值）和保存。
 * 想加一个新的设置项：在 DEFAULTS 里加一个默认值即可，管理后台的保存接口在 routes/settings.js。
 */
const db = require('../db')
const { parseJson } = require('../utils/helpers')

// 默认设置（数据库里没有时使用）
const DEFAULTS = {
  shareRate: 0.7, // 护航分成比例
  autoConfirmHours: 24, // 护航提交完成后，老板多久不确认就自动确认（0 = 关闭）
  notice: '', // 首页公告
  faqs: [
    { q: '怎么下单？', a: '1. 选单子和规格\n2. 选择客服派单或指定护航，填写游戏昵称 / ID\n3. 支付后护航会在「订单沟通」里联系你并拉你进队\n4. 护航打完提交完成，你确认后订单结束' },
    { q: '客服派单和指定护航有什么区别？', a: '客服派单：付款后由客服安排合适的护航，速度最快。\n指定护航：你自己选护航，需要等对方接单；如果对方暂时没空，会转为客服派单。' },
    { q: '可以退款吗？', a: '护航开始前可以在订单里申请退款，客服审核后原路退回；护航进行中有问题请提交售后。' },
    { q: '为什么要我确认完成？', a: '护航打完会上传战绩截图并提交完成，你核对无误后点「确认完成」。超时未确认将自动确认。' }
  ],
  agreements: { user: '【用户协议】\n\n[请在管理后台替换为正式内容]', privacy: '【隐私政策】\n\n[请在管理后台替换为正式内容]' },
  recharge: {
    tiers: [{ pay: 100, bonus: 0 }, { pay: 300, bonus: 20 }, { pay: 500, bonus: 50 }, { pay: 1000, bonus: 120 }],
    popup: true, // 首页是否弹「某某刚刚充值」
    popupMin: 100 // 充值多少元以上才弹
  }
}

// 读取全部设置（合并默认值）
async function getAll(trx = db) {
  const rows = await trx('settings').select()
  const out = JSON.parse(JSON.stringify(DEFAULTS))
  rows.forEach((r) => { out[r.k] = parseJson(r.v, out[r.k]) })
  return out
}

// 读取单个设置
async function get(key, trx = db) {
  const row = await trx('settings').where({ k: key }).first()
  return row ? parseJson(row.v, DEFAULTS[key]) : JSON.parse(JSON.stringify(DEFAULTS[key]))
}

// 保存单个设置（没有就新增，有就覆盖）
async function set(key, value, trx = db) {
  const v = JSON.stringify(value)
  const exists = await trx('settings').where({ k: key }).first()
  if (exists) await trx('settings').where({ k: key }).update({ v })
  else await trx('settings').insert({ k: key, v })
}

module.exports = { DEFAULTS, getAll, get, set }
