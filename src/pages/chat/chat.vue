<template>
  <view class="page">
    <view class="head">
      <view class="order-bar">
        <view class="cover thumb"></view>
        <view class="order-text">
          <text class="order-name">{{ order.name }} · ¥{{ order.price }}</text>
          <text class="muted order-no">订单号 {{ order.id }}</text>
        </view>
        <text class="order-status">{{ order.status }}</text>
      </view>
    </view>

    <scroll-view scroll-y class="msgs" :scroll-into-view="lastId" scroll-with-animation>
      <view class="sys">{{ order.escortId ? '护航已接单，请保持语音畅通' : '客服正在为你安排护航，请稍等' }}</view>
      <view v-for="(m, i) in msgs" :key="i" :id="'m' + i" class="row" :class="{ me: m.me }">
        <view v-if="!m.me" class="avatar"></view>
        <view class="bubble">{{ m.text }}</view>
      </view>
    </scroll-view>

    <view class="composer">
      <input class="input" v-model="draft" placeholder="发消息给护航…" confirm-type="send" @confirm="send" />
      <view class="btn-primary send" @tap="send">发送</view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { state, describeOrder, getEscort, sendMessage } from '@/store/index.js'

const orderId = ref(null)
const draft = ref('')
const lastId = ref('')

onLoad((q) => {
  orderId.value = Number(q.id) || state.orders[0].id
  const raw = state.orders.find((o) => o.id === orderId.value)
  const e = getEscort(raw && raw.escortId)
  uni.setNavigationBarTitle({ title: e ? e.name : '平台客服' })
  scrollBottom()
})

const order = computed(() => describeOrder(state.orders.find((o) => o.id === orderId.value) || state.orders[0]))
const msgs = computed(() => state.messages[orderId.value] || [])

function scrollBottom() {
  nextTick(() => { lastId.value = msgs.value.length ? 'm' + (msgs.value.length - 1) : '' })
}

// 演示：消息只存在本地。接后端后改成 WebSocket 或云开发实时数据库
function send() {
  const t = draft.value.trim()
  if (!t) return
  sendMessage(orderId.value, t)
  draft.value = ''
  scrollBottom()
}
</script>

<style scoped>
.page { height: calc(100vh - var(--window-top)); display: flex; flex-direction: column; }
.head { background: #FFFFFF; padding: 20rpx 32rpx; border-bottom: 2rpx solid #DCE6F3; }
.order-bar { display: flex; align-items: center; gap: 20rpx; background: #F4F8FF; border-radius: 24rpx; padding: 16rpx 20rpx; }
.thumb { width: 80rpx; height: 80rpx; border-radius: 16rpx; flex-shrink: 0; }
.order-text { flex: 1; display: flex; flex-direction: column; gap: 4rpx; }
.order-name { font-size: 26rpx; font-weight: 600; }
.order-no { font-size: 22rpx; }
.order-status { font-size: 24rpx; font-weight: 700; color: #1A6FE0; }
.msgs { flex: 1; min-height: 0; padding: 32rpx; box-sizing: border-box; }
.sys { margin: 0 auto 24rpx; width: fit-content; font-size: 22rpx; color: #4A5D7A; background: #DCE8F8; border-radius: 20rpx; padding: 6rpx 20rpx; }
.row { display: flex; gap: 16rpx; align-items: flex-start; margin-bottom: 24rpx; }
.row.me { justify-content: flex-end; }
.avatar { width: 68rpx; height: 68rpx; border-radius: 50%; background: #D6E6FC; flex-shrink: 0; }
.bubble { max-width: 480rpx; padding: 20rpx 24rpx; font-size: 28rpx; line-height: 1.5; border-radius: 28rpx; border-top-left-radius: 8rpx; background: #FFFFFF; word-break: break-all; }
.row.me .bubble { background: #1A6FE0; color: #FFFFFF; border-top-left-radius: 28rpx; border-top-right-radius: 8rpx; }
.composer { background: #FFFFFF; border-top: 2rpx solid #DCE6F3; padding: 20rpx 32rpx calc(20rpx + env(safe-area-inset-bottom)); display: flex; gap: 16rpx; align-items: center; }
.input { flex: 1; height: 84rpx; border: 2rpx solid #CFE0F7; border-radius: 42rpx; padding: 0 28rpx; font-size: 28rpx; background: #F7FAFF; }
.send { height: 84rpx; padding: 0 36rpx; font-size: 28rpx; }
</style>
