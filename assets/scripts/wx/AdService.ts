import { sys } from 'cc';
import { AnalyticsService } from './AnalyticsService';

export type RewardedAdPlacement =
  | 'near_miss_rescue'
  | 'redraw_cards'
  | 'reward_multiplier'
  | 'time_rewind'
  | 'foresight_card'
  | 'daily_retry'
  | 'utility_refill';

export type AdState = 'unavailable' | 'loading' | 'ready' | 'showing';

export interface RewardedAdResult {
  completed: boolean;
  placement: RewardedAdPlacement;
  transactionId?: string;
  fallback?: boolean;
  error?: string;
}

export interface RewardedAdPolicy {
  trigger: string;
  reward: string;
  rule: string;
}

interface PlacementLimit {
  cooldownMs: number;
  daily: number;
  session: number;
}

const DAILY_CAP_KEY = 'flow_land_light_ad_daily_caps';

declare const wx: any;

export class AdService {
  private static rewardedVideoAd: any = null;
  private static interstitialAd: any = null;
  private static state: AdState = 'unavailable';
  private static configured = false;
  private static inFlight = false;
  private static loadFailures = 0;
  private static loadPromise: Promise<boolean> | null = null;
  private static retryTimer: ReturnType<typeof setTimeout> | null = null;
  private static transactionSerial = 0;
  private static lastShownAt: Partial<Record<RewardedAdPlacement, number>> = {};
  private static sessionCounts: Partial<Record<RewardedAdPlacement, number>> = {};
  private static lastInterstitialAt = 0;
  private static interstitialShowing = false;

  private static limits: Record<RewardedAdPlacement, PlacementLimit> = {
    near_miss_rescue: { cooldownMs: 20 * 1000, daily: 8, session: 4 },
    redraw_cards: { cooldownMs: 30 * 1000, daily: 4, session: 2 },
    reward_multiplier: { cooldownMs: 25 * 1000, daily: 8, session: 4 },
    time_rewind: { cooldownMs: 45 * 1000, daily: 4, session: 2 },
    foresight_card: { cooldownMs: 30 * 1000, daily: 6, session: 3 },
    daily_retry: { cooldownMs: 60 * 1000, daily: 1, session: 1 },
    utility_refill: { cooldownMs: 45 * 1000, daily: 6, session: 3 },
  };

  private static policy: Record<RewardedAdPlacement, RewardedAdPolicy> = {
    near_miss_rescue: { trigger: '失败弹窗', reward: '回到关键节点继续接光', rule: '核心点位，仅在失败后主动点击' },
    redraw_cards: { trigger: '卡手时主动求助', reward: '重抽当前手牌', rule: '每日限次，不在主页主动推送' },
    reward_multiplier: { trigger: '胜利结算', reward: '本局基础晶核翻倍', rule: '核心点位，不阻断下一关' },
    time_rewind: { trigger: '高价值失败', reward: '时间回溯', rule: '与复活共享频控' },
    foresight_card: { trigger: '高级提示', reward: '显示关键格和完整路线', rule: '一级提示免费，高级提示自愿观看' },
    daily_retry: { trigger: '保留点位', reward: '活动补签', rule: '默认不在签到页展示' },
    utility_refill: { trigger: '工具次数耗尽', reward: '补回一次工具能力', rule: '玩家点击耗尽工具后出现' },
  };

  static getPolicy(placement: RewardedAdPlacement): RewardedAdPolicy {
    return this.policy[placement];
  }

  static getState(): AdState {
    return this.state;
  }

  static init(adUnitId: string, interstitialAdUnitId = ''): void {
    const runtimeConfig = (globalThis as any).__FLOW_LIGHT_CONFIG__ || {};
    const rewardedId = adUnitId || runtimeConfig.rewardedAdUnitId || '';
    const interstitialId = interstitialAdUnitId || runtimeConfig.interstitialAdUnitId || '';
    this.configured = !!rewardedId;
    this.state = 'unavailable';

    if (typeof wx === 'undefined' || !wx.createRewardedVideoAd || !rewardedId) {
      return;
    }

    try {
      this.rewardedVideoAd = wx.createRewardedVideoAd({ adUnitId: rewardedId });
      void this.preload();
    } catch (error) {
      this.recordLoadFailure('init', error);
    }

    if (interstitialId && wx.createInterstitialAd) {
      try {
        this.interstitialAd = wx.createInterstitialAd({ adUnitId: interstitialId });
      } catch (error) {
        AnalyticsService.track('ad_error', { format: 'interstitial', stage: 'init', error: this.errorMessage(error) });
      }
    }
  }

