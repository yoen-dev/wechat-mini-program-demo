/**
 * 首页轮播图接口  /api/banners/...
 *
 *   GET    /             列表（按顺序）
 *   POST   /             添加（管理员）  { src: 图片地址（先调 /api/upload 上传拿到）, title }
 *   DELETE /:id          删除（管理员）
 *   POST   /:id/move     调整顺序（管理员）  { dir: -1 往前 / 1 往后 }
 *   POST   /:id/rename   改标题（管理员）    { title }
 *
 * 图片地址 builtin:rights / builtin:aftersale 表示小程序里自带的两张示例图，前端会自动换成真实图片。
 */
const express = require('express')
const db = require('../db')
const serialize = require('../services/serialize')
const { audit } = require('../services/audit')
const { need } = require('../middleware/auth')
const { wrap, bad, notFound } = require('../utils/errors')
const { clean, toId, now } = require('../utils/helpers')

const router = express.Router()
const MAX_BANNERS = 9

// 图片地址只允许：内置图、本站上传的图片、https 图片
const okSrc = (s) => /^builtin:[a-z]+$/.test(s) || /^https?:\/\/[^\s]+$/.test(s) || /^\/uploads\/[\w.-]+$/.test(s)

router.get('/', wrap(async (req, res) => {
  res.json((await db('banners').orderBy('sort').orderBy('id')).map(serialize.banner))
}))

router.post('/', need('admin'), wrap(async (req, res) => {
  const src = clean(req.body.src, 500)
  if (!src) throw bad('请选择图片')
  if (!okSrc(src)) throw bad('图片地址不正确')
  const [{ c }] = await db('banners').count({ c: '*' })
  if (Number(c) >= MAX_BANNERS) throw bad(`最多 ${MAX_BANNERS} 张`)
  const [{ m }] = await db('banners').max({ m: 'sort' })
  const title = clean(req.body.title, 64) || `图片 ${Number(c) + 1}`
  await db('banners').insert({ title, url: src, sort: (m || 0) + 1, created_at: now() })
  await audit(req.user, '添加轮播图', title)
  res.json({ ok: true })
}))

router.delete('/:id', need('admin'), wrap(async (req, res) => {
  const b = await db('banners').where({ id: toId(req.params.id) }).first()
  if (!b) throw notFound('图片不存在')
  await db('banners').where({ id: b.id }).del()
  await audit(req.user, '删除轮播图', b.title)
  res.json({ ok: true })
}))

// 和相邻的一张交换顺序
router.post('/:id/move', need('admin'), wrap(async (req, res) => {
  const list = await db('banners').orderBy('sort').orderBy('id')
  const i = list.findIndex((b) => b.id === toId(req.params.id))
  const j = i + (Number(req.body.dir) < 0 ? -1 : 1)
  if (i < 0 || j < 0 || j >= list.length) return res.json({ ok: false })
  await db.transaction(async (trx) => {
    // 先按当前顺序重新编号 1..n，再交换，避免 sort 值相同时交换无效
    for (let k = 0; k < list.length; k++) {
      const pos = k === i ? j : k === j ? i : k
      await trx('banners').where({ id: list[k].id }).update({ sort: pos + 1 })
    }
  })
  res.json({ ok: true })
}))

router.post('/:id/rename', need('admin'), wrap(async (req, res) => {
  const title = clean(req.body.title, 64)
  const n = title ? await db('banners').where({ id: toId(req.params.id) }).update({ title }) : 1
  if (!n) throw notFound('图片不存在')
  res.json({ ok: true })
}))

module.exports = router
