<template>
  <view v-if="me">
    <StaffHead v-if="me.role === 'cs'" :user="me" />
    <view class="wrap">
      <ModuleGrid v-if="me.role === 'cs'" :items="modules" />

      <view class="seg tabs">
        <view v-for="t in tabs" :key="t.key" class="seg-item" :class="{ on: t.key === tab }" @tap="tab = t.key">
          {{ t.name }}{{ t.badge && shown(t.key).length ? ' ' + shown(t.key).length : '' }}
        </view>
      </view>
      <text class="muted tip">{{ tips[tab] }}</text>
      <OrderCard v-for="o in shown(tab)" :key="o.id" :order="o" show-user @open="open">
        <view v-for="b in actionsFor(o, me)" :key="b.key" class="btn sm" :class="{ ghost: b.ghost }" @tap="act(b.key, o)">{{ b.label }}</view>
      </OrderCard>
      <Empty v-if="!shown(tab).length" text="暂无订单" />
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { listOrders, getTodo } from '@/api/orders.js'
import { session, guard } from '@/store/session.js'
import { actionsFor, doAction } from '@/orderActions.js'
import { run } from '@/utils.js'
import StaffHead from '@/components/StaffHead.vue'
import OrderCard from '@/components/OrderCard.vue'
import ModuleGrid from '@/components/ModuleGrid.vue'
import Empty from '@/components/Empty.vue'

const me = computed(() => session.user)
const FILTER = { dispatch: ['待派单', '待接单'], refund: ['退款中'], doing: ['已接单', '进行中', '待确认'], all: [] }
const tabs = [
  { key: 'dispatch', name: '待派单', badge: true },
  { key: 'refund', name: '退款', badge: true },
  { key: 'doing', name: '进行中' },
  { key: 'all', name: '全部' }
]
const tips = {
  dispatch: '派单时会显示护航是否在线、手上有几单；「待接单」是老板指定了护航但对方还没接，必要时可以改派',
  refund: '同意后订单变为已退款；拒绝则订单继续',
  doing: '已派出的单，可以随时进入订单沟通介入处理',
  all: ''
}
const tab = ref('dispatch')
const orders = ref([])
const todo = ref({})
const shown = (k) => orders.value.filter((o) => !FILTER[k].length || FILTER[k].includes(o.status))
const modules = computed(() => [
  { title: '售后工单', icon: '单', url: '/pages/staff/tickets', badge: todo.value.tickets },
  { title: '护航报名', icon: '报', url: '/pages/staff/applications', badge: todo.value.applications },
  { title: '用户管理', icon: '户', url: '/pages/staff/users' },
  { title: '护航状态', icon: '航', url: '/pages/staff/escorts' }
])

onLoad((q) => {
  if (q.tab) tab.value = q.tab
  if (session.user && session.user.role === 'admin') uni.setNavigationBarTitle({ title: q.tab === 'all' ? '全部订单' : '订单处理' })
})
async function load() {
  if (!guard(['cs', 'admin'])) return
  orders.value = (await run(listOrders(me.value, { scope: 'all' }))) || []
  todo.value = (await run(getTodo(me.value))) || {}
}
onShow(load)
onPullDownRefresh(async () => { await load(); uni.stopPullDownRefresh() })
const open = (id) => uni.navigateTo({ url: `/pages/order/order?id=${id}` })
async function act(key, o) { if (await doAction(key, o, me.value)) load() }
</script>

<style scoped>
.tabs { margin-top: 24rpx; }
.wrap > .seg:first-child { margin-top: 0; }
.tip { display: block; font-size: 22rpx; margin: 16rpx 8rpx; line-height: 1.5; }
</style>
