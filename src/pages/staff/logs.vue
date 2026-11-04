<!--
  【管理员】操作日志：员工的关键操作记录（派单、退款、改价、开号、打款等），谁、什么时候、做了什么。
-->
<template>
  <view class="wrap">
    <view class="notice-bar top">记录员工的关键操作：派单、退款、改价、上下架、账号管理、提现、设置修改等，最多保留最近 500 条。</view>
    <view class="lrow" v-for="l in list" :key="l.id">
      <view class="lg">
        <text class="l-t">{{ l.action }}</text>
        <text class="l-s">{{ l.actorName }} · {{ ROLE_NAME[l.role] }} · {{ fmtTime(l.t) }}</text>
        <text class="l-s lx" v-if="l.target">{{ l.target }}</text>
      </view>
      <text class="chip">记录</text>
    </view>
    <Empty v-if="!list.length" text="暂无记录" />
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

// 列表数据
const list = ref([])
// 每次显示页面时刷新（从别的页面返回也会触发）
onShow(async () => {
  if (!guard(['admin'])) return
  list.value = (await run(listLogs(session.user))) || []
})
</script>

<style scoped>
.top { margin-bottom: 22rpx; }
.lg { flex: 1; min-width: 0; }
.lx { color: #5B6F92; }
</style>
