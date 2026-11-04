<!--
  【客服 / 管理员】售后工单：待处理 / 处理中 / 已解决，回复老板或标记解决。
-->
<template>
  <view class="wrap">
    <scroll-view scroll-x class="tabsline" :show-scrollbar="false">
      <view v-for="t in tabs" :key="t" class="tb" :class="{ on: t === tab }" @tap="tab = t">{{ t }}<text v-if="t !== '全部' && count(t)" class="dot">{{ count(t) }}</text></view>
    </scroll-view>

    <view class="card tk" v-for="t in shown" :key="t.id">
      <view class="between">
        <text class="tt">售后 #{{ t.id }} · {{ t.type }}</text>
        <text :class="['chip', t.status === '已解决' ? 'green' : t.status === '待处理' ? 'orange' : '']">{{ t.status }}</text>
      </view>
      <text class="muted tm">{{ t.userName }} · {{ fmtTime(t.createdAt) }}<text v-if="t.orderId" class="link" @tap="openOrder(t.orderId)"> · 订单 #{{ t.orderId }}</text></text>
      <text class="tc">{{ t.content }}</text>
      <view class="rp" v-for="(r, i) in t.replies" :key="i">
        <text class="rn">{{ r.name }}：</text><text>{{ r.text }}</text>
      </view>
      <view v-if="t.status !== '已解决'" class="grid2 ops">
        <view class="btn light" @tap="reply(t, false)">回复老板</view>
        <view class="btn" @tap="reply(t, true)">回复并解决</view>
      </view>
    </view>
    <Empty v-if="!shown.length" text="没有工单" />
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { listTickets, replyTicket } from '@api/service.js'
import { session, guard } from '@/store/session.js'
import { run, toast, fmtTime } from '@/utils.js'
import Empty from '@/components/Empty.vue'

const tabs = ['待处理', '处理中', '已解决', '全部']
// 当前选中的标签页
const tab = ref('待处理')
// 列表数据
const list = ref([])
// 当前标签页要显示的列表
const shown = computed(() => list.value.filter((t) => tab.value === '全部' || t.status === tab.value))
// 各标签数量
const count = (s) => list.value.filter((t) => t.status === s).length

// 加载页面数据
async function load() {
  if (!guard(['cs', 'admin'])) return
  list.value = (await run(listTickets(session.user))) || []
}
// 每次显示页面时刷新（从别的页面返回也会触发）
onShow(load)
// 下拉刷新
onPullDownRefresh(async () => { await load(); uni.stopPullDownRefresh() })
// 打开订单详情
const openOrder = (id) => uni.navigateTo({ url: `/pages/order/order?id=${id}` })
// 回复工单（可同时标记已解决）
function reply(t, resolve) {
  uni.showModal({
    title: resolve ? '处理结果' : '回复老板', editable: true, placeholderText: resolve ? '如：已为你补一局，感谢反馈' : '输入回复内容',
    success: async (r) => {
      if (!r.confirm) return
      if (!resolve && !(r.content || '').trim()) return toast('请输入回复内容')
      if (await run(replyTicket(session.user, t.id, r.content, resolve))) { toast(resolve ? '已解决' : '已回复', 'success'); load() }
    }
  })
}
</script>

<style scoped>
.tk { padding: 28rpx; margin-bottom: 20rpx; }
.tt { font-size: 27rpx; font-weight: 800; }
.tm { display: block; font-size: 21rpx; margin-top: 10rpx; }
.link { color: #4B72B8; }
.tc { display: block; font-size: 24rpx; color: #5B6F92; margin-top: 16rpx; line-height: 1.7; }
.rp { margin-top: 14rpx; padding: 16rpx 20rpx; background: #F0F5FF; border-radius: 20rpx; font-size: 23rpx; line-height: 1.6; color: #4F70A6; }
.rn { font-weight: 700; }
.ops { margin-top: 24rpx; }
</style>
