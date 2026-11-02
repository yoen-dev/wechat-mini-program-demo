<template>
  <view class="wrap">
    <view class="btn add" :class="{ disabled: list.length >= MAX_BANNERS }" @tap="addImg">＋ 添加图片（{{ list.length }}/{{ MAX_BANNERS }}）</view>
    <text class="muted note">显示在老板首页搜索框下方，按这里的顺序轮播。推荐尺寸 1080 × 450，其他比例会居中裁切。点名称可以改名。</text>
    <view class="card brow" v-for="(b, i) in list" :key="b.id">
      <image class="bthumb" :src="b.url" mode="aspectFill" @tap="preview(i)" />
      <view class="bt">
        <text class="pn ellipsis" @tap="rename(b)">{{ i + 1 }}. {{ b.title }}</text>
        <view class="bops">
          <view class="btn sm ghost" :class="{ disabled: i === 0 }" @tap="move(b, -1)">上移</view>
          <view class="btn sm ghost" :class="{ disabled: i === list.length - 1 }" @tap="move(b, 1)">下移</view>
          <view class="btn sm danger" @tap="del(b)">删除</view>
        </view>
      </view>
    </view>
    <Empty v-if="!list.length" text="还没有图片，首页将不显示轮播" />
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { listBanners, addBanner, removeBanner, moveBanner, renameBanner, MAX_BANNERS } from '@/api/banners.js'
import { session, guard } from '@/store/session.js'
import { run, toast, confirm, pickImage } from '@/utils.js'
import Empty from '@/components/Empty.vue'

const list = ref([])
async function load() {
  if (!guard(['admin'])) return
  list.value = (await run(listBanners())) || []
}
onShow(load)
async function addImg() {
  if (list.value.length >= MAX_BANNERS) return toast(`最多 ${MAX_BANNERS} 张`)
  const src = await pickImage()
  if (src && (await run(addBanner(session.user, { src })))) { toast('已添加', 'success'); load() }
}
async function del(b) { if ((await confirm(`删除「${b.title}」？`)) && (await run(removeBanner(session.user, b.id)))) load() }
async function move(b, dir) { if (await run(moveBanner(session.user, b.id, dir))) load() }
function rename(b) {
  uni.showModal({
    title: '图片名称', editable: true, content: b.title, placeholderText: '仅后台显示，方便区分',
    success: async (r) => { if (r.confirm && (await run(renameBanner(session.user, b.id, r.content)))) load() }
  })
}
const preview = (i) => uni.previewImage({ urls: list.value.map((x) => x.url), current: i })
</script>

<style scoped>
.add { margin-bottom: 16rpx; }
.note { display: block; font-size: 22rpx; margin: 0 8rpx 20rpx; line-height: 1.6; }
.brow { display: flex; gap: 20rpx; padding: 20rpx; margin-bottom: 16rpx; }
.bthumb { width: 240rpx; height: 100rpx; border-radius: 10rpx; background: #E8E8E8; flex-shrink: 0; }
.bt { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: space-between; gap: 12rpx; }
.pn { font-size: 28rpx; font-weight: 600; }
.bops { display: flex; gap: 10rpx; }
.bops .btn { padding: 0 18rpx; }
</style>
