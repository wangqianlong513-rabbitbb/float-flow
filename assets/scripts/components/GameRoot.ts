import {
  _decorator,
  Color,
  Component,
  EventTouch,
  Graphics,
  Label,
  Layers,
  Node,
  UITransform,
  Vec3,
  director,
  tween,
  view,
} from 'cc';
import { CardSystem } from '../core/CardSystem';
import { GridManager } from '../core/GridManager';
import { move } from '../core/DirectionUtils';
import { GoalConfig, GridPos, LevelConfig, RunnerColor, RunnerState, TileInstance, TileType } from '../core/GameTypes';
import { RouteSimulator } from '../core/RouteSimulator';
import { createTile, getTileDisplayName, resolveTileConfig, rotateTile } from '../core/TileDefinitions';
import { BUILTIN_LEVELS } from '../level/BuiltinLevels';
import { WeChatService } from '../wx/WeChatService';
import { ShareService } from '../wx/ShareService';
import { ProfileManager } from '../core/ProfileManager';
import { CloudGameService } from '../wx/CloudGameService';
import { AnalyticsService } from '../wx/AnalyticsService';

export interface FailureShareSummary {
  levelId: number;
  levelName: string;
  moves: number;
  handCount: number;
  reason: string;
  isNearGoal: boolean;
}

interface ConfettiParticle {
  node: Node;
  graphics: Graphics;
  vx: number;
  vy: number;
  rotationSpeed: number;
  color: Color;
  age: number;
  maxAge: number;
}

interface RewindSnapshot {
  runner: RunnerState;
  currentBulletTime: number;
  flowEnergy: number;
  hand: TileType[];
  usedMoves: number;
}

interface BlessingOption {
  id: string;
  title: string;
  desc: string;
  color: string;
}

const { ccclass, property } = _decorator;

@ccclass('GameRoot')
export class GameRoot extends Component {
  @property(Node)
  boardRoot: Node | null = null;

  @property(Node)
  previewRoot: Node | null = null;

  @property(Node)
  runnerRoot: Node | null = null;

  @property(Node)
  cardRoot: Node | null = null;

  @property(Graphics)
  bottomDeckGraphics: Graphics | null = null;

  @property(Label)
  levelLabel: Label | null = null;

  @property(Label)
  tipLabel: Label | null = null;

  @property(Label)
  statusLabel: Label | null = null;

  @property(Node)
  bulletTimeNode: Node | null = null;

  @property(Graphics)
  bulletTimeGraphics: Graphics | null = null;

  @property(Label)
  bulletTimeValueLabel: Label | null = null;

  public onShowReviveModalCallback?: (summary: FailureShareSummary) => void;
  public onShowVictoryPosterCallback?: (levelId: number, levelName: string, stars: number, moves: number) => void;

  @property
  tileWidth = 112;

  @property
  tileHeight = 112;

  @property
  tileGap = 10;

  @property
  cardWidth = 196;

  @property
  cardHeight = 160;

  private levels: LevelConfig[] = BUILTIN_LEVELS;
  private levelIndex = 0;
  private level: LevelConfig | null = null;
  private grid: GridManager | null = null;
  private runner: RunnerState | null = null;
  private cardSystem: CardSystem | null = null;
  private hand: TileType[] = [];
  private tileNodes = new Map<string, Node>();
  private cardNodes: Node[] = [];
  private runnerNode: Node | null = null;
  private dragTile: TileInstance | null = null;
  private dragCardIndex = -1;
  private dragNode: Node | null = null;
  private hoverCell: GridPos | null = null;
  private usedMoves = 0;
  public undoRemaining = 1;
  public eraseRemaining = 1;
  private moveHistory: { pos: GridPos; cardIndex: number; tileType: TileType }[] = [];
  private flowEnergy = 0;
  private runnerTimer = 0;
  private maxBulletTime = 3.0;
  private currentBulletTime = 3.0;
  private isResolving = false;
  private currentTheme = 0; // 0: Icefield, 1: Violet Dusk, 2: Sunset Glow
  private isEndlessMode = false;
  private isDailyChallenge = false;
  private residualAssistId = '';
  private powerSaveMode = ProfileManager.isPowerSaveMode();
  private endlessStageIndex = 0;
  private endlessScore = 0;
  private fourthSlotUnlocked = false;
  private selectedCardIndex = -1;
  private hasMovedDuringDrag = false;
  private bonusCell: GridPos | null = null;
  private hintHighlightNode: Node | null = null;
  private tutorialOverlayNode: Node | null = null;
  private bonusCollected = false;
  private bonusNode: Node | null = null;
  private starCoreNodes = new Map<string, Node>();
  private triggeredSkillTiles = new Set<string>();
  private rewindSnapshot: RewindSnapshot | null = null;
  private timeRewindUsed = false;
  private blessingOverlayNode: Node | null = null;
  private pendingBonusDiamonds = 0;
  private skillComboCount = 0;
  private activeParticles: ConfettiParticle[] = [];
  private statusToastSerial = 0;


  public applyTheme(themeIdx: number): void {
    console.log(`[GameRoot] Apply Theme Index ${themeIdx}`);
    this.currentTheme = themeIdx;
    if (this.level) {
      this.renderBoard();
      this.renderAllTiles();
      this.renderCards();
    }
  }

  public applyPowerSaveMode(enabled: boolean): void {
    this.powerSaveMode = enabled;
  }

  protected start(): void {
    // If this log does not appear in Preview console, the component is not mounted.
    console.log('[FloatFlow] GameRoot started');
    this.ensureRoots();
    this.loadLevel(0);
  }

  protected update(deltaTime: number): void {
    this.updateConfettiParticles(deltaTime);

    if (!this.level || !this.grid || !this.runner || this.isResolving) {
      return;
    }

    // 1. Bullet Time Mechanics: specifically triggers ONLY during card dragging (`isDragging`), never just by running!
    const isDragging = this.dragTile !== null;
    const isRunning = this.runner.state === 'RUNNING';
    const isBulletTimeActive = isDragging;

    if (isBulletTimeActive && this.currentBulletTime > 0) {
      this.currentBulletTime = Math.max(0, this.currentBulletTime - deltaTime);
      if (this.currentBulletTime === 0 && isRunning) {
        this.setStatus('⚠️ 子弹时间已耗尽！流光恢复正常光速飞行...');
      }
      this.redrawBulletTimeMeter();
    } else if (!isBulletTimeActive && !isRunning && this.currentBulletTime < this.maxBulletTime) {
      // Recharges slowly while resting/planning in IDLE
      this.currentBulletTime = Math.min(this.maxBulletTime, this.currentBulletTime + deltaTime * 0.4);
      this.redrawBulletTimeMeter();
    }

    if (!isRunning) {
      return;
    }

    const slowFactor = (isDragging && this.currentBulletTime > 0) ? 0.35 : 1.0;
    this.runnerTimer += deltaTime * slowFactor;
    if (this.runnerTimer >= this.level.runnerStepSeconds / Math.max(0.1, this.runner.speed)) {
      this.runnerTimer = 0;
      this.advanceRunnerOneStep();
    }
  }

  public getLevelIndex(): number {
    return this.levelIndex;
  }

  public loadNextLevel(): void {
    WeChatService.vibrateShort('light');
    const maxJourneyLevelCount = this.levels.length * 2;
    const next = Math.min(this.levelIndex + 1, maxJourneyLevelCount - 1);
    this.loadLevel(next);
  }

  public restartLevel(preserveChances = false): void {
    WeChatService.vibrateShort('light');
    this.loadLevel(this.levelIndex, preserveChances);
  }

  public startRunner(): void {
    if (this.runner && this.runner.state === 'IDLE') {
      WeChatService.vibrateShort('light');
      this.rewindSnapshot = this.createRewindSnapshot();
      this.runner.state = 'RUNNING';
      this.setStatus('流光已启动！观察光路与救场触发。');
    }
  }

  public redrawCardsByAdStub(): void {
    // This button hook is useful before the real WeChat rewarded video service is wired.
    if (!this.cardSystem) {
      return;
    }
    WeChatService.vibrateShort('light');
    this.hand = this.cardSystem.redrawAll();
    this.renderCards();
    this.setStatus('手牌已刷新');
  }

  public clearPlacedTiles(): void {
    console.log('[FloatFlow] Clear Placed Tiles');
    WeChatService.vibrateShort('light');
    if (this.eraseRemaining <= 0) {
      WeChatService.showModal({
        title: '免费清盘已耗尽',
        content: '本关卡免费清盘(擦除)次数(1次)已用完！是否观看一段短视频广告立刻获取补给并为你清空重置手牌？',
        confirmText: '观看广告',
        cancelText: '暂不需要',
        success: (res) => {
          if (res.confirm) {
            console.log('[FloatFlow] Watch Ad for Erase Reset');
            WeChatService.showVideoAd(() => {
              this.eraseRemaining = 1;
              WeChatService.showToast('★ 广告观看成功，已重置清盘机会！', 'success');
              this.setStatus('★ 已补给 1 次清盘机会并自动为您重置棋盘！');
              this.clearPlacedTiles();
            });
          }
        },
      });
      return;
    }
    if (this.moveHistory.length === 0 && this.usedMoves === 0) {
      this.setStatus('当前棋盘已经很干净啦，无需擦除。');
      return;
    }

    this.eraseRemaining--;
    this.restartLevel(true);
    this.setStatus(`已擦除放置地砖，手牌已重置（本关剩余清盘：${this.eraseRemaining}/1 次）`);
  }

  public undoLastMove(): void {
    console.log('[FloatFlow] Undo Last Move');
    WeChatService.vibrateShort('light');
    if (!this.grid || !this.cardSystem || this.runner?.state === 'RUNNING') {
      return;
    }
    if (this.undoRemaining <= 0) {
      WeChatService.showModal({
        title: '免费撤回已耗尽',
        content: '本关卡免费撤回次数(1次)已用完！是否观看一段短视频广告立刻获得 1 次撤回机会？',
        confirmText: '观看广告',
        cancelText: '暂不需要',
        success: (res) => {
          if (res.confirm) {
            console.log('[FloatFlow] Watch Ad for Undo Reset');
            WeChatService.showVideoAd(() => {
              this.undoRemaining = 1;
              WeChatService.showToast('★ 广告观看成功，已获得 1 次撤回机会！', 'success');
              this.setStatus('★ 补给成功！已获得 1 次撤回机会！');
              if (this.moveHistory.length > 0) {
                this.undoLastMove();
              } else {
                WeChatService.showToast('现在去放置地砖，走错时随时可使用撤回哦~', 'none');
              }
            });
          }
        },
      });
      return;
    }
    if (this.moveHistory.length === 0) {
      this.setStatus('当前没有任何可撤回的放置操作！');
      return;
    }

    const last = this.moveHistory.pop();
    if (!last) return;

    this.undoRemaining--;
    this.grid.setTile(last.pos, null);
    const key = this.key(last.pos);
    this.tileNodes.get(key)?.destroy();
    this.tileNodes.delete(key);

    this.hand = this.cardSystem.returnTileToHand(last.cardIndex, last.tileType);
    this.renderCards();

    this.usedMoves = Math.max(0, this.usedMoves - 1);
    this.updateLabels();
    this.updateRoutePreviewLine();
    this.setStatus(`已撤回上一步地砖（本关剩余撤回：${this.undoRemaining}/1 次）`);
  }

  public showRoutePreview(): void {
    console.log('[FloatFlow] Show Route Preview');
    WeChatService.vibrateShort('light');
    if (this.previewRoot) {
      this.previewRoot.active = !this.previewRoot.active;
      this.setStatus(this.previewRoot.active ? '光轨预测已开启' : '光轨预测已隐藏');
      this.updateRoutePreviewLine();
    }
  }

  public reviveRunner(): void {
    console.log('[FloatFlow] Revive Runner!');
    if (this.runner && (this.runner.state === 'DEAD' || this.runner.state === 'IDLE')) {
      WeChatService.vibrateShort('light');
      this.runner.state = 'IDLE';
      if (this.cardSystem) {
        this.hand = this.cardSystem.drawInitial();
        this.renderCards();
      }
      this.setStatus('时空导师已降临！救场成功，获得3秒无敌光环，请继续放置手牌！');
    }
  }

  public findIndexByLevelId(levelId: number): number {
    return this.levels.findIndex((l) => l.id === levelId);
  }

  public shareCurrentResidual(): void {
    if (!this.level || !this.runner) return;
    WeChatService.vibrateShort('light');
    const assistId = `${this.level.id}-${Date.now().toString(36)}-${Math.floor(Math.random() * 10000)}`;
    AnalyticsService.track('share_residual', { levelId: this.level.id, moves: this.usedMoves, handCount: this.hand.length });
    ProfileManager.markResidualHelpShared(assistId, this.level.id);
    CloudGameService.registerResidualAssist(assistId, this.level.id);
    ShareService.shareResidual(this.level, {
      levelId: this.level.id,
      runner: this.runner,
      hand: this.hand,
      assistId,
      moves: this.usedMoves,
    });
    WeChatService.showToast('分享残局求助中...', 'success');
  }

  public loadResidualFromShare(residualStr: string): void {
    const payload = ShareService.decodeResidual(residualStr);
    if (!payload || typeof payload.levelId !== 'number') return;
    const idx = this.findIndexByLevelId(payload.levelId);
    if (idx >= 0) {
      this.loadLevel(idx);
      if (payload.runner) {
        this.runner = { ...payload.runner };
        this.renderRunner();
      }
      if (payload.hand && Array.isArray(payload.hand)) {
        this.hand = this.cardSystem ? this.cardSystem.setHand(payload.hand) : [...payload.hand];
        this.renderCards();
      }
      this.residualAssistId = payload.assistId || '';
      this.setStatus('已还原好友求助残局，帮 TA 接上这束光吧！成功可得 80 钻助攻奖。');
      WeChatService.vibrateShort('medium');
    }
  }

