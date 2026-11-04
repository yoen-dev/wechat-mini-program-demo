<!--
  空状态组件：列表没有数据时显示的提示文字。
-->
<template>
  <view class="empty">
    <text class="big">☁︎</text>
    <text class="muted">{{ text }}</text>
    <slot />
  </view>
</template>

<script setup>
defineProps({ text: { type: String, default: '暂无数据' } })
</script>

<style scoped>
.empty { padding: 90rpx 24rpx; display: flex; flex-direction: column; align-items: center; gap: 20rpx; color: #9BADC6; font-size: 24rpx; }
.big { font-size: 78rpx; color: #B8C9E4; }
</style>
