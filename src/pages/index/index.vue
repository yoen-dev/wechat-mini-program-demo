<template>
  <view class="wrap">
    <view class="search">
      <input class="search-input" v-model="keyword" placeholder="搜索服务，如 保底单" confirm-type="search" @confirm="doSearch" />
      <view class="btn-primary search-btn" @tap="doSearch">搜索</view>
    </view>

    <view class="banner">
      <view class="banner-c1"></view>
      <view class="banner-c2"></view>
      <view class="banner-title">我们的服务承诺</view>
      <view class="banner-line">✓ 客服 24 小时在线</view>
      <view class="banner-line">✓ 不卡保底，装备全归老板</view>
      <view class="banner-line">✓ 售后不满意随时升级处理</view>
    </view>

    <view class="card quick">
      <view class="quick-item" v-for="q in quick" :key="q.label" @tap="q.action">
        <view class="quick-icon" :class="{ warn: q.warn }">
          <text class="quick-glyph">{{ q.glyph }}</text>
        </view>
        <text>{{ q.label }}</text>
      </view>
    </view>

    <view class="shops">
      <view class="shop shop-sale" @tap="goCat('特惠专区')">
        <text class="shop-name">特惠店</text>
        <text class="shop-sub">高性价比 · 新人首选</text>
      </view>
      <view class="shop shop-pro" @tap="goCat('导师单')">
        <text class="shop-name">明星店</text>
        <text class="shop-sub light">指定大神 · 品质护航</text>
      </view>
    </view>

    <view class="sec-head">
      <text class="sec-title">热门单子</text>
      <text class="sec-more" @tap="goCat('全部')">查看更多 ›</text>
    </view>

    <view class="grid">
      <view class="card prod" v-for="p in hot" :key="p.id" @tap="openDetail(p.id)">
        <view class="cover prod-cover">[封面图]</view>
        <view class="prod-body">
          <text class="prod-name">{{ p.name }}</text>
          <text class="muted prod-tag">{{ p.tag }}</text>
          <text class="price prod-price">¥{{ p.price }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { products, state } from '@/store/index.js'

const keyword = ref('')
const hot = products.slice(0, 4)

function goCat(cat, kw = '') {
  state.presetCat = cat
  state.keyword = kw
  uni.switchTab({ url: '/pages/category/category' })
}
function doSearch() {
  goCat('全部', keyword.value.trim())
}
function openDetail(id) {
  uni.navigateTo({ url: `/pages/detail/detail?id=${id}` })
}
const toast = (title) => uni.showToast({ title, icon: 'none' })

const quick = [
  { label: '联系客服', glyph: '☎', action: () => uni.switchTab({ url: '/pages/service/service' }) },
  { label: '参加考核', glyph: '✓', action: () => toast('护航考核：敬请期待') },
  { label: '下单必看', glyph: '≡', action: () => toast('下单须知：敬请期待') },
  { label: '投诉反馈', glyph: '!', warn: true, action: () => toast('投诉入口：敬请期待') }
]
</script>

<style scoped>
.wrap { padding: 24rpx 32rpx 40rpx; display: flex; flex-direction: column; gap: 32rpx; }
.search { display: flex; align-items: center; gap: 16rpx; height: 88rpx; padding: 0 12rpx 0 28rpx; background: #FFFFFF; border-radius: 44rpx; border: 2rpx solid #CFE0F7; }
.search-input { flex: 1; font-size: 28rpx; }
.search-btn { height: 64rpx; padding: 0 32rpx; font-size: 28rpx; }

.banner { position: relative; overflow: hidden; border-radius: 32rpx; background: #1A6FE0; color: #FFFFFF; padding: 36rpx; display: flex; flex-direction: column; gap: 12rpx; }
.banner-c1 { position: absolute; right: -60rpx; top: -60rpx; width: 320rpx; height: 320rpx; border-radius: 50%; background: #3D8BF0; }
.banner-c2 { position: absolute; right: 60rpx; bottom: -100rpx; width: 220rpx; height: 220rpx; border-radius: 50%; background: #1560C8; }
.banner-title { position: relative; font-size: 40rpx; font-weight: 800; margin-bottom: 8rpx; }
.banner-line { position: relative; font-size: 26rpx; }

.quick { display: flex; padding: 28rpx 12rpx; }
.quick-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 12rpx; font-size: 24rpx; }
.quick-icon { width: 88rpx; height: 88rpx; border-radius: 28rpx; background: #E3EEFF; display: flex; align-items: center; justify-content: center; }
.quick-icon.warn { background: #FFEFE3; }
.quick-glyph { font-size: 40rpx; font-weight: 700; color: #1A6FE0; }
.quick-icon.warn .quick-glyph { color: #D2600F; }

.shops { display: flex; gap: 20rpx; }
.shop { flex: 1; height: 128rpx; border-radius: 28rpx; padding: 0 28rpx; display: flex; flex-direction: column; justify-content: center; box-sizing: border-box; }
.shop-sale { background: #FFFFFF; border: 3rpx solid #1A6FE0; }
.shop-sale .shop-name { color: #1A6FE0; }
.shop-pro { background: #12233D; color: #FFFFFF; }
.shop-name { font-size: 32rpx; font-weight: 700; }
.shop-sub { font-size: 24rpx; color: #4A5D7A; }
.shop-sub.light { color: #B9C7DC; }

.sec-head { display: flex; align-items: center; justify-content: space-between; }
.sec-title { font-size: 34rpx; font-weight: 700; }
.sec-more { font-size: 26rpx; color: #1A6FE0; }

.grid { display: flex; flex-wrap: wrap; gap: 20rpx; }
.prod { width: calc(50% - 10rpx); border-radius: 28rpx; overflow: hidden; display: flex; flex-direction: column; }
.prod-cover { height: 192rpx; }
.prod-body { padding: 20rpx; display: flex; flex-direction: column; gap: 8rpx; }
.prod-name { font-size: 28rpx; font-weight: 600; }
.prod-tag { font-size: 22rpx; }
.prod-price { font-size: 36rpx; }
</style>
