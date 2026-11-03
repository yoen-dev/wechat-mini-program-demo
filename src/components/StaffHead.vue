<template>
  <view class="sh">
    <view class="av">{{ user.name.slice(0, 1) }}</view>
    <view class="t">
      <text class="n">{{ user.name }}</text>
      <text class="r">{{ ROLE_NAME[user.role] }} · {{ user.account }}</text>
    </view>
    <view class="btn sm ghost set" @tap="toProfile">账号设置</view>
  </view>
</template>

<script setup>
import { ROLE_NAME } from '@api/staff.js'
defineProps({ user: Object })
const toProfile = () => uni.navigateTo({ url: '/pages/staff/profile' })
</script>

<style scoped>
.sh { display: flex; align-items: center; gap: 20rpx; padding: 28rpx 32rpx; background: #1F1F1F; color: #FFFFFF; }
.av { width: 80rpx; height: 80rpx; border-radius: 50%; background: #FFFFFF; color: #1F1F1F; font-weight: 700; font-size: 30rpx; display: flex; align-items: center; justify-content: center; }
.t { flex: 1; display: flex; flex-direction: column; gap: 4rpx; }
.n { font-size: 32rpx; font-weight: 700; }
.r { font-size: 22rpx; color: #BFBFBF; }
.set { background: transparent; color: #FFFFFF; border-color: #595959; }
</style>
