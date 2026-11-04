<!--
  【客服】工作台（管理员也用这个页面处理订单）：待派单、退款、进行中订单分标签处理，顶部有待办数和功能入口。
-->
<template>
  <view v-if="me">
    <StaffHead v-if="me.role === 'cs'" :user="me" />
    <view class="wrap">
      <ModuleGrid v-if="me.role === 'cs'" :items="modules" />

      <!-- 订单分类标签，数字是要处理的单数 -->
      <view class="tabsline tabs">
        <view v-for="t in tabs" :key="t.key" class="tb" :class="{ on: t.key === tab }" @tap="tab = t.key">
          {{ t.name }}<text v-if="t.badge && shown(t.key).length" class="dot">{{ shown(t.key).length }}</text>
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
import { listOrders, getTodo } from '@api/orders.js'
import { session, guard } from '@/store/session.js'
import { actionsFor, doAction } from '@/orderActions.js'
import { run } from '@/utils.js'
import StaffHead from '@/components/StaffHead.vue'
import OrderCard from '@/components/OrderCard.vue'
import ModuleGrid from '@/components/ModuleGrid.vue'
import Empty from '@/components/Empty.vue'

// 当前登录的员工
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
// 当前选中的标签页
const tab = ref('dispatch')
// 全部订单
const orders = ref([])
// 待办数
const todo = ref({})
// 当前标签页要显示的列表
const shown = (k) => orders.value.filter((o) => !FILTER[k].length || FILTER[k].includes(o.status))
// 功能入口
const modules = computed(() => [
  { title: '售后工单', icon: '单', url: '/pages/staff/tickets', badge: todo.value.tickets },
  { title: '护航报名', icon: '报', url: '/pages/staff/applications', badge: todo.value.applications },
  { title: '用户管理', icon: '户', url: '/pages/staff/users' },
  { title: '护航状态', icon: '航', url: '/pages/staff/escorts' }
])

// 从管理后台跳过来时可以带 ?tab= 直接打开某个标签
onLoad((q) => {
  if (q.tab) tab.value = q.tab
  if (session.user && session.user.role === 'admin') uni.setNavigationBarTitle({ title: q.tab === 'all' ? '全部订单' : '订单处理' })
})
// 加载页面数据
async function load() {
  if (!guard(['cs', 'admin'])) return
  orders.value = (await run(listOrders(me.value, { scope: 'all' }))) || []
  todo.value = (await run(getTodo(me.value))) || {}
}
// 每次显示页面时刷新（从别的页面返回也会触发）
onShow(load)
// 下拉刷新
onPullDownRefresh(async () => { await load(); uni.stopPullDownRefresh() })
// 打开订单详情
const open = (id) => uni.navigateTo({ url: `/pages/order/order?id=${id}` })
// 点订单上的操作按钮（按钮规则和执行逻辑统一在 src/orderActions.js）
async function act(key, o) { if (await doAction(key, o, me.value)) load() }
</script>

<style scoped>
.tabs { margin-top: 28rpx; }
.tip { display: block; font-size: 21rpx; margin: -8rpx 6rpx 20rpx; line-height: 1.6; }
</style>
