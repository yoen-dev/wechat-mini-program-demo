<!--
  【老板】单子详情 + 下单页：选规格、选「客服派单 / 指定护航」、填游戏 ID、选优惠券和支付方式，然后下单支付。
-->
<template>
  <view v-if="p" class="wrap page">
    <!-- 顶部横幅：分类、名称、简介 -->
    <view class="blk-banner">
      <text class="b-s top">BLK · {{ p.cats[0] || '护航' }}</text>
      <text class="b-t">{{ p.name }}</text>
      <text class="b-s">{{ p.desc }}</text>
    </view>

    <!-- 价格和标签 -->
    <view class="card pad">
      <view class="chips"><text class="chip" v-for="t in p.tags" :key="t">{{ t }}</text></view>
      <view class="row price-row"><text class="price big">¥{{ total }}</text><text class="muted unit"> / {{ spec.name }}</text></view>
    </view>

    <!-- 规格（套餐） -->
    <view class="section"><text class="s-t">套餐选择</text></view>
    <view class="grid3">
      <view class="spec" v-for="s in SPECS" :key="s.name" :class="{ on: spec.name === s.name }" @tap="spec = s">
        <text class="sp-n">{{ s.name }}</text><text class="sp-p">¥{{ specPrice(p.price, s) }}</text>
      </view>
    </view>

    <!-- 服务说明 -->
    <view class="section"><text class="s-t">服务说明</text></view>
    <view class="step-row" v-for="(x, i) in p.points" :key="x"><text class="sn">{{ i + 1 }}</text><text class="sub">{{ x }}</text></view>

    <!-- 下单方式：客服派单 / 指定护航 -->
    <view class="section"><text class="s-t">下单方式</text></view>
    <view class="grid2">
      <view class="choice mode" :class="{ on: mode === 'dispatch' }" @tap="mode = 'dispatch'">
        <text class="mt">客服派单</text><text class="muted md">最快匹配，推荐</text>
      </view>
      <view class="choice mode" :class="{ on: mode === 'assign' }" @tap="mode = 'assign'">
        <text class="mt">指定护航</text><text class="muted md">选你想要的人</text>
      </view>
    </view>
    <view v-if="mode === 'assign'" class="escorts">
      <view class="lrow esc" v-for="e in escorts" :key="e.id" :class="{ on: escortId === e.id }" @tap="escortId = e.id">
        <view class="person">
          <view class="avatar">♛<view class="online"></view></view>
          <view class="pinfo">
            <text class="p-n ellipsis">{{ e.name }}</text>
            <text class="p-s ellipsis">{{ e.profile.rank || '—' }} · {{ e.rating ? '★ ' + e.rating : '新护航' }} · {{ e.done }} 单</text>
          </view>
        </view>
        <view class="row">
          <text class="info" @tap.stop="showProfile(e)">资料</text>
          <text class="radio">{{ escortId === e.id ? '◉' : '◯' }}</text>
        </view>
      </view>
      <text v-if="!escorts.length" class="muted none">暂时没有在线的护航，建议选择客服派单</text>
    </view>

    <!-- 下单信息 -->
    <view class="section"><text class="s-t">下单信息</text></view>
    <view class="field"><text class="f-l">游戏昵称 / ID</text><input class="f-in" v-model="gameId" placeholder="护航会按这个拉你进队" /></view>
    <view class="field"><text class="f-l">备注（选填）</text><input class="f-in" v-model="note" placeholder="如：晚上 9 点后" /></view>

    <!-- 优惠券 -->
    <view class="lrow" @tap="pickCoupon">
      <view><text class="l-t">优惠券</text><text class="l-s">{{ coupons.length ? coupons.length + ' 张可用' : '暂无可用，去领券' }}</text></view>
      <view class="row"><text :class="coupon ? 'cp-on' : 'muted'">{{ coupon ? coupon.name + ' −¥' + coupon.amount : '' }}</text><text class="chev">❯</text></view>
    </view>

    <!-- 支付方式 -->
    <view class="section"><text class="s-t">支付方式</text></view>
    <view class="grid2">
      <view class="choice mode" :class="{ on: payWith === 'wechat' }" @tap="payWith = 'wechat'">
        <text class="mt">微信支付</text><text class="muted md">推荐</text>
      </view>
      <view class="choice mode" :class="{ on: payWith === 'balance', off: !enough }" @tap="pickBalance">
        <text class="mt">余额支付</text><text class="muted md">{{ balance === null ? '登录后可用' : '余额 ¥' + balance + (enough ? '' : '，去充值 ›') }}</text>
      </view>
    </view>

    <!-- 底部下单栏 -->
    <view class="bar">
      <view class="bar-cs" @tap="goService"><text class="cs-i">♧</text><text>客服</text></view>
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
.page { padding-bottom: 200rpx; }
.top { margin-top: 0; letter-spacing: 2rpx; }
.chips { display: flex; flex-wrap: wrap; gap: 8rpx; }
.price-row { margin-top: 20rpx; align-items: baseline; }
.big { font-size: 52rpx; }
.unit { font-size: 22rpx; }
.spec { background: #E8EFFD; border: 2rpx solid #E8EFFD; border-radius: 24rpx; padding: 22rpx 0; display: flex; flex-direction: column; align-items: center; gap: 6rpx; color: #466AA9; }
.spec.on { background: linear-gradient(110deg, #4B73BA, #7CA1E5); color: #FFFFFF; }
.sp-n { font-size: 25rpx; font-weight: 700; }
.sp-p { font-size: 22rpx; }
.mode { display: flex; flex-direction: column; gap: 6rpx; }
.mode.off { opacity: 0.6; }
.mt { font-size: 27rpx; font-weight: 700; }
.md { font-size: 21rpx; }
.escorts { margin-top: 20rpx; }
.esc.on { border-color: #527AC3; background: #F0F5FF; }
.pinfo { min-width: 0; }
.avatar { position: relative; }
.online { position: absolute; right: -4rpx; bottom: -4rpx; width: 20rpx; height: 20rpx; border-radius: 50%; background: #28A88A; border: 4rpx solid #FFFFFF; }
.info { font-size: 22rpx; color: #4B72B8; padding: 6rpx 16rpx; }
.radio { color: #527AC3; font-size: 30rpx; }
.none { display: block; font-size: 23rpx; padding: 10rpx 4rpx; }
.cp-on { color: #CB5368; font-weight: 700; font-size: 24rpx; }
.save { font-size: 21rpx; }
.bar { position: fixed; left: 0; right: 0; bottom: 0; background: #FFFFFF; border-top: 2rpx solid #E0E9FA; display: flex; align-items: center; gap: 24rpx; padding: 16rpx 30rpx calc(16rpx + env(safe-area-inset-bottom)); z-index: 10; }
.bar-cs { display: flex; flex-direction: column; align-items: center; font-size: 20rpx; color: #8B9DBB; padding: 0 6rpx; }
.cs-i { font-size: 34rpx; color: #4B72B8; }
.bar-total { flex: 1; font-size: 24rpx; }
.bar-total .price { font-size: 38rpx; }
.buy { width: 260rpx; margin: 0; }
</style>
