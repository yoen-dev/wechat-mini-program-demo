<!--
  功能入口宫格组件：员工工作台上的一排排功能按钮（带待办数字角标）。
-->
<template>
  <!-- 工作台功能入口宫格，带红点数字 -->
  <view class="grid">
    <view class="cell" v-for="m in items" :key="m.title" @tap="go(m)">
      <view class="ico">{{ m.icon || m.title.slice(0, 1) }}<text v-if="m.badge" class="badge">{{ m.badge > 99 ? '99+' : m.badge }}</text></view>
      <text class="t">{{ m.title }}</text>
    </view>
  </view>
</template>

<script setup>
defineProps({ items: { type: Array, default: () => [] } })
// 点击入口跳转到对应页面
const go = (m) => (m.url ? uni.navigateTo({ url: m.url }) : m.tap && m.tap())
</script>

<style scoped>
.grid { display: flex; flex-wrap: wrap; background: #FFFFFF; border: 2rpx solid #DCE6F8; border-radius: 32rpx; padding: 12rpx 0; box-shadow: 0 8rpx 30rpx rgba(102, 133, 189, 0.06); }
.cell { width: 25%; display: flex; flex-direction: column; align-items: center; gap: 10rpx; padding: 20rpx 0; }
.ico { position: relative; width: 80rpx; height: 80rpx; border-radius: 26rpx; background: linear-gradient(150deg, #FFFFFF, #E2ECFF); border: 2rpx solid #DCE6F8; color: #416FBA; display: flex; align-items: center; justify-content: center; font-size: 30rpx; font-weight: 800; }
.badge { position: absolute; top: -10rpx; right: -14rpx; min-width: 32rpx; height: 32rpx; padding: 0 8rpx; border-radius: 16rpx; background: #ED7384; color: #FFFFFF; font-size: 20rpx; font-weight: 600; display: flex; align-items: center; justify-content: center; box-sizing: border-box; }
.t { font-size: 24rpx; }
</style>
