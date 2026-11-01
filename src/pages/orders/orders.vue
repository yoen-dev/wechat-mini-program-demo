<template>
  <view class="page">
    <view class="seg tabs">
      <view v-for="t in tabs" :key="t" class="seg-item" :class="{ on: t === tab }" @tap="tab = t">{{ t }}</view>
    </view>

    <view class="card order" v-for="o in list" :key="o.id">
      <view class="order-head muted">
        <text>订单号 {{ o.id }}</text>
        <text class="status" :style="{ color: colors[o.status] }">{{ o.status }}</text>
      </view>
      <view class="order-main">
        <view class="cover order-cover"></view>
        <view class="order-info">
          <text class="order-name">{{ o.name }}</text>
          <text class="muted order-who">{{ o.who }}</text>
          <text class="price order-price">¥{{ o.price }}</text>
        </view>
      </view>
      <view class="order-actions">
        <view class="btn-ghost act" @tap="goService">联系客服</view>
        <view class="btn-primary act" @tap="openChat(o.id)">订单沟通</view>
      </view>
    </view>

    <view v-if="!list.length" class="empty">
      <view class="empty-icon">≡</view>
      <text class="empty-title">暂无订单</text>
      <text class="muted empty-sub">切换状态看看其他订单吧</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { state, ORDER_STATUS, describeOrder } from '@/store/index.js'

const tabs = ['全部', ...ORDER_STATUS]
const tab = ref('全部')
const colors = { 已付款: '#D2600F', 已接单: '#1A6FE0', 护航中: '#1A6FE0', 已完成: '#2E7D4F', 已退款: '#4A5D7A' }

const list = computed(() => state.orders.filter((o) => tab.value === '全部' || o.status === tab.value).map(describeOrder))

function goService() {
  uni.switchTab({ url: '/pages/service/service' })
}
function openChat(id) {
  uni.navigateTo({ url: `/pages/chat/chat?id=${id}` })
}
</script>

<style scoped>
.page { padding: 24rpx 32rpx 40rpx; display: flex; flex-direction: column; gap: 20rpx; }
.tabs { margin-bottom: 4rpx; }
.order { padding: 28rpx; display: flex; flex-direction: column; gap: 20rpx; }
.order-head { display: flex; justify-content: space-between; font-size: 24rpx; }
.status { font-weight: 700; }
.order-main { display: flex; gap: 20rpx; }
.order-cover { width: 128rpx; height: 128rpx; border-radius: 20rpx; flex-shrink: 0; }
.order-info { flex: 1; display: flex; flex-direction: column; justify-content: space-between; }
.order-name { font-size: 28rpx; font-weight: 700; }
.order-who { font-size: 24rpx; }
.order-price { font-size: 32rpx; }
.order-actions { display: flex; justify-content: flex-end; gap: 16rpx; }
.act { height: 68rpx; padding: 0 28rpx; font-size: 26rpx; }
.empty { padding-top: 200rpx; display: flex; flex-direction: column; align-items: center; gap: 20rpx; }
.empty-icon { width: 192rpx; height: 192rpx; border-radius: 50%; background: #FFFFFF; color: #1A6FE0; font-size: 80rpx; display: flex; align-items: center; justify-content: center; }
.empty-title { font-size: 30rpx; font-weight: 600; }
.empty-sub { font-size: 24rpx; }
</style>
