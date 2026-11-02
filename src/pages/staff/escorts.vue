<template>
  <view class="wrap">
    <text class="muted top">在线 {{ online }} 人 / 共 {{ list.length }} 人。派单优先选在线、手上单少的护航。</text>
    <view class="card e" v-for="e in list" :key="e.id">
      <view class="between">
        <view class="row"><view class="dot" :class="{ on: e.online }"></view><text class="en">{{ e.name }}</text></view>
        <text class="muted">{{ e.online ? '在线' : '休息中' }}</text>
      </view>
      <view class="stats">
        <view><text class="sv">{{ e.load }}</text><text class="muted sl">手上单数</text></view>
        <view><text class="sv">{{ e.done }}</text><text class="muted sl">累计完成</text></view>
        <view><text class="sv">{{ e.rating || '—' }}</text><text class="muted sl">评分（{{ e.ratingCount }}）</text></view>
      </view>
      <text class="muted pf" v-if="e.profile.rank || e.profile.maps">{{ e.profile.rank }}{{ e.profile.maps ? ' · ' + e.profile.maps : '' }}</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { listEscorts } from '@/api/staff.js'
import { guard } from '@/store/session.js'
import { run } from '@/utils.js'

const list = ref([])
const online = computed(() => list.value.filter((e) => e.online).length)
onShow(async () => {
  if (!guard(['cs', 'admin'])) return
  list.value = (await run(listEscorts())) || []
})
</script>

<style scoped>
.top { display: block; font-size: 22rpx; margin: 0 8rpx 20rpx; }
.e { padding: 24rpx 28rpx; margin-bottom: 16rpx; }
.row { gap: 12rpx; }
.dot { width: 16rpx; height: 16rpx; border-radius: 50%; background: #D9D9D9; }
.dot.on { background: #52C41A; }
.en { font-size: 28rpx; font-weight: 600; }
.stats { display: flex; margin-top: 20rpx; }
.stats view { flex: 1; display: flex; flex-direction: column; gap: 4rpx; }
.sv { font-size: 32rpx; font-weight: 700; }
.sl { font-size: 22rpx; }
.pf { display: block; font-size: 22rpx; margin-top: 16rpx; }
</style>
