<template>
  <view class="wrap">
    <view class="search" @tap="goCat('', true)">
      <text class="muted">搜索单子，如 保底单</text>
    </view>

    <view class="card banner">
      <text class="b-title">三角洲护航 · 稳定出金</text>
      <view class="promise">
        <text>24h 客服</text><text>·</text><text>不卡保底</text><text>·</text><text>售后随时升级</text>
      </view>
    </view>

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
import { listProducts, CATEGORIES } from '@/api/products.js'
import { session } from '@/store/session.js'
import { run } from '@/utils.js'

const list = ref([])
const steps = [{ t: '选单子', d: '保底 / 清图' }, { t: '填 ID 付款', d: '派单或指定' }, { t: '进队开打', d: '护航拉你' }]

onShow(async () => {
  // 员工误入用户端时送回工作台
  if (session.user && session.user.role !== 'user') return uni.reLaunch({ url: `/pages/staff/${session.user.role}` })
  list.value = (await run(listProducts())) || []
})

function goCat(cat, focus = false) {
  const g = getApp().globalData
  g.presetCat = cat
  g.focusSearch = focus
  uni.switchTab({ url: '/pages/category/category' })
}
const open = (id) => uni.navigateTo({ url: `/pages/detail/detail?id=${id}` })
</script>

<style scoped>
.search { height: 76rpx; background: #FFFFFF; border-radius: 38rpx; padding: 0 32rpx; display: flex; align-items: center; font-size: 26rpx; }
.banner { margin-top: 24rpx; padding: 36rpx 32rpx; background: #1F1F1F; color: #FFFFFF; }
.b-title { font-size: 38rpx; font-weight: 700; }
.promise { display: flex; gap: 12rpx; margin-top: 16rpx; font-size: 24rpx; color: #BFBFBF; }
.steps { margin-top: 20rpx; display: flex; padding: 24rpx 0; }
.step { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6rpx; }
.step + .step { border-left: 2rpx solid #F0F0F0; }
.n { width: 40rpx; height: 40rpx; border-radius: 50%; background: #1F1F1F; color: #FFFFFF; font-size: 22rpx; display: flex; align-items: center; justify-content: center; }
.t { font-size: 26rpx; font-weight: 600; }
.d { font-size: 22rpx; }
.cats { display: flex; margin-top: 28rpx; }
.cat { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 10rpx; font-size: 24rpx; }
.cat-ico { width: 88rpx; height: 88rpx; border-radius: 24rpx; background: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 32rpx; font-weight: 700; }
.sec { margin: 36rpx 0 16rpx; }
.more { font-size: 24rpx; }
.prod { display: flex; gap: 20rpx; padding: 20rpx; margin-bottom: 20rpx; }
.pc { width: 176rpx; height: 176rpx; border-radius: 12rpx; flex-shrink: 0; }
.pi { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: space-between; }
.pn { font-size: 30rpx; font-weight: 600; }
.pd { font-size: 24rpx; }
.tags { display: flex; gap: 8rpx; }
.pp { font-size: 36rpx; }
</style>
