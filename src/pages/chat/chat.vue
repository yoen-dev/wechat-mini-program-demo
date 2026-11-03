<!--
  【老板 / 护航 / 客服】订单沟通：同一个订单里老板、护航、客服互发消息。每 3 秒自动拉取新消息。
-->
<template>
  <view class="page">
    <view v-if="o" class="obar">
      <view class="cover th">封面</view>
      <view class="ot"><text class="on">{{ o.productName }} · ¥{{ o.amount }}</text><text class="muted ono">#{{ o.id }} · {{ o.escortName || '待分配护航' }}</text></view>
      <StatusTag :status="o.status" />
    </view>

    <scroll-view scroll-y class="msgs" :scroll-into-view="last" scroll-with-animation>
      <view class="sys">消息仅订单相关人员可见：老板、护航、客服</view>
      <view v-for="m in msgs" :key="m.id" :id="'m' + m.id" class="mrow" :class="{ me: m.from === me.id }">
        <view v-if="m.from !== me.id" class="av">{{ m.name.slice(0, 1) }}</view>
        <view class="mcol">
          <text v-if="m.from !== me.id" class="muted who">{{ m.name }} · {{ ROLE_NAME[m.role] }}</text>
          <view class="bubble">{{ m.text }}</view>
        </view>
      </view>
    </scroll-view>

    <view class="composer">
      <input class="input box" v-model="draft" placeholder="发消息…" confirm-type="send" @confirm="send" />
      <view class="btn sm send" @tap="send">发送</view>
    </view>
  </view>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { onLoad, onShow, onHide, onUnload } from '@dcloudio/uni-app'
import { getOrder, listMessages, sendMessage } from '@api/orders.js'
import { ROLE_NAME } from '@api/staff.js'
import { session } from '@/store/session.js'
import { run } from '@/utils.js'
import StatusTag from '@/components/StatusTag.vue'

// 订单号
const id = ref(null)
// 订单信息
const o = ref(null)
// 消息列表
const msgs = ref([])
// 输入框里的内容
const draft = ref('')
// 最后一条消息，用来判断要不要滚到底部
const last = ref('')
// 当前登录的员工
const me = session.user || {}
let timer = null

// 拉取最新消息
async function refresh() {
  const list = await listMessages(session.user, id.value).catch(() => null)
  if (list && list.length !== msgs.value.length) { msgs.value = list; scroll() }
}
// 滚到最底部
function scroll() { nextTick(() => { last.value = msgs.value.length ? 'm' + msgs.value[msgs.value.length - 1].id : '' }) }

// 页面打开时读取网址参数并加载数据
onLoad(async (q) => {
  id.value = Number(q.id)
  if (!session.user) return uni.redirectTo({ url: '/pages/login/login' })
  o.value = await run(getOrder(session.user, id.value))
  await refresh()
})
// 演示用轮询；真实环境换成 WebSocket 或云开发实时数据推送
onShow(() => { timer = setInterval(refresh, 3000) })
// 页面切到后台时停止轮询
onHide(() => clearInterval(timer))
// 页面关闭时停止轮询
onUnload(() => clearInterval(timer))

// 发送消息
async function send() {
  const t = draft.value.trim()
  if (!t) return
  const m = await run(sendMessage(session.user, id.value, t))
  if (!m) return
  draft.value = ''
  msgs.value = [...msgs.value, m]
  scroll()
}
</script>

<style scoped>
.page { height: calc(100vh - var(--window-top)); display: flex; flex-direction: column; }
.obar { display: flex; align-items: center; gap: 16rpx; padding: 20rpx 24rpx; background: #FFFFFF; border-bottom: 2rpx solid #F0F0F0; }
.th { width: 72rpx; height: 72rpx; border-radius: 10rpx; flex-shrink: 0; font-size: 18rpx; }
.ot { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4rpx; }
.on { font-size: 26rpx; font-weight: 600; }
.ono { font-size: 22rpx; }
.msgs { flex: 1; min-height: 0; padding: 24rpx; box-sizing: border-box; }
.sys { margin: 0 auto 24rpx; width: fit-content; font-size: 22rpx; color: #8C8C8C; background: #EBEBEB; border-radius: 8rpx; padding: 6rpx 16rpx; }
.mrow { display: flex; gap: 16rpx; margin-bottom: 24rpx; }
.mrow.me { justify-content: flex-end; }
.av { width: 64rpx; height: 64rpx; border-radius: 50%; background: #D9D9D9; color: #595959; font-size: 24rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.mcol { display: flex; flex-direction: column; gap: 6rpx; max-width: 500rpx; }
.who { font-size: 20rpx; }
.bubble { padding: 18rpx 22rpx; font-size: 28rpx; line-height: 1.5; background: #FFFFFF; border-radius: 16rpx; word-break: break-all; }
.mrow.me .bubble { background: #1F1F1F; color: #FFFFFF; }
.composer { display: flex; gap: 16rpx; align-items: center; padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom)); background: #FFFFFF; border-top: 2rpx solid #F0F0F0; }
.box { flex: 1; height: 76rpx; }
.send { height: 76rpx; }
</style>
