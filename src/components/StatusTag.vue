<template>
  <text class="status" :style="style">{{ status }}</text>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({ status: String })
const MAP = {
  待付款: ['#FFF7E6', '#D46B08'],
  待派单: ['#FFF7E6', '#D46B08'],
  待接单: ['#E6F4FF', '#0958D9'],
  已接单: ['#E6F4FF', '#0958D9'],
  进行中: ['#1F1F1F', '#FFFFFF'],
  已完成: ['#F6FFED', '#389E0D'],
  退款中: ['#FFF1F0', '#CF1322'],
  已退款: ['#F5F5F5', '#8C8C8C'],
  已取消: ['#F5F5F5', '#8C8C8C']
}
const style = computed(() => {
  const [bg, fg] = MAP[props.status] || ['#F5F5F5', '#595959']
  return `background:${bg};color:${fg}`
})
</script>

<style scoped>
.status { font-size: 22rpx; font-weight: 600; padding: 4rpx 14rpx; border-radius: 8rpx; white-space: nowrap; }
</style>
