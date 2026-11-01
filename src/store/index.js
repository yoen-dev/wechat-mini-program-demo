// 演示用的本地数据和状态。接后端时把这里换成接口请求即可，页面不用改。
import { reactive } from 'vue'

export const BRAND = { name: '海屿服务站', en: 'OCEAN SERVICE', slogan: '护航 · 保底 · 清图' }

// 分类：art 对应 static/art 里的插画，icon 是首页入口图标
export const categories = [
  { key: '保底单', en: 'GUARANTEE', art: 'wave', icon: 'ic-anchor' },
  { key: '清图单', en: 'CLEAR MAP', art: 'boat', icon: 'ic-shell' },
  { key: '特惠专区', en: 'VALUE', art: 'shell', icon: 'ic-compass' },
  { key: '明星护航', en: 'SIGNATURE', art: 'star', icon: 'ic-laurel' }
]

export const products = [
  {
    id: 1, name: '绝密保底单', en: 'TOP SECRET', price: 88, art: 'wave', cats: ['保底单'],
    desc: '保底 1000 万哈夫币，打不到继续护航', tags: ['不卡保底', '全程语音', '装备归你'],
    points: ['保底 1000 万哈夫币，打不到保底继续护航', '可选客服派单或指定护航', '全程语音沟通，体验良好', '装备全部归老板所有']
  },
  {
    id: 2, name: '体验清图单', en: 'TRIAL RUN', price: 5, art: 'boat', cats: ['清图单', '特惠专区'],
    desc: '两位护航带你清图，新人首单推荐', tags: ['新人首选', '双人护航', '低价体验'],
    points: ['两位护航带你清图', '不清图不计入保底', '新人首单推荐', '全程语音沟通']
  },
  {
    id: 3, name: '高额保底单', en: 'HIGH YIELD', price: 99, art: 'lighthouse', cats: ['保底单', '特惠专区'],
    desc: '保底 1188 万，超高性价比', tags: ['高额保底', '性价比', '不卡保底'],
    points: ['保底 1188 万哈夫币', '绝不卡保底', '可选客服派单或指定护航', '售后不满意随时升级处理']
  },
  {
    id: 4, name: '极速清图单', en: 'SPEED CLEAR', price: 198, art: 'shell', cats: ['清图单'],
    desc: '单局 1000 万 + 限时清图', tags: ['限时清图', '单局千万', '节奏快'],
    points: ['单局 1000 万哈夫币', '限时清图，节奏更快', '全程语音沟通', '按时完成']
  },
  {
    id: 5, name: '明星护航单', en: 'SIGNATURE', price: 168, art: 'star', cats: ['明星护航'],
    desc: '指定大神，边打边教', tags: ['指定大神', '语音教学', '品质护航'],
    points: ['从明星护航中挑选你想要的人', '全程语音指导，边打边教', '按局计费，时间灵活', '售后不满意随时升级处理']
  }
]

export const specs = [
  { name: '单次护航', times: 1, rate: 1 },
  { name: '三次套餐', times: 3, rate: 2.73 },
  { name: '五次套餐', times: 5, rate: 4.41 }
]
export const specPrice = (p, s) => Math.round(p.price * s.rate)

export const escorts = [
  { id: 'a', name: '[护航 A]', orders: '[数]' },
  { id: 'b', name: '[护航 B]', orders: '[数]' },
  { id: 'c', name: '[护航 C]', orders: '[数]' }
]

export const faqs = [
  { q: '下单流程', a: '1. 选择单子和规格\n2. 选择客服派单或指定护航，填写游戏昵称 / ID\n3. 微信支付后，护航会通过「订单沟通」联系你并拉你进队' },
  { q: '服务说明', a: '保底单打不到保底会继续护航直到达标；清图单不清图不计入保底。护航全程语音沟通，装备全部归老板所有。' },
  { q: '退款与售后', a: '护航开始前可申请全额退款；服务中不满意可随时联系客服升级处理。具体规则以 [售后条款] 为准。' }
]

export const ORDER_STATUS = ['待付款', '待接单', '进行中', '已完成', '已退款']

const now = () => {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export const state = reactive({
  presetCat: '',
  keyword: '',
  orders: [
    { id: 1001, productId: 1, spec: '单次护航', amount: 88, mode: 'assign', escortId: 'a', status: '进行中', time: '10-31 14:20', gameId: '', note: '' },
    { id: 1002, productId: 3, spec: '三次套餐', amount: 270, mode: 'dispatch', escortId: null, status: '待接单', time: '10-31 13:02', gameId: '', note: '' },
    { id: 1003, productId: 2, spec: '单次护航', amount: 5, mode: 'dispatch', escortId: 'c', status: '已完成', time: '10-30 21:17', gameId: '', note: '' }
  ],
  messages: {
    1001: [
      { me: false, text: '老板好，我是这单的护航，游戏 ID 发我一下，我拉你进队～' },
      { me: true, text: '[游戏 ID]' },
      { me: false, text: '收到，已发邀请。这把打航天基地，跟紧我。' }
    ]
  }
})

export const getProduct = (id) => products.find((p) => p.id === Number(id))
export const getEscort = (id) => escorts.find((e) => e.id === id)

export function describeOrder(o) {
  const p = getProduct(o.productId)
  const e = getEscort(o.escortId)
  const who = o.mode === 'assign' ? `指定 · ${e ? e.name : ''}` : `客服派单${e ? ' · ' + e.name : ''}`
  return { ...o, name: p.name, art: p.art, who }
}

export function placeOrder({ productId, spec, amount, mode, escortId, gameId, note }) {
  const id = Math.max(...state.orders.map((o) => o.id)) + 1
  state.orders.unshift({ id, productId, spec, amount, mode, escortId: mode === 'assign' ? escortId : null, status: '待接单', time: now(), gameId, note })
  return id
}

export function sendMessage(orderId, text) {
  if (!state.messages[orderId]) state.messages[orderId] = []
  state.messages[orderId].push({ me: true, text })
}
