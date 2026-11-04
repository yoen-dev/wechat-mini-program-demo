<!--
  【客服 / 管理员】护航报名审核：通过后自动开通护航账号并显示初始密码，转告对方登录后修改。
-->
<template>
  <view class="wrap">
    <view class="notice-bar top">老板在「我的 → 成为护航」提交报名。通过后自动生成护航账号和初始密码，请转告对方登录后修改。</view>
    <view class="card ap" v-for="a in list" :key="a.id">
      <view class="between">
        <view class="person"><view class="avatar">♛</view><view><text class="p-n">新护航报名 · {{ a.name }}</text><text class="p-s">{{ a.rank }}{{ a.maps ? ' · ' + a.maps : '' }}</text></view></view>
        <text :class="['chip', a.status === '已通过' ? 'green' : a.status === '已拒绝' ? 'red' : 'orange']">{{ a.status }}</text>
      </view>
      <view class="kv"><text class="muted">手机号</text><text>{{ a.phone }}</text></view>
      <view class="kv"><text class="muted">段位</text><text>{{ a.rank }}</text></view>
      <view class="kv" v-if="a.maps"><text class="muted">擅长地图</text><text>{{ a.maps }}</text></view>
      <view class="kv" v-if="a.intro"><text class="muted">自我介绍</text><text class="intro">{{ a.intro }}</text></view>
      <view class="kv"><text class="muted">提交时间</text><text>{{ fmtTime(a.createdAt) }}</text></view>
      <view class="kv" v-if="a.account"><text class="muted">已开账号</text><text>{{ a.account }}</text></view>
      <view class="kv" v-if="a.handler"><text class="muted">处理人</text><text>{{ a.handler }}{{ a.note ? '（' + a.note + '）' : '' }}</text></view>
      <view v-if="a.status === '待审核'" class="grid2 ops">
        <view class="btn" @tap="handle(a, true)">通过并开号</view>
        <view class="btn danger" @tap="handle(a, false)">拒绝申请</view>
      </view>
    </view>
    <Empty v-if="!list.length" text="还没有人报名" />
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { listApplications, handleApplication } from '@api/service.js'
import { session, guard } from '@/store/session.js'
import { run, fmtTime, confirm } from '@/utils.js'
import Empty from '@/components/Empty.vue'

// 列表数据
const list = ref([])
// 加载页面数据
async function load() {
  if (!guard(['cs', 'admin'])) return
  list.value = (await run(listApplications(session.user))) || []
}
// 每次显示页面时刷新（从别的页面返回也会触发）
onShow(load)

// 通过 / 拒绝报名
async function handle(a, approve) {
  if (approve) {
    if (!(await confirm(`通过 ${a.name} 的报名，并为他开通护航账号？`))) return
    const r = await run(handleApplication(session.user, a.id, true))
    if (r) uni.showModal({ title: '已开通护航账号', showCancel: false, content: `账号：${r.account.account}\n初始密码：${r.account.password}\n请转告 ${a.name}（${a.phone}）`, success: load })
    return
  }
  uni.showModal({
    title: '不通过的原因', editable: true, placeholderText: '如：段位暂不符合要求',
    success: async (r) => { if (r.confirm && (await run(handleApplication(session.user, a.id, false, r.content || '')))) load() }
  })
}
</script>

<style scoped>
.top { margin-bottom: 22rpx; }
.ap { padding: 28rpx; margin-bottom: 20rpx; }
.kv { display: flex; justify-content: space-between; gap: 24rpx; margin-top: 16rpx; font-size: 24rpx; }
.intro { text-align: right; flex: 1; }
.ops { margin-top: 26rpx; }
</style>
