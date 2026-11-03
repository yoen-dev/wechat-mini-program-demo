<!--
  【老板】单子详情 + 下单页：选规格、选「客服派单 / 指定护航」、填游戏 ID、选优惠券和支付方式，然后下单支付。
-->
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
      <text class="sec-title">支付方式</text>
      <view class="modes">
        <view class="choice mode" :class="{ on: payWith === 'wechat' }" @tap="payWith = 'wechat'">
          <text class="mt">微信支付</text><text class="muted md">　</text>
        </view>
        <view class="choice mode" :class="{ on: payWith === 'balance', off: !enough }" @tap="pickBalance">
          <text class="mt">余额支付</text><text class="muted md">{{ balance === null ? '登录后可用' : '余额 ¥' + balance + (enough ? '' : '，去充值 ›') }}</text>
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
      <view class="bar-total"><text class="muted">实付 </text><text class="price">¥{{ pay }}</text><text v-if="coupon" class="muted save"> 已省 {{ coupon.amount }}</text></view>
      <button class="btn buy" :loading="busy" @tap="submit">立即下单</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getProduct, SPECS, specPrice } from '@api/products.js'
import { listEscorts } from '@api/staff.js'
import { usableCoupons } from '@api/coupons.js'
import { getWallet } from '@api/wallet.js'
import { createOrder, payOrder } from '@api/orders.js'
import { session, needUserLogin } from '@/store/session.js'
import { run, toast, confirm } from '@/utils.js'
import { IS_MOCK } from '@/api/constants.js'

// 单子信息
const p = ref(null)
// 选中的规格（单次 / 三次 / 五次）
const spec = ref(SPECS[0])
// 下单方式：dispatch 客服派单 / assign 指定护航
const mode = ref('dispatch')
// 在线的护航（指定护航时选）
const escorts = ref([])
// 选中的护航
const escortId = ref(null)
// 老板的游戏昵称 / ID
const gameId = ref('')
// 备注
const note = ref('')
// 提交中，防止重复点击
const busy = ref(false)
// 可用的优惠券
const coupons = ref([])
// 选中的优惠券
const coupon = ref(null)
// 老板是否手动选过券（没选过就自动选减最多的）
const couponTouched = ref(false)
// 支付方式：wechat 微信 / balance 余额
const payWith = ref('wechat')
// 老板余额（未登录为 null）
const balance = ref(null)

// 原价 = 单价 × 规格倍数
const total = computed(() => (p.value ? specPrice(p.value.price, spec.value) : 0))
// 实付 = 原价 − 优惠券
const pay = computed(() => Math.max(0.01, total.value - (coupon.value ? coupon.value.amount : 0)))
// 余额够不够付
const enough = computed(() => balance.value !== null && balance.value >= pay.value)
watch(enough, (v) => { if (!v && payWith.value === 'balance') payWith.value = 'wechat' })
// 读取余额
async function loadBalance() {
  if (!session.user || session.user.role !== 'user') { balance.value = null; return }
  const w = await getWallet(session.user).catch(() => null)
  balance.value = w ? w.balance : null
}
// 选择余额支付（余额不够就去充值）
function pickBalance() {
  if (balance.value === null) return toast('登录后可用余额支付')
  if (!enough.value) return uni.navigateTo({ url: '/pages/user/recharge' })
  payWith.value = 'balance'
}

// 金额变化时重新算可用的券，默认选减得最多的一张
async function refreshCoupons() {
  coupons.value = (await run(usableCoupons(session.user, total.value))) || []
  if (coupon.value && !coupons.value.some((c) => c.id === coupon.value.id)) coupon.value = null
  if (!couponTouched.value) coupon.value = coupons.value[0] || null
}
watch(total, refreshCoupons)
// 手动选优惠券
function pickCoupon() {
  if (!session.user || session.user.role !== 'user') return toast('登录后可使用优惠券')
  if (!coupons.value.length) return uni.navigateTo({ url: '/pages/user/coupons' })
  uni.showActionSheet({
    itemList: [...coupons.value.map((c) => `${c.name}  −¥${c.amount}`), '不使用优惠券'],
    success: (r) => { couponTouched.value = true; coupon.value = coupons.value[r.tapIndex] || null }
  })
}
// 查看护航资料（段位、擅长地图、评分）
function showProfile(e) {
  const pf = e.profile || {}
  uni.showModal({ title: e.name, showCancel: false, content: `段位：${pf.rank || '—'}\n擅长地图：${pf.maps || '—'}\n评分：${e.rating || '暂无'}（${e.ratingCount} 条）\n累计完成：${e.done} 单\n\n${pf.intro || ''}` })
}

