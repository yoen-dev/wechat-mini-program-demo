<!--
  【管理员】优惠券管理：新建券（减免金额、门槛、有效天数）、停发 / 恢复，查看领取和使用数量。
-->
<template>
  <view class="wrap">
    <view class="card form">
      <text class="card-t">创建优惠券</text>
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

    <view class="section"><text class="s-t">已有优惠券</text></view>
    <view class="card c" v-for="c in list" :key="c.id">
      <view class="cl">
        <text class="ca">¥{{ c.amount }}</text>
        <text class="muted cm">{{ c.minSpend ? '满 ' + c.minSpend + ' 可用' : '无门槛' }}</text>
      </view>
      <view class="cr">
        <view class="row"><text class="cn">{{ c.name }}</text><text :class="['chip', c.active ? 'green' : 'grey']">{{ c.active ? '发放中' : '已停发' }}</text></view>
        <text class="muted cm">有效 {{ c.days }} 天 · 已领 {{ c.claimed }} · 已用 {{ c.used }}</text>
      </view>
      <view class="btn sm light" @tap="toggle(c)">{{ c.active ? '停发' : '恢复' }}</view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { listCoupons, createCoupon, toggleCoupon } from '@api/coupons.js'
import { session, guard } from '@/store/session.js'
import { run, toast } from '@/utils.js'

// 列表数据
const list = ref([])
// 表单内容
const f = reactive({ name: '', amount: '', minSpend: '', days: '30' })
// 加载页面数据
async function load() {
  if (!guard(['admin'])) return
  list.value = (await run(listCoupons(session.user))) || []
}
// 每次显示页面时刷新（从别的页面返回也会触发）
onShow(load)
// 新建优惠券
async function create() {
  if (await run(createCoupon(session.user, f))) { toast('已创建', 'success'); Object.assign(f, { name: '', amount: '', minSpend: '', days: '30' }); load() }
}
// 停发 / 恢复发放
async function toggle(c) { if (await run(toggleCoupon(session.user, c.id))) load() }
</script>

<style scoped>
.form { padding: 30rpx 28rpx 32rpx; }
.two { display: flex; gap: 16rpx; }
.col { flex: 1; }
.submit { margin-top: 32rpx; }
.hint { display: block; font-size: 21rpx; margin-top: 16rpx; text-align: center; }
.c { display: flex; align-items: center; gap: 20rpx; padding: 26rpx; margin-bottom: 18rpx; }
.cl { width: 150rpx; display: flex; flex-direction: column; align-items: center; border-right: 2rpx dashed #C9D8F2; padding-right: 16rpx; }
.ca { font-size: 42rpx; font-weight: 800; color: #416FBA; }
.cr { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6rpx; }
.cr .row { gap: 10rpx; }
.cn { font-size: 26rpx; font-weight: 800; }
.cm { font-size: 21rpx; }
</style>
