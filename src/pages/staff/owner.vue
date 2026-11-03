<template>
  <view v-if="me">
    <StaffHead v-if="me.role === 'owner'" :user="me" />
    <view class="wrap">
      <view class="seg">
        <view v-for="r in ranges" :key="r.d" class="seg-item" :class="{ on: r.d === days }" @tap="setDays(r.d)">{{ r.name }}</view>
      </view>

      <view v-if="a">
        <!-- 流水 -->
        <view class="card hero">
          <text class="muted hl">实收（成交 − 退款）</text>
          <view class="row hv-row"><text class="hv">¥{{ a.money.net }}</text><text v-if="a.vs.net !== null" :class="['chg', a.vs.net >= 0 ? 'up' : 'down']">{{ a.vs.net >= 0 ? '↑' : '↓' }} {{ abs(a.vs.net) }}%</text></view>
          <text class="muted hl">对比上一个{{ rangeName }}</text>
          <view class="hgrid">
            <view><text class="muted hl">成交额</text><text class="hs">¥{{ a.money.gmv }}</text></view>
            <view><text class="muted hl">退款</text><text class="hs">¥{{ a.money.refund }}</text></view>
            <view><text class="muted hl">护航分成</text><text class="hs">¥{{ a.money.share }}</text></view>
            <view><text class="muted hl">毛利</text><text class="hs">¥{{ a.money.profit }}</text></view>
            <view><text class="muted hl">订单数</text><text class="hs">{{ a.money.orders }}</text></view>
            <view><text class="muted hl">客单价</text><text class="hs">¥{{ a.users.avgOrder }}</text></view>
          </view>
        </view>

        <!-- 趋势 -->
        <view v-if="days > 1" class="card block">
          <view class="between"><text class="sec-title">每日实收</text><text class="muted small">最高 ¥{{ maxNet }}</text></view>
          <view class="chart">
            <view class="bar-col" v-for="(t, i) in a.trend" :key="i">
              <view class="bar" :style="{ height: barH(t.net) }"></view>
              <text class="bl">{{ showLabel(i) ? t.label : '' }}</text>
            </view>
          </view>
        </view>

        <!-- 储值 -->
        <view class="card block">
          <text class="sec-title">储值充值</text>
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
          <text class="sec-title">用户</text>
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
          <text class="sec-title">消费排行</text>
          <view class="rank" v-for="(u, i) in a.topSpenders" :key="u.id">
            <text :class="['ri', i < 3 ? 'top' : '']">{{ i + 1 }}</text>
            <view class="rt"><text class="rn">{{ u.name }}</text><text class="muted small">{{ u.orders }} 单 · 最近 {{ fmtTime(u.last) }}</text></view>
            <text class="price">¥{{ u.spent }}</text>
          </view>
          <text v-if="!a.topSpenders.length" class="muted small">这段时间没有消费</text>
        </view>

        <!-- 单子 -->
        <view class="card block">
          <text class="sec-title">单子销售</text>
          <view class="pr" v-for="p in a.products" :key="p.name">
            <view class="between"><text>{{ p.name }}</text><text class="muted small">{{ p.count }} 单 · ¥{{ p.revenue }} · {{ p.share }}%</text></view>
            <view class="track"><view class="fill" :style="{ width: p.share + '%' }"></view></view>
          </view>
        </view>

        <!-- 护航 -->
        <view class="card block">
          <text class="sec-title">护航表现</text>
          <view class="th"><text class="c1">护航</text><text class="c">完成</text><text class="c">完成率</text><text class="c">退款率</text><text class="c">评分</text><text class="c2">收入</text></view>
          <view class="tr" v-for="e in a.escorts" :key="e.id">
            <text class="c1 ellipsis">{{ e.name.replace('护航 ', '') }}</text><text class="c">{{ e.done }}</text><text class="c">{{ e.completion }}%</text>
            <text class="c">{{ e.refundRate }}%</text><text class="c">{{ e.rating || '—' }}</text><text class="c2">¥{{ e.income }}</text>
          </view>
        </view>

        <!-- 客服 -->
        <view class="card block">
          <text class="sec-title">客服</text>
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

