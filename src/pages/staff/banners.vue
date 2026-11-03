<!--
  【管理员】首页轮播图管理：添加图片（最多 9 张）、改标题、调整顺序、删除。
-->
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
import { listBanners, addBanner, removeBanner, moveBanner, renameBanner, MAX_BANNERS } from '@api/banners.js'
import { session, guard } from '@/store/session.js'
import { run, toast, confirm, pickImage } from '@/utils.js'
import Empty from '@/components/Empty.vue'

// 列表数据
const list = ref([])
// 加载页面数据
async function load() {
  if (!guard(['admin'])) return
  list.value = (await run(listBanners())) || []
}
// 每次显示页面时刷新（从别的页面返回也会触发）
onShow(load)
// 选图上传并添加
async function addImg() {
  if (list.value.length >= MAX_BANNERS) return toast(`最多 ${MAX_BANNERS} 张`)
  const src = await pickImage()
  if (src && (await run(addBanner(session.user, { src })))) { toast('已添加', 'success'); load() }
}
// 删除
async function del(b) { if ((await confirm(`删除「${b.title}」？`)) && (await run(removeBanner(session.user, b.id)))) load() }
// 上移 / 下移
async function move(b, dir) { if (await run(moveBanner(session.user, b.id, dir))) load() }
// 改标题
function rename(b) {
  uni.showModal({
    title: '图片名称', editable: true, content: b.title, placeholderText: '仅后台显示，方便区分',
    success: async (r) => { if (r.confirm && (await run(renameBanner(session.user, b.id, r.content)))) load() }
  })
}
// 点图片全屏预览
const preview = (i) => uni.previewImage({ urls: list.value.map((x) => x.url), current: i })
</script>

<style scoped>
.add { margin-bottom: 16rpx; }
.note { display: block; font-size: 22rpx; margin: 0 8rpx 20rpx; line-height: 1.6; }
.brow { display: flex; gap: 20rpx; padding: 20rpx; margin-bottom: 16rpx; }
.bthumb { width: 240rpx; height: 100rpx; border-radius: 10rpx; background: #E4ECFA; flex-shrink: 0; }
.bt { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: space-between; gap: 12rpx; }
.pn { font-size: 28rpx; font-weight: 600; }
.bops { display: flex; gap: 10rpx; }
.bops .btn { padding: 0 18rpx; }
</style>
