<!--
  【老板】评价订单：订单完成后给护航打 1-5 星并写评价。
-->
<template>
  <view v-if="o" class="wrap">
    <view class="blk-banner">
      <text class="b-t">{{ o.productName }}</text>
      <text class="b-s">护航：{{ o.escortName }} · BLK-{{ o.id }}</text>
    </view>
    <!-- 点星星打分 -->
    <view class="card pad center">
      <text class="card-t">这次护航体验如何？</text>
      <view class="stars">
        <text v-for="n in 5" :key="n" class="star" :class="{ on: n <= score }" @tap="score = n">★</text>
      </view>
      <text class="card-p">{{ LEVEL[score] }}</text>
    </view>
    <view class="field"><text class="f-l">写下你的评价（选填）</text><textarea class="f-ta" v-model="text" placeholder="分享这次的服务体验" auto-height /></view>
    <button class="btn submit" :loading="busy" @tap="submit">提交评价</button>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getOrder, rateOrder } from '@api/orders.js'
import { session, needUserLogin } from '@/store/session.js'
import { run, toast } from '@/utils.js'

const LEVEL = ['请点击星星打分', '很差', '一般', '还行', '满意', '非常满意']
// 订单信息
const o = ref(null)
// 评分
const score = ref(5)
// 评价内容
const text = ref('')
// 提交中，防止重复点击
const busy = ref(false)
// 页面打开时读取网址参数并加载数据
onLoad(async (q) => {
  if (!needUserLogin()) return
  o.value = await run(getOrder(session.user, q.id))
})
// 提交评价
async function submit() {
  busy.value = true
  const r = await run(rateOrder(session.user, o.value.id, score.value, text.value))
  busy.value = false
  if (!r) return
  toast('感谢评价', 'success')
  setTimeout(() => uni.navigateBack(), 600)
}
</script>

<style scoped>
.center { display: flex; flex-direction: column; align-items: center; }
.stars { display: flex; gap: 20rpx; margin: 16rpx 0 8rpx; }
.star { font-size: 68rpx; color: #DCE6F8; }
.star.on { color: #E9B35B; }
.submit { margin-top: 8rpx; }
</style>
