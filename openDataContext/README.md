# openDataContext

微信开放数据域好友榜脚手架。

接入步骤：

1. 在微信开发者工具的小游戏配置中指定开放数据域目录为 `openDataContext`。
2. 主域继续调用 `WeChatService.uploadUserScore()` 写入 `user_max_score`。
3. 主域使用 `WeChatService.showFriendLeaderboard(containerNode)` 展示 `cc.SubContextView`。
4. 如果要区分“每日挑战榜”和“旅途榜”，可扩展 key：`daily_score_YYYYMMDD`。
