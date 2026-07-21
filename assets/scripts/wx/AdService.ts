import { AnalyticsService } from './AnalyticsService';

export type RewardedAdPlacement = 'near_miss_rescue' | 'redraw_cards' | 'reward_multiplier';

export interface RewardedAdResult {
  completed: boolean;
  placement: RewardedAdPlacement;
  error?: string;
}

declare const wx: any;

export class AdService {
  private static rewardedVideoAd: any = null;
  private static lastShownAt: Partial<Record<RewardedAdPlacement, number>> = {};
  private static cooldownMs: Record<RewardedAdPlacement, number> = {
    near_miss_rescue: 20 * 1000,
    redraw_cards: 15 * 1000,
    reward_multiplier: 30 * 1000,
  };

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
