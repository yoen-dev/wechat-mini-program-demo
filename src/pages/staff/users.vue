<!--
  【客服 / 管理员】用户（老板）管理：搜索、查看消费和余额、最近订单、拉黑 / 解除拉黑。
-->
<template>
  <view class="wrap">
    <input class="input search" v-model="keyword" placeholder="搜索昵称或手机号" confirm-type="search" @confirm="load" @blur="load" />
    <text class="muted top">按累计消费排序，共 {{ list.length }} 人</text>
    <view class="card u" v-for="u in list" :key="u.id">
      <view class="between" @tap="toggleOpen(u.id)">
        <view class="ut">
          <view class="row"><text class="un">{{ u.name }}</text><text v-if="u.status !== 'active'" class="tag ban">已拉黑</text></view>
          <text class="muted um">{{ maskPhone(u.phone) || '未绑定手机' }} · 注册 {{ fmtTime(u.createdAt) }}</text>
        </view>
        <view class="us"><text class="price">¥{{ u.spent }}</text><text class="muted um">{{ u.orders }} 单 · 余额 ¥{{ u.balance }}</text></view>
      </view>
      <view v-if="openId === u.id" class="detail">
        <text class="muted um">最近下单：{{ u.lastOrderAt ? fmtTime(u.lastOrderAt) : '无' }}</text>
        <view class="ord" v-for="o in orders" :key="o.id" @tap="openOrder(o.id)">
          <text class="ellipsis">#{{ o.id }} {{ o.productName }}</text><text class="muted">¥{{ o.amount }} · {{ o.status }}</text>
        </view>
        <text v-if="!orders.length" class="muted um">没有订单</text>
        <view class="ops">
          <view class="btn sm" :class="u.status === 'active' ? 'danger' : 'ghost'" @tap="toggleBan(u)">{{ u.status === 'active' ? '拉黑' : '解除拉黑' }}</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { listCustomers, toggleCustomer } from '@api/service.js'
import { listOrders } from '@api/orders.js'
import { session, guard } from '@/store/session.js'
import { run, fmtTime, maskPhone, toast } from '@/utils.js'

// 搜索关键词（名字或手机号）
const keyword = ref('')
// 列表数据
const list = ref([])
// 展开查看订单的用户
const openId = ref(null)
// 展开用户的最近订单
const orders = ref([])

// 加载页面数据
async function load() {
  if (!guard(['cs', 'admin'])) return
  list.value = (await run(listCustomers(session.user, keyword.value))) || []
}
// 每次显示页面时刷新（从别的页面返回也会触发）
onShow(load)
// 展开 / 收起用户最近订单
async function toggleOpen(id) {
  if (openId.value === id) { openId.value = null; return }
  openId.value = id
  orders.value = ((await run(listOrders(session.user, { scope: 'user', userId: id }))) || []).slice(0, 10)
}
// 打开订单详情
const openOrder = (id) => uni.navigateTo({ url: `/pages/order/order?id=${id}` })
// 拉黑（填原因）/ 解除拉黑
function toggleBan(u) {
  if (u.status !== 'active') return run(toggleCustomer(session.user, u.id)).then((r) => r && (toast('已解除'), load()))
  uni.showModal({
    title: `拉黑 ${u.name}？`, editable: true, placeholderText: '原因（如：恶意退款）',
    success: async (r) => { if (r.confirm && (await run(toggleCustomer(session.user, u.id, r.content || '')))) { toast('已拉黑，对方将无法登录和下单'); load() } }
  })
}
</script>

<style scoped>
.search { background: #FFFFFF; }
.top { display: block; font-size: 22rpx; margin: 16rpx 8rpx; }
.u { padding: 24rpx 28rpx; margin-bottom: 16rpx; }
.ut { flex: 1; min-width: 0; }
.row { gap: 10rpx; }
.un { font-size: 28rpx; font-weight: 600; }
.ban { background: #FFEBEF; color: #CB5368; }
.um { display: block; font-size: 22rpx; margin-top: 4rpx; }
.us { display: flex; flex-direction: column; align-items: flex-end; }
.detail { margin-top: 20rpx; padding-top: 16rpx; border-top: 2rpx solid #F4F7FF; }
.ord { display: flex; justify-content: space-between; gap: 16rpx; font-size: 24rpx; padding: 12rpx 0; }
.ops { display: flex; justify-content: flex-end; margin-top: 12rpx; }
</style>
