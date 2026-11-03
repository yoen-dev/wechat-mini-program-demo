<template>
  <view v-if="me">
    <StaffHead :user="me" />
    <view class="wrap">
      <view class="grid2">
        <view class="card stat"><text class="muted sl">今日订单</text><text class="sv">{{ todo.todayOrders || 0 }}</text></view>
        <view class="card stat"><text class="muted sl">今日成交</text><text class="sv">¥{{ todo.todayIncome || 0 }}</text></view>
      </view>

      <text class="gt">待办</text>
      <ModuleGrid :items="todoItems" />

      <text class="gt">订单与服务</text>
      <ModuleGrid :items="serviceItems" />

      <text class="gt">运营</text>
      <ModuleGrid :items="opsItems" />

      <text class="gt">财务与系统</text>
      <ModuleGrid :items="sysItems" />
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { getTodo } from '@/api/orders.js'
import { session, guard } from '@/store/session.js'
import { run } from '@/utils.js'
import StaffHead from '@/components/StaffHead.vue'
import ModuleGrid from '@/components/ModuleGrid.vue'

const me = computed(() => session.user)
const todo = ref({})

// 管理员 = 大后台：客服的全部功能 + 运营、财务、系统设置
const todoItems = computed(() => [
  { title: '待派单', icon: '派', url: '/pages/staff/cs', badge: todo.value.waitDispatch },
  { title: '退款审核', icon: '退', url: '/pages/staff/cs?tab=refund', badge: todo.value.refunding },
  { title: '售后工单', icon: '单', url: '/pages/staff/tickets', badge: todo.value.tickets },
  { title: '提现审批', icon: '提', url: '/pages/staff/withdrawals', badge: todo.value.withdrawals }
])
const serviceItems = computed(() => [
  { title: '全部订单', icon: '订', url: '/pages/staff/cs?tab=all' },
  { title: '护航报名', icon: '报', url: '/pages/staff/applications', badge: todo.value.applications },
  { title: '用户管理', icon: '户', url: '/pages/staff/users' },
  { title: '护航状态', icon: '航', url: '/pages/staff/escorts' }
])
const opsItems = [
  { title: '单子管理', icon: '商', url: '/pages/staff/products' },
  { title: '轮播图', icon: '图', url: '/pages/staff/banners' },
  { title: '优惠券', icon: '券', url: '/pages/staff/coupons' },
  { title: '储值充值', icon: '充', url: '/pages/staff/settings?part=recharge' },
  { title: '公告与问答', icon: '告', url: '/pages/staff/settings?part=content' }
]
const sysItems = [
  { title: '经营数据', icon: '数', url: '/pages/staff/owner' },
  { title: '分成与设置', icon: '设', url: '/pages/staff/settings' },
  { title: '员工账号', icon: '员', url: '/pages/staff/staff-list' },
  { title: '操作日志', icon: '志', url: '/pages/staff/logs' }
]

async function load() {
  if (!guard(['admin'])) return
  todo.value = (await run(getTodo(me.value))) || {}
}
onShow(load)
onPullDownRefresh(async () => { await load(); uni.stopPullDownRefresh() })
</script>

<style scoped>
.grid2 { display: flex; gap: 16rpx; }
.stat { flex: 1; padding: 28rpx; display: flex; flex-direction: column; gap: 8rpx; }
.sl { font-size: 24rpx; }
.sv { font-size: 44rpx; font-weight: 700; }
.gt { display: block; font-size: 26rpx; font-weight: 700; color: #595959; margin: 32rpx 8rpx 12rpx; }
</style>
