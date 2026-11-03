<template>
  <view class="wrap">
    <view class="card form">
      <text class="sec-title">新建优惠券</text>
      <text class="label">名称</text>
      <input class="input" v-model="f.name" placeholder="如：周末立减" />
      <view class="two">
        <view class="col"><text class="label">减免金额（元）</text><input class="input" v-model="f.amount" type="digit" placeholder="10" /></view>
        <view class="col"><text class="label">满多少可用（元）</text><input class="input" v-model="f.minSpend" type="digit" placeholder="0 为无门槛" /></view>
      </view>
      <text class="label">领取后有效天数</text>
      <input class="input" v-model="f.days" type="number" placeholder="30" />
      <button class="btn submit" @tap="create">创建并开始发放</button>
      <text class="muted hint">老板在「我的 → 优惠券」领取，下单时自动选最优的一张</text>
    </view>

    <text class="sec-title sec">已有优惠券</text>
    <view class="card c" v-for="c in list" :key="c.id">
      <view class="cl">
        <text class="ca">¥{{ c.amount }}</text>
        <text class="muted cm">{{ c.minSpend ? '满 ' + c.minSpend + ' 可用' : '无门槛' }}</text>
      </view>
      <view class="cr">
        <view class="row"><text class="cn">{{ c.name }}</text><text class="tag" v-if="!c.active">已停发</text></view>
        <text class="muted cm">有效 {{ c.days }} 天 · 已领 {{ c.claimed }} · 已用 {{ c.used }}</text>
      </view>
      <view class="btn sm ghost" @tap="toggle(c)">{{ c.active ? '停发' : '恢复' }}</view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { listCoupons, createCoupon, toggleCoupon } from '@api/coupons.js'
import { session, guard } from '@/store/session.js'
import { run, toast } from '@/utils.js'

const list = ref([])
const f = reactive({ name: '', amount: '', minSpend: '', days: '30' })
async function load() {
  if (!guard(['admin'])) return
  list.value = (await run(listCoupons(session.user))) || []
}
onShow(load)
async function create() {
  if (await run(createCoupon(session.user, f))) { toast('已创建', 'success'); Object.assign(f, { name: '', amount: '', minSpend: '', days: '30' }); load() }
}
async function toggle(c) { if (await run(toggleCoupon(session.user, c.id))) load() }
</script>

<style scoped>
.form { padding: 28rpx 28rpx 32rpx; }
.two { display: flex; gap: 16rpx; }
.col { flex: 1; }
.submit { margin-top: 32rpx; }
.hint { display: block; font-size: 22rpx; margin-top: 16rpx; text-align: center; }
.sec { display: block; margin: 36rpx 8rpx 16rpx; }
.c { display: flex; align-items: center; gap: 20rpx; padding: 24rpx; margin-bottom: 16rpx; }
.cl { width: 150rpx; display: flex; flex-direction: column; align-items: center; border-right: 2rpx dashed #E5E5E5; padding-right: 16rpx; }
.ca { font-size: 40rpx; font-weight: 700; color: #CF1322; }
.cr { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6rpx; }
.cr .row { gap: 10rpx; }
.cn { font-size: 28rpx; font-weight: 600; }
.cm { font-size: 22rpx; }
</style>
