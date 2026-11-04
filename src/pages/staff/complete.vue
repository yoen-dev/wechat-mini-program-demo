<!--
  【护航】提交完成：上传战绩截图（至少 1 张）和说明，提交后等老板确认。
-->
<template>
  <view v-if="o" class="wrap">
    <view class="card block">
      <text class="card-t">{{ o.productName }} · ¥{{ o.amount }}</text>
      <text class="card-p">订单编号：BLK-{{ o.id }}</text>
      <text class="card-p">老板 {{ o.userName }} · 游戏 ID {{ o.gameId }}</text>
      <text class="card-p">必须上传 1–3 张战绩截图后才可提交完成。</text>
    </view>

    <view class="card block">
      <text class="card-t">战绩截图（必填，最多 3 张）</text>
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
      <text class="card-t">给老板的说明（选填）</text>
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
.hint { display: block; font-size: 21rpx; color: #8192AD; margin: 0 0 20rpx; line-height: 1.6; }
.imgs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18rpx; }
.img-box { position: relative; height: 196rpx; border-radius: 28rpx; overflow: hidden; background: #F4F7FF; }
.img { width: 100%; height: 100%; }
.del { position: absolute; right: 0; top: 0; width: 48rpx; height: 48rpx; background: rgba(20, 43, 83, 0.7); color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 30rpx; border-radius: 0 0 0 20rpx; }
.add { display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 50rpx; color: #4B72B8; background: linear-gradient(150deg, #FFFFFF, #E9F1FF); border: 2rpx dashed #9BB5E5; box-sizing: border-box; }
.add-t { font-size: 22rpx; font-weight: 700; }
.area { height: auto; min-height: 160rpx; padding: 20rpx 24rpx; }
.submit { margin-top: 12rpx; }
</style>
