# flowLightGame 云函数

用于替换客户端 `CloudGameService` 的本地 mock，覆盖以下 action：

- `submitDailyChallenge`：提交每日挑战最高分。
- `getDailyLeaderboard`：读取每日挑战排行榜。
- `registerResidualAssist`：登记残局求助。
- `completeResidualAssist`：标记好友助攻完成。
- `claimResidualRequesterReward`：求助方回流领奖防重复。

正式上线前需要在微信云开发控制台创建集合：

- `daily_challenge_scores`
- `residual_assists`

建议额外加服务端签名/频控：同一 openid 每日挑战提交频率、残局助攻领取次数、奖励发放流水表。
