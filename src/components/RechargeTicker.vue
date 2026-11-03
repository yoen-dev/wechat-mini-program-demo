<!--
  首页「某某刚刚充值」轮播提示：只显示后台真实的充值记录（最近 48 小时、名字打码），可在「管理后台 → 储值设置」关闭。
-->
<template>
  <!-- 首页「刚刚充值」提示：真实充值记录轮流滑出，名字已打码 -->
  <view v-if="cur" class="ticker" :class="{ show: visible }">
    <view class="av">{{ cur.name.slice(0, 1) }}</view>
    <text class="tx">{{ cur.name }} {{ ago(cur.t) }}充值了 <text class="amt">¥{{ cur.pay }}</text><text v-if="cur.bonus" class="bonus"> 送 ¥{{ cur.bonus }}</text></text>
  </view>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({ list: { type: Array, default: () => [] } })
// 当前显示第几条
const cur = ref(null)
// 是否显示提示条
const visible = ref(false)
let i = 0
let timer = null

const SHOW = 3500 // 每条显示时长
const GAP = 1800 // 两条之间的间隔
const REST = 12000 // 一轮放完后休息多久

// 把时间转成「3 分钟前」这种文字
function ago(t) {
  const m = Math.floor((Date.now() - t) / 60000)
  if (m < 2) return '刚刚'
  if (m < 60) return `${m} 分钟前`
  const h = Math.floor(m / 60)
  return h < 24 ? `${h} 小时前` : '昨天'
}

// 切到下一条：显示几秒 → 隐藏 → 再显示下一条
function next() {
  clearTimeout(timer)
  if (!props.list.length) { visible.value = false; return }
  if (i >= props.list.length) { i = 0; timer = setTimeout(next, REST); return }
  cur.value = props.list[i++]
  visible.value = true
  timer = setTimeout(() => {
    visible.value = false
    timer = setTimeout(next, GAP)
  }, SHOW)
}

watch(() => props.list.map((x) => x.id).join(','), () => { i = 0; next() })
// 组件显示后开始轮播
onMounted(() => { timer = setTimeout(next, 800) })
// 离开页面时清掉定时器
onUnmounted(() => clearTimeout(timer))
</script>

<style scoped>
.ticker {
  position: fixed; left: 24rpx; top: calc(var(--window-top, 0px) + 190rpx); z-index: 50;
  display: flex; align-items: center; gap: 12rpx; max-width: 80%;
  padding: 6rpx 22rpx 6rpx 6rpx; border-radius: 40rpx; background: rgba(31, 31, 31, 0.86); color: #FFFFFF;
  font-size: 24rpx; box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.18);
  opacity: 0; transform: translateX(-40rpx); transition: opacity 0.35s, transform 0.35s; pointer-events: none;
}
.ticker.show { opacity: 1; transform: translateX(0); }
.av { width: 40rpx; height: 40rpx; border-radius: 50%; background: #FFFFFF; color: #1F1F1F; font-size: 22rpx; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.tx { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.amt { font-weight: 700; color: #FFD666; }
.bonus { color: #FFD666; }
</style>
