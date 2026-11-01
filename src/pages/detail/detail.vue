<template>
  <view v-if="p" class="page">
    <view class="cover hero">[封面图]</view>

    <view class="card info">
      <view class="row-baseline">
        <text class="price big">¥{{ p.price }}</text>
        <text class="tag">{{ p.tag }}</text>
      </view>
      <text class="title">{{ p.name }}</text>
      <text class="muted desc">{{ p.desc }}。全程语音沟通，装备全归老板。</text>
      <view class="muted stats">
        <text>已售 [数量]</text><text>好评率 [比例]</text><text>平均 [时长] 接单</text>
      </view>
    </view>

    <view class="card block">
      <text class="block-title">下单方式</text>
      <view class="modes">
        <view class="mode" :class="{ on: mode === 'dispatch' }" @tap="mode = 'dispatch'">
          <text class="mode-name">客服派单</text>
          <text class="mode-sub">最快匹配护航</text>
        </view>
        <view class="mode" :class="{ on: mode === 'assign' }" @tap="mode = 'assign'">
          <text class="mode-name">指定护航</text>
          <text class="mode-sub">选你想要的人</text>
        </view>
      </view>
      <view v-if="mode === 'assign'" class="escorts">
        <view v-for="e in escorts" :key="e.id" class="mode escort" :class="{ on: escortId === e.id }" @tap="escortId = e.id">
          <view class="avatar"></view>
          <text class="escort-name">{{ e.name }}</text>
          <text class="muted escort-meta">接单 {{ e.orders }}</text>
        </view>
      </view>
      <text v-else class="muted hint">付款后客服会在 [时长] 内为你安排合适的护航，可在订单沟通里查看进度。</text>
    </view>

    <view class="card block">
      <text class="label">游戏昵称 / ID</text>
      <input class="field" v-model="gameId" placeholder="方便护航加你组队" />
      <text class="label">备注（选填）</text>
      <input class="field" v-model="note" placeholder="如：想打航天基地" />
    </view>

    <view class="bar">
      <view class="bar-service" @tap="goService">
        <text class="bar-icon">☎</text>
        <text>客服</text>
      </view>
      <view class="bar-total">
        <text class="muted bar-label">合计</text>
        <text class="price bar-price">¥{{ p.price }}</text>
      </view>
      <view class="btn-primary bar-btn" @tap="submit">立即下单</view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getProduct, escorts, placeOrder } from '@/store/index.js'

const p = ref(null)
const mode = ref('dispatch')
const escortId = ref(escorts[0].id)
const gameId = ref('')
const note = ref('')

onLoad((q) => {
  p.value = getProduct(q.id) || getProduct(1)
  uni.setNavigationBarTitle({ title: p.value.name })
})

function goService() {
  uni.switchTab({ url: '/pages/service/service' })
}

function submit() {
  if (!gameId.value.trim()) {
    uni.showToast({ title: '请填写游戏昵称 / ID', icon: 'none' })
    return
  }
  // 演示：直接生成订单。接后端后这里改成 创建订单 → 调起微信支付 → 支付成功再跳转
  uni.showModal({
    title: '确认下单',
    content: `${p.value.name} · ¥${p.value.price}\n${mode.value === 'assign' ? '指定护航' : '客服派单'}`,
    confirmText: '模拟支付',
    success: (r) => {
      if (!r.confirm) return
      placeOrder({ productId: p.value.id, mode: mode.value, escortId: escortId.value, gameId: gameId.value.trim(), note: note.value.trim() })
      uni.showToast({ title: '下单成功', icon: 'success' })
      setTimeout(() => uni.switchTab({ url: '/pages/orders/orders' }), 600)
    }
  })
}
</script>

<style scoped>
.page { padding-bottom: 180rpx; display: flex; flex-direction: column; gap: 24rpx; }
.hero { height: 440rpx; font-size: 26rpx; }
.info { margin: -72rpx 32rpx 0; position: relative; padding: 32rpx; display: flex; flex-direction: column; gap: 16rpx; }
.row-baseline { display: flex; align-items: baseline; gap: 16rpx; }
.big { font-size: 52rpx; }
.title { font-size: 36rpx; font-weight: 700; }
.desc { font-size: 26rpx; line-height: 1.6; }
.stats { display: flex; gap: 28rpx; font-size: 24rpx; }
.block { margin: 0 32rpx; padding: 32rpx; display: flex; flex-direction: column; gap: 20rpx; }
.block-title { font-size: 30rpx; font-weight: 700; }
.modes, .escorts { display: flex; gap: 20rpx; }
.mode { flex: 1; padding: 20rpx; border-radius: 24rpx; background: #F7FAFF; border: 3rpx solid #DCE6F3; display: flex; flex-direction: column; align-items: center; gap: 4rpx; }
.mode.on { background: #E3EEFF; border-color: #1A6FE0; color: #1A6FE0; }
.mode-name { font-size: 28rpx; font-weight: 700; }
.mode-sub { font-size: 22rpx; }
.avatar { width: 80rpx; height: 80rpx; border-radius: 50%; background: #D6E6FC; margin-bottom: 8rpx; }
.escort-name { font-size: 26rpx; font-weight: 600; }
.escort-meta { font-size: 22rpx; }
.hint { font-size: 24rpx; line-height: 1.6; }
.label { font-size: 26rpx; font-weight: 600; }
.field { height: 88rpx; border: 2rpx solid #CFE0F7; border-radius: 20rpx; padding: 0 24rpx; font-size: 28rpx; background: #F7FAFF; }
.bar { position: fixed; left: 0; right: 0; bottom: 0; background: #FFFFFF; border-top: 2rpx solid #DCE6F3; display: flex; align-items: center; gap: 24rpx; padding: 20rpx 32rpx calc(20rpx + env(safe-area-inset-bottom)); }
.bar-service { display: flex; flex-direction: column; align-items: center; font-size: 22rpx; color: #5B6B82; }
.bar-icon { font-size: 36rpx; }
.bar-total { flex: 1; display: flex; flex-direction: column; }
.bar-label { font-size: 22rpx; }
.bar-price { font-size: 40rpx; }
.bar-btn { height: 88rpx; padding: 0 56rpx; font-size: 30rpx; }
</style>
