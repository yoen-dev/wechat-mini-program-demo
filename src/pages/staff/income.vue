<!--
  【护航】我的收入：总收入、本月、可提现、待确认中的金额，收入明细和提现记录，申请提现。
-->
<template>
  <view class="wrap" v-if="inc">
    <view class="blk-banner">
      <text class="b-s">可提现余额（元）</text>
      <text class="b-big">¥{{ inc.available }}</text>
      <text class="b-s">累计收入 ¥{{ inc.total }} · 提现中 ¥{{ inc.pending }}</text>
    </view>
    <view class="grid2">
      <view class="metric"><text class="m-l">本月收入</text><text class="m-v">¥{{ inc.month }}</text></view>
      <view class="metric"><text class="m-l">待老板确认</text><text class="m-v">¥{{ inc.waiting }}</text></view>
    </view>
    <view class="notice-bar rate">当前分成比例 {{ ratePct }}%，老板确认完成后入账</view>

    <view class="card wd">
      <text class="card-t">申请提现</text>
      <view class="wrow">
        <input class="input win" v-model="amount" type="digit" :placeholder="'最多 ' + inc.available" />
        <view class="btn sm light" @tap="amount = String(inc.available)">全部</view>
        <view class="btn sm" @tap="apply">提交</view>
      </view>
      <text class="muted hint">管理员审核后线下打款，打款后状态变为「已打款」</text>
    </view>

    <view class="tabsline tabs">
      <view class="tb" :class="{ on: tab === 'rec' }" @tap="tab = 'rec'">收入明细</view>
      <view class="tb" :class="{ on: tab === 'wd' }" @tap="tab = 'wd'">提现记录</view>
    </view>
    <view v-if="tab === 'rec'">
      <view class="lrow" v-for="r in inc.records" :key="r.id">
        <view><text class="l-t">{{ r.productName }}</text><text class="l-s">BLK-{{ r.id }} · {{ fmtTime(r.t) }} · 订单 ¥{{ r.amount }}</text></view>
        <text class="plus">+¥{{ r.share }}</text>
      </view>
      <Empty v-if="!inc.records.length" text="还没有收入" />
    </view>
    <view v-else>
      <view class="lrow" v-for="w in inc.withdrawals" :key="w.id">
        <view><text class="l-t">¥{{ w.amount }}</text><text class="l-s">{{ fmtTime(w.createdAt) }}{{ w.note ? ' · ' + w.note : '' }}</text></view>
        <text :class="['chip', w.status === '已打款' ? 'green' : w.status === '已驳回' ? 'red' : 'orange']">{{ w.status }}</text>
      </view>
      <Empty v-if="!inc.withdrawals.length" text="还没有提现记录" />
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getIncome, requestWithdraw } from '@api/finance.js'
import { session, guard } from '@/store/session.js'
import { run, toast, fmtTime, confirm } from '@/utils.js'
import Empty from '@/components/Empty.vue'

// 收入数据
const inc = ref(null)
// 提现金额输入框
const amount = ref('')
// 当前选中的标签页
const tab = ref('rec')
// 分成比例（百分比显示）
const ratePct = computed(() => (inc.value ? Math.round(inc.value.rate * 100) : 0))
// 加载页面数据
async function load() {
  if (!guard(['escort'])) return
  inc.value = await run(getIncome(session.user))
}
// 每次显示页面时刷新（从别的页面返回也会触发）
onShow(load)
// 申请提现（管理员线下打款后标记）
async function apply() {
  if (!(await confirm(`申请提现 ¥${amount.value}？`))) return
  if (await run(requestWithdraw(session.user, amount.value))) { toast('已提交，等待审核', 'success'); amount.value = ''; tab.value = 'wd'; load() }
}
</script>

<style scoped>
.rate { margin-top: 20rpx; }
.wd { margin-top: 20rpx; padding: 28rpx; }
.wrow { display: flex; gap: 12rpx; align-items: center; }
.win { flex: 1; }
.hint { display: block; font-size: 21rpx; margin-top: 14rpx; }
.tabs { margin: 30rpx 0 20rpx; }
.plus { font-weight: 800; color: #269B79; }
</style>
