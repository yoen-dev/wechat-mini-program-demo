// 前后端约定的常量和小工具
// 模拟接口（src/api/mock）和真实接口（src/api/remote）共用这里的定义，页面通过 @api/xxx.js 引用时都能拿到。
// 改这里的内容时，记得同步后端：订单状态在 server/src/services/orderService.js，规格倍数在同文件的 SPECS。
import rights from '@/static/banner/rights.jpg'
import aftersale from '@/static/banner/aftersale.jpg'

// 当前用的是哪套接口：mock（数据存在本机，网页预览用）/ cloud（微信云托管）/ http（直接请求某个地址，本地联调用）
export const API_MODE = import.meta.env.VITE_API || 'mock'
export const IS_MOCK = API_MODE === 'mock'

// ---------------- 订单 ----------------
export const STATUS = ['待付款', '待派单', '待接单', '已接单', '进行中', '待确认', '已完成', '退款中', '已退款', '已取消']
export const REFUNDABLE = ['待派单', '待接单', '已接单'] // 可以申请退款的状态
export const ACTIVE = ['待派单', '待接单', '已接单', '进行中', '待确认'] // 进行中的单

// ---------------- 单子 ----------------
export const CATEGORIES = ['保底单', '清图单', '特惠', '明星护航']
// 规格：按次数打包，rate 为相对单次价格的倍数（后端按同样的倍数算钱）
export const SPECS = [
  { name: '单次', times: 1, rate: 1 },
  { name: '三次套餐', times: 3, rate: 2.73 },
  { name: '五次套餐', times: 5, rate: 4.41 }
]
export const specPrice = (price, spec) => Math.round(price * spec.rate)

// ---------------- 账号 ----------------
export const ROLE_NAME = { user: '老板', escort: '护航', cs: '客服', admin: '管理员', owner: '负责人' }
export const STAFF_ROLES = ['escort', 'cs', 'admin', 'owner']

// ---------------- 售后 ----------------
export const TICKET_TYPES = ['服务质量', '退款问题', '护航态度', '其他']

// ---------------- 轮播图 ----------------
export const MAX_BANNERS = 9
// 内置示例图：数据里只存 builtin:xxx，显示时换成打包后的真实地址
const BUILTIN = { rights, aftersale }
export function bannerUrl(src) {
  return src && src.startsWith('builtin:') ? BUILTIN[src.slice(8)] : src
}

// ---------------- 其他 ----------------
/** 名字打码：Kevin → K***，小雨 → 小* */
export function maskName(name = '') {
  if (!name) return '用户'
  return name.slice(0, 1) + '*'.repeat(Math.min(3, Math.max(1, name.length - 1)))
}
