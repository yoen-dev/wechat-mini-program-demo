// 单子（商品）接口（模拟）
import { db, save, nextId, respond, fail, audit, isAdmin } from './db.js'

export const CATEGORIES = ['保底单', '清图单', '特惠', '明星护航']

// 规格：按次数打包，rate 为相对单次价格的倍数
export const SPECS = [
  { name: '单次', times: 1, rate: 1 },
  { name: '三次套餐', times: 3, rate: 2.73 },
  { name: '五次套餐', times: 5, rate: 4.41 }
]
export const specPrice = (price, spec) => Math.round(price * spec.rate)

export function listProducts({ cat = '', keyword = '', includeOff = false } = {}) {
  const k = keyword.trim()
  const list = db().products
    .filter((p) => (includeOff || p.onSale) && (!cat || p.cats.includes(cat)) && (!k || p.name.includes(k) || p.desc.includes(k)))
    .sort((a, b) => a.sort - b.sort)
  return respond(list)
}

export function getProduct(id) {
  const p = db().products.find((x) => x.id === Number(id))
  return p ? respond(p) : fail('单子不存在或已下架')
}

/** 新建或保存单子（管理员） */
export function saveProduct(actor, input) {
  if (!isAdmin(actor)) return fail('无权限')
  const d = db()
  const price = Number(input.price)
  if (!input.name || !input.name.trim()) return fail('请填写名称')
  if (!(price > 0)) return fail('请填写正确的价格')
  const data = {
    name: input.name.trim(), price, desc: (input.desc || '').trim(),
    cats: input.cats || [], tags: input.tags || [], points: input.points || []
  }
  if (input.id) {
    const p = d.products.find((x) => x.id === input.id)
    if (!p) return fail('单子不存在')
    if (p.price !== price) audit(actor, '修改价格', `${p.name} ¥${p.price} → ¥${price}`)
    else audit(actor, '编辑单子', data.name)
    Object.assign(p, data)
  } else {
    d.products.push({ id: nextId('product'), onSale: true, sort: d.products.length + 1, ...data })
    audit(actor, '新建单子', `${data.name} ¥${price}`)
  }
  save()
  return respond({ ok: true })
}

export function toggleSale(actor, id) {
  if (!isAdmin(actor)) return fail('无权限')
  const p = db().products.find((x) => x.id === id)
  if (!p) return fail('单子不存在')
  p.onSale = !p.onSale
  audit(actor, p.onSale ? '上架单子' : '下架单子', p.name)
  save()
  return respond(p)
}
