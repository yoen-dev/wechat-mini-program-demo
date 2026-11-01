<template>
  <view v-if="me">
    <StaffHead :user="me" />
    <view class="wrap">
      <view class="seg">
        <view v-for="t in tabs" :key="t.key" class="seg-item" :class="{ on: t.key === tab }" @tap="tab = t.key">
          {{ t.name }}{{ count(t.key) ? ' ' + count(t.key) : '' }}
        </view>
      </view>
      <text class="muted tip">{{ tips[tab] }}</text>
      <OrderCard v-for="o in lists[tab]" :key="o.id" :order="o" show-user @open="open">
        <view v-for="b in actionsFor(o, me)" :key="b.key" class="btn sm" :class="{ ghost: b.ghost }" @tap="act(b.key, o)">{{ b.label }}</view>
      </OrderCard>
      <Empty v-if="!lists[tab].length" :text="tab === 'pool' ? '暂时没有可抢的单' : '暂无订单'" />
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { listOrders } from '@/api/orders.js'
import { session, guard } from '@/store/session.js'
import { actionsFor, doAction } from '@/orderActions.js'
import { run } from '@/utils.js'
import StaffHead from '@/components/StaffHead.vue'
import OrderCard from '@/components/OrderCard.vue'
import Empty from '@/components/Empty.vue'

const me = computed(() => session.user)
const tabs = [{ key: 'todo', name: '待处理' }, { key: 'pool', name: '抢单大厅' }, { key: 'done', name: '已完成' }]
const tips = { todo: '指定给你的单需要先接单；接单后点「开始护航」，打完点「完成订单」', pool: '客服还没派出去的单，先抢先得', done: '' }
const tab = ref('todo')
const lists = reactive({ todo: [], pool: [], done: [] })
const count = (k) => (k === 'done' ? 0 : lists[k].length)

async function load() {
  if (!guard(['escort'])) return
  const mine = (await run(listOrders(me.value, { scope: 'assigned' }))) || []
  lists.todo = mine.filter((o) => ['待接单', '已接单', '进行中'].includes(o.status))
  lists.done = mine.filter((o) => ['已完成', '已退款', '退款中'].includes(o.status))
  lists.pool = (await run(listOrders(me.value, { scope: 'pool' }))) || []
}
onShow(load)
onPullDownRefresh(async () => { await load(); uni.stopPullDownRefresh() })
const open = (id) => uni.navigateTo({ url: `/pages/order/order?id=${id}` })
async function act(key, o) {
  if (await doAction(key, o, me.value)) { await load(); if (key === 'grab') tab.value = 'todo' }
}
</script>

<style scoped>
.tip { display: block; font-size: 22rpx; margin: 16rpx 8rpx; }
</style>
