<!--
  员工工作台顶部的个人信息条：头像、名字、身份，右侧「账号设置」。
-->
<template>
  <!-- 工作台标题：「护航工作台」+「你好，名字」，右边齿轮进账号设置 -->
  <view class="sh hdr">
    <view class="person">
      <view class="avatar">{{ user.name.slice(0, 1) }}</view>
      <view>
        <text class="hdr-t">{{ TITLE[user.role] || '工作台' }}</text>
        <text class="hdr-s">你好，{{ user.name }} · {{ ROLE_NAME[user.role] }} · {{ user.account }}</text>
      </view>
    </view>
    <view class="icon-btn" @tap="toProfile">⚙︎</view>
  </view>
</template>

<script setup>
import { ROLE_NAME } from '@api/staff.js'
// 各身份工作台的大标题
const TITLE = { escort: '护航工作台', cs: '客服工作台', admin: 'BLK 管理后台', owner: '经营数据' }
defineProps({ user: Object })
// 进入账号设置（改密码、护航资料）
const toProfile = () => uni.navigateTo({ url: '/pages/staff/profile' })
</script>

<style scoped>
.sh { padding: 28rpx 30rpx 4rpx; }
.hdr-t { font-size: 36rpx; }
</style>
