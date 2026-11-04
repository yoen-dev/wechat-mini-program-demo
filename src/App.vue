<script>
// 小程序入口：启动时初始化云托管（只有接真实后端的 cloud 模式才会真正执行）
import { initCloud } from '@/api/remote/request.js'

export default {
  globalData: {}, // 页面间临时传参（如首页跳分类时预选的类目）
  onLaunch() {
    initCloud()
  }
}
</script>

<style>
/* ===== BLK电竞 · 冰蓝主题（来自设计稿 BLK-miniapp-ui） =====
   颜色都定义在下面 page 的变量里；改主题优先改这里，各页面用的公共类也在本文件。
   单位说明：rpx 是小程序的自适应单位，750rpx = 屏幕宽度（设计稿 1px ≈ 2rpx）。 */
page {
  --navy: #142B53;      /* 主文字、深色 */
  --deep: #203B69;      /* 深蓝（渐变起点） */
  --blue: #527AC3;      /* 主题蓝 */
  --blue2: #7196D8;     /* 浅一点的蓝（渐变终点） */
  --ice: #E8EFFD;       /* 浅蓝底（次要按钮、标签） */
  --pale: #F4F7FF;      /* 更浅的底色（输入框） */
  --line: #DCE6F8;      /* 边框、分割线 */
  --muted: #8798B5;     /* 次要文字 */
  --green: #28A88A;
  --red: #ED7384;
  background: #EDF2FB;
  color: var(--navy);
  font-family: -apple-system, 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;
  font-size: 28rpx;
}

