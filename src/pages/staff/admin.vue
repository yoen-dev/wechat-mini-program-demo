<template>
  <view v-if="me">
    <StaffHead :user="me" />
    <view class="wrap">
      <view class="seg">
        <view v-for="t in tabs" :key="t" class="seg-item" :class="{ on: t === tab }" @tap="switchTab(t)">{{ t }}</view>
      </view>

      <!-- 概览 -->
      <view v-if="tab === '概览' && stats" class="sec">
        <view class="grid">
          <view class="card stat"><text class="muted sl">今日订单</text><text class="sv">{{ stats.todayOrders }}</text></view>
          <view class="card stat"><text class="muted sl">今日收入</text><text class="sv">¥{{ stats.todayIncome }}</text></view>
          <view class="card stat"><text class="muted sl">累计订单</text><text class="sv">{{ stats.totalOrders }}</text></view>
          <view class="card stat"><text class="muted sl">累计收入</text><text class="sv">¥{{ stats.totalIncome }}</text></view>
        </view>
        <view class="card todo">
          <view class="list-row" @tap="goCs"><text>待派单</text><text class="sub">{{ stats.waitDispatch }} 单 ›</text></view>
          <view class="list-row" @tap="goCs"><text>待处理退款</text><text class="sub">{{ stats.refunding }} 单 ›</text></view>
          <view class="list-row"><text>进行中</text><text class="sub">{{ stats.inProgress }} 单</text></view>
          <view class="list-row"><text>注册用户</text><text class="sub">{{ stats.users }} 人</text></view>
        </view>
        <text class="muted note">收入不含已退款订单。派单、退款可以在「订单」里处理，或进入客服工作台。</text>
      </view>

      <!-- 订单 -->
      <view v-if="tab === '订单'" class="sec">
        <scroll-view scroll-x class="filters">
          <view v-for="s in ['全部', ...STATUS]" :key="s" class="fchip" :class="{ on: s === status }" @tap="status = s">{{ s }}</view>
        </scroll-view>
        <OrderCard v-for="o in shownOrders" :key="o.id" :order="o" show-user @open="openOrder">
          <view v-for="b in actionsFor(o, me)" :key="b.key" class="btn sm" :class="{ ghost: b.ghost }" @tap="act(b.key, o)">{{ b.label }}</view>
        </OrderCard>
        <Empty v-if="!shownOrders.length" text="暂无订单" />
      </view>

      <!-- 单子 -->
      <view v-if="tab === '单子'" class="sec">
        <view class="btn add" @tap="editProduct()">＋ 新建单子</view>
        <view class="card prow" v-for="p in products" :key="p.id">
          <view class="pt">
            <view class="row"><text class="pn">{{ p.name }}</text><text class="tag off" v-if="!p.onSale">已下架</text></view>
            <text class="muted pm">¥{{ p.price }} · {{ p.cats.join(' / ') || '未分类' }}</text>
          </view>
          <view class="btn sm ghost" @tap="toggle(p)">{{ p.onSale ? '下架' : '上架' }}</view>
          <view class="btn sm" @tap="editProduct(p.id)">编辑</view>
        </view>
      </view>

      <!-- 轮播图 -->
      <view v-if="tab === '轮播图'" class="sec">
        <view class="btn add" :class="{ disabled: banners.length >= MAX_BANNERS }" @tap="addImg">＋ 添加图片（{{ banners.length }}/{{ MAX_BANNERS }}）</view>
        <text class="muted note top">显示在用户首页搜索框下方，按这里的顺序轮播。推荐尺寸 1080 × 450，其他比例会居中裁切。</text>
        <view class="card brow" v-for="(b, i) in banners" :key="b.id">
          <image class="bthumb" :src="b.url" mode="aspectFill" @tap="previewBanner(i)" />
          <view class="bt">
            <text class="pn ellipsis" @tap="rename(b)">{{ i + 1 }}. {{ b.title }}</text>
            <view class="bops">
              <view class="btn sm ghost" :class="{ disabled: i === 0 }" @tap="move(b, -1)">上移</view>
              <view class="btn sm ghost" :class="{ disabled: i === banners.length - 1 }" @tap="move(b, 1)">下移</view>
              <view class="btn sm danger" @tap="delImg(b)">删除</view>
            </view>
          </view>
        </view>
        <Empty v-if="!banners.length" text="还没有图片，首页将不显示轮播" />
      </view>

      <!-- 员工 -->
      <view v-if="tab === '员工'" class="sec">
        <view class="btn add" @tap="newStaff">＋ 新建员工账号</view>
        <view class="card srow" v-for="u in staff" :key="u.id">
          <view class="pt">
            <view class="row"><text class="pn">{{ u.name }}</text><text class="tag">{{ ROLE_NAME[u.role] }}</text><text class="tag off" v-if="u.status !== 'active'">已停用</text></view>
            <text class="muted pm">账号：{{ u.account }}</text>
          </view>
          <view class="btn sm ghost" @tap="reset(u)">重置密码</view>
          <view v-if="u.id !== me.id" class="btn sm" :class="u.status === 'active' ? 'danger' : ''" @tap="toggleUser(u)">{{ u.status === 'active' ? '停用' : '启用' }}</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { listOrders, getStats, STATUS } from '@/api/orders.js'
