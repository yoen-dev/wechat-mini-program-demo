/**
 * 单子（商品）接口  /api/products/...
 *
 *   GET  /              列表   ?cat=分类&keyword=关键词&includeOff=1（includeOff 只有管理员有效，含已下架）
 *   GET  /:id           详情（已下架的单子老板看不到）
 *   POST /              新建或保存（管理员）  { id?, name, price, desc, cats, tags, points }
 *   POST /:id/toggle    上架 / 下架（管理员）
 */
const express = require('express')
const db = require('../db')
const serialize = require('../services/serialize')
const { audit } = require('../services/audit')
const { need } = require('../middleware/auth')
const { wrap, bad, notFound } = require('../utils/errors')
const { clean, toId, now } = require('../utils/helpers')

const router = express.Router()
const isAdmin = (u) => !!u && u.role === 'admin'

// 把前端传来的数组整理干净（去空、限制个数和长度）
const cleanList = (a, max = 10, len = 60) => (Array.isArray(a) ? a.map((s) => clean(s, len)).filter(Boolean).slice(0, max) : [])

// 列表
router.get('/', wrap(async (req, res) => {
  const cat = clean(req.query.cat, 20)
  const keyword = clean(req.query.keyword, 30)
  const q = db('products').orderBy('sort').orderBy('id')
  if (!(isAdmin(req.user) && req.query.includeOff)) q.where({ on_sale: true })
  if (keyword) q.where((w) => w.where('name', 'like', `%${keyword}%`).orWhere('description', 'like', `%${keyword}%`))
  let list = (await q).map(serialize.product)
  if (cat) list = list.filter((p) => p.cats.includes(cat)) // 分类存在 JSON 里，取出来再筛
  res.json(list)
}))

// 详情
router.get('/:id', wrap(async (req, res) => {
  const p = await db('products').where({ id: toId(req.params.id) }).first()
  if (!p || (!p.on_sale && !isAdmin(req.user))) throw notFound('单子不存在或已下架')
  res.json(serialize.product(p))
}))

// 新建 / 保存
router.post('/', need('admin'), wrap(async (req, res) => {
  const b = req.body
  const price = Math.round(Number(b.price) * 100) / 100
  const name = clean(b.name, 64)
  if (!name) throw bad('请填写名称')
  if (!(price > 0 && price < 1000000)) throw bad('请填写正确的价格')
  const data = {
    name, price, description: clean(b.desc, 255),
    cats: JSON.stringify(cleanList(b.cats, 10, 20)), tags: JSON.stringify(cleanList(b.tags, 8, 20)), points: JSON.stringify(cleanList(b.points, 12, 120))
  }
  if (b.id) {
    const p = await db('products').where({ id: toId(b.id) }).first()
    if (!p) throw notFound('单子不存在')
    await db('products').where({ id: p.id }).update(data)
    if (Number(p.price) !== price) await audit(req.user, '修改价格', `${p.name} ¥${Number(p.price)} → ¥${price}`)
    else await audit(req.user, '编辑单子', name)
  } else {
    const [{ m }] = await db('products').max({ m: 'sort' })
    await db('products').insert({ ...data, on_sale: true, sort: (m || 0) + 1, created_at: now() })
    await audit(req.user, '新建单子', `${name} ¥${price}`)
  }
  res.json({ ok: true })
}))

// 上架 / 下架
router.post('/:id/toggle', need('admin'), wrap(async (req, res) => {
  const p = await db('products').where({ id: toId(req.params.id) }).first()
  if (!p) throw notFound('单子不存在')
  await db('products').where({ id: p.id }).update({ on_sale: !p.on_sale })
  await audit(req.user, p.on_sale ? '下架单子' : '上架单子', p.name)
  res.json(serialize.product(await db('products').where({ id: p.id }).first()))
}))

module.exports = router
