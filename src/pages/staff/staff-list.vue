<!--
  【管理员】员工账号列表：按身份筛选、新建、重置密码（随机生成）、停用 / 启用。
-->
<template>
  <view class="wrap">
    <view class="btn add" @tap="newStaff">＋ 新建员工账号</view>
    <scroll-view scroll-x class="tabsline" :show-scrollbar="false">
      <view v-for="r in roles" :key="r.key" class="tb" :class="{ on: r.key === role }" @tap="role = r.key">{{ r.name }}</view>
    </scroll-view>
    <view class="card srow" v-for="u in shown" :key="u.id">
      <view class="person pt">
        <view class="avatar">{{ u.name.slice(0, 1) }}</view>
        <view class="pin">
          <view class="row"><text class="p-n">{{ u.name }}</text><text class="chip">{{ ROLE_NAME[u.role] }}</text><text class="chip red" v-if="u.status !== 'active'">已停用</text></view>
          <text class="p-s">账号：{{ u.account }}</text>
        </view>
      </view>
      <view class="btn sm light" @tap="reset(u)">重置密码</view>
      <view v-if="u.id !== me.id" class="btn sm" :class="u.status === 'active' ? 'danger' : ''" @tap="toggleUser(u)">{{ u.status === 'active' ? '停用' : '启用' }}</view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { listStaff, resetPassword, toggleStaff, ROLE_NAME } from '@api/staff.js'
import { session, guard } from '@/store/session.js'
import { run, confirm } from '@/utils.js'

// 当前登录的员工
const me = computed(() => session.user)
const roles = [{ key: '', name: '全部' }, { key: 'escort', name: '护航' }, { key: 'cs', name: '客服' }, { key: 'admin', name: '管理员' }, { key: 'owner', name: '负责人' }]
// 当前筛选的身份
const role = ref('')
// 列表数据
const list = ref([])
// 当前标签页要显示的列表
const shown = computed(() => list.value.filter((u) => !role.value || u.role === role.value))
// 加载页面数据
async function load() {
  if (!guard(['admin'])) return
  list.value = (await run(listStaff(me.value))) || []
}
// 每次显示页面时刷新（从别的页面返回也会触发）
onShow(load)
// 新建员工
const newStaff = () => uni.navigateTo({ url: '/pages/staff/staff-edit' })
// 重置密码：后端随机生成新密码并弹窗显示
async function reset(u) {
  if (!(await confirm(`重置 ${u.name} 的密码？对方需要用新密码重新登录。`))) return
  const r = await run(resetPassword(me.value, u.id))
  if (r) uni.showModal({ title: '已重置', content: `账号：${u.account}\n新密码：${r.password}\n请转告对方登录后修改`, showCancel: false })
}
// 停用 / 启用账号（停用后立刻无法登录）
async function toggleUser(u) {
  if (u.status === 'active' && !(await confirm(`停用后 ${u.name} 将无法登录，确定吗？`))) return
  if (await run(toggleStaff(me.value, u.id))) load()
}
</script>

<style scoped>
.add { margin-bottom: 22rpx; }
.srow { display: flex; align-items: center; gap: 14rpx; padding: 26rpx; margin-bottom: 18rpx; }
.pt { flex: 1; min-width: 0; }
.pin { min-width: 0; }
.row { gap: 8rpx; flex-wrap: wrap; }
.chip { padding: 4rpx 12rpx; }
</style>
