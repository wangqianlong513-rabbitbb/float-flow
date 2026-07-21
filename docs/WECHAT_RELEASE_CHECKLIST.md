# 微信小游戏上线检查清单 - 浮岛流光

## 必接服务

- 云函数 `flowLightGame` 已提供脚手架：`cloudfunctions/flowLightGame/index.js`。
- 云数据库集合：`daily_challenge_scores`、`residual_assists`。
- 开放数据域目录：`openDataContext`。
- 广告位：替换 `WeChatService.adUnitId = 'adunit-demo-id'` 为真实激励视频广告位。

## 必测链路

- 首页：一键续光、今日挑战、福利中心、主题定制。
- 分享：今日挑战战绩、残局求助、助攻完成回流、分享领奖。
- 榜单：今日好友榜 mock 展示、开放数据域好友榜展示、分数上传。
- 失败：差一步求助优先、广告复活降级入口、放弃后重开。
- 省电模式：背景、首页、游戏内拖尾/粒子、胜利/失败弹窗降级。
- 海报：分享海报 imageUrl、保存到相册授权拒绝/允许两种路径。

## 防刷规则建议

- 每个 openid 每日分享领奖 1 次。
- 每个 `assistId` 只能被一个 helper 完成。
- 请求方回流奖励仅能领取一次，且必须由 `requesterOpenid` 领取。
- 每日挑战只保留最高分；同分时步数少者优先。
- 激励视频按 placement 做冷却：复活、重抽、翻倍分别限频。

## 埋点漏斗

- `home_start_journey`：首页开始旅途。
- `home_start_daily`：进入今日挑战。
- `home_open_welfare`：打开福利中心。
- `home_open_daily_rank`：查看每日榜。
- `level_success` / `level_fail`：关卡成败。
- `daily_success`：今日挑战完成。
- `share_residual` / `share_invite`：残局求助与邀请分享。
- `ad_request` / `ad_completed`：广告请求与完成。
- `theme_unlock` / `theme_apply`：主题解锁与启用。
- `power_save_toggle`：省电模式开关。

## 真机重点

- 低端安卓：开启省电模式后是否明显降低卡顿。
- 微信右上胶囊：首页、关卡页、弹窗是否避让。
- iPhone 刘海屏：顶部资源栏和返回按钮是否安全。
- 分享回流：`daily=1`、`residual=...`、`assistDone=...` 三种 query 是否都能进入正确页面。
