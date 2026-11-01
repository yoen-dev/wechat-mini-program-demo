<script>
export default {
  globalData: {} // 页面间临时传参（如首页跳分类时预选的类目）
}
</script>

<style>
/* ===== 中性灰白模板 =====
   设计定稿后只需改这里的颜色和几个公共类，页面结构不用动。 */
page {
  background-color: #F5F5F5;
  color: #1F1F1F;
  font-family: 'PingFang SC', 'Noto Sans SC', system-ui, sans-serif;
  font-size: 28rpx;
}
.wrap { padding: 24rpx 32rpx 48rpx; }
.card { background: #FFFFFF; border-radius: 20rpx; }
.muted { color: #8C8C8C; }
.sub { color: #595959; }
.price { font-weight: 700; color: #1F1F1F; }
.ellipsis { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sec-title { font-size: 32rpx; font-weight: 700; }
.row { display: flex; align-items: center; }
.between { display: flex; align-items: center; justify-content: space-between; }

.btn {
  height: 88rpx; border-radius: 16rpx; font-size: 30rpx; font-weight: 600;
  display: flex; align-items: center; justify-content: center;
  background: #1F1F1F; color: #FFFFFF;
}
.btn.ghost { background: #FFFFFF; color: #1F1F1F; border: 2rpx solid #D9D9D9; }
.btn.light { background: #F0F0F0; color: #1F1F1F; }
.btn.sm { height: 60rpx; padding: 0 24rpx; font-size: 24rpx; border-radius: 12rpx; font-weight: 500; }
.btn.danger { background: #FFFFFF; color: #CF1322; border: 2rpx solid #FFA39E; }
.btn[disabled], .btn.disabled { opacity: 0.4; }

.input {
  height: 88rpx; background: #F5F5F5; border-radius: 12rpx; padding: 0 24rpx; font-size: 28rpx;
}
.label { font-size: 26rpx; color: #595959; margin: 24rpx 0 12rpx; display: block; }

.tag { font-size: 22rpx; padding: 4rpx 14rpx; border-radius: 8rpx; background: #F0F0F0; color: #595959; }
.seg { display: flex; background: #FFFFFF; border-radius: 16rpx; padding: 6rpx; }
.seg-item { flex: 1; height: 64rpx; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; font-size: 24rpx; color: #8C8C8C; white-space: nowrap; }
.seg-item.on { background: #1F1F1F; color: #FFFFFF; font-weight: 600; }
.cover { background: #E8E8E8; color: #A6A6A6; display: flex; align-items: center; justify-content: center; font-size: 22rpx; }
.list-row { display: flex; align-items: center; justify-content: space-between; padding: 30rpx 32rpx; font-size: 28rpx; }
.list-row + .list-row { border-top: 2rpx solid #F0F0F0; }
.arrow { color: #BFBFBF; font-size: 32rpx; }
.choice { border: 2rpx solid #E5E5E5; border-radius: 16rpx; padding: 20rpx 24rpx; background: #FFFFFF; }
.choice.on { border-color: #1F1F1F; background: #FAFAFA; }
button::after { border: none; }
</style>
