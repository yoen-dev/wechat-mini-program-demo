// 演示用的本地数据和状态。接后端时把这里换成接口请求即可，页面不用改。
import { reactive } from 'vue'

export const categories = ['全部', '特惠专区', '保底单', '清图单', '趣味单', '导师单']

export const products = [
  { id: 1, name: '体验清图单', desc: '两位护航带你清图，不清图不计入保底', price: 5, tag: '限时', cats: ['特惠专区', '清图单'] },
  { id: 2, name: '绝密保底单', desc: '保底 1000 万哈夫币，打不到保底继续护航直到达标', price: 88, tag: '热卖', cats: ['保底单'] },
  { id: 3, name: '极速清图单', desc: '单局 1000 万 + 限时清图', price: 198, tag: '限时', cats: ['清图单'] },
  { id: 4, name: '高额保底单', desc: '保底 1188 万，超高性价比', price: 99, tag: '新品', cats: ['保底单', '特惠专区'] }
]

export const escorts = [
  { id: 'a', name: '[护航 A]', orders: '[数]' },
  { id: 'b', name: '[护航 B]', orders: '[数]' },
  { id: 'c', name: '[护航 C]', orders: '[数]' }
]

export const ORDER_STATUS = ['已付款', '已接单', '护航中', '已完成', '已退款']

export const state = reactive({
  presetCat: '全部', // 首页跳分类时预选的类目
  keyword: '',       // 首页搜索词
  orders: [
    { id: 1001, productId: 2, mode: 'assign', escortId: 'a', status: '护航中', gameId: '', note: '' },
    { id: 1002, productId: 1, mode: 'dispatch', escortId: null, status: '已付款', gameId: '', note: '' },
    { id: 1003, productId: 4, mode: 'dispatch', escortId: 'c', status: '已完成', gameId: '', note: '' }
  ],
  messages: {
    1001: [
      { me: false, text: '老板好，我是这单的护航，游戏 ID 发我一下，我拉你进队～' },
      { me: true, text: '[游戏 ID]' },
      { me: false, text: '收到，已发邀请。这把打航天基地，跟紧我。' }
    ]
  }
})

export function getProduct(id) {
  return products.find((p) => p.id === Number(id))
}

export function getEscort(id) {
  return escorts.find((e) => e.id === id)
}

export function describeOrder(o) {
  const p = getProduct(o.productId)
  const e = getEscort(o.escortId)
  const who = o.mode === 'assign' ? `指定护航 · ${e ? e.name : ''}` : `客服派单 · ${e ? e.name : '等待分配'}`
  return { ...o, name: p.name, price: p.price, who }
}

export function placeOrder({ productId, mode, escortId, gameId, note }) {
  const id = Math.max(...state.orders.map((o) => o.id)) + 1
  state.orders.unshift({ id, productId, mode, escortId: mode === 'assign' ? escortId : null, status: '已付款', gameId, note })
  return id
}

export function sendMessage(orderId, text) {
  if (!state.messages[orderId]) state.messages[orderId] = []
  state.messages[orderId].push({ me: true, text })
}
