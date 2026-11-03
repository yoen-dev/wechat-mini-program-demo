<!--
  【老板】「我的」页：头像和余额、订单 / 优惠券 / 售后快捷入口、充值、成为护航、协议、退出登录。
-->
<template>
  <view class="wrap">
    <view class="card profile" @tap="!logged && login()">
      <view class="avatar">{{ logged ? session.user.name.slice(0, 1) : '?' }}</view>
      <view class="pt" v-if="logged">
        <text class="pn">{{ session.user.name }}</text>
        <text class="muted">{{ maskPhone(session.user.phone) }}</text>
      </view>
      <view class="pt" v-else>
        <text class="pn">登录 / 注册</text>
        <text class="muted">登录后查看订单和余额</text>
      </view>
      <text class="arrow" v-if="!logged">›</text>
    </view>

    <view class="card wallet between" @tap="goLogged('/pages/user/recharge')">
      <view><text class="muted wl">余额（元）</text><text class="wn">{{ balance }}</text></view>
      <view class="btn sm">充值</view>
    </view>

    <view class="card quick">
      <view class="q" v-for="q in quick" :key="q.t" @tap="q.go"><view class="qi">{{ q.t.slice(0, 1) }}</view><text>{{ q.t }}</text></view>
    </view>

    <view class="card menu">
      <view class="list-row" @tap="goLogged('/pages/user/apply')"><text>成为护航</text><text class="arrow">›</text></view>
      <view class="list-row" @tap="goLogged('/pages/user/tickets')"><text>投诉 / 售后</text><text class="arrow">›</text></view>
      <view class="list-row" @tap="toService"><text>帮助中心</text><text class="arrow">›</text></view>
      <view class="list-row" @tap="go('/pages/user/agreement?type=user')"><text>用户协议</text><text class="arrow">›</text></view>
      <view class="list-row" @tap="go('/pages/user/agreement?type=privacy')"><text>隐私政策</text><text class="arrow">›</text></view>
      <view class="list-row"><text class="muted">陪玩</text><text class="muted">即将上线</text></view>
    </view>

    <view class="card menu">
      <view class="list-row" v-if="logged" @tap="logout"><text>退出登录</text><text class="arrow">›</text></view>
      <!-- 只有网页演示版显示：清空本机的模拟数据 -->
      <view class="list-row" v-if="IS_MOCK" @tap="reset"><text class="muted">重置演示数据</text><text class="arrow">›</text></view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getWallet } from '@api/wallet.js'
import { session, logout, needUserLogin } from '@/store/session.js'
import { resetDb } from '@api/db.js'
import { IS_MOCK } from '@/api/constants.js'
import { maskPhone, toast, confirm } from '@/utils.js'

// 是否已用老板身份登录
const logged = computed(() => session.user && session.user.role === 'user')
// 余额（显示用，两位小数）
const balance = ref('0.00')
// 每次显示页面时刷新（从别的页面返回也会触发）
onShow(async () => {
  if (!logged.value) { balance.value = '0.00'; return }
  const w = await getWallet(session.user).catch(() => null)
  balance.value = w ? w.balance.toFixed(2) : '0.00'
})
// 去登录
const login = () => uni.navigateTo({ url: '/pages/login/login' })
// 切到客服页
const toService = () => uni.switchTab({ url: '/pages/service/service' })
// 切到订单页
const toOrders = () => uni.switchTab({ url: '/pages/orders/orders' })
// 还没做的功能
const soon = () => toast('敬请期待')
// 跳转到对应页面
const go = (url) => uni.navigateTo({ url })
// 需要登录的入口：没登录先去登录
const goLogged = (url) => needUserLogin() && go(url)
const quick = [
  { t: '我的订单', go: toOrders }, { t: '优惠券', go: () => goLogged('/pages/user/coupons') },
  { t: '售后记录', go: () => goLogged('/pages/user/tickets') }, { t: '收藏', go: soon }
]
// 重置演示数据（只有网页演示版有）
async function reset() {
  if (!(await confirm('清空本机所有演示订单和新建账号，恢复初始数据？'))) return
  resetDb()
  logout()
}
</script>

<style scoped>
.profile { display: flex; align-items: center; gap: 24rpx; padding: 32rpx; }
.avatar { width: 112rpx; height: 112rpx; border-radius: 50%; background: #1F1F1F; color: #FFFFFF; font-size: 40rpx; display: flex; align-items: center; justify-content: center; }
.pt { flex: 1; display: flex; flex-direction: column; gap: 8rpx; }
.pn { font-size: 34rpx; font-weight: 700; }
.wallet { margin-top: 20rpx; padding: 28rpx 32rpx; }
.wl { display: block; font-size: 24rpx; }
.wn { font-size: 44rpx; font-weight: 700; }
.quick { margin-top: 20rpx; display: flex; padding: 28rpx 0; }
.q { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 10rpx; font-size: 24rpx; }
.qi { width: 72rpx; height: 72rpx; border-radius: 20rpx; background: #F5F5F5; display: flex; align-items: center; justify-content: center; font-weight: 700; }
.menu { margin-top: 20rpx; }
</style>
