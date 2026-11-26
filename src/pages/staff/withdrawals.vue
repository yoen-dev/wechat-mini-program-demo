<!--
  【管理员 / 负责人】提现审批（两级）：
    1. 护航申请提现 → 「待初审」：管理员核对单子和金额，点「初审通过」或「驳回」
    2. 初审通过 → 「待打款」：负责人（老板）线下转账给护航后点「已打款」，有问题也可以「驳回」
  驳回后钱退回护航的可提现余额。没有启用中的负责人账号时，管理员可以代做第 2 步。
  每条记录带 canHandle（后端算好的「当前账号能不能处理这一步」），按钮只在能处理时显示。
-->
<template>
  <view class="wrap">
    <view class="tabsline">
      <view v-for="t in tabs" :key="t.key" class="tb" :class="{ on: t.key === tab }" @tap="tab = t.key">
        {{ t.name }}<text v-if="count(t.key)" class="dot">{{ count(t.key) }}</text>
      </view>
    </view>
    <view class="notice-bar top">{{ tip }}</view>
    <view class="card w" v-for="w in shown" :key="w.id">
      <view class="between">
        <text class="wn">{{ w.escortName }} · 申请提现</text>
        <text class="price wa">¥{{ w.amount }}</text>
      </view>
      <text class="muted wm">申请 {{ fmtTime(w.createdAt) }}</text>
      <text v-if="w.reviewedAt" class="muted wm">初审通过：{{ w.reviewer }} {{ fmtTime(w.reviewedAt) }}</text>
      <text v-if="w.handledAt" class="muted wm">{{ w.status === '已打款' ? '已打款' : '已驳回' }}：{{ w.handler }} {{ fmtTime(w.handledAt) }}</text>
      <text v-if="w.note" class="muted wm">备注：{{ w.note }}</text>
      <view v-if="w.canHandle" class="grid2 ops">
        <view class="btn" @tap="handle(w, true)">{{ w.status === '待审核' ? '初审通过' : '已线下打款' }}</view>
        <view class="btn danger" @tap="handle(w, false)">驳回</view>
      </view>
      <view v-else class="ws"><text :class="['chip', CHIP[w.status]]">{{ LABEL[w.status] || w.status }}</text></view>
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

const tabs = [{ key: '待审核', name: '待初审' }, { key: '待打款', name: '待打款' }, { key: 'done', name: '已处理' }]
// 状态显示文字和颜色
const LABEL = { 待审核: '待初审', 待打款: '待负责人打款', 已打款: '已打款', 已驳回: '已驳回' }
const CHIP = { 待审核: 'orange', 待打款: 'orange', 已打款: 'green', 已驳回: 'red' }
// 当前登录的员工
const me = computed(() => session.user)
// 当前选中的标签页：负责人默认看「待打款」
const tab = ref('待审核')
// 列表数据
const list = ref([])
// 每个标签页的数量（只给待处理的显示红点）
const count = (k) => (k === 'done' ? 0 : list.value.filter((w) => w.status === k).length)
// 当前标签页要显示的列表
const shown = computed(() => list.value.filter((w) => (tab.value === 'done' ? ['已打款', '已驳回'].includes(w.status) : w.status === tab.value)))
// 顶部说明：按身份说清楚这一步要做什么
const tip = computed(() => (me.value && me.value.role === 'owner'
  ? '管理员初审通过的提现会出现在「待打款」：线下转账给护航后点「已打款」；有问题点「驳回」，钱会退回护航的可提现余额。'
  : '第 1 步由管理员初审：核对单子和金额后点「初审通过」，再由负责人线下转账并确认打款。有问题点「驳回」，钱会退回护航的可提现余额。'))

// 加载页面数据
async function load() {
  if (!guard(['admin', 'owner'])) return
  list.value = (await run(listWithdrawals(me.value))) || []
}
// 每次显示页面时刷新（从别的页面返回也会触发）
onShow(() => {
  if (me.value && me.value.role === 'owner' && tab.value === '待审核') tab.value = '待打款'
  load()
})

// 初审通过 / 确认已打款 / 驳回
async function handle(w, ok) {
  if (ok) {
    const first = w.status === '待审核'
    const text = first
      ? `确认 ${w.escortName} 的提现 ¥${w.amount} 金额无误？通过后交给负责人打款。`
      : `确认已经给 ${w.escortName} 转账 ¥${w.amount}？`
    if (!(await confirm(text))) return
    if (await run(handleWithdraw(me.value, w.id, true))) { toast(first ? '已初审通过' : '已记录打款', 'success'); load() }
    return
  }
  uni.showModal({
    title: '驳回原因', editable: true, placeholderText: '如：收款信息有误',
    success: async (r) => { if (r.confirm && (await run(handleWithdraw(me.value, w.id, false, r.content || '')))) load() }
  })
}
</script>

<style scoped>
.top { margin-bottom: 22rpx; }
.w { padding: 28rpx; margin-bottom: 18rpx; }
.wn { font-size: 27rpx; font-weight: 800; }
.wa { font-size: 38rpx; }
.wm { display: block; font-size: 21rpx; margin-top: 8rpx; }
.ops { margin-top: 24rpx; }
.ws { display: flex; justify-content: flex-end; margin-top: 12rpx; }
</style>
