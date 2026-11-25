<!--
  【老板】绑定手机号：微信首次登录后必须绑定手机号才能下单。
  两种方式：
    1. 微信手机号一键绑定（主推，不需要短信）：<button open-type="getPhoneNumber">，用户点一下授权，后端用 code 换手机号。
       微信按成功次数收费（约 0.03 元/次），小程序账户没余额时会失败，这时引导用短信绑定。
    2. 短信验证码绑定（备用）：后端设置 SMS_ENABLED=false 时整块隐藏，代码保留，开通短信后自动出现。
-->
<template>
  <view class="page">
    <view class="blk-banner">
      <text class="b-t">绑定手机号</text>
      <text class="b-s">用于接收订单通知，以及护航和客服联系你</text>
    </view>

    <!-- 方式一：微信手机号一键绑定 -->
    <view class="card panel">
      <!-- #ifdef MP-WEIXIN -->
      <button class="btn wx" open-type="getPhoneNumber" :loading="wxLoading" @getphonenumber="onGetPhone">微信手机号一键绑定</button>
      <!-- #endif -->
      <!-- #ifndef MP-WEIXIN -->
      <!-- 网页演示版没有微信授权，点按钮直接模拟成功 -->
      <button class="btn wx" :loading="wxLoading" @tap="onGetPhone({ detail: { code: 'h5-demo-' + Date.now() } })">微信手机号一键绑定</button>
      <!-- #endif -->
      <text class="muted tip">使用你微信绑定的手机号，无需输入验证码</text>
      <text v-if="smsOn && !showSms" class="lk switch" @tap="showSms = true">用其他手机号 / 短信验证码绑定</text>
    </view>

    <!-- 方式二：短信验证码绑定（备用） -->
    <view v-if="smsOn && showSms" class="card panel">
      <text class="label">手机号</text>
      <input class="input" v-model="phone" type="number" maxlength="11" placeholder="请输入手机号" />
      <text class="label">验证码</text>
      <view class="code-row">
        <input class="input code" v-model="code" type="number" maxlength="6" placeholder="6 位验证码" />
        <button class="btn light get" :disabled="count > 0" @tap="send">{{ count > 0 ? count + 's 后重发' : '获取验证码' }}</button>
      </view>
      <button class="btn submit" :loading="loading" @tap="submit">完成</button>
    </view>
  </view>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { sendSmsCode, bindPhone, wxPhoneBind, getAuthOptions } from '@api/auth.js'
import { session, setSession, goHome } from '@/store/session.js'
import { run, toast } from '@/utils.js'

// 后端是否开放了短信验证码
const smsOn = ref(false)
// 是否展开短信绑定表单
const showSms = ref(false)
// 一键绑定请求中
const wxLoading = ref(false)
// 手机号
const phone = ref('')
// 验证码
const code = ref('')
// 重新发送倒计时（秒）
const count = ref(0)
// 短信绑定提交中
const loading = ref(false)
let timer = null

// 进页面先问后端短信开没开
onLoad(async () => {
  const r = await getAuthOptions().catch(() => null)
  smsOn.value = !!(r && r.sms)
})

// 绑定成功：更新登录信息，回到之前的页面
function done(u) {
  setSession(u)
  toast('绑定成功', 'success')
  setTimeout(() => (getCurrentPages().length > 1 ? uni.navigateBack() : goHome(u)), 600)
}

// 一键绑定按钮的回调：用户同意后 e.detail.code 有值，拿去后端换手机号
async function onGetPhone(e) {
  if (!session.user) return uni.redirectTo({ url: '/pages/login/login' })
  const d = (e && e.detail) || {}
  if (!d.code) {
    // 用户点了拒绝：不算错误，提示一下就好
    if (/deny|cancel/i.test(d.errMsg || '')) return toast('已取消授权')
    // 其他失败（常见：小程序账户余额不足 errno=1400001、没填隐私保护指引、没有权限）
    console.warn('[一键绑定失败]', d)
    if (smsOn.value) { showSms.value = true; return toast('一键绑定暂不可用，请用验证码绑定') }
    return toast('一键绑定暂不可用，请稍后再试或联系客服')
  }
  wxLoading.value = true
  const u = await run(wxPhoneBind(session.user.id, d.code))
  wxLoading.value = false
  if (u) done(u)
}

// 发送验证码，开始 60 秒倒计时
async function send() {
  const r = await run(sendSmsCode(phone.value))
  if (!r) return
  toast(r.demoCode ? `验证码已发送（测试环境：${r.demoCode}）` : '验证码已发送')
  count.value = 60
  timer = setInterval(() => { count.value--; if (count.value <= 0) clearInterval(timer) }, 1000)
}

// 短信方式提交绑定
async function submit() {
  if (!session.user) return uni.redirectTo({ url: '/pages/login/login' })
  if (code.value.length !== 6) return toast('请输入 6 位验证码')
  loading.value = true
  const u = await run(bindPhone(session.user.id, phone.value, code.value))
  loading.value = false
  if (u) done(u)
}

// 离开页面时清掉定时器
onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
.page { padding: 28rpx 32rpx; }
.panel { padding: 8rpx 30rpx 32rpx; margin-bottom: 24rpx; }
.wx { background: #07C160; margin-top: 24rpx; }
.tip { display: block; text-align: center; font-size: 22rpx; margin-top: 20rpx; }
.switch { display: block; text-align: center; font-size: 24rpx; margin-top: 20rpx; color: #4B72B8; }
.code-row { display: flex; gap: 16rpx; }
.code { flex: 1; }
.get { width: 220rpx; height: 88rpx; font-size: 24rpx; margin: 0; }
.submit { margin-top: 48rpx; }
</style>
