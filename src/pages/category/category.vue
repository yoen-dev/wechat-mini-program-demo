<!--
  【老板】分类页：顶部搜索、横向分类标签，下面是该分类的单子。
-->
<template>
  <view class="wrap">
    <view class="hdr"><view><text class="hdr-t">选择服务</text><text class="hdr-s">挑选适合你的护航方案</text></view></view>

    <!-- 搜索：按名称或简介筛选 -->
    <view class="search"><text class="s-ico">⌕</text><input class="s-in" v-model="keyword" :focus="focus" placeholder="搜索单子名称 / 地图" confirm-type="search" /></view>

    <!-- 分类标签（可左右滑） -->
    <scroll-view scroll-x class="tabsline" :show-scrollbar="false">
      <view v-for="c in cats" :key="c" class="tb" :class="{ on: c === picked }" @tap="picked = c">{{ c || '全部' }}</view>
    </scroll-view>

    <view class="card item" v-for="p in shown" :key="p.id" @tap="open(p.id)">
      <view class="ii">
        <view class="chips"><text class="chip" v-for="c in p.cats.slice(0, 2)" :key="c">{{ c }}</text></view>
        <text class="in">{{ p.name }}</text>
        <text class="card-p idesc">{{ p.desc }}</text>
      </view>
      <view class="ir">
        <text class="price ip">¥{{ p.price }}<text class="qi"> 起</text></text>
        <view class="btn sm" @tap.stop="open(p.id)">查看详情</view>
      </view>
    </view>
    <Empty v-if="!shown.length" text="没有找到相关单子" />
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { listProducts, CATEGORIES } from '@api/products.js'
import { run } from '@/utils.js'
import Empty from '@/components/Empty.vue'

const cats = ['', ...CATEGORIES]
// 全部单子
const all = ref([])
// 当前选中的分类
const picked = ref('')
// 搜索关键词
const keyword = ref('')
// 是否自动聚焦搜索框（从首页搜索框跳过来时）
const focus = ref(false)

// 每次显示页面时刷新（从别的页面返回也会触发）
onShow(async () => {
  const g = getApp().globalData
  if (g.presetCat !== undefined) { picked.value = g.presetCat; focus.value = !!g.focusSearch; delete g.presetCat; delete g.focusSearch }
  all.value = (await run(listProducts())) || []
})

// 按分类和关键词筛选后的单子
const shown = computed(() => all.value.filter((p) =>
  (!picked.value || p.cats.includes(picked.value)) && (!keyword.value || p.name.includes(keyword.value) || p.desc.includes(keyword.value))))
// 进入单子详情页下单
const open = (id) => uni.navigateTo({ url: `/pages/detail/detail?id=${id}` })
</script>

<style scoped>
.search { height: 84rpx; background: #FFFFFF; border: 2rpx solid #DCE6F8; border-radius: 30rpx; padding: 0 28rpx; display: flex; align-items: center; gap: 12rpx; margin-bottom: 22rpx; }
.s-ico { font-size: 30rpx; color: #97A7BF; }
.s-in { flex: 1; font-size: 25rpx; color: #284674; }
.item { display: flex; align-items: flex-end; gap: 20rpx; padding: 28rpx; margin-bottom: 20rpx; }
.ii { flex: 1; min-width: 0; }
.chips { display: flex; gap: 8rpx; }
.in { display: block; font-size: 29rpx; font-weight: 800; margin: 14rpx 0 6rpx; }
.idesc { overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.ir { flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 16rpx; }
.ip { font-size: 40rpx; }
.qi { font-size: 20rpx; color: #9AA9BF; font-weight: 400; }
</style>
