<template>
  <view class="page">
    <view class="profile">
      <view class="avatar"></view>
      <view class="profile-text">
        <text class="nick">[微信昵称]</text>
        <text class="tag level">消费等级 Lv.1</text>
      </view>
    </view>

    <view class="wallet">
      <view class="wallet-left">
        <text class="wallet-label">我的余额（元）</text>
        <text class="wallet-num">0.00</text>
      </view>
      <view class="wallet-actions">
        <view class="wallet-btn" @tap="soon">记录</view>
        <view class="btn-primary wallet-btn primary" @tap="soon">充值</view>
      </view>
    </view>

    <view class="card main">
      <view class="main-item" v-for="m in mainItems" :key="m.label" @tap="m.action">
        <view class="main-icon">{{ m.glyph }}</view>
        <text>{{ m.label }}</text>
      </view>
    </view>

    <view class="card more">
      <text class="more-title">更多服务</text>
      <view class="more-grid">
        <view class="more-item" v-for="m in moreItems" :key="m" @tap="soon">
          <view class="more-dot"></view>
          <text>{{ m }}</text>
        </view>
        <view class="more-item disabled">
          <view class="more-dot grey"></view>
          <text>陪玩·即将上线</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
const soon = () => uni.showToast({ title: '敬请期待', icon: 'none' })

const mainItems = [
  { label: '我的订单', glyph: '≡', action: () => uni.switchTab({ url: '/pages/orders/orders' }) },
  { label: '投诉进度', glyph: '✓', action: soon },
  { label: '成为护航', glyph: '+', action: soon },
  { label: '我的收藏', glyph: '☆', action: soon }
]
const moreItems = ['优惠券', '我的评价', '消费等级', '福利活动', '帮助中心', '功能建议', '相关协议']
</script>

<style scoped>
.page { padding: 24rpx 32rpx 40rpx; display: flex; flex-direction: column; gap: 28rpx; }
.profile { display: flex; align-items: center; gap: 28rpx; padding: 8rpx 4rpx; }
.avatar { width: 128rpx; height: 128rpx; border-radius: 50%; background: #D6E6FC; border: 6rpx solid #FFFFFF; }
.profile-text { display: flex; flex-direction: column; align-items: flex-start; gap: 8rpx; }
.nick { font-size: 36rpx; font-weight: 700; }
.wallet { background: #12233D; border-radius: 32rpx; padding: 32rpx; display: flex; align-items: center; justify-content: space-between; color: #FFFFFF; }
.wallet-left { display: flex; flex-direction: column; gap: 8rpx; }
.wallet-label { font-size: 24rpx; color: #B9C7DC; }
.wallet-num { font-size: 56rpx; font-weight: 800; }
.wallet-actions { display: flex; gap: 16rpx; }
.wallet-btn { height: 72rpx; padding: 0 28rpx; border-radius: 36rpx; border: 2rpx solid #4A5D7A; font-size: 26rpx; display: flex; align-items: center; }
.wallet-btn.primary { border: 0; }
.main { display: flex; padding: 32rpx 8rpx; }
.main-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 12rpx; font-size: 24rpx; }
.main-icon { width: 88rpx; height: 88rpx; border-radius: 28rpx; background: #E3EEFF; color: #1A6FE0; font-size: 40rpx; font-weight: 700; display: flex; align-items: center; justify-content: center; }
.more { padding: 32rpx; display: flex; flex-direction: column; gap: 28rpx; }
.more-title { font-size: 30rpx; font-weight: 700; }
.more-grid { display: flex; flex-wrap: wrap; row-gap: 36rpx; }
.more-item { width: 25%; display: flex; flex-direction: column; align-items: center; gap: 12rpx; font-size: 24rpx; }
.more-item.disabled { color: #4A5D7A; }
.more-dot { width: 48rpx; height: 48rpx; border-radius: 14rpx; border: 4rpx solid #1A6FE0; box-sizing: border-box; }
.more-dot.grey { border-color: #9AAAC0; }
</style>
