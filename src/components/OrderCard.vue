<!--
  订单卡片组件：订单列表里的一条订单（单子名、规格、金额、状态、时间），底部按钮由使用它的页面通过插槽传入。
-->
<template>
  <!-- 订单卡片：用户端和员工端共用，操作按钮通过插槽传入 -->
  <view class="card oc" @tap="$emit('open', order.id)">
    <view class="between head">
      <text class="muted no">#{{ order.id }} · {{ fmtTime(order.createdAt) }}</text>
      <StatusTag :status="order.status" />
    </view>
    <view class="main">
      <view class="cover thumb">封面</view>
      <view class="info">
        <text class="name">{{ order.productName }}</text>
        <text class="sub meta">{{ order.spec }} · {{ order.mode === 'assign' ? '指定护航' : '客服派单' }}{{ order.escortName ? ' · ' + order.escortName : '' }}</text>
        <text v-if="showUser" class="muted meta">老板：{{ order.userName }} · 游戏 ID：{{ order.gameId }}</text>
        <text v-if="order.note" class="muted meta ellipsis">备注：{{ order.note }}</text>
      </view>
      <text class="price amt">¥{{ order.amount }}</text>
    </view>
    <view v-if="$slots.default" class="actions" @tap.stop>
      <slot />
    </view>
  </view>
</template>

<script setup>
import StatusTag from './StatusTag.vue'
import { fmtTime } from '@/utils.js'
defineProps({ order: Object, showUser: { type: Boolean, default: false } })
defineEmits(['open'])
</script>

<style scoped>
.oc { padding: 24rpx; margin-bottom: 20rpx; }
.no { font-size: 22rpx; }
.main { display: flex; gap: 20rpx; margin-top: 18rpx; }
.thumb { width: 112rpx; height: 112rpx; border-radius: 12rpx; flex-shrink: 0; }
.info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6rpx; }
.name { font-size: 30rpx; font-weight: 600; }
.meta { font-size: 24rpx; }
.amt { font-size: 32rpx; }
.actions { display: flex; justify-content: flex-end; gap: 16rpx; margin-top: 20rpx; padding-top: 20rpx; border-top: 2rpx solid #F5F5F5; }
</style>
