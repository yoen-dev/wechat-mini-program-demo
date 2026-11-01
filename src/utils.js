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
