<!--
  用户协议 / 隐私政策（?type=user|privacy），内容在「管理后台 → 协议」里编辑。
-->
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

// 协议内容
const text = ref('')
// 页面打开时读取网址参数并加载数据
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
