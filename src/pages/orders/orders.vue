<!--
  【老板】订单列表：按「全部 / 待付款 / 进行中 / 待确认 / 已完成 / 退款」分标签显示。
-->
<template>
  <view class="wrap">
    <template v-if="logged">
      <!-- 状态标签（可左右滑），待确认上的数字是需要你确认完成的订单数 -->
      <scroll-view scroll-x class="tabsline" :show-scrollbar="false">
        <view v-for="t in tabs" :key="t.name" class="tb" :class="{ on: t.name === tab }" @tap="tab = t.name">{{ t.name }}<text v-if="t.name === '待确认' && waiting" class="dot">{{ waiting }}</text></view>
      </scroll-view>
      <view class="list">
        <OrderCard v-for="o in shown" :key="o.id" :order="o" @open="open">
          <view v-for="b in actionsFor(o, session.user)" :key="b.key" class="btn sm" :class="{ ghost: b.ghost }" @tap="act(b.key, o)">{{ b.label }}</view>
        </OrderCard>
        <Empty v-if="!shown.length" text="暂无订单" />
      </view>
    </template>
    <Empty v-else text="登录后查看你的订单">
      <view class="btn login" @tap="needUserLogin">去登录</view>
    </Empty>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { listOrders } from '@api/orders.js'
import { session, needUserLogin } from '@/store/session.js'
import { actionsFor, doAction } from '@/orderActions.js'
import { run } from '@/utils.js'
import OrderCard from '@/components/OrderCard.vue'
import Empty from '@/components/Empty.vue'

const tabs = [
  { name: '全部', s: [] },
  { name: '待付款', s: ['待付款'] },
  { name: '进行中', s: ['待派单', '待接单', '已接单', '进行中'] },
  { name: '待确认', s: ['待确认'] },
  { name: '已完成', s: ['已完成'] },
  { name: '售后', s: ['退款中', '已退款'] }
]
// 当前选中的标签页
const tab = ref('全部')
// 我的全部订单
const orders = ref([])
// 是否已登录
const logged = computed(() => session.user && session.user.role === 'user' && session.user.phone)
// 待确认的数量（标签上的红点）
const waiting = computed(() => orders.value.filter((o) => o.status === '待确认').length)
// 当前标签页的订单
const shown = computed(() => {
  const s = tabs.find((t) => t.name === tab.value).s
  return orders.value.filter((o) => !s.length || s.includes(o.status))
})

// 加载页面数据
async function load() {
  if (!logged.value) return
  orders.value = (await run(listOrders(session.user, { scope: 'mine' }))) || []
}
// 每次显示页面时刷新（从别的页面返回也会触发）
onShow(load)
// 下拉刷新
onPullDownRefresh(async () => { await load(); uni.stopPullDownRefresh() })

// 打开订单详情
const open = (id) => uni.navigateTo({ url: `/pages/order/order?id=${id}` })
// 点订单上的操作按钮（按钮规则和执行逻辑统一在 src/orderActions.js）
async function act(key, o) { if (await doAction(key, o, session.user)) load() }
</script>

<style scoped>
.list { margin-top: 4rpx; }
.login { width: 280rpx; margin-top: 16rpx; }
</style>
