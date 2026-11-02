<template>
  <view class="wrap">
    <view v-if="mine && mine.status !== '已拒绝'" class="card state">
      <text class="st">{{ mine.status === '已通过' ? '报名已通过' : '报名审核中' }}</text>
      <text class="muted sd">{{ mine.status === '已通过' ? '护航账号已开通，客服会把账号和初始密码发给你，在登录页选「账号密码」登录即可。' : '提交于 ' + fmtTime(mine.createdAt) + '，客服审核后会联系你。' }}</text>
    </view>

    <template v-else>
      <view v-if="mine" class="card state"><text class="st">上次报名未通过</text><text class="muted sd">{{ mine.note || '可以修改资料后重新提交' }}</text></view>
      <view class="card intro">
        <text class="sec-title">成为护航</text>
        <text class="muted sd">时间自由、按单分成。提交资料后由客服审核，通过后为你开通护航账号。</text>
      </view>
      <view class="card form">
        <text class="label">称呼</text>
        <input class="input" v-model="f.name" placeholder="怎么称呼你" />
        <text class="label">手机号</text>
        <input class="input" v-model="f.phone" type="number" maxlength="11" placeholder="客服会通过这个号码联系你" />
        <text class="label">段位</text>
        <input class="input" v-model="f.rank" placeholder="如：巅峰" />
        <text class="label">擅长地图（选填）</text>
        <input class="input" v-model="f.maps" placeholder="如：航天基地 / 零号大坝" />
        <text class="label">自我介绍（选填）</text>
        <textarea class="input area" v-model="f.intro" placeholder="游戏经历、在线时间等" auto-height />
        <button class="btn submit" :loading="busy" @tap="submit">提交报名</button>
      </view>
    </template>
  </view>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { submitApplication, myApplication } from '@/api/service.js'
import { session, needUserLogin } from '@/store/session.js'
import { run, toast, fmtTime } from '@/utils.js'

const mine = ref(null)
const busy = ref(false)
const f = reactive({ name: '', phone: '', rank: '', maps: '', intro: '' })
onShow(async () => {
  if (!needUserLogin()) return
  f.phone = f.phone || session.user.phone || ''
  mine.value = await run(myApplication(session.user))
})
async function submit() {
  busy.value = true
  const r = await run(submitApplication(session.user, f))
  busy.value = false
  if (r) { toast('已提交', 'success'); mine.value = r }
}
</script>

<style scoped>
.state, .intro { padding: 28rpx; margin-bottom: 20rpx; }
.st { display: block; font-size: 32rpx; font-weight: 700; }
.sd { display: block; font-size: 24rpx; margin-top: 10rpx; line-height: 1.6; }
.form { padding: 8rpx 28rpx 32rpx; }
.area { height: auto; min-height: 160rpx; padding: 20rpx 24rpx; }
.submit { margin-top: 36rpx; }
</style>
