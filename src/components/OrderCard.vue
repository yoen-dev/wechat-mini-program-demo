<!--
  订单卡片组件：订单列表里的一条订单（单子名、规格、金额、状态、时间），底部按钮由使用它的页面通过插槽传入。
-->
<template>
  <!-- 订单卡片：用户端和员工端共用，操作按钮通过插槽传入 -->
  <view class="card oc" @tap="$emit('open', order.id)">
    <view class="between">
      <text class="no">BLK-{{ order.id }} · {{ fmtTime(order.createdAt) }}</text>
      <StatusTag :status="order.status" />
    </view>
    <text class="name">{{ order.productName }}</text>
    <text class="meta">{{ order.spec }} · {{ order.mode === 'assign' ? '指定护航' : '客服派单' }}{{ order.escortName ? ' · ' + order.escortName : '' }}</text>
    <text v-if="showUser" class="meta">老板：{{ order.userName }} · 游戏 ID：{{ order.gameId }}</text>
    <text v-if="order.note" class="meta ellipsis">备注：{{ order.note }}</text>
    <view class="foot">
      <text class="price amt">¥{{ order.amount }}</text>
      <view v-if="$slots.default" class="actions" @tap.stop>
        <slot />
      </view>
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
.oc { padding: 28rpx; margin-bottom: 20rpx; }
.no { font-size: 21rpx; color: #94A4BC; }
.name { display: block; font-size: 29rpx; font-weight: 800; margin-top: 22rpx; }
.meta { display: block; font-size: 22rpx; color: #8192AD; margin-top: 8rpx; }
.foot { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; margin-top: 20rpx; }
.amt { font-size: 40rpx; flex-shrink: 0; }
.actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 14rpx; }
</style>
