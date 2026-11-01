# 三角洲护航小程序（用户端）

uni-app (Vue 3) 项目，同一套代码可以编译成**微信小程序**和**网页预览版**。

当前是前端演示版：数据在 `src/store/index.js` 里写死，下单、聊天只保存在本地，刷新会重置。

## 在线预览

推送到 `main` 后，GitHub Actions 会自动把网页版部署到 GitHub Pages，同事直接打开链接就能点：

`https://yoen-dev.github.io/wechat-mini-program-demo/`

> 第一次需要在仓库 **Settings → Pages → Build and deployment → Source** 选 **GitHub Actions**。

## 本地开发

```bash
npm install
npm run dev:h5          # 浏览器预览，热更新
npm run dev:mp-weixin   # 生成小程序，用微信开发者工具导入 dist/dev/mp-weixin
npm run build:mp-weixin # 正式构建，导入 dist/build/mp-weixin 后上传
```

导入微信开发者工具前，把 `src/manifest.json` 里 `mp-weixin.appid` 填成公司小程序的 AppID。

## 页面

| 页面 | 路径 | 说明 |
| --- | --- | --- |
| 首页 | `pages/index` | 搜索、服务承诺、快捷入口、特惠店 / 明星店、热门单子 |
| 分类 | `pages/category` | 左侧类目 + 右侧单子列表，支持搜索 |
| 单子详情 | `pages/detail` | 选择 **客服派单** 或 **指定护航**，填写游戏 ID 下单 |
| 我的订单 | `pages/orders` | 按状态筛选：已付款 / 已接单 / 护航中 / 已完成 / 已退款 |
| 订单沟通 | `pages/chat` | 订单内聊天 |
| 客服 | `pages/service` | 订单沟通列表、联系客服（小程序内调起微信客服）、系统通知 |
| 个人中心 | `pages/me` | 余额、订单入口、更多服务；陪玩入口暂为占位 |

## 待接后端

- `src/store/index.js`：单子、护航、订单、消息 → 换成接口
- `pages/detail` 的 `submit()`：创建订单 → 调起微信支付 → 支付成功后跳转
- `pages/chat` 的 `send()`：换成 WebSocket 或云开发实时数据库
- 方括号里的内容（`[品牌名]`、`[护航 A]`、`[封面图]` 等）都是占位，替换成真实内容
