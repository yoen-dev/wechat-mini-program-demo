<template>
  <!-- 页面大标题：可选两侧月桂 -->
  <view class="sea-title">
    <image v-if="laurel" class="laurel" src="/static/art/laurel-left.png" mode="aspectFit" />
    <view class="text">
      <text class="zh serif">{{ title }}</text>
      <text class="en">{{ en }}</text>
    </view>
    <image v-if="laurel" class="laurel" src="/static/art/laurel-right.png" mode="aspectFit" />
  </view>
</template>

<script setup>
defineProps({ title: String, en: String, laurel: { type: Boolean, default: false } })
</script>

<style scoped>
.sea-title { display: flex; align-items: center; justify-content: center; gap: 16rpx; }
.laurel { width: 40rpx; height: 74rpx; }
.text { display: flex; flex-direction: column; align-items: center; }
.zh { font-size: 44rpx; color: #F4ECDD; letter-spacing: 8rpx; font-weight: 700; }
.en { font-size: 18rpx; color: #C9A86A; letter-spacing: 6rpx; margin-top: 4rpx; }
</style>
