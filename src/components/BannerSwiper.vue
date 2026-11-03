<!--
  首页轮播图组件：左右滑动切换、底部小圆点显示第几张，点击放大查看。图片由管理员在「管理后台 → 首页轮播图」上传。
-->
<template>
  <!-- 首页轮播图：左右滑切换、圆点显示第几张、点击全屏查看（可双指缩放，再点一下退出） -->
  <view v-if="list.length" class="bs">
    <swiper class="sw" :current="current" circular :autoplay="list.length > 1" :interval="4000" :duration="400" @change="onChange" @transition="onMove" @animationfinish="onStop">
      <swiper-item v-for="(b, i) in list" :key="b.id">
        <image class="img" :src="b.url" mode="aspectFill" @tap="preview(i)" />
      </swiper-item>
    </swiper>
    <view v-if="list.length > 1" class="dots">
      <view v-for="(b, i) in list" :key="b.id" class="dot" :class="{ on: i === current }"></view>
    </view>
  </view>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({ list: { type: Array, default: () => [] } })
// 当前显示第几张
const current = ref(0)
watch(() => props.list.length, (n) => { if (current.value >= n) current.value = 0 })

// 滑动过程中的点击不算“点击放大”
let lastMove = 0
// 开始滑动时记下时间，滑动过程中的点击不触发放大
const onMove = () => { lastMove = Date.now() }
// 滑动结束时间
const onStop = () => { lastMove = Date.now() }
// 切换到下一张时更新小圆点
const onChange = (e) => { current.value = e.detail.current; lastMove = Date.now() }
// 点击放大查看（刚滑动完 350ms 内的点击忽略，避免电脑上拖动误触）
function preview(i) {
  if (Date.now() - lastMove < 350) return
  uni.previewImage({ urls: props.list.map((b) => b.url), current: i, indicator: 'number', loop: true })
}
</script>

<style scoped>
/* 推荐图片尺寸 1080 × 450（约 2.4 : 1），其他比例会居中裁切 */
.bs { position: relative; border-radius: 20rpx; overflow: hidden; background: #E4ECFA; transform: translateZ(0); }
.sw { width: 100%; height: 286rpx; }
.img { width: 100%; height: 100%; display: block; }
.dots { position: absolute; left: 0; right: 0; bottom: 16rpx; display: flex; justify-content: center; gap: 10rpx; pointer-events: none; }
.dot { width: 12rpx; height: 12rpx; border-radius: 6rpx; background: rgba(255, 255, 255, 0.5); box-shadow: 0 0 4rpx rgba(0, 0, 0, 0.25); transition: width 0.25s; }
.dot.on { width: 32rpx; background: #FFFFFF; }
</style>
