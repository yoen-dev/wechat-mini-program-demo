<template>
  <view v-if="me" class="wrap">
    <view class="card">
      <view class="list-row"><text class="muted">名字</text><text>{{ me.name }}</text></view>
      <view class="list-row"><text class="muted">角色</text><text>{{ ROLE_NAME[me.role] }}</text></view>
      <view class="list-row"><text class="muted">账号</text><text>{{ me.account }}</text></view>
    </view>

    <text class="sec-title sec">修改密码</text>
    <view class="card form">
      <text class="label">原密码</text>
      <input class="input" v-model="oldPwd" password placeholder="请输入原密码" />
      <text class="label">新密码</text>
      <input class="input" v-model="newPwd" password placeholder="至少 6 位" />
      <text class="label">确认新密码</text>
      <input class="input" v-model="newPwd2" password placeholder="再输入一次" />
      <button class="btn submit" @tap="submit">保存新密码</button>
    </view>

    <view class="btn danger out" @tap="onLogout">退出登录</view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { changePassword } from '@/api/auth.js'
import { ROLE_NAME } from '@/api/staff.js'
import { session, guard, logout } from '@/store/session.js'
import { run, toast, confirm } from '@/utils.js'

const me = computed(() => session.user)
const oldPwd = ref('')
const newPwd = ref('')
const newPwd2 = ref('')
onShow(() => guard(['escort', 'cs', 'admin']))

async function submit() {
  if (newPwd.value !== newPwd2.value) return toast('两次输入的新密码不一致')
  if (await run(changePassword(me.value.id, oldPwd.value, newPwd.value))) {
    toast('密码已修改', 'success')
    oldPwd.value = newPwd.value = newPwd2.value = ''
  }
}
async function onLogout() { if (await confirm('确定退出登录吗？')) logout() }
</script>

<style scoped>
.sec { display: block; margin: 36rpx 8rpx 16rpx; }
.form { padding: 8rpx 28rpx 32rpx; }
.submit { margin-top: 36rpx; }
.out { margin-top: 40rpx; }
</style>
