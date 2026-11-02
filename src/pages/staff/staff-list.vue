<template>
  <view class="wrap">
    <view class="btn add" @tap="newStaff">＋ 新建员工账号</view>
    <scroll-view scroll-x class="filters">
      <view v-for="r in roles" :key="r.key" class="fchip" :class="{ on: r.key === role }" @tap="role = r.key">{{ r.name }}</view>
    </scroll-view>
    <view class="card srow" v-for="u in shown" :key="u.id">
      <view class="pt">
        <view class="row"><text class="pn">{{ u.name }}</text><text class="tag">{{ ROLE_NAME[u.role] }}</text><text class="tag off" v-if="u.status !== 'active'">已停用</text></view>
        <text class="muted pm">账号：{{ u.account }}</text>
      </view>
      <view class="btn sm ghost" @tap="reset(u)">重置密码</view>
      <view v-if="u.id !== me.id" class="btn sm" :class="u.status === 'active' ? 'danger' : ''" @tap="toggleUser(u)">{{ u.status === 'active' ? '停用' : '启用' }}</view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { listStaff, resetPassword, toggleStaff, ROLE_NAME } from '@/api/staff.js'
import { session, guard } from '@/store/session.js'
import { run, confirm } from '@/utils.js'

const me = computed(() => session.user)
const roles = [{ key: '', name: '全部' }, { key: 'escort', name: '护航' }, { key: 'cs', name: '客服' }, { key: 'admin', name: '管理员' }, { key: 'owner', name: '负责人' }]
const role = ref('')
const list = ref([])
const shown = computed(() => list.value.filter((u) => !role.value || u.role === role.value))
async function load() {
  if (!guard(['admin'])) return
  list.value = (await run(listStaff(me.value))) || []
}
onShow(load)
const newStaff = () => uni.navigateTo({ url: '/pages/staff/staff-edit' })
async function reset(u) {
  if (!(await confirm(`把 ${u.name} 的密码重置为 123456？`))) return
  if (await run(resetPassword(me.value, u.id))) uni.showModal({ title: '已重置', content: `账号：${u.account}\n新密码：123456\n请转告对方登录后修改`, showCancel: false })
}
async function toggleUser(u) {
  if (u.status === 'active' && !(await confirm(`停用后 ${u.name} 将无法登录，确定吗？`))) return
  if (await run(toggleStaff(me.value, u.id))) load()
}
</script>

<style scoped>
.add { margin-bottom: 16rpx; }
.filters { white-space: nowrap; margin-bottom: 16rpx; }
.fchip { display: inline-block; font-size: 24rpx; padding: 10rpx 22rpx; margin-right: 12rpx; border-radius: 30rpx; background: #FFFFFF; color: #595959; }
.fchip.on { background: #1F1F1F; color: #FFFFFF; }
.srow { display: flex; align-items: center; gap: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.pt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6rpx; }
.pt .row { gap: 10rpx; }
.pn { font-size: 28rpx; font-weight: 600; }
.pm { font-size: 22rpx; }
.off { background: #FFF1F0; color: #CF1322; }
</style>