// 页面打开时读取网址参数并加载数据
onLoad(async (q) => {
  p.value = await run(getProduct(q.id))
  if (!p.value) return setTimeout(() => uni.navigateBack(), 800)
  uni.setNavigationBarTitle({ title: p.value.name })
  escorts.value = (await run(listEscorts({ onlineOnly: true }))) || []
  escortId.value = escorts.value[0] && escorts.value[0].id
  refreshCoupons()
})
// 每次显示页面时刷新（从别的页面返回也会触发）
onShow(loadBalance)

// 跳到客服页
const goService = () => uni.switchTab({ url: '/pages/service/service' })

// 下单并支付：先创建订单（待付款），再支付；取消支付的话订单留在「待付款」可以稍后继续
async function submit() {
  if (!needUserLogin()) return
  if (!gameId.value.trim()) return toast('请填写游戏昵称 / ID')
  busy.value = true
  const o = await run(createOrder(session.user, {
    product: p.value, spec: spec.value.name, amount: total.value, mode: mode.value, escortId: escortId.value, gameId: gameId.value, note: note.value,
    couponId: coupon.value ? coupon.value.id : null
  }))
  if (!o) return (busy.value = false)
  // 真实环境：微信支付调用 uni.requestPayment；余额支付由后端扣款
  const byBalance = payWith.value === 'balance'
  // 余额支付先确认一下；微信支付在真实环境会弹微信自己的付款界面，只有演示版才弹「模拟微信支付」
  const ok = byBalance || IS_MOCK ? await confirm(`${p.value.name} · ${spec.value.name}\n${byBalance ? '余额支付' : '应付'} ¥${o.amount}`, byBalance ? '确认余额支付' : '模拟微信支付') : true
  if (ok && (await run(payOrder(session.user, o.id, byBalance ? 'balance' : 'wechat')))) {
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
.dot { color: #8798B5; }
.spec { margin-top: 16rpx; font-size: 28rpx; }
.modes { display: flex; gap: 16rpx; margin-top: 16rpx; }
.mode { flex: 1; display: flex; flex-direction: column; gap: 4rpx; }
.mt { font-size: 28rpx; font-weight: 600; }
.md { font-size: 22rpx; }
.escorts { display: flex; gap: 16rpx; margin-top: 16rpx; }
.escorts { flex-wrap: wrap; }
.esc { width: calc(33.33% - 11rpx); box-sizing: border-box; flex: none; display: flex; flex-direction: column; align-items: center; gap: 6rpx; padding: 20rpx 8rpx 12rpx; min-width: 0; }
.er { font-size: 20rpx; max-width: 100%; }
.info { font-size: 22rpx; color: #4B72B8; padding: 6rpx 12rpx; }
.none { font-size: 24rpx; }
.online { position: absolute; right: 2rpx; bottom: 2rpx; width: 16rpx; height: 16rpx; border-radius: 50%; background: #28A88A; border: 3rpx solid #FFFFFF; }
.coupon { align-items: center; }
.mode.off { opacity: 0.6; }
.cp-on { color: #CB5368; font-weight: 600; }
.save { font-size: 22rpx; }
.avatar { position: relative; width: 72rpx; height: 72rpx; border-radius: 50%; background: #E4ECFA; }
.en { font-size: 24rpx; max-width: 100%; }
.bar { position: fixed; left: 0; right: 0; bottom: 0; background: #FFFFFF; border-top: 2rpx solid #E8EFFD; display: flex; align-items: center; gap: 24rpx; padding: 16rpx 32rpx calc(16rpx + env(safe-area-inset-bottom)); }
.bar-cs { font-size: 24rpx; color: #5B6F92; padding: 0 8rpx; }
.bar-total { flex: 1; font-size: 26rpx; }
.bar-total .price { font-size: 36rpx; }
.buy { width: 260rpx; margin: 0; }
</style>