const me = computed(() => session.user)
const ranges = [{ d: 1, name: '今天' }, { d: 7, name: '7 天' }, { d: 30, name: '30 天' }, { d: 90, name: '90 天' }]
const days = ref(7)
const a = ref(null)
const rangeName = computed(() => (days.value === 1 ? '天' : days.value + ' 天'))
const maxNet = computed(() => (a.value ? Math.max(1, ...a.value.trend.map((t) => t.net)) : 1))
const barH = (v) => Math.max(2, Math.round((v / maxNet.value) * 100)) + '%'
const showLabel = (i) => { const n = a.value.trend.length; const step = n <= 7 ? 1 : n <= 30 ? 5 : 15; return i % step === 0 || i === n - 1 }
const abs = (n) => Math.abs(n)

async function load() {
  if (!guard(['owner', 'admin'])) return
  a.value = await run(getAnalytics(me.value, days.value))
}
function setDays(d) { days.value = d; load() }
onShow(load)
onPullDownRefresh(async () => { await load(); uni.stopPullDownRefresh() })
</script>

<style scoped>
.hero { margin-top: 20rpx; padding: 32rpx; background: #1F1F1F; color: #FFFFFF; }
.hero .muted { color: #A6A6A6; }
.hl { display: block; font-size: 22rpx; }
.hv-row { gap: 16rpx; align-items: baseline; margin: 8rpx 0 4rpx; }
.hv { font-size: 60rpx; font-weight: 700; }
.chg { font-size: 24rpx; font-weight: 600; }
.chg.up { color: #73D13D; }
.chg.down { color: #FF7875; }
.hgrid { display: flex; flex-wrap: wrap; margin-top: 24rpx; row-gap: 20rpx; }
.hgrid view { width: 33.33%; }
.hs { display: block; font-size: 30rpx; font-weight: 600; margin-top: 4rpx; }
.block { margin-top: 20rpx; padding: 28rpx; }
.small { font-size: 22rpx; }
.chart { display: flex; align-items: flex-end; gap: 4rpx; height: 260rpx; margin-top: 20rpx; padding-bottom: 36rpx; position: relative; }
.bar-col { flex: 1; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; position: relative; min-width: 0; }
.bar { width: 80%; max-width: 40rpx; background: #1F1F1F; border-radius: 6rpx 6rpx 0 0; }
.bl { position: absolute; bottom: -34rpx; font-size: 18rpx; color: #8C8C8C; white-space: nowrap; }
.ugrid { display: flex; flex-wrap: wrap; margin-top: 16rpx; row-gap: 24rpx; }
.ugrid view { width: 33.33%; display: flex; flex-direction: column; gap: 4rpx; }
.uv { font-size: 34rpx; font-weight: 700; }
.ul { font-size: 22rpx; }
.foot { display: block; font-size: 22rpx; margin: 20rpx 8rpx 0; line-height: 1.6; }
.rank { display: flex; align-items: center; gap: 20rpx; padding: 18rpx 0; border-bottom: 2rpx solid #F5F5F5; }
.ri { width: 40rpx; height: 40rpx; border-radius: 50%; background: #F0F0F0; font-size: 22rpx; display: flex; align-items: center; justify-content: center; }
.ri.top { background: #1F1F1F; color: #FFFFFF; }
.rt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4rpx; }
.rn { font-size: 28rpx; font-weight: 600; }
.pr { margin-top: 20rpx; font-size: 26rpx; }
.track { height: 12rpx; background: #F0F0F0; border-radius: 6rpx; margin-top: 10rpx; overflow: hidden; }
.fill { height: 100%; background: #1F1F1F; }
.th, .tr { display: flex; font-size: 24rpx; padding: 14rpx 0; }
.th { color: #8C8C8C; border-bottom: 2rpx solid #F0F0F0; margin-top: 12rpx; }
.tr + .tr { border-top: 2rpx solid #F5F5F5; }
.c1 { width: 120rpx; }
.c { flex: 1; text-align: center; }
.c2 { width: 130rpx; text-align: right; }
</style>
