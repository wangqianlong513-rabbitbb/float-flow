import { LevelConfig, RunnerState, TileType } from '../core/GameTypes';

declare const wx: any;

export interface ResidualSharePayload {
  levelId: number;
  runner: RunnerState;
  hand: TileType[];
  seed?: number;
}

export class ShareService {
  static encodeResidual(payload: ResidualSharePayload): string {
    const json = JSON.stringify(payload);
    return encodeURIComponent(json);
  }

  static decodeResidual(value: string): ResidualSharePayload | null {
    try {
      return JSON.parse(decodeURIComponent(value)) as ResidualSharePayload;
    } catch (_error) {
      return null;
    }
  }

  static shareResidual(level: LevelConfig, payload: ResidualSharePayload): void {
    const query = `residual=${this.encodeResidual(payload)}`;
    const title = `我在《浮岛流光》第 ${level.id} 关只差一步，帮我接上这束光！`;
    this.share(title, query);
  }

  static sharePoster(level: LevelConfig, scoreText: string): void {
    const title = `我在《浮岛流光》第 ${level.id} 关打出了 ${scoreText}，来挑战我的光轨！`;
    this.share(title, `level=${level.id}`);
  }

  private static share(title: string, query: string): void {
    if (typeof wx === 'undefined' || !wx.shareAppMessage) {
      // eslint-disable-next-line no-console
      console.log('[ShareService]', title, query);
      return;
    }
    wx.shareAppMessage({ title, query });
  }
}
