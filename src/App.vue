<script>
export default {}
</script>

<style>
/* ===== 海屿服务站 · 航海主题 =====
   深蓝 #1C2B4B   次深蓝 #26395F   米白 #F4ECDD   卡片米 #FBF6EC   金 #C9A86A */
page {
  background-color: #F1E9DB;
  color: #1C2B4B;
  font-family: 'PingFang SC', 'Noto Sans SC', system-ui, sans-serif;
  font-size: 28rpx;
}
.serif { font-family: 'Songti SC', 'STSong', 'Noto Serif SC', 'Source Han Serif SC', serif; }
.en { letter-spacing: 4rpx; }
.muted { color: #6E7891; }
.price { font-family: 'Songti SC', 'STSong', 'Noto Serif SC', serif; font-weight: 700; color: #1C2B4B; }
.ellipsis { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* 米色标签卡：外框 + 内细线，像旧船票 */
.label {
  background: #FBF6EC;
  border: 2rpx solid #CDBB98;
  border-radius: 18rpx;
  box-shadow: inset 0 0 0 6rpx #FBF6EC, inset 0 0 0 8rpx #E4D6BA, 0 6rpx 16rpx rgba(12, 22, 44, 0.18);
}
/* 深蓝卡：金色双线 */
.navy-card {
  background: #22355C;
  border: 2rpx solid #C9A86A;
  border-radius: 18rpx;
  box-shadow: inset 0 0 0 6rpx #22355C, inset 0 0 0 8rpx rgba(201, 168, 106, 0.45);
}
/* 主按钮 */
.btn-navy {
  background: #1C2B4B; color: #F4ECDD; border-radius: 999rpx;
  box-shadow: inset 0 0 0 6rpx #1C2B4B, inset 0 0 0 8rpx #C9A86A, 0 8rpx 20rpx rgba(28, 43, 75, 0.3);
  display: flex; align-items: center; justify-content: center;
}
.btn-gold {
  background: #E9D3A6; color: #1C2B4B; border-radius: 999rpx; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}
.chip {
  font-size: 22rpx; color: #1C2B4B; background: #EFE3CC; border: 2rpx solid #D9C7A3;
  border-radius: 999rpx; padding: 6rpx 20rpx;
}
/* 装饰分隔线 ── ◇ ── */
.ornament { display: flex; align-items: center; gap: 16rpx; margin: 28rpx 0; }
.ornament::before, .ornament::after { content: ''; flex: 1; height: 2rpx; background: #1C2B4B; opacity: 0.35; }
.ornament .dia { width: 14rpx; height: 14rpx; border: 2rpx solid #1C2B4B; transform: rotate(45deg); }
.waves-foot { display: block; width: 750rpx; }
.icon-sm { width: 36rpx; height: 36rpx; flex-shrink: 0; }
.icon-md { width: 44rpx; height: 44rpx; flex-shrink: 0; }
</style>
