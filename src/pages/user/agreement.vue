<template>
  <view class="wrap">
    <view class="card body"><text class="tx">{{ text }}</text></view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getSettings } from '@api/finance.js'
import { run } from '@/utils.js'

const text = ref('')
onLoad(async (q) => {
  const type = q.type === 'privacy' ? 'privacy' : 'user'
  uni.setNavigationBarTitle({ title: type === 'privacy' ? '隐私政策' : '用户协议' })
  const s = await run(getSettings())
  text.value = s ? s.agreements[type] : ''
})
</script>

<style scoped>
.body { padding: 32rpx; }
.tx { font-size: 26rpx; line-height: 1.8; white-space: pre-wrap; }
</style>
