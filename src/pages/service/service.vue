<template>
  <view class="wrap">
    <view class="card">
      <view class="list-row" @tap="goOrders"><text>订单沟通</text><text class="arrow">›</text></view>
      <!-- 小程序内 open-type="contact" 会打开微信官方客服会话 -->
      <button class="list-row plain" open-type="contact" @tap="onContact"><text>联系客服</text><text class="muted">24 小时在线 ›</text></button>
      <view class="list-row" @tap="goTickets"><text>投诉 / 售后</text><text class="arrow">›</text></view>
    </view>

    <text class="sec-title sec">常见问题</text>
    <view class="card">
      <view v-for="(f, i) in faqs" :key="f.q">
        <view class="list-row" @tap="open = open === i ? -1 : i"><text>{{ f.q }}</text><text class="arrow">{{ open === i ? '−' : '+' }}</text></view>
        <view v-if="open === i" class="ans sub">{{ f.a }}</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getSettings } from '@api/finance.js'
import { needUserLogin } from '@/store/session.js'
import { toast, run } from '@/utils.js'

const open = ref(-1)
const faqs = ref([])
onShow(async () => { const st = await run(getSettings()); faqs.value = st ? st.faqs : [] })
const goOrders = () => uni.switchTab({ url: '/pages/orders/orders' })
const goTickets = () => needUserLogin() && uni.navigateTo({ url: '/pages/user/tickets' })
function onContact() {
  // #ifdef H5
  toast('网页预览版不支持，小程序里会打开微信客服')
  // #endif
}
</script>

<style scoped>
.sec { display: block; margin: 36rpx 8rpx 16rpx; }
.plain { background: transparent; margin: 0; line-height: normal; border-radius: 0; text-align: left; }
.ans { padding: 0 32rpx 28rpx; font-size: 26rpx; line-height: 1.7; white-space: pre-line; }
</style>
