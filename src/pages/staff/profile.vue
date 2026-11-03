<template>
  <view v-if="me" class="wrap">
    <view class="card">
      <view class="list-row"><text class="muted">名字</text><text>{{ me.name }}</text></view>
      <view class="list-row"><text class="muted">角色</text><text>{{ ROLE_NAME[me.role] }}</text></view>
      <view class="list-row"><text class="muted">账号</text><text>{{ me.account }}</text></view>
    </view>

    <!-- 护航：资料（老板指定护航时看得到）和评价 -->
    <template v-if="me.role === 'escort' && esc">
      <text class="sec-title sec">我的主页 <text class="muted small">老板指定护航时能看到</text></text>
      <view class="card form">
        <text class="label">段位</text>
        <input class="input" v-model="pf.rank" placeholder="如：巅峰 · 绝密常客" />
        <text class="label">擅长地图</text>
        <input class="input" v-model="pf.maps" placeholder="如：航天基地 / 巴克什" />
        <text class="label">简介</text>
        <textarea class="input area" v-model="pf.intro" placeholder="介绍一下自己的风格和在线时间" auto-height />
        <button class="btn submit" @tap="saveProf">保存资料</button>
      </view>

      <text class="sec-title sec">老板评价 <text class="muted small">{{ esc.rating ? esc.rating + ' 分 · ' : '' }}{{ esc.ratingCount }} 条</text></text>
      <view class="card">
        <view class="rv" v-for="r in esc.reviews.slice(0, 20)" :key="r.orderId">
          <view class="between"><text class="stars">{{ r.stars }}</text><text class="muted rt">{{ fmtTime(r.t) }}</text></view>
          <text class="rx">{{ r.text || '（没有写评价内容）' }}</text>
          <text class="muted rt">{{ r.productName }} · #{{ r.orderId }}</text>
        </view>
        <Empty v-if="!esc.reviews.length" text="还没有评价" />
      </view>
    </template>

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
import { ref, reactive, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { changePassword } from '@api/auth.js'
import { ROLE_NAME, getEscort, saveProfile } from '@api/staff.js'
import { session, guard, logout } from '@/store/session.js'
import { run, toast, confirm, fmtTime } from '@/utils.js'
import Empty from '@/components/Empty.vue'

const me = computed(() => session.user)
const oldPwd = ref('')
const newPwd = ref('')
const newPwd2 = ref('')
const esc = ref(null)
const pf = reactive({ rank: '', maps: '', intro: '' })

onShow(async () => {
  if (!guard(['escort', 'cs', 'admin', 'owner'])) return
  if (me.value.role === 'escort') {
    esc.value = await run(getEscort(me.value.id))
    if (esc.value) esc.value.reviews.forEach((r) => { r.stars = '★'.repeat(r.score) + '☆'.repeat(5 - r.score) })
    if (esc.value) Object.assign(pf, esc.value.profile || {})
  }
})

async function saveProf() {
  if (await run(saveProfile(me.value, pf))) toast('已保存', 'success')
}
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
.small { font-size: 22rpx; font-weight: 400; margin-left: 8rpx; }
.form { padding: 8rpx 28rpx 32rpx; }
.area { height: auto; min-height: 140rpx; padding: 20rpx 24rpx; }
.submit { margin-top: 36rpx; }
.out { margin-top: 40rpx; }
.rv { padding: 24rpx 28rpx; display: flex; flex-direction: column; gap: 8rpx; }
.rv + .rv { border-top: 2rpx solid #F0F0F0; }
.stars { color: #FAAD14; font-size: 28rpx; letter-spacing: 4rpx; }
.rx { font-size: 26rpx; }
.rt { font-size: 22rpx; }
</style>
