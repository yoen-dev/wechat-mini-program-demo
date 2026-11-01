<template>
  <view class="page">
    <view class="top">
      <input class="search" v-model="keyword" :focus="focus" placeholder="搜索单子" confirm-type="search" />
    </view>
    <view class="body">
      <scroll-view scroll-y class="side">
        <view class="side-inner">
          <view v-for="c in cats" :key="c" class="side-item" :class="{ on: c === picked }" @tap="picked = c">{{ c || '全部' }}</view>
        </view>
      </scroll-view>
      <scroll-view scroll-y class="list">
        <view class="list-inner">
          <view class="card item" v-for="p in shown" :key="p.id" @tap="open(p.id)">
            <view class="cover ic">封面</view>
            <view class="ii">
              <text class="in">{{ p.name }}</text>
              <text class="muted idesc ellipsis">{{ p.desc }}</text>
              <view class="between"><text class="price ip">¥{{ p.price }}</text><view class="btn sm" @tap.stop="open(p.id)">下单</view></view>
            </view>
          </view>
          <Empty v-if="!shown.length" text="没有找到相关单子" />
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { listProducts, CATEGORIES } from '@/api/products.js'
import { run } from '@/utils.js'
import Empty from '@/components/Empty.vue'

const cats = ['', ...CATEGORIES]
const all = ref([])
const picked = ref('')
const keyword = ref('')
const focus = ref(false)

onShow(async () => {
  const g = getApp().globalData
  if (g.presetCat !== undefined) { picked.value = g.presetCat; focus.value = !!g.focusSearch; delete g.presetCat; delete g.focusSearch }
  all.value = (await run(listProducts())) || []
})

const shown = computed(() => all.value.filter((p) =>
  (!picked.value || p.cats.includes(picked.value)) && (!keyword.value || p.name.includes(keyword.value) || p.desc.includes(keyword.value))))
const open = (id) => uni.navigateTo({ url: `/pages/detail/detail?id=${id}` })
</script>

<style scoped>
.page { height: calc(100vh - var(--window-top) - var(--window-bottom)); display: flex; flex-direction: column; }
.top { padding: 20rpx 32rpx; background: #FFFFFF; }
.search { height: 72rpx; background: #F5F5F5; border-radius: 36rpx; padding: 0 28rpx; font-size: 26rpx; }
.body { flex: 1; display: flex; min-height: 0; }
.side { flex: 0 0 180rpx; width: 180rpx; height: 100%; background: #FFFFFF; }
.side-item { height: 96rpx; display: flex; align-items: center; justify-content: center; font-size: 26rpx; color: #595959; white-space: nowrap; }
.side-item.on { background: #F5F5F5; color: #1F1F1F; font-weight: 700; border-left: 6rpx solid #1F1F1F; }
.list { flex: 1; width: 0; height: 100%; }
.list-inner { padding: 20rpx 24rpx 40rpx; }
.item { display: flex; gap: 16rpx; padding: 16rpx; margin-bottom: 16rpx; }
.ic { width: 140rpx; height: 140rpx; border-radius: 12rpx; flex-shrink: 0; }
.ii { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: space-between; }
.in { font-size: 28rpx; font-weight: 600; }
.idesc { font-size: 22rpx; }
.ip { font-size: 32rpx; }
</style>
