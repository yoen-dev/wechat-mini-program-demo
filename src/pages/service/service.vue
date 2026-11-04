<!--
  【老板】客服页：常见问题（管理员可在后台编辑）、联系客服、提交售后。
-->
<template>
  <view class="wrap">
    <view class="blk-banner">
      <text class="b-t">BLK 专属客服</text>
      <text class="b-s">订单问题、投诉售后，我们都在</text>
    </view>

    <view class="lrow" @tap="goOrders"><view><text class="l-t">订单沟通</text><text class="l-s">每个订单都有独立聊天</text></view><text class="chev">❯</text></view>
    <!-- 小程序内 open-type="contact" 会打开微信官方客服会话 -->
    <button class="lrow plain" open-type="contact" @tap="onContact"><view><text class="l-t">联系客服</text><text class="l-s">24 小时在线咨询</text></view><text class="chev">❯</text></button>
    <view class="lrow" @tap="goTickets"><view><text class="l-t">投诉 / 售后</text><text class="l-s">提交问题，跟踪处理</text></view><text class="chev">❯</text></view>

    <!-- 常见问题：管理员在后台编辑，点开看答案 -->
    <view class="section"><text class="s-t">常见问题</text></view>
    <view class="card faq">
      <view v-for="(f, i) in faqs" :key="f.q" class="fq">
        <view class="between fh" @tap="open = open === i ? -1 : i"><text class="fqt">Q：{{ f.q }}</text><text class="chev">{{ open === i ? '−' : '+' }}</text></view>
        <view v-if="open === i" class="card-p ans">{{ f.a }}</view>
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

// 展开的问题序号
const open = ref(-1)
// 常见问题
const faqs = ref([])
// 每次显示页面时刷新（从别的页面返回也会触发）
onShow(async () => { const st = await run(getSettings()); faqs.value = st ? st.faqs : [] })
// 去订单页
const goOrders = () => uni.switchTab({ url: '/pages/orders/orders' })
// 去售后记录
const goTickets = () => needUserLogin() && uni.navigateTo({ url: '/pages/user/tickets' })
// 联系客服（正式小程序里用微信客服按钮）
function onContact() {
  // #ifdef H5
  toast('网页预览版不支持，小程序里会打开微信客服')
  // #endif
}
</script>

<style scoped>
.plain { margin: 0 0 18rpx; line-height: normal; text-align: left; }
.faq { padding: 6rpx 28rpx; }
.fq + .fq { border-top: 2rpx solid #E7EEF9; }
.fh { padding: 26rpx 0; gap: 16rpx; }
.fqt { font-size: 25rpx; font-weight: 700; }
.chev { color: #A2B3CC; font-size: 30rpx; }
.ans { padding: 0 0 26rpx; white-space: pre-line; }
</style>
