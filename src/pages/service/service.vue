<template>
  <view class="page">
    <view class="seg">
      <view v-for="t in tabs" :key="t" class="seg-item" :class="{ on: t === tab }" @tap="tab = t">{{ t }}</view>
    </view>

    <view v-if="tab === '订单沟通'" class="list">
      <view class="card conv" v-for="c in convs" :key="c.id" @tap="openChat(c.id)">
        <view class="avatar"></view>
        <view class="conv-body">
          <view class="conv-top">
            <text class="conv-name">{{ c.title }}</text>
          </view>
          <text class="muted conv-last ellipsis">{{ c.name }} · {{ c.last }}</text>
        </view>
      </view>
      <view v-if="!convs.length" class="muted empty">还没有订单沟通</view>
    </view>

    <view v-else-if="tab === '联系客服'" class="card contact">
      <view class="contact-icon">☎</view>
      <text class="contact-title">在线客服 · 24 小时</text>
      <text class="muted contact-sub">下单前咨询、派单进度、售后投诉都可以找我们</text>
      <!-- 微信小程序里 open-type="contact" 会直接打开微信官方客服会话 -->
      <button class="btn-primary contact-btn" open-type="contact" @tap="onContact">开始咨询</button>
    </view>

    <view v-else class="list">
      <view class="card notice" v-for="(n, i) in notices" :key="i">
        <view class="notice-top">
          <text class="notice-title">{{ n.title }}</text>
          <text class="muted notice-time">[时间]</text>
        </view>
        <text class="muted notice-text">{{ n.text }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { state, describeOrder, getEscort } from '@/store/index.js'

const tabs = ['订单沟通', '联系客服', '系统通知']
const tab = ref('订单沟通')

const convs = computed(() =>
  state.orders
    .filter((o) => o.status !== '已退款')
    .map((o) => {
      const d = describeOrder(o)
      const e = getEscort(o.escortId)
      const m = state.messages[o.id]
      return { id: o.id, name: d.name, title: e ? e.name : '平台客服', last: m && m.length ? m[m.length - 1].text : '正在为你安排护航，请稍等' }
    })
)

const notices = computed(() =>
  state.orders.slice(0, 5).map((o) => {
    const d = describeOrder(o)
    return o.status === '已付款'
      ? { title: '支付成功', text: `「${d.name}」支付成功，客服正在派单。` }
      : { title: `订单${o.status}`, text: `你的「${d.name}」当前状态：${o.status}。` }
  })
)

function openChat(id) {
  uni.navigateTo({ url: `/pages/chat/chat?id=${id}` })
}
function onContact() {
  // #ifdef H5
  uni.showToast({ title: '网页预览版不支持，小程序里会打开微信客服', icon: 'none' })
  // #endif
}
</script>

<style scoped>
.page { padding: 24rpx 32rpx 40rpx; display: flex; flex-direction: column; gap: 24rpx; }
.list { display: flex; flex-direction: column; gap: 20rpx; }
.conv { padding: 28rpx; display: flex; gap: 24rpx; align-items: center; }
.avatar { width: 88rpx; height: 88rpx; border-radius: 50%; background: #D6E6FC; flex-shrink: 0; }
.conv-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8rpx; }
.conv-name { font-size: 28rpx; font-weight: 700; }
.conv-last { font-size: 24rpx; }
.contact { padding: 40rpx; display: flex; flex-direction: column; align-items: center; gap: 20rpx; text-align: center; }
.contact-icon { width: 128rpx; height: 128rpx; border-radius: 50%; background: #E3EEFF; color: #1A6FE0; font-size: 56rpx; display: flex; align-items: center; justify-content: center; }
.contact-title { font-size: 32rpx; font-weight: 700; }
.contact-sub { font-size: 26rpx; line-height: 1.6; }
.contact-btn { width: 100%; height: 88rpx; font-size: 30rpx; margin-top: 12rpx; border: 0; }
.contact-btn::after { border: 0; }
.notice { padding: 28rpx; display: flex; flex-direction: column; gap: 8rpx; }
.notice-top { display: flex; justify-content: space-between; }
.notice-title { font-size: 28rpx; font-weight: 700; }
.notice-time, .notice-text { font-size: 24rpx; }
.empty { text-align: center; padding-top: 120rpx; }
</style>
