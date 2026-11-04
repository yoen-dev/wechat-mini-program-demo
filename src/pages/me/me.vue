<!--
  【老板】「我的」页：头像和余额、订单 / 优惠券 / 售后快捷入口、充值、成为护航、协议、退出登录。
-->
<template>
  <view class="wrap">
    <!-- 个人信息横幅：没登录时点一下去登录 -->
    <view class="blk-banner profile" @tap="!logged && login()">
      <view class="pav">{{ logged ? session.user.name.slice(0, 1) : 'B' }}</view>
      <view class="pt" v-if="logged">
        <text class="b-t">{{ session.user.name }}</text>
        <text class="b-s">{{ maskPhone(session.user.phone) }} · 欢迎来到 BLK电竞</text>
      </view>
      <view class="pt" v-else>
        <text class="b-t">登录 / 注册</text>
        <text class="b-s">登录后查看订单和余额</text>
      </view>
      <text class="b-s" v-if="!logged">❯</text>
    </view>

    <!-- 余额 -->
    <view class="metric wallet between" @tap="goLogged('/pages/user/recharge')">
      <view><text class="m-l">余额（元）</text><text class="m-v">{{ balance }}</text></view>
      <view class="btn sm">充值</view>
    </view>

    <!-- 快捷入口 -->
    <view class="grid4 quick">
      <view class="tile mini" v-for="q in quick" :key="q.t" @tap="q.go"><text class="ico">{{ ICON[q.t] || q.t.slice(0, 1) }}</text><text class="tt">{{ q.t }}</text></view>
    </view>

    <!-- 我的服务 -->
    <view class="section"><text class="s-t">我的服务</text></view>
    <view class="lrow" @tap="goLogged('/pages/user/apply')"><view><text class="l-t">成为护航</text><text class="l-s">报名加入 BLK</text></view><text class="chev">❯</text></view>
    <view class="lrow" @tap="goLogged('/pages/user/tickets')"><view><text class="l-t">投诉 / 售后</text><text class="l-s">售后申请记录</text></view><text class="chev">❯</text></view>
    <view class="lrow" @tap="toService"><view><text class="l-t">帮助中心</text><text class="l-s">客服与常见问题</text></view><text class="chev">❯</text></view>
    <view class="lrow" @tap="go('/pages/user/agreement?type=user')"><view><text class="l-t">用户协议</text></view><text class="chev">❯</text></view>
    <view class="lrow" @tap="go('/pages/user/agreement?type=privacy')"><view><text class="l-t">隐私政策</text></view><text class="chev">❯</text></view>
    <view class="lrow"><view><text class="l-t muted">陪玩</text></view><text class="chip grey">即将上线</text></view>

    <view class="lrow" v-if="logged" @tap="logout"><view><text class="l-t">退出登录</text></view><text class="chev">❯</text></view>
    <!-- 只有网页演示版显示：清空本机的模拟数据 -->
    <view class="lrow" v-if="IS_MOCK" @tap="reset"><view><text class="l-t muted">重置演示数据</text></view><text class="chev">❯</text></view>
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
// 快捷入口图标
const ICON = { 我的订单: '单', 优惠券: '券', 售后记录: '售', 收藏: '藏' }
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
.profile { display: flex; align-items: center; gap: 24rpx; }
.pav { width: 104rpx; height: 104rpx; border-radius: 34rpx; background: rgba(255, 255, 255, 0.2); border: 2rpx solid rgba(255, 255, 255, 0.4); color: #FFFFFF; font-size: 42rpx; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.pt { flex: 1; min-width: 0; }
.wallet { margin-bottom: 20rpx; }
.quick { margin-bottom: 4rpx; }
</style>
