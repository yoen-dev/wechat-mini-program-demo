<template>
  <view class="page">
    <view class="brand">
      <view class="logo">LOGO</view>
      <text class="title">[品牌名]</text>
      <text class="muted">三角洲行动 · 专业护航</text>
    </view>

    <view class="seg tabs">
      <view class="seg-item" :class="{ on: tab === 'user' }" @tap="tab = 'user'">用户登录</view>
      <view class="seg-item" :class="{ on: tab === 'staff' }" @tap="tab = 'staff'">员工登录</view>
    </view>

    <!-- 用户：微信一键登录，首次需绑定手机号 -->
    <view v-if="tab === 'user'" class="panel">
      <button class="btn wx" :loading="loading" @tap="onWxLogin">微信一键登录</button>
      <text class="muted tip">首次登录需要绑定手机号</text>
    </view>

    <!-- 员工：账号由管理员发放 -->
    <view v-else class="panel">
      <text class="label">账号</text>
      <input class="input" v-model="account" placeholder="请输入员工账号" />
      <text class="label">密码</text>
      <input class="input" v-model="password" password placeholder="请输入密码" confirm-type="done" @confirm="onStaffLogin" />
      <button class="btn submit" :loading="loading" @tap="onStaffLogin">登录</button>
      <text class="muted tip">账号由管理员发放，忘记密码请联系管理员重置</text>
    </view>

    <view class="agree" @tap="agreed = !agreed">
      <view class="check" :class="{ on: agreed }">{{ agreed ? '✓' : '' }}</view>
      <text class="muted">我已阅读并同意《用户协议》和《隐私政策》</text>
    </view>

    <!-- 演示用：上线前删除 -->
    <view class="card demo">
      <text class="demo-title">演示账号（点击填入）</text>
      <view class="demo-row" @tap="demoUser">
        <text>示例老板</text><text class="muted">已绑定手机，直接登录</text>
      </view>
      <view class="demo-row" v-for="a in demoStaff" :key="a.account" @tap="fill(a)">
        <text>{{ a.label }}</text><text class="muted">{{ a.account }} / {{ a.password }}</text>
      </view>
      <text class="muted demo-note">短信验证码固定为 123456</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { wxLogin, staffLogin } from '@/api/auth.js'
import { setSession, goHome } from '@/store/session.js'
import { run, toast } from '@/utils.js'

const tab = ref('user')
const account = ref('')
const password = ref('')
const agreed = ref(false)
const loading = ref(false)
onLoad((q) => { if (q.tab === 'staff') tab.value = 'staff' })

const demoStaff = [
  { label: '管理员', account: 'admin', password: 'admin123' },
  { label: '客服', account: 'kefu01', password: '123456' },
  { label: '护航', account: 'hh01', password: '123456' }
]

function checkAgree() {
  if (!agreed.value) toast('请先阅读并同意用户协议和隐私政策')
  return agreed.value
}

function backOrHome(user) {
  if (getCurrentPages().length > 1) uni.navigateBack()
  else goHome(user)
}

async function onWxLogin(opts = {}) {
  if (!checkAgree()) return
  loading.value = true
  // 真实环境：先 uni.login({ provider: 'weixin' }) 拿 code，再交给后端换 openid
  const r = await run(wxLogin(opts))
  loading.value = false
  if (!r) return
  setSession(r.user)
  if (r.needPhone) uni.redirectTo({ url: '/pages/login/bind-phone' })
  else { toast('登录成功', 'success'); setTimeout(() => backOrHome(r.user), 500) }
}

async function onStaffLogin() {
  if (!checkAgree()) return
  if (!account.value || !password.value) return toast('请输入账号和密码')
  loading.value = true
  const u = await run(staffLogin(account.value, password.value))
  loading.value = false
  if (!u) return
  setSession(u)
  goHome(u)
}

function fill(a) {
  tab.value = 'staff'
  account.value = a.account
  password.value = a.password
  agreed.value = true
}
function demoUser() {
  agreed.value = true
  tab.value = 'user'
  onWxLogin({ openid: 'seed-openid' })
}
</script>

<style scoped>
.page { padding: 48rpx 40rpx 60rpx; }
.brand { display: flex; flex-direction: column; align-items: center; gap: 12rpx; margin: 40rpx 0 56rpx; }
.logo { width: 128rpx; height: 128rpx; border-radius: 28rpx; background: #1F1F1F; color: #FFFFFF; font-size: 24rpx; display: flex; align-items: center; justify-content: center; }
.title { font-size: 40rpx; font-weight: 700; margin-top: 8rpx; }
.tabs { margin-bottom: 32rpx; }
.panel { background: #FFFFFF; border-radius: 20rpx; padding: 32rpx; }
.wx { background: #07C160; margin-top: 8rpx; }
.submit { margin-top: 40rpx; }
.tip { display: block; text-align: center; font-size: 24rpx; margin-top: 24rpx; }
.agree { display: flex; align-items: center; justify-content: center; gap: 12rpx; margin-top: 32rpx; font-size: 24rpx; }
.check { width: 32rpx; height: 32rpx; border-radius: 50%; border: 2rpx solid #BFBFBF; font-size: 20rpx; display: flex; align-items: center; justify-content: center; color: #FFFFFF; }
.check.on { background: #1F1F1F; border-color: #1F1F1F; }
.demo { margin-top: 48rpx; padding: 24rpx 28rpx; border: 2rpx dashed #D9D9D9; background: #FAFAFA; }
.demo-title { font-size: 24rpx; font-weight: 600; }
.demo-row { display: flex; justify-content: space-between; padding: 16rpx 0; font-size: 26rpx; border-bottom: 2rpx solid #F0F0F0; }
.demo-note { display: block; font-size: 22rpx; margin-top: 12rpx; }
</style>
