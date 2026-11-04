<!--
  登录页（所有身份共用）：微信登录、手机号登录（老板）、账号密码登录（员工，账号由管理员发放）。登录后按身份自动进入对应首页。
-->
<template>
  <view class="page">
    <!-- 品牌横幅（图片在 src/static/brand/hero.jpg，换品牌图直接替换这个文件） -->
    <view class="brand">
      <image class="hero" src="/static/brand/hero.jpg" mode="aspectFill" />
      <text class="hdr-t title">欢迎来到 BLK电竞</text>
      <text class="hdr-s">三角洲行动 · 专业护航</text>
    </view>

    <view class="seg tabs">
      <view v-for="t in tabs" :key="t.key" class="seg-item" :class="{ on: tab === t.key }" @tap="tab = t.key">{{ t.name }}</view>
    </view>

    <!-- 微信登录：首次需要绑定手机号 -->
    <view v-if="tab === 'wx'" class="card panel">
      <button class="btn wx" :loading="loading" @tap="onWxLogin()">微信一键登录</button>
      <text class="muted tip">首次登录需要绑定手机号</text>
    </view>

    <!-- 手机号 + 验证码：没注册过的自动注册 -->
    <view v-else-if="tab === 'phone'" class="card panel">
      <text class="label">手机号</text>
      <input class="input" v-model="phone" type="number" maxlength="11" placeholder="请输入手机号" />
      <text class="label">验证码</text>
      <view class="code-row">
        <input class="input code" v-model="code" type="number" maxlength="6" placeholder="6 位验证码" />
        <button class="btn light get" :disabled="count > 0" @tap="send">{{ count > 0 ? count + 's' : '获取验证码' }}</button>
      </view>
      <button class="btn submit" :loading="loading" @tap="onPhoneLogin">登录</button>
      <text class="muted tip">未注册的手机号验证后自动注册</text>
    </view>

    <!-- 账号密码：账号只能由管理员在后台发放，登录后按身份进入对应界面 -->
    <view v-else class="card panel">
      <text class="label">账号</text>
      <input class="input" v-model="account" placeholder="请输入账号" />
      <text class="label">密码</text>
      <input class="input" v-model="password" password placeholder="请输入密码" confirm-type="done" @confirm="onPwdLogin" />
      <button class="btn submit" :loading="loading" @tap="onPwdLogin">登录</button>
      <text class="muted tip">账号由平台发放，忘记密码请联系管理员</text>
    </view>

    <view class="agree" @tap="agreed = !agreed">
      <view class="check" :class="{ on: agreed }">{{ agreed ? '✓' : '' }}</view>
      <text class="muted">我已阅读并同意<text class="lk" @tap.stop="readAgree('user')">《用户协议》</text>和<text class="lk" @tap.stop="readAgree('privacy')">《隐私政策》</text></text>
    </view>

    <!-- 演示账号：只在网页演示版和本地联调时显示，正式小程序（云托管）自动隐藏 -->
    <view class="card demo" v-if="showDemo">
      <text class="demo-title">演示账号（点击填入）</text>
      <view class="demo-row" @tap="demoUser">
        <text>示例老板</text><text class="muted">微信登录，已绑定手机</text>
      </view>
      <view class="demo-row" v-for="a in demoAccounts" :key="a.account" @tap="fill(a)">
        <text>{{ a.label }}</text><text class="muted">{{ a.account }} / {{ a.password }}</text>
      </view>
      <text class="muted demo-note">短信验证码固定为 123456</text>
    </view>
  </view>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import { wxLogin, staffLogin, phoneLogin, sendSmsCode } from '@api/auth.js'
import { setSession, goHome } from '@/store/session.js'
import { run, toast } from '@/utils.js'
import { API_MODE } from '@/api/constants.js'

const showDemo = API_MODE !== 'cloud'

const tabs = [{ key: 'wx', name: '微信登录' }, { key: 'phone', name: '手机号登录' }, { key: 'pwd', name: '账号密码' }]
// 当前登录方式
const tab = ref('wx')
// 手机号
const phone = ref('')
// 验证码
const code = ref('')
// 重新发送倒计时
const count = ref(0)
// 员工账号
const account = ref('')
// 员工密码
const password = ref('')
// 是否勾选同意协议
const agreed = ref(false)
// 登录中
const loading = ref(false)
let timer = null
// 离开页面时清掉定时器
onUnmounted(() => clearInterval(timer))

