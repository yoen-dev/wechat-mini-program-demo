<!--
  员工工作台顶部的个人信息条：头像、名字、身份，右侧「账号设置」。
-->
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
// 进入账号设置（改密码、护航资料）
const toProfile = () => uni.navigateTo({ url: '/pages/staff/profile' })
</script>

<style scoped>
.sh { display: flex; align-items: center; gap: 20rpx; padding: 28rpx 32rpx; background: linear-gradient(115deg, #203B69, #527AC3 70%, #7196D8); color: #FFFFFF; }
.av { width: 80rpx; height: 80rpx; border-radius: 50%; background: #FFFFFF; color: #142B53; font-weight: 700; font-size: 30rpx; display: flex; align-items: center; justify-content: center; }
.t { flex: 1; display: flex; flex-direction: column; gap: 4rpx; }
.n { font-size: 32rpx; font-weight: 700; }
.r { font-size: 22rpx; color: #A2B3CC; }
.set { background: rgba(255,255,255,0.14); color: #FFFFFF; border-color: rgba(255,255,255,0.35); }
</style>
