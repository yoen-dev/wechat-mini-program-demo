<template>
  <view v-if="s" class="wrap">
    <view class="seg">
      <view class="seg-item" :class="{ on: part === 'money' }" @tap="part = 'money'">分成与规则</view>
      <view class="seg-item" :class="{ on: part === 'recharge' }" @tap="part = 'recharge'">储值充值</view>
      <view class="seg-item" :class="{ on: part === 'content' }" @tap="part = 'content'">公告与问答</view>
      <view class="seg-item" :class="{ on: part === 'agree' }" @tap="part = 'agree'">协议</view>
    </view>

    <view v-if="part === 'money'" class="card form">
      <text class="label">护航分成比例（%）</text>
      <input class="input" v-model="rate" type="digit" placeholder="70" />
      <text class="muted hint">订单确认完成时，护航按「实付金额 × 比例」入账。修改只影响之后完成的订单。</text>
      <text class="label">老板自动确认时长（小时）</text>
      <input class="input" v-model="hours" type="number" placeholder="24" />
      <text class="muted hint">护航提交完成后，老板超过这个时间没确认就自动确认。填 0 表示不自动确认。</text>
      <button class="btn submit" @tap="saveMoney">保存</button>
    </view>

    <view v-if="part === 'recharge'">
      <text class="sec-title sec">充值档位</text>
      <view class="card form">
        <view class="tier-row" v-for="(t, i) in tiers" :key="i">
          <view class="col"><text class="label">充值（元）</text><input class="input" v-model="t.pay" type="digit" /></view>
          <view class="col"><text class="label">赠送（元）</text><input class="input" v-model="t.bonus" type="digit" /></view>
          <text class="del tdel" @tap="tiers.splice(i, 1)">删除</text>
        </view>
        <view class="two">
          <view class="btn ghost" @tap="tiers.push({ pay: '', bonus: '0' })">＋ 加一档</view>
          <view class="btn" @tap="saveTiers">保存档位</view>
        </view>
      </view>
      <text class="sec-title sec">首页充值提示</text>
      <view class="card form">
        <view class="between sw-row"><text>在首页弹出「某某刚刚充值」</text><switch :checked="popup" color="#1F1F1F" @change="popup = $event.detail.value" /></view>
        <text class="label">充值多少元以上才提示</text>
        <input class="input" v-model="popupMin" type="digit" placeholder="100" />
        <text class="muted hint">只展示最近 48 小时的真实充值记录，名字自动打码（如「小*」）。</text>
        <button class="btn submit" @tap="savePopup">保存</button>
      </view>
    </view>

    <view v-if="part === 'content'">
      <view class="card form">
        <text class="label">首页公告（留空则不显示）</text>
        <textarea class="input area" v-model="notice" placeholder="如：国庆福利单限时开放" auto-height />
        <button class="btn submit" @tap="saveNotice">保存公告</button>
      </view>
      <text class="sec-title sec">常见问题（客服页显示）</text>
      <view class="card form" v-for="(f, i) in faqs" :key="i">
        <view class="between"><text class="label">问题 {{ i + 1 }}</text><text class="del" @tap="faqs.splice(i, 1)">删除</text></view>
        <input class="input" v-model="f.q" placeholder="问题" />
        <textarea class="input area" v-model="f.a" placeholder="回答" auto-height />
      </view>
      <view class="two">
        <view class="btn ghost" @tap="faqs.push({ q: '', a: '' })">＋ 加一条</view>
        <view class="btn" @tap="saveFaqs">保存问答</view>
      </view>
    </view>

    <view v-if="part === 'agree'">
      <view class="card form">
        <text class="label">用户协议</text>
        <textarea class="input area big" v-model="agreeUser" maxlength="-1" auto-height />
        <text class="label">隐私政策</text>
        <textarea class="input area big" v-model="agreePrivacy" maxlength="-1" auto-height />
        <button class="btn submit" @tap="saveAgree">保存协议</button>
      </view>
      <text class="muted hint">登录页和「我的 → 相关协议」显示这里的内容。正式上线前请找法务确认。</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getSettings, saveSettings } from '@/api/finance.js'
import { session, guard } from '@/store/session.js'
import { run, toast } from '@/utils.js'

const s = ref(null)
const part = ref('money')
const rate = ref('')
const hours = ref('')
const notice = ref('')
const faqs = ref([])
const agreeUser = ref('')
const agreePrivacy = ref('')
const tiers = ref([])
const popup = ref(true)
const popupMin = ref('')

onLoad(async (q) => {
  if (!guard(['admin'])) return
  if (q.part) { part.value = q.part; uni.setNavigationBarTitle({ title: q.part === 'recharge' ? '储值充值' : '公告与问答' }) }
  s.value = await run(getSettings())
  if (!s.value) return
  rate.value = String(Math.round(s.value.shareRate * 100))
  hours.value = String(s.value.autoConfirmHours)
  notice.value = s.value.notice
  faqs.value = s.value.faqs.map((f) => ({ ...f }))
  agreeUser.value = s.value.agreements.user
  agreePrivacy.value = s.value.agreements.privacy
  tiers.value = s.value.recharge.tiers.map((t) => ({ pay: String(t.pay), bonus: String(t.bonus) }))
  popup.value = s.value.recharge.popup
  popupMin.value = String(s.value.recharge.popupMin)
})
const ok = (r) => r && toast('已保存', 'success')
async function saveMoney() { ok(await run(saveSettings(session.user, { shareRate: Number(rate.value) / 100, autoConfirmHours: Number(hours.value) }))) }
async function saveNotice() { ok(await run(saveSettings(session.user, { notice: notice.value }))) }
async function saveFaqs() { ok(await run(saveSettings(session.user, { faqs: faqs.value }))) }
async function saveTiers() { ok(await run(saveSettings(session.user, { recharge: { tiers: tiers.value } }))) }
async function savePopup() { ok(await run(saveSettings(session.user, { recharge: { popup: popup.value, popupMin: popupMin.value } }))) }
async function saveAgree() { ok(await run(saveSettings(session.user, { agreements: { user: agreeUser.value, privacy: agreePrivacy.value } }))) }
</script>

<style scoped>
.form { padding: 8rpx 28rpx 28rpx; margin-top: 20rpx; }
.hint { display: block; font-size: 22rpx; margin-top: 10rpx; line-height: 1.6; }
.area { height: auto; min-height: 120rpx; padding: 20rpx 24rpx; margin-top: 12rpx; }
.big { min-height: 300rpx; }
.submit { margin-top: 32rpx; }
.sec { display: block; margin: 36rpx 8rpx 0; }
.del { font-size: 24rpx; color: #CF1322; margin-top: 12rpx; }
.two { display: flex; gap: 16rpx; margin-top: 24rpx; }
.tier-row { display: flex; align-items: flex-end; gap: 16rpx; }
.tier-row .col { flex: 1; }
.tdel { padding-bottom: 28rpx; }
.sw-row { margin-top: 20rpx; font-size: 28rpx; }
.two .btn { flex: 1; }
</style>
