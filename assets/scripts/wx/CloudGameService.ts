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
const DAILY_RANK_CACHE_KEY = 'flow_land_light_daily_rank_cache';

declare const wx: any;

export class CloudGameService {
  static getTodayKey(): string {
    const now = new Date();
    const month = `${now.getMonth() + 1}`.padStart(2, '0');
    const day = `${now.getDate()}`.padStart(2, '0');
    return `${now.getFullYear()}${month}${day}`;
  }

  static submitDailyChallenge(dateKey: string, score: number, moves: number): DailyLeaderboardResult {
    void this.fetchDailyLeaderboard(dateKey, score, moves, true);
    return this.getDailyLeaderboard(dateKey, score, moves);
  }

  static getDailyLeaderboard(dateKey: string, selfScore = 0, selfMoves = 0): DailyLeaderboardResult {
    const cached = this.loadDailyRankCache();
    const entries = cached?.dateKey === dateKey ? cached.entries.map((entry) => ({ ...entry })) : [];
    if (selfScore > 0) {
      const existingSelf = entries.find((entry) => entry.isSelf);
      if (existingSelf) {
        if (selfScore > existingSelf.score || (selfScore === existingSelf.score && selfMoves > 0 && selfMoves < existingSelf.moves)) {
          existingSelf.score = Math.round(selfScore);
          existingSelf.moves = selfMoves || this.estimateMoves(selfScore);
        }
      } else {
        entries.push({
          openId: 'self',
          nickname: '你',
          avatarText: '我',
          score: Math.round(selfScore),
          moves: selfMoves || this.estimateMoves(selfScore),
          isSelf: true,
        });
      }
    }

    entries.sort((a, b) => b.score - a.score || a.moves - b.moves);
    const selfIndex = entries.findIndex((entry) => entry.isSelf);
    const selfRank = selfIndex >= 0 ? selfIndex + 1 : 0;
    const beatPercent = selfIndex >= 0 ? Math.round(((entries.length - selfRank) / Math.max(1, entries.length - 1)) * 100) : 0;
    const nextTarget = selfIndex > 0 ? entries[selfIndex - 1] : undefined;
    const hintText = nextTarget
      ? `再少 ${Math.max(1, selfMoves - nextTarget.moves + 1)} 步，可超越 ${nextTarget.nickname}`
      : (selfIndex === 0
        ? (entries.length > 1 ? '你暂列好友第 1，快分享守榜！' : '暂无好友成绩，邀请好友来挑战')
        : '完成今日挑战后解锁好友排名');

    return { dateKey, entries, selfRank, beatPercent, nextTarget, hintText };
  }

  static async fetchDailyLeaderboard(dateKey: string, selfScore = 0, selfMoves = 0, submit = false): Promise<DailyLeaderboardResult> {
    if (typeof wx === 'undefined' || !wx.cloud || !wx.cloud.callFunction) {
      return this.getDailyLeaderboard(dateKey, selfScore, selfMoves);
    }
    try {
      const response = await wx.cloud.callFunction({
        name: 'flowLightGame',
        data: { action: submit ? 'submitDailyChallenge' : 'getDailyLeaderboard', dateKey, score: selfScore, moves: selfMoves }
      });
      const payload = response?.result;
      if (!payload?.ok || !Array.isArray(payload.entries)) {
        throw new Error(payload?.code || 'INVALID_DAILY_RANK');
      }
      const entries: DailyLeaderboardEntry[] = payload.entries.map((entry: any, index: number) => ({
        openId: String(entry.openid || `friend_${index}`),
        nickname: entry.isSelf ? '你' : `好友 ${index + 1}`,
        avatarText: entry.isSelf ? '我' : `${index + 1}`,
        score: Math.max(0, Math.floor(Number(entry.score) || 0)),
        moves: Math.max(0, Math.floor(Number(entry.moves) || 0)),
        isSelf: !!entry.isSelf,
      }));
      this.saveDailyRankCache({ dateKey, entries });
      return this.getDailyLeaderboard(dateKey, selfScore, selfMoves);
    } catch (error) {
      console.warn('[CloudGameService] daily leaderboard fallback:', error);
      return this.getDailyLeaderboard(dateKey, selfScore, selfMoves);
    }
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

  private static estimateMoves(score: number): number {
    return Math.max(3, Math.min(10, Math.round((118 - score) / 8)));
  }

  private static loadDailyRankCache(): { dateKey: string; entries: DailyLeaderboardEntry[] } | null {
    try {
      const raw = sys.localStorage.getItem(DAILY_RANK_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return typeof parsed?.dateKey === 'string' && Array.isArray(parsed?.entries) ? parsed : null;
    } catch (error) {
      console.warn('[CloudGameService] failed to load daily rank cache:', error);
      return null;
    }
  }

  private static saveDailyRankCache(cache: { dateKey: string; entries: DailyLeaderboardEntry[] }): void {
    try {
      sys.localStorage.setItem(DAILY_RANK_CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.warn('[CloudGameService] failed to save daily rank cache:', error);
    }
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
