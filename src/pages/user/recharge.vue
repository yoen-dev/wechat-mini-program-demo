<!--
  【老板】余额充值：选充值档位（充多少送多少由管理员设置）、微信支付、余额明细。
-->
<template>
  <view class="wrap">
    <view class="blk-banner">
      <text class="b-s">我的余额（元）</text>
      <text class="b-big">{{ wallet.balance }}</text>
      <text class="b-s">下单时可选「余额支付」；用余额付的单退款会退回余额</text>
    </view>

    <view class="section"><text class="s-t">选择充值金额</text></view>
    <view class="tiers">
      <view v-for="(t, i) in tiers" :key="i" class="tier" :class="{ on: pick === i }" @tap="pick = i">
        <text class="tp">¥{{ t.pay }}</text>
        <text class="tb">{{ t.bonus ? '送 ¥' + t.bonus : '　' }}</text>
        <text class="muted tg">到账 ¥{{ t.pay + t.bonus }}</text>
      </view>
    </view>
    <button class="btn pay" :loading="busy" @tap="submit">微信支付 ¥{{ tiers[pick] ? tiers[pick].pay : 0 }}</button>
    <text class="muted note">充值金额可用于平台内所有单子。余额退款请联系客服。</text>

    <view class="section"><text class="s-t">余额明细</text></view>
    <view class="lrow" v-for="(l, i) in wallet.logs" :key="i">
      <view><text class="l-t">{{ l.title }}</text><text class="l-s">{{ l.sub }} · {{ fmtTime(l.t) }}</text></view>
      <text :class="l.amount > 0 ? 'plus' : 'minus'">{{ l.amount > 0 ? '+' : '' }}{{ l.amount }}</text>
    </view>
    <Empty v-if="!wallet.logs.length" text="还没有余额变动" />
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

// 余额和明细
const wallet = ref({ balance: 0, logs: [] })
// 充值档位
const tiers = ref([])
// 选中的档位
const pick = ref(0)
// 提交中，防止重复点击
const busy = ref(false)

// 加载页面数据
async function load() {
  if (!needUserLogin()) return
  tiers.value = (await run(getTiers())) || []
  if (pick.value >= tiers.value.length) pick.value = 0
  if (tiers.value.length > 2 && pick.value === 0) pick.value = 2
  wallet.value = (await run(getWallet(session.user))) || wallet.value
}
// 每次显示页面时刷新（从别的页面返回也会触发）
onShow(load)

// 充值：真实环境调起微信支付，到账后刷新余额
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
.tiers { display: flex; flex-wrap: wrap; gap: 20rpx; }
.tier { width: calc(50% - 10rpx); box-sizing: border-box; background: linear-gradient(150deg, #FFFFFF, #E9F1FF); border: 3rpx solid #DCE6F8; border-radius: 32rpx; padding: 28rpx 26rpx; display: flex; flex-direction: column; gap: 6rpx; }
.tier.on { border-color: #527AC3; background: linear-gradient(150deg, #F3F7FF, #DCE9FF); }
.tp { font-size: 46rpx; font-weight: 800; color: #416FBA; }
.tb { font-size: 22rpx; font-weight: 700; color: #CB5368; }
.tg { font-size: 20rpx; }
.pay { margin-top: 30rpx; }
.note { display: block; text-align: center; font-size: 21rpx; margin-top: 16rpx; }
.plus { font-weight: 800; color: #269B79; }
.minus { font-weight: 800; color: #142B53; }
</style>
