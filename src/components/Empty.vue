<!--
  空状态组件：列表没有数据时显示的提示文字。
-->
<template>
  <view class="empty">
    <view class="circle">—</view>
    <text class="muted">{{ text }}</text>
    <slot />
  </view>
</template>

<script setup>
defineProps({ text: { type: String, default: '暂无数据' } })
</script>

<style scoped>
.empty { padding: 120rpx 0; display: flex; flex-direction: column; align-items: center; gap: 20rpx; }
.circle { width: 120rpx; height: 120rpx; border-radius: 50%; background: #EBEBEB; color: #BFBFBF; display: flex; align-items: center; justify-content: center; font-size: 40rpx; }
</style>
