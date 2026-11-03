<template>
  <view class="wrap">
    <view class="btn add" @tap="edit()">＋ 新建单子</view>
    <view class="card prow" v-for="p in list" :key="p.id">
      <view class="pt">
        <view class="row"><text class="pn">{{ p.name }}</text><text class="tag off" v-if="!p.onSale">已下架</text></view>
        <text class="muted pm">¥{{ p.price }} · {{ p.cats.join(' / ') || '未分类' }}</text>
      </view>
      <view class="btn sm ghost" @tap="toggle(p)">{{ p.onSale ? '下架' : '上架' }}</view>
      <view class="btn sm" @tap="edit(p.id)">编辑</view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { listProducts, toggleSale } from '@api/products.js'
import { session, guard } from '@/store/session.js'
import { run, toast } from '@/utils.js'

const list = ref([])
async function load() {
  if (!guard(['admin'])) return
  list.value = (await run(listProducts({ includeOff: true }))) || []
}
onShow(load)
const edit = (id) => uni.navigateTo({ url: '/pages/staff/product-edit' + (id ? `?id=${id}` : '') })
async function toggle(p) { if (await run(toggleSale(session.user, p.id))) { toast(p.onSale ? '已下架' : '已上架'); load() } }
</script>

<style scoped>
.add { margin-bottom: 20rpx; }
.prow { display: flex; align-items: center; gap: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.pt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6rpx; }
.pt .row { gap: 10rpx; }
.pn { font-size: 28rpx; font-weight: 600; }
.pm { font-size: 22rpx; }
.off { background: #FFF1F0; color: #CF1322; }
</style>
