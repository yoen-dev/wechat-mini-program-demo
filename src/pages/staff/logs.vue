<template>
  <view class="wrap">
    <text class="muted top">记录员工的关键操作：派单、退款、改价、上下架、账号管理、提现、设置修改等，最多保留最近 500 条。</text>
    <view class="card">
      <view class="lg" v-for="l in list" :key="l.id">
        <view class="between"><text class="la">{{ l.action }}</text><text class="muted lt">{{ fmtTime(l.t) }}</text></view>
        <text class="sub lx">{{ l.target }}</text>
        <text class="muted lt">{{ l.actorName }} · {{ ROLE_NAME[l.role] }}</text>
      </view>
      <Empty v-if="!list.length" text="暂无记录" />
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { listLogs } from '@api/service.js'
import { ROLE_NAME } from '@api/staff.js'
import { session, guard } from '@/store/session.js'
import { run, fmtTime } from '@/utils.js'
import Empty from '@/components/Empty.vue'

const list = ref([])
onShow(async () => {
  if (!guard(['admin'])) return
  list.value = (await run(listLogs(session.user))) || []
})
</script>

<style scoped>
.top { display: block; font-size: 22rpx; margin: 0 8rpx 20rpx; line-height: 1.6; }
.lg { padding: 22rpx 28rpx; display: flex; flex-direction: column; gap: 6rpx; }
.lg + .lg { border-top: 2rpx solid #F0F0F0; }
.la { font-size: 28rpx; font-weight: 600; }
.lx { font-size: 24rpx; }
.lt { font-size: 22rpx; }
</style>
