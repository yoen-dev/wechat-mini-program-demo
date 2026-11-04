<!--
  【老板】首页：搜索框、轮播图、公告、充值提示、分类入口和热门单子列表。
-->
<template>
  <view class="wrap">
    <!-- 「某某刚刚充值」提示（悬浮在页面左上方） -->
    <RechargeTicker :list="recharges" />

    <!-- 搜索框：点了跳到分类页并自动聚焦搜索 -->
    <view class="search" @tap="goCat('', true)">
      <text class="s-ico">⌕</text><text>搜索单子，如 保底单</text>
    </view>

    <!-- 轮播图（首页大图）：在「管理后台 → 轮播图」里增删和排序 -->
    <view class="hero"><BannerSwiper :list="banners" /></view>

    <!-- 热门服务：按分类进入 -->
    <view class="section"><text class="s-t">热门服务</text><text class="s-more" @tap="goCat('')">查看全部 ❯</text></view>
    <view class="grid2">
      <view class="tile" v-for="c in CATEGORIES" :key="c" @tap="goCat(c)">
        <text class="ico">{{ ICONS[c] || c.slice(0, 1) }}</text>
        <text class="tt">{{ c }}</text>
        <text class="ts">立即查看 ❯</text>
      </view>
    </view>

    <!-- 快捷入口 -->
    <view class="section"><text class="s-t">快捷入口</text></view>
    <view class="grid4">
      <view class="tile mini" v-for="q in quick" :key="q.t" @tap="q.go">
        <text class="ico">{{ q.i }}</text>
        <text class="tt">{{ q.t }}</text>
      </view>
    </view>

    <!-- 下单三步 -->
    <view class="section"><text class="s-t">下单流程</text></view>
    <view class="card steps">
      <view class="step" v-for="(s, i) in steps" :key="s.t">
        <text class="n">{{ i + 1 }}</text>
        <text class="t">{{ s.t }}</text>
        <text class="muted d">{{ s.d }}</text>
      </view>
    </view>

    <!-- 公告：在「管理后台 → 公告与问答」修改 -->
    <view v-if="notice" class="notice-bar notice"><text class="nt chip">公告</text><text class="ellipsis nx">{{ notice }}</text></view>

    <!-- 单子列表 -->
    <view class="section"><text class="s-t">人气单子</text><text class="s-more" @tap="goCat('')">全部 ❯</text></view>
    <view class="card prod" v-for="p in list" :key="p.id" @tap="open(p.id)">
      <view class="pi">
        <view class="chips"><text class="chip" v-for="c in p.cats.slice(0, 1)" :key="c">{{ c }}</text><text class="chip green" v-for="t in p.tags.slice(0, 2)" :key="t">{{ t }}</text></view>
        <text class="pn">{{ p.name }}</text>
        <text class="card-p pd">{{ p.desc }}</text>
      </view>
      <view class="pr">
        <text class="price pp">¥{{ p.price }}<text class="qi"> 起</text></text>
        <view class="btn sm" @tap.stop="open(p.id)">下单</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { listProducts, CATEGORIES } from '@api/products.js'
import { listBanners } from '@api/banners.js'
import { getSettings } from '@api/finance.js'
import BannerSwiper from '@/components/BannerSwiper.vue'
import RechargeTicker from '@/components/RechargeTicker.vue'
import { recentRecharges } from '@api/wallet.js'
import { session, needUserLogin } from '@/store/session.js'
import { run } from '@/utils.js'

// 单子列表
const list = ref([])
// 轮播图
const banners = ref([])
// 公告
const notice = ref('')
// 最近的真实充值记录（首页提示用）
const recharges = ref([])
const steps = [{ t: '选单子', d: '保底 / 清图' }, { t: '填 ID 付款', d: '派单或指定' }, { t: '进队开打', d: '护航拉你' }]
// 分类图标
const ICONS = { 保底单: '保', 清图单: '清', 特惠: '惠', 明星护航: '星' }
// 快捷入口（都是已有页面）
const quick = [
  { i: '券', t: '领券中心', go: () => needUserLogin() && uni.navigateTo({ url: '/pages/user/coupons' }) },
  { i: '护', t: '成为护航', go: () => needUserLogin() && uni.navigateTo({ url: '/pages/user/apply' }) },
  { i: '客', t: '客服中心', go: () => uni.switchTab({ url: '/pages/service/service' }) },
  { i: '单', t: '我的订单', go: () => uni.switchTab({ url: '/pages/orders/orders' }) }
]

// 每次显示页面时刷新（从别的页面返回也会触发）
onShow(async () => {
  // 员工误入用户端时送回工作台
  if (session.user && session.user.role !== 'user') return uni.reLaunch({ url: `/pages/staff/${session.user.role}` })
  banners.value = (await run(listBanners())) || []
  const st = await run(getSettings())
  notice.value = st ? st.notice : ''
  list.value = (await run(listProducts())) || []
  recharges.value = (await run(recentRecharges())) || []
})

// 点分类入口：记下分类再切到分类页
function goCat(cat, focus = false) {
  const g = getApp().globalData
  g.presetCat = cat
  g.focusSearch = focus
  uni.switchTab({ url: '/pages/category/category' })
}
// 进入单子详情页
const open = (id) => uni.navigateTo({ url: `/pages/detail/detail?id=${id}` })
</script>

<style scoped>
.search { height: 84rpx; background: #FFFFFF; border: 2rpx solid #DCE6F8; border-radius: 30rpx; padding: 0 30rpx; display: flex; align-items: center; gap: 12rpx; font-size: 24rpx; color: #97A7BF; }
.s-ico { font-size: 30rpx; }
.hero { margin-top: 24rpx; border-radius: 40rpx; overflow: hidden; box-shadow: 0 24rpx 68rpx rgba(40, 74, 132, 0.2); }
.hero :deep(.sw) { height: 288rpx; } /* 690rpx 宽 ÷ 2.4 = 推荐图片比例 1080×450 */
.steps { display: flex; padding: 28rpx 0; }
.step { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8rpx; }
.step + .step { border-left: 2rpx solid #E7EEF9; }
.n { width: 54rpx; height: 54rpx; border-radius: 50%; background: #DCE9FF; color: #4E75B7; font-size: 24rpx; font-weight: 800; display: flex; align-items: center; justify-content: center; }
.t { font-size: 25rpx; font-weight: 700; }
.d { font-size: 20rpx; }
.notice { display: flex; align-items: center; gap: 12rpx; margin-top: 26rpx; }
.nt { flex-shrink: 0; }
.nx { flex: 1; min-width: 0; }
.prod { display: flex; align-items: flex-end; gap: 20rpx; padding: 28rpx; margin-bottom: 20rpx; }
.pi { flex: 1; min-width: 0; }
.chips { display: flex; flex-wrap: wrap; gap: 8rpx; }
.pn { display: block; font-size: 30rpx; font-weight: 800; margin: 14rpx 0 6rpx; }
.pd { overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.pr { flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 16rpx; }
.pp { font-size: 40rpx; }
.qi { font-size: 20rpx; color: #9AA9BF; font-weight: 400; }
</style>
