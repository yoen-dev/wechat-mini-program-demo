<!--
  【老板】售后：提交售后工单（可关联订单），查看客服回复、追加说明。
-->
<template>
  <view class="wrap">
    <view class="card form">
      <text class="card-t">提交投诉 / 售后</text>
      <text class="label">问题类型</text>
      <view class="types">
        <view v-for="t in TICKET_TYPES" :key="t" class="fchip" :class="{ on: type === t }" @tap="type = t">{{ t }}</view>
      </view>
      <text class="label">相关订单（选填）</text>
      <view class="input pick" @tap="pickOrder"><text :class="orderId ? '' : 'muted'">{{ orderId ? '#' + orderId + ' ' + orderName : '选择订单' }}</text></view>
      <text class="label">问题描述</text>
      <textarea class="input area" v-model="content" placeholder="请描述遇到的问题，客服会尽快处理" auto-height />
      <button class="btn submit" :loading="busy" @tap="submit">提交</button>
    </view>

    <view class="section"><text class="s-t">我的售后记录</text></view>
    <view class="card tk" v-for="t in list" :key="t.id">
      <view class="between"><text class="tt">{{ t.type }}{{ t.orderId ? ' · 订单 #' + t.orderId : '' }}</text><text :class="['ts', t.status === '已解决' ? 'ok' : '']">{{ t.status }}</text></view>
      <text class="tc">{{ t.content }}</text>
      <view class="rp" v-for="(r, i) in t.replies" :key="i"><text class="rn">{{ r.role === 'user' ? '我' : '客服' }}：</text><text>{{ r.text }}</text></view>
      <view class="ops"><text class="muted small">{{ fmtTime(t.createdAt) }}</text><text class="lk" @tap="append(t)">补充说明</text></view>
    </view>
    <Empty v-if="!list.length" text="还没有售后记录" />
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { createTicket, listTickets, replyTicket, TICKET_TYPES } from '@api/service.js'
import { listOrders } from '@api/orders.js'
import { session, needUserLogin } from '@/store/session.js'
import { run, toast, fmtTime } from '@/utils.js'
import Empty from '@/components/Empty.vue'

// 问题类型
const type = ref(TICKET_TYPES[0])
// 关联的订单
const orderId = ref(null)
// 关联订单的显示文字
const orderName = ref('')
// 问题描述
const content = ref('')
// 提交中，防止重复点击
const busy = ref(false)
// 列表数据
const list = ref([])
let orders = []

// 页面打开时读取网址参数并加载数据
onLoad((q) => { if (q.orderId) orderId.value = Number(q.orderId) })
// 每次显示页面时刷新（从别的页面返回也会触发）
onShow(async () => {
  if (!needUserLogin()) return
  orders = ((await run(listOrders(session.user, { scope: 'mine' }))) || []).filter((o) => o.paidAt)
  const o = orders.find((x) => x.id === orderId.value)
  if (o) orderName.value = o.productName
  list.value = (await run(listTickets(session.user, { mine: true }))) || []
})
// 选择关联的订单
function pickOrder() {
  const l = orders.slice(0, 6)
  if (!l.length) return toast('没有可选的订单')
  uni.showActionSheet({ itemList: l.map((o) => `#${o.id} ${o.productName} · ${o.status}`), success: (r) => { orderId.value = l[r.tapIndex].id; orderName.value = l[r.tapIndex].productName } })
}
// 提交工单
async function submit() {
  busy.value = true
  const r = await run(createTicket(session.user, { orderId: orderId.value, type: type.value, content: content.value }))
  busy.value = false
  if (!r) return
  toast('已提交，客服会尽快处理', 'success')
  content.value = ''
  list.value = (await run(listTickets(session.user, { mine: true }))) || []
}
// 追加说明（已解决的工单追加后会重新打开）
function append(t) {
  uni.showModal({ title: '补充说明', editable: true, placeholderText: '输入补充内容', success: async (r) => {
    if (r.confirm && (r.content || '').trim() && (await run(replyTicket(session.user, t.id, r.content)))) list.value = (await run(listTickets(session.user, { mine: true }))) || []
  } })
}
</script>

<style scoped>
.form { padding: 30rpx 28rpx 32rpx; }
.types { display: flex; flex-wrap: wrap; gap: 14rpx; }
.fchip { font-size: 22rpx; padding: 16rpx 26rpx; border-radius: 20rpx; background: #E8EEFB; color: #7D91B3; }
.fchip.on { background: #4E76BD; color: #FFFFFF; font-weight: 700; }
.pick { display: flex; align-items: center; }
.area { height: auto; min-height: 180rpx; padding: 20rpx 24rpx; }
.submit { margin-top: 32rpx; }
.tk { padding: 26rpx 28rpx; margin-bottom: 18rpx; }
.tt { font-size: 26rpx; font-weight: 800; }
.ts { font-size: 20rpx; padding: 8rpx 16rpx; border-radius: 16rpx; background: #FFF0D8; color: #BB873A; }
.ts.ok { background: #E0F6EF; color: #269B79; }
.tc { display: block; font-size: 24rpx; color: #5B6F92; margin-top: 14rpx; line-height: 1.7; }
.rp { margin-top: 14rpx; padding: 16rpx 20rpx; background: #F0F5FF; border-radius: 20rpx; font-size: 23rpx; line-height: 1.6; color: #4F70A6; }
.rn { font-weight: 700; }
.ops { display: flex; justify-content: space-between; margin-top: 18rpx; }
.small { font-size: 21rpx; }
.lk { font-size: 23rpx; color: #4B72B8; font-weight: 600; }
</style>
