// 页面通用小工具：提示、确认框、时间格式化、手机号打码、选图上传
import { IS_MOCK } from '@/api/constants.js'
import { uploadImage } from '@/api/remote/request.js'

// 弹出一条文字提示（默认不带图标）
export const toast = (title, icon = 'none') => uni.showToast({ title, icon })

/** 执行接口调用，失败自动提示，返回结果或 null */
export async function run(promise) {
  try {
    return await promise
  } catch (e) {
    toast(e.message || '操作失败')
    return null
  }
}

// 时间戳 → 「11-03 14:05」
export function fmtTime(t) {
  if (!t) return ''
  const d = new Date(t)
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

// 弹确认框，用户点确定返回 true
export function confirm(content, title = '提示') {
  return new Promise((resolve) => uni.showModal({ title, content, success: (r) => resolve(r.confirm) }))
}

// 手机号打码：138****0000
export const maskPhone = (p) => (p ? p.slice(0, 3) + '****' + p.slice(7) : '')

/**
 * 从相册选一张图，返回可以保存到数据库的图片地址。
 * 真实后端：上传到云托管对象存储（返回 cloud:// 文件 ID）或本地后端（返回网址），见 src/api/remote/request.js 的 uploadImage。
 * 网页演示版：压缩后转成 base64 存在浏览器里；小程序演示版：保存到本地文件。
 */
export function pickImage(maxWidth = 1080) {
  return new Promise((resolve) => {
    uni.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      success: (r) => {
        const path = r.tempFilePaths[0]
        if (!IS_MOCK) {
          uni.showLoading({ title: '上传中', mask: true })
          uploadImage(path)
            .then((url) => { uni.hideLoading(); resolve(url) })
            .catch((e) => { uni.hideLoading(); toast(e.message || '上传失败'); resolve(null) })
          return
        }
        // #ifdef H5
        const img = new Image()
        img.onload = () => {
          const scale = Math.min(1, maxWidth / img.width)
          const c = document.createElement('canvas')
          c.width = Math.round(img.width * scale)
          c.height = Math.round(img.height * scale)
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
          resolve(c.toDataURL('image/jpeg', 0.82))
        }
        img.onerror = () => resolve(null)
        img.src = path
        // #endif
        // #ifndef H5
        uni.getFileSystemManager().saveFile({
          tempFilePath: path,
          success: (s) => resolve(s.savedFilePath),
          fail: () => resolve(path)
        })
        // #endif
      },
      fail: () => resolve(null)
    })
  })
}
