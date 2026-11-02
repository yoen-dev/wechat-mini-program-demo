<template>
  <view class="wrap">
    <template v-if="logged">
      <view class="seg">
        <view v-for="t in tabs" :key="t.name" class="seg-item" :class="{ on: t.name === tab }" @tap="tab = t.name">{{ t.name }}<text v-if="t.name === '待确认' && waiting" class="dotn">{{ waiting }}</text></view>
      </view>
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
import { listOrders } from '@/api/orders.js'
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
const tab = ref('全部')
const orders = ref([])
const logged = computed(() => session.user && session.user.role === 'user' && session.user.phone)
const waiting = computed(() => orders.value.filter((o) => o.status === '待确认').length)
const shown = computed(() => {
  const s = tabs.find((t) => t.name === tab.value).s
  return orders.value.filter((o) => !s.length || s.includes(o.status))
})

async function load() {
  if (!logged.value) return
  orders.value = (await run(listOrders(session.user, { scope: 'mine' }))) || []
}
onShow(load)
onPullDownRefresh(async () => { await load(); uni.stopPullDownRefresh() })

const open = (id) => uni.navigateTo({ url: `/pages/order/order?id=${id}` })
async function act(key, o) { if (await doAction(key, o, session.user)) load() }
</script>

<style scoped>
.list { margin-top: 20rpx; }
.dotn { margin-left: 4rpx; font-size: 18rpx; color: #FFFFFF; background: #F5222D; border-radius: 14rpx; padding: 0 8rpx; }
.login { width: 280rpx; margin-top: 16rpx; }
</style>
