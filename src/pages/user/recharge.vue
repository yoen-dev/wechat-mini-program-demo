<template>
  <view class="wrap">
    <view class="card head">
      <text class="muted hl">我的余额（元）</text>
      <text class="hv">{{ wallet.balance }}</text>
      <text class="muted hl">下单时可选「余额支付」；用余额付的单退款会退回余额</text>
    </view>

    <text class="sec-title sec">选择充值金额</text>
    <view class="tiers">
      <view v-for="(t, i) in tiers" :key="i" class="tier" :class="{ on: pick === i }" @tap="pick = i">
        <text class="tp">¥{{ t.pay }}</text>
        <text class="tb">{{ t.bonus ? '送 ¥' + t.bonus : '　' }}</text>
        <text class="muted tg">到账 ¥{{ t.pay + t.bonus }}</text>
      </view>
    </view>
    <button class="btn pay" :loading="busy" @tap="submit">微信支付 ¥{{ tiers[pick] ? tiers[pick].pay : 0 }}</button>
    <text class="muted note">充值金额可用于平台内所有单子。余额退款请联系客服。</text>

    <text class="sec-title sec">余额明细</text>
    <view class="card">
      <view class="list-row" v-for="(l, i) in wallet.logs" :key="i">
        <view class="lt"><text>{{ l.title }}</text><text class="muted ls">{{ l.sub }} · {{ fmtTime(l.t) }}</text></view>
        <text :class="l.amount > 0 ? 'plus' : 'minus'">{{ l.amount > 0 ? '+' : '' }}{{ l.amount }}</text>
      </view>
      <Empty v-if="!wallet.logs.length" text="还没有余额变动" />
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getWallet, getTiers, recharge } from '@api/wallet.js'
import { session, needUserLogin } from '@/store/session.js'
import { run, toast, confirm, fmtTime } from '@/utils.js'
import { IS_MOCK } from '@/api/constants.js'
import Empty from '@/components/Empty.vue'

const wallet = ref({ balance: 0, logs: [] })
const tiers = ref([])
const pick = ref(0)
const busy = ref(false)

async function load() {
  if (!needUserLogin()) return
  tiers.value = (await run(getTiers())) || []
  if (pick.value >= tiers.value.length) pick.value = 0
  if (tiers.value.length > 2 && pick.value === 0) pick.value = 2
  wallet.value = (await run(getWallet(session.user))) || wallet.value
}
onShow(load)

async function submit() {
  const t = tiers.value[pick.value]
  if (!t) return
  // 演示版弹「模拟微信支付」；真实环境由 recharge() 调起微信支付，付完后台确认到账才加余额
  if (IS_MOCK && !(await confirm(`充值 ¥${t.pay}${t.bonus ? '，赠送 ¥' + t.bonus : ''}`, '模拟微信支付'))) return
  busy.value = true
  const r = await run(recharge(session.user, pick.value))
  busy.value = false
  if (!r) return
  toast('充值成功', 'success')
  load()
}
</script>

<style scoped>
.head { padding: 32rpx; background: #1F1F1F; color: #FFFFFF; }
.head .muted { color: #A6A6A6; }
.hl { display: block; font-size: 22rpx; }
.hv { display: block; font-size: 64rpx; font-weight: 700; margin: 8rpx 0 16rpx; }
.sec { display: block; margin: 36rpx 8rpx 16rpx; }
.tiers { display: flex; flex-wrap: wrap; gap: 16rpx; }
.tier { width: calc(50% - 8rpx); box-sizing: border-box; background: #FFFFFF; border: 3rpx solid #FFFFFF; border-radius: 20rpx; padding: 28rpx 24rpx; display: flex; flex-direction: column; gap: 6rpx; }
.tier.on { border-color: #1F1F1F; }
.tp { font-size: 44rpx; font-weight: 700; }
.tb { font-size: 24rpx; font-weight: 600; color: #CF1322; }
.tg { font-size: 22rpx; }
.pay { margin-top: 28rpx; background: #07C160; }
.note { display: block; text-align: center; font-size: 22rpx; margin-top: 16rpx; }
.lt { display: flex; flex-direction: column; gap: 4rpx; }
.ls { font-size: 22rpx; }
.plus { font-weight: 700; color: #389E0D; }
.minus { font-weight: 700; }
</style>
