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
          <view class="avatar"><view class="online"></view></view>
          <text class="en ellipsis">{{ e.name }}</text>
          <text class="muted er">{{ e.rating ? '★ ' + e.rating : '新护航' }} · {{ e.done }} 单</text>
          <text class="muted er ellipsis">{{ e.profile.rank || '—' }}</text>
          <text class="info" @tap.stop="showProfile(e)">资料</text>
        </view>
        <text v-if="!escorts.length" class="muted none">暂时没有在线的护航，建议选择客服派单</text>
      </view>
    </view>

    <view class="card block coupon between" @tap="pickCoupon">
      <text class="sec-title">优惠券</text>
      <text :class="coupon ? 'cp-on' : 'muted'">{{ coupon ? coupon.name + ' −¥' + coupon.amount : coupons.length ? coupons.length + ' 张可用 ›' : '暂无可用 ›' }}</text>
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
      <view class="bar-total"><text class="muted">实付 </text><text class="price">¥{{ pay }}</text><text v-if="coupon" class="muted save"> 已省 {{ coupon.amount }}</text></view>
      <button class="btn buy" :loading="busy" @tap="submit">立即下单</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getProduct, SPECS, specPrice } from '@/api/products.js'
import { listEscorts } from '@/api/staff.js'
import { usableCoupons } from '@/api/coupons.js'
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
const coupons = ref([])
const coupon = ref(null)
const couponTouched = ref(false)

const total = computed(() => (p.value ? specPrice(p.value.price, spec.value) : 0))
const pay = computed(() => Math.max(0.01, total.value - (coupon.value ? coupon.value.amount : 0)))

// 金额变化时重新算可用的券，默认选减得最多的一张
async function refreshCoupons() {
  coupons.value = (await run(usableCoupons(session.user, total.value))) || []
  if (coupon.value && !coupons.value.some((c) => c.id === coupon.value.id)) coupon.value = null
  if (!couponTouched.value) coupon.value = coupons.value[0] || null
}
watch(total, refreshCoupons)
function pickCoupon() {
  if (!session.user || session.user.role !== 'user') return toast('登录后可使用优惠券')
  if (!coupons.value.length) return uni.navigateTo({ url: '/pages/user/coupons' })
  uni.showActionSheet({
    itemList: [...coupons.value.map((c) => `${c.name}  −¥${c.amount}`), '不使用优惠券'],
    success: (r) => { couponTouched.value = true; coupon.value = coupons.value[r.tapIndex] || null }
  })
}
function showProfile(e) {
  const pf = e.profile || {}
  uni.showModal({ title: e.name, showCancel: false, content: `段位：${pf.rank || '—'}\n擅长地图：${pf.maps || '—'}\n评分：${e.rating || '暂无'}（${e.ratingCount} 条）\n累计完成：${e.done} 单\n\n${pf.intro || ''}` })
}

onLoad(async (q) => {
  p.value = await run(getProduct(q.id))
  if (!p.value) return setTimeout(() => uni.navigateBack(), 800)
  uni.setNavigationBarTitle({ title: p.value.name })
  escorts.value = (await run(listEscorts({ onlineOnly: true }))) || []
  escortId.value = escorts.value[0] && escorts.value[0].id
  refreshCoupons()
})

const goService = () => uni.switchTab({ url: '/pages/service/service' })

async function submit() {
  if (!needUserLogin()) return
  if (!gameId.value.trim()) return toast('请填写游戏昵称 / ID')
  busy.value = true
  const o = await run(createOrder(session.user, {
    product: p.value, spec: spec.value.name, amount: total.value, mode: mode.value, escortId: escortId.value, gameId: gameId.value, note: note.value,
    couponId: coupon.value ? coupon.value.id : null
  }))
  if (!o) return (busy.value = false)
  // 真实环境：这里调用 uni.requestPayment 拉起微信支付
  const ok = await confirm(`${p.value.name} · ${spec.value.name}\n应付 ¥${o.amount}`, '模拟微信支付')
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
.escorts { flex-wrap: wrap; }
.esc { width: calc(33.33% - 11rpx); box-sizing: border-box; flex: none; display: flex; flex-direction: column; align-items: center; gap: 6rpx; padding: 20rpx 8rpx 12rpx; min-width: 0; }
.er { font-size: 20rpx; max-width: 100%; }
.info { font-size: 22rpx; color: #0958D9; padding: 6rpx 12rpx; }
.none { font-size: 24rpx; }
.online { position: absolute; right: 2rpx; bottom: 2rpx; width: 16rpx; height: 16rpx; border-radius: 50%; background: #52C41A; border: 3rpx solid #FFFFFF; }
.coupon { align-items: center; }
.cp-on { color: #CF1322; font-weight: 600; }
.save { font-size: 22rpx; }
.avatar { position: relative; width: 72rpx; height: 72rpx; border-radius: 50%; background: #E8E8E8; }
.en { font-size: 24rpx; max-width: 100%; }
.bar { position: fixed; left: 0; right: 0; bottom: 0; background: #FFFFFF; border-top: 2rpx solid #F0F0F0; display: flex; align-items: center; gap: 24rpx; padding: 16rpx 32rpx calc(16rpx + env(safe-area-inset-bottom)); }
.bar-cs { font-size: 24rpx; color: #595959; padding: 0 8rpx; }
.bar-total { flex: 1; font-size: 26rpx; }
.bar-total .price { font-size: 36rpx; }
.buy { width: 260rpx; margin: 0; }
</style>
