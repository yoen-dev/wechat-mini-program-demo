<!--
  【所有员工】账号设置：护航可编辑展示给老板的资料（段位、擅长地图、简介），所有员工都可以改密码和退出登录。
-->
<template>
  <view v-if="me" class="wrap">
    <view class="blk-banner person">
      <view class="pav">{{ me.name.slice(0, 1) }}</view>
      <view>
        <text class="b-t">{{ me.name }}</text>
        <text class="b-s">{{ ROLE_NAME[me.role] }} · 账号 {{ me.account }}{{ esc && esc.rating ? ' · 评分 ' + esc.rating : '' }}</text>
      </view>
    </view>

    <!-- 护航：资料（老板指定护航时看得到）和评价 -->
    <template v-if="me.role === 'escort' && esc">
      <view class="section"><text class="s-t">我的主页</text><text class="s-more">老板指定护航时能看到</text></view>
      <view class="card form">
        <text class="label">段位</text>
        <input class="input" v-model="pf.rank" placeholder="如：巅峰 · 绝密常客" />
        <text class="label">擅长地图</text>
        <input class="input" v-model="pf.maps" placeholder="如：航天基地 / 巴克什" />
        <text class="label">简介</text>
        <textarea class="input area" v-model="pf.intro" placeholder="介绍一下自己的风格和在线时间" auto-height />
        <button class="btn submit" @tap="saveProf">保存资料</button>
      </view>

      <view class="section"><text class="s-t">老板评价</text><text class="s-more">{{ esc.rating ? esc.rating + ' 分 · ' : '' }}{{ esc.ratingCount }} 条</text></view>
      <view class="card">
        <view class="rv" v-for="r in esc.reviews.slice(0, 20)" :key="r.orderId">
          <view class="between"><text class="stars">{{ r.stars }}</text><text class="muted rt">{{ fmtTime(r.t) }}</text></view>
          <text class="rx">{{ r.text || '（没有写评价内容）' }}</text>
          <text class="muted rt">{{ r.productName }} · #{{ r.orderId }}</text>
        </view>
        <Empty v-if="!esc.reviews.length" text="还没有评价" />
      </view>
    </template>

    <view class="section"><text class="s-t">修改密码</text></view>
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

// 当前登录的员工
const me = computed(() => session.user)
// 原密码
const oldPwd = ref('')
// 新密码
const newPwd = ref('')
// 再次输入新密码
const newPwd2 = ref('')
// 是不是护航
const esc = ref(null)
// 护航资料表单
const pf = reactive({ rank: '', maps: '', intro: '' })

// 每次显示页面时刷新（从别的页面返回也会触发）
onShow(async () => {
  if (!guard(['escort', 'cs', 'admin', 'owner'])) return
  if (me.value.role === 'escort') {
    esc.value = await run(getEscort(me.value.id))
    if (esc.value) esc.value.reviews.forEach((r) => { r.stars = '★'.repeat(r.score) + '☆'.repeat(5 - r.score) })
    if (esc.value) Object.assign(pf, esc.value.profile || {})
  }
})

// 保存护航资料
async function saveProf() {
  if (await run(saveProfile(me.value, pf))) toast('已保存', 'success')
}
// 修改密码
async function submit() {
  if (newPwd.value !== newPwd2.value) return toast('两次输入的新密码不一致')
  if (await run(changePassword(me.value.id, oldPwd.value, newPwd.value))) {
    toast('密码已修改', 'success')
    oldPwd.value = newPwd.value = newPwd2.value = ''
  }
}
// 退出登录
async function onLogout() { if (await confirm('确定退出登录吗？')) logout() }
</script>

<style scoped>
.pav { width: 96rpx; height: 96rpx; border-radius: 32rpx; background: rgba(255, 255, 255, 0.2); border: 2rpx solid rgba(255, 255, 255, 0.4); color: #FFFFFF; font-size: 40rpx; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.form { padding: 8rpx 28rpx 32rpx; }
.area { height: auto; min-height: 140rpx; padding: 20rpx 24rpx; }
.submit { margin-top: 36rpx; }
.out { margin-top: 40rpx; }
.rv { padding: 24rpx 28rpx; display: flex; flex-direction: column; gap: 8rpx; }
.rv + .rv { border-top: 2rpx solid #E7EEF9; }
.stars { color: #E9B35B; font-size: 28rpx; letter-spacing: 4rpx; }
.rx { font-size: 24rpx; color: #5B6F92; }
.rt { font-size: 21rpx; }
</style>
