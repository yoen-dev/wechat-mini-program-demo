<template>
  <!-- 自定义导航：留出状态栏和微信胶囊按钮的位置 -->
  <view class="sea-nav" :class="{ fixed }">
    <view :style="{ height: top + 'px' }"></view>
    <view class="row" :style="{ height: navH + 'px' }">
      <image v-if="back" class="btn" :src="`/static/icon/back${tone === 'light' ? '-light' : ''}.png`" @tap="goBack" />
      <text v-if="title" class="title serif" :class="tone">{{ title }}</text>
      <slot />
    </view>
  </view>
</template>

<script setup>
const props = defineProps({
  back: { type: Boolean, default: false },
  title: { type: String, default: '' },
  tone: { type: String, default: 'light' }, // light = 浅色图标（深色背景上）
  fixed: { type: Boolean, default: false }
})

const sys = uni.getSystemInfoSync()
const top = sys.statusBarHeight || 0
let navH = 44
// #ifdef MP-WEIXIN
const m = uni.getMenuButtonBoundingClientRect()
navH = (m.top - top) * 2 + m.height
// #endif

function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) uni.navigateBack()
  else uni.switchTab({ url: '/pages/index/index' })
}
</script>

<style scoped>
.sea-nav { position: relative; z-index: 10; }
.sea-nav.fixed { position: absolute; left: 0; right: 0; top: 0; }
.row { position: relative; display: flex; align-items: center; padding: 0 24rpx; }
.btn { width: 48rpx; height: 48rpx; padding: 12rpx; margin-left: -12rpx; }
.title { position: absolute; left: 0; right: 0; text-align: center; font-size: 34rpx; pointer-events: none; letter-spacing: 4rpx; }
.title.light { color: #F4ECDD; }
.title.dark { color: #1C2B4B; }
</style>
