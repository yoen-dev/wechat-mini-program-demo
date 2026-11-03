/**
 * 定时任务：超时自动确认订单
 * 作用：每分钟检查一次「待确认」的订单，超过设置的时长（管理后台 → 分成与设置 → 自动确认时长）就自动确认完成。
 * 由 src/index.js 启动时开启。
 */
const { autoConfirm } = require('../services/orderService')

const INTERVAL_MS = 60 * 1000

function startAutoConfirmJob() {
  const tick = () => autoConfirm()
    .then((n) => n && console.log(`[自动确认] ${n} 个订单超时，已自动确认完成`))
    .catch((e) => console.error('[自动确认] 出错：', e.message))
  setTimeout(tick, 5000) // 启动 5 秒后先跑一次
  return setInterval(tick, INTERVAL_MS)
}

module.exports = { startAutoConfirmJob }
