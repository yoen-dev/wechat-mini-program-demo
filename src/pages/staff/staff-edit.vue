<template>
  <view class="wrap">
    <view class="card form">
      <text class="label">角色</text>
      <view class="roles">
        <view v-for="r in roles" :key="r.key" class="choice role" :class="{ on: f.role === r.key }" @tap="f.role = r.key">
          <text class="rn">{{ r.name }}</text><text class="muted rd">{{ r.desc }}</text>
        </view>
      </view>
      <text class="label">名字（显示给老板看）</text>
      <input class="input" v-model="f.name" placeholder="如：护航 阿峰" />
      <text class="label">登录账号</text>
      <input class="input" v-model="f.account" placeholder="3-20 位字母、数字或下划线" />
      <text class="label">初始密码</text>
      <input class="input" v-model="f.password" placeholder="至少 6 位" />
    </view>
    <button class="btn save" :loading="busy" @tap="submit">创建账号</button>
    <text class="muted note">创建后把账号和初始密码发给对方，对方在「我的 → 员工登录」里登录，登录后可在「账号设置」修改密码。</text>
  </view>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { createStaff } from '@/api/staff.js'
import { session, guard } from '@/store/session.js'
import { run } from '@/utils.js'

const roles = [
  { key: 'escort', name: '护航', desc: '接单、打单' },
  { key: 'cs', name: '客服', desc: '派单、退款' },
  { key: 'admin', name: '管理员', desc: '全部权限' }
]
const f = reactive({ role: 'escort', name: '', account: '', password: '' })
const busy = ref(false)
onLoad(() => guard(['admin']))

async function submit() {
  busy.value = true
  const u = await run(createStaff(session.user, { ...f }))
  busy.value = false
  if (!u) return
  uni.showModal({
    title: '账号已创建', showCancel: false,
    content: `角色：${roles.find((r) => r.key === u.role).name}\n账号：${u.account}\n初始密码：${f.password}`,
    success: () => uni.navigateBack()
  })
}
</script>

<style scoped>
.form { padding: 8rpx 28rpx 32rpx; }
.roles { display: flex; gap: 12rpx; }
.role { flex: 1; display: flex; flex-direction: column; gap: 4rpx; padding: 18rpx 16rpx; }
.rn { font-size: 28rpx; font-weight: 600; }
.rd { font-size: 20rpx; }
.save { margin-top: 32rpx; }
.note { display: block; font-size: 22rpx; margin: 20rpx 8rpx; line-height: 1.6; }
</style>
