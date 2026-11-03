<!--
  订单详情（老板、护航、客服、管理员共用）：状态说明、订单信息、战绩截图、评价、进度时间线，底部是当前身份能做的操作按钮。
-->
<template>
  <view v-if="o" class="page">
    <view class="card head">
      <StatusTag :status="o.status" />
      <text class="hint">{{ hint }}</text>
      <text v-if="o.status === '待确认' && autoHours" class="muted sub-hint">{{ autoHours }} 小时内未确认将自动确认完成</text>
    </view>

    <!-- 护航提交的战绩截图 -->
    <view v-if="o.proofs && o.proofs.length" class="card block">
      <text class="sec-title">战绩截图</text>
      <view class="imgs">
        <image v-for="(p, i) in o.proofs" :key="i" class="img" :src="p" mode="aspectFill" @tap="preview(i)" />
      </view>
      <text v-if="o.proofNote" class="sub note">护航说明：{{ o.proofNote }}</text>
    </view>
    <view v-else-if="o.status === '待确认'" class="card block">
      <text class="sec-title">战绩截图</text>
      <text class="muted note">（未附截图）{{ o.proofNote || '' }}</text>
    </view>

    <view class="card block">
      <view class="between"><text class="name">{{ o.productName }}</text><text class="price amt">¥{{ o.amount }}</text></view>
      <view class="kv" v-if="o.discount"><text class="muted">优惠</text><text>{{ o.couponName }} −¥{{ o.discount }}（原价 ¥{{ o.original }}）</text></view>
      <view class="kv" v-if="o.paidAt"><text class="muted">支付方式</text><text>{{ o.payMethod === 'balance' ? '余额支付' : '微信支付' }}</text></view>
      <view class="kv"><text class="muted">规格</text><text>{{ o.spec }}</text></view>
      <view class="kv"><text class="muted">下单方式</text><text>{{ o.mode === 'assign' ? '指定护航' : '客服派单' }}</text></view>
      <view class="kv"><text class="muted">护航</text><text>{{ o.escortName || '待分配' }}</text></view>
      <view class="kv" v-if="isStaff"><text class="muted">老板</text><text>{{ o.userName }}</text></view>
      <view class="kv"><text class="muted">游戏 ID</text><text>{{ o.gameId }}</text></view>
      <view class="kv" v-if="o.note"><text class="muted">备注</text><text>{{ o.note }}</text></view>
      <view class="kv" v-if="o.refundReason"><text class="muted">退款原因</text><text>{{ o.refundReason }}</text></view>
      <view class="kv" v-if="isStaff && o.escortShare"><text class="muted">护航分成</text><text>¥{{ o.escortShare }}</text></view>
      <view class="kv"><text class="muted">订单号</text><text>{{ o.id }}</text></view>
      <view class="kv"><text class="muted">下单时间</text><text>{{ fmtTime(o.createdAt) }}</text></view>
    </view>

    <view v-if="o.rating" class="card block">
      <text class="sec-title">老板评价</text>
      <text class="stars">{{ stars }}</text>
      <text class="sub note">{{ o.rating.text || '（没有写评价内容）' }}</text>
    </view>

    <view class="card block">
      <text class="sec-title">订单进度</text>
      <view class="log" v-for="(l, i) in logs" :key="i">
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
import { getOrder } from '@api/orders.js'
import { getSettings } from '@api/finance.js'
import { session } from '@/store/session.js'
import { actionsFor, doAction } from '@/orderActions.js'
import { run, fmtTime } from '@/utils.js'
import StatusTag from '@/components/StatusTag.vue'

// 订单号
const id = ref(null)
// 订单信息
const o = ref(null)
// 多少小时后自动确认（显示提示用）
const autoHours = ref(0)
// 当前是不是客服 / 管理员
const isStaff = computed(() => session.user && session.user.role !== 'user')
// 底部按钮（规则在 orderActions.js）
const actions = computed(() => actionsFor(o.value, session.user))
// 进度时间线，新的在上
const logs = computed(() => (o.value ? o.value.logs.slice().reverse() : []))
// 评分星星
const stars = computed(() => (o.value && o.value.rating ? '★'.repeat(o.value.rating.score) + '☆'.repeat(5 - o.value.rating.score) : ''))
const HINT = {
  待付款: '请尽快完成支付', 待派单: '已支付，客服正在为你安排护航', 待接单: '已通知你指定的护航，等待接单',
  已接单: '护航已接单，即将拉你进队', 进行中: '护航进行中，有问题可在订单沟通里联系',
  待确认: '护航已提交完成，请核对战绩截图后确认', 已完成: '订单已完成，感谢支持',
  退款中: '退款申请已提交，等待客服处理', 已退款: '已退款，款项将原路返回', 已取消: '订单已取消'
}
// 顶部状态说明文字
const hint = computed(() => (o.value ? HINT[o.value.status] : ''))

// 加载订单
async function load() {
  if (!session.user) return uni.redirectTo({ url: '/pages/login/login' })
  o.value = await run(getOrder(session.user, id.value))
  const s = await run(getSettings())
  autoHours.value = s ? s.autoConfirmHours : 0
}
// 页面打开时读取网址参数并加载数据
onLoad((q) => { id.value = q.id })
// 每次显示页面时刷新（从别的页面返回也会触发）
onShow(load)
// 点图片全屏预览
const preview = (i) => uni.previewImage({ urls: o.value.proofs, current: i })
// 点订单上的操作按钮（按钮规则和执行逻辑统一在 src/orderActions.js）
async function act(key) { const r = await doAction(key, o.value, session.user); if (r) o.value = r }
</script>

<style scoped>
.page { padding: 24rpx 24rpx 180rpx; }
.head { padding: 32rpx; display: flex; flex-direction: column; align-items: flex-start; gap: 16rpx; }
.hint { font-size: 30rpx; font-weight: 600; }
.sub-hint { font-size: 22rpx; margin-top: -8rpx; }
.block { margin-top: 20rpx; padding: 28rpx; }
.imgs { display: flex; gap: 16rpx; margin-top: 16rpx; }
.img { width: 196rpx; height: 196rpx; border-radius: 12rpx; background: #F0F0F0; }
.note { display: block; font-size: 24rpx; margin-top: 16rpx; line-height: 1.6; }
.stars { display: block; color: #FAAD14; font-size: 32rpx; letter-spacing: 4rpx; margin-top: 12rpx; }
.name { font-size: 32rpx; font-weight: 700; }
.amt { font-size: 36rpx; }
.kv { display: flex; justify-content: space-between; gap: 24rpx; margin-top: 18rpx; font-size: 26rpx; }
.log { display: flex; gap: 20rpx; margin-top: 24rpx; }
.dot { width: 16rpx; height: 16rpx; border-radius: 50%; background: #D9D9D9; margin-top: 10rpx; flex-shrink: 0; }
.dot.first { background: #1F1F1F; }
.lt { display: flex; flex-direction: column; gap: 4rpx; font-size: 26rpx; }
.ltime { font-size: 22rpx; }
.bar { position: fixed; left: 0; right: 0; bottom: 0; background: #FFFFFF; border-top: 2rpx solid #F0F0F0; display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 16rpx; padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom)); }
.bb { height: 76rpx; padding: 0 28rpx; font-size: 28rpx; }
</style>