  static async preload(): Promise<boolean> {
    if (this.state === 'loading' && this.loadPromise) {
      return this.loadPromise;
    }
    if (!this.rewardedVideoAd || this.state === 'showing') {
      return this.state === 'ready';
    }
    this.state = 'loading';
    AnalyticsService.track('ad_load', { format: 'rewarded' });
    this.loadPromise = (async () => {
      try {
        await this.rewardedVideoAd.load();
        this.state = 'ready';
        this.loadFailures = 0;
        AnalyticsService.track('ad_ready', { format: 'rewarded' });
        return true;
      } catch (error) {
        this.recordLoadFailure('preload', error);
        return false;
      } finally {
        this.loadPromise = null;
      }
    })();
    return this.loadPromise;
  }

  static async showRewarded(placement: RewardedAdPlacement): Promise<RewardedAdResult> {
    AnalyticsService.track('ad_request', { placement, state: this.state });
    if (this.inFlight || this.state === 'showing') {
      return this.fail(placement, '已有广告正在展示');
    }

    const limitError = this.checkLimits(placement);
    if (limitError) {
      return this.fail(placement, limitError);
    }
    if (!this.configured || !this.rewardedVideoAd) {
      return this.fail(placement, '广告位尚未配置');
    }

    this.inFlight = true;
    try {
      if (this.state !== 'ready' && !(await this.preload())) {
        return this.completeFallbackOrFail(placement, '广告暂时加载失败');
      }
      return await this.presentRewarded(placement);
    } finally {
      this.inFlight = false;
    }
  }

  static onNaturalBreak(completedClears: number): void {
    if (!this.interstitialAd || this.interstitialShowing || completedClears < 3 || Date.now() - this.lastInterstitialAt < 10 * 60 * 1000) {
      return;
    }
    this.interstitialShowing = true;
    AnalyticsService.track('ad_request', { format: 'interstitial', placement: 'natural_break' });
    this.interstitialAd.show()
      .then(() => {
        this.lastInterstitialAt = Date.now();
        AnalyticsService.track('ad_show', { format: 'interstitial', placement: 'natural_break' });
      })
      .catch((error: unknown) => AnalyticsService.track('ad_error', { format: 'interstitial', placement: 'natural_break', error: this.errorMessage(error) }))
      .finally(() => { this.interstitialShowing = false; });
  }

