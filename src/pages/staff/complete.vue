<!--
  【护航】提交完成：上传战绩截图（至少 1 张）和说明，提交后等老板确认。
-->
<template>
  <view v-if="o" class="wrap">
    <view class="card block">
      <text class="name">{{ o.productName }} · ¥{{ o.amount }}</text>
      <text class="muted sub">#{{ o.id }} · 老板 {{ o.userName }} · 游戏 ID {{ o.gameId }}</text>
    </view>

    <view class="card block">
      <text class="sec-title">战绩截图（必填，最多 3 张）</text>
      <text class="muted hint">截图要能看出撤离结果和收益，老板会根据截图确认完成；有纠纷时也以截图为准</text>
      <view class="imgs">
        <view class="img-box" v-for="(p, i) in proofs" :key="i">
          <image class="img" :src="p" mode="aspectFill" @tap="preview(i)" />
          <view class="del" @tap="proofs.splice(i, 1)">×</view>
        </view>
        <view v-if="proofs.length < 3" class="img-box add" @tap="add">＋<text class="add-t">添加</text></view>
      </view>
    </view>

    <view class="card block">
      <text class="sec-title">给老板的说明（选填）</text>
      <textarea class="input area" v-model="note" placeholder="如：保底已打满 1000 万，两局都撤离成功" auto-height />
    </view>

    <button class="btn submit" :loading="busy" @tap="submit">提交完成，等待老板确认</button>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getOrder, submitComplete } from '@api/orders.js'
import { session, guard } from '@/store/session.js'
import { run, toast, pickImage } from '@/utils.js'

// 订单信息
const o = ref(null)
// 已上传的截图地址
const proofs = ref([])
// 护航说明
const note = ref('')
// 提交中，防止重复点击
const busy = ref(false)

// 页面打开时读取网址参数并加载数据
onLoad(async (q) => {
  if (!guard(['escort'])) return
  o.value = await run(getOrder(session.user, q.id))
})
// 选一张截图上传
async function add() {
  const src = await pickImage(900)
  if (src) proofs.value.push(src)
}
// 点图片全屏预览
const preview = (i) => uni.previewImage({ urls: proofs.value, current: i })
// 提交完成
async function submit() {
  if (!proofs.value.length) return toast('请至少上传 1 张战绩截图')
  busy.value = true
  const r = await run(submitComplete(session.user, o.value.id, { proofs: proofs.value, note: note.value }))
  busy.value = false
  if (!r) return
  toast('已提交，等待老板确认', 'success')
  setTimeout(() => uni.navigateBack(), 600)
}
</script>

<style scoped>
.block { padding: 28rpx; margin-bottom: 20rpx; }
.name { display: block; font-size: 30rpx; font-weight: 700; }
.sub { display: block; font-size: 22rpx; margin-top: 8rpx; }
.hint { display: block; font-size: 22rpx; margin: 8rpx 0 20rpx; line-height: 1.5; }
.imgs { display: flex; gap: 16rpx; }
.img-box { position: relative; width: 196rpx; height: 196rpx; border-radius: 12rpx; overflow: hidden; background: #F5F5F5; }
.img { width: 100%; height: 100%; }
.del { position: absolute; right: 0; top: 0; width: 44rpx; height: 44rpx; background: rgba(0, 0, 0, 0.6); color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 30rpx; }
.add { display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 48rpx; color: #8C8C8C; border: 2rpx dashed #D9D9D9; box-sizing: border-box; }
.add-t { font-size: 22rpx; }
.area { height: auto; min-height: 140rpx; padding: 20rpx 24rpx; margin-top: 16rpx; }
.submit { margin-top: 12rpx; }
</style>
