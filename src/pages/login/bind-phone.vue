<template>
  <view class="page">
    <text class="title">绑定手机号</text>
    <text class="muted desc">用于接收订单通知，以及护航和客服联系你</text>

    <view class="card panel">
      <text class="label">手机号</text>
      <input class="input" v-model="phone" type="number" maxlength="11" placeholder="请输入手机号" />
      <text class="label">验证码</text>
      <view class="code-row">
        <input class="input code" v-model="code" type="number" maxlength="6" placeholder="6 位验证码" />
        <button class="btn light get" :disabled="count > 0" @tap="send">{{ count > 0 ? count + 's 后重发' : '获取验证码' }}</button>
      </view>
      <button class="btn submit" :loading="loading" @tap="submit">完成</button>
    </view>
    <!-- 小程序上线后也可以用微信的“手机号快速验证”组件（button open-type="getPhoneNumber"），用户点一下即可授权 -->
  </view>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import { sendSmsCode, bindPhone } from '@/api/auth.js'
import { session, setSession, goHome } from '@/store/session.js'
import { run, toast } from '@/utils.js'

const phone = ref('')
const code = ref('')
const count = ref(0)
const loading = ref(false)
let timer = null

async function send() {
  const r = await run(sendSmsCode(phone.value))
  if (!r) return
  toast(`验证码已发送（演示：${r.demoCode}）`)
  count.value = 60
  timer = setInterval(() => { count.value--; if (count.value <= 0) clearInterval(timer) }, 1000)
}

async function submit() {
  if (!session.user) return uni.redirectTo({ url: '/pages/login/login' })
  if (code.value.length !== 6) return toast('请输入 6 位验证码')
  loading.value = true
  const u = await run(bindPhone(session.user.id, phone.value, code.value))
  loading.value = false
  if (!u) return
  setSession(u)
  toast('绑定成功', 'success')
  setTimeout(() => (getCurrentPages().length > 1 ? uni.navigateBack() : goHome(u)), 600)
}

onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
.page { padding: 48rpx 40rpx; }
.title { display: block; font-size: 44rpx; font-weight: 700; }
.desc { display: block; margin: 12rpx 0 40rpx; font-size: 26rpx; }
.panel { padding: 8rpx 32rpx 32rpx; }
.code-row { display: flex; gap: 16rpx; }
.code { flex: 1; }
.get { width: 220rpx; height: 88rpx; font-size: 26rpx; margin: 0; }
.submit { margin-top: 48rpx; }
</style>
