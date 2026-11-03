<template>
  <view class="wrap">
    <view class="seg">
      <view v-for="t in tabs" :key="t" class="seg-item" :class="{ on: t === tab }" @tap="tab = t">{{ t }}{{ t !== '全部' && count(t) ? ' ' + count(t) : '' }}</view>
    </view>

    <view class="card tk" v-for="t in shown" :key="t.id">
      <view class="between">
        <text class="tt">#{{ t.id }} · {{ t.type }}</text>
        <text :class="['ts', t.status === '已解决' ? 'ok' : t.status === '待处理' ? 'new' : '']">{{ t.status }}</text>
      </view>
      <text class="muted tm">{{ t.userName }} · {{ fmtTime(t.createdAt) }}<text v-if="t.orderId" class="link" @tap="openOrder(t.orderId)"> · 订单 #{{ t.orderId }}</text></text>
      <text class="tc">{{ t.content }}</text>
      <view class="rp" v-for="(r, i) in t.replies" :key="i">
        <text class="rn">{{ r.name }}：</text><text>{{ r.text }}</text>
      </view>
      <view v-if="t.status !== '已解决'" class="ops">
        <view class="btn sm ghost" @tap="reply(t, false)">回复</view>
        <view class="btn sm" @tap="reply(t, true)">回复并标记已解决</view>
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
const tab = ref('待处理')
const list = ref([])
const shown = computed(() => list.value.filter((t) => tab.value === '全部' || t.status === tab.value))
const count = (s) => list.value.filter((t) => t.status === s).length

async function load() {
  if (!guard(['cs', 'admin'])) return
  list.value = (await run(listTickets(session.user))) || []
}
onShow(load)
onPullDownRefresh(async () => { await load(); uni.stopPullDownRefresh() })
const openOrder = (id) => uni.navigateTo({ url: `/pages/order/order?id=${id}` })
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
.tk { padding: 28rpx; margin-top: 20rpx; }
.tt { font-size: 28rpx; font-weight: 700; }
.ts { font-size: 24rpx; color: #0958D9; }
.ts.new { color: #D46B08; }
.ts.ok { color: #389E0D; }
.tm { display: block; font-size: 22rpx; margin-top: 6rpx; }
.link { color: #0958D9; }
.tc { display: block; font-size: 28rpx; margin-top: 16rpx; line-height: 1.6; }
.rp { margin-top: 12rpx; padding: 16rpx 20rpx; background: #F5F5F5; border-radius: 12rpx; font-size: 24rpx; line-height: 1.6; }
.rn { font-weight: 600; }
.ops { display: flex; justify-content: flex-end; gap: 16rpx; margin-top: 20rpx; }
</style>
