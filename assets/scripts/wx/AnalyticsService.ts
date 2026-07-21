import { sys } from 'cc';

const ANALYTICS_QUEUE_KEY = 'flow_land_light_analytics_queue';

declare const wx: any;

export type AnalyticsEventName =
  | 'home_start_journey'
  | 'home_start_daily'
  | 'home_open_welfare'
  | 'home_open_daily_rank'
  | 'share_invite'
  | 'share_residual'
  | 'daily_success'
  | 'level_success'
  | 'level_fail'
  | 'ad_request'
  | 'ad_completed'
  | 'theme_unlock'
  | 'theme_apply'
  | 'power_save_toggle';

export class AnalyticsService {
  static track(event: AnalyticsEventName, params: Record<string, unknown> = {}): void {
    const payload = {
      event,
      params,
      ts: Date.now(),
    };

    if (typeof wx !== 'undefined' && wx.reportEvent) {
      try {
        wx.reportEvent(event, params);
        return;
      } catch (error) {
        console.warn('[AnalyticsService] wx.reportEvent failed:', error);
      }
    }

    this.enqueue(payload);
    console.log('[Analytics Mock]', payload);
  }

  static flushMockQueue(): Array<{ event: string; params: Record<string, unknown>; ts: number }> {
    try {
      const raw = sys.localStorage.getItem(ANALYTICS_QUEUE_KEY);
      sys.localStorage.removeItem(ANALYTICS_QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_error) {
      return [];
    }
  }

  private static enqueue(payload: { event: string; params: Record<string, unknown>; ts: number }): void {
    try {
      const raw = sys.localStorage.getItem(ANALYTICS_QUEUE_KEY);
      const queue = raw ? JSON.parse(raw) as Array<typeof payload> : [];
      queue.push(payload);
      sys.localStorage.setItem(ANALYTICS_QUEUE_KEY, JSON.stringify(queue.slice(-80)));
    } catch (error) {
      console.warn('[AnalyticsService] enqueue failed:', error);
    }
  }
}
