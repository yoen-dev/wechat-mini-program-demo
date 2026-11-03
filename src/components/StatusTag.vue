<!--
  订单状态标签：不同状态显示不同颜色（待付款橙色、已完成绿色等）。
-->
<template>
  <text class="status" :style="style">{{ status }}</text>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({ status: String })
const MAP = {
  待付款: ['#FFF0D8', '#BB873A'],
  待派单: ['#FFF0D8', '#BB873A'],
  待接单: ['#EAF1FF', '#567BBB'],
  已接单: ['#EAF1FF', '#567BBB'],
  进行中: ['#DCE9FF', '#3F66AD'],
  待确认: ['#FFF0D8', '#BB873A'],
  已完成: ['#E0F6EF', '#269B79'],
  退款中: ['#FFEBEF', '#C76C80'],
  已退款: ['#EEF2F9', '#8798B5'],
  已取消: ['#EEF2F9', '#8798B5']
}
// 按状态取颜色
const style = computed(() => {
  const [bg, fg] = MAP[props.status] || ['#F4F7FF', '#5B6F92']
  return `background:${bg};color:${fg}`
})
</script>

<style scoped>
.status { font-size: 20rpx; font-weight: 600; padding: 8rpx 16rpx; border-radius: 16rpx; white-space: nowrap; }
</style>
