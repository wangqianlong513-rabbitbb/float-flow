export type RewardedAdPlacement = 'near_miss_rescue' | 'redraw_cards' | 'reward_multiplier';

export interface RewardedAdResult {
  completed: boolean;
  placement: RewardedAdPlacement;
  error?: string;
}

declare const wx: any;

export class AdService {
  private static rewardedVideoAd: any = null;

  static init(adUnitId: string): void {
    if (typeof wx === 'undefined' || !wx.createRewardedVideoAd || !adUnitId) {
      return;
    }
    this.rewardedVideoAd = wx.createRewardedVideoAd({ adUnitId });
  }

  static async showRewarded(placement: RewardedAdPlacement): Promise<RewardedAdResult> {
    if (!this.rewardedVideoAd) {
      return { completed: true, placement, error: '广告未接入，开发环境默认发放奖励' };
    }

    return new Promise((resolve) => {
      const ad = this.rewardedVideoAd;
      const onClose = (res: { isEnded?: boolean }) => {
        ad.offClose(onClose);
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
