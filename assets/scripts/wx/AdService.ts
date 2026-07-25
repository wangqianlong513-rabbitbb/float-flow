import { AnalyticsService } from './AnalyticsService';

export type RewardedAdPlacement =
  | 'near_miss_rescue'
  | 'redraw_cards'
  | 'reward_multiplier'
  | 'time_rewind'
  | 'foresight_card'
  | 'daily_retry'
  | 'utility_refill';

export interface RewardedAdResult {
  completed: boolean;
  placement: RewardedAdPlacement;
  error?: string;
}

export interface RewardedAdPolicy {
  trigger: string;
  reward: string;
  rule: string;
}

declare const wx: any;

export class AdService {
  private static rewardedVideoAd: any = null;
  private static lastShownAt: Partial<Record<RewardedAdPlacement, number>> = {};
  private static cooldownMs: Record<RewardedAdPlacement, number> = {
    near_miss_rescue: 20 * 1000,
    redraw_cards: 15 * 1000,
    reward_multiplier: 30 * 1000,
    time_rewind: 30 * 1000,
    foresight_card: 20 * 1000,
    daily_retry: 45 * 1000,
    utility_refill: 20 * 1000,
  };

  private static policy: Record<RewardedAdPlacement, RewardedAdPolicy> = {
    near_miss_rescue: { trigger: '失败弹窗', reward: '倒回关键节点/复活', rule: '只在失败后玩家主动点击' },
    redraw_cards: { trigger: '福利中心或卡手', reward: '补给晶核/重抽手牌', rule: '每日限次，不开局强弹' },
    reward_multiplier: { trigger: '胜利结算', reward: '本局基础晶核翻倍', rule: '通关后可选，不阻断下一关' },
    time_rewind: { trigger: '高价值失败', reward: '时间回溯', rule: '冷却限制，避免连续打断' },
    foresight_card: { trigger: '二级及以上提示', reward: '显示关键格/关键牌', rule: '一级提示免费，高级提示自愿观看' },
    daily_retry: { trigger: '每日签到已领后', reward: '额外补签礼', rule: '每日一次，非强制' },
    utility_refill: { trigger: '撤回/清盘/槽位次数耗尽', reward: '补回一次工具能力', rule: '玩家主动点击工具后才出现' },
  };

  static getPolicy(placement: RewardedAdPlacement): RewardedAdPolicy {
    return this.policy[placement];
  }

  static init(adUnitId: string): void {
    if (typeof wx === 'undefined' || !wx.createRewardedVideoAd || !adUnitId || adUnitId.indexOf('demo') >= 0) {
      return;
    }
    this.rewardedVideoAd = wx.createRewardedVideoAd({ adUnitId });
  }

  static async showRewarded(placement: RewardedAdPlacement): Promise<RewardedAdResult> {
    AnalyticsService.track('ad_request', { placement });
    const now = Date.now();
    const last = this.lastShownAt[placement] || 0;
    const remaining = this.cooldownMs[placement] - (now - last);
    if (remaining > 0 && this.rewardedVideoAd) {
      return { completed: false, placement, error: `广告冷却中，请 ${Math.ceil(remaining / 1000)} 秒后再试` };
    }

    if (!this.rewardedVideoAd) {
      AnalyticsService.track('ad_completed', { placement, mock: true });
      return { completed: true, placement, error: '广告未接入，开发环境默认发放奖励' };
    }

    return new Promise((resolve) => {
      const ad = this.rewardedVideoAd;
      const onClose = (res: { isEnded?: boolean }) => {
        ad.offClose(onClose);
        this.lastShownAt[placement] = Date.now();
        if (res?.isEnded) {
          AnalyticsService.track('ad_completed', { placement });
        }
        resolve({ completed: !!res?.isEnded, placement });
      };
      ad.onClose(onClose);
      ad.show().catch(() => {
        ad.load()
          .then(() => ad.show())
          .catch((error: Error) => {
            ad.offClose(onClose);
            resolve({ completed: false, placement, error: error.message });
          });
      });
    });
  }
}
