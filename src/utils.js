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

export function fmtTime(t) {
  if (!t) return ''
  const d = new Date(t)
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export function confirm(content, title = '提示') {
  return new Promise((resolve) => uni.showModal({ title, content, success: (r) => resolve(r.confirm) }))
}

export const maskPhone = (p) => (p ? p.slice(0, 3) + '****' + p.slice(7) : '')

/**
 * 从相册选一张图，返回可以长期保存的地址。
 * 演示环境：网页版压缩后转成 base64 存在浏览器里；小程序版保存到本地文件。
 * 真实环境：这里改成上传到云存储，返回网络地址。
 */
export function pickImage(maxWidth = 1080) {
  return new Promise((resolve) => {
    uni.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      success: (r) => {
        const path = r.tempFilePaths[0]
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
