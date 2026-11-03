<!--
  【护航】我的收入：总收入、本月、可提现、待确认中的金额，收入明细和提现记录，申请提现。
-->
<template>
  <view class="wrap" v-if="inc">
    <view class="card head">
      <text class="muted hl">可提现（元）</text>
      <text class="hv">{{ inc.available }}</text>
      <view class="hrow">
        <view><text class="muted hl">累计收入</text><text class="hs">¥{{ inc.total }}</text></view>
        <view><text class="muted hl">本月</text><text class="hs">¥{{ inc.month }}</text></view>
        <view><text class="muted hl">提现中</text><text class="hs">¥{{ inc.pending }}</text></view>
        <view><text class="muted hl">待确认</text><text class="hs">¥{{ inc.waiting }}</text></view>
      </view>
      <text class="muted rate">当前分成比例 {{ ratePct }}%，老板确认完成后入账</text>
    </view>

    <view class="card wd">
      <text class="sec-title">申请提现</text>
      <view class="wrow">
        <input class="input win" v-model="amount" type="digit" :placeholder="'最多 ' + inc.available" />
        <view class="btn sm light" @tap="amount = String(inc.available)">全部</view>
        <view class="btn sm" @tap="apply">提交</view>
      </view>
      <text class="muted hint">管理员审核后线下打款，打款后状态变为「已打款」</text>
    </view>

    <view class="seg tabs">
      <view class="seg-item" :class="{ on: tab === 'rec' }" @tap="tab = 'rec'">收入明细</view>
      <view class="seg-item" :class="{ on: tab === 'wd' }" @tap="tab = 'wd'">提现记录</view>
    </view>
    <view class="card" v-if="tab === 'rec'">
      <view class="list-row" v-for="r in inc.records" :key="r.id">
        <view class="lt"><text>{{ r.productName }}</text><text class="muted ls">#{{ r.id }} · {{ fmtTime(r.t) }} · 订单 ¥{{ r.amount }}</text></view>
        <text class="plus">+{{ r.share }}</text>
      </view>
      <Empty v-if="!inc.records.length" text="还没有收入" />
    </view>
    <view class="card" v-else>
      <view class="list-row" v-for="w in inc.withdrawals" :key="w.id">
        <view class="lt"><text>¥{{ w.amount }}</text><text class="muted ls">{{ fmtTime(w.createdAt) }}{{ w.note ? ' · ' + w.note : '' }}</text></view>
        <text :class="['wst', w.status === '已打款' ? 'ok' : w.status === '已驳回' ? 'bad' : '']">{{ w.status }}</text>
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
.head { padding: 32rpx; background: linear-gradient(115deg, #203B69, #527AC3 70%, #7196D8); color: #FFFFFF; }
.head .muted { color: #C5D6F3; }
.hl { display: block; font-size: 22rpx; }
.hv { display: block; font-size: 60rpx; font-weight: 700; margin: 6rpx 0 24rpx; }
.hrow { display: flex; justify-content: space-between; }
.hs { display: block; font-size: 28rpx; font-weight: 600; margin-top: 4rpx; }
.rate { display: block; font-size: 22rpx; margin-top: 24rpx; }
.wd { margin-top: 20rpx; padding: 28rpx; }
.wrow { display: flex; gap: 12rpx; align-items: center; margin-top: 16rpx; }
.win { flex: 1; }
.hint { display: block; font-size: 22rpx; margin-top: 12rpx; }
.tabs { margin: 24rpx 0 16rpx; }
.lt { display: flex; flex-direction: column; gap: 4rpx; }
.ls { font-size: 22rpx; }
.plus { font-weight: 700; color: #269B79; }
.wst { font-size: 24rpx; color: #BB873A; }
.wst.ok { color: #269B79; }
.wst.bad { color: #CB5368; }
</style>
