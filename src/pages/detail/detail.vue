<template>
  <view v-if="p" class="page">
    <view class="cover hero">封面图</view>

    <view class="card block first">
      <text class="name">{{ p.name }}</text>
      <view class="tags"><text class="tag" v-for="t in p.tags" :key="t">{{ t }}</text></view>
      <view class="row price-row"><text class="price big">¥{{ total }}</text><text class="muted unit"> / {{ spec.name }}</text></view>
    </view>

    <view class="card block">
      <text class="sec-title">服务说明</text>
      <view class="point" v-for="x in p.points" :key="x"><text class="dot">•</text><text class="sub">{{ x }}</text></view>
    </view>

    <view class="card block">
      <text class="sec-title">选择规格</text>
      <view class="choice spec between" v-for="s in SPECS" :key="s.name" :class="{ on: spec.name === s.name }" @tap="spec = s">
        <text>{{ s.name }}</text><text class="price">¥{{ specPrice(p.price, s) }}</text>
      </view>
    </view>

    <view class="card block">
      <text class="sec-title">下单方式</text>
      <view class="modes">
        <view class="choice mode" :class="{ on: mode === 'dispatch' }" @tap="mode = 'dispatch'">
          <text class="mt">客服派单</text><text class="muted md">最快匹配，推荐</text>
        </view>
        <view class="choice mode" :class="{ on: mode === 'assign' }" @tap="mode = 'assign'">
          <text class="mt">指定护航</text><text class="muted md">选你想要的人</text>
        </view>
      </view>
      <view v-if="mode === 'assign'" class="escorts">
        <view class="choice esc" v-for="e in escorts" :key="e.id" :class="{ on: escortId === e.id }" @tap="escortId = e.id">
          <view class="avatar"></view><text class="en ellipsis">{{ e.name }}</text>
        </view>
      </view>
    </view>

    <view class="card block">
      <text class="sec-title">下单信息</text>
      <text class="label">游戏昵称 / ID</text>
      <input class="input" v-model="gameId" placeholder="护航会按这个拉你进队" />
      <text class="label">备注（选填）</text>
      <input class="input" v-model="note" placeholder="如：晚上 9 点后" />
    </view>

    <view class="bar">
      <view class="bar-cs" @tap="goService"><text>客服</text></view>
      <view class="bar-total"><text class="muted">合计 </text><text class="price">¥{{ total }}</text></view>
      <button class="btn buy" :loading="busy" @tap="submit">立即下单</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getProduct, SPECS, specPrice } from '@/api/products.js'
import { listEscorts } from '@/api/staff.js'
import { createOrder, payOrder } from '@/api/orders.js'
import { session, needUserLogin } from '@/store/session.js'
import { run, toast, confirm } from '@/utils.js'

const p = ref(null)
const spec = ref(SPECS[0])
const mode = ref('dispatch')
const escorts = ref([])
const escortId = ref(null)
const gameId = ref('')
const note = ref('')
const busy = ref(false)

const total = computed(() => (p.value ? specPrice(p.value.price, spec.value) : 0))

onLoad(async (q) => {
  p.value = await run(getProduct(q.id))
  if (!p.value) return setTimeout(() => uni.navigateBack(), 800)
  uni.setNavigationBarTitle({ title: p.value.name })
  escorts.value = (await run(listEscorts())) || []
  escortId.value = escorts.value[0] && escorts.value[0].id
})

const goService = () => uni.switchTab({ url: '/pages/service/service' })

async function submit() {
  if (!needUserLogin()) return
  if (!gameId.value.trim()) return toast('请填写游戏昵称 / ID')
  busy.value = true
  const o = await run(createOrder(session.user, {
    product: p.value, spec: spec.value.name, amount: total.value, mode: mode.value, escortId: escortId.value, gameId: gameId.value, note: note.value
  }))
  if (!o) return (busy.value = false)
  // 真实环境：这里调用 uni.requestPayment 拉起微信支付
  const ok = await confirm(`${p.value.name} · ${spec.value.name}\n应付 ¥${total.value}`, '模拟微信支付')
  if (ok) {
    await run(payOrder(session.user, o.id))
    toast('支付成功', 'success')
  } else {
    toast('订单已保存，可在订单里继续支付')
  }
  busy.value = false
  setTimeout(() => uni.redirectTo({ url: `/pages/order/order?id=${o.id}` }), 500)
}
</script>

<style scoped>
.page { padding-bottom: 180rpx; }
.hero { height: 400rpx; font-size: 26rpx; }
.block { margin: 20rpx 24rpx 0; padding: 28rpx; }
.first { margin-top: -40rpx; position: relative; }
.name { display: block; font-size: 38rpx; font-weight: 700; }
.tags { display: flex; flex-wrap: wrap; gap: 10rpx; margin-top: 16rpx; }
.price-row { margin-top: 20rpx; align-items: baseline; }
.big { font-size: 48rpx; }
.unit { font-size: 24rpx; }
.point { display: flex; gap: 12rpx; margin-top: 16rpx; font-size: 26rpx; line-height: 1.6; }
.dot { color: #8C8C8C; }
.spec { margin-top: 16rpx; font-size: 28rpx; }
.modes { display: flex; gap: 16rpx; margin-top: 16rpx; }
.mode { flex: 1; display: flex; flex-direction: column; gap: 4rpx; }
.mt { font-size: 28rpx; font-weight: 600; }
.md { font-size: 22rpx; }
.escorts { display: flex; gap: 16rpx; margin-top: 16rpx; }
.esc { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 10rpx; padding: 20rpx 8rpx; min-width: 0; }
.avatar { width: 72rpx; height: 72rpx; border-radius: 50%; background: #E8E8E8; }
.en { font-size: 24rpx; max-width: 100%; }
.bar { position: fixed; left: 0; right: 0; bottom: 0; background: #FFFFFF; border-top: 2rpx solid #F0F0F0; display: flex; align-items: center; gap: 24rpx; padding: 16rpx 32rpx calc(16rpx + env(safe-area-inset-bottom)); }
.bar-cs { font-size: 24rpx; color: #595959; padding: 0 8rpx; }
.bar-total { flex: 1; font-size: 26rpx; }
.bar-total .price { font-size: 36rpx; }
.buy { width: 260rpx; margin: 0; }
</style>