  private static presentRewarded(placement: RewardedAdPlacement): Promise<RewardedAdResult> {
    return new Promise((resolve) => {
      const ad = this.rewardedVideoAd;
      let settled = false;
      const timeout = setTimeout(() => {
        finish({ completed: false, placement, error: '广告响应超时，请稍后再试' });
      }, 120_000);
      const finish = (result: RewardedAdResult, reload = true): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        ad.offClose(onClose);
        if (ad.offError) ad.offError(onError);
        this.state = 'unavailable';
        if (reload) void this.preload();
        resolve(result);
      };
      const onClose = (res?: { isEnded?: boolean }): void => {
        const completed = res === undefined || res.isEnded === true;
        if (!completed) {
          AnalyticsService.track('ad_cancel', { placement });
          finish({ completed: false, placement, error: '完整观看后才能领取奖励' });
          return;
        }
        const transactionId = this.makeTransactionId(placement);
        AnalyticsService.track('ad_completed', { placement, transactionId });
        AnalyticsService.track('ad_reward', { placement, transactionId });
        finish({ completed: true, placement, transactionId });
      };
      const onError = (error: unknown): void => {
        if (settled) return;
        this.recordLoadFailure('runtime', error, placement);
        finish(this.completeFallbackOrFail(placement, this.errorMessage(error)), false);
      };

      ad.onClose(onClose);
      if (ad.onError) ad.onError(onError);
      this.state = 'showing';
      ad.show()
        .then(() => {
          this.markShown(placement);
          AnalyticsService.track('ad_show', { placement });
          AnalyticsService.track('ad_start', { placement });
        })
        .catch((error: unknown) => {
          this.recordLoadFailure('show', error, placement);
          const fallback = this.completeFallbackOrFail(placement, this.errorMessage(error));
          finish(fallback, false);
        });
    });
  }

  private static completeFallbackOrFail(placement: RewardedAdPlacement, error: string): RewardedAdResult {
    if (this.loadFailures < 3) {
      return this.fail(placement, error);
    }
    this.loadFailures = 0;
    this.markShown(placement);
    const transactionId = this.makeTransactionId(placement);
    AnalyticsService.track('ad_completed', { placement, transactionId, fallback: true });
    AnalyticsService.track('ad_reward', { placement, transactionId, fallback: true });
    return { completed: true, placement, transactionId, fallback: true };
  }

  private static checkLimits(placement: RewardedAdPlacement): string {
    const limit = this.limits[placement];
    const remaining = limit.cooldownMs - (Date.now() - (this.lastShownAt[placement] || 0));
    if (remaining > 0) {
      return `广告冷却中，请 ${Math.ceil(remaining / 1000)} 秒后再试`;
    }
    if ((this.sessionCounts[placement] || 0) >= limit.session) {
      return '本次游戏该奖励已达上限';
    }
    if (this.getDailyCount(placement) >= limit.daily) {
      return '今日该奖励已达上限';
    }
    return '';
  }

  private static markShown(placement: RewardedAdPlacement): void {
    this.lastShownAt[placement] = Date.now();
    this.sessionCounts[placement] = (this.sessionCounts[placement] || 0) + 1;
    const caps = this.loadDailyCaps();
    caps.counts[placement] = (caps.counts[placement] || 0) + 1;
    try {
      sys.localStorage.setItem(DAILY_CAP_KEY, JSON.stringify(caps));
    } catch (error) {
      console.warn('[AdService] failed to persist daily cap:', error);
    }
  }

  private static getDailyCount(placement: RewardedAdPlacement): number {
    return this.loadDailyCaps().counts[placement] || 0;
  }

  private static loadDailyCaps(): { dateKey: string; counts: Partial<Record<RewardedAdPlacement, number>> } {
    const dateKey = new Date().toDateString();
    try {
      const parsed = JSON.parse(sys.localStorage.getItem(DAILY_CAP_KEY) || '{}');
      if (parsed.dateKey === dateKey && parsed.counts && typeof parsed.counts === 'object') {
        return parsed;
      }
    } catch (_error) {
      // A malformed local cap should reset to a clean day, never block the player forever.
    }
    return { dateKey, counts: {} };
  }

  private static recordLoadFailure(stage: string, error: unknown, placement?: RewardedAdPlacement): void {
    this.state = 'unavailable';
    this.loadFailures++;
    AnalyticsService.track('ad_error', { placement: placement || 'preload', stage, error: this.errorMessage(error), failures: this.loadFailures });
    if (this.retryTimer) clearTimeout(this.retryTimer);
    const delay = Math.min(60_000, 2_000 * Math.pow(2, Math.min(5, this.loadFailures - 1)));
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.preload();
    }, delay);
  }

  private static fail(placement: RewardedAdPlacement, error: string): RewardedAdResult {
    AnalyticsService.track('ad_error', { placement, stage: 'request', error });
    return { completed: false, placement, error };
  }

  private static makeTransactionId(placement: RewardedAdPlacement): string {
    this.transactionSerial++;
    return `${placement}:${Date.now()}:${this.transactionSerial}`;
  }

  private static errorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (error && typeof error === 'object' && 'errMsg' in error) return String((error as any).errMsg);
    return String(error || '广告服务异常');
  }
}
