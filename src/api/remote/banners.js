// 首页轮播图接口（真实后端版）  对应 server/src/routes/banners.js
// 图片先用 utils.js 的 pickImage() 选图并上传，拿到地址后再调 addBanner 保存。
import { get, post, del } from './request.js'
import { MAX_BANNERS, bannerUrl } from '../constants.js'
export { MAX_BANNERS, bannerUrl }

export async function listBanners() {
  return (await get('/banners')).map((b) => ({ ...b, url: bannerUrl(b.src) }))
}
export const addBanner = (actor, { src, title }) => post('/banners', { src, title })
export const removeBanner = (actor, id) => del(`/banners/${id}`)
export const moveBanner = (actor, id, dir) => post(`/banners/${id}/move`, { dir })
export const renameBanner = (actor, id, title) => post(`/banners/${id}/rename`, { title })
