<template>
  <view class="wrap">
    <view class="card">
      <view class="list-row" @tap="goOrders"><text>订单沟通</text><text class="arrow">›</text></view>
      <!-- 小程序内 open-type="contact" 会打开微信官方客服会话 -->
      <button class="list-row plain" open-type="contact" @tap="onContact"><text>联系客服</text><text class="muted">24 小时在线 ›</text></button>
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
import { toast } from '@/utils.js'

const open = ref(-1)
const faqs = [
  { q: '怎么下单？', a: '1. 选单子和规格\n2. 选择客服派单或指定护航，填写游戏昵称 / ID\n3. 支付后护航会在「订单沟通」里联系你并拉你进队' },
  { q: '客服派单和指定护航有什么区别？', a: '客服派单：付款后由客服安排合适的护航，速度最快。\n指定护航：你自己选护航，需要等对方接单；如果对方暂时没空，会转为客服派单。' },
  { q: '可以退款吗？', a: '护航开始前可以在订单里申请退款，客服审核后原路退回；护航进行中有问题请联系客服处理。具体以 [售后条款] 为准。' },
  { q: '保底是什么意思？', a: '保底单打不到约定的哈夫币数量，护航会继续带你直到达标，不额外收费。' }
]
const goOrders = () => uni.switchTab({ url: '/pages/orders/orders' })
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