import { listProducts, toggleSale } from '@/api/products.js'
import { listStaff, resetPassword, toggleStaff, ROLE_NAME } from '@/api/staff.js'
import { session, guard } from '@/store/session.js'
import { actionsFor, doAction } from '@/orderActions.js'
import { run, toast, confirm, pickImage } from '@/utils.js'
import { listBanners, addBanner, removeBanner, moveBanner, renameBanner, MAX_BANNERS } from '@/api/banners.js'
import StaffHead from '@/components/StaffHead.vue'
import OrderCard from '@/components/OrderCard.vue'
import Empty from '@/components/Empty.vue'

const me = computed(() => session.user)
const tabs = ['概览', '订单', '单子', '轮播图', '员工']
const banners = ref([])
const tab = ref('概览')
const stats = ref(null)
const orders = ref([])
const status = ref('全部')
const products = ref([])
const staff = ref([])
const shownOrders = computed(() => orders.value.filter((o) => status.value === '全部' || o.status === status.value))

async function load() {
  if (!guard(['admin'])) return
  if (tab.value === '概览') stats.value = await run(getStats(me.value))
  if (tab.value === '订单') orders.value = (await run(listOrders(me.value, { scope: 'all' }))) || []
  if (tab.value === '单子') products.value = (await run(listProducts({ includeOff: true }))) || []
  if (tab.value === '员工') staff.value = (await run(listStaff(me.value))) || []
  if (tab.value === '轮播图') banners.value = (await run(listBanners())) || []
}
function switchTab(t) { tab.value = t; load() }
onShow(load)
onPullDownRefresh(async () => { await load(); uni.stopPullDownRefresh() })

const goCs = () => switchTab('订单')
const openOrder = (id) => uni.navigateTo({ url: `/pages/order/order?id=${id}` })
async function act(key, o) { if (await doAction(key, o, me.value)) load() }

const editProduct = (id) => uni.navigateTo({ url: '/pages/staff/product-edit' + (id ? `?id=${id}` : '') })
async function toggle(p) { if (await run(toggleSale(p.id))) { toast(p.onSale ? '已下架' : '已上架'); load() } }

const newStaff = () => uni.navigateTo({ url: '/pages/staff/staff-edit' })
async function reset(u) {
  if (!(await confirm(`把 ${u.name} 的密码重置为 123456？`))) return
  if (await run(resetPassword(me.value, u.id))) uni.showModal({ title: '已重置', content: `账号：${u.account}\n新密码：123456\n请转告对方登录后修改`, showCancel: false })
}
async function toggleUser(u) {
  if (u.status === 'active' && !(await confirm(`停用后 ${u.name} 将无法登录，确定吗？`))) return
  if (await run(toggleStaff(me.value, u.id))) load()
}

// ---- 轮播图 ----
async function addImg() {
  if (banners.value.length >= MAX_BANNERS) return toast(`最多 ${MAX_BANNERS} 张`)
  const src = await pickImage()
  if (!src) return
  if (await run(addBanner(me.value, { src }))) { toast('已添加', 'success'); load() }
}
async function delImg(b) {
  if (!(await confirm(`删除「${b.title}」？`))) return
  if (await run(removeBanner(me.value, b.id))) load()
}
async function move(b, dir) { if (await run(moveBanner(me.value, b.id, dir))) load() }
function rename(b) {
  uni.showModal({
    title: '图片名称', editable: true, content: b.title, placeholderText: '仅后台显示，方便区分',
    success: async (r) => { if (r.confirm && (await run(renameBanner(me.value, b.id, r.content)))) load() }
  })
}
const previewBanner = (i) => uni.previewImage({ urls: banners.value.map((x) => x.url), current: i })
</script>

<style scoped>
.sec { margin-top: 20rpx; }
.grid { display: flex; flex-wrap: wrap; gap: 16rpx; }
.stat { width: calc(50% - 8rpx); padding: 28rpx; box-sizing: border-box; display: flex; flex-direction: column; gap: 8rpx; }
.sl { font-size: 24rpx; }
.sv { font-size: 44rpx; font-weight: 700; }
.todo { margin-top: 20rpx; }
.note { display: block; font-size: 22rpx; margin: 20rpx 8rpx; line-height: 1.6; }
.filters { white-space: nowrap; margin-bottom: 16rpx; }
.fchip { display: inline-block; font-size: 24rpx; padding: 10rpx 22rpx; margin-right: 12rpx; border-radius: 30rpx; background: #FFFFFF; color: #595959; }
.fchip.on { background: #1F1F1F; color: #FFFFFF; }
.add { margin-bottom: 20rpx; }
.prow, .srow { display: flex; align-items: center; gap: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.pt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6rpx; }
.pt .row { gap: 10rpx; }
.pn { font-size: 28rpx; font-weight: 600; }
.pm { font-size: 22rpx; }
.off { background: #FFF1F0; color: #CF1322; }
.note.top { margin: 0 8rpx 20rpx; }
.brow { display: flex; gap: 20rpx; padding: 20rpx; margin-bottom: 16rpx; }
.bthumb { width: 240rpx; height: 100rpx; border-radius: 10rpx; background: #E8E8E8; flex-shrink: 0; }
.bt { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: space-between; gap: 12rpx; }
.bops { display: flex; gap: 10rpx; }
.bops .btn { padding: 0 18rpx; }
</style>
