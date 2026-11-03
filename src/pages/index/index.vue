<!--
  【老板】首页：搜索框、轮播图、公告、充值提示、分类入口和热门单子列表。
-->
<template>
  <view class="wrap">
    <RechargeTicker :list="recharges" />
    <view class="search" @tap="goCat('', true)">
      <text class="muted">搜索单子，如 保底单</text>
    </view>

    <view v-if="notice" class="notice"><text class="nt">公告</text><text class="ellipsis nx">{{ notice }}</text></view>

    <!-- 轮播图：在「管理后台 → 轮播图」里增删和排序 -->
    <view class="banner"><BannerSwiper :list="banners" /></view>

    <view class="card steps">
      <view class="step" v-for="(s, i) in steps" :key="s.t">
        <text class="n">{{ i + 1 }}</text>
        <text class="t">{{ s.t }}</text>
        <text class="muted d">{{ s.d }}</text>
      </view>
    </view>

    <view class="cats">
      <view class="cat" v-for="c in CATEGORIES" :key="c" @tap="goCat(c)">
        <view class="cat-ico">{{ c.slice(0, 1) }}</view>
        <text>{{ c }}</text>
      </view>
    </view>

    <view class="between sec">
      <text class="sec-title">热门单子</text>
      <text class="muted more" @tap="goCat('')">全部 ›</text>
    </view>
    <view class="card prod" v-for="p in list" :key="p.id" @tap="open(p.id)">
      <view class="cover pc">封面</view>
      <view class="pi">
        <text class="pn">{{ p.name }}</text>
        <text class="muted pd ellipsis">{{ p.desc }}</text>
        <view class="tags"><text class="tag" v-for="t in p.tags.slice(0, 2)" :key="t">{{ t }}</text></view>
        <view class="between">
          <text class="price pp">¥{{ p.price }}</text>
          <view class="btn sm" @tap.stop="open(p.id)">下单</view>
        </view>
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
import { session } from '@/store/session.js'
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
.search { height: 80rpx; background: #FFFFFF; border: 2rpx solid #DCE6F8; border-radius: 30rpx; padding: 0 30rpx; display: flex; align-items: center; font-size: 24rpx; }
.banner { margin-top: 24rpx; border-radius: 32rpx; overflow: hidden; box-shadow: 0 24rpx 68rpx rgba(40, 74, 132, 0.18); }
.notice { display: flex; align-items: center; gap: 16rpx; margin-top: 20rpx; padding: 20rpx 24rpx; background: #FFFFFF; border: 2rpx solid #DCE6F8; border-radius: 28rpx; font-size: 23rpx; color: #4F70A6; }
.nt { flex-shrink: 0; font-size: 20rpx; font-weight: 700; color: #FFFFFF; background: linear-gradient(110deg, #4B73BA, #7CA1E5); padding: 4rpx 12rpx; border-radius: 10rpx; }
.nx { flex: 1; min-width: 0; }
.steps { margin-top: 20rpx; display: flex; padding: 26rpx 0; }
.step { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8rpx; }
.step + .step { border-left: 2rpx solid #E7EEF9; }
.n { width: 52rpx; height: 52rpx; border-radius: 50%; background: #DCE9FF; color: #4E75B7; font-size: 24rpx; font-weight: 800; display: flex; align-items: center; justify-content: center; }
.t { font-size: 25rpx; font-weight: 700; }
.d { font-size: 21rpx; }
.cats { display: flex; gap: 16rpx; margin-top: 24rpx; }
.cat { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 12rpx; padding: 22rpx 0; font-size: 23rpx; font-weight: 700; background: linear-gradient(150deg, #FFFFFF, #E9F1FF); border: 2rpx solid #DCE6F8; border-radius: 28rpx; }
.cat-ico { width: 72rpx; height: 72rpx; border-radius: 24rpx; background: linear-gradient(130deg, #B3C9F3, #5176BA); color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 30rpx; font-weight: 800; }
.sec { margin: 40rpx 2rpx 18rpx; }
.more { font-size: 22rpx; }
.prod { display: flex; gap: 20rpx; padding: 24rpx; margin-bottom: 20rpx; }
.pc { width: 168rpx; height: 168rpx; border-radius: 24rpx; flex-shrink: 0; }
.pi { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: space-between; }
.pn { font-size: 29rpx; font-weight: 800; }
.pd { font-size: 22rpx; }
.tags { display: flex; gap: 8rpx; }
.pp { font-size: 38rpx; }
</style>