/* ---------- 布局 ---------- */
.wrap { padding: 24rpx 30rpx 48rpx; }
.row { display: flex; align-items: center; }
.between { display: flex; align-items: center; justify-content: space-between; }
.ellipsis { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* ---------- 卡片：白底、浅蓝边框、柔和阴影 ---------- */
.card { background: #FFFFFF; border: 2rpx solid var(--line); border-radius: 32rpx; box-shadow: 0 8rpx 30rpx rgba(102, 133, 189, 0.06); }

/* 深蓝渐变横幅（订单状态、个人信息、经营数据等顶部大卡片） */
.hero-card { background: linear-gradient(115deg, #203B69, #527AC3 70%, #7196D8); color: #FFFFFF; border-radius: 32rpx; box-shadow: 0 24rpx 68rpx rgba(40, 74, 132, 0.18); }
.hero-card .muted { color: #C9DAF7; }

/* ---------- 文字 ---------- */
.muted { color: var(--muted); }
.sub { color: #5B6F92; }
.price { font-weight: 800; color: #416FBA; }
.sec-title { font-size: 30rpx; font-weight: 800; color: var(--navy); }

/* ---------- 按钮 ---------- */
.btn {
  height: 88rpx; border-radius: 24rpx; font-size: 28rpx; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(110deg, #4B73BA, #7CA1E5); color: #FFFFFF;
}
.btn.ghost { background: #FFFFFF; color: #4B73BA; border: 2rpx solid #9BB5E5; }
.btn.light { background: var(--ice); color: #466AA9; }
.btn.sm { height: 60rpx; padding: 0 24rpx; font-size: 24rpx; border-radius: 18rpx; font-weight: 600; }
.btn.danger { background: #FBE9ED; color: #CB5368; border: none; }
.btn[disabled], .btn.disabled { opacity: 0.45; }

/* ---------- 表单 ---------- */
.input {
  height: 88rpx; background: #FFFFFF; border: 2rpx solid var(--line); border-radius: 24rpx; padding: 0 24rpx; font-size: 26rpx; color: #284674;
}
.label { font-size: 24rpx; color: #7F90AB; margin: 24rpx 0 12rpx; display: block; }

/* ---------- 标签、分段切换 ---------- */
.tag { font-size: 20rpx; padding: 6rpx 14rpx; border-radius: 14rpx; background: #EAF1FF; color: #567BBB; }
.seg { display: flex; background: transparent; gap: 12rpx; }
.seg-item { flex: 1; height: 64rpx; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; font-size: 24rpx; color: #7D91B3; background: var(--ice); white-space: nowrap; }
.seg-item.on { background: #4E76BD; color: #FFFFFF; font-weight: 700; }

/* ---------- 列表 ---------- */
.cover { background: linear-gradient(140deg, #DCE9FF, #B3C9F3); color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 22rpx; }
.list-row { display: flex; align-items: center; justify-content: space-between; padding: 30rpx 30rpx; font-size: 27rpx; }
.list-row + .list-row { border-top: 2rpx solid #E7EEF9; }
.arrow { color: #A2B3CC; font-size: 32rpx; }
.choice { border: 2rpx solid var(--line); border-radius: 24rpx; padding: 20rpx 24rpx; background: #FFFFFF; }
.choice.on { border-color: #527AC3; background: #F0F5FF; }
button::after { border: none; }

/* ================= 设计稿组件（BLK-miniapp-ui 移植） =================
   以下类名对应设计稿 style.css 里的组件，页面直接组合使用。 */

/* 页面顶部标题区：大标题 + 小字说明，右侧可放圆形图标按钮 */
.hdr { display: flex; align-items: center; justify-content: space-between; padding: 12rpx 4rpx 26rpx; }
.hdr-t { display: block; font-size: 38rpx; font-weight: 800; letter-spacing: 1rpx; color: var(--navy); }
.hdr-s { display: block; font-size: 22rpx; color: #8093B5; margin-top: 6rpx; }
.icon-btn { width: 70rpx; height: 70rpx; border-radius: 50%; background: #E8EFFF; color: #4269A9; display: flex; align-items: center; justify-content: center; font-size: 34rpx; }

/* 蓝色渐变横幅（设计稿 .banner）：订单状态、个人信息、接单状态等 */
.blk-banner { background: linear-gradient(110deg, #254778, #7098D9); border-radius: 32rpx; padding: 34rpx; color: #FFFFFF; margin-bottom: 24rpx; box-shadow: 0 24rpx 68rpx rgba(40, 74, 132, 0.16); }
.blk-banner .b-t { display: block; font-size: 38rpx; font-weight: 800; }
.blk-banner .b-s { display: block; font-size: 22rpx; color: #D9E6FF; margin-top: 10rpx; }
.blk-banner .b-big { display: block; font-size: 64rpx; font-weight: 800; margin: 8rpx 0; }

/* 区块标题：左粗标题，右灰色「查看全部 ❯」 */
.section { display: flex; align-items: center; justify-content: space-between; margin: 40rpx 2rpx 22rpx; }
.section .s-t { font-size: 30rpx; font-weight: 800; color: var(--navy); }
.section .s-more { font-size: 22rpx; color: #8B9BB7; }

/* 宫格 */
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20rpx; }
.grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18rpx; }
.grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16rpx; }

/* 磁贴：浅蓝渐变的入口卡片 */
.tile { background: linear-gradient(150deg, #FFFFFF, #E9F1FF); border: 2rpx solid var(--line); border-radius: 32rpx; padding: 30rpx 22rpx; min-height: 188rpx; box-sizing: border-box; box-shadow: 0 8rpx 30rpx rgba(102, 133, 189, 0.05); }
.tile .ti { font-size: 46rpx; line-height: 1.2; color: #4B72B8; }
.tile .tt { display: block; font-size: 26rpx; font-weight: 800; margin-top: 18rpx; color: var(--navy); }
.tile .ts { display: block; font-size: 20rpx; color: #8599B8; margin-top: 6rpx; }
.tile.mini { min-height: 150rpx; padding: 24rpx 6rpx; text-align: center; display: flex; flex-direction: column; align-items: center; }
.tile.mini .tt { font-size: 21rpx; margin-top: 12rpx; }

/* 数字指标卡 */
.metric { background: #FFFFFF; border: 2rpx solid var(--line); border-radius: 32rpx; padding: 26rpx; box-shadow: 0 8rpx 30rpx rgba(102, 133, 189, 0.05); }
.metric .m-l { display: block; font-size: 20rpx; color: #8196B5; }
.metric .m-v { display: block; font-size: 40rpx; font-weight: 800; margin-top: 14rpx; color: var(--navy); }

/* 列表行卡片（每行一张小卡片，右侧箭头） */
.lrow { background: #FFFFFF; border: 2rpx solid var(--line); border-radius: 32rpx; padding: 26rpx 28rpx; display: flex; align-items: center; justify-content: space-between; margin-bottom: 18rpx; box-shadow: 0 8rpx 30rpx rgba(102, 133, 189, 0.05); }
.lrow .l-t { display: block; font-size: 26rpx; font-weight: 700; color: var(--navy); }
.lrow .l-s { display: block; font-size: 20rpx; color: #8B9CB6; margin-top: 8rpx; }
.lrow .chev { color: #A2B3CC; font-size: 28rpx; flex-shrink: 0; margin-left: 16rpx; }

/* 小标签 chip */
.chip { display: inline-block; border-radius: 16rpx; padding: 8rpx 16rpx; background: #EAF1FF; color: #567BBB; font-size: 20rpx; }
.chip.green { background: #E0F6EF; color: #269B79; }
.chip.orange { background: #FFF0D8; color: #BB873A; }
.chip.red { background: #FFEBEF; color: #C76C80; }
.chip.grey { background: #EEF2F9; color: #8798B5; }

/* 横向滚动的筛选标签（设计稿 .tabsline） */
.tabsline { white-space: nowrap; margin: 6rpx 0 26rpx; }
.tabsline .tb { display: inline-block; margin-right: 14rpx; padding: 16rpx 26rpx; border-radius: 20rpx; background: #E8EEFB; color: #7D91B3; font-size: 22rpx; position: relative; }
.tabsline .tb.on { background: #4E76BD; color: #FFFFFF; font-weight: 700; }
.tabsline .tb .dot { position: absolute; top: 6rpx; right: 6rpx; min-width: 26rpx; height: 26rpx; padding: 0 6rpx; box-sizing: border-box; border-radius: 13rpx; background: #ED7384; color: #FFFFFF; font-size: 16rpx; line-height: 26rpx; text-align: center; }

/* 表单字段（设计稿 .field） */
.field { display: block; margin: 22rpx 0; }
.field .f-l { display: block; font-size: 22rpx; color: #7F90AB; margin-bottom: 14rpx; }
.f-in { height: 88rpx; width: 100%; box-sizing: border-box; border: 2rpx solid #DBE6F8; background: #FFFFFF; border-radius: 24rpx; padding: 0 24rpx; color: #284674; font-size: 25rpx; }
.f-ta { width: 100%; box-sizing: border-box; min-height: 160rpx; border: 2rpx solid #DBE6F8; background: #FFFFFF; border-radius: 24rpx; padding: 22rpx 24rpx; color: #284674; font-size: 25rpx; }

/* 步骤（圆圈数字 + 文字） */
.step-row { display: flex; align-items: center; gap: 24rpx; margin: 26rpx 0; font-size: 24rpx; }
.step-row .sn { width: 54rpx; height: 54rpx; flex-shrink: 0; background: #DCE9FF; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #4E75B7; font-weight: 800; font-size: 24rpx; }
.step-row .sn.on { background: linear-gradient(110deg, #4B73BA, #7CA1E5); color: #FFFFFF; }

/* 人物头像 + 名字 */
.person { display: flex; align-items: center; gap: 20rpx; min-width: 0; }
.avatar { width: 80rpx; height: 80rpx; flex-shrink: 0; border-radius: 28rpx; background: linear-gradient(130deg, #B3C9F3, #5176BA); color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 34rpx; font-weight: 700; }
.person .p-n { display: block; font-size: 25rpx; font-weight: 700; color: var(--navy); }
.person .p-s { display: block; font-size: 20rpx; color: #91A0B7; margin-top: 6rpx; }

/* 提示条、空状态、分割线、进度条 */
.notice-bar { background: #FFFFFF; border: 2rpx solid var(--line); border-radius: 28rpx; padding: 22rpx 24rpx; font-size: 22rpx; color: #4F70A6; line-height: 1.6; }
.divider { height: 2rpx; background: #E1E9F7; margin: 26rpx 0; }
.progress { height: 16rpx; background: #E4ECFA; border-radius: 40rpx; overflow: hidden; }
.progress .pg { display: block; height: 100%; border-radius: 40rpx; background: #6794DF; }
.card-t { display: block; font-size: 28rpx; font-weight: 800; color: var(--navy); margin-bottom: 14rpx; }
.card-p { display: block; font-size: 22rpx; line-height: 1.8; color: #8192AD; }
.pad { padding: 28rpx; }
.mb { margin-bottom: 20rpx; }
.bottom-gap { height: 140rpx; }

</style>