  public loadDailyChallenge(): void {
    WeChatService.vibrateShort('medium');
    if (this.hintHighlightNode) {
      this.hintHighlightNode.destroy();
      this.hintHighlightNode = null;
    }
    if (this.tutorialOverlayNode) {
      this.tutorialOverlayNode.destroy();
      this.tutorialOverlayNode = null;
    }
    if (this.blessingOverlayNode) {
      this.blessingOverlayNode.destroy();
      this.blessingOverlayNode = null;
    }

    this.isEndlessMode = true;
    this.isDailyChallenge = true;
    this.endlessStageIndex = 0;
    this.endlessScore = 0;
    this.levelIndex = 0;
    this.fourthSlotUnlocked = false;
    this.undoRemaining = 1;
    this.eraseRemaining = 1;
    this.moveHistory = [];
    this.residualAssistId = '';
    this.triggeredSkillTiles.clear();
    this.rewindSnapshot = null;
    this.timeRewindUsed = false;
    this.pendingBonusDiamonds = 0;
    this.skillComboCount = 0;
    this.level = this.generateDailyChallengeLevel();
    this.grid = GridManager.fromLevel(this.level);
    this.runner = { ...this.level.start, state: 'IDLE' };
    this.cardSystem = new CardSystem(this.withSkillTiles(this.level.tilePool), this.level.handSize, this.level.fixedHands ?? []);
    this.hand = this.cardSystem.drawInitial();
    this.usedMoves = 0;
    this.flowEnergy = this.level.bulletTimeEnergy ?? 3;
    this.runnerTimer = 0;
    this.isResolving = false;
    this.bonusCell = null;
    this.bonusCollected = false;
    this.bonusNode = null;
    this.starCoreNodes.clear();

    this.activeParticles.forEach((p) => p.node.destroy());
    this.activeParticles = [];
    this.clearNode(this.boardRoot);
    this.clearNode(this.previewRoot);
    this.clearNode(this.runnerRoot);
    this.clearNode(this.cardRoot);
    this.starCoreNodes.clear();
    this.tileNodes.clear();
    this.cardNodes = [];

    const pos3f = new Vec3(0, 174, 0);
    this.boardRoot?.setPosition(pos3f);
    this.previewRoot?.setPosition(pos3f);
    this.runnerRoot?.setPosition(pos3f);
    this.renderBoard();
    this.renderAllTiles();
    this.renderRunner();
    this.renderCards();
    this.updateLabels();
    this.maxBulletTime = this.level.bulletTimeSeconds ?? 3.0;
    this.currentBulletTime = this.maxBulletTime;
    this.redrawBulletTimeMeter();
    this.setStatus('今日挑战开启：用最少步数接光，通关后晒战绩！');
    if (this.previewRoot) {
      this.previewRoot.active = false;
      this.clearNode(this.previewRoot);
    }
  }

  private ensureRoots(): void {
    this.node.layer = Layers.Enum.UI_2D;
    const halfH = view.getVisibleSize().height / 2;
    this.boardRoot = this.boardRoot ?? this.createRoot('BoardRoot', new Vec3(0, 174, 0));
    this.previewRoot = this.previewRoot ?? this.createRoot('PreviewRoot', new Vec3(0, 174, 0));
    this.runnerRoot = this.runnerRoot ?? this.createRoot('RunnerRoot', new Vec3(0, 174, 0));
    this.cardRoot = this.cardRoot ?? this.createRoot('CardRoot', new Vec3(0, -halfH + 260, 0));
  }

  private createRoot(name: string, pos: Vec3): Node {
    const root = new Node(name);
    root.layer = Layers.Enum.UI_2D;
    root.setParent(this.node);
    root.setPosition(pos);
    root.addComponent(UITransform).setContentSize(1, 1);
    return root;
  }

  private generateEndlessLevel(stage: number): LevelConfig {
    const size = Math.min(9, 7 + Math.floor(stage / 3));
    const gridSize: [number, number] = [size, size];
    const startRow = Math.floor(size / 2);
    const start: RunnerState = {
      row: startRow,
      col: 0,
      direction: 'right',
      color: 'none',
      speed: 1,
      state: 'IDLE'
    };

    const offsets = [-1, 0, 1];
    const goalRow = Math.min(size - 2, Math.max(1, startRow + offsets[Math.floor(Math.random() * offsets.length)]));
    const goals: GoalConfig[] = [{
      row: goalRow,
      col: size - 1,
      color: 'none'
    }];

    const stepSeconds = Math.max(0.16, 0.28 - stage * 0.015);
    const tilePool: TileType[] = ['straight', 'curve'];
    if (stage >= 1) tilePool.push('cross');
    if (stage >= 2) tilePool.push('collapse');
    if (stage >= 4) tilePool.push('boost');
    if (stage >= 6) {
      tilePool.push('paint_red');
      tilePool.push('gate_red');
      if (Math.random() > 0.4) {
        goals[0].color = 'red';
      }
    }
    if (stage >= 8) {
      tilePool.push('paint_blue');
      tilePool.push('gate_blue');
      if (Math.random() > 0.5) {
        goals[0].color = 'blue';
      }
    }

    const obstacles: Array<[number, number]> = [];
    const obstacleCount = Math.min(6, 2 + Math.floor(stage / 2));
    const isReserved = (r: number, c: number) => {
      if (r === startRow && c <= 1) return true;
      if (r === goalRow && c >= size - 2) return true;
      return false;
    };

    for (let i = 0; i < 20 && obstacles.length < obstacleCount; i++) {
      const r = Math.floor(Math.random() * (size - 2)) + 1;
      const c = Math.floor(Math.random() * (size - 2)) + 1;
      if (!isReserved(r, c) && !obstacles.some(o => o[0] === r && o[1] === c)) {
        obstacles.push([r, c]);
      }
    }

    return {
      id: 9999 + stage,
      name: `无尽跃迁 · 阶段 ${stage + 1}`,
      gridSize,
      start,
      goals,
      handSize: 3,
      bulletTimeEnergy: 3,
      runnerStepSeconds: stepSeconds,
      autoStart: false,
      obstacles,
      tilePool,
      recommendedMoves: 5 + stage,
    };
  }

  private generateDailyChallengeLevel(): LevelConfig {
    const now = new Date();
    const dateKey = CloudGameService.getTodayKey();
    const daySeed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
    const variant = daySeed % 3;
    const mirrored = variant === 1;
    const size = 7;
    const startCol = mirrored ? size - 1 : 0;
    const goalCol = mirrored ? 0 : size - 1;
    const direction = mirrored ? 'left' : 'right';
    const obstacleCol = mirrored ? 3 : 3;

    return {
      id: 800000 + daySeed,
      name: `今日光路 · ${dateKey}`,
      gridSize: [size, size],
      start: { row: 3, col: startCol, direction, color: 'none', speed: 1, state: 'IDLE' },
      goals: [{ row: variant === 2 ? 2 : 4, col: goalCol, color: 'none' }],
      handSize: 3,
      bulletTimeEnergy: 3,
      runnerStepSeconds: 0.24,
      autoStart: false,
      obstacles: variant === 0 ? [[3, obstacleCol], [2, obstacleCol]] : [[1, obstacleCol], [3, obstacleCol], [5, obstacleCol]],
      initialTiles: mirrored
        ? [{ row: 3, col: 5, tile: { type: 'straight', rotation: 0 } }]
        : [{ row: 3, col: 1, tile: { type: 'straight', rotation: 0 } }],
      tilePool: ['straight', 'curve', 'cross'],
      fixedHands: variant === 2 ? ['curve', 'cross', 'straight'] : ['curve', 'straight', 'curve'],
      recommendedMoves: 4,
      tutorialTip: '今日挑战：接上光路后分享战绩，看看谁能更少步。',
    };
  }

  private withSkillTiles(basePool: TileType[]): TileType[] {
    const pool = [...basePool];
    const pushMany = (type: TileType, count: number) => {
      for (let i = 0; i < count; i++) {
        pool.push(type);
      }
    };

    const progress = this.isEndlessMode ? this.endlessStageIndex + 4 : this.levelIndex;
    if (progress >= 3) {
      pushMany('time_crystal', 1 + this.getBlessingEffectLevel('time_flow'));
    }
    if (progress >= 4) {
      pushMany('star_crystal', 1 + this.getBlessingEffectLevel('star_reward'));
    }
    if (progress >= 5) {
      pushMany('refresh_crystal', 1 + this.getBlessingEffectLevel('refresh_hand'));
    }
    return pool;
  }

  private getBlessingEffectLevel(blessingId: string): number {
    return Math.min(3, ProfileManager.getBlessingLevel(blessingId));
  }

