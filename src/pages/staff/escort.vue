<!--
  【护航】工作台：接单开关、收入概览、「我的订单 / 抢单大厅」两个标签。
-->
<template>
  <view v-if="me">
    <StaffHead :user="me" />
    <view class="wrap">
      <!-- 接单状态：休息时不会被派单，老板也看不到你 -->
      <view class="blk-banner between" :class="{ rest: !online }">
        <view class="st">
          <text class="b-t">{{ online ? '接单中' : '休息中' }}</text>
          <text class="b-s">{{ online ? '客服可以给你派单，老板可以指定你' : '不会被派单，老板也看不到你' }}</text>
        </view>
        <view class="btn sm light sw" @tap="toggle({ detail: { value: !online } })">{{ online ? '切换休息' : '开启接单' }}</view>
      </view>

      <!-- 收入概览（点进收入页） -->
      <view class="grid3" @tap="go('/pages/staff/income')">
        <view class="metric"><text class="m-l">可提现</text><text class="m-v">¥{{ income.available }}</text></view>
        <view class="metric"><text class="m-l">本月收入</text><text class="m-v">¥{{ income.month }}</text></view>
        <view class="metric"><text class="m-l">待老板确认</text><text class="m-v">¥{{ income.waiting }}</text></view>
      </view>

      <view class="grid2 links">
        <view class="btn" @tap="go('/pages/staff/income')">我的收入 / 提现</view>
        <view class="btn light" @tap="go('/pages/staff/profile')">我的主页 / 评价</view>
      </view>

      <!-- 我的订单 / 抢单大厅 -->
      <view class="tabsline">
        <view v-for="t in tabs" :key="t.key" class="tb" :class="{ on: t.key === tab }" @tap="tab = t.key">
          {{ t.name }}<text v-if="count(t.key)" class="dot">{{ count(t.key) }}</text>
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

// 当前登录的员工
const me = computed(() => session.user)
const tabs = [{ key: 'todo', name: '待处理' }, { key: 'pool', name: '抢单大厅' }, { key: 'done', name: '已完成' }]
const tips = {
  todo: '指定给你的单先接单；打完点「提交完成」并上传战绩截图，老板确认后收入入账',
  pool: '客服还没派出去的单，先抢先得（需要在接单中）',
  done: ''
}
// 当前选中的标签页
const tab = ref('todo')
// 我的订单和抢单大厅
const lists = reactive({ todo: [], pool: [], done: [] })
// 是否在接单中
const online = ref(false)
// 收入概览
const income = ref({ month: 0, available: 0, waiting: 0 })
// 各标签的数量
const count = (k) => (k === 'done' ? 0 : lists[k].length)

// 加载页面数据
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
// 每次显示页面时刷新（从别的页面返回也会触发）
onShow(load)
// 下拉刷新
onPullDownRefresh(async () => { await load(); uni.stopPullDownRefresh() })

// 切换接单 / 休息（休息时不能抢单，也不会出现在老板的指定列表）
async function toggle(e) {
  const r = await run(setOnline(me.value, e.detail.value))
  if (r) { online.value = r.online; toast(r.online ? '已开始接单' : '已切换为休息') }
}
// 跳转到对应页面
const go = (url) => uni.navigateTo({ url })
// 打开订单详情
const open = (id) => uni.navigateTo({ url: `/pages/order/order?id=${id}` })
// 点订单按钮；抢单成功后自动切到「我的订单」
async function act(key, o) {
  if (await doAction(key, o, me.value)) { await load(); if (key === 'grab') tab.value = 'todo' }
}
</script>

<style scoped>
.st { min-width: 0; padding-right: 16rpx; }
.rest { background: linear-gradient(110deg, #5B6F92, #8FA3C4); }
.sw { flex-shrink: 0; }
.m-v { font-size: 32rpx; }
.links { margin: 22rpx 0 30rpx; }
.tip { display: block; font-size: 21rpx; margin: -8rpx 6rpx 20rpx; line-height: 1.6; }
</style>
