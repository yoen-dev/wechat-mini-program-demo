<!--
  【负责人 / 管理员】经营数据（只看不改）：实收、成交、退款、分成、毛利、每日趋势、储值、用户、单子排行、护航和客服表现。
-->
<template>
  <view v-if="me">
    <StaffHead v-if="me.role === 'owner'" :user="me" />
    <view class="wrap">
      <!-- 时间范围 -->
      <view class="tabsline">
        <view v-for="r in ranges" :key="r.d" class="tb" :class="{ on: r.d === days }" @tap="setDays(r.d)">{{ r.name }}</view>
      </view>

      <view v-if="a">
        <!-- 流水 -->
        <view class="blk-banner">
          <text class="b-s">{{ rangeName }} · 实收（成交 − 退款）</text>
          <text class="b-big">¥{{ a.money.net }}</text>
          <text class="b-s" v-if="a.vs.net !== null">{{ a.vs.net >= 0 ? '↑' : '↓' }} {{ abs(a.vs.net) }}% 较上一个{{ rangeName }}</text>
        </view>
        <view class="grid3">
          <view class="metric"><text class="m-l">成交额</text><text class="m-v">¥{{ a.money.gmv }}</text></view>
          <view class="metric"><text class="m-l">退款</text><text class="m-v">¥{{ a.money.refund }}</text></view>
          <view class="metric"><text class="m-l">护航分成</text><text class="m-v">¥{{ a.money.share }}</text></view>
          <view class="metric"><text class="m-l">毛利</text><text class="m-v">¥{{ a.money.profit }}</text></view>
          <view class="metric"><text class="m-l">订单数</text><text class="m-v">{{ a.money.orders }}</text></view>
          <view class="metric"><text class="m-l">客单价</text><text class="m-v">¥{{ a.users.avgOrder }}</text></view>
        </view>

        <!-- 趋势 -->
        <view v-if="days > 1" class="card block">
          <view class="between"><text class="card-t">每日实收趋势</text><text class="muted small">最高 ¥{{ maxNet }}</text></view>
          <view class="chart">
            <view class="bar-col" v-for="(t, i) in a.trend" :key="i">
              <view class="bar" :style="{ height: barH(t.net) }"></view>
              <text class="bl">{{ showLabel(i) ? t.label : '' }}</text>
            </view>
          </view>
        </view>

        <!-- 储值 -->
        <view class="card block">
          <text class="card-t">储值充值</text>
          <view class="ugrid">
            <view><text class="uv">¥{{ a.recharge.pay }}</text><text class="muted ul">充值金额</text></view>
            <view><text class="uv">¥{{ a.recharge.bonus }}</text><text class="muted ul">赠送金额</text></view>
            <view><text class="uv">{{ a.recharge.count }}</text><text class="muted ul">充值笔数（{{ a.recharge.users }} 人）</text></view>
            <view><text class="uv">¥{{ a.recharge.balancePaid }}</text><text class="muted ul">余额消费</text></view>
            <view><text class="uv">¥{{ a.recharge.balanceTotal }}</text><text class="muted ul">用户余额总额</text></view>
          </view>
          <text class="muted foot">充值是预收款，用户用余额下单时才计入成交额；「用户余额总额」是还没用掉、将来可能要兑现或退还的钱。</text>
        </view>

        <!-- 用户 -->
        <view class="card block">
          <text class="card-t">用户</text>
          <view class="ugrid">
            <view><text class="uv">{{ a.users.newUsers }}</text><text class="muted ul">新增用户</text></view>
            <view><text class="uv">{{ a.users.active }}</text><text class="muted ul">活跃用户</text></view>
            <view><text class="uv">{{ a.users.buyers }}</text><text class="muted ul">下单人数</text></view>
            <view><text class="uv">{{ a.users.repeatRate }}%</text><text class="muted ul">复购率</text></view>
            <view><text class="uv">¥{{ a.users.arpu }}</text><text class="muted ul">人均消费</text></view>
            <view><text class="uv">{{ a.users.total }}</text><text class="muted ul">累计用户</text></view>
          </view>
          <text class="muted foot">活跃 = 期间内登录或下单过；复购率 = 下单 2 次及以上的人数 / 下单人数</text>
        </view>

        <!-- 消费排行 -->
        <view class="card block">
          <text class="card-t">消费排行</text>
          <view class="rank" v-for="(u, i) in a.topSpenders" :key="u.id">
            <text :class="['ri', i < 3 ? 'top' : '']">{{ i + 1 }}</text>
            <view class="rt"><text class="rn">{{ u.name }}</text><text class="muted small">{{ u.orders }} 单 · 最近 {{ fmtTime(u.last) }}</text></view>
            <text class="price">¥{{ u.spent }}</text>
          </view>
          <text v-if="!a.topSpenders.length" class="muted small">这段时间没有消费</text>
        </view>

        <!-- 单子 -->
        <view class="card block">
          <text class="card-t">单子销售</text>
          <view class="pr" v-for="p in a.products" :key="p.name">
            <view class="between"><text>{{ p.name }}</text><text class="muted small">{{ p.count }} 单 · ¥{{ p.revenue }} · {{ p.share }}%</text></view>
            <view class="track"><view class="fill" :style="{ width: p.share + '%' }"></view></view>
          </view>
        </view>

        <!-- 护航 -->
        <view class="card block">
          <text class="card-t">护航表现</text>
          <view class="th"><text class="c1">护航</text><text class="c">完成</text><text class="c">完成率</text><text class="c">退款率</text><text class="c">评分</text><text class="c2">收入</text></view>
          <view class="tr" v-for="e in a.escorts" :key="e.id">
            <text class="c1 ellipsis">{{ e.name.replace('护航 ', '') }}</text><text class="c">{{ e.done }}</text><text class="c">{{ e.completion }}%</text>
            <text class="c">{{ e.refundRate }}%</text><text class="c">{{ e.rating || '—' }}</text><text class="c2">¥{{ e.income }}</text>
          </view>
        </view>

        <!-- 客服 -->
        <view class="card block">
          <text class="card-t">客服</text>
          <view class="ugrid">
            <view><text class="uv">{{ a.cs.avgDispatchMin === null ? '—' : a.cs.avgDispatchMin + ' 分' }}</text><text class="muted ul">平均派单用时</text></view>
            <view><text class="uv">{{ a.cs.refundsHandled }}</text><text class="muted ul">处理退款</text></view>
            <view><text class="uv">{{ a.cs.ticketsOpen }}</text><text class="muted ul">未解决工单</text></view>
          </view>
        </view>
        <text class="muted foot">数据只读。如需处理订单或修改设置，请使用管理员账号。</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { getAnalytics } from '@api/analytics.js'
