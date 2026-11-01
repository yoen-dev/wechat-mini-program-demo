<template>
  <view class="page">
    <view class="top">
      <view class="search">
        <input class="search-input" v-model="keyword" placeholder="搜索服务" confirm-type="search" />
        <view v-if="keyword" class="clear" @tap="keyword = ''">×</view>
      </view>
    </view>

    <view class="body">
      <scroll-view scroll-y class="side">
        <view v-for="c in categories" :key="c" class="side-item" :class="{ on: c === picked }" @tap="picked = c">{{ c }}</view>
      </scroll-view>

      <scroll-view scroll-y class="list">
        <view class="muted count">{{ picked }} · 共 {{ list.length }} 个单子</view>
        <view class="card item" v-for="p in list" :key="p.id" @tap="openDetail(p.id)">
          <view class="cover item-cover">[封面]</view>
          <view class="item-body">
            <text class="item-name">{{ p.name }}</text>
            <text class="muted item-desc ellipsis">{{ p.desc }}</text>
            <view class="item-foot">
              <text class="price item-price">¥{{ p.price }}</text>
              <text class="tag">{{ p.tag }}</text>
            </view>
          </view>
        </view>
        <view v-if="!list.length" class="muted empty">没有找到相关单子</view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { categories, products, state } from '@/store/index.js'

const picked = ref('全部')
const keyword = ref('')

onShow(() => {
  picked.value = state.presetCat || '全部'
  keyword.value = state.keyword || ''
  state.presetCat = '全部'
  state.keyword = ''
})

const list = computed(() =>
  products.filter((p) => (picked.value === '全部' || p.cats.includes(picked.value)) && (!keyword.value || p.name.includes(keyword.value) || p.desc.includes(keyword.value)))
)

function openDetail(id) {
  uni.navigateTo({ url: `/pages/detail/detail?id=${id}` })
}
</script>

<style scoped>
.page { height: calc(100vh - var(--window-top) - var(--window-bottom)); display: flex; flex-direction: column; }
.top { padding: 24rpx 32rpx; }
.search { display: flex; align-items: center; height: 88rpx; padding: 0 28rpx; background: #FFFFFF; border-radius: 44rpx; border: 2rpx solid #CFE0F7; }
.search-input { flex: 1; font-size: 28rpx; }
.clear { width: 48rpx; text-align: center; font-size: 36rpx; color: #4A5D7A; }
.body { flex: 1; display: flex; min-height: 0; }
.side { width: 192rpx; height: 100%; padding: 0 16rpx 0 32rpx; box-sizing: border-box; }
.side-item { height: 88rpx; margin-bottom: 12rpx; border-radius: 24rpx; background: #FFFFFF; font-size: 26rpx; display: flex; align-items: center; justify-content: center; }
.side-item.on { background: #1A6FE0; color: #FFFFFF; font-weight: 700; }
.list { flex: 1; height: 100%; padding: 0 32rpx 32rpx 8rpx; box-sizing: border-box; }
.count { font-size: 26rpx; margin-bottom: 20rpx; }
.item { padding: 20rpx; margin-bottom: 20rpx; border-radius: 28rpx; display: flex; gap: 20rpx; }
.item-cover { width: 152rpx; height: 152rpx; border-radius: 20rpx; flex-shrink: 0; }
.item-body { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: space-between; }
.item-name { font-size: 28rpx; font-weight: 700; }
.item-desc { font-size: 24rpx; }
.item-foot { display: flex; align-items: center; justify-content: space-between; }
.item-price { font-size: 34rpx; }
.empty { text-align: center; padding-top: 120rpx; }
</style>
