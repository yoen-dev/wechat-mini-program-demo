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
</style>