import { session, guard } from '@/store/session.js'
import { run, fmtTime } from '@/utils.js'
import StaffHead from '@/components/StaffHead.vue'

// 当前登录的员工
const me = computed(() => session.user)
const ranges = [{ d: 1, name: '今天' }, { d: 7, name: '7 天' }, { d: 30, name: '30 天' }, { d: 90, name: '90 天' }]
// 统计天数：1 / 7 / 30 / 90
const days = ref(7)
// 统计结果
const a = ref(null)
// 时间范围文字
const rangeName = computed(() => (days.value === 1 ? '天' : days.value + ' 天'))
// 趋势图最高的一天（算柱子高度用）
const maxNet = computed(() => (a.value ? Math.max(1, ...a.value.trend.map((t) => t.net)) : 1))
// 柱子高度
const barH = (v) => Math.max(2, Math.round((v / maxNet.value) * 100)) + '%'
// 天数多时只显示部分日期
const showLabel = (i) => { const n = a.value.trend.length; const step = n <= 7 ? 1 : n <= 30 ? 5 : 15; return i % step === 0 || i === n - 1 }
// 取绝对值（显示涨跌幅）
const abs = (n) => Math.abs(n)

// 加载页面数据
async function load() {
  if (!guard(['owner', 'admin'])) return
  a.value = await run(getAnalytics(me.value, days.value))
}
// 切换时间范围
function setDays(d) { days.value = d; load() }
// 每次显示页面时刷新（从别的页面返回也会触发）
onShow(load)
// 下拉刷新
onPullDownRefresh(async () => { await load(); uni.stopPullDownRefresh() })
</script>

<style scoped>
.m-v { font-size: 30rpx; }
.block { margin-top: 20rpx; padding: 28rpx; }
.small { font-size: 21rpx; }
.chart { display: flex; align-items: flex-end; gap: 6rpx; height: 250rpx; margin-top: 16rpx; padding-bottom: 36rpx; border-bottom: 2rpx solid #DFE8F7; position: relative; }
.bar-col { flex: 1; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; position: relative; min-width: 0; }
.bar { width: 80%; max-width: 40rpx; background: linear-gradient(#8CB0EC, #446BB0); border-radius: 10rpx 10rpx 0 0; }
.bl { position: absolute; bottom: -34rpx; font-size: 18rpx; color: #8798B5; white-space: nowrap; }
.ugrid { display: flex; flex-wrap: wrap; row-gap: 26rpx; }
.ugrid view { width: 33.33%; display: flex; flex-direction: column; gap: 6rpx; }
.uv { font-size: 32rpx; font-weight: 800; color: #142B53; }
.ul { font-size: 20rpx; }
.foot { display: block; font-size: 21rpx; margin: 20rpx 6rpx 0; line-height: 1.7; }
.rank { display: flex; align-items: center; gap: 20rpx; padding: 20rpx 0; border-bottom: 2rpx solid #EEF3FB; }
.ri { width: 44rpx; height: 44rpx; border-radius: 16rpx; background: #DCE9FF; color: #4E75B7; font-size: 22rpx; font-weight: 800; display: flex; align-items: center; justify-content: center; }
.ri.top { background: linear-gradient(110deg, #4B73BA, #7CA1E5); color: #FFFFFF; }
.rt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4rpx; }
.rn { font-size: 26rpx; font-weight: 700; }
.pr { margin-top: 22rpx; font-size: 24rpx; }
.track { height: 16rpx; background: #E4ECFA; border-radius: 40rpx; margin-top: 12rpx; overflow: hidden; }
.fill { height: 100%; border-radius: 40rpx; background: #6794DF; }
.th, .tr { display: flex; font-size: 22rpx; padding: 20rpx 0; }
.th { color: #8295B5; border-bottom: 2rpx solid #E7EEF9; }
.tr { border-bottom: 2rpx solid #E7EEF9; }
.c1 { width: 120rpx; }
.c { flex: 1; text-align: center; }
.c2 { width: 130rpx; text-align: right; }
</style>
