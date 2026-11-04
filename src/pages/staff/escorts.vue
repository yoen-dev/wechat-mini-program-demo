<!--
  【客服 / 管理员】护航列表：在线状态、手上单数、完成数、评分，派单时参考。
-->
<template>
  <view class="wrap">
    <view class="notice-bar top">在线 {{ online }} 人 / 共 {{ list.length }} 人。派单优先选在线、手上单少的护航。</view>
    <view class="card e" v-for="e in list" :key="e.id">
      <view class="between">
        <view class="person"><view class="avatar">♛<view class="dot" :class="{ on: e.online }"></view></view><view><text class="p-n">{{ e.name }}</text><text class="p-s" v-if="e.profile.rank || e.profile.maps">{{ e.profile.rank }}{{ e.profile.maps ? ' · ' + e.profile.maps : '' }}</text></view></view>
        <text :class="['chip', e.online ? 'green' : 'grey']">{{ e.online ? '接单中' : '休息中' }}</text>
      </view>
      <view class="stats">
        <view><text class="sv">{{ e.load }}</text><text class="muted sl">手上单数</text></view>
        <view><text class="sv">{{ e.done }}</text><text class="muted sl">累计完成</text></view>
        <view><text class="sv">{{ e.rating || '—' }}</text><text class="muted sl">评分（{{ e.ratingCount }}）</text></view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { listEscorts } from '@api/staff.js'
import { guard } from '@/store/session.js'
import { run } from '@/utils.js'

// 列表数据
const list = ref([])
// 在线人数
const online = computed(() => list.value.filter((e) => e.online).length)
// 每次显示页面时刷新（从别的页面返回也会触发）
onShow(async () => {
  if (!guard(['cs', 'admin'])) return
  list.value = (await run(listEscorts())) || []
})
</script>

<style scoped>
.top { margin-bottom: 22rpx; }
.e { padding: 26rpx 28rpx; margin-bottom: 18rpx; }
.avatar { position: relative; }
.dot { position: absolute; right: -4rpx; bottom: -4rpx; width: 20rpx; height: 20rpx; border-radius: 50%; background: #C9D8F2; border: 4rpx solid #FFFFFF; }
.dot.on { background: #28A88A; }
.stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14rpx; margin-top: 22rpx; }
.stats view { background: #F4F7FF; border-radius: 22rpx; padding: 18rpx; display: flex; flex-direction: column; gap: 4rpx; }
.sv { font-size: 32rpx; font-weight: 800; }
.sl { font-size: 20rpx; }
</style>
