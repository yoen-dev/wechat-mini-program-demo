// 首页轮播图接口（模拟）
// 真实环境：图片上传到云存储 / 对象存储，这里只存图片地址和顺序。
import { db, save, nextId, respond, fail, audit } from './db.js'
import rights from '@/static/banner/rights.jpg'
import aftersale from '@/static/banner/aftersale.jpg'

// 内置示例图：数据里只存 key，显示时再换成真实地址（打包后文件名会变）
const BUILTIN = { rights, aftersale }
export const MAX_BANNERS = 9

function list() {
  const d = db()
  if (!d.banners) {
    d.banners = [
      { id: 1, title: '老板权益', src: 'builtin:rights' },
      { id: 2, title: '售后说明', src: 'builtin:aftersale' }
    ]
    save()
  }
  return d.banners
}

/** 把存储的 src 转成可显示的地址 */
export function bannerUrl(src) {
  return src && src.startsWith('builtin:') ? BUILTIN[src.slice(8)] : src
}

export function listBanners() {
  return respond(list().map((b) => ({ ...b, url: bannerUrl(b.src) })), 60)
}

export function addBanner(actor, { src, title }) {
  if (actor.role !== 'admin') return fail('无权限')
  if (!src) return fail('请选择图片')
  const l = list()
  if (l.length >= MAX_BANNERS) return fail(`最多 ${MAX_BANNERS} 张`)
  l.push({ id: nextId('banner'), title: (title || '').trim() || `图片 ${l.length + 1}`, src })
  audit(actor, '添加轮播图', l[l.length - 1].title)
  save()
  return respond({ ok: true })
}

export function removeBanner(actor, id) {
  if (actor.role !== 'admin') return fail('无权限')
  const l = list()
  const i = l.findIndex((b) => b.id === id)
  if (i < 0) return fail('图片不存在')
  audit(actor, '删除轮播图', l[i].title)
  l.splice(i, 1)
  save()
  return respond({ ok: true })
}

export function moveBanner(actor, id, dir) {
  if (actor.role !== 'admin') return fail('无权限')
  const l = list()
  const i = l.findIndex((b) => b.id === id)
  const j = i + dir
  if (i < 0 || j < 0 || j >= l.length) return respond({ ok: false })
  ;[l[i], l[j]] = [l[j], l[i]]
  save()
  return respond({ ok: true })
}

export function renameBanner(actor, id, title) {
  if (actor.role !== 'admin') return fail('无权限')
  const b = list().find((x) => x.id === id)
  if (!b) return fail('图片不存在')
  b.title = (title || '').trim() || b.title
  save()
  return respond({ ok: true })
}
