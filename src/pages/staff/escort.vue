<template>
  <view v-if="me">
    <StaffHead :user="me" />
    <view class="wrap">
      <view class="card status between">
        <view>
          <text class="st-t">{{ online ? '接单中' : '休息中' }}</text>
          <text class="muted st-d">{{ online ? '客服可以给你派单，老板可以指定你' : '不会被派单，老板也看不到你' }}</text>
        </view>
        <switch :checked="online" color="#1F1F1F" @change="toggle" />
      </view>

      <view class="card money" @tap="go('/pages/staff/income')">
        <view class="m"><text class="muted ml">本月收入</text><text class="mv">¥{{ income.month }}</text></view>
        <view class="m"><text class="muted ml">可提现</text><text class="mv">¥{{ income.available }}</text></view>
        <view class="m"><text class="muted ml">待老板确认</text><text class="mv">¥{{ income.waiting }}</text></view>
        <text class="arrow">›</text>
      </view>

      <view class="links">
        <view class="btn ghost sm lk" @tap="go('/pages/staff/income')">我的收入 / 提现</view>
        <view class="btn ghost sm lk" @tap="go('/pages/staff/profile')">我的主页 / 评价</view>
      </view>

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
import { listOrders } from '@api/orders.js'
import { setOnline, listEscorts } from '@api/staff.js'
import { getIncome } from '@api/finance.js'
import { session, guard } from '@/store/session.js'
import { actionsFor, doAction } from '@/orderActions.js'
import { run, toast } from '@/utils.js'
import StaffHead from '@/components/StaffHead.vue'
import OrderCard from '@/components/OrderCard.vue'
import Empty from '@/components/Empty.vue'

const me = computed(() => session.user)
const tabs = [{ key: 'todo', name: '待处理' }, { key: 'pool', name: '抢单大厅' }, { key: 'done', name: '已完成' }]
const tips = {
  todo: '指定给你的单先接单；打完点「提交完成」并上传战绩截图，老板确认后收入入账',
  pool: '客服还没派出去的单，先抢先得（需要在接单中）',
  done: ''
}
const tab = ref('todo')
const lists = reactive({ todo: [], pool: [], done: [] })
const online = ref(false)
const income = ref({ month: 0, available: 0, waiting: 0 })
const count = (k) => (k === 'done' ? 0 : lists[k].length)

async function load() {
  if (!guard(['escort'])) return
  const mine = (await run(listOrders(me.value, { scope: 'assigned' }))) || []
  lists.todo = mine.filter((o) => ['待接单', '已接单', '进行中', '待确认'].includes(o.status))
  lists.done = mine.filter((o) => ['已完成', '已退款', '退款中'].includes(o.status))
  lists.pool = (await run(listOrders(me.value, { scope: 'pool' }))) || []
  const all = (await run(listEscorts())) || []
  const self = all.find((e) => e.id === me.value.id)
  online.value = !!(self && self.online)
  income.value = (await run(getIncome(me.value))) || income.value
}
onShow(load)
onPullDownRefresh(async () => { await load(); uni.stopPullDownRefresh() })

async function toggle(e) {
  const r = await run(setOnline(me.value, e.detail.value))
  if (r) { online.value = r.online; toast(r.online ? '已开始接单' : '已切换为休息') }
}
const go = (url) => uni.navigateTo({ url })
const open = (id) => uni.navigateTo({ url: `/pages/order/order?id=${id}` })
async function act(key, o) {
  if (await doAction(key, o, me.value)) { await load(); if (key === 'grab') tab.value = 'todo' }
}
</script>

<style scoped>
.status { padding: 24rpx 28rpx; }
.st-t { display: block; font-size: 32rpx; font-weight: 700; }
.st-d { display: block; font-size: 22rpx; margin-top: 4rpx; }
.money { display: flex; align-items: center; padding: 24rpx 28rpx; margin-top: 16rpx; }
.m { flex: 1; display: flex; flex-direction: column; gap: 6rpx; }
.ml { font-size: 22rpx; }
.mv { font-size: 34rpx; font-weight: 700; }
.links { display: flex; gap: 16rpx; margin: 16rpx 0 20rpx; }
.lk { flex: 1; }
.tip { display: block; font-size: 22rpx; margin: 16rpx 8rpx; line-height: 1.5; }
</style>
