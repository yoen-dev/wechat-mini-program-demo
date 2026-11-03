<template>
  <view class="wrap">
    <template v-if="data.claimable.length">
      <text class="sec-title sec">可领取</text>
      <view class="card c" v-for="c in data.claimable" :key="c.id">
        <view class="cl"><text class="ca">¥{{ c.amount }}</text><text class="muted cm">{{ c.minSpend ? '满 ' + c.minSpend + ' 可用' : '无门槛' }}</text></view>
        <view class="cr"><text class="cn">{{ c.name }}</text><text class="muted cm">领取后 {{ c.days }} 天内有效</text></view>
        <view class="btn sm" @tap="claim(c)">领取</view>
      </view>
    </template>

    <text class="sec-title sec">我的优惠券</text>
    <view class="card c" v-for="c in data.mine" :key="c.id" :class="{ dim: c.state !== '可使用' }">
      <view class="cl"><text class="ca">¥{{ c.amount }}</text><text class="muted cm">{{ c.minSpend ? '满 ' + c.minSpend + ' 可用' : '无门槛' }}</text></view>
      <view class="cr"><text class="cn">{{ c.name }}</text><text class="muted cm">{{ c.state === '可使用' ? fmtTime(c.expireAt) + ' 到期' : c.state }}</text></view>
      <view v-if="c.state === '可使用'" class="btn sm ghost" @tap="use">去使用</view>
    </view>
    <Empty v-if="!data.mine.length" text="还没有优惠券" />
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { couponCenter, claimCoupon } from '@api/coupons.js'
import { session, needUserLogin } from '@/store/session.js'
import { run, toast, fmtTime } from '@/utils.js'
import Empty from '@/components/Empty.vue'

const data = ref({ claimable: [], mine: [] })
async function load() {
  if (!needUserLogin()) return
  data.value = (await run(couponCenter(session.user))) || data.value
}
onShow(load)
async function claim(c) { if (await run(claimCoupon(session.user, c.id))) { toast('领取成功', 'success'); load() } }
const use = () => uni.switchTab({ url: '/pages/index/index' })
</script>

<style scoped>
.sec { display: block; margin: 16rpx 8rpx; }
.c { display: flex; align-items: center; gap: 20rpx; padding: 24rpx; margin-bottom: 16rpx; }
.c.dim { opacity: 0.5; }
.cl { width: 150rpx; display: flex; flex-direction: column; align-items: center; border-right: 2rpx dashed #E5E5E5; padding-right: 16rpx; }
.ca { font-size: 40rpx; font-weight: 700; color: #CF1322; }
.cr { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6rpx; }
.cn { font-size: 28rpx; font-weight: 600; }
.cm { font-size: 22rpx; }
</style>
