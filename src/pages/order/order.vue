<template>
  <view v-if="o" class="page">
    <view class="card head">
      <StatusTag :status="o.status" />
      <text class="hint">{{ hint }}</text>
    </view>

    <view class="card block">
      <view class="between"><text class="name">{{ o.productName }}</text><text class="price amt">¥{{ o.amount }}</text></view>
      <view class="kv"><text class="muted">规格</text><text>{{ o.spec }}</text></view>
      <view class="kv"><text class="muted">下单方式</text><text>{{ o.mode === 'assign' ? '指定护航' : '客服派单' }}</text></view>
      <view class="kv"><text class="muted">护航</text><text>{{ o.escortName || '待分配' }}</text></view>
      <view class="kv" v-if="isStaff"><text class="muted">老板</text><text>{{ o.userName }}</text></view>
      <view class="kv"><text class="muted">游戏 ID</text><text>{{ o.gameId }}</text></view>
      <view class="kv" v-if="o.note"><text class="muted">备注</text><text>{{ o.note }}</text></view>
      <view class="kv" v-if="o.refundReason"><text class="muted">退款原因</text><text>{{ o.refundReason }}</text></view>
      <view class="kv"><text class="muted">订单号</text><text>{{ o.id }}</text></view>
      <view class="kv"><text class="muted">下单时间</text><text>{{ fmtTime(o.createdAt) }}</text></view>
    </view>

    <view class="card block">
      <text class="sec-title">订单进度</text>
      <view class="log" v-for="(l, i) in o.logs.slice().reverse()" :key="i">
        <view class="dot" :class="{ first: i === 0 }"></view>
        <view class="lt"><text>{{ l.text }}</text><text class="muted ltime">{{ fmtTime(l.t) }}</text></view>
      </view>
    </view>

    <view v-if="actions.length" class="bar">
      <view v-for="b in actions" :key="b.key" class="btn bb" :class="{ ghost: b.ghost }" @tap="act(b.key)">{{ b.label }}</view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getOrder } from '@/api/orders.js'
import { session } from '@/store/session.js'
import { actionsFor, doAction } from '@/orderActions.js'
import { run, fmtTime } from '@/utils.js'
import StatusTag from '@/components/StatusTag.vue'

const id = ref(null)
const o = ref(null)
const isStaff = computed(() => session.user && session.user.role !== 'user')
const actions = computed(() => actionsFor(o.value, session.user))
const HINT = {
  待付款: '请尽快完成支付', 待派单: '已支付，客服正在为你安排护航', 待接单: '已通知你指定的护航，等待接单',
  已接单: '护航已接单，即将拉你进队', 进行中: '护航进行中，有问题可在订单沟通里联系', 已完成: '订单已完成，感谢支持',
  退款中: '退款申请已提交，等待客服处理', 已退款: '已退款，款项将原路返回', 已取消: '订单已取消'
}
const hint = computed(() => (o.value ? HINT[o.value.status] : ''))

async function load() {
  if (!session.user) return uni.redirectTo({ url: '/pages/login/login' })
  o.value = await run(getOrder(session.user, id.value))
}
onLoad((q) => { id.value = q.id })
onShow(load)
async function act(key) { const r = await doAction(key, o.value, session.user); if (r) o.value = r }
</script>

<style scoped>
.page { padding: 24rpx 24rpx 180rpx; }
.head { padding: 32rpx; display: flex; flex-direction: column; align-items: flex-start; gap: 16rpx; }
.hint { font-size: 30rpx; font-weight: 600; }
.block { margin-top: 20rpx; padding: 28rpx; }
.name { font-size: 32rpx; font-weight: 700; }
.amt { font-size: 36rpx; }
.kv { display: flex; justify-content: space-between; gap: 24rpx; margin-top: 18rpx; font-size: 26rpx; }
.log { display: flex; gap: 20rpx; margin-top: 24rpx; }
.dot { width: 16rpx; height: 16rpx; border-radius: 50%; background: #D9D9D9; margin-top: 10rpx; flex-shrink: 0; }
.dot.first { background: #1F1F1F; }
.lt { display: flex; flex-direction: column; gap: 4rpx; font-size: 26rpx; }
.ltime { font-size: 22rpx; }
.bar { position: fixed; left: 0; right: 0; bottom: 0; background: #FFFFFF; border-top: 2rpx solid #F0F0F0; display: flex; justify-content: flex-end; gap: 16rpx; padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom)); }
.bb { height: 76rpx; padding: 0 32rpx; font-size: 28rpx; }
</style>
