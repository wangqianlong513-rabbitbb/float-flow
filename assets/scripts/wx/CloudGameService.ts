import { sys } from 'cc';

export interface DailyLeaderboardEntry {
  openId: string;
  nickname: string;
  avatarText: string;
  score: number;
  moves: number;
  isSelf?: boolean;
}

export interface DailyLeaderboardResult {
  dateKey: string;
  entries: DailyLeaderboardEntry[];
  selfRank: number;
  beatPercent: number;
  nextTarget?: DailyLeaderboardEntry;
  hintText: string;
}

interface MockCloudState {
  residualAssists: Record<string, { levelId: number; createdAt: number; completedAt?: number; requesterClaimed?: boolean }>;
}

const MOCK_CLOUD_KEY = 'flow_land_light_cloud_mock';

declare const wx: any;

export class CloudGameService {
  static getTodayKey(): string {
    const now = new Date();
    const month = `${now.getMonth() + 1}`.padStart(2, '0');
    const day = `${now.getDate()}`.padStart(2, '0');
    return `${now.getFullYear()}${month}${day}`;
  }

  static submitDailyChallenge(dateKey: string, score: number, moves: number): DailyLeaderboardResult {
    this.callCloudMock('submitDailyChallenge', { dateKey, score, moves });
    return this.getDailyLeaderboard(dateKey, score, moves);
  }

  static getDailyLeaderboard(dateKey: string, selfScore = 0, selfMoves = 0): DailyLeaderboardResult {
    const entries = this.buildMockDailyEntries(dateKey);
    if (selfScore > 0) {
      entries.push({
        openId: 'self',
        nickname: '你',
        avatarText: '我',
        score: Math.round(selfScore),
        moves: selfMoves || this.estimateMoves(selfScore),
        isSelf: true,
      });
    }

    entries.sort((a, b) => b.score - a.score || a.moves - b.moves);
    const selfIndex = entries.findIndex((entry) => entry.isSelf);
    const selfRank = selfIndex >= 0 ? selfIndex + 1 : 0;
    const beatPercent = selfIndex >= 0 ? Math.round(((entries.length - selfRank) / Math.max(1, entries.length - 1)) * 100) : 0;
    const nextTarget = selfIndex > 0 ? entries[selfIndex - 1] : undefined;
    const hintText = nextTarget
      ? `再少 ${Math.max(1, selfMoves - nextTarget.moves + 1)} 步，可超越 ${nextTarget.nickname}`
      : (selfIndex === 0 ? '你暂列好友第 1，快分享守榜！' : '完成今日挑战后解锁好友排名');

    return { dateKey, entries, selfRank, beatPercent, nextTarget, hintText };
  }

  static registerResidualAssist(assistId: string, levelId: number): void {
    if (!assistId) return;
    const state = this.loadState();
    state.residualAssists[assistId] = state.residualAssists[assistId] || { levelId, createdAt: Date.now() };
    this.saveState(state);
    this.callCloudMock('registerResidualAssist', { assistId, levelId });
  }

  static completeResidualAssist(assistId: string): void {
    if (!assistId) return;
    const state = this.loadState();
    const record = state.residualAssists[assistId] || { levelId: 0, createdAt: Date.now() };
    record.completedAt = Date.now();
    state.residualAssists[assistId] = record;
    this.saveState(state);
    this.callCloudMock('completeResidualAssist', { assistId });
  }

  static canClaimResidualRequesterReward(assistId: string): boolean {
    const state = this.loadState();
    const record = state.residualAssists[assistId];
    // In local mock mode the share-return query is treated as completion proof if the origin record exists.
    return !!record && !record.requesterClaimed;
  }

  static markResidualRequesterRewardClaimed(assistId: string): void {
    const state = this.loadState();
    const record = state.residualAssists[assistId];
    if (record) {
      record.requesterClaimed = true;
      record.completedAt = record.completedAt || Date.now();
      this.saveState(state);
    }
    this.callCloudMock('claimResidualRequesterReward', { assistId });
  }

  private static buildMockDailyEntries(dateKey: string): DailyLeaderboardEntry[] {
    const names = ['阿泽', '小鹿', '江江', '米粒', '小北', '安然', '橙子', 'Leo'];
    const seed = this.seedFromDate(dateKey);
    return names.map((name, idx) => {
      const moves = 3 + ((seed + idx * 7) % 6);
      const score = 118 - moves * 8 + ((seed + idx * 13) % 9);
      return {
        openId: `mock_${idx}`,
        nickname: name,
        avatarText: name.substring(0, 1),
        score,
        moves,
      };
    });
  }

  private static estimateMoves(score: number): number {
    return Math.max(3, Math.min(10, Math.round((118 - score) / 8)));
  }

  private static seedFromDate(dateKey: string): number {
    let seed = 0;
    for (let i = 0; i < dateKey.length; i++) {
      seed = (seed * 31 + dateKey.charCodeAt(i)) % 9973;
    }
    return seed;
  }

  private static callCloudMock(action: string, data: Record<string, unknown>): void {
    if (typeof wx !== 'undefined' && wx.cloud && wx.cloud.callFunction) {
      const task = wx.cloud.callFunction({ name: 'flowLightGame', data: { action, ...data } });
      if (task && typeof task.catch === 'function') {
        task.catch((err: unknown) => {
          console.warn('[CloudGameService] cloud call fallback:', action, err);
        });
      }
      return;
    }
    console.log('[CloudGameService Mock]', action, data);
  }

  private static loadState(): MockCloudState {
    try {
      const raw = sys.localStorage.getItem(MOCK_CLOUD_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as MockCloudState;
        parsed.residualAssists = parsed.residualAssists || {};
        return parsed;
      }
    } catch (error) {
      console.warn('[CloudGameService] failed to load mock state:', error);
    }
    return { residualAssists: {} };
  }

  private static saveState(state: MockCloudState): void {
    try {
      sys.localStorage.setItem(MOCK_CLOUD_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('[CloudGameService] failed to save mock state:', error);
    }
  }
}
