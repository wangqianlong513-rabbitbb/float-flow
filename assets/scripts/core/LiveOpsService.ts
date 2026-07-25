export interface LiveOpsEvent {
  id: string;
  title: string;
  tag: string;
  rewardMultiplier: number;
  recommendedVersion: string;
}

export class LiveOpsService {
  static getTodayKey(now = new Date()): string {
    const y = now.getFullYear();
    const m = `${now.getMonth() + 1}`.padStart(2, '0');
    const d = `${now.getDate()}`.padStart(2, '0');
    return `${y}${m}${d}`;
  }

  static getActiveEvent(now = new Date()): LiveOpsEvent {
    const weekday = now.getDay();
    if (weekday === 0 || weekday === 6) {
      return {
        id: `weekend_blackhole_${this.getTodayKey(now)}`,
        title: '周末黑洞追逐',
        tag: 'blackhole_weekend',
        rewardMultiplier: 1.5,
        recommendedVersion: 'v1.5',
      };
    }
    if (weekday === 3) {
      return {
        id: `midweek_relay_${this.getTodayKey(now)}`,
        title: '好友光路接力',
        tag: 'relay_day',
        rewardMultiplier: 1.25,
        recommendedVersion: 'v1.6',
      };
    }
    return {
      id: `daily_remnant_${this.getTodayKey(now)}`,
      title: '每日残局',
      tag: 'daily_remnant',
      rewardMultiplier: 1,
      recommendedVersion: 'v1.5',
    };
  }
}
