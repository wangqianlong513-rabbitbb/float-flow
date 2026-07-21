import { LevelConfig, RunnerState, TileType } from '../core/GameTypes';
import { SharePosterService } from './SharePosterService';

declare const wx: any;

export interface ResidualSharePayload {
  levelId: number;
  runner: RunnerState;
  hand: TileType[];
  assistId?: string;
  moves?: number;
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
    const title = `差一步就通关！帮我接上《浮岛流光》第 ${level.id} 关这束光`;
    SharePosterService.createPosterAsync({
      kind: 'residual',
      level,
      headline: '差 一 步 就 通 关',
      subline: `第 ${level.id} 关 · 好友求助残局`,
      badgeText: '帮我接上这束光',
      metricText: `已走 ${payload.moves ?? 0} 步 · 帮 TA 成功得 80 钻`,
    }, (imageUrl) => this.share(title, query, imageUrl));
  }

  static shareResidualSolved(level: LevelConfig, assistId: string): void {
    const title = `我帮你接通《浮岛流光》第 ${level.id} 关了，回来领助攻晶核！`;
    const query = `assistDone=${encodeURIComponent(assistId)}`;
    SharePosterService.createPosterAsync({
      kind: 'victory',
      level,
      headline: '好 友 助 攻 成 功',
      subline: `第 ${level.id} 关 · 求助已接通`,
      badgeText: '回来领 60 钻',
      metricText: '你也来挑战我的接光速度',
    }, (imageUrl) => this.share(title, query, imageUrl));
  }

  static sharePoster(level: LevelConfig, scoreText: string): void {
    const isDaily = level.name.indexOf('今日光路') !== -1 || level.id >= 800000;
    const title = isDaily
      ? `今日光路挑战我打出 ${scoreText}，来比谁更少步！`
      : `我在《浮岛流光》第 ${level.id} 关打出 ${scoreText}，你能少一步吗？`;
    const query = isDaily ? 'daily=1' : `level=${level.id}`;
    SharePosterService.createPosterAsync({
      kind: 'victory',
      level,
      headline: isDaily ? '今 日 光 路 已 连 通' : '光 路 完 美 连 通',
      subline: isDaily ? `${level.name} · 30 秒挑战` : `第 ${level.id} 关 · ${level.name}`,
      badgeText: scoreText,
      metricText: isDaily ? '点开立刻挑战同一道题' : '来挑战我的光轨记录',
    }, (imageUrl) => this.share(title, query, imageUrl));
  }

  static shareInvite(): void {
    this.share('我发现一个3秒上手的光路解谜，来《浮岛流光》比谁接得更快！', 'invite=1');
  }

  static saveVictoryPoster(level: LevelConfig, scoreText: string, onDone?: (ok: boolean, message: string) => void): void {
    const isDaily = level.name.indexOf('今日光路') !== -1 || level.id >= 800000;
    SharePosterService.savePosterToAlbum({
      kind: 'victory',
      level,
      headline: isDaily ? '今 日 光 路 已 连 通' : '光 路 完 美 连 通',
      subline: isDaily ? `${level.name} · 30 秒挑战` : `第 ${level.id} 关 · ${level.name}`,
      badgeText: scoreText,
      metricText: isDaily ? '发朋友圈晒同题挑战' : '保存战绩图，发给好友挑战',
    }, onDone);
  }

  private static share(title: string, query: string, imageUrl?: string): void {
    if (typeof wx === 'undefined' || !wx.shareAppMessage) {
      // eslint-disable-next-line no-console
      console.log('[ShareService]', title, query, imageUrl ? `(poster: ${imageUrl})` : '(no poster)');
      return;
    }
    wx.shareAppMessage(imageUrl ? { title, query, imageUrl } : { title, query });
  }
}