const demoAccounts = [
  { label: '管理员', account: 'admin', password: 'admin123' },
  { label: '客服', account: 'kefu01', password: '123456' },
  { label: '护航', account: 'hh01', password: '123456' },
  { label: '公司负责人', account: 'boss', password: 'boss123' }
]

// 打开用户协议 / 隐私政策
const readAgree = (type) => uni.navigateTo({ url: `/pages/user/agreement?type=${type}` })
// 没勾选协议时提示
function checkAgree() {
  if (!agreed.value) toast('请先阅读并同意用户协议和隐私政策')
  return agreed.value
}

/** 登录成功：用户回到刚才的页面，员工直接进自己的工作台 */
function finish(u) {
  setSession(u)
  if (u.role !== 'user') return goHome(u)
  toast('登录成功', 'success')
  setTimeout(() => (getCurrentPages().length > 1 ? uni.navigateBack() : goHome(u)), 500)
}

// 微信登录：第一次登录的需要去绑定手机号
async function onWxLogin(opts = {}) {
  if (!checkAgree()) return
  loading.value = true
  // 真实环境：先 uni.login({ provider: 'weixin' }) 拿 code，再交给后端换 openid
  const r = await run(wxLogin(opts))
  loading.value = false
  if (!r) return
  if (r.needPhone) { setSession(r.user); return uni.redirectTo({ url: '/pages/login/bind-phone' }) }
  finish(r.user)
}

// 发送短信验证码
async function send() {
  const r = await run(sendSmsCode(phone.value))
  if (!r) return
  toast(r.demoCode ? `验证码已发送（测试环境：${r.demoCode}）` : '验证码已发送')
  count.value = 60
  timer = setInterval(() => { count.value--; if (count.value <= 0) clearInterval(timer) }, 1000)
}

// 手机号 + 验证码登录
async function onPhoneLogin() {
  if (!checkAgree()) return
  if (code.value.length !== 6) return toast('请输入 6 位验证码')
  loading.value = true
  const u = await run(phoneLogin(phone.value, code.value))
  loading.value = false
  if (u) finish(u)
}

// 员工账号密码登录
async function onPwdLogin() {
  if (!checkAgree()) return
  if (!account.value || !password.value) return toast('请输入账号和密码')
  loading.value = true
  const u = await run(staffLogin(account.value, password.value))
  loading.value = false
  if (u) finish(u)
}

// 点演示账号自动填入
function fill(a) {
  tab.value = 'pwd'
  account.value = a.account
  password.value = a.password
  agreed.value = true
}
// 用演示老板账号登录
function demoUser() {
  agreed.value = true
  tab.value = 'wx'
  onWxLogin({ openid: 'seed-openid' })
}
</script>

<style scoped>
.page { padding: 28rpx 32rpx 60rpx; }
.brand { margin-bottom: 36rpx; }
.hero { width: 100%; height: 250rpx; border-radius: 40rpx; display: block; box-shadow: 0 24rpx 68rpx rgba(40, 74, 132, 0.2); }
.title { margin-top: 32rpx; }
.tabs { margin-bottom: 24rpx; }
.panel { padding: 8rpx 30rpx 32rpx; }
.wx { background: #07C160; margin-top: 24rpx; }
.code-row { display: flex; gap: 16rpx; }
.code { flex: 1; }
.get { width: 200rpx; height: 88rpx; font-size: 24rpx; margin: 0; }
.submit { margin-top: 40rpx; }
.tip { display: block; text-align: center; font-size: 22rpx; margin-top: 24rpx; }
.agree { display: flex; align-items: center; justify-content: center; gap: 12rpx; margin-top: 32rpx; font-size: 22rpx; }
.check { width: 32rpx; height: 32rpx; border-radius: 50%; border: 2rpx solid #A2B3CC; font-size: 20rpx; display: flex; align-items: center; justify-content: center; color: #FFFFFF; flex-shrink: 0; }
.check.on { background: linear-gradient(110deg, #4B73BA, #7CA1E5); border-color: #527AC3; }
.lk { color: #4B72B8; }
.demo { margin-top: 44rpx; padding: 24rpx 28rpx; border: 2rpx dashed #C9D8F2; background: #F4F7FF; box-shadow: none; }
.demo-title { font-size: 23rpx; font-weight: 700; }
.demo-row { display: flex; justify-content: space-between; padding: 16rpx 0; font-size: 24rpx; border-bottom: 2rpx solid #E4ECFA; }
.demo-note { display: block; font-size: 21rpx; margin-top: 12rpx; }
</style>