  public loadLevel(index: number, preserveChances = false, isEndless = false): void {
    if (this.hintHighlightNode) {
      this.hintHighlightNode.destroy();
      this.hintHighlightNode = null;
    }
    if (this.tutorialOverlayNode) {
      this.tutorialOverlayNode.destroy();
      this.tutorialOverlayNode = null;
    }
    if (this.blessingOverlayNode) {
      this.blessingOverlayNode.destroy();
      this.blessingOverlayNode = null;
    }
    if (!preserveChances || this.levelIndex !== index) {
      this.undoRemaining = 1;
      this.eraseRemaining = 1;
    }
    this.moveHistory = [];
    this.levelIndex = index;
    this.triggeredSkillTiles.clear();
    this.rewindSnapshot = null;
    this.timeRewindUsed = false;
    this.pendingBonusDiamonds = 0;
    this.skillComboCount = 0;

    if (isEndless) {
      this.isEndlessMode = true;
      this.isDailyChallenge = false;
      if (index === 0) {
        this.endlessStageIndex = 0;
        this.endlessScore = 0;
      }
      this.fourthSlotUnlocked = false;
      this.level = this.generateEndlessLevel(this.endlessStageIndex);
    } else if (index === -1 && this.isEndlessMode) {
      this.fourthSlotUnlocked = false;
      this.level = this.generateEndlessLevel(this.endlessStageIndex);
    } else {
      this.isEndlessMode = false;
      this.isDailyChallenge = false;
      this.fourthSlotUnlocked = false;
      const maxJourneyLevelCount = this.levels.length * 2;
      const safeIndex = Math.max(0, Math.min(index, maxJourneyLevelCount - 1));
      this.levelIndex = safeIndex;
      const baseLevel = this.levels[safeIndex % this.levels.length];
      if (safeIndex >= 10) {
        // Deep copy the base level configuration to avoid mutation
        const copied = JSON.parse(JSON.stringify(baseLevel)) as LevelConfig;
        copied.id = safeIndex + 1;
        copied.name = `暮色镜像 · ${baseLevel.name}`;
        const cols = copied.gridSize[1];

        // Mirror start position and flip direction
        if (copied.start) {
          copied.start.col = cols - 1 - copied.start.col;
          if (copied.start.direction === 'right') copied.start.direction = 'left';
          else if (copied.start.direction === 'left') copied.start.direction = 'right';
        }

        // Mirror goals positions
        if (copied.goals) {
          copied.goals.forEach((g) => {
            g.col = cols - 1 - g.col;
          });
        }

        // Mirror obstacles positions
        if (copied.obstacles) {
          copied.obstacles = copied.obstacles.map(([r, c]) => [r, cols - 1 - c]);
        }

        // Mirror pre-placed initial tiles
        if (copied.initialTiles) {
          copied.initialTiles.forEach((it) => {
            it.col = cols - 1 - it.col;
          });
        }

        this.level = copied;
        this.applyTheme(1); // Auto Theme 1 (Violet Dusk) for Chapter 2
      } else {
        this.level = baseLevel;
        this.applyTheme(0); // Auto Theme 0 (Icefield) for Chapter 1
      }
    }

    this.grid = GridManager.fromLevel(this.level);

    this.bonusCell = null;
    this.bonusCollected = false;
    this.bonusNode = null;
    this.starCoreNodes.clear();

    if (this.level?.starCores && this.level.starCores.length > 0) {
      this.bonusCell = { ...this.level.starCores[0] };
    } else if (!isEndless && this.levelIndex >= 5 && this.level) {
      const candidates: GridPos[] = [];
      const rows = this.level.gridSize[0];
      const cols = this.level.gridSize[1];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const pos = { row: r, col: c };
          if (this.level.start && this.level.start.row === r && this.level.start.col === c) {
            continue;
          }
          const isGoal = this.level.goals.some((g) => g.row === r && g.col === c);
          if (isGoal) {
            continue;
          }
          const isObstacle = this.level.obstacles.some(([or, oc]) => or === r && oc === c);
          if (isObstacle) {
            continue;
          }
          const isInitial = this.level.initialTiles?.some((it) => it.row === r && it.col === c);
          if (isInitial) {
            continue;
          }
          candidates.push(pos);
        }
      }
      if (candidates.length > 0) {
        const randIdx = Math.floor(Math.random() * candidates.length);
        this.bonusCell = candidates[randIdx];
      }
    }

    this.runner = { ...this.level!.start, state: this.level!.autoStart ? 'RUNNING' : 'IDLE' };
    this.cardSystem = new CardSystem(this.withSkillTiles(this.level.tilePool), this.level.handSize, this.level.fixedHands ?? []);
    this.hand = this.cardSystem.drawInitial();
    this.usedMoves = 0;
    this.flowEnergy = this.level.bulletTimeEnergy ?? 3;
    this.runnerTimer = 0;
    this.isResolving = false;

    this.activeParticles.forEach((p) => p.node.destroy());
    this.activeParticles = [];

    this.clearNode(this.boardRoot);
    this.clearNode(this.previewRoot);
    this.clearNode(this.runnerRoot);
    this.clearNode(this.cardRoot);
    if (this.dragNode) {
      this.dragNode.destroy();
      this.dragNode = null;
    }
    this.tileNodes.clear();
    this.cardNodes = [];

    // 动态计算在顶部导航条与底部操作区（Y = -halfH + 495）之间的可用垂直空间，求出其中心坐标
    const offsetY = 174;
    const pos3f = new Vec3(0, offsetY, 0);

    if (this.boardRoot) {
      this.boardRoot.setPosition(pos3f);
    }
    if (this.previewRoot) {
      this.previewRoot.setPosition(pos3f);
    }
    if (this.runnerRoot) {
      this.runnerRoot.setPosition(pos3f);
    }

    this.renderBoard();
    this.renderAllTiles();
    this.renderRunner();
    this.renderCards();
    this.updateLabels();
    this.maxBulletTime = this.level.bulletTimeSeconds ?? 3.0;
    this.currentBulletTime = this.maxBulletTime;
    this.redrawBulletTimeMeter();
    this.setStatus(this.level.tutorialTip ?? '拖拽水晶，接住这束光。');
    if (this.previewRoot) {
      this.previewRoot.active = false;
      this.clearNode(this.previewRoot);
    }
    this.showTutorialOverlayIfNeeded();
  }

  private renderBoard(): void {
    if (!this.level || !this.grid || !this.boardRoot) {
      return;
    }

    const step = this.tileWidth + (this.tileGap || 10);
    const rawWidth = this.grid.cols * step;
    const rawHeight = this.grid.rows * step;
    // 优化：右侧竖排功能键移除并转为下方横排后，水平空间释放至 670px！棋盘整体放大 1.25~1.3 倍，大幅改善手指误触痛点！
    const size = view.getVisibleSize();
    // 扣除顶部导航条与底部提示条安全区后的最大高度，防止重叠
    const maxBoardHeight = size.height - 726;
    let sW = 656 / rawWidth; // 656 符合左右 32px 安全页边距
    let sH = maxBoardHeight / rawHeight;
    let s = Math.min(sW, sH);
    if (s > 1.45) s = 1.45;
    if (this.boardRoot) this.boardRoot.setScale(new Vec3(s, s, 1));
    if (this.previewRoot) this.previewRoot.setScale(new Vec3(s, s, 1));
    if (this.runnerRoot) this.runnerRoot.setScale(new Vec3(s, s, 1));

    // 0. Floating Island Under-Glow & Shadow Aura (浮岛底座悬空极光云与深邃投影)
    const shadowNode = new Node('IslandShadow');
    shadowNode.layer = Layers.Enum.UI_2D;
    shadowNode.setParent(this.boardRoot!);
    shadowNode.setPosition(new Vec3(0, -25, -5));
    const shadowG = shadowNode.addComponent(Graphics);
    const isRose = this.currentTheme === 1;
    const isGold = this.currentTheme === 2;

    // Aurora field under the island
    shadowG.fillColor = this.hex(isRose ? '#3B0764' : (isGold ? '#451A03' : '#0284C7'));
    ((shadowG.fillColor) as ((any)) as any).a = 110;
    shadowG.ellipse(0, 0, 260, 120);
    shadowG.fill();
    // Core glow
    shadowG.fillColor = this.hex(isRose ? '#A855F7' : (isGold ? '#EA580C' : '#38BDF8'));
    ((shadowG.fillColor) as ((any)) as any).a = 140;
    shadowG.ellipse(0, 0, 180, 80);
    shadowG.fill();

    this.grid.forEachCell((pos, _tile, obstacle) => {
      const node = new Node(`Cell_${pos.row}_${pos.col}`);
      node.layer = Layers.Enum.UI_2D;
      node.setParent(this.boardRoot!);
      node.setPosition(this.gridToLocal(pos));
      node.addComponent(UITransform).setContentSize(this.tileWidth, this.tileHeight);
      const graphics = node.addComponent(Graphics);
      if (obstacle) {
        this.drawTopDownTile(graphics, this.hex('#3B1428'), this.hex('#FF3B30'), 2.5, this.tileWidth, this.tileHeight, 0, 0, 6);
      } else {
        const isEven = (pos.row + pos.col) % 2 === 0;
        let topCol = isEven ? this.hex('#1E3A8A') : this.hex('#2563EB');
        let strokeCol = isEven ? this.hex('#38BDF8') : this.hex('#60A5FA');

        if (isRose) {
          topCol = isEven ? this.hex('#581C87') : this.hex('#7E22CE');
          strokeCol = isEven ? this.hex('#C084FC') : this.hex('#E879F9');
        } else if (isGold) {
          topCol = isEven ? this.hex('#7C2D12') : this.hex('#C2410C');
          strokeCol = isEven ? this.hex('#FDE047') : this.hex('#FFAB40');
        }

        this.drawTopDownTile(graphics, topCol, strokeCol, 2.2, this.tileWidth, this.tileHeight, 0, 0, 6);

        node.on(Node.EventType.TOUCH_END, () => {
          this.onCellTouch(pos);
        }, this);
      }
    });

    // 3. Start Point Sleek Cyber Emblem (起点平铺极简金青魔法印章，告别杂乱叠块！)
    if (this.level.start) {
      const startNode = new Node('StartAura');
      startNode.layer = Layers.Enum.UI_2D;
      startNode.setParent(this.boardRoot!);
      startNode.setPosition(this.gridToLocal(this.level.start).add3f(0, 0, 1));
      const sg = startNode.addComponent(Graphics);
      // Sleek flat floor ring
      sg.strokeColor = this.hex('#FDE047');
      sg.lineWidth = 2;
      sg.circle(0, 0, 26);
      sg.stroke();
      sg.fillColor = new Color(253, 224, 71, 35);
      sg.circle(0, 0, 26);
      sg.fill();
      // Inner cyan energy ring
      sg.strokeColor = this.hex('#00F0FF');
      sg.lineWidth = 1.5;
      sg.circle(0, 0, 16);
      sg.stroke();
    }

    for (const goal of this.level.goals) {
      this.drawGoal(goal);
    }

    if (this.bonusCell && !this.bonusCollected) {
      const bonusNode = new Node('BonusCrystal');
      bonusNode.layer = Layers.Enum.UI_2D;
      bonusNode.setParent(this.boardRoot!);
      bonusNode.setPosition(this.gridToLocal(this.bonusCell).add3f(0, 0, 3));
      let t = bonusNode.getComponent(UITransform);
      if (!t) t = bonusNode.addComponent(UITransform);
      t.setContentSize(64, 64);
      const bg = bonusNode.addComponent(Graphics);
      bg.fillColor = this.hex('#FDE047');
      bg.strokeColor = this.hex('#FFFFFF');
      bg.lineWidth = 1.8;
      bg.moveTo(0, 16);
      bg.lineTo(12, 0);
      bg.lineTo(0, -16);
      bg.lineTo(-12, 0);
      bg.close();
      bg.fill();
      bg.stroke();

      const labelNode = new Node('Text');
      labelNode.layer = Layers.Enum.UI_2D;
      labelNode.setParent(bonusNode);
      labelNode.setPosition(new Vec3(0, 0, 0));
      let lt = labelNode.getComponent(UITransform);
      if (!lt) lt = labelNode.addComponent(UITransform);
      lt.setContentSize(40, 40);
      const label = labelNode.addComponent(Label);
      label.string = '💎';
      label.fontSize = 20;
      label.color = new Color(255, 255, 255, 255);
      label.horizontalAlign = Label.HorizontalAlign.CENTER;
      label.verticalAlign = Label.VerticalAlign.CENTER;

      this.bonusNode = bonusNode;
      this.starCoreNodes.set(this.key(this.bonusCell), bonusNode);
    }
  }

  private renderAllTiles(): void {
    if (!this.grid) {
      return;
    }
    this.grid.forEachCell((pos, tile) => {
      if (tile) {
        this.renderTile(pos, tile);
      }
    });
  }

  private renderTile(pos: GridPos, tile: TileInstance): void {
    if (!this.boardRoot) {
      return;
    }

    const key = this.key(pos);
    this.tileNodes.get(key)?.destroy();

    const node = new Node(`Tile_${pos.row}_${pos.col}_${tile.type}`);
    node.layer = Layers.Enum.UI_2D;
    node.setParent(this.boardRoot);
    node.setPosition(this.gridToLocal(pos).add3f(0, 0, 1));
    node.addComponent(UITransform).setContentSize(this.tileWidth, this.tileHeight);
    const graphics = node.addComponent(Graphics);
    const topCol = this.tileColor(tile.type);
    this.drawDiamond(graphics, topCol, this.hex('#FFFFFF'), 2.2);
    this.drawTileArrow(graphics, tile, 0, 0.86, 0, 44);
    this.drawSkillBadge(graphics, tile.type, 0, 0);
    node.on(Node.EventType.TOUCH_END, () => this.onPlacedTileTouch(pos), this);
    this.tileNodes.set(key, node);
  }

  private drawGoal(goal: GoalConfig): void {
    if (!this.boardRoot) {
      return;
    }
    const node = new Node(`Goal_${goal.row}_${goal.col}`);
    node.layer = Layers.Enum.UI_2D;
    node.setParent(this.boardRoot);
    node.setPosition(this.gridToLocal(goal).add3f(0, 0, 2));
    node.addComponent(UITransform).setContentSize(this.tileWidth * 0.9, this.tileHeight * 0.9);
    const graphics = node.addComponent(Graphics);
    const goalCol = this.colorForRunner(goal.color ?? 'none');

    // 1. Goal Pad Rounded Base
    this.drawTopDownTile(graphics, goalCol, this.hex('#FFFFFF'), 3, this.tileWidth * 0.9, this.tileHeight * 0.9, 0, 0, 6);

    // 2. Glowing Portal Ring
    const portalCol = goal.color === 'red' ? this.hex('#FF2E93') : (goal.color === 'blue' ? this.hex('#00F0FF') : this.hex('#E066FF'));
    graphics.fillColor = new Color(portalCol.r, portalCol.g, portalCol.b, 65);
    graphics.circle(0, 0, 36);
    graphics.fill();
    graphics.strokeColor = portalCol;
    graphics.lineWidth = 4;
    graphics.circle(0, 0, 36);
    graphics.stroke();

    // Center portal vortex star
    graphics.fillColor = this.hex('#FFFFFF');
    graphics.circle(0, 0, 10);
    graphics.fill();
  }

  private renderRunner(): void {
    if (!this.runner || !this.runnerRoot) {
      return;
    }

    const node = new Node('Runner');
    node.layer = Layers.Enum.UI_2D;
    node.setParent(this.runnerRoot);
    node.setPosition(this.gridToLocal(this.runner).add3f(0, 0, 10));
    node.addComponent(UITransform).setContentSize(52, 52);
    const graphics = node.addComponent(Graphics);
    this.runnerNode = node;
    this.redrawRunnerColor();
  }

  private renderCards(): void {
    if (!this.cardRoot) {
      return;
    }

    this.clearNode(this.cardRoot);
    this.cardNodes = [];
    const showPlusSlot = !this.fourthSlotUnlocked;
    const totalSlots = this.hand.length + (showPlusSlot ? 1 : 0);

    // Responsive compact sizing guaranteeing 100% fits inside sapphire glass tray (-346 to +346) with 0 overflow!
    if (totalSlots <= 3) {
      this.cardWidth = 164;
      this.cardHeight = 148;
    } else if (totalSlots === 4) {
      // 3 hand cards + 1 plus slot -> width 144px each, spacing 158px -> total span from -309 to +309!
      this.cardWidth = 144;
      this.cardHeight = 144;
    } else {
      // 4 or more hand cards + 1 plus slot
      this.cardWidth = 120;
      this.cardHeight = 136;
    }

    const spacing = this.cardWidth + 14;
    const startX = -((totalSlots - 1) * spacing) / 2;
    this.redrawBottomDeck(totalSlots, spacing);

    this.hand.forEach((type, index) => {
      const isSelected = this.selectedCardIndex === index;
      const card = new Node(`Card_${index}_${type}`);
      card.layer = Layers.Enum.UI_2D;
      card.setParent(this.cardRoot!);
      card.setPosition(new Vec3(startX + index * spacing, 0, 0));
      if (isSelected) {
        card.setScale(new Vec3(1.12, 1.12, 1));
      }
      card.addComponent(UITransform).setContentSize(this.cardWidth, this.cardHeight);
      const graphics = card.addComponent(Graphics);
      this.drawCard(graphics, type, isSelected);
      const arrowScale = (this.cardWidth / 196) * 0.9;
      this.drawTileArrow(graphics, { type, rotation: 0 }, 14 * (this.cardHeight / 160), arrowScale, 0, 24);
      this.drawSkillBadge(graphics, type, 0, 14 * (this.cardHeight / 160));

      const labelNode = new Node('Name');
      labelNode.layer = Layers.Enum.UI_2D;
      labelNode.setParent(card);
      labelNode.setPosition(new Vec3(0, -this.cardHeight / 2 + 18, 1));
      labelNode.addComponent(UITransform).setContentSize(this.cardWidth - 8, 28);
      const label = labelNode.addComponent(Label);
      label.string = getTileDisplayName(type);
      label.fontSize = Math.max(15, Math.floor((this.cardWidth / 196) * 20));
      label.color = this.hex('#FFFFFF');

      card.on(Node.EventType.TOUCH_START, (event: EventTouch) => this.onCardTouchStart(event, index), this);
      card.on(Node.EventType.TOUCH_MOVE, (event: EventTouch) => this.onCardTouchMove(event), this);
      card.on(Node.EventType.TOUCH_END, (event: EventTouch) => this.onCardTouchEnd(event), this);
      card.on(Node.EventType.TOUCH_CANCEL, (event: EventTouch) => this.onCardTouchCancel(event), this);
      this.cardNodes.push(card);
    });

    if (showPlusSlot) {
      const plusSlot = new Node('PlusSlot');
      plusSlot.layer = Layers.Enum.UI_2D;
      plusSlot.setParent(this.cardRoot!);
      plusSlot.setPosition(new Vec3(startX + this.hand.length * spacing, 0, 0));
      plusSlot.addComponent(UITransform).setContentSize(this.cardWidth, this.cardHeight);
      const pg = plusSlot.addComponent(Graphics);
      pg.fillColor = new Color(30, 58, 138, 200);
      pg.roundRect(-this.cardWidth / 2, -this.cardHeight / 2, this.cardWidth, this.cardHeight, 18);
      pg.fill();
      pg.strokeColor = new Color(96, 165, 250, 230);
      pg.lineWidth = 2.5;
      pg.stroke();
      pg.strokeColor = this.hex('#FFFFFF');
      pg.lineWidth = 4.0;
      const plusArm = Math.min(20, Math.floor(this.cardWidth * 0.15));
      pg.moveTo(-plusArm, 0);
      pg.lineTo(plusArm, 0);
      pg.moveTo(0, -plusArm);
      pg.lineTo(0, plusArm);
      pg.stroke();

      plusSlot.on(Node.EventType.TOUCH_END, () => {
        this.onPlusSlotClick();
      }, this);
    }
  }

  private redrawBottomDeck(totalSlots: number, spacing: number): void {
    if (!this.bottomDeckGraphics) {
      return;
    }
    const g = this.bottomDeckGraphics;
    const slotCount = Math.max(1, totalSlots);
    const contentWidth = (slotCount - 1) * spacing + this.cardWidth;
    const deckW = Math.min(692, Math.max(360, contentWidth + 96));
    const deckH = 176;
    const transform = g.node.getComponent(UITransform);
    transform?.setContentSize(deckW, deckH);

    g.clear();
    g.fillColor = this.hex('#1E3A8A');
    ((g.fillColor) as any).a = 155;
    g.roundRect(-deckW / 2, -deckH / 2, deckW, deckH, 28);
    g.fill();
    g.fillColor = this.hex('#4C1D95');
    ((g.fillColor) as any).a = 110;
    g.roundRect(-deckW / 2 + 8, -deckH / 2 + 8, deckW - 16, deckH - 16, 22);
    g.fill();
    g.strokeColor = this.hex('#60A5FA');
    g.lineWidth = 2.8;
    g.stroke();
  }

  private onPlusSlotClick(): void {
    WeChatService.vibrateShort('light');
    WeChatService.showModal({
      title: '解锁第 4 个手牌槽位',
      content: '观看一段短视频广告，即可立刻解锁本局第四个手牌水晶备用槽！让你在连通光轨时拥有更多路线选择，极大避免卡手风险。',
      confirmText: '解锁槽位',
      cancelText: '不需要',
      success: (res) => {
        if (res.confirm) {
          WeChatService.showVideoAd(() => {
            if (this.cardSystem) {
              this.fourthSlotUnlocked = true;
              this.hand = this.cardSystem.unlockFourthSlot();
              this.renderCards();
              WeChatService.showToast('成功解锁第四手牌槽位！', 'success');
              this.setStatus('★ 已看视频成功，本局已解锁第四手牌槽位，极大地降低卡手概率！');
            }
          });
        }
      }
    });
  }

  private onCardTouchStart(event: EventTouch, index: number): void {
    this.hasMovedDuringDrag = false;
    const type = this.hand[index];
    this.dragCardIndex = index;
    this.dragTile = createTile(type);
    this.hoverCell = null;
    director.getScheduler().setTimeScale(0.45);
    this.setStatus('拖到地图上，蓝线能通，红线会掉。');

    this.dragNode?.destroy();
    const dragNode = new Node('DragGhost');
    dragNode.layer = Layers.Enum.UI_2D;
    dragNode.setParent(this.node);
    const pos = event.getUILocation();
    dragNode.setWorldPosition(new Vec3(pos.x, pos.y, 100));
    dragNode.setScale(new Vec3(1.15, 1.15, 1));
    dragNode.addComponent(UITransform).setContentSize(this.tileWidth, this.tileHeight);
    const graphics = dragNode.addComponent(Graphics);
    this.drawDiamond(graphics, this.tileColor(this.dragTile.type), this.hex('#FFFFFF'), 3);
    this.drawTileArrow(graphics, this.dragTile, 0, 0.86, 0, 44);
    this.dragNode = dragNode;

    if (this.cardNodes[index]) {
      this.cardNodes[index].setScale(new Vec3(0.9, 0.9, 1));
    }
  }

  private onCardTouchMove(event: EventTouch): void {
    if (!this.dragTile) {
      return;
    }
    this.hasMovedDuringDrag = true;

    const pos = event.getUILocation();
    if (this.dragNode) {
      this.dragNode.setWorldPosition(new Vec3(pos.x, pos.y, 100));
    }

    const cell = this.uiToGrid(pos.x, pos.y);
    this.hoverCell = cell;
    this.renderPreview(cell, this.dragTile);
  }

  private onCardTouchEnd(event: EventTouch): void {
    this.handleCardDrop(event);
  }

  private onCardTouchCancel(event: EventTouch): void {
    this.handleCardDrop(event);
  }

  private handleCardDrop(event: EventTouch): void {
    if (!this.dragTile || !this.grid || !this.level || !this.cardSystem) {
      this.endDrag();
      return;
    }

    if (!this.hasMovedDuringDrag) {
      this.selectCard(this.dragCardIndex);
      this.endDrag();
      return;
    }

    const pos = event.getUILocation();
    const cell = this.uiToGrid(pos.x, pos.y);
    if (cell && this.canPlace(cell)) {
      if (this.hintHighlightNode) {
        this.hintHighlightNode.destroy();
        this.hintHighlightNode = null;
      }
      WeChatService.vibrateShort('light');
      this.grid.setTile(cell, this.dragTile);
      this.renderTile(cell, this.dragTile);
      this.moveHistory.push({
        pos: { ...cell },
        cardIndex: this.dragCardIndex,
        tileType: this.dragTile.type,
      });
      this.usedMoves++;
      this.hand = this.cardSystem.consume(this.dragCardIndex);
      this.renderCards();
      this.currentBulletTime = Math.min(this.maxBulletTime, this.currentBulletTime + 1.2);
      this.redrawBulletTimeMeter();
      this.setStatus('放置成功！已补充 1.2s 子弹时间。可继续铺路或启动流光。');
    } else {
      WeChatService.vibrateShort('heavy');
      this.setStatus('这里不能放置');
    }

    this.endDrag();
    this.updateLabels();
    this.updateRoutePreviewLine();
  }

  private onPlacedTileTouch(pos: GridPos): void {
    if (!this.grid || !this.runner) {
      return;
    }
    if (this.hintHighlightNode) {
      this.hintHighlightNode.destroy();
      this.hintHighlightNode = null;
    }

    if (pos.row === this.runner.row && pos.col === this.runner.col) {
      WeChatService.vibrateShort('heavy');
      this.setStatus('Runner 正在这里，不能旋转这块水晶。');
      return;
    }

    const tile = this.grid.getTile(pos);
    if (!tile) {
      return;
    }

    const rotated = rotateTile(tile);
    if (rotated.rotation === tile.rotation) {
      WeChatService.vibrateShort('heavy');
      this.setStatus(`${getTileDisplayName(tile.type)}不能旋转。`);
      return;
    }

    WeChatService.vibrateShort('light');
    this.grid.setTile(pos, rotated);
    this.renderTile(pos, rotated);
    this.currentBulletTime = Math.min(this.maxBulletTime, this.currentBulletTime + 0.6);
    this.redrawBulletTimeMeter();
    this.setStatus('水晶已旋转，补充 0.6s 子弹时间，继续观察光路。');
    this.updateRoutePreviewLine();
  }

  private selectCard(index: number): void {
    if (this.selectedCardIndex === index) {
      this.selectedCardIndex = -1;
      this.setStatus('已取消选择手牌。');
    } else {
      this.selectedCardIndex = index;
      const type = this.hand[index];
      this.setStatus(`已选中：${getTileDisplayName(type)}。点击地图上空白单元格可直接放置！`);
    }
    this.renderCards();
  }

  private onCellTouch(pos: GridPos): void {
    if (!this.grid || !this.runner || !this.cardSystem) {
      return;
    }

    if (this.selectedCardIndex !== -1) {
      const type = this.hand[this.selectedCardIndex];
      const tile = createTile(type);
      if (this.canPlace(pos)) {
        WeChatService.vibrateShort('light');
        this.grid.setTile(pos, tile);
        this.renderTile(pos, tile);
        this.moveHistory.push({
          pos: { ...pos },
          cardIndex: this.selectedCardIndex,
          tileType: tile.type,
        });
        this.usedMoves++;
        this.hand = this.cardSystem.consume(this.selectedCardIndex);
        this.selectedCardIndex = -1; // Clear selection
        this.renderCards();
        this.currentBulletTime = Math.min(this.maxBulletTime, this.currentBulletTime + 1.2);
        this.redrawBulletTimeMeter();
        this.setStatus('放置成功！已补充 1.2s 子弹时间。可继续铺路或启动流光。');
        this.updateLabels();
        this.updateRoutePreviewLine();
      } else {
        WeChatService.vibrateShort('heavy');
        this.setStatus('这里不能放置');
      }
    } else {
      this.setStatus('先点击下方手牌，再点击空白格子即可快捷放置水晶！');
    }
  }

  private endDrag(): void {
    director.getScheduler().setTimeScale(1);
    this.dragTile = null;
    this.dragCardIndex = -1;
    this.hoverCell = null;
    this.clearNode(this.previewRoot);
    if (this.dragNode) {
      this.dragNode.destroy();
      this.dragNode = null;
    }
    this.cardNodes.forEach((card) => card.setScale(new Vec3(1, 1, 1)));
    this.redrawBulletTimeMeter();
  }

  public updateRoutePreviewLine(): void {
    if (!this.grid || !this.runner || !this.level || !this.previewRoot || !this.previewRoot.active || this.runner.state !== 'IDLE') {
      return;
    }
    this.clearNode(this.previewRoot);
    const preview = RouteSimulator.simulate(this.grid, this.runner, this.level.goals);
    const node = new Node('LivePreviewLine');
    node.layer = Layers.Enum.UI_2D;
    node.setParent(this.previewRoot);
    const graphics = node.addComponent(Graphics);
    graphics.lineWidth = 6;
    graphics.strokeColor = preview.success ? this.hex('#00F0FF') : this.hex('#FF4B3E');

    const start = this.getRouteAnchor(this.runner);
    const routePoints = this.getDrawableRoutePoints(preview.path);
    const outerCol = preview.success ? this.hex('#00F0FF') : this.hex('#FF3B30');
    ((outerCol) as ((any)) as any).a = 140;
    graphics.strokeColor = outerCol;
    graphics.lineWidth = 12;
    graphics.moveTo(start.x, start.y);
    for (const pathNode of routePoints) {
      const point = this.getRouteAnchor(pathNode);
      graphics.lineTo(point.x, point.y);
    }
    graphics.stroke();

    graphics.strokeColor = preview.success ? this.hex('#E0FFFF') : this.hex('#FFD1D1');
    graphics.lineWidth = 4;
    graphics.moveTo(start.x, start.y);
    for (const pathNode of routePoints) {
      const point = this.getRouteAnchor(pathNode);
      graphics.lineTo(point.x, point.y);
    }
    graphics.stroke();
  }

  private renderPreview(cell: GridPos | null, tile: TileInstance): void {
    this.clearNode(this.previewRoot);
    if (!cell || !this.grid || !this.runner || !this.level || !this.previewRoot || !this.canPlace(cell)) {
      return;
    }

    const preview = RouteSimulator.simulate(this.grid, this.runner, this.level.goals, { ...cell, tile });
    const node = new Node('PreviewLine');
    node.layer = Layers.Enum.UI_2D;
    node.setParent(this.previewRoot);
    const graphics = node.addComponent(Graphics);
    graphics.lineWidth = 6;
    graphics.strokeColor = preview.success ? this.hex('#00F0FF') : this.hex('#FF4B3E');

    const start = this.getRouteAnchor(this.runner);
    const routePoints = this.getDrawableRoutePoints(preview.path);
    const outerCol = preview.success ? this.hex('#00F0FF') : this.hex('#FF3B30');
    ((outerCol) as ((any)) as any).a = 140;
    graphics.strokeColor = outerCol;
    graphics.lineWidth = 12;
    graphics.moveTo(start.x, start.y);
    for (const pathNode of routePoints) {
      const point = this.getRouteAnchor(pathNode);
      graphics.lineTo(point.x, point.y);
    }
    graphics.stroke();

    graphics.strokeColor = preview.success ? this.hex('#E0FFFF') : this.hex('#FFD1D1');
    graphics.lineWidth = 4;
    graphics.moveTo(start.x, start.y);
    for (const pathNode of routePoints) {
      const point = this.getRouteAnchor(pathNode);
      graphics.lineTo(point.x, point.y);
    }
    graphics.stroke();

    // Draw cell highlight and snapped tile ghost
    const cellPos = this.gridToLocal(cell).add3f(0, 0, 5);
    const topCol = this.tileColor(tile.type);
    const ghostTop = new Color(topCol.r, topCol.g, topCol.b, 160);
    this.drawTopDownTile(graphics, ghostTop, this.hex('#FFFFFF'), 2.5, this.tileWidth * 0.94, this.tileHeight * 0.94, cellPos.y, cellPos.x, 5);
    this.drawTileArrow(graphics, tile, cellPos.y, 0.86, cellPos.x, 44);
  }

  private advanceRunnerOneStep(): void {
    if (!this.grid || !this.runner || !this.level || !this.runnerNode) {
      return;
    }

    this.rewindSnapshot = this.createRewindSnapshot();
    const next = move(this.runner, this.runner.direction);
    const preview = RouteSimulator.simulate(this.grid, this.runner, this.level.goals);
    if (preview.path.length > 0 && preview.path[0].result === 'goal') {
      this.moveRunnerVisual(next, () => this.handleSuccess());
      return;
    }

    if (!this.grid.isValid(next) || this.grid.isObstacle(next)) {
      this.handleDead('前方无法通行');
      return;
    }

    const tile = this.grid.getTile(next);
    if (!tile) {
      this.handleNearMissOrDead('前方没有水晶路');
      return;
    }

    const config = resolveTileConfig(tile);
    if (config.colorFilter && config.colorFilter !== 'none' && config.colorFilter !== this.runner.color) {
      this.handleDead('颜色不匹配');
      return;
    }

    const out = config.routing[this.runner.direction];
    if (!out || out === 'dead') {
      this.handleDead('水晶方向不连通');
      return;
    }

    this.runner.row = next.row;
    this.runner.col = next.col;
    this.runner.direction = out;

    if (this.bonusCell && next.row === this.bonusCell.row && next.col === this.bonusCell.col && !this.bonusCollected) {
      this.bonusCollected = true;
      WeChatService.vibrateShort('medium');
      const reward = 30 + this.getBlessingEffectLevel('star_reward') * 10;
      this.pendingBonusDiamonds += reward;
      WeChatService.showToast(`收集星核 +${reward} 💎，通关结算`, 'success');
      if (this.bonusNode) {
        this.bonusNode.destroy();
        this.bonusNode = null;
      }
      this.starCoreNodes.delete(this.key(next));
      this.updateLabels();
    }

    this.applySkillTileEffect(tile, next);

    if (config.colorPaint && config.colorPaint !== 'none') {
      this.runner.color = config.colorPaint;
      this.redrawRunnerColor();
    }
    if (config.speedModifier) {
      this.runner.speed *= config.speedModifier;
    }
    if (config.oneTime) {
      this.grid.setTile(next, null);
      this.tileNodes.get(this.key(next))?.destroy();
      this.tileNodes.delete(this.key(next));
    }

    this.moveRunnerVisual(this.runner, () => {
      const goal = this.findGoal(this.runner!, this.level!.goals);
      if (goal && (!goal.color || goal.color === 'none' || goal.color === this.runner!.color)) {
        this.handleSuccess();
      }
    });
  }

  private createRewindSnapshot(): RewindSnapshot | null {
    if (!this.runner) {
      return null;
    }
    return {
      runner: { ...this.runner },
      currentBulletTime: this.currentBulletTime,
      flowEnergy: this.flowEnergy,
      hand: [...this.hand],
      usedMoves: this.usedMoves,
    };
  }

  private applySkillTileEffect(tile: TileInstance, pos: GridPos): void {
    if (!this.cardSystem) {
      return;
    }
    const config = resolveTileConfig(tile);
    if (!config.skill) {
      return;
    }
    const key = `${this.key(pos)}:${tile.type}`;
    if (this.triggeredSkillTiles.has(key)) {
      return;
    }
    this.triggeredSkillTiles.add(key);
    if (config.skill === 'time') {
      const bonus = 1.5 + this.getBlessingEffectLevel('time_flow') * 0.5;
      this.currentBulletTime = Math.min(this.maxBulletTime + 2, this.currentBulletTime + bonus);
      this.redrawBulletTimeMeter();
      WeChatService.showToast(`时间水晶 +${bonus.toFixed(1)}s`, 'success');
      this.setStatus(`时间水晶触发，缓冲补充 ${bonus.toFixed(1)}s。`);
    } else if (config.skill === 'star') {
      const reward = 10 + this.getBlessingEffectLevel('star_reward') * 5;
      this.pendingBonusDiamonds += reward;
      WeChatService.showToast(`星光水晶 +${reward} 💎，通关结算`, 'success');
      this.setStatus(`星光水晶触发，暂存 ${reward} 晶核，通关后一起结算。`);
    } else if (config.skill === 'refresh') {
      this.hand = this.cardSystem.refreshRandomCard();
      this.renderCards();
      WeChatService.showToast('刷新水晶：换 1 张牌', 'success');
      this.setStatus('刷新水晶触发，已替换一张手牌。');
    }
    this.triggerSkillComboFeedback();
    this.updateLabels();
  }

  private triggerSkillComboFeedback(): void {
    this.skillComboCount++;
    if (this.skillComboCount <= 1) {
      return;
    }

    const comboReward = Math.min(20, this.skillComboCount * 5);
    this.pendingBonusDiamonds += comboReward;
    if (this.skillComboCount >= 3) {
      this.currentBulletTime = Math.min(this.maxBulletTime + 2, this.currentBulletTime + 0.8);
      this.redrawBulletTimeMeter();
    }
    WeChatService.showToast(`流派连锁 x${this.skillComboCount}  +${comboReward} 💎`, 'success');
    this.setStatus(`流派连锁 x${this.skillComboCount}！特殊水晶组合越多，通关结算越香。`);
  }

  private moveRunnerVisual(pos: GridPos, onDone: () => void): void {
    if (!this.runnerNode || !this.runnerRoot) {
      onDone();
      return;
    }
    this.isResolving = true;
    const startPos = this.runnerNode.position.clone();
    const endPos = this.gridToLocal(pos).add3f(0, 0, 10);
    const baseCol = this.colorForRunner(this.runner?.color ?? 'none');

    if (!this.powerSaveMode) {
      for (let i = 1; i <= 3; i++) {
        const ghostPos = startPos.clone().lerp(endPos, i * 0.25);
        this.spawnTrailGhost(ghostPos, baseCol, 0.04 * i);
      }
    }

    tween(this.runnerNode)
      .to(0.14, { position: endPos })
      .call(() => {
        this.spawnLandingRipple(endPos, baseCol);
        this.isResolving = false;
        onDone();
      })
      .start();
  }

  private spawnTrailGhost(pos: Vec3, color: Color, delay: number): void {
    if (!this.runnerRoot || this.powerSaveMode) return;
    const ghost = new Node('TrailGhost');
    ghost.layer = Layers.Enum.UI_2D;
    ghost.setParent(this.runnerRoot);
    ghost.setPosition(pos);
    ghost.addComponent(UITransform).setContentSize(40, 40);
    const graphics = ghost.addComponent(Graphics);
    graphics.fillColor = new Color(color.r, color.g, color.b, 140);
    graphics.circle(0, 0, 16);
    graphics.fill();
    graphics.fillColor = new Color(255, 255, 255, 180);
    graphics.circle(0, 0, 8);
    graphics.fill();

    tween(ghost)
      .delay(delay)
      .to(0.18, { scale: new Vec3(0.2, 0.2, 1) })
      .call(() => ghost.destroy())
      .start();
  }

  private spawnLandingRipple(pos: Vec3, color: Color): void {
    if (!this.runnerRoot || this.powerSaveMode) return;
    const ripple = new Node('LandingRipple');
    ripple.layer = Layers.Enum.UI_2D;
    ripple.setParent(this.runnerRoot);
    ripple.setPosition(pos);
    ripple.addComponent(UITransform).setContentSize(60, 60);
    const graphics = ripple.addComponent(Graphics);
    graphics.strokeColor = new Color(0, 240, 255, 220);
    graphics.lineWidth = 3.5;
    graphics.circle(0, 0, 14);
    graphics.stroke();

    tween(ripple)
      .to(0.25, { scale: new Vec3(2.2, 2.2, 1) })
      .call(() => ripple.destroy())
      .start();
  }

  private handleSuccess(): void {
    if (!this.runner || !this.level) {
      return;
    }
    this.runner.state = 'SUCCESS';
    WeChatService.vibrateShort('medium');

    if (!this.powerSaveMode) {
      this.triggerScreenFlash();
      this.spawnConfettiExplosion(this.gridToLocal(this.runner));
    }

    if (this.isDailyChallenge) {
      const score = Math.max(10, 100 - this.usedMoves * 8 + this.currentBulletTime * 5);
      const dateKey = this.level.name.replace('今日光路 · ', '');
      const dailyScore = Math.floor(score);
      ProfileManager.updateDailyChallengeBest(dateKey, dailyScore, this.usedMoves);
      const leaderboard = CloudGameService.submitDailyChallenge(dateKey, dailyScore, this.usedMoves);
      AnalyticsService.track('daily_success', { levelId: this.level.id, score: dailyScore, moves: this.usedMoves, beatPercent: leaderboard.beatPercent });
      const reward = this.usedMoves <= this.level.recommendedMoves ? 80 : 50;
      const totalReward = reward + this.pendingBonusDiamonds;
      ProfileManager.addDiamonds(totalReward);
      this.triggerVictoryShockwave();
      this.setStatus(`今日挑战完成！${leaderboard.hintText}，晶核 +${totalReward} 💎`);
      this.updateLabels();
      WeChatService.showToast(`今日挑战通关 +${totalReward} 💎`, 'success');
      if (this.onShowVictoryPosterCallback) {
        this.onShowVictoryPosterCallback(this.level.id, this.level.name, Math.min(3, this.calculateStars()), this.usedMoves);
      }
      return;
    }

    if (this.isEndlessMode) {
      this.endlessStageIndex++;
      const stageScore = 100 + Math.max(0, (this.level.recommendedMoves - this.usedMoves) * 15);
      this.endlessScore += stageScore;
      if (this.pendingBonusDiamonds > 0) {
        ProfileManager.addDiamonds(this.pendingBonusDiamonds);
      }
      this.setStatus(`第 ${this.endlessStageIndex} 阶段连通成功！光能 +${stageScore}，晶核 +${this.pendingBonusDiamonds}`);
      this.updateLabels();
      WeChatService.showToast(`阶段 ${this.endlessStageIndex} 完成，跃迁下一星域！`, 'success');
      this.scheduleOnce(() => {
        this.loadLevel(-1, false, true);
      }, 1.0);
      return;
    }

    const stars = this.calculateStars();
    AnalyticsService.track('level_success', { levelId: this.level.id, stars, moves: this.usedMoves, assist: !!this.residualAssistId });
    const reward = stars * 20;
    ProfileManager.addDiamonds(reward + this.pendingBonusDiamonds);
    ProfileManager.setLevelProgress(this.levelIndex + 1);

    let assistBonus = 0;
    const completedAssistId = this.residualAssistId;
    if (this.residualAssistId && ProfileManager.claimResidualAssist(this.residualAssistId, 80)) {
      assistBonus = 80;
      CloudGameService.completeResidualAssist(this.residualAssistId);
    }

    this.triggerVictoryShockwave();
    const beatPercent = this.estimateFriendBeatPercent(stars, this.usedMoves);
    this.setStatus(`通关！${stars} 星，晶核 +${reward + this.pendingBonusDiamonds + assistBonus} 💎，击败 ${beatPercent}% 好友！`);
    this.updateLabels();
    if (assistBonus > 0) {
      WeChatService.showToast('助攻成功！额外获得 80 💎', 'success');
      this.residualAssistId = '';
      WeChatService.showModal({
        title: '助攻已接通',
        content: '要不要通知好友回来领取 60 晶核？这条回流分享能把求助闭环做起来。',
        confirmText: '通知TA',
        cancelText: '稍后',
        success: (res) => {
          if (res.confirm && completedAssistId && this.level) {
            ShareService.shareResidualSolved(this.level, completedAssistId);
          }
        }
      });
    }
    const showPoster = () => {
      if (this.onShowVictoryPosterCallback && this.level) {
        this.onShowVictoryPosterCallback(this.level.id, this.level.name, stars, this.usedMoves);
      }
    };
    this.showBlessingChoice(showPoster);
  }

  private showBlessingChoice(onDone: () => void): void {
    if (this.blessingOverlayNode || this.isDailyChallenge || this.isEndlessMode) {
      onDone();
      return;
    }

    const options: BlessingOption[] = [
      {
        id: 'time_flow',
        title: '时间共鸣',
        desc: '时间水晶补时 +0.5s，且更容易抽到。',
        color: '#22D3EE',
      },
      {
        id: 'star_reward',
        title: '星核增幅',
        desc: '星光水晶与星核奖励提升。',
        color: '#FDE047',
      },
      {
        id: 'refresh_hand',
        title: '灵感换牌',
        desc: '刷新水晶更容易出现，卡手更少。',
        color: '#34D399',
      },
    ];

    const size = view.getVisibleSize();
    const halfW = size.width / 2;
    const halfH = size.height / 2;
    const overlay = new Node('BlessingOverlay');
    overlay.layer = Layers.Enum.UI_2D;
    overlay.setParent(this.node);
    overlay.setPosition(new Vec3(0, 0, 140));
    overlay.addComponent(UITransform).setContentSize(size.width, size.height);
    this.blessingOverlayNode = overlay;
    overlay.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
      event.propagationStopped = true;
    }, this);

    const g = overlay.addComponent(Graphics);
    g.fillColor = new Color(5, 10, 25, 205);
    g.rect(-halfW, -halfH, size.width, size.height);
    g.fill();
    g.fillColor = this.hex('#0B132B');
    ((g.fillColor) as any).a = 248;
    g.roundRect(-310, -245, 620, 490, 34);
    g.fill();
    g.strokeColor = this.hex('#FDE047');
    g.lineWidth = 2.8;
    g.stroke();

    this.createOverlayLabel(overlay, 'BlessingTitle', new Vec3(0, 180, 141), '选择一个流光祝福', 28, '#FFFFFF', 520, 42);
    this.createOverlayLabel(overlay, 'BlessingSub', new Vec3(0, 142, 141), '下一关开始生效，慢慢形成你的光路流派', 17, '#FDE68A', 560, 30);

    options.forEach((option, idx) => {
      const y = 74 - idx * 102;
      const row = new Node(`Blessing_${option.id}`);
      row.layer = Layers.Enum.UI_2D;
      row.setParent(overlay);
      row.setPosition(new Vec3(0, y, 141));
      row.addComponent(UITransform).setContentSize(540, 82);
      const rg = row.addComponent(Graphics);
      rg.fillColor = this.hex('#111827');
      ((rg.fillColor) as any).a = 242;
      rg.roundRect(-270, -41, 540, 82, 22);
      rg.fill();
      rg.strokeColor = this.hex(option.color);
      rg.lineWidth = 2.2;
      rg.stroke();

      const level = ProfileManager.getBlessingLevel(option.id);
      this.createOverlayLabel(row, 'Title', new Vec3(-130, 14, 1), `${option.title}  Lv.${level + 1}`, 21, '#FFFFFF', 250, 30);
      this.createOverlayLabel(row, 'Desc', new Vec3(-70, -18, 1), option.desc, 15, '#CBD5E1', 370, 24);
      this.createOverlayLabel(row, 'Pick', new Vec3(205, 0, 1), '选择', 18, option.color, 90, 34);

      row.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
        event.propagationStopped = true;
        const newLevel = ProfileManager.addBlessing(option.id);
        AnalyticsService.track('blessing_pick', { id: option.id, level: newLevel, levelId: this.level?.id ?? 0 });
        WeChatService.showToast(`${option.title} 升至 Lv.${newLevel}`, 'success');
        if (this.blessingOverlayNode) {
          this.blessingOverlayNode.destroy();
          this.blessingOverlayNode = null;
        }
        onDone();
      }, this);
    });
  }

  private estimateFriendBeatPercent(stars: number, moves: number): number {
    const recommended = this.level?.recommendedMoves ?? moves;
    const moveBonus = Math.max(0, recommended - moves) * 4;
    const base = 58 + stars * 11 + moveBonus + Math.min(8, this.levelIndex);
    return Math.max(55, Math.min(99, Math.round(base)));
  }

  private triggerVictoryShockwave(): void {
    if (this.powerSaveMode) {
      return;
    }
    const size = view.getVisibleSize();
    const node = new Node('VictoryShockwave');
    node.layer = Layers.Enum.UI_2D;
    node.setParent(this.node);
    node.setPosition(new Vec3(0, 0, 90));
    node.addComponent(UITransform).setContentSize(size.width, size.height);
    const g = node.addComponent(Graphics);
    g.strokeColor = this.hex('#FDE047');
    g.lineWidth = 8;
    g.circle(0, 40, 70);
    g.stroke();
    g.fillColor = new Color(253, 224, 71, 28);
    g.circle(0, 40, 70);
    g.fill();
    tween(node)
      .to(0.45, { scale: new Vec3(4.4, 4.4, 1) }, { easing: 'quadOut' })
      .call(() => node.destroy())
      .start();
  }

  private triggerScreenFlash(): void {
    if (this.powerSaveMode) {
      return;
    }
    const flashNode = new Node('ScreenFlash');
    flashNode.layer = Layers.Enum.UI_2D;
    flashNode.setParent(this.node);
    const transform = flashNode.addComponent(UITransform);
    const size = view.getVisibleSize();
    transform.setContentSize(size.width, size.height);
    const g = flashNode.addComponent(Graphics);
    g.fillColor = new Color(255, 255, 255, 140);
    g.rect(-size.width / 2, -size.height / 2, size.width, size.height);
    g.fill();

    tween(g.fillColor)
      .to(0.22, { a: 0 }, {
        onUpdate: (target: any) => {
          g.fillColor = target;
          g.clear();
          g.rect(-size.width / 2, -size.height / 2, size.width, size.height);
          g.fill();
        }
      })
      .call(() => flashNode.destroy())
      .start();
  }

  private spawnConfettiExplosion(localPos: Vec3): void {
    if (!this.boardRoot || this.powerSaveMode) return;

    const colors = [
      new Color(252, 224, 71), // Gold
      new Color(56, 189, 248),  // Cyan
      new Color(244, 114, 182), // Pink
      new Color(74, 222, 128),  // Green
      new Color(251, 146, 60),  // Orange
      new Color(192, 132, 252)  // Purple
    ];

    for (let i = 0; i < 25; i++) {
      const pNode = new Node(`Confetti_${i}`);
      pNode.layer = Layers.Enum.UI_2D;
      pNode.setParent(this.boardRoot);
      pNode.setPosition(localPos.clone().add3f(0, 0, 10));

      const transform = pNode.addComponent(UITransform);
      transform.setContentSize(12, 12);

      const graphics = pNode.addComponent(Graphics);
      const color = colors[Math.floor(Math.random() * colors.length)];
      graphics.fillColor = color;
      graphics.fillRect(-6, -6, 12, 12);
      graphics.fill();

      const angle = Math.random() * Math.PI * 2;
      const speed = 200 + Math.random() * 250;
      
      this.activeParticles.push({
        node: pNode,
        graphics: graphics,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed + 120,
        rotationSpeed: (Math.random() - 0.5) * 600,
        color: color,
        age: 0,
        maxAge: 1.2 + Math.random() * 0.6
      });
    }
  }

  private updateConfettiParticles(dt: number): void {
    if (this.activeParticles.length === 0) return;

    const gravity = -600;

    for (let i = this.activeParticles.length - 1; i >= 0; i--) {
      const p = this.activeParticles[i];
      p.age += dt;
      if (p.age >= p.maxAge) {
        p.node.destroy();
        this.activeParticles.splice(i, 1);
        continue;
      }

      p.vy += gravity * dt;
      const pos = p.node.getPosition();
      const nextX = pos.x + p.vx * dt;
      const nextY = pos.y + p.vy * dt;
      p.node.setPosition(new Vec3(nextX, nextY, pos.z));

      const currentEuler = p.node.eulerAngles;
      p.node.eulerAngles = new Vec3(0, 0, currentEuler.z + p.rotationSpeed * dt);

      const alpha = Math.max(0, 255 * (1.0 - p.age / p.maxAge));
      const col = p.color;
      p.graphics.clear();
      p.graphics.fillColor = new Color(col.r, col.g, col.b, alpha);
      p.graphics.fillRect(-6, -6, 12, 12);
      p.graphics.fill();
    }
  }

  private handleNearMissOrDead(reason: string): void {
    if (!this.level || !this.runner || !this.grid) {
      return;
    }
    const preview = RouteSimulator.simulate(this.grid, this.runner, this.level.goals);
    const last = preview.path[preview.path.length - 1];
    const near = last ? this.distanceToNearestGoal(last, this.level.goals) <= 2 : false;
    if (near && this.flowEnergy > 0) {
      this.flowEnergy--;
      WeChatService.vibrateShort('heavy');
      this.setStatus(`Near Miss：${reason}。已消耗 1 点救场能量，可继续补路。`);
      this.updateLabels();
      return;
    }
    this.handleDead(reason);
  }

  private handleDead(reason: string): void {
    if (!this.runner) {
      return;
    }
    if (this.tryTimeRewind(reason)) {
      return;
    }
    WeChatService.vibrateShort('heavy');
    this.runner.state = 'DEAD';
    AnalyticsService.track('level_fail', { levelId: this.level?.id ?? 0, moves: this.usedMoves, reason, daily: this.isDailyChallenge, endless: this.isEndlessMode });
    this.setStatus(`失败：${reason}。呼叫时空导师救我一命！`);
    this.updateLabels();

    if (this.isEndlessMode && !this.isDailyChallenge) {
      WeChatService.uploadUserScore(this.endlessStageIndex, this.endlessScore);
      if (this.onShowVictoryPosterCallback) {
        this.onShowVictoryPosterCallback(this.level?.id ?? 9999, `无尽挑战 · 最终战绩`, this.endlessStageIndex, this.endlessScore);
      }
      return;
    }

    if (this.onShowReviveModalCallback) {
      this.onShowReviveModalCallback({
        levelId: this.level?.id ?? this.levelIndex + 1,
        levelName: this.level?.name ?? '未知关卡',
        moves: this.usedMoves,
        handCount: this.hand.length,
        reason,
        isNearGoal: this.isNearGoalFromCurrentRoute(),
      });
    }
  }

  private tryTimeRewind(reason: string): boolean {
    if (this.timeRewindUsed || this.isEndlessMode || !this.rewindSnapshot || !this.cardSystem) {
      return false;
    }
    this.timeRewindUsed = true;
    this.isResolving = false;
    this.runnerTimer = 0;
    this.runner = { ...this.rewindSnapshot.runner, state: 'IDLE' };
    this.currentBulletTime = Math.min(this.maxBulletTime + 2, this.rewindSnapshot.currentBulletTime + 1.5);
    this.flowEnergy = this.rewindSnapshot.flowEnergy;
    this.usedMoves = this.rewindSnapshot.usedMoves;
    this.cardSystem.setHand(this.rewindSnapshot.hand);
    this.hand = this.cardSystem.drawRescueCard();

    this.clearNode(this.runnerRoot);
    this.renderRunner();
    this.renderCards();
    this.redrawBulletTimeMeter();
    this.updateLabels();
    this.updateRoutePreviewLine();
    this.showRewindFlash(`时光回溯：${reason}`);
    WeChatService.vibrateShort('medium');
    WeChatService.showToast('时光回溯，已补 1 张救场牌', 'success');
    this.setStatus('时光回溯触发！流光倒回关键节点，额外补给 1 张救场牌。');
    AnalyticsService.track('time_rewind', { levelId: this.level?.id ?? 0, reason, moves: this.usedMoves });
    return true;
  }

  private showRewindFlash(text: string): void {
    if (this.powerSaveMode) {
      return;
    }
    const size = view.getVisibleSize();
    const node = new Node('TimeRewindFlash');
    node.layer = Layers.Enum.UI_2D;
    node.setParent(this.node);
    node.setPosition(new Vec3(0, 0, 130));
    node.addComponent(UITransform).setContentSize(size.width, size.height);
    const g = node.addComponent(Graphics);
    g.fillColor = new Color(34, 211, 238, 44);
    g.rect(-size.width / 2, -size.height / 2, size.width, size.height);
    g.fill();
    g.strokeColor = this.hex('#22D3EE');
    g.lineWidth = 5;
    g.circle(0, 20, 90);
    g.stroke();
    this.createOverlayLabel(node, 'RewindText', new Vec3(0, 20, 131), text, 24, '#ECFEFF', 520, 42);
    tween(node)
      .to(0.45, { scale: new Vec3(1.18, 1.18, 1) }, { easing: 'quadOut' })
      .call(() => node.destroy())
      .start();
  }

  private isNearGoalFromCurrentRoute(): boolean {
    if (!this.level || !this.runner || !this.grid) {
      return false;
    }
    const preview = RouteSimulator.simulate(this.grid, this.runner, this.level.goals);
    const last = preview.path[preview.path.length - 1];
    return last ? this.distanceToNearestGoal(last, this.level.goals) <= 2 : false;
  }

  private calculateStars(): number {
    if (!this.level) {
      return 1;
    }
    let stars = 1;
    if (this.usedMoves <= this.level.recommendedMoves) {
      stars++;
    }
    if (this.usedMoves <= Math.max(1, this.level.recommendedMoves - 1)) {
      stars++;
    }
    return Math.min(3, stars);
  }

  private canPlace(pos: GridPos): boolean {
    if (!this.grid || !this.runner) {
      return false;
    }
    if (!this.grid.isValid(pos) || this.grid.isObstacle(pos)) {
      return false;
    }
    if (pos.row === this.runner.row && pos.col === this.runner.col) {
      return false;
    }
    return !this.findGoal(pos, this.level?.goals ?? []);
  }

  private uiToGrid(uiX: number, uiY: number): GridPos | null {
    if (!this.boardRoot || !this.grid) {
      return null;
    }
    const transform = this.boardRoot.getComponent(UITransform);
    if (!transform) {
      return null;
    }
    const local = transform.convertToNodeSpaceAR(new Vec3(uiX, uiY, 0));
    const step = this.tileWidth + (this.tileGap || 10);
    const centerCol = (this.grid.cols - 1) / 2;
    const centerRow = (this.grid.rows - 1) / 2;
    const col = Math.round(local.x / step + centerCol);
    const row = Math.round(centerRow - local.y / step);
    const pos = { row, col };
    return this.grid.isValid(pos) ? pos : null;
  }

  private gridToLocal(pos: GridPos): Vec3 {
    if (!this.grid) {
      return new Vec3(0, 0, 0);
    }
    const step = this.tileWidth + (this.tileGap || 10);
    const centerCol = (this.grid.cols - 1) / 2;
    const centerRow = (this.grid.rows - 1) / 2;
    const x = (pos.col - centerCol) * step;
    const y = (centerRow - pos.row) * step;
    return new Vec3(x, y, 0);
  }

  private getRouteAnchor(pos: GridPos): Vec3 {
    return this.gridToLocal(pos);
  }

  private getDrawableRoutePoints(path: GridPos[]): GridPos[] {
    if (!this.runner || path.length === 0) {
      return path;
    }
    const [first, ...rest] = path;
    if (first.row === this.runner.row && first.col === this.runner.col) {
      return rest;
    }
    return path;
  }

  private key(pos: GridPos): string {
    return `${pos.row}:${pos.col}`;
  }

  private findGoal(pos: GridPos, goals: GoalConfig[]): GoalConfig | null {
    return goals.find((goal) => goal.row === pos.row && goal.col === pos.col) ?? null;
  }

  private distanceToNearestGoal(pos: GridPos, goals: GoalConfig[]): number {
    return Math.min(...goals.map((goal) => Math.abs(goal.row - pos.row) + Math.abs(goal.col - pos.col)));
  }

  private redrawRunnerColor(): void {
    if (!this.runnerNode || !this.runner) {
      return;
    }
    const graphics = this.runnerNode.getComponent(Graphics);
    if (!graphics) {
      return;
    }
    graphics.clear();
    const baseCol = this.colorForRunner(this.runner.color);

    // 1. Soft cyber halo
    graphics.fillColor = new Color(baseCol.r, baseCol.g, baseCol.b, 65);
    graphics.circle(0, 0, 24);
    graphics.fill();

    // 2. Vibrant crystalline sphere body
    graphics.fillColor = new Color(baseCol.r, baseCol.g, baseCol.b, 210);
    graphics.circle(0, 0, 16);
    graphics.fill();
    graphics.strokeColor = this.hex('#FFFFFF');
    graphics.lineWidth = 1.8;
    graphics.stroke();

    // 3. Bright white photon core
    graphics.fillColor = this.hex('#FFFFFF');
    graphics.circle(0, 0, 8);
    graphics.fill();

    // 4. Crystalline specular reflection highlight
    graphics.fillColor = new Color(255, 255, 255, 220);
    graphics.circle(-4, 4, 3);
    graphics.fill();
  }

  private drawTopDownTile(
    g: Graphics,
    bgCol: Color,
    borderCol: Color,
    borderWidth: number,
    w: number,
    h: number,
    offsetY = 0,
    offsetX = 0,
    shadowDepth = 6
  ): void {
    const halfW = w / 2;
    const halfH = h / 2;
    const radius = 22;

    // 1. Draw bottom shadow/depth for 2.5D floating Neumorphic look
    if (shadowDepth > 0) {
      g.fillColor = this.darken(bgCol, 0.55);
      g.roundRect(offsetX - halfW, offsetY - halfH - shadowDepth, w, h, radius);
      g.fill();
    }

    // 2. Draw main square tile body
    g.fillColor = bgCol;
    g.roundRect(offsetX - halfW, offsetY - halfH, w, h, radius);
    g.fill();

    // 3. Draw border glow
    if (borderWidth > 0) {
      g.strokeColor = borderCol;
      g.lineWidth = borderWidth;
      g.stroke();
    }

    // 4. Draw subtle inner glassmorphic highlight on top rim
    if (shadowDepth > 0) {
      g.fillColor = new Color(255, 255, 255, 35);
      g.roundRect(offsetX - halfW + 4, offsetY + halfH - 12, w - 8, 8, 4);
      g.fill();
    }
  }

  private drawDiamond(graphics: Graphics, fill: Color, stroke: Color, lineWidth: number): void {
    // 1. Dark cyber socket base plate
    const socketCol = new Color(16, 26, 52, 255);
    this.drawTopDownTile(graphics, socketCol, stroke, 1.5, this.tileWidth * 0.96, this.tileHeight * 0.96, 0, 0, 4);

    // 2. Elevated floating crystal module with breathing room
    this.drawTopDownTile(graphics, fill, stroke, lineWidth, this.tileWidth * 0.86, this.tileHeight * 0.86, 0, 0, 6);
  }

  private drawIsometricPlatform(
    graphics: Graphics,
    topFill: Color,
    sideDark: Color,
    sideLight: Color,
    stroke: Color,
    lineWidth: number,
    depth = 16,
    customW = this.tileWidth,
    customH = this.tileHeight,
    offsetY = 0,
    offsetX = 0
  ): void {
    const halfW = customW / 2;
    const halfH = customH / 2;

    // Left side vertical wall
    graphics.fillColor = sideDark;
    graphics.moveTo(offsetX - halfW, offsetY);
    graphics.lineTo(offsetX - halfW, offsetY - depth);
    graphics.lineTo(offsetX, offsetY - halfH - depth);
    graphics.lineTo(offsetX, offsetY - halfH);
    graphics.close();
    graphics.fill();

    // Right side vertical wall
    graphics.fillColor = sideLight;
    graphics.moveTo(offsetX, offsetY - halfH);
    graphics.lineTo(offsetX, offsetY - halfH - depth);
    graphics.lineTo(offsetX + halfW, offsetY - depth);
    graphics.lineTo(offsetX + halfW, offsetY);
    graphics.close();
    graphics.fill();

    // Bottom edge highlight / structure line
    graphics.strokeColor = stroke;
    graphics.lineWidth = 1.5;
    graphics.moveTo(offsetX - halfW, offsetY - depth);
    graphics.lineTo(offsetX, offsetY - halfH - depth);
    graphics.lineTo(offsetX + halfW, offsetY - depth);
    graphics.stroke();
    graphics.moveTo(offsetX, offsetY - halfH);
    graphics.lineTo(offsetX, offsetY - halfH - depth);
    graphics.stroke();

    // Top diamond surface
    graphics.fillColor = topFill;
    graphics.strokeColor = stroke;
    graphics.lineWidth = lineWidth;
    graphics.moveTo(offsetX, offsetY + halfH);
    graphics.lineTo(offsetX + halfW, offsetY);
    graphics.lineTo(offsetX, offsetY - halfH);
    graphics.lineTo(offsetX - halfW, offsetY);
    graphics.close();
    graphics.fill();
    graphics.stroke();
  }

  private drawTileArrow(graphics: Graphics, tile: TileInstance, offsetY = 0, scale = 1, offsetX = 0, lineBaseLength = 44): void {
    const config = resolveTileConfig(tile);
    for (const [input, output] of Object.entries(config.routing)) {
      if (!output || output === 'dead') {
        continue;
      }
      const start = this.directionPoint(input, -lineBaseLength * scale).add3f(offsetX, offsetY, 0);
      const end = this.directionPoint(output, lineBaseLength * scale).add3f(offsetX, offsetY, 0);

      // Outer cyan neon glow (route through center point!)
      graphics.strokeColor = this.hex('#00F0FF');
      graphics.lineWidth = 8 * scale;
      graphics.moveTo(start.x, start.y);
      graphics.lineTo(offsetX, offsetY);
      graphics.lineTo(end.x, end.y);
      graphics.stroke();

      // Inner white core (route through center point!)
      graphics.strokeColor = this.hex('#FFFFFF');
      graphics.lineWidth = 3.8 * scale;
      graphics.moveTo(start.x, start.y);
      graphics.lineTo(offsetX, offsetY);
      graphics.lineTo(end.x, end.y);
      graphics.stroke();
    }

    // Center glowing crystal gem
    graphics.fillColor = this.hex('#FFFFFF');
    graphics.circle(offsetX, offsetY, 6 * scale);
    graphics.fill();
  }

  private drawSkillBadge(graphics: Graphics, type: TileType, offsetX = 0, offsetY = 0): void {
    const config = resolveTileConfig({ type, rotation: 0 });
    if (!config.skill) {
      return;
    }
    const badgeY = offsetY + 30;
    const badgeColor = config.skill === 'time' ? this.hex('#22D3EE') : (config.skill === 'star' ? this.hex('#FDE047') : this.hex('#34D399'));
    graphics.fillColor = new Color(badgeColor.r, badgeColor.g, badgeColor.b, 230);
    graphics.circle(offsetX + 30, badgeY, 14);
    graphics.fill();
    graphics.strokeColor = this.hex('#FFFFFF');
    graphics.lineWidth = 2;
    graphics.circle(offsetX + 30, badgeY, 14);
    graphics.stroke();

    graphics.strokeColor = config.skill === 'time' ? this.hex('#0F172A') : this.hex('#111827');
    graphics.lineWidth = 3;
    if (config.skill === 'time') {
      graphics.circle(offsetX + 30, badgeY, 6);
      graphics.moveTo(offsetX + 30, badgeY);
      graphics.lineTo(offsetX + 30, badgeY + 6);
      graphics.moveTo(offsetX + 30, badgeY);
      graphics.lineTo(offsetX + 35, badgeY);
    } else if (config.skill === 'star') {
      graphics.moveTo(offsetX + 30, badgeY + 8);
      graphics.lineTo(offsetX + 33, badgeY + 1);
      graphics.lineTo(offsetX + 40, badgeY);
      graphics.lineTo(offsetX + 34, badgeY - 3);
      graphics.lineTo(offsetX + 36, badgeY - 10);
      graphics.lineTo(offsetX + 30, badgeY - 5);
      graphics.lineTo(offsetX + 24, badgeY - 10);
      graphics.lineTo(offsetX + 26, badgeY - 3);
      graphics.lineTo(offsetX + 20, badgeY);
      graphics.lineTo(offsetX + 27, badgeY + 1);
      graphics.close();
    } else {
      graphics.moveTo(offsetX + 23, badgeY);
      graphics.lineTo(offsetX + 37, badgeY);
      graphics.moveTo(offsetX + 34, badgeY + 5);
      graphics.lineTo(offsetX + 39, badgeY);
      graphics.lineTo(offsetX + 34, badgeY - 5);
    }
    graphics.stroke();
  }

  private directionPoint(direction: string, length: number): Vec3 {
    switch (direction) {
      case 'up':
        return new Vec3(0, length, 0);
      case 'right':
        return new Vec3(length, 0, 0);
      case 'down':
        return new Vec3(0, -length, 0);
      case 'left':
        return new Vec3(-length, 0, 0);
      default:
        return new Vec3(0, 0, 0);
    }
  }

  private drawCard(graphics: Graphics, type: TileType, selected = false): void {
    graphics.clear();
    // Glassmorphic card base plate (vibrant royal blue / sapphire plate, NO GREY!)
    graphics.fillColor = new Color(37, 99, 235, 235);
    graphics.roundRect(-this.cardWidth / 2, -this.cardHeight / 2, this.cardWidth, this.cardHeight, 18);
    graphics.fill();
    graphics.strokeColor = this.hex(selected ? '#FDE047' : '#00F0FF');
    graphics.lineWidth = selected ? 4.8 : 2.5;
    graphics.stroke();

    // Royal indigo label pill strip at bottom (NO GREY!)
    graphics.fillColor = this.hex('#1E3A8A');
    graphics.roundRect(-this.cardWidth / 2 + 6, -this.cardHeight / 2 + 6, this.cardWidth - 12, 26, 8);
    graphics.fill();

    // Bottom right count badge pill (vibrant violet)
    graphics.fillColor = this.hex('#4C1D95');
    graphics.roundRect(this.cardWidth / 2 - 36, -this.cardHeight / 2 + 36, 30, 20, 10);
    graphics.fill();
    graphics.strokeColor = this.hex('#A78BFA');
    graphics.lineWidth = 1.5;
    graphics.stroke();

    // Top cyber accent line
    graphics.strokeColor = this.hex('#00E5FF');
    graphics.lineWidth = 3;
    graphics.moveTo(-this.cardWidth / 2 + 15, this.cardHeight / 2 - 2);
    graphics.lineTo(this.cardWidth / 2 - 15, this.cardHeight / 2 - 2);
    graphics.stroke();

    // Glowing backdrop aura behind the crystal inside the card
    const topCol = this.tileColor(type);
    graphics.fillColor = new Color(topCol.r, topCol.g, topCol.b, 110);
    graphics.circle(0, 14, 34);
    graphics.fill();
    graphics.fillColor = new Color(255, 255, 255, 75);
    graphics.circle(0, 14, 20);
    graphics.fill();

    // Big bright 3D isometric crystal in upper area (offsetY = 14, brighter side walls)
    this.drawIsometricPlatform(graphics, topCol, this.darken(topCol, 0.75), this.darken(topCol, 0.9), this.hex('#FFFFFF'), 3, 14, 76, 44, 14);
  }

  private darken(color: Color, factor: number): Color {
    return new Color(
      Math.round(color.r * factor),
      Math.round(color.g * factor),
      Math.round(color.b * factor),
      color.a
    );
  }

  private tileColor(type: TileType): Color {
    switch (type) {
      case 'curve':
        return this.hex('#10B981');
      case 'cross':
        return this.hex('#60A5FA');
      case 'collapse':
        return this.hex('#F59E0B');
      case 'boost':
        return this.hex('#F472B6');
      case 'paint_red':
      case 'gate_red':
        return this.hex('#EF4444');
      case 'paint_blue':
      case 'gate_blue':
        return this.hex('#3B82F6');
      case 'time_crystal':
        return this.hex('#22D3EE');
      case 'star_crystal':
        return this.hex('#FDE047');
      case 'refresh_crystal':
        return this.hex('#34D399');
      case 'universal':
        return this.hex('#FDE68A');
      case 'straight':
      default:
        return this.hex('#06B6D4');
    }
  }

  private colorForRunner(color: RunnerColor): Color {
    switch (color) {
      case 'red':
        return this.hex('#FF5A6A');
      case 'blue':
        return this.hex('#4AA3FF');
      case 'yellow':
        return this.hex('#FDE047');
      case 'none':
      default:
        return this.hex('#F8FEFF');
    }
  }

  private hex(value: string): Color {
    const color = new Color();
    Color.fromHEX(color, value);
    return color;
  }

  private isPathCompleted(): boolean {
    if (!this.grid || !this.runner || !this.level) {
      return false;
    }
    const preview = RouteSimulator.simulate(this.grid, this.runner, this.level.goals);
    return preview.path.length > 0 && preview.path[0].result === 'goal';
  }

  public redrawBulletTimeMeter(): void {
    if (!this.bulletTimeGraphics || !this.bulletTimeValueLabel) {
      return;
    }
    const g = this.bulletTimeGraphics;
    g.clear();

    // Inline status chip: the tappable toolbar below now contains actions only.
    const ratio = Math.max(0, Math.min(1, this.currentBulletTime / this.maxBulletTime));
    g.fillColor = this.hex('#102A44');
    ((g.fillColor) as any).a = 120;
    g.roundRect(-75, -14, 150, 28, 14);
    g.fill();
    g.strokeColor = this.hex('#38BDF8');
    ((g.strokeColor) as any).a = 150;
    g.lineWidth = 1.4;
    g.stroke();

    // Active Liquid Fill Bar
    const barW = 138 * ratio;
    if (barW > 2) {
      if (ratio > 0.5) {
        g.fillColor = this.hex('#00F0FF');
      } else if (ratio > 0.25) {
        g.fillColor = this.hex('#FBBF24');
      } else {
        g.fillColor = this.hex('#FF3B30');
      }
      ((g.fillColor) as any).a = 210;
      g.roundRect(-69, -9, barW, 18, 9);
      g.fill();
    }

    this.bulletTimeValueLabel.string = `⏱ ${this.currentBulletTime.toFixed(1)}s`;
    if (ratio <= 0.25) {
      this.bulletTimeValueLabel.color = this.hex('#FF3B30');
    } else {
      this.bulletTimeValueLabel.color = this.hex('#FFFFFF');
    }
  }

  private updateLabels(): void {
    if (this.levelLabel && this.level) {
      if (this.isDailyChallenge) {
        this.levelLabel.string = '☀ 今日光路挑战';
      } else if (this.isEndlessMode) {
        this.levelLabel.string = `🏆 无尽挑战 · 阶段 ${this.endlessStageIndex + 1}`;
      } else {
        this.levelLabel.string = `第 ${this.levelIndex + 1} 关  ${this.level.name}`;
      }
    }
    if (this.tipLabel && this.level) {
      const bonusText = this.pendingBonusDiamonds > 0 ? ` · 待结算 +${this.pendingBonusDiamonds}💎` : '';
      const starText = this.bonusCell && !this.bonusCollected ? ' · 星核待收集' : '';
      if (this.isDailyChallenge) {
        this.tipLabel.string = `今日 ${this.usedMoves}/${this.level.recommendedMoves} · 分享冲榜${bonusText}`;
      } else if (this.isEndlessMode) {
        this.tipLabel.string = `光能 ${this.endlessScore} · 救场 ${this.flowEnergy}${bonusText}`;
      } else {
        this.tipLabel.string = `手数 ${this.usedMoves}/${this.level.recommendedMoves} · 救场 ${this.flowEnergy}${starText}${bonusText}`;
      }
    }
  }

  private setStatus(text: string): void {
    if (this.statusLabel) {
      const toastNode = this.statusLabel.node.parent ?? this.statusLabel.node;
      toastNode.active = true;
      this.statusLabel.string = text;
      const serial = ++this.statusToastSerial;
      this.scheduleOnce(() => {
        if (serial === this.statusToastSerial && this.statusLabel) {
          this.statusLabel.string = '';
          const currentToastNode = this.statusLabel.node.parent ?? this.statusLabel.node;
          currentToastNode.active = false;
        }
      }, 1.45);
    }
  }

  private clearNode(node: Node | null): void {
    if (!node) {
      return;
    }
    node.destroyAllChildren();
  }

  private findSolution(): { row: number; col: number; type: TileType; rotation: number }[] | null {
    if (!this.grid || !this.level || !this.runner) return null;

    const emptyCells: GridPos[] = [];
    for (let r = 0; r < this.grid.rows; r++) {
      for (let c = 0; c < this.grid.cols; c++) {
        const cell = { row: r, col: c };
        if (!this.grid.getTile(cell) && !this.grid.isObstacle(cell)) {
          const isStart = r === this.level.start.row && c === this.level.start.col;
          const isGoal = this.level.goals.some(g => g.row === r && g.col === c);
          if (!isStart && !isGoal) {
            emptyCells.push(cell);
          }
        }
      }
    }

    const tilesToPlace = [...this.hand];
    if (tilesToPlace.length === 0) return null;

    const solution: { row: number; col: number; type: TileType; rotation: number }[] = [];

    const dfs = (tileIdx: number): boolean => {
      const earlyRes = RouteSimulator.simulate(this.grid!, this.runner!, this.level!.goals);
      if (earlyRes.success) {
        return true;
      }

      if (tileIdx >= tilesToPlace.length) {
        return false;
      }

      const tileType = tilesToPlace[tileIdx];

      for (let i = 0; i < emptyCells.length; i++) {
        const cell = emptyCells[i];
        const occupied = solution.some(s => s.row === cell.row && s.col === cell.col);
        if (occupied) continue;

        for (let rot = 0; rot < 4; rot++) {
          const candidate = { type: tileType, rotation: rot };
          this.grid!.setTile(cell, candidate);
          solution.push({ row: cell.row, col: cell.col, type: tileType, rotation: rot });

          if (dfs(tileIdx + 1)) {
            this.grid!.setTile(cell, null);
            return true;
          }

          solution.pop();
          this.grid!.setTile(cell, null);
        }
      }

      return false;
    };

    if (dfs(0)) {
      return solution;
    }

    return null;
  }

  private showTutorialOverlayIfNeeded(): void {
    if (this.isEndlessMode || this.levelIndex > 2 || !this.boardRoot || !this.level || !this.grid || !this.runner) {
      return;
    }

    const solution = this.findSolution();
    const targetStep = solution && solution.length > 0 ? solution[0] : null;
    const targetPos = targetStep ? { row: targetStep.row, col: targetStep.col } : { row: this.runner.row, col: this.runner.col };
    const targetLocal = this.gridToLocal(targetPos).add3f(0, 0, 0);
    const boardTransform = this.boardRoot.getComponent(UITransform);
    const rootTransform = this.node.getComponent(UITransform);
    if (!boardTransform || !rootTransform) {
      return;
    }

    const worldTarget = boardTransform.convertToWorldSpaceAR(targetLocal);
    const target = rootTransform.convertToNodeSpaceAR(worldTarget);
    const size = view.getVisibleSize();
    const halfW = size.width / 2;
    const halfH = size.height / 2;

    const overlay = new Node('TutorialOverlay');
    overlay.layer = Layers.Enum.UI_2D;
    overlay.setParent(this.node);
    overlay.setPosition(new Vec3(0, 0, 120));
    overlay.addComponent(UITransform).setContentSize(size.width, size.height);
    this.tutorialOverlayNode = overlay;

    const g = overlay.addComponent(Graphics);
    g.fillColor = new Color(5, 10, 25, 190);
    g.rect(-halfW, -halfH, size.width, size.height);
    g.fill();

    const title = this.levelIndex === 0 ? '第一步：把水晶拖到高亮格' :
      (this.levelIndex === 1 ? '第二步：旋转水晶，看青色光轨' : '第三步：拖动时看预览线');
    const tip = this.levelIndex === 0 ? '按住下方手牌，拖到金色目标格，松手放置。' :
      (this.levelIndex === 1 ? '放好后点击水晶可旋转，蓝线接通再启动流光。' : '拖动过程中：青线能通，红线会掉，先预判再启动。');

    // Spotlight ring around the next meaningful board target.
    g.fillColor = new Color(253, 224, 71, 46);
    g.circle(target.x, target.y, 78);
    g.fill();
    g.strokeColor = this.hex('#FDE047');
    g.lineWidth = 5;
    g.circle(target.x, target.y, 62);
    g.stroke();
    g.strokeColor = this.hex('#FFFFFF');
    g.lineWidth = 2;
    g.circle(target.x, target.y, 44);
    g.stroke();

    // Arrow from card tray to target.
    const arrowStart = new Vec3(-190, -halfH + 220, 0);
    g.strokeColor = this.hex('#00F0FF');
    g.lineWidth = 6;
    g.moveTo(arrowStart.x, arrowStart.y);
    g.lineTo(target.x - 22, target.y - 28);
    g.stroke();
    g.fillColor = this.hex('#00F0FF');
    g.moveTo(target.x - 22, target.y - 28);
    g.lineTo(target.x - 44, target.y - 22);
    g.lineTo(target.x - 30, target.y - 48);
    g.close();
    g.fill();

    const panelY = Math.max(-halfH + 360, Math.min(halfH - 250, target.y - 160));
    g.fillColor = this.hex('#0B132B');
    ((g.fillColor) as any).a = 245;
    g.roundRect(-285, panelY - 62, 570, 124, 28);
    g.fill();
    g.strokeColor = this.hex('#FDE047');
    g.lineWidth = 2.6;
    g.stroke();

    this.createOverlayLabel(overlay, 'TutorialTitle', new Vec3(0, panelY + 24, 121), title, 24, '#FFFFFF', 520, 34);
    this.createOverlayLabel(overlay, 'TutorialTip', new Vec3(0, panelY - 12, 121), tip, 18, '#CFFAFE', 520, 30);
    this.createOverlayLabel(overlay, 'TutorialDismiss', new Vec3(0, panelY - 42, 121), '点任意位置开始操作', 15, '#FDE047', 300, 24);

    overlay.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
      event.propagationStopped = true;
      if (this.tutorialOverlayNode) {
        this.tutorialOverlayNode.destroy();
        this.tutorialOverlayNode = null;
      }
    }, this);

    tween(overlay)
      .to(0.75, { scale: new Vec3(1.015, 1.015, 1) }, { easing: 'sineInOut' })
      .to(0.75, { scale: new Vec3(1, 1, 1) }, { easing: 'sineInOut' })
      .union()
      .repeatForever()
      .start();
  }

  private createOverlayLabel(parent: Node, name: string, pos: Vec3, text: string, fontSize: number, hexColor: string, w: number, h: number): Label {
    const node = new Node(name);
    node.layer = Layers.Enum.UI_2D;
    node.setParent(parent);
    node.setPosition(pos);
    node.addComponent(UITransform).setContentSize(w, h);
    const label = node.addComponent(Label);
    label.string = text;
    label.fontSize = fontSize;
    label.lineHeight = Math.round(fontSize * 1.2);
    label.color = this.hex(hexColor);
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    label.overflow = Label.Overflow.SHRINK;
    return label;
  }

  public showGameplayHint(): void {
    WeChatService.showVideoAd(() => {
      const sol = this.findSolution();
      if (!sol || sol.length === 0) {
        WeChatService.showToast('当前状态已可以连通，或未找到解法！', 'none');
        return;
      }

      const firstStep = sol[0];
      const displayName = getTileDisplayName(firstStep.type);
      const rotText = firstStep.rotation === 0 ? '默认方向' : `顺时针旋转 ${firstStep.rotation * 90}°`;
      
      this.setStatus(`提示：第 ${firstStep.row + 1} 行，第 ${firstStep.col + 1} 列，放入【${displayName}】并【${rotText}】`);
      WeChatService.showToast('获得时空导引导航！', 'success');

      if (this.hintHighlightNode) {
        this.hintHighlightNode.destroy();
      }

      if (!this.boardRoot) return;

      const highlight = new Node('HintHighlight');
      highlight.layer = Layers.Enum.UI_2D;
      highlight.setParent(this.boardRoot);
      highlight.setPosition(this.gridToLocal(firstStep).add3f(0, 0, 3));
      highlight.addComponent(UITransform).setContentSize(this.tileWidth, this.tileHeight);
      const g = highlight.addComponent(Graphics);
      
      g.strokeColor = this.hex('#00F0FF');
      g.lineWidth = 4.5;
      
      const hw = this.tileWidth / 2 + 6;
      const hh = this.tileHeight / 2 + 6;
      g.moveTo(0, hh);
      g.lineTo(hw, 0);
      g.lineTo(0, -hh);
      g.lineTo(-hw, 0);
      g.close();
      g.stroke();

      highlight.setScale(new Vec3(1, 1, 1));
      tween(highlight)
        .to(0.5, { scale: new Vec3(1.12, 1.12, 1) }, { easing: 'sineInOut' })
        .to(0.5, { scale: new Vec3(1.0, 1.0, 1) }, { easing: 'sineInOut' })
        .union()
        .repeatForever()
        .start();

      this.hintHighlightNode = highlight;

      this.scheduleOnce(() => {
        if (this.hintHighlightNode === highlight) {
          highlight.destroy();
          this.hintHighlightNode = null;
        }
      }, 8.0);

    }, () => {
      console.log('[GameRoot] Ad failed to load or closed.');
    });
  }
}
