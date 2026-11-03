<!--
  【管理员】提现审批：护航申请提现 → 管理员线下打款后点「已打款」，或驳回。
-->
<template>
  <view class="wrap">
    <view class="seg">
      <view v-for="t in tabs" :key="t" class="seg-item" :class="{ on: t === tab }" @tap="tab = t">{{ t }}{{ t === '待审核' && pending ? ' ' + pending : '' }}</view>
    </view>
    <text class="muted top">线下给护航转账后点「已打款」；金额或身份有问题点「驳回」，钱会退回护航的可提现余额。</text>
    <view class="card w" v-for="w in shown" :key="w.id">
      <view class="between">
        <text class="wn">{{ w.escortName }}</text>
        <text class="price wa">¥{{ w.amount }}</text>
      </view>
      <text class="muted wm">申请 {{ fmtTime(w.createdAt) }}<text v-if="w.handledAt"> · {{ w.handler }} {{ fmtTime(w.handledAt) }} {{ w.status }}</text></text>
      <text v-if="w.note" class="muted wm">备注：{{ w.note }}</text>
      <view v-if="w.status === '待审核'" class="ops">
        <view class="btn sm ghost" @tap="handle(w, false)">驳回</view>
        <view class="btn sm" @tap="handle(w, true)">已打款</view>
      </view>
      <text v-else :class="['ws', w.status === '已打款' ? 'ok' : 'bad']">{{ w.status }}</text>
    </view>
    <Empty v-if="!shown.length" text="没有提现申请" />
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { listWithdrawals, handleWithdraw } from '@api/finance.js'
import { session, guard } from '@/store/session.js'
import { run, fmtTime, confirm, toast } from '@/utils.js'
import Empty from '@/components/Empty.vue'

const tabs = ['待审核', '已处理']
// 当前选中的标签页
const tab = ref('待审核')
// 列表数据
const list = ref([])
// 待审核数量
const pending = computed(() => list.value.filter((w) => w.status === '待审核').length)
// 当前标签页要显示的列表
const shown = computed(() => list.value.filter((w) => (tab.value === '待审核' ? w.status === '待审核' : w.status !== '待审核')))
// 加载页面数据
async function load() {
  if (!guard(['admin'])) return
  list.value = (await run(listWithdrawals(session.user))) || []
}
// 每次显示页面时刷新（从别的页面返回也会触发）
onShow(load)
// 标记已打款 / 驳回
async function handle(w, ok) {
  if (ok) {
    if (!(await confirm(`确认已经给 ${w.escortName} 转账 ¥${w.amount}？`))) return
    if (await run(handleWithdraw(session.user, w.id, true))) { toast('已记录打款', 'success'); load() }
    return
  }
  uni.showModal({
    title: '驳回原因', editable: true, placeholderText: '如：收款信息有误',
    success: async (r) => { if (r.confirm && (await run(handleWithdraw(session.user, w.id, false, r.content || '')))) load() }
  })
}
</script>

<style scoped>
.top { display: block; font-size: 22rpx; margin: 16rpx 8rpx; line-height: 1.6; }
.w { padding: 24rpx 28rpx; margin-bottom: 16rpx; }
.wn { font-size: 28rpx; font-weight: 600; }
.wa { font-size: 34rpx; }
.wm { display: block; font-size: 22rpx; margin-top: 6rpx; }
.ops { display: flex; justify-content: flex-end; gap: 16rpx; margin-top: 16rpx; }
.ws { display: block; text-align: right; font-size: 24rpx; margin-top: 8rpx; }
.ws.ok { color: #389E0D; }
.ws.bad { color: #CF1322; }
</style>
