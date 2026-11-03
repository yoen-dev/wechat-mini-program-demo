<template>
  <view class="wrap">
    <text class="muted top">老板在「我的 → 成为护航」提交报名。通过后自动生成护航账号和初始密码，请转告对方登录后修改。</text>
    <view class="card ap" v-for="a in list" :key="a.id">
      <view class="between">
        <text class="an">{{ a.name }}</text>
        <text :class="['as', a.status === '已通过' ? 'ok' : a.status === '已拒绝' ? 'bad' : 'new']">{{ a.status }}</text>
      </view>
      <view class="kv"><text class="muted">手机号</text><text>{{ a.phone }}</text></view>
      <view class="kv"><text class="muted">段位</text><text>{{ a.rank }}</text></view>
      <view class="kv" v-if="a.maps"><text class="muted">擅长地图</text><text>{{ a.maps }}</text></view>
      <view class="kv" v-if="a.intro"><text class="muted">自我介绍</text><text class="intro">{{ a.intro }}</text></view>
      <view class="kv"><text class="muted">提交时间</text><text>{{ fmtTime(a.createdAt) }}</text></view>
      <view class="kv" v-if="a.account"><text class="muted">已开账号</text><text>{{ a.account }}</text></view>
      <view class="kv" v-if="a.handler"><text class="muted">处理人</text><text>{{ a.handler }}{{ a.note ? '（' + a.note + '）' : '' }}</text></view>
      <view v-if="a.status === '待审核'" class="ops">
        <view class="btn sm ghost" @tap="handle(a, false)">不通过</view>
        <view class="btn sm" @tap="handle(a, true)">通过并开号</view>
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

const list = ref([])
async function load() {
  if (!guard(['cs', 'admin'])) return
  list.value = (await run(listApplications(session.user))) || []
}
onShow(load)

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
.top { display: block; font-size: 22rpx; line-height: 1.6; margin: 0 8rpx 20rpx; }
.ap { padding: 28rpx; margin-bottom: 20rpx; }
.an { font-size: 30rpx; font-weight: 700; }
.as { font-size: 24rpx; }
.as.new { color: #D46B08; }
.as.ok { color: #389E0D; }
.as.bad { color: #CF1322; }
.kv { display: flex; justify-content: space-between; gap: 24rpx; margin-top: 14rpx; font-size: 26rpx; }
.intro { text-align: right; flex: 1; }
.ops { display: flex; justify-content: flex-end; gap: 16rpx; margin-top: 24rpx; }
</style>
