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
import { DIRECTIONS, move, posKey, rotateDirection } from '../core/DirectionUtils';
import { Direction, GoalConfig, GridPos, LevelConfig, RunnerColor, RunnerState, TileInstance, TileType } from '../core/GameTypes';
import { RouteSimulator } from '../core/RouteSimulator';
import {
  createTile,
  getTileDisplayName,
  resolveTileConfig,
  rotateTile,
  isStraightType,
  isCurveType,
  getValidCurveRotations,
  smartRotateTile,
  getBaseTileConfig,
} from '../core/TileDefinitions';
import { LevelDirector } from '../core/LevelDirector';
import { LiveOpsService } from '../core/LiveOpsService';
import { EngagementService, FailureInsight } from '../core/EngagementService';
import { BUILTIN_LEVELS } from '../level/BuiltinLevels';
import { WeChatService } from '../wx/WeChatService';
import { ShareService } from '../wx/ShareService';
import { ProfileManager } from '../core/ProfileManager';
import { CloudGameService } from '../wx/CloudGameService';
import { AnalyticsService } from '../wx/AnalyticsService';
import { AdService } from '../wx/AdService';
import { getUiPalette } from '../ui/UiTheme';
import { CrystalAudioService } from '../core/CrystalAudioService';

export interface FailureShareSummary {
  levelId: number;
  levelName: string;
  moves: number;
  handCount: number;
  reason: string;
  isNearGoal: boolean;
  grade?: string;
  rescueText?: string;
  shareText?: string;
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
  topNavNode: Node | null = null;

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

  @property(Node)
  rotateButtonNode: Node | null = null;

  @property(Node)
  leftRotateButtonNode: Node | null = null;

  @property(Node)
  rightRotateButtonNode: Node | null = null;

  @property(Node)
  heroButtonNode: Node | null = null;

  @property(Label)
  heroButtonLabel: Label | null = null;

  @property(Label)
  starPreviewLabel: Label | null = null;

  @property(Label)
  constellationLabel: Label | null = null;

  @property(Node)
  hammerButtonNode: Node | null = null;

  @property(Label)
  hammerButtonLabel: Label | null = null;

  @property(Node)
  resetButtonNode: Node | null = null;

  @property(Label)
  resetButtonLabel: Label | null = null;

  private autoLaunchTimer: any = null;
  private hammerCharges = 2;
  private hammerModeActive = false;
  private resetArmedUntil = 0;
  private illuminatedCellKeys: Set<string> = new Set();
  private previewLitStars = 0;
  private previewProgressRatio = 0;
  private previewBlockedOnObstacle = false;
  private lastPreviewLitCount = 0;
  private lastPreviewConnected = false;
  private lockedBridgeCount = 0;
  private boardDimMode = false;
  private isNearGoal = false;
  private goalNodes: Node[] = [];
  private currentSolutionSteps: Array<{ row: number; col: number; type: TileType; correctRot: number }> = [];

  @property(Node)
  fogRoot: Node | null = null;
  private fogNodes: Map<string, Node> = new Map();
  private markersRoot: Node | null = null;
  private isGestureDrawing = false;
  private gesturePath: GridPos[] = [];
  private gestureTouchedCells: Set<string> = new Set();
  private cellNodes: Map<string, Node> = new Map();
  private drillingObstacleKey: string | null = null;
  private obstacleDrillTimer: any = null;

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
  private selectedPlacedPos: GridPos | null = null;
  private selectedPlacedHighlightNode: Node | null = null;
  private radialDialNode: Node | null = null;
  private selectedCardRotation = 0;
  private usedMoves = 0;
  public undoRemaining = 1;
  public eraseRemaining = 1;
  private moveHistory: { pos: GridPos; cardIndex?: number; tileType?: TileType; prevRotation?: number; generated?: GridPos[] }[] = [];
  private flowEnergy = 0;
  private runnerTimer = 0;
  private maxBulletTime = 3.0;
  private currentBulletTime = 3.0;
  private isResolving = false;
  private currentTheme = 0; // 0: Icefield, 1: Starport Mist, 2: Corona Dawn
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
  private collectedStarCoreKeys = new Set<string>();
  private triggeredSkillTiles = new Set<string>();
  private rewindSnapshot: RewindSnapshot | null = null;
  private timeRewindUsed = false;
  private blessingOverlayNode: Node | null = null;
  private pendingBonusDiamonds = 0;
  private skillComboCount = 0;
  private litGoalKeys = new Set<string>();
  private runnerStepCount = 0;
  private lastFailureInsight: FailureInsight | null = null;
  private commuteStage = -1;
  private activeParticles: ConfettiParticle[] = [];
  private statusToastSerial = 0;
  private routeHintNode: Node | null = null;
  private islandRoomNode: Node | null = null;


  public applyTheme(themeIdx: number): void {
    console.log(`[GameRoot] Apply Theme Index ${themeIdx}`);
    this.currentTheme = themeIdx;
    if (this.level && this.boardRoot && this.boardRoot.isValid) {
      this.clearNode(this.boardRoot);
      this.fogRoot = null;
      this.markersRoot = null;
      this.tileNodes.clear();
      this.starCoreNodes.clear();
      this.renderBoard();
      this.renderAllTiles();
      this.renderCards();
      this.renderFogOfWar();
    }
  }

  public applyPowerSaveMode(enabled: boolean): void {
    this.powerSaveMode = enabled;
  }

  protected start(): void {
    // If this log does not appear in Preview console, the component is not mounted.
    console.log('[FloatFlow] GameRoot started');
    this.resetTransientInputState();
    this.ensureRoots();
  }

  protected onDisable(): void {
    this.resetTransientInputState();
  }

  protected onDestroy(): void {
    this.resetTransientInputState();
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
    this.cancelAutoLaunch();
    this.closeRadialDial();
    if (!this.runner || !this.level) return;

    // 1. 如果光子处于 DEAD 或 SUCCESS 状态，重置回到初始起点
    if (this.runner.state === 'DEAD' || this.runner.state === 'SUCCESS') {
      this.runner.row = this.level.start.row;
      this.runner.col = this.level.start.col;
      this.runner.direction = this.level.start.direction;
      this.runner.color = this.level.start.color;
      this.runner.speed = this.level.start.speed;
      this.runner.state = 'IDLE';
      this.runnerTimer = 0;
      this.isResolving = false;
      if (this.runnerNode) {
        this.runnerNode.setPosition(this.gridToLocal(this.runner));
      }
      this.updateRoutePreviewLine();
    }

    // 2. 立即启动：同步进入 RUNNING 状态，绝不被任何异步 Tween 回调阻塞！
    if (this.runner.state === 'IDLE') {
      CrystalAudioService.resetScale();
      WeChatService.vibrateShort('medium');
      this.rewindSnapshot = this.createRewindSnapshot();
      this.runner.state = 'RUNNING';

      const firstRunText = !this.isEndlessMode && !this.isDailyChallenge && this.levelIndex <= 1
        ? '流光出发！沿着你铺好的水晶路线前进。'
        : (this.isDailyChallenge ? '今日这束光已启动，冲一个更少步数。' : '流光已启动！观察光路与救场触发。');
      this.setStatus(firstRunText);

      this.playLaunchCeremony();
    }
  }

  private playLaunchCeremony(): void {
    if (this.powerSaveMode) {
      return;
    }

    // 1. 起点极光法阵爆射能量激波
    const startAura = this.boardRoot?.getChildByName('StartAura');
    if (startAura) {
      tween(startAura)
        .to(0.12, { scale: new Vec3(1.4, 1.4, 1) }, { easing: 'sineOut' })
        .to(0.12, { scale: new Vec3(1.0, 1.0, 1) }, { easing: 'sineIn' })
        .start();
    }

    // 2. 光轨全线导通脉冲：路线短暂高亮充能
    if (this.previewRoot) {
      tween(this.previewRoot)
        .to(0.1, { scale: new Vec3(1.025, 1.025, 1) }, { easing: 'sineOut' })
        .to(0.12, { scale: new Vec3(1.0, 1.0, 1) }, { easing: 'sineIn' })
        .start();
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

  public requestResetWithConfirm(): void {
    const now = Date.now();
    if (this.usedMoves > 0 && now > this.resetArmedUntil) {
      this.resetArmedUntil = now + 2600;
      WeChatService.vibrateShort('light');
      if (this.resetButtonLabel) {
        this.resetButtonLabel.string = '确认重置?';
        this.resetButtonLabel.color = this.hex('#FDE047');
      }
      this.setStatus('↺ 为防误触，2.5 秒内再点一次「重置」即可清空操作');
      this.scheduleOnce(() => {
        if (Date.now() >= this.resetArmedUntil && this.resetButtonLabel) {
          this.resetButtonLabel.string = '↺ 重 置';
          this.resetButtonLabel.color = this.hex('#E0F2FE');
        }
      }, 2.65);
      return;
    }
    this.resetArmedUntil = 0;
    if (this.resetButtonLabel) {
      this.resetButtonLabel.string = '↺ 重 置';
      this.resetButtonLabel.color = this.hex('#E0F2FE');
    }
    this.clearPlacedTiles();
  }

  public clearPlacedTiles(): void {
    console.log('[FloatFlow] Clear Placed Tiles');
    this.resetArmedUntil = 0;
    if (this.resetButtonLabel) {
      this.resetButtonLabel.string = '↺ 重 置';
      this.resetButtonLabel.color = this.hex('#E0F2FE');
    }
    WeChatService.vibrateShort('light');
    this.restartLevel(true);
    this.setStatus('已重置关卡水晶朝向，轻触水晶重新连通！');
  }

  public undoLastMove(): void {
    console.log('[FloatFlow] Undo Last Move');
    this.closeRadialDial();
    WeChatService.vibrateShort('light');
    if (!this.grid || this.runner?.state === 'RUNNING') {
      return;
    }
    if (this.moveHistory.length === 0) {
      this.setStatus('当前没有任何可撤回的旋转操作！');
      return;
    }

    const last = this.moveHistory.pop();
    if (!last) return;

    if (last.prevRotation !== undefined && this.grid) {
      const tile: TileInstance = { type: last.tileType || 'straight', rotation: last.prevRotation };
      this.grid.setTile(last.pos, tile);
      this.renderTile(last.pos, tile);
      this.setSelectedPlacedPos(last.pos);
      this.updateRoutePreviewLine();
      this.setStatus('已撤销上一次旋转');
      return;
    }

    this.grid.setTile(last.pos, null);
    const key = this.key(last.pos);
    this.tileNodes.get(key)?.destroy();
    this.tileNodes.delete(key);
    for (const generated of last.generated ?? []) {
      this.grid.setTile(generated, null);
      const generatedKey = this.key(generated);
      this.tileNodes.get(generatedKey)?.destroy();
      this.tileNodes.delete(generatedKey);
    }

    if (last.cardIndex !== undefined && last.tileType && this.cardSystem) {
      this.hand = this.cardSystem.returnTileToHand(last.cardIndex, last.tileType);
      this.renderCards();
    }
    this.setSelectedPlacedPos(null);

    this.usedMoves = Math.max(0, this.usedMoves - 1);
    this.updateLabels();
    this.updateRoutePreviewLine();
    this.setStatus('已撤回上一步操作');
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
    const preview = this.grid ? RouteSimulator.simulate(this.grid, this.runner, this.level.goals) : null;
    const insight = this.lastFailureInsight
      ?? EngagementService.analyzeFailure('主动残局求助', this.runner, this.level.goals, preview?.path ?? []);
    const assistId = `${this.level.id}-${Date.now().toString(36)}-${Math.floor(Math.random() * 10000)}`;
    AnalyticsService.track('share_residual', { levelId: this.level.id, moves: this.usedMoves, handCount: this.hand.length, grade: insight.grade });
    ProfileManager.markResidualHelpShared(assistId, this.level.id);
    CloudGameService.registerResidualAssist(assistId, this.level.id);
    const payload = {
      levelId: this.level.id,
      runner: { ...this.runner, state: 'IDLE' as const },
      hand: this.hand,
      assistId,
      moves: this.usedMoves,
      grade: insight.grade,
      missingCell: insight.missingCell,
    };
    ShareService.shareOneTileRescue(this.level, payload, insight.grade);
    WeChatService.showToast(`${insight.shareText} 好友补上后双方都得晶核。`, 'success');
  }

  public shareCurrentChallenge(): void {
    if (!this.level) return;
    AnalyticsService.track('friend_challenge_share', { levelId: this.level.id, moves: this.usedMoves });
    ShareService.shareFriendChallenge(this.level, Math.max(1, this.usedMoves), this.level.id);
  }

  public shareBeautifulRoute(): void {
    if (!this.level) return;
    const stars = this.calculateStars();
    const beautyScore = EngagementService.scoreBeautifulRoute(this.usedMoves, this.skillComboCount, this.bonusCollected, stars);
    ProfileManager.updateBeautifulRouteBest(beautyScore);
    AnalyticsService.track('friend_challenge_share', { levelId: this.level.id, moves: this.usedMoves, beautyScore });
    ShareService.shareBeautifulRoute(this.level, Math.max(1, this.usedMoves), beautyScore);
  }

  public shareCurrentRelay(): void {
    if (!this.level || !this.runner) return;
    AnalyticsService.track('relay_share', { levelId: this.level.id, moves: this.usedMoves });
    ShareService.shareRelay(this.level, {
      levelId: this.level.id,
      runner: this.runner,
      hand: this.hand,
      moves: this.usedMoves,
      seed: this.level.id,
    });
  }

  public showIslandRoom(): void {
    if (this.islandRoomNode) {
      this.islandRoomNode.destroy();
      this.islandRoomNode = null;
    }
    const profile = ProfileManager.getProfile();
    const decorCount = profile.islandDecor?.length || 0;
    const cosmeticCount = profile.unlockedCosmetics?.length || 0;
    const titles = profile.titles && profile.titles.length > 0 ? profile.titles.slice(-3).join('、') : '暂无称号';
    const dateKey = CloudGameService.getTodayKey();
    const dailyDone = profile.dailyChallengeDate === dateKey && (profile.dailyChallengeBest || 0) > 0;
    const nextGoal = dailyDone
      ? '下一目标：帮好友接一次残局，双方都能领取晶核。'
      : '下一目标：完成「每日一束光」，为小岛补一束今日光。';
    const beautyBest = profile.beautifulRouteBest || 0;
    const islandLevel = Math.min(5, 1 + Math.floor(((profile.levelProgress || 0) + decorCount + cosmeticCount) / 6));
    const size = view.getVisibleSize();
    const halfW = size.width / 2;
    const halfH = size.height / 2;
    const palette = getUiPalette(this.currentTheme);

    const overlay = new Node('IslandRoomOverlay');
    overlay.layer = Layers.Enum.UI_2D;
    overlay.setParent(this.node);
    overlay.setPosition(new Vec3(0, 0, 150));
    overlay.addComponent(UITransform).setContentSize(size.width, size.height);
    this.islandRoomNode = overlay;

    const overlayG = overlay.addComponent(Graphics);
    overlayG.fillColor = new Color(4, 9, 23, 172);
    overlayG.rect(-halfW, -halfH, size.width, size.height);
    overlayG.fill();
    overlay.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
      event.propagationStopped = true;
      overlay.destroy();
      if (this.islandRoomNode === overlay) this.islandRoomNode = null;
    }, this);

    const dialog = new Node('IslandRoomDialog');
    dialog.layer = Layers.Enum.UI_2D;
    dialog.setParent(overlay);
    dialog.setPosition(new Vec3(0, -6, 1));
    dialog.addComponent(UITransform).setContentSize(620, 520);
    dialog.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
      event.propagationStopped = true;
    }, this);

    const dg = dialog.addComponent(Graphics);
    dg.fillColor = this.hex(palette.panel);
    ((dg.fillColor) as any).a = 238;
    dg.roundRect(-310, -260, 620, 520, 34);
    dg.fill();
    dg.fillColor = new Color(255, 255, 255, 20);
    dg.roundRect(-292, 112, 584, 116, 30);
    dg.fill();
    dg.strokeColor = this.hex(palette.cyan);
    ((dg.strokeColor) as any).a = 190;
    dg.lineWidth = 2.2;
    dg.roundRect(-310, -260, 620, 520, 34);
    dg.stroke();

    this.createOverlayLabel(dialog, 'Title', new Vec3(0, 214, 2), '我的光之岛', 28, '#FFFFFF', 440, 42);
    this.createOverlayLabel(dialog, 'Sub', new Vec3(0, 178, 2), `岛屿 Lv.${islandLevel} · ${nextGoal}`, 16, palette.gold, 560, 28);

    const island = new Node('IslandPreview');
    island.layer = Layers.Enum.UI_2D;
    island.setParent(dialog);
    island.setPosition(new Vec3(0, 74, 2));
    island.addComponent(UITransform).setContentSize(260, 150);
    const ig = island.addComponent(Graphics);
    ig.fillColor = new Color(34, 211, 238, 44);
    ig.circle(0, 12, 86);
    ig.fill();
    ig.fillColor = this.hex('#102A44');
    ig.moveTo(0, 72);
    ig.lineTo(112, 8);
    ig.lineTo(0, -52);
    ig.lineTo(-112, 8);
    ig.close();
    ig.fill();
    ig.strokeColor = this.hex(palette.cyan);
    ig.lineWidth = 3.4;
    ig.stroke();
    ig.fillColor = this.hex('#FDE047');
    for (let i = 0; i < Math.min(5, islandLevel + decorCount); i++) {
      const x = -62 + i * 31;
      ig.circle(x, 14 + (i % 2) * 15, 7);
      ig.fill();
    }

    const makeStat = (name: string, value: string, x: number, y: number, color: string) => {
      const row = new Node(name);
      row.layer = Layers.Enum.UI_2D;
      row.setParent(dialog);
      row.setPosition(new Vec3(x, y, 2));
      row.addComponent(UITransform).setContentSize(174, 74);
      const rg = row.addComponent(Graphics);
      rg.fillColor = new Color(15, 23, 42, 208);
      rg.roundRect(-87, -37, 174, 74, 20);
      rg.fill();
      rg.strokeColor = this.hex(color);
      ((rg.strokeColor) as any).a = 155;
      rg.lineWidth = 1.8;
      rg.stroke();
      this.createOverlayLabel(row, 'Value', new Vec3(0, 13, 1), value, 24, '#FFFFFF', 150, 32);
      this.createOverlayLabel(row, 'Name', new Vec3(0, -18, 1), name, 14, color, 150, 22);
    };
    makeStat('通关进度', `${profile.levelProgress || 0}`, -190, -52, palette.cyan);
    makeStat('收藏装扮', `${cosmeticCount}`, 0, -52, '#34D399');
    makeStat('浮岛摆件', `${decorCount}`, 190, -52, palette.gold);
    this.createOverlayLabel(dialog, 'TitleList', new Vec3(0, -112, 2), `称号：${titles}`, 16, palette.muted, 560, 26);
    this.createOverlayLabel(dialog, 'BeautyBest', new Vec3(0, -142, 2), `最美光轨 ${beautyBest || '--'} 分 · 分享漂亮路线可继续解锁小岛展示`, 15, '#CFFAFE', 560, 24);

    const closeBtn = new Node('IslandCloseBtn');
    closeBtn.layer = Layers.Enum.UI_2D;
    closeBtn.setParent(dialog);
    closeBtn.setPosition(new Vec3(-128, -204, 3));
    closeBtn.addComponent(UITransform).setContentSize(210, 58);
    const closeG = closeBtn.addComponent(Graphics);
    closeG.fillColor = new Color(15, 23, 42, 230);
    closeG.roundRect(-105, -29, 210, 58, 22);
    closeG.fill();
    closeG.strokeColor = this.hex('#64748B');
    closeG.lineWidth = 1.6;
    closeG.stroke();
    this.createOverlayLabel(closeBtn, 'Text', new Vec3(0, 1, 1), '继续点亮', 19, '#FFFFFF', 180, 34);
    closeBtn.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
      event.propagationStopped = true;
      overlay.destroy();
      if (this.islandRoomNode === overlay) this.islandRoomNode = null;
    }, this);

    const shareBtn = new Node('IslandShareBtn');
    shareBtn.layer = Layers.Enum.UI_2D;
    shareBtn.setParent(dialog);
    shareBtn.setPosition(new Vec3(128, -204, 3));
    shareBtn.addComponent(UITransform).setContentSize(210, 58);
    const shareG = shareBtn.addComponent(Graphics);
    shareG.fillColor = this.hex('#0891B2');
    shareG.roundRect(-105, -29, 210, 58, 22);
    shareG.fill();
    shareG.strokeColor = this.hex('#A5F3FC');
    shareG.lineWidth = 2.0;
    shareG.stroke();
    this.createOverlayLabel(shareBtn, 'Text', new Vec3(0, 1, 1), '晒我的小岛', 19, '#FFFFFF', 180, 34);
    shareBtn.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
      event.propagationStopped = true;
      if (this.level) {
        ShareService.shareBeautifulRoute(this.level, Math.max(1, this.usedMoves), beautyBest || 60);
      }
    }, this);

    dialog.setScale(new Vec3(0.88, 0.88, 1));
    tween(dialog).to(0.22, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' }).start();
  }

  public loadResidualFromShare(residualStr: string): void {
    const payload = ShareService.decodeResidual(residualStr);
    if (!payload || typeof payload.levelId !== 'number') return;
    const idx = this.findIndexByLevelId(payload.levelId);
    if (idx >= 0) {
      this.loadLevel(idx);
      if (payload.runner) {
        this.runner = { ...payload.runner, state: 'IDLE' };
        this.renderRunner();
      }
      if (payload.hand && Array.isArray(payload.hand)) {
        this.hand = this.cardSystem ? this.cardSystem.setHand(payload.hand) : [...payload.hand];
        this.renderCards();
      }
      this.usedMoves = Math.max(0, Math.floor(payload.moves ?? this.usedMoves));
      this.residualAssistId = payload.assistId || '';
      if (payload.missingCell) {
        this.showFailureReplayMarker(payload.missingCell);
      }
      this.updateLabels();
      this.setStatus(`已还原好友${payload.grade || '残局'}求助。补上关键水晶，接通后你得 80 晶核。`);
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
    this.lastFailureInsight = null;
    this.triggeredSkillTiles.clear();
    this.rewindSnapshot = null;
    this.timeRewindUsed = false;
    this.pendingBonusDiamonds = 0;
    this.skillComboCount = 0;
    this.litGoalKeys.clear();
    this.runnerStepCount = 0;
    this.commuteStage = -1;
    this.level = this.generateDailyChallengeLevel();
    const liveEvent = LiveOpsService.getActiveEvent();
    this.level.eventTag = liveEvent.tag;
    if (liveEvent.tag === 'blackhole_weekend') {
      this.level.name = `周末黑洞 · ${CloudGameService.getTodayKey()}`;
      const forward = this.level.start.direction === 'left' ? -1 : 1;
      const c1 = Math.max(1, Math.min(this.level.gridSize[1] - 2, this.level.start.col + forward * 2));
      const c2 = Math.max(1, Math.min(this.level.gridSize[1] - 2, this.level.start.col + forward * 3));
      this.level.unstableCells = [
        { row: this.level.start.row, col: c1, collapseAfterSteps: 4 },
        { row: this.level.start.row, col: c2, collapseAfterSteps: 6 },
      ];
      this.level.tilePool = [...this.level.tilePool, 'boost', 'jump', 'time_crystal'];
      this.level.objective = 'race_blackhole';
      this.level.tutorialTip = '周末黑洞：身后浮岛会坍塌，接到终点前别停太久。';
    }
    this.grid = GridManager.fromLevel(this.level);
    this.runner = { ...this.level.start, state: 'IDLE' };
    this.illuminatedCellKeys.clear();
    this.previewLitStars = 0;
    this.previewProgressRatio = 0;
    this.previewBlockedOnObstacle = false;
    this.lastPreviewLitCount = 0;
    this.lastPreviewConnected = false;
    this.lockedBridgeCount = 0;
    this.boardDimMode = false;
    this.isNearGoal = false;
    this.goalNodes = [];
    this.resetArmedUntil = 0;
    if (this.resetButtonLabel) {
      this.resetButtonLabel.string = '↺ 重 置';
      this.resetButtonLabel.color = this.hex('#E0F2FE');
    }
    this.hammerCharges = 2;
    this.hammerModeActive = false;
    this.ensureLevelPuzzleTilesOnBoard();
    this.cardSystem = new CardSystem(this.withSkillTiles(this.level.tilePool), this.level.handSize, this.level.fixedHands ?? []);
    this.hand = this.cardSystem.drawInitial();
    this.usedMoves = 0;
    this.flowEnergy = 0;
    this.runnerTimer = 0;
    this.isResolving = false;
    this.bonusCell = this.level?.starCores && this.level.starCores.length > 0 ? { ...this.level.starCores[0] } : null;
    this.bonusCollected = false;
    this.bonusNode = null;
    this.starCoreNodes.clear();
    this.collectedStarCoreKeys.clear();

    this.activeParticles.forEach((p) => p.node.destroy());
    this.activeParticles = [];
    this.clearNode(this.boardRoot);
    this.fogRoot = null;
    this.markersRoot = null;
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
    this.setStatus(`${liveEvent.title}开启：今日同题比步数，少一步就更靠前。`);
    ProfileManager.recordLevelStart(this.level.id);
    AnalyticsService.track('level_start', { levelId: this.level.id, daily: true, versionTag: this.level.versionTag || 'v1.5' });
    if (this.previewRoot) {
      this.previewRoot.active = true;
      this.clearNode(this.previewRoot);
      this.updateRoutePreviewLine();
    }
  }

  public loadSeededChallenge(seed = Date.now() % 100000, stage = 0): void {
    WeChatService.vibrateShort('medium');
    this.isEndlessMode = false;
    this.isDailyChallenge = false;
    this.endlessStageIndex = stage;
    this.level = LevelDirector.generateSeededChallenge(seed, stage);
    this.levelIndex = Math.max(0, stage);
    this.grid = GridManager.fromLevel(this.level);
    this.runner = { ...this.level.start, state: 'IDLE' };
    this.illuminatedCellKeys.clear();
    this.previewLitStars = 0;
    this.previewProgressRatio = 0;
    this.previewBlockedOnObstacle = false;
    this.lastPreviewLitCount = 0;
    this.lastPreviewConnected = false;
    this.lockedBridgeCount = 0;
    this.boardDimMode = false;
    this.isNearGoal = false;
    this.goalNodes = [];
    this.resetArmedUntil = 0;
    if (this.resetButtonLabel) {
      this.resetButtonLabel.string = '↺ 重 置';
      this.resetButtonLabel.color = this.hex('#E0F2FE');
    }
    this.hammerCharges = 2;
    this.hammerModeActive = false;
    this.ensureLevelPuzzleTilesOnBoard();
    this.cardSystem = new CardSystem(this.withSkillTiles(this.level.tilePool), this.level.handSize, this.level.fixedHands ?? []);
    this.hand = this.cardSystem.drawInitial();
    this.usedMoves = 0;
    this.flowEnergy = 0;
    this.runnerTimer = 0;
    this.isResolving = false;
    this.residualAssistId = '';
    this.lastFailureInsight = null;
    this.triggeredSkillTiles.clear();
    this.litGoalKeys.clear();
    this.runnerStepCount = 0;
    this.bonusCell = null;
    this.bonusCollected = false;
    this.bonusNode = null;
    this.starCoreNodes.clear();
    this.collectedStarCoreKeys.clear();
    this.pendingBonusDiamonds = 0;
    this.skillComboCount = 0;
    this.commuteStage = -1;
    this.clearNode(this.boardRoot);
    this.fogRoot = null;
    this.markersRoot = null;
    this.clearNode(this.previewRoot);
    this.clearNode(this.runnerRoot);
    this.clearNode(this.cardRoot);
    this.tileNodes.clear();
    this.cardNodes = [];
    this.renderBoard();
    this.renderAllTiles();
    this.renderRunner();
    this.renderCards();
    this.updateLabels();
    this.maxBulletTime = this.level.bulletTimeSeconds ?? 3.0;
    this.currentBulletTime = this.maxBulletTime;
    this.redrawBulletTimeMeter();
    const report = LevelDirector.estimateDifficulty(this.level);
    this.setStatus(`种子挑战已生成：${report.label}，用于每日/活动内容生产。`);
    AnalyticsService.track('level_start', { levelId: this.level.id, seed, stage, difficulty: report.label, versionTag: 'v1.7' });
    if (this.previewRoot) {
      this.previewRoot.active = true;
      this.clearNode(this.previewRoot);
      this.updateRoutePreviewLine();
    }
  }

  public loadCommuteChallenge(stage = 0): void {
    const challenge = EngagementService.getCommuteChallenge();
    const safeStage = Math.max(0, Math.min(stage, challenge.stages.length - 1));
    this.loadSeededChallenge(Number(CloudGameService.getTodayKey()), challenge.stages[safeStage]);
    this.commuteStage = safeStage;
    if (this.level) {
      this.level.name = `${challenge.title} · ${safeStage + 1}/3`;
      this.level.eventTag = 'commute_3min';
      this.level.versionTag = 'v1.5';
      this.setStatus(`${challenge.subtitle}。完成 3 关可领 ${challenge.reward} 晶核。`);
      this.updateLabels();
    }
  }

  public continueSpecialChallengeIfAny(): boolean {
    if (this.commuteStage >= 0 && this.commuteStage < 2) {
      this.loadCommuteChallenge(this.commuteStage + 1);
      return true;
    }
    return false;
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
    if (stage >= 10) tilePool.push('mirror', 'vine');
    if (stage >= 12) tilePool.push('jump', 'blackhole');
    if (stage >= 15) tilePool.push('splitter');

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
      unstableCells: stage >= 9 ? [{ row: startRow, col: Math.floor(size / 2), collapseAfterSteps: 5 }] : [],
      tilePool,
      recommendedMoves: 5 + stage,
      objective: stage >= 15 ? 'race_blackhole' : 'reach_goal',
      versionTag: stage >= 15 ? 'v2.0' : 'v1.7',
    };
  }

  private generateDailyChallengeLevel(): LevelConfig {
    const now = new Date();
    const dateKey = CloudGameService.getTodayKey();
    const daySeed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
    const variant = daySeed % 10;
    const mirrored = variant % 2 === 1;
    const size = 7;
    const startCol = mirrored ? size - 1 : 0;
    const goalCol = mirrored ? 0 : size - 1;
    const direction = mirrored ? 'left' : 'right';
    const startRows = [3, 2, 4, 1, 5, 3, 2, 4, 1, 5];
    const goalRows = [4, 4, 2, 5, 1, 2, 5, 1, 3, 3];
    const obstacleTemplates: Array<Array<[number, number]>> = [
      [[3, 3], [2, 3]],
      [[1, 3], [3, 3], [5, 3]],
      [[2, 2], [3, 3], [4, 4]],
      [[1, 4], [2, 4], [4, 2]],
      [[5, 2], [4, 3], [2, 4]],
      [[2, 2], [4, 2], [3, 4]],
      [[1, 3], [2, 3], [4, 3]],
      [[5, 3], [4, 3], [2, 3]],
      [[2, 2], [2, 4], [4, 3]],
      [[4, 2], [4, 4], [2, 3]],
    ];
    const handTemplates: TileType[][] = [
      ['curve', 'straight', 'curve'],
      ['curve', 'cross', 'straight'],
      ['straight', 'curve', 'cross'],
      ['curve', 'curve', 'straight'],
      ['cross', 'curve', 'straight'],
      ['straight', 'cross', 'curve'],
      ['curve', 'straight', 'cross'],
      ['cross', 'straight', 'curve'],
      ['curve', 'curve', 'cross'],
      ['straight', 'curve', 'curve'],
    ];
    const startRow = startRows[variant];
    const goalRow = goalRows[variant];
    const initialCol = mirrored ? size - 2 : 1;

    return {
      id: 800000 + daySeed,
      name: `今日光路 · ${dateKey}`,
      gridSize: [size, size],
      start: { row: startRow, col: startCol, direction, color: 'none', speed: 1, state: 'IDLE' },
      goals: [{ row: goalRow, col: goalCol, color: 'none' }],
      handSize: 3,
      bulletTimeEnergy: 3,
      runnerStepSeconds: 0.24,
      autoStart: false,
      obstacles: obstacleTemplates[variant],
      initialTiles: [{ row: startRow, col: initialCol, tile: { type: 'straight', rotation: 0 } }],
      starCores: variant >= 5 ? [{ row: variant % 2 === 0 ? 0 : 6, col: 3 }] : [],
      tilePool: ['straight', 'curve', 'cross'],
      fixedHands: handTemplates[variant],
      recommendedMoves: 4 + (variant % 3),
      tutorialTip: '每日一束光：同一道题比最短步数，通关后可晒光路挑战好友。',
      objective: 'reach_goal',
      versionTag: 'v1.5',
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
    if (progress >= 8) {
      pushMany('mirror', 1 + this.getBlessingEffectLevel('mirror_chain'));
      pushMany('vine', 1);
    }
    if (progress >= 12) {
      pushMany('jump', 1);
      pushMany('blackhole', 1 + this.getBlessingEffectLevel('blackhole_flow'));
    }
    if (progress >= 16) {
      pushMany('splitter', 1);
    }
    return pool;
  }

  private getBlessingEffectLevel(blessingId: string): number {
    return Math.min(3, ProfileManager.getBlessingLevel(blessingId));
  }

  public loadLevel(index: number, preserveChances = false, isEndless = false): void {
    this.closeRadialDial();
    this.setSelectedPlacedPos(null);
    this.selectedCardIndex = -1;
    this.selectedCardRotation = 0;
    if (this.routeHintNode) {
      this.routeHintNode.destroy();
      this.routeHintNode = null;
    }
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
    this.litGoalKeys.clear();
    this.runnerStepCount = 0;
    this.commuteStage = -1;
    this.residualAssistId = '';
    this.lastFailureInsight = null;

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
      const maxJourneyLevelCount = this.levels.length;
      const safeIndex = Math.max(0, Math.min(index, maxJourneyLevelCount - 1));
      this.levelIndex = safeIndex;
      const baseLevel = this.levels[safeIndex % this.levels.length];
      const copied = JSON.parse(JSON.stringify(baseLevel)) as LevelConfig;
      if (safeIndex >= this.levels.length) {
        copied.id = safeIndex + 1;
        copied.name = `星港镜像 · ${baseLevel.name}`;
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
        if (copied.unstableCells) {
          copied.unstableCells.forEach((cell) => {
            cell.col = cols - 1 - cell.col;
          });
        }
        if (copied.starCores) {
          copied.starCores.forEach((cell) => {
            cell.col = cols - 1 - cell.col;
          });
        }

        this.level = copied;
        this.currentTheme = 1; // Auto Theme 1 (Starport Mist) for Chapter 2
      } else {
        this.level = copied;
        this.currentTheme = Math.floor(safeIndex / 5) % 3;
      }
    }

    this.grid = GridManager.fromLevel(this.level);
    this.runner = { ...this.level!.start, state: 'IDLE' };
    this.illuminatedCellKeys.clear();
    this.previewLitStars = 0;
    this.previewProgressRatio = 0;
    this.previewBlockedOnObstacle = false;
    this.lastPreviewLitCount = 0;
    this.lastPreviewConnected = false;
    this.lockedBridgeCount = 0;
    this.boardDimMode = false;
    this.isNearGoal = false;
    this.goalNodes = [];
    this.resetArmedUntil = 0;
    if (this.resetButtonLabel) {
      this.resetButtonLabel.string = '↺ 重 置';
      this.resetButtonLabel.color = this.hex('#E0F2FE');
    }
    this.hammerCharges = 2;
    this.hammerModeActive = false;
    this.ensureLevelPuzzleTilesOnBoard();

    this.bonusCell = null;
    this.bonusCollected = false;
    this.bonusNode = null;
    this.starCoreNodes.clear();
    this.collectedStarCoreKeys.clear();

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
        this.level.starCores = [{ ...this.bonusCell }];
      }
    }

    this.runner = { ...this.level!.start, state: 'IDLE' };
    this.cardSystem = new CardSystem(this.withSkillTiles(this.level.tilePool), this.level.handSize, this.level.fixedHands ?? []);
    this.hand = this.cardSystem.drawInitial();
    this.usedMoves = 0;
    this.flowEnergy = !this.isEndlessMode && this.level.id === 4 ? 1 : 0;
    this.runnerTimer = 0;
    this.isResolving = false;

    this.activeParticles.forEach((p) => p.node.destroy());
    this.activeParticles = [];

    this.clearNode(this.boardRoot);
    this.fogRoot = null;
    this.markersRoot = null;
    this.clearNode(this.previewRoot);
    this.clearNode(this.runnerRoot);
    this.clearNode(this.cardRoot);
    if (this.dragNode) {
      this.dragNode.destroy();
      this.dragNode = null;
    }
    this.tileNodes.clear();
    this.cardNodes = [];
    this.fogNodes.clear();

    this.renderBoard();
    this.renderAllTiles();
    this.renderRunner();
    this.renderCards();
    this.renderFogOfWar();
    this.updateLabels();
    this.maxBulletTime = this.level.bulletTimeSeconds ?? 3.0;
    this.currentBulletTime = this.maxBulletTime;
    this.redrawBulletTimeMeter();
    this.setStatus(this.level.tutorialTip ?? '✦ 一指滑动拉出光轨 · 驱散迷雾复苏浮岛');
    ProfileManager.recordLevelStart(this.level.id);
    AnalyticsService.track('level_start', {
      levelId: this.level.id,
      daily: false,
      endless: this.isEndlessMode,
      versionTag: this.level.versionTag || 'v1.0',
      difficulty: LevelDirector.estimateDifficulty(this.level).label,
    });
    if (this.previewRoot) {
      this.previewRoot.active = true;
      this.clearNode(this.previewRoot);
      this.updateRoutePreviewLine();
    }
    this.showTutorialOverlayIfNeeded();
  }

  private ensureLevelPuzzleTilesOnBoard(): void {
    if (!this.level || !this.grid || !this.runner) return;
    this.lockedBridgeCount = 0;
    this.currentSolutionSteps = [];

    const placedKeys = new Set<string>();
    const resolvedSteps: Array<{ row: number; col: number; type: TileType; correctRot: number }> = [];
    const resolveCorrectRot = (type: TileType, inDir: Direction, outDir: Direction): number => {
      if (isStraightType(type)) {
        return (inDir === 'left' || inDir === 'right') ? 0 : 1;
      }
      for (let r = 0; r < 4; r++) {
        const cfg = resolveTileConfig({ type, rotation: r });
        if (cfg.routing[inDir] === outDir) {
          return r;
        }
      }
      return 0;
    };

    const placeStepTile = (
      steps: Array<{ row: number; col: number; inDir: Direction; outDir: Direction }>,
      allowOverride: boolean,
      recordPrimary = false,
      forceSolutionType = false,
      scramble = true
    ) => {
      if (!this.grid) return;
      for (const step of steps) {
        const pos = { row: step.row, col: step.col };
        const key = this.key(pos);
        if (!allowOverride && placedKeys.has(key)) continue;
        if (!this.canPlace(pos)) continue;

        const existing = this.grid.getTile(pos);
        const isStraight = step.inDir === step.outDir;
        const neededType: TileType = isStraight ? 'straight' : 'curve';
        const tileType = (forceSolutionType || !existing) ? neededType : existing.type;
        const correctRot = resolveCorrectRot(tileType, step.inDir, step.outDir);

        let rot = correctRot;
        if (scramble) {
          if (isStraightType(tileType)) {
            rot = 1 - (correctRot % 2);
          } else {
            const shift = 1 + ((step.row * 2 + step.col) % 3);
            rot = (correctRot + shift) % 4;
          }
        }

        this.grid.setTile(pos, { type: tileType, rotation: rot });
        placedKeys.add(key);
        if (recordPrimary) {
          resolvedSteps.push({ row: step.row, col: step.col, type: tileType, correctRot });
        }
      }
    };

    // 1. Ensure primary solution path is 100% mathematically solvable via RouteSimulator!
    const currentSim = RouteSimulator.simulate(this.grid, this.runner, this.level.goals);
    if (currentSim.success) {
      this.scramblePlacedTiles();
    } else {
      const obstacleSet = new Set<string>();
      for (const [r, c] of this.level.obstacles ?? []) {
        obstacleSet.add(`${r}:${c}`);
      }
      let safeSteps = this.findLevelSolutionPath(this.level);
      // Place unscrambled first to verify solvability (prevents incompatible initialTiles / routeHints deadlocks!)
      placeStepTile(safeSteps, true, true, true, false);
      // Ensure colored goals ('blue' / 'red') have a matching paint crystal along a straight segment before gates/goals
      const needColor = this.level.goals.find((g) => g.color === 'blue' || g.color === 'red')?.color;
      if (needColor) {
        const paintType: TileType = needColor === 'blue' ? 'paint_blue' : 'paint_red';
        const firstStraight = resolvedSteps.find((s) => s.type === 'straight');
        if (firstStraight) {
          firstStraight.type = paintType;
          firstStraight.correctRot = 0;
          this.grid.setTile({ row: firstStraight.row, col: firstStraight.col }, { type: paintType, rotation: 0 });
        }
      }

      let verify = RouteSimulator.simulate(this.grid, this.runner, this.level.goals);
      if (!verify.success && this.level.goals.length > 0) {
        // Fallback: clear failed hint steps and solve all required goals + color gates cleanly via bfsSolveAllGoals
        for (const s of resolvedSteps) {
          this.grid.setTile({ row: s.row, col: s.col }, null);
          placedKeys.delete(this.key({ row: s.row, col: s.col }));
        }
        resolvedSteps.length = 0;
        safeSteps = this.bfsSolveAllGoals(this.level.start, this.level.goals, obstacleSet, this.grid.rows, this.grid.cols);
        placeStepTile(safeSteps, true, true, true, false);
        if (needColor) {
          const paintType: TileType = needColor === 'blue' ? 'paint_blue' : 'paint_red';
          const firstStraight = resolvedSteps.find((s) => s.type === 'straight');
          if (firstStraight) {
            firstStraight.type = paintType;
            firstStraight.correctRot = 0;
            this.grid.setTile({ row: firstStraight.row, col: firstStraight.col }, { type: paintType, rotation: 0 });
          }
        }
        verify = RouteSimulator.simulate(this.grid, this.runner, this.level.goals);
      }

      // Now scramble all rotatable primary solution tiles so the player actively solves it
      for (const s of resolvedSteps) {
        if (!resolveTileConfig({ type: s.type, rotation: 0 }).rotatable) continue;
        const pos = { row: s.row, col: s.col };
        let scrambledRot = s.correctRot;
        if (isStraightType(s.type)) {
          scrambledRot = 1 - (s.correctRot % 2);
        } else {
          const shift = 1 + ((s.row * 2 + s.col) % 3);
          scrambledRot = (s.correctRot + shift) % 4;
        }
        this.grid.setTile(pos, { type: s.type, rotation: scrambledRot });
      }
      this.currentSolutionSteps = resolvedSteps.map((s) => ({ ...s }));
    }

    // 1.5 Add 1-2 locked anchor bridge tiles on larger boards (6x6+ or daily/endless) as visual landmarks
    const shouldPlaceAnchors = this.isDailyChallenge || this.isEndlessMode || this.grid.cols >= 6 || this.levelIndex >= 3;
    if (shouldPlaceAnchors && resolvedSteps.length >= 4) {
      const starSet = new Set((this.level.starCores ?? []).map((s) => this.key(s)));
      const anchorIndices = resolvedSteps.length >= 7
        ? [Math.floor(resolvedSteps.length * 0.38), Math.floor(resolvedSteps.length * 0.72)]
        : [Math.floor(resolvedSteps.length * 0.5)];
      for (const idx of anchorIndices) {
        const step = resolvedSteps[idx];
        if (!step) continue;
        if (!resolveTileConfig({ type: step.type, rotation: 0 }).rotatable) continue;
        const pos = { row: step.row, col: step.col };
        if (starSet.has(this.key(pos)) || !this.canPlace(pos)) continue;
        this.grid.setTile(pos, { type: step.type, rotation: step.correctRot, locked: true });
        this.lockedBridgeCount++;
      }
    }

    // 2. Also populate greedy 3-star route through starCores so 3-star collection is genuinely solvable!
    if (this.level.starCores && this.level.starCores.length > 0 && this.level.goals.length > 0) {
      const obstacleSet = new Set<string>();
      for (const [r, c] of this.level.obstacles ?? []) {
        obstacleSet.add(`${r}:${c}`);
      }
      const anchors: GridPos[] = [this.level.start, ...this.level.starCores, this.level.goals[0]];
      const greedyWaypoints: GridPos[] = [];
      for (let i = 0; i < anchors.length - 1; i++) {
        const sub = this.bfsBetween(anchors[i], anchors[i + 1], obstacleSet, this.grid.rows, this.grid.cols);
        if (sub.length > 0) {
          greedyWaypoints.push(...(i === 0 ? sub : sub.slice(1)));
        }
      }
      if (greedyWaypoints.length >= 3) {
        const greedySteps = this.waypointsToSteps(greedyWaypoints);
        placeStepTile(greedySteps, false, false, false, true);
      }
    }

    // 3. Populate deterministic scrambled-road grid (crisp FTUE on levels 1-3, full density on 4+/daily/endless)
    for (let r = 0; r < this.grid.rows; r++) {
      for (let c = 0; c < this.grid.cols; c++) {
        const pos = { row: r, col: c };
        if (!this.canPlace(pos) || this.grid.getTile(pos)) continue;
        const seed = (this.level.id * 31 + r * 17 + c * 23) % 100;
        const density = (!this.isEndlessMode && !this.isDailyChallenge)
          ? (this.levelIndex === 0 ? 38 : (this.levelIndex <= 2 ? 48 : 65))
          : 65;
        if (seed < density) {
          const decoyType: TileType = seed % 11 === 0 && (this.isDailyChallenge || this.levelIndex >= 2)
            ? 'cross'
            : (seed % 2 === 0 ? 'straight' : 'curve');
          const rot = (seed + r + c) % (decoyType === 'straight' ? 2 : 4);
          this.grid.setTile(pos, { type: decoyType, rotation: rot });
        }
      }
    }
  }

  private scramblePlacedTiles(): void {
    if (!this.grid) return;
    for (let r = 0; r < this.grid.rows; r++) {
      for (let c = 0; c < this.grid.cols; c++) {
        const pos = { row: r, col: c };
        const tile = this.grid.getTile(pos);
        if (tile && !tile.locked && !this.grid.isObstacle(pos)) {
          if (isStraightType(tile.type)) {
            this.grid.setTile(pos, { ...tile, rotation: 1 - (tile.rotation % 2) });
            return;
          } else if (isCurveType(tile.type)) {
            this.grid.setTile(pos, { ...tile, rotation: (tile.rotation + 1) % 4 });
            return;
          }
        }
      }
    }
  }

  private findLevelSolutionPath(level: LevelConfig): Array<{ row: number; col: number; inDir: Direction; outDir: Direction }> {
    const rows = level.gridSize[0];
    const cols = level.gridSize[1];
    const obstacleSet = new Set<string>();
    if (level.obstacles) {
      for (const [r, c] of level.obstacles) {
        obstacleSet.add(`${r}:${c}`);
      }
    }

    if (level.routeHints?.safe && level.routeHints.safe.length >= 2) {
      const hints = level.routeHints.safe;
      const waypoints: GridPos[] = [];
      for (let i = 0; i < hints.length - 1; i++) {
        const from = hints[i];
        const to = hints[i + 1];
        const subPath = this.bfsBetween(from, to, obstacleSet, rows, cols);
        if (subPath.length > 0) {
          const slice = i === 0 ? subPath : subPath.slice(1);
          waypoints.push(...slice);
        } else {
          waypoints.push(from);
        }
      }
      if (waypoints.length >= 2) {
        const steps = this.waypointsToSteps(waypoints);
        if (steps.length > 0) return steps;
      }
    }

    const targetGoal = level.goals[0];
    if (!targetGoal) return [];

    return this.bfsStartToGoal(level.start, targetGoal, obstacleSet, rows, cols);
  }

  private bfsBetween(from: GridPos, to: GridPos, obstacleSet: Set<string>, rows: number, cols: number): GridPos[] {
    if (from.row === to.row && from.col === to.col) return [from];

    const queue: Array<{ pos: GridPos; path: GridPos[] }> = [{ pos: from, path: [from] }];
    const visited = new Set<string>([`${from.row}:${from.col}`]);

    while (queue.length > 0) {
      const { pos, path } = queue.shift()!;
      if (pos.row === to.row && pos.col === to.col) {
        return path;
      }

      for (const dir of DIRECTIONS) {
        const n = move(pos, dir);
        if (n.row < 0 || n.row >= rows || n.col < 0 || n.col >= cols) continue;
        const key = `${n.row}:${n.col}`;
        if ((n.row !== to.row || n.col !== to.col) && obstacleSet.has(key)) continue;
        if (!visited.has(key)) {
          visited.add(key);
          queue.push({ pos: n, path: [...path, n] });
        }
      }
    }
    return [from, to];
  }

  private waypointsToSteps(waypoints: GridPos[]): Array<{ row: number; col: number; inDir: Direction; outDir: Direction }> {
    const steps: Array<{ row: number; col: number; inDir: Direction; outDir: Direction }> = [];
    if (waypoints.length < 3) return steps;

    for (let i = 1; i < waypoints.length - 1; i++) {
      const prev = waypoints[i - 1];
      const cur = waypoints[i];
      const next = waypoints[i + 1];

      const inDir = this.getStepDirection(prev, cur);
      const outDir = this.getStepDirection(cur, next);
      if (inDir && outDir) {
        steps.push({ row: cur.row, col: cur.col, inDir, outDir });
      }
    }
    return steps;
  }

  private getStepDirection(from: GridPos, to: GridPos): Direction | null {
    if (to.row === from.row - 1 && to.col === from.col) return 'up';
    if (to.row === from.row + 1 && to.col === from.col) return 'down';
    if (to.row === from.row && to.col === from.col + 1) return 'right';
    if (to.row === from.row && to.col === from.col - 1) return 'left';
    return null;
  }

  private bfsSolveAllGoals(
    start: RunnerState,
    goals: GoalConfig[],
    obstacleSet: Set<string>,
    rows: number,
    cols: number
  ): Array<{ row: number; col: number; inDir: Direction; outDir: Direction }> {
    const reqGoals = goals.filter((g) => g.required);
    const targets = reqGoals.length > 0 ? reqGoals : (goals.length > 0 ? [goals[0]] : []);
    if (targets.length === 0) return [];
    const targetMask = (1 << targets.length) - 1;
    const goalIndexMap = new Map<string, number>();
    targets.forEach((g, idx) => goalIndexMap.set(`${g.row}:${g.col}`, idx));

    const firstPos = move(start, start.direction);
    if (firstPos.row < 0 || firstPos.row >= rows || firstPos.col < 0 || firstPos.col >= cols) return [];
    if (obstacleSet.has(`${firstPos.row}:${firstPos.col}`)) return [];

    interface BFSItem {
      pos: GridPos;
      dir: Direction;
      mask: number;
      steps: Array<{ row: number; col: number; inDir: Direction; outDir: Direction }>;
    }

    const queue: BFSItem[] = [];
    const visited = new Set<string>();

    const firstGoalIdx = goalIndexMap.get(`${firstPos.row}:${firstPos.col}`);
    if (firstGoalIdx !== undefined) {
      const mask = 1 << firstGoalIdx;
      if (mask === targetMask) return [];
      queue.push({ pos: firstPos, dir: start.direction, mask, steps: [] });
      visited.add(`${firstPos.row}:${firstPos.col}:${start.direction}:${mask}`);
    } else {
      for (const outDir of [start.direction, rotateDirection(start.direction, 1), rotateDirection(start.direction, 3)]) {
        queue.push({
          pos: firstPos,
          dir: outDir,
          mask: 0,
          steps: [{ row: firstPos.row, col: firstPos.col, inDir: start.direction, outDir }],
        });
        visited.add(`${firstPos.row}:${firstPos.col}:${outDir}:0`);
      }
    }

    while (queue.length > 0) {
      const cur = queue.shift()!;
      const nextPos = move(cur.pos, cur.dir);
      if (nextPos.row < 0 || nextPos.row >= rows || nextPos.col < 0 || nextPos.col >= cols) continue;
      const nextKey = `${nextPos.row}:${nextPos.col}`;
      if (obstacleSet.has(nextKey)) continue;
      if (nextPos.row === start.row && nextPos.col === start.col) continue;

      const gIdx = goalIndexMap.get(nextKey);
      if (gIdx !== undefined) {
        const nextMask = cur.mask | (1 << gIdx);
        if (nextMask === targetMask) return cur.steps;
        const stateKey = `${nextKey}:${cur.dir}:${nextMask}`;
        if (!visited.has(stateKey)) {
          visited.add(stateKey);
          queue.push({ pos: nextPos, dir: cur.dir, mask: nextMask, steps: cur.steps });
        }
        continue;
      }

      if (cur.steps.some((s) => s.row === nextPos.row && s.col === nextPos.col)) continue;

      for (const nextOut of [cur.dir, rotateDirection(cur.dir, 1), rotateDirection(cur.dir, 3)]) {
        const stateKey = `${nextKey}:${nextOut}:${cur.mask}`;
        if (!visited.has(stateKey)) {
          visited.add(stateKey);
          queue.push({
            pos: nextPos,
            dir: nextOut,
            mask: cur.mask,
            steps: [...cur.steps, { row: nextPos.row, col: nextPos.col, inDir: cur.dir, outDir: nextOut }],
          });
        }
      }
    }
    return [];
  }

  private bfsStartToGoal(
    start: RunnerState,
    goal: GoalConfig,
    obstacleSet: Set<string>,
    rows: number,
    cols: number
  ): Array<{ row: number; col: number; inDir: Direction; outDir: Direction }> {
    return this.bfsSolveAllGoals(start, [goal], obstacleSet, rows, cols);
  }

  private scheduleAutoLaunch(): void {
    if (this.autoLaunchTimer !== null) {
      return;
    }
    WeChatService.vibrateShort('heavy');
    this.setStatus('✨ 满星光路已完美贯通！即刻破空冲关...');

    this.autoLaunchTimer = setTimeout(() => {
      this.autoLaunchTimer = null;
      if (this.runner && this.runner.state === 'IDLE') {
        this.startRunner();
      }
    }, 360);
  }

  private cancelAutoLaunch(): void {
    if (this.autoLaunchTimer !== null) {
      clearTimeout(this.autoLaunchTimer);
      this.autoLaunchTimer = null;
    }
  }

  private updateHeroButtonState(connected: boolean, remainingStars = 0): void {
    if (!this.heroButtonNode) return;
    this.heroButtonNode.active = connected;
    if (connected) {
      if (this.heroButtonLabel) {
        this.heroButtonLabel.string = remainingStars > 0
          ? `🚀 立即冲关 (还可拿${remainingStars}星)`
          : '✨ 满星贯通 · 破空冲关！';
      }
      tween(this.heroButtonNode).stop();
      tween(this.heroButtonNode)
        .to(0.16, { scale: new Vec3(1.05, 1.05, 1) })
        .to(0.16, { scale: new Vec3(1.0, 1.0, 1) })
        .union()
        .repeatForever()
        .start();
    } else {
      tween(this.heroButtonNode).stop();
      this.heroButtonNode.setScale(new Vec3(1.0, 1.0, 1));
    }
  }

  private renderFogOfWar(): void {
    if (!this.boardRoot || !this.boardRoot.isValid || !this.grid) return;

    if (!this.fogRoot || !this.fogRoot.isValid) {
      this.fogRoot = new Node('FogRoot');
      this.fogRoot.layer = Layers.Enum.UI_2D;
      this.fogRoot.setParent(this.boardRoot);
      this.fogRoot.setPosition(new Vec3(0, 0, 22));
    } else {
      this.clearNode(this.fogRoot);
    }
    this.fogNodes.clear();

    // 前 15 关与每日挑战保持 100% 明亮通透全视野，彻底避免黑雾遮挡终点与星核导致挫败流失！
    if (!this.isEndlessMode && (this.isDailyChallenge || this.levelIndex < 15)) {
      return;
    }

    const rows = this.grid.rows;
    const cols = this.grid.cols;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (this.level?.start && this.level.start.row === r && this.level.start.col === c) {
          continue;
        }
        if (this.level?.goals.some((g) => g.row === r && g.col === c)) {
          continue;
        }

        const pos = { row: r, col: c };
        const key = this.key(pos);
        const fogNode = new Node(`Fog_${r}_${c}`);
        fogNode.layer = Layers.Enum.UI_2D;
        fogNode.setParent(this.fogRoot);
        fogNode.setPosition(this.gridToLocal(pos));
        fogNode.addComponent(UITransform).setContentSize(this.tileWidth * 1.04, this.tileHeight * 1.04);

        const g = fogNode.addComponent(Graphics);
        // 轻盈半透星空薄纱（非死黑），保持目标感与画面通透度
        g.fillColor = new Color(28, 56, 108, 92);
        g.roundRect(-this.tileWidth * 0.51, -this.tileHeight * 0.51, this.tileWidth * 1.02, this.tileHeight * 1.02, 16);
        g.fill();

        g.fillColor = new Color(103, 232, 249, 64);
        g.circle(0, 0, 4.5);
        g.fill();

        this.fogNodes.set(key, fogNode);
      }
    }
  }

  private updateFogOfWar(illuminatedSet: Set<string>): void {
    this.fogNodes.forEach((node, key) => {
      if (illuminatedSet.has(key)) {
        if (node.active) {
          tween(node)
            .to(0.24, { scale: new Vec3(1.15, 1.15, 1) })
            .call(() => {
              node.active = false;
            })
            .start();
        }
      }
    });
  }

  private dispelAllFog(): void {
    this.fogNodes.forEach((node) => {
      if (node.active) {
        tween(node)
          .to(0.35, { scale: new Vec3(1.25, 1.25, 1) })
          .call(() => {
            node.active = false;
          })
          .start();
      }
    });
  }

  private playSanctumAwakeningCeremony(goalPos: GridPos): void {
    if (!this.boardRoot) return;

    // 1. 圣所点亮轻柔金辉微晕（克制优雅，不做全屏夸张圆环）
    const shockNode = new Node('AwakeningShockwave');
    shockNode.layer = Layers.Enum.UI_2D;
    shockNode.setParent(this.boardRoot);
    shockNode.setPosition(this.gridToLocal(goalPos).add3f(0, 0, 50));
    const sg = shockNode.addComponent(Graphics);
    sg.strokeColor = new Color(253, 224, 71, 175);
    sg.lineWidth = 2.4;
    sg.circle(0, 0, 26);
    sg.stroke();

    tween(shockNode)
      .to(0.36, { scale: new Vec3(1.85, 1.85, 1) }, { easing: 'quadOut' })
      .call(() => {
        shockNode.destroy();
      })
      .start();

    // 2. 驱散全岛所有暗影迷雾 (Total Fog Evaporation)
    this.dispelAllFog();

    // 3. 浮岛晶石轻微共鸣微弹 (Subtle Island Pulse Wave)
    this.tileNodes.forEach((node, key) => {
      const parts = key.split(':').map(Number);
      const dist = Math.hypot(parts[0] - goalPos.row, parts[1] - goalPos.col);
      const delay = dist * 0.035;
      this.scheduleOnce(() => {
        if (!node || !node.isValid) return;
        tween(node)
          .to(0.10, { scale: new Vec3(1.08, 1.08, 1) }, { easing: 'quadOut' })
          .to(0.14, { scale: new Vec3(1.0, 1.0, 1) }, { easing: 'quadIn' })
          .start();
      }, delay);
    });

    // 4. 浮岛星尘礼花雨 (Stardust Firework Rain)
    const centerLocal = this.gridToLocal(goalPos);
    for (let i = 0; i < 22; i++) {
      const spark = new Node(`Stardust_${i}`);
      spark.layer = Layers.Enum.UI_2D;
      spark.setParent(this.boardRoot);
      spark.setPosition(centerLocal.add3f(0, 0, 40));
      const g = spark.addComponent(Graphics);
      const isGold = i % 2 === 0;
      g.fillColor = this.hex(isGold ? '#FDE047' : '#38BDF8');
      g.circle(0, 0, Math.random() * 4 + 3);
      g.fill();

      const angle = (Math.PI * 2 * i) / 22 + (Math.random() - 0.5) * 0.4;
      const dist = Math.random() * 160 + 90;
      const targetPos = new Vec3(
        centerLocal.x + Math.cos(angle) * dist,
        centerLocal.y + Math.sin(angle) * dist + 40,
        40
      );

      tween(spark)
        .to(0.55 + Math.random() * 0.3, { position: targetPos, scale: new Vec3(0.2, 0.2, 1) }, { easing: 'quadOut' })
        .call(() => spark.destroy())
        .start();
    }

    // 4.5. 圣所生长破空光之神树/灵泉光柱 (Awakened Spire & Life Rebirth)
    const spireNode = new Node('AwakenedSpire');
    spireNode.layer = Layers.Enum.UI_2D;
    spireNode.setParent(this.boardRoot);
    spireNode.setPosition(centerLocal.add3f(0, 0, 45));
    const spg = spireNode.addComponent(Graphics);
    spg.fillColor = this.hex('#00F0FF');
    ((spg.fillColor) as any).a = 180;
    spg.moveTo(-10, 0);
    spg.lineTo(0, 85);
    spg.lineTo(10, 0);
    spg.close();
    spg.fill();

    spg.fillColor = this.hex('#FFFFFF');
    spg.circle(0, 85, 7);
    spg.fill();

    spireNode.setScale(new Vec3(0, 0, 1));
    tween(spireNode)
      .to(0.45, { scale: new Vec3(1.2, 1.2, 1) }, { easing: 'backOut' })
      .to(0.25, { scale: new Vec3(1.0, 1.0, 1) })
      .delay(0.6)
      .to(0.3, { scale: new Vec3(0.1, 0.1, 1) })
      .call(() => spireNode.destroy())
      .start();

    // 浮岛圣所复苏浮空彩标
    const bannerNode = new Node('AwakenBanner');
    bannerNode.layer = Layers.Enum.UI_2D;
    bannerNode.setParent(this.boardRoot);
    bannerNode.setPosition(centerLocal.add3f(0, 65, 60));
    const bLabel = bannerNode.addComponent(Label);
    bLabel.string = '✨ 浮岛圣所已复苏！';
    bLabel.fontSize = 24;
    bLabel.color = this.hex('#FEF08A');
    bannerNode.setScale(new Vec3(0.5, 0.5, 1));
    tween(bannerNode)
      .to(0.3, { scale: new Vec3(1.15, 1.15, 1) }, { easing: 'backOut' })
      .to(0.15, { scale: new Vec3(1.0, 1.0, 1) })
      .delay(0.5)
      .to(0.2, { scale: new Vec3(0.2, 0.2, 1) })
      .call(() => bannerNode.destroy())
      .start();

    // 5. 三段式深沉震感 (Haptic Symphony)
    WeChatService.vibrateShort('heavy');
    this.scheduleOnce(() => WeChatService.vibrateShort('heavy'), 0.12);
    this.scheduleOnce(() => WeChatService.vibrateShort('medium'), 0.26);

    // 6. 天国八音盒空灵大三和弦破空奏响
    CrystalAudioService.playAwakeningChord();

    // 7. 全屏天幕极光绽放
    this.triggerScreenFlash();
  }

  private cancelObstacleDrill(): void {
    if (this.obstacleDrillTimer) {
      this.unschedule(this.obstacleDrillTimer);
      this.obstacleDrillTimer = null;
    }
    this.drillingObstacleKey = null;
  }

  public shatterObstacle(pos: GridPos): void {
    if (!this.grid || !this.boardRoot || !this.level) return;
    const key = this.key(pos);
    if (!this.grid.isObstacle(pos)) return;

    // 1. Audio and Haptics
    CrystalAudioService.playShatterChime();
    WeChatService.vibrateShort('heavy');

    // 2. Clear obstacle state
    this.grid.setObstacle(pos, false);
    if (this.level.obstacles) {
      this.level.obstacles = this.level.obstacles.filter(([r, c]) => !(r === pos.row && c === pos.col));
    }
    this.cancelObstacleDrill();

    // 3. Screen/Island camera shake
    const curBoardPos = this.boardRoot.position.clone();
    tween(this.boardRoot)
      .to(0.03, { position: curBoardPos.clone().add3f(5, -4, 0) })
      .to(0.03, { position: curBoardPos.clone().add3f(-5, 4, 0) })
      .to(0.04, { position: curBoardPos })
      .start();

    // 4. Sparkling diamond shards explosion (16 颗璀璨钻石晶尘多向飞射)
    const center = this.gridToLocal(pos);
    for (let i = 0; i < 16; i++) {
      const shard = new Node(`Shard_${i}`);
      shard.layer = Layers.Enum.UI_2D;
      shard.setParent(this.boardRoot);
      shard.setPosition(center.clone().add3f(0, 0, 35));
      const g = shard.addComponent(Graphics);
      const isCyan = i % 2 === 0;
      g.fillColor = this.hex(isCyan ? '#38BDF8' : '#FDE047');
      // Draw diamond polygon
      g.moveTo(0, 7);
      g.lineTo(6, 0);
      g.lineTo(0, -7);
      g.lineTo(-6, 0);
      g.close();
      g.fill();

      const angle = (Math.PI * 2 * i) / 16 + (Math.random() - 0.5) * 0.5;
      const dist = Math.random() * 95 + 45;
      const targetPos = new Vec3(
        center.x + Math.cos(angle) * dist,
        center.y + Math.sin(angle) * dist,
        35
      );

      tween(shard)
        .to(0.42 + Math.random() * 0.2, { position: targetPos, scale: new Vec3(0.15, 0.15, 1), angle: Math.random() * 360 }, { easing: 'quadOut' })
        .call(() => shard.destroy())
        .start();
    }

    // 5. Floating bonus text
    const toastNode = new Node('ShatterToast');
    toastNode.layer = Layers.Enum.UI_2D;
    toastNode.setParent(this.boardRoot);
    toastNode.setPosition(center.clone().add3f(0, 10, 50));
    const label = toastNode.addComponent(Label);
    label.string = '💥 暗影碎裂 +15💎';
    label.fontSize = 20;
    label.color = this.hex('#FDE047');
    tween(toastNode)
      .to(0.65, { position: center.clone().add3f(0, 55, 50), scale: new Vec3(1.15, 1.15, 1) }, { easing: 'quadOut' })
      .call(() => toastNode.destroy())
      .start();

    // 6. Reward diamonds and update UI
    this.pendingBonusDiamonds += 15;
    this.updateLabels();
    this.setStatus('💥 强光击碎暗蚀晶石！获得 15 晶核，光路彻底贯通！');

    // 7. Redraw this cell as a flagstone
    const cellNode = this.cellNodes.get(key);
    if (cellNode) {
      const g = cellNode.getComponent(Graphics);
      if (g) {
        g.clear();
        const isEven = (pos.row + pos.col) % 2 === 0;
        const topCol = isEven ? this.hex('#153560') : this.hex('#1A4072');
        const strokeCol = isEven ? this.hex('#38BDF8') : this.hex('#60A5FA');
        ((strokeCol as any)).a = 72;
        this.drawTopDownTile(g, topCol, strokeCol, 1.2, this.tileWidth, this.tileHeight, 0, 0, 3);
      }
    }

    // 8. Dispel fog around shattered cell
    const illSet = new Set<string>();
    illSet.add(key);
    for (const d of DIRECTIONS) {
      illSet.add(this.key(move(pos, d)));
    }
    this.updateFogOfWar(illSet);

    // 9. Re-calculate live route preview
    this.updateRoutePreviewLine();
  }

  public activateHammerMode(): void {
    if (!this.grid || this.runner?.state === 'RUNNING') return;
    let hasObstacle = false;
    this.grid.forEachCell((_pos, _tile, obs) => {
      if (obs) hasObstacle = true;
    });
    if (!hasObstacle) {
      WeChatService.showToast('当前棋盘没有可击碎的暗蚀陨石', 'none');
      return;
    }

    if (this.hammerCharges <= 0 && !this.hammerModeActive) {
      AdService.showRewarded('utility_refill').then((res) => {
        if (res.completed) {
          this.hammerCharges += 2;
          this.hammerModeActive = true;
          this.updateLabels();
          WeChatService.showToast('破障神锤 +2！轻点任意暗蚀陨石击碎', 'success');
          this.setStatus('🔨 破障模式已就绪：轻点棋盘上的暗蚀陨石即可击碎！');
        } else {
          WeChatService.showToast(res.error || '观看激励视频可补充 2 次破障次数', 'none');
        }
      });
      return;
    }

    this.hammerModeActive = !this.hammerModeActive;
    WeChatService.vibrateShort('light');
    this.updateLabels();
    if (this.hammerModeActive) {
      this.setStatus('🔨 破障模式开启：轻点任意一块暗蚀陨石即可粉碎它！');
      WeChatService.showToast('请点击想要击碎的陨石', 'none');
    } else {
      this.setStatus('已退出破障模式，轻触水晶继续旋转接光');
    }
  }

  private onBoardTouchStart(event: EventTouch): void {
    if (!this.grid || !this.boardRoot || this.runner?.state === 'RUNNING') return;
    const touch = event.getUILocation();
    const cell = this.uiToGrid(touch.x, touch.y);
    if (cell && this.grid.isValid(cell)) {
      if (this.grid.isObstacle(cell)) {
        if (this.hammerModeActive && this.hammerCharges > 0) {
          this.hammerCharges--;
          this.hammerModeActive = false;
          this.shatterObstacle(cell);
          this.updateLabels();
          return;
        }
        WeChatService.vibrateShort('light');
        const obsNode = this.cellNodes.get(this.key(cell));
        if (obsNode) {
          tween(obsNode)
            .to(0.04, { scale: new Vec3(0.92, 0.92, 1) })
            .to(0.06, { scale: new Vec3(1.04, 1.04, 1) })
            .to(0.05, { scale: new Vec3(1.0, 1.0, 1) })
            .start();
        }
        this.setStatus('🪨 暗蚀陨石不可穿越！可旋转水晶绕路，或点底部【🔨 破障】击碎');
        return;
      }
      this.isGestureDrawing = true;
      this.gesturePath = [cell];
      this.gestureTouchedCells.clear();
      this.gestureTouchedCells.add(this.key(cell));
    }
  }

  private onBoardTouchMove(event: EventTouch): void {
    if (!this.isGestureDrawing || !this.grid || !this.boardRoot || this.runner?.state === 'RUNNING') return;
    const touch = event.getUILocation();
    const curCell = this.uiToGrid(touch.x, touch.y);
    if (!curCell || !this.grid.isValid(curCell) || this.grid.isObstacle(curCell)) return;

    const lastCell = this.gesturePath[this.gesturePath.length - 1];
    if (curCell.row === lastCell.row && curCell.col === lastCell.col) return;

    const stepDir = this.getStepDirection(lastCell, curCell);
    if (!stepDir) return;

    this.gesturePath.push(curCell);
    this.gestureTouchedCells.add(this.key(curCell));

    // Only auto-orient EXISTING rotatable crystals along drag path (no spawning free tiles on empty cells!)
    const lastTile = this.grid.getTile(lastCell);
    if (!lastTile || lastTile.locked) return;
    const tileCfg = resolveTileConfig(lastTile);
    if (!tileCfg.rotatable) return;

    const prevStepCell = this.gesturePath.length >= 3 ? this.gesturePath[this.gesturePath.length - 3] : null;
    const inDir = prevStepCell
      ? this.getStepDirection(prevStepCell, lastCell) || stepDir
      : (this.runner ? this.runner.direction : stepDir);

    const isStraight = inDir === stepDir;
    if (isStraightType(lastTile.type) && isStraight) {
      const targetRot = (inDir === 'left' || inDir === 'right') ? 0 : 1;
      if (lastTile.rotation !== targetRot) {
        this.moveHistory.push({ pos: lastCell, prevRotation: lastTile.rotation, tileType: lastTile.type });
        const updated: TileInstance = { ...lastTile, rotation: targetRot };
        this.grid.setTile(lastCell, updated);
        this.usedMoves++;
        this.renderTile(lastCell, updated);
        CrystalAudioService.playStepChime(this.gesturePath.length);
        WeChatService.vibrateShort('light');
        this.updateLabels();
        this.updateRoutePreviewLine();
      }
    } else if (!isStraightType(lastTile.type) && !isStraight) {
      let targetRot = lastTile.rotation;
      let matched = false;
      for (let r = 0; r < 4; r++) {
        const cfg = resolveTileConfig({ type: lastTile.type, rotation: r });
        if (cfg.routing[inDir] === stepDir) {
          targetRot = r;
          matched = true;
          break;
        }
      }
      if (matched && lastTile.rotation !== targetRot) {
        this.moveHistory.push({ pos: lastCell, prevRotation: lastTile.rotation, tileType: lastTile.type });
        const updated: TileInstance = { ...lastTile, rotation: targetRot };
        this.grid.setTile(lastCell, updated);
        this.usedMoves++;
        this.renderTile(lastCell, updated);
        CrystalAudioService.playStepChime(this.gesturePath.length);
        WeChatService.vibrateShort('light');
        this.updateLabels();
        this.updateRoutePreviewLine();
      }
    }
  }

  private onBoardTouchEnd(): void {
    if (!this.isGestureDrawing) return;
    this.isGestureDrawing = false;

    if (this.gesturePath.length <= 1 && this.gesturePath[0]) {
      this.onPlacedTileTouch(this.gesturePath[0]);
      CrystalAudioService.playRotatePlink();
    } else {
      WeChatService.vibrateShort('medium');
      this.updateRoutePreviewLine();
    }
    this.gesturePath = [];
  }

  private onBoardTouchCancel(): void {
    this.isGestureDrawing = false;
    this.gesturePath = [];
  }

  private renderBoard(): void {
    if (!this.level || !this.grid || !this.boardRoot) {
      return;
    }

    const step = this.tileWidth + (this.tileGap || 10);
    const rawWidth = this.grid.cols * step;
    const rawHeight = this.grid.rows * step;
    const size = view.getVisibleSize();
    const halfH = size.height / 2;

    // 棋盘适度饱满放大（最大宽度 672px，左右各 24px 优雅边距）
    const maxBoardHeight = size.height - 480;
    let sW = 672 / rawWidth;
    let sH = maxBoardHeight / rawHeight;
    let s = Math.min(sW, sH);
    if (s > 1.45) s = 1.45;
    if (this.boardRoot) this.boardRoot.setScale(new Vec3(s, s, 1));
    if (this.previewRoot) this.previewRoot.setScale(new Vec3(s, s, 1));
    if (this.runnerRoot) this.runnerRoot.setScale(new Vec3(s, s, 1));

    // 动态计算顶部导航条与底部状态胶囊之间的可用垂直空间，让棋盘上下留白完全对称均等！
    const tipPillTopY = -halfH + 252;
    let topNavBottomY = halfH - 250;
    if (this.topNavNode) {
      topNavBottomY = this.topNavNode.position.y - 24;
    }
    const availableHeight = topNavBottomY - tipPillTopY;
    const visualBoardHeight = rawHeight * s;
    const totalRemainingGap = Math.max(30, availableHeight - visualBoardHeight);
    // 上下均分剩余空隙，保证棋盘四周留白完全对称平衡！
    const symmetricGap = totalRemainingGap / 2;
    const boardCenterY = Math.round(tipPillTopY + symmetricGap + visualBoardHeight / 2);
    const boardPos = new Vec3(0, boardCenterY, 0);

    if (this.boardRoot) this.boardRoot.setPosition(boardPos);
    if (this.previewRoot) this.previewRoot.setPosition(boardPos);
    if (this.runnerRoot) this.runnerRoot.setPosition(boardPos);

    // 0. 棋盘浮岛基座、倒悬岩层与悬空极光云海 (Floating Board Island Plinth & Cloud Sea - 参考图 3 & 图 4)
    const shadowNode = new Node('IslandShadow');
    shadowNode.layer = Layers.Enum.UI_2D;
    shadowNode.setParent(this.boardRoot!);
    shadowNode.setPosition(new Vec3(0, 0, -5));
    const shadowG = shadowNode.addComponent(Graphics);
    const isRose = this.currentTheme === 1;
    const isGold = this.currentTheme === 2;
    const palette = getUiPalette(this.currentTheme);

    const plinthW = rawWidth + 56;
    const plinthH = rawHeight + 46;
    const halfPW = plinthW * 0.5;
    const halfPH = plinthH * 0.5;

    let bTransform = this.boardRoot.getComponent(UITransform);
    if (!bTransform) {
      bTransform = this.boardRoot.addComponent(UITransform);
    }
    bTransform.setContentSize(plinthW, plinthH);

    this.boardRoot.off(Node.EventType.TOUCH_START);
    this.boardRoot.off(Node.EventType.TOUCH_MOVE);
    this.boardRoot.off(Node.EventType.TOUCH_END);
    this.boardRoot.off(Node.EventType.TOUCH_CANCEL);

    this.boardRoot.on(Node.EventType.TOUCH_START, this.onBoardTouchStart, this);
    this.boardRoot.on(Node.EventType.TOUCH_MOVE, this.onBoardTouchMove, this);
    this.boardRoot.on(Node.EventType.TOUCH_END, this.onBoardTouchEnd, this);
    this.boardRoot.on(Node.EventType.TOUCH_CANCEL, this.onBoardTouchCancel, this);

    // 1. 浮岛底座外围极光云雾光晕 (Surrounding Ethereal Cloud Mist)
    const auraCol = this.hex(isRose ? '#5EEAD4' : (isGold ? '#F59E0B' : '#00F0FF'));
    shadowG.fillColor = new Color(auraCol.r, auraCol.g, auraCol.b, isRose ? 36 : 48);
    shadowG.ellipse(0, -18, halfPW + 50, halfPH + 40);
    shadowG.fill();

    // 2. 浮岛倒悬低多边形山体根基 (Under-Board Inverted Crags)
    const rockBaseDark = this.hex(isGold ? '#1C1917' : (isRose ? '#08162C' : '#061324'));
    const rockBaseMid  = this.hex(isGold ? '#292524' : (isRose ? '#102446' : '#0B1E36'));
    const rockBaseRim  = this.hex(isGold ? '#F59E0B' : (isRose ? '#5EEAD4' : '#22D3EE'));

    // 倒悬山根多边形
    const cragDepth = 48;
    shadowG.fillColor = rockBaseMid;
    shadowG.moveTo(-halfPW + 16, -halfPH);
    shadowG.lineTo(-halfPW * 0.45, -halfPH - cragDepth * 0.7);
    shadowG.lineTo(0, -halfPH - cragDepth);
    shadowG.lineTo(halfPW * 0.45, -halfPH - cragDepth * 0.65);
    shadowG.lineTo(halfPW - 16, -halfPH);
    shadowG.close();
    shadowG.fill();

    // 阴暗切面
    shadowG.fillColor = rockBaseDark;
    shadowG.moveTo(0, -halfPH - cragDepth);
    shadowG.lineTo(halfPW * 0.45, -halfPH - cragDepth * 0.65);
    shadowG.lineTo(halfPW - 16, -halfPH);
    shadowG.lineTo(0, -halfPH);
    shadowG.close();
    shadowG.fill();

    // 山根边缘微光
    shadowG.strokeColor = rockBaseRim;
    ((shadowG.strokeColor) as any).a = 85;
    shadowG.lineWidth = 1.2;
    shadowG.moveTo(-halfPW + 16, -halfPH);
    shadowG.lineTo(0, -halfPH - cragDepth);
    shadowG.lineTo(halfPW - 16, -halfPH);
    shadowG.stroke();

    // 3. 悬挂绿藤与晶莹吊坠 (Corner Vines & Hanging Pendants)
    shadowG.strokeColor = this.hex(isGold ? '#059669' : (isRose ? '#2DD4BF' : '#10B981'));
    shadowG.lineWidth = 2.0;
    shadowG.moveTo(-halfPW + 30, -halfPH);
    shadowG.lineTo(-halfPW + 26, -halfPH - 28);
    shadowG.lineTo(-halfPW + 32, -halfPH - 52);
    shadowG.stroke();
    shadowG.moveTo(halfPW - 30, -halfPH);
    shadowG.lineTo(halfPW - 26, -halfPH - 24);
    shadowG.lineTo(halfPW - 31, -halfPH - 48);
    shadowG.stroke();

    // 4. 浮岛石质底座台面
    const plinthCol = this.hex(isGold ? '#0F3245' : (isRose ? '#10294E' : '#0F274A'));
    shadowG.fillColor = plinthCol;
    shadowG.roundRect(-halfPW, -halfPH, plinthW, plinthH, 20);
    shadowG.fill();

    // 浮岛台座双重精致金属/晶石包边
    shadowG.strokeColor = this.hex(isGold ? '#F59E0B' : (isRose ? '#0EA5E9' : '#2563EB'));
    shadowG.lineWidth = 2.4;
    shadowG.roundRect(-halfPW, -halfPH, plinthW, plinthH, 20);
    shadowG.stroke();

    shadowG.strokeColor = this.hex(isGold ? '#FDE047' : (isRose ? '#5EEAD4' : '#38BDF8'));
    ((shadowG.strokeColor) as any).a = 125;
    shadowG.lineWidth = 1.2;
    shadowG.roundRect(-halfPW + 4, -halfPH + 4, plinthW - 8, plinthH - 8, 17);
    shadowG.stroke();

    this.goalNodes = [];
    this.cellNodes.clear();
    this.grid.forEachCell((pos, _tile, obstacle) => {
      const node = new Node(`Cell_${pos.row}_${pos.col}`);
      this.cellNodes.set(this.key(pos), node);
      node.layer = Layers.Enum.UI_2D;
      node.setParent(this.boardRoot!);
      node.setPosition(this.gridToLocal(pos));
      node.addComponent(UITransform).setContentSize(this.tileWidth, this.tileHeight);
      const graphics = node.addComponent(Graphics);
      if (obstacle) {
        // 暗蚀紫晶陨石：多面折光紫晶块 + 珊瑚红裂痕脉络，告别死板暗红方块
        this.drawTopDownTile(graphics, this.hex('#1B1330'), this.hex('#FB7185'), 1.3, this.tileWidth, this.tileHeight, 0, 0, 3);
        graphics.fillColor = new Color(190, 24, 93, 95);
        graphics.moveTo(0, 30);
        graphics.lineTo(26, 12);
        graphics.lineTo(20, -24);
        graphics.lineTo(-18, -26);
        graphics.lineTo(-27, 8);
        graphics.close();
        graphics.fill();
        graphics.strokeColor = new Color(251, 113, 133, 210);
        graphics.lineWidth = 1.8;
        graphics.stroke();
        graphics.strokeColor = this.hex('#FDA4AF');
        graphics.lineWidth = 1.6;
        graphics.moveTo(-10, 14);
        graphics.lineTo(-1, 1);
        graphics.lineTo(11, 8);
        graphics.moveTo(-1, 1);
        graphics.lineTo(8, -14);
        graphics.stroke();
      } else {
        const isEven = (pos.row + pos.col) % 2 === 0;
        // 通透清亮琉璃底格（柔和冰蓝渐变质感，不喧宾夺主）
        let topCol = isEven ? this.hex('#153560') : this.hex('#1A4072');
        let strokeCol = isEven ? this.hex('#38BDF8') : this.hex('#60A5FA');
        ((strokeCol as any)).a = 72;

        if (isRose) {
          topCol = isEven ? this.hex('#143563') : this.hex('#194277');
          strokeCol = isEven ? this.hex('#5EEAD4') : this.hex('#93C5FD');
          ((strokeCol as any)).a = 78;
        } else if (isGold) {
          topCol = isEven ? this.hex('#144157') : this.hex('#194E68');
          strokeCol = isEven ? this.hex('#2DD4BF') : this.hex('#FBBF24');
          ((strokeCol as any)).a = 78;
        }

        this.drawTopDownTile(graphics, topCol, strokeCol, 1.2, this.tileWidth, this.tileHeight, 0, 0, 3);
        const unstable = this.level?.unstableCells?.find((cell) => cell.row === pos.row && cell.col === pos.col && cell.collapseAfterSteps >= 0);
        if (unstable) {
          graphics.fillColor = new Color(244, 63, 94, 52);
          graphics.roundRect(-this.tileWidth / 2 + 8, -this.tileHeight / 2 + 8, this.tileWidth - 16, this.tileHeight - 16, 16);
          graphics.fill();
          graphics.strokeColor = this.hex('#F43F5E');
          graphics.lineWidth = 3.6;
          graphics.circle(0, 0, 28);
          graphics.stroke();
          graphics.moveTo(-20, 7);
          graphics.lineTo(-7, -4);
          graphics.lineTo(4, 6);
          graphics.lineTo(16, -9);
          graphics.stroke();
          this.createCellMarkerLabel(node, 'RiskText', '危', '#FFFFFF', '#F43F5E', new Vec3(0, -1, 2));
        }
      }
    });

    // 3. Start Point Emerald Solar Emitter (起点太阳发射源：高对比翠绿光圈 + 发射方向箭头 + 醒目「起点」标识)
    if (this.level.start) {
      const markersParent = this.getMarkersParent();
      const startNode = new Node('StartAura');
      startNode.layer = Layers.Enum.UI_2D;
      startNode.setParent(markersParent);
      startNode.setPosition(this.gridToLocal(this.level.start).add3f(0, 0, 4));
      const sg = startNode.addComponent(Graphics);

      // Emerald solar pulse halo
      sg.fillColor = new Color(16, 185, 129, 78);
      sg.circle(0, 0, 40);
      sg.fill();
      sg.strokeColor = this.hex('#34D399');
      sg.lineWidth = 3.0;
      sg.circle(0, 0, 34);
      sg.stroke();

      // Core orb
      sg.fillColor = this.hex('#10B981');
      sg.circle(0, 0, 21);
      sg.fill();
      sg.fillColor = this.hex('#FFFFFF');
      sg.circle(0, 0, 10);
      sg.fill();

      // Bold directional launch arrow pointing along start.direction
      const dirVec = this.directionPoint(this.level.start.direction, 1);
      const tipX = dirVec.x * 36;
      const tipY = dirVec.y * 36;
      const baseX = dirVec.x * 16;
      const baseY = dirVec.y * 16;
      const perpX = -dirVec.y * 11;
      const perpY = dirVec.x * 11;
      sg.fillColor = this.hex('#FDE047');
      sg.moveTo(tipX, tipY);
      sg.lineTo(baseX + perpX, baseY + perpY);
      sg.lineTo(baseX - perpX, baseY - perpY);
      sg.close();
      sg.fill();
      sg.strokeColor = this.hex('#064E3B');
      sg.lineWidth = 1.6;
      sg.stroke();

      this.createCellMarkerLabel(startNode, 'StartText', '起点', '#FFFFFF', '#059669', new Vec3(0, -30, 1));
    }

    for (const goal of this.level.goals) {
      this.drawGoal(goal);
    }

    for (const bonusCell of this.getActiveBonusCells()) {
      const markersParent = this.getMarkersParent();
      const bonusNode = new Node('BonusCrystal');
      bonusNode.layer = Layers.Enum.UI_2D;
      bonusNode.setParent(markersParent);
      bonusNode.setPosition(this.gridToLocal(bonusCell).add3f(0, 0, 6));
      let t = bonusNode.getComponent(UITransform);
      if (!t) t = bonusNode.addComponent(UITransform);
      t.setContentSize(88, 88);
      const bg = bonusNode.addComponent(Graphics);
      // Soft translucent golden halo around cell so underlying conduits remain clear
      bg.strokeColor = new Color(253, 224, 71, 195);
      bg.lineWidth = 2.4;
      bg.circle(0, 0, 34);
      bg.stroke();
      bg.fillColor = new Color(253, 224, 71, 26);
      bg.circle(0, 0, 34);
      bg.fill();

      // Compact micro-badge neatly tucked inside top-right corner of the cell
      const bx = 20;
      const by = 26;
      bg.fillColor = new Color(217, 119, 6, 235);
      bg.roundRect(bx - 20, by - 9, 40, 18, 9);
      bg.fill();
      bg.strokeColor = this.hex('#FEF08A');
      bg.lineWidth = 1.4;
      bg.stroke();

      const labelNode = new Node('Text');
      labelNode.layer = Layers.Enum.UI_2D;
      labelNode.setParent(bonusNode);
      labelNode.setPosition(new Vec3(bx, by + 1, 1));
      let lt = labelNode.getComponent(UITransform);
      if (!lt) lt = labelNode.addComponent(UITransform);
      lt.setContentSize(40, 18);
      const label = labelNode.addComponent(Label);
      label.string = '★+30';
      label.fontSize = 12;
      label.color = this.hex('#FFFFFF');
      label.horizontalAlign = Label.HorizontalAlign.CENTER;
      label.verticalAlign = Label.VerticalAlign.CENTER;

      if (!this.powerSaveMode) {
        tween(bonusNode)
          .to(0.8, { scale: new Vec3(1.08, 1.08, 1) }, { easing: 'sineInOut' })
          .to(0.8, { scale: new Vec3(1, 1, 1) }, { easing: 'sineInOut' })
          .union()
          .repeatForever()
          .start();
      }

      if (!this.bonusNode) {
        this.bonusNode = bonusNode;
      }
      this.starCoreNodes.set(this.key(bonusCell), bonusNode);
    }
  }

  private getActiveBonusCells(): GridPos[] {
    const configured = this.level?.starCores && this.level.starCores.length > 0
      ? this.level.starCores
      : (this.bonusCell ? [this.bonusCell] : []);
    return configured.filter((cell) => !this.collectedStarCoreKeys.has(this.key(cell)));
  }

  private drawRouteHintLayer(): void {
    if (!this.level || !this.boardRoot) {
      return;
    }
    const routeHints = this.getVisibleRouteHints();
    if (!routeHints.safe?.length && !routeHints.reward?.length && !routeHints.risk?.length) {
      return;
    }
    const hintRoot = new Node('RouteChoiceHints');
    hintRoot.layer = Layers.Enum.UI_2D;
    hintRoot.setParent(this.boardRoot);
    hintRoot.setPosition(new Vec3(0, 0, 4));
    this.routeHintNode = hintRoot;
    const g = hintRoot.addComponent(Graphics);
    this.drawHintPath(g, routeHints.safe ?? [], '#22D3EE', '稳');
    this.drawHintPath(g, routeHints.reward ?? [], '#FDE047', '奖');
    for (const risk of routeHints.risk ?? []) {
      const p = this.gridToLocal(risk);
      g.strokeColor = this.hex('#FF3B30');
      g.lineWidth = 4;
      g.circle(p.x, p.y, 30);
      g.stroke();
    }
  }

  private showRouteHintLayerTemporarily(duration = 7): void {
    if (this.routeHintNode) {
      this.routeHintNode.destroy();
      this.routeHintNode = null;
    }
    this.drawRouteHintLayer();
    const current = this.routeHintNode;
    if (!current) return;
    this.scheduleOnce(() => {
      if (this.routeHintNode === current) {
        current.destroy();
        this.routeHintNode = null;
      }
    }, duration);
  }

  private getVisibleRouteHints(): { safe?: GridPos[]; reward?: GridPos[]; risk?: GridPos[] } {
    if (!this.level) {
      return {};
    }
    if (this.level.routeHints) {
      return this.level.routeHints;
    }

    const safe = this.level.goals[0] ? this.findRouteHintPath(this.level.start, this.level.goals[0]) : [];
    const activeStars = this.getActiveBonusCells();
    let reward: GridPos[] = [];
    if (activeStars.length > 0 && this.level.goals[0]) {
      const rewardTargets = [...activeStars.slice(0, 2), this.level.goals[0]];
      let cursor: GridPos = this.level.start;
      for (const target of rewardTargets) {
        const segment = this.findRouteHintPath(cursor, target);
        if (segment.length === 0) {
          reward = [];
          break;
        }
        reward = reward.length > 0 ? reward.concat(segment.slice(1)) : segment;
        cursor = target;
      }
    }

    return {
      safe,
      reward,
      risk: this.level.unstableCells?.filter((cell) => cell.collapseAfterSteps >= 0),
    };
  }

  private findRouteHintPath(from: GridPos, to: GridPos): GridPos[] {
    if (!this.level) {
      return [];
    }
    const rows = this.level.gridSize[0];
    const cols = this.level.gridSize[1];
    const obstacleKeys = new Set(this.level.obstacles.map(([r, c]) => `${r},${c}`));
    const startKey = `${from.row},${from.col}`;
    const targetKey = `${to.row},${to.col}`;
    const queue: GridPos[] = [{ row: from.row, col: from.col }];
    const parent = new Map<string, string>();
    const seen = new Set<string>([startKey]);
    const dirs = [
      { row: 0, col: 1 },
      { row: 1, col: 0 },
      { row: -1, col: 0 },
      { row: 0, col: -1 },
    ];

    while (queue.length > 0) {
      const cur = queue.shift()!;
      const curKey = `${cur.row},${cur.col}`;
      if (curKey === targetKey) {
        break;
      }
      for (const d of dirs) {
        const next = { row: cur.row + d.row, col: cur.col + d.col };
        const key = `${next.row},${next.col}`;
        if (next.row < 0 || next.row >= rows || next.col < 0 || next.col >= cols || seen.has(key)) {
          continue;
        }
        if (obstacleKeys.has(key) && key !== targetKey) {
          continue;
        }
        seen.add(key);
        parent.set(key, curKey);
        queue.push(next);
      }
    }

    if (!seen.has(targetKey)) {
      return [];
    }
    const path: GridPos[] = [];
    let key = targetKey;
    while (key) {
      const [row, col] = key.split(',').map((value) => parseInt(value, 10));
      path.push({ row, col });
      if (key === startKey) {
        break;
      }
      key = parent.get(key) || '';
    }
    return path.reverse();
  }

  private drawHintPath(g: Graphics, path: GridPos[], colorHex: string, marker: string): void {
    if (path.length === 0) {
      return;
    }
    const col = this.hex(colorHex);
    const glow = new Color(col.r, col.g, col.b, 74);
    g.strokeColor = glow;
    g.lineWidth = 18;
    const first = this.gridToLocal(path[0]);
    g.moveTo(first.x, first.y);
    for (const cell of path.slice(1)) {
      const point = this.gridToLocal(cell);
      g.lineTo(point.x, point.y);
    }
    g.stroke();

    g.strokeColor = new Color(col.r, col.g, col.b, 180);
    g.lineWidth = 5;
    g.moveTo(first.x, first.y);
    for (const cell of path.slice(1)) {
      const point = this.gridToLocal(cell);
      g.lineTo(point.x, point.y);
    }
    g.stroke();

    const labelCell = path[Math.min(1, path.length - 1)];
    const labelPos = this.gridToLocal(labelCell);
    const labelNode = new Node(`RouteHint_${marker}`);
    labelNode.layer = Layers.Enum.UI_2D;
    labelNode.setParent(this.boardRoot!);
    labelNode.setPosition(labelPos.add3f(0, 26, 7));
    this.createCellMarkerLabel(labelNode, 'Label', marker, marker === '稳' ? '#082F49' : '#451A03', colorHex, new Vec3(0, 0, 0));
  }

  private getMarkersParent(): Node {
    if (!this.boardRoot) {
      return this.node;
    }
    if (!this.markersRoot || !this.markersRoot.isValid) {
      this.markersRoot = new Node('BoardMarkers');
      this.markersRoot.layer = Layers.Enum.UI_2D;
      this.markersRoot.setParent(this.boardRoot);
      this.markersRoot.setPosition(new Vec3(0, 0, 12));
    }
    this.markersRoot.setSiblingIndex(Math.max(0, this.boardRoot.children.length - 1));
    return this.markersRoot;
  }

  private createCellMarkerLabel(parent: Node, name: string, text: string, textHex: string, bgHex: string, pos: Vec3): void {
    const node = new Node(name);
    node.layer = Layers.Enum.UI_2D;
    node.setParent(parent);
    node.setPosition(pos);
    node.addComponent(UITransform).setContentSize(44, 20);
    const g = node.addComponent(Graphics);
    const bgCol = this.hex(bgHex);
    ((bgCol as any)).a = 230;
    g.fillColor = bgCol;
    g.roundRect(-22, -10, 44, 20, 10);
    g.fill();
    g.strokeColor = new Color(255, 255, 255, 210);
    g.lineWidth = 1.4;
    g.stroke();

    // Label MUST live on a separate child Node (Cocos 3.8 only allows one UIRenderer per Node!)
    const textNode = new Node('Text');
    textNode.layer = Layers.Enum.UI_2D;
    textNode.setParent(node);
    textNode.setPosition(new Vec3(0, 1, 0));
    textNode.addComponent(UITransform).setContentSize(42, 18);
    const label = textNode.addComponent(Label);
    label.string = text;
    label.fontSize = 13;
    label.color = this.hex(textHex);
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
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
    if (this.markersRoot && this.markersRoot.isValid && this.boardRoot) {
      this.markersRoot.setSiblingIndex(Math.max(0, this.boardRoot.children.length - 1));
    }
  }

  private renderTile(pos: GridPos, tile: TileInstance): void {
    if (!this.boardRoot) {
      return;
    }

    const key = this.key(pos);
    this.tileNodes.get(key)?.destroy();

    const isLit = this.illuminatedCellKeys.has(key);
    const node = new Node(`Tile_${pos.row}_${pos.col}_${tile.type}`);
    node.layer = Layers.Enum.UI_2D;
    node.setParent(this.boardRoot);
    node.setPosition(this.gridToLocal(pos).add3f(0, 0, 1));
    node.addComponent(UITransform).setContentSize(this.tileWidth, this.tileHeight);
    const graphics = node.addComponent(Graphics);

    // Clean Frosted Crystal Prism Aesthetic:
    // - Unlit tiles: airy translucent ice-blue glass over sapphire floor (dimmed softly near completion)
    // - Lit tiles: luminous aurora turquoise-gold crystal glow
    // - Locked anchor bridges: frosted pearl-silver bezel with subtle corner pins
    const isLocked = !!tile.locked;
    const isSkill = !!resolveTileConfig(tile).skill;
    const faded = this.boardDimMode && !isLit && !isLocked && !isSkill;
    const housingCol = isLit
      ? this.hex('#0F5270')
      : (isLocked
        ? this.hex('#214E7D')
        : (tile.type === 'curve' ? this.hex('#18486B') : (tile.type === 'cross' ? this.hex('#223E78') : this.hex('#1B487A'))));
    ((housingCol as any)).a = isLit ? 225 : (isLocked ? 210 : (faded ? 56 : 145));

    const rimCol = isLit
      ? this.hex('#FDE047')
      : (isLocked ? this.hex('#E2E8F0') : this.tileColor(tile.type));
    if (!isLit && !isLocked) {
      ((rimCol as any)).a = faded ? 48 : 130;
    }

    if (isLit) {
      graphics.fillColor = new Color(253, 224, 71, 56);
      graphics.roundRect(-this.tileWidth * 0.47, -this.tileHeight * 0.47, this.tileWidth * 0.94, this.tileHeight * 0.94, 22);
      graphics.fill();
    }

    this.drawDiamond(graphics, housingCol, rimCol, isLit ? 2.4 : (isLocked ? 2.0 : 1.3));
    this.drawTileArrow(graphics, tile, 0, 0.88, 0, 44, isLit, !isLit, faded);
    this.drawSkillBadge(graphics, tile.type, 0, 0);

    if (isLocked) {
      // Subtle pearl-silver corner rivets + small pin jewel in top-left corner
      const rivetOffset = this.tileWidth * 0.33;
      graphics.fillColor = this.hex(isLit ? '#FDE047' : '#E2E8F0');
      graphics.circle(-rivetOffset, rivetOffset, 2.4);
      graphics.circle(rivetOffset, rivetOffset, 2.4);
      graphics.circle(-rivetOffset, -rivetOffset, 2.4);
      graphics.circle(rivetOffset, -rivetOffset, 2.4);
      graphics.fill();
      graphics.fillColor = new Color(15, 23, 42, 200);
      graphics.circle(-this.tileWidth * 0.28, this.tileHeight * 0.28, 7.5);
      graphics.fill();
      graphics.strokeColor = this.hex(isLit ? '#FDE047' : '#BAE6FD');
      graphics.lineWidth = 1.5;
      graphics.circle(-this.tileWidth * 0.28, this.tileHeight * 0.28, 7.5);
      graphics.stroke();
      graphics.fillColor = this.hex(isLit ? '#FDE047' : '#FFFFFF');
      graphics.circle(-this.tileWidth * 0.28, this.tileHeight * 0.28, 2.5);
      graphics.fill();
    }
    this.tileNodes.set(key, node);

    if (this.markersRoot && this.markersRoot.isValid) {
      this.markersRoot.setSiblingIndex(Math.max(0, this.boardRoot.children.length - 1));
    }
  }

  private drawGoal(goal: GoalConfig): void {
    if (!this.boardRoot) {
      return;
    }
    const markersParent = this.getMarkersParent();
    const node = new Node(`Goal_${goal.row}_${goal.col}`);
    node.layer = Layers.Enum.UI_2D;
    node.setParent(markersParent);
    node.setPosition(this.gridToLocal(goal).add3f(0, 0, 5));
    node.addComponent(UITransform).setContentSize(this.tileWidth * 0.95, this.tileHeight * 0.95);
    const graphics = node.addComponent(Graphics);

    // 暖金-珊瑚橙强语义终点圣所：与青蓝水晶棋盘形成鲜明冷暖对比，一眼锁定终点！
    const portalHex = goal.color === 'red'
      ? '#FB7185'
      : (goal.color === 'blue' ? '#38BDF8' : '#F59E0B');
    const portalCol = this.hex(portalHex);
    const shrineBaseW = this.tileWidth * 0.92;
    const shrineBaseH = this.tileHeight * 0.92;

    graphics.fillColor = new Color(portalCol.r, portalCol.g, portalCol.b, 82);
    graphics.roundRect(-shrineBaseW * 0.5, -shrineBaseH * 0.5, shrineBaseW, shrineBaseH, 22);
    graphics.fill();
    graphics.strokeColor = this.hex('#FEF08A');
    graphics.lineWidth = 2.8;
    graphics.roundRect(-shrineBaseW * 0.5, -shrineBaseH * 0.5, shrineBaseW, shrineBaseH, 22);
    graphics.stroke();

    // 2. 外层暖金共鸣双环
    graphics.fillColor = new Color(253, 224, 71, 60);
    graphics.circle(0, 0, 38);
    graphics.fill();
    graphics.strokeColor = this.hex('#FDE047');
    graphics.lineWidth = 2.8;
    graphics.circle(0, 0, 31);
    graphics.stroke();

    // 3. 圣所王冠星钻核心
    graphics.fillColor = this.hex('#FDE047');
    graphics.moveTo(0, 20);
    graphics.lineTo(-14, 0);
    graphics.lineTo(0, -20);
    graphics.lineTo(14, 0);
    graphics.close();
    graphics.fill();

    graphics.strokeColor = this.hex('#FFFFFF');
    graphics.lineWidth = 2.0;
    graphics.stroke();

    graphics.fillColor = this.hex('#FFFFFF');
    graphics.circle(0, 0, 6);
    graphics.fill();

    const badgeBg = goal.color === 'red' ? '#E11D48' : (goal.color === 'blue' ? '#0284C7' : '#D97706');
    this.createCellMarkerLabel(node, 'GoalText', goal.required ? '灯塔' : '终点', '#FFFFFF', badgeBg, new Vec3(0, -30, 1));
    this.goalNodes.push(node);
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
    if (totalSlots <= 2) {
      this.cardWidth = 184;
      this.cardHeight = 154;
    } else if (totalSlots <= 3) {
      this.cardWidth = 170;
      this.cardHeight = 150;
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
      const cardRotation = isSelected ? this.selectedCardRotation : 0;
      this.drawTileArrow(graphics, { type, rotation: cardRotation }, 14 * (this.cardHeight / 160), arrowScale, 0, 24);
      this.drawSkillBadge(graphics, type, 0, 14 * (this.cardHeight / 160));

      const labelNode = new Node('Name');
      labelNode.layer = Layers.Enum.UI_2D;
      labelNode.setParent(card);
      labelNode.setPosition(new Vec3(0, -this.cardHeight / 2 + 19, 1));
      labelNode.addComponent(UITransform).setContentSize(this.cardWidth - 6, 28);
      const label = labelNode.addComponent(Label);
      label.string = getTileDisplayName(type);
      label.fontSize = Math.max(18, Math.floor((this.cardWidth / 196) * 23));
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
      const palette = getUiPalette(this.currentTheme);
      pg.fillColor = this.hex(palette.panelSoft);
      ((pg.fillColor) as any).a = 218;
      pg.roundRect(-this.cardWidth / 2, -this.cardHeight / 2, this.cardWidth, this.cardHeight, 18);
      pg.fill();
      pg.fillColor = new Color(255, 255, 255, 34);
      pg.roundRect(-this.cardWidth / 2 + 7, this.cardHeight / 2 - 15, this.cardWidth - 14, 8, 4);
      pg.fill();
      pg.strokeColor = this.hex(palette.cyan);
      ((pg.strokeColor) as any).a = 210;
      pg.lineWidth = 2.0;
      pg.roundRect(-this.cardWidth / 2, -this.cardHeight / 2, this.cardWidth, this.cardHeight, 18);
      pg.stroke();
      pg.strokeColor = new Color(255, 255, 255, 190);
      pg.lineWidth = 4.0;
      const plusArm = Math.min(22, Math.floor(this.cardWidth * 0.16));
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
    const minDeckW = slotCount <= 2 ? 520 : 390;
    const deckW = Math.min(692, Math.max(minDeckW, contentWidth + 104));
    const deckH = 176;
    const palette = getUiPalette(this.currentTheme);
    const transform = g.node.getComponent(UITransform);
    transform?.setContentSize(deckW, deckH);

    g.clear();
    g.fillColor = this.hex(palette.panel);
    ((g.fillColor) as any).a = 150;
    g.roundRect(-deckW / 2, -deckH / 2, deckW, deckH, 28);
    g.fill();
    g.fillColor = this.hex(palette.blue);
    ((g.fillColor) as any).a = 18;
    g.roundRect(-deckW / 2 + 8, -deckH / 2 + 8, deckW - 16, deckH - 16, 22);
    g.fill();
    g.fillColor = new Color(255, 255, 255, 24);
    g.roundRect(-deckW / 2 + 18, deckH / 2 - 18, deckW - 36, 8, 4);
    g.fill();
    g.strokeColor = this.hex(palette.cyan);
    ((g.strokeColor) as any).a = 190;
    g.lineWidth = 2.2;
    g.roundRect(-deckW / 2, -deckH / 2, deckW, deckH, 28);
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
          AdService.showRewarded('utility_refill').then((adRes) => {
            if (adRes.completed && this.cardSystem) {
              this.fourthSlotUnlocked = true;
              this.hand = this.cardSystem.unlockFourthSlot();
              this.renderCards();
              WeChatService.showToast('成功解锁第四手牌槽位！', 'success');
              this.setStatus('★ 已看视频成功，本局已解锁第四手牌槽位，极大地降低卡手概率！');
            } else if (!adRes.completed) {
              WeChatService.showToast(adRes.error || '观看完成后解锁第四槽位', 'none');
            }
          });
        }
      }
    });
  }

  private onCardTouchStart(event: EventTouch, index: number): void {
    this.closeRadialDial();
    this.hasMovedDuringDrag = false;
    const type = this.hand[index];
    this.dragCardIndex = index;
    this.dragTile = createTile(type);
    this.hoverCell = null;
    if (this.runner?.state === 'RUNNING' && this.currentBulletTime > 0) {
      ProfileManager.recordBulletTimeUse();
      AnalyticsService.track('bullet_time_use', { levelId: this.level?.id ?? 0, remaining: this.currentBulletTime });
    }
    director.getScheduler().setTimeScale(0.45);
    if (this.levelIndex <= 1) {
      this.setStatus('💡 拖拽放置（悬停自适应朝向）；轻点地砖可反向旋转！');
    } else {
      this.setStatus('拖到地图上接通光路；轻点地砖或手牌可反向切换。');
    }

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
    if (!this.hoverCell || this.hoverCell.row !== cell?.row || this.hoverCell.col !== cell?.col) {
      this.hoverCell = cell;
      if (cell && this.canPlace(cell)) {
        // P1: 动态自适应朝向 + 实时光流计算 (所见即所得)
        const smartTile = this.getBestTileOrientation(cell, this.dragTile);
        if (smartTile.rotation !== this.dragTile.rotation) {
          this.dragTile = smartTile;
          this.refreshDragGhost();
        }
      }
      this.renderPreview(cell, this.dragTile);
    }
  }

  private onCardTouchEnd(event: EventTouch): void {
    this.handleCardDrop(event);
  }

  private onCardTouchCancel(event: EventTouch): void {
    this.handleCardDrop(event);
  }

  private handleCardDrop(event: EventTouch): void {
    try {
      if (!this.dragTile || !this.grid || !this.level || !this.cardSystem) {
        return;
      }

      if (!this.hasMovedDuringDrag) {
        this.selectCard(this.dragCardIndex);
        return;
      }

      const pos = event.getUILocation();
      const cell = this.uiToGrid(pos.x, pos.y);
      if (cell && this.canPlace(cell)) {
        // P0: 确保落子采用最佳智能朝向
        this.dragTile = this.getBestTileOrientation(cell, this.dragTile);
        this.placeTileAt(cell, this.dragTile, this.dragCardIndex);
      } else {
        WeChatService.vibrateShort('heavy');
        this.setStatus('这里不能放置');
      }
    } catch (error) {
      console.error('[GameRoot] Card drop failed:', error);
      this.setStatus('本次拖拽出现异常，已自动恢复操作状态。');
    } finally {
      this.endDrag();
      this.updateLabels();
      this.updateRoutePreviewLine();
    }
  }

  public refreshDragGhost(): void {
    if (!this.dragNode || !this.dragTile) {
      return;
    }
    const graphics = this.dragNode.getComponent(Graphics);
    if (!graphics) {
      return;
    }
    graphics.clear();
    this.drawDiamond(graphics, this.tileColor(this.dragTile.type), this.hex('#FFFFFF'), 3);
    this.drawTileArrow(graphics, this.dragTile, 0, 0.86, 0, 44);
  }

  public setSelectedPlacedPos(pos: GridPos | null): void {
    this.selectedPlacedPos = pos ? { ...pos } : null;
    if (this.selectedPlacedHighlightNode) {
      this.selectedPlacedHighlightNode.destroy();
      this.selectedPlacedHighlightNode = null;
    }
    if (!pos || !this.boardRoot) {
      return;
    }
    const node = new Node(`SelectedHighlight_${pos.row}_${pos.col}`);
    node.layer = Layers.Enum.UI_2D;
    node.setParent(this.boardRoot);
    node.setPosition(this.gridToLocal(pos).add3f(0, 0, 8));
    node.addComponent(UITransform).setContentSize(this.tileWidth, this.tileHeight);
    const graphics = node.addComponent(Graphics);

    const w = this.tileWidth * 0.94;
    const h = this.tileHeight * 0.94;
    const halfW = w / 2;
    const halfH = h / 2;

    // Gentle luminous halo instead of heavy wireframe brackets
    graphics.fillColor = new Color(103, 232, 249, 26);
    graphics.roundRect(-halfW, -halfH, w, h, 20);
    graphics.fill();

    graphics.strokeColor = new Color(125, 211, 252, 165);
    graphics.lineWidth = 2.0;
    graphics.roundRect(-halfW, -halfH, w, h, 20);
    graphics.stroke();
    graphics.stroke();

    if (!this.powerSaveMode) {
      tween(node)
        .to(0.7, { scale: new Vec3(1.06, 1.06, 1) }, { easing: 'sineInOut' })
        .to(0.7, { scale: new Vec3(1.0, 1.0, 1) }, { easing: 'sineInOut' })
        .union()
        .repeatForever()
        .start();
    }
    this.selectedPlacedHighlightNode = node;
  }

  private pulseRotateButton(sourceNode?: Node): void {
    const targets = sourceNode
      ? [sourceNode]
      : [this.leftRotateButtonNode, this.rightRotateButtonNode, this.rotateButtonNode].filter(Boolean) as Node[];
    targets.forEach((target) => {
      tween(target).stop();
      tween(target)
        .to(0.08, { scale: new Vec3(1.15, 1.15, 1) }, { easing: 'quadOut' })
        .to(0.12, { scale: new Vec3(1.0, 1.0, 1) }, { easing: 'quadIn' })
        .start();
    });
  }

  public closeRadialDial(): void {
    if (this.radialDialNode) {
      this.radialDialNode.destroy();
      this.radialDialNode = null;
    }
    if (this.boardRoot) {
      for (let i = this.boardRoot.children.length - 1; i >= 0; i--) {
        const child = this.boardRoot.children[i];
        if (child.name.startsWith('RadialDial_')) {
          child.destroy();
        }
      }
    }
  }

  public getIncomingLightDirection(pos: GridPos): Direction | null {
    if (!this.grid || !this.runner || !this.level) {
      return null;
    }

    let current: GridPos = { row: this.runner.row, col: this.runner.col };
    let direction = this.runner.direction;
    const maxSteps = this.grid.rows * this.grid.cols * 2;
    const visited = new Set<string>();

    for (let step = 0; step < maxSteps; step++) {
      const next = move(current, direction);
      if (!this.grid.isValid(next) || this.grid.isObstacle(next)) {
        break;
      }

      if (next.row === pos.row && next.col === pos.col) {
        return direction;
      }

      const tile = this.grid.getTile(next);
      if (!tile) {
        break;
      }

      const stateKey = `${posKey(next)}:${direction}`;
      if (visited.has(stateKey)) {
        break;
      }
      visited.add(stateKey);

      const config = resolveTileConfig(tile);
      const out = config.routing[direction];
      if (!out || out === 'dead') {
        break;
      }

      current = next;
      direction = out;

      if (config.jumpDistance && config.jumpDistance > 0) {
        for (let i = 0; i < config.jumpDistance; i++) {
          const landing = move(current, direction);
          if (!this.grid.isValid(landing) || this.grid.isObstacle(landing)) {
            break;
          }
          if (landing.row === pos.row && landing.col === pos.col) {
            return direction;
          }
          current = landing;
        }
      }
    }

    // 备用：若光束尚未直接照到 pos，检测四向邻居是否有朝向 pos 的出射光
    const neighbors: Array<{ dir: Direction; r: number; c: number }> = [
      { dir: 'right', r: pos.row, c: pos.col - 1 },
      { dir: 'left', r: pos.row, c: pos.col + 1 },
      { dir: 'down', r: pos.row - 1, c: pos.col },
      { dir: 'up', r: pos.row + 1, c: pos.col },
    ];
    for (const n of neighbors) {
      if (n.r === this.runner.row && n.c === this.runner.col && this.runner.direction === n.dir) {
        return n.dir;
      }
      if (this.grid.isValid({ row: n.r, col: n.c })) {
        const nTile = this.grid.getTile({ row: n.r, col: n.c });
        if (nTile) {
          const nCfg = resolveTileConfig(nTile);
          for (const inD of Object.keys(nCfg.routing) as Direction[]) {
            if (nCfg.routing[inD] === n.dir) {
              return n.dir;
            }
          }
        }
      }
    }

    return null;
  }

  public getBestTileOrientation(pos: GridPos, tile: TileInstance): TileInstance {
    const config = getBaseTileConfig(tile.type);
    if (!config.rotatable) {
      return tile;
    }

    const incomingDir = this.getIncomingLightDirection(pos);
    if (!incomingDir) {
      // 智能推测：若光束尚未直接照到 pos，检测其与起点/Runner及目标的相对几何位置
      const targetGoal = this.level?.goals.find((g) => !g.lit) || this.level?.goals[0];
      const runnerPos = this.runner ? { row: this.runner.row, col: this.runner.col } : null;

      if (isStraightType(tile.type)) {
        if (runnerPos && runnerPos.row === pos.row) return { ...tile, rotation: 0 };
        if (targetGoal && targetGoal.row === pos.row) return { ...tile, rotation: 0 };
        if (runnerPos && runnerPos.col === pos.col) return { ...tile, rotation: 1 };
        if (targetGoal && targetGoal.col === pos.col) return { ...tile, rotation: 1 };
        return { ...tile, rotation: 0 };
      }

      if (isCurveType(tile.type) && runnerPos && targetGoal) {
        // 象限几何导向：根据 runner 与 goal 的相对空间智能推导折向
        const fromLeft = runnerPos.col <= pos.col;
        const toBelow = targetGoal.row >= pos.row;
        if (fromLeft && toBelow) return { ...tile, rotation: 0 }; // ┌ 右折下
        if (fromLeft && !toBelow) return { ...tile, rotation: 1 }; // └ 右折上
        if (!fromLeft && !toBelow) return { ...tile, rotation: 2 }; // ┘ 左折上
        return { ...tile, rotation: 3 }; // ┐ 左折下
      }

      return tile;
    }

    // 1. 直线类：如果光从左/右射入 -> 0 (水平横向)；如果从上/下射入 -> 1 (垂直纵向)
    if (isStraightType(tile.type)) {
      const rot = (incomingDir === 'right' || incomingDir === 'left') ? 0 : 1;
      return { ...tile, rotation: rot };
    }

    // 2. 折角类：仅有的 2 种有效折光朝向
    if (isCurveType(tile.type)) {
      const [rotA, rotB] = getValidCurveRotations(incomingDir);

      const cfgA = resolveTileConfig({ ...tile, rotation: rotA });
      const outA = cfgA.routing[incomingDir];
      const cfgB = resolveTileConfig({ ...tile, rotation: rotB });
      const outB = cfgB.routing[incomingDir];

      const nextA = outA && outA !== 'dead' ? move(pos, outA) : null;
      const nextB = outB && outB !== 'dead' ? move(pos, outB) : null;

      const validA = nextA ? (this.grid!.isValid(nextA) && !this.grid!.isObstacle(nextA)) : false;
      const validB = nextB ? (this.grid!.isValid(nextB) && !this.grid!.isObstacle(nextB)) : false;

      // 如果其中一个撞墙/撞障碍，选通畅的那一个
      if (validA && !validB) return { ...tile, rotation: rotA };
      if (!validA && validB) return { ...tile, rotation: rotB };

      // 前瞻 2 步避障检测：若两边都通畅，检查前进第 2 步是否有阻挡
      if (validA && validB && outA && outA !== 'dead' && outB && outB !== 'dead') {
        const step2A = move(nextA!, outA);
        const step2B = move(nextB!, outB);
        const blocked2A = !this.grid!.isValid(step2A) || this.grid!.isObstacle(step2A);
        const blocked2B = !this.grid!.isValid(step2B) || this.grid!.isObstacle(step2B);
        if (!blocked2A && blocked2B) return { ...tile, rotation: rotA };
        if (blocked2A && !blocked2B) return { ...tile, rotation: rotB };
      }

      // 星核优先：如果某个分支离未点亮的星核更近
      const starCore = this.level?.starCores?.find((s) => !this.grid?.getTile(s));
      if (starCore && nextA && nextB) {
        const distStarA = Math.abs(nextA.row - starCore.row) + Math.abs(nextA.col - starCore.col);
        const distStarB = Math.abs(nextB.row - starCore.row) + Math.abs(nextB.col - starCore.col);
        if (distStarA !== distStarB) {
          return { ...tile, rotation: distStarA < distStarB ? rotA : rotB };
        }
      }

      // 目标终点启发式导向
      const targetGoal = this.level?.goals.find((g) => !g.lit) || this.level?.goals[0];
      if (targetGoal && nextA && nextB) {
        const distA = Math.abs(nextA.row - targetGoal.row) + Math.abs(nextA.col - targetGoal.col);
        const distB = Math.abs(nextB.row - targetGoal.row) + Math.abs(nextB.col - targetGoal.col);
        return { ...tile, rotation: distA <= distB ? rotA : rotB };
      }

      return { ...tile, rotation: rotA };
    }

    return tile;
  }

  private placeTileAt(pos: GridPos, tile: TileInstance, cardIndex: number): void {
    if (!this.grid || !this.cardSystem) return;
    this.closeRadialDial();
    if (this.hintHighlightNode) {
      this.hintHighlightNode.destroy();
      this.hintHighlightNode = null;
    }
    WeChatService.vibrateShort('light');
    this.grid.setTile(pos, tile);
    this.renderTile(pos, tile);
    const generated = this.applyPlacementSkill(tile, pos);
    this.moveHistory.push({
      pos: { ...pos },
      cardIndex: cardIndex,
      tileType: tile.type,
      generated,
    });
    this.usedMoves++;
    const consumedType = tile.type;
    this.hand = this.cardSystem.consume(cardIndex);

    // 智能连选：若手牌中仍有同类型水晶，继续保留选中状态，方便极速连续落子！
    const nextSameIdx = this.hand.indexOf(consumedType);
    if (nextSameIdx !== -1 && this.selectedCardIndex !== -1) {
      this.selectedCardIndex = nextSameIdx;
    } else {
      this.selectedCardIndex = -1;
      this.selectedCardRotation = 0;
    }

    this.renderCards();
    this.setSelectedPlacedPos(pos);
    this.spawnPlacementPulse(pos);
    this.spawnRotationHint(pos, tile);
    this.currentBulletTime = Math.min(this.maxBulletTime, this.currentBulletTime + 1.2);
    this.redrawBulletTimeMeter();
    this.setStatus(this.getPlacementSuccessText());
    this.updateLabels();
    this.updateRoutePreviewLine();
  }

  private spawnRotationHint(pos: GridPos, tile: TileInstance): void {
    if (!this.boardRoot || this.powerSaveMode) return;
    const config = getBaseTileConfig(tile.type);
    if (!config.rotatable) return;

    const localPos = this.gridToLocal(pos);
    const hintNode = new Node('RotationHintBubble');
    hintNode.layer = Layers.Enum.UI_2D;
    hintNode.setParent(this.boardRoot);
    hintNode.setPosition(localPos.x, localPos.y + this.tileHeight * 0.45, 60);

    const hintW = 86;
    const hintH = 24;
    hintNode.addComponent(UITransform).setContentSize(hintW, hintH);

    const g = hintNode.addComponent(Graphics);
    g.fillColor = new Color(8, 20, 38, 230);
    g.roundRect(-hintW / 2, -hintH / 2, hintW, hintH, 12);
    g.fill();
    g.strokeColor = this.hex('#00F0FF');
    g.lineWidth = 1.4;
    g.roundRect(-hintW / 2, -hintH / 2, hintW, hintH, 12);
    g.stroke();

    const lblNode = new Node('HintLbl');
    lblNode.layer = Layers.Enum.UI_2D;
    lblNode.setParent(hintNode);
    lblNode.setPosition(0, 0, 1);
    const lbl = lblNode.addComponent(Label);
    lbl.string = '↻ 轻触调向';
    lbl.fontSize = 11;
    lbl.color = this.hex('#00F0FF');

    hintNode.setScale(new Vec3(0.5, 0.5, 1));
    tween(hintNode)
      .to(0.18, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
      .delay(1.4)
      .to(0.35, { position: new Vec3(localPos.x, localPos.y + this.tileHeight * 0.45 + 16, 60), scale: new Vec3(0.6, 0.6, 1) })
      .call(() => hintNode.destroy())
      .start();
  }

  private showRadialQuickDial(pos: GridPos, types: TileType[], counts: Record<string, number>): void {
    this.closeRadialDial();
    if (!this.boardRoot || !this.grid) return;

    const cellLocal = this.gridToLocal(pos);
    const dialNode = new Node(`RadialDial_${pos.row}_${pos.col}`);
    dialNode.layer = Layers.Enum.UI_2D;
    dialNode.setParent(this.boardRoot);
    dialNode.setPosition(cellLocal.add3f(0, 0, 50));

    // 0. 全局轻量遮罩层（点击任意空白处优雅关闭轮盘，防止误触棋盘）
    const backdrop = new Node('DialBackdrop');
    backdrop.layer = Layers.Enum.UI_2D;
    backdrop.setParent(dialNode);
    backdrop.setPosition(new Vec3(0, 0, -2));
    const boardW = Math.max(720, this.tileWidth * this.grid.cols + 240);
    const boardH = Math.max(1280, this.tileHeight * this.grid.rows + 360);
    backdrop.addComponent(UITransform).setContentSize(boardW * 2, boardH * 2);
    const bgMask = backdrop.addComponent(Graphics);
    bgMask.fillColor = new Color(5, 12, 22, 110);
    bgMask.rect(-boardW, -boardH, boardW * 2, boardH * 2);
    bgMask.fill();
    backdrop.on(Node.EventType.TOUCH_END, (e: EventTouch) => {
      e.propagationStopped = true;
      this.closeRadialDial();
      this.setStatus('已取消选择');
    }, this);

    // 1. 目标地块底座微光瞄准环（精准标出当前选中的地块）
    const cellG = dialNode.addComponent(Graphics);
    cellG.fillColor = new Color(0, 240, 255, 45);
    cellG.roundRect(-this.tileWidth * 0.48, -this.tileHeight * 0.48, this.tileWidth * 0.96, this.tileHeight * 0.96, 16);
    cellG.fill();
    cellG.strokeColor = this.hex('#00F0FF');
    cellG.lineWidth = 2.8;
    cellG.roundRect(-this.tileWidth * 0.48, -this.tileHeight * 0.48, this.tileWidth * 0.96, this.tileHeight * 0.96, 16);
    cellG.stroke();

    // 2. 计算卡片尺寸与全组一体化排布（数学级杜绝任何卡片重叠）
    const numCards = types.length;
    // 根据卡片数量自适应宽度，确保紧凑且清晰
    const cardW = numCards <= 2 ? 86 : (numCards === 3 ? 80 : 74);
    const cardH = 96;
    const gap = numCards <= 2 ? 14 : 10;
    const totalW = numCards * cardW + (numCards - 1) * gap;

    // 全组整体 X 偏移量（将整个浮空舱作为一个整体进行屏幕边缘钳制，绝对保证组内卡片相对间距恒定！）
    const minBoardX = -310;
    const maxBoardX = 310;
    let groupShiftX = 0;
    if (cellLocal.x - totalW / 2 < minBoardX) {
      groupShiftX = minBoardX - (cellLocal.x - totalW / 2);
    } else if (cellLocal.x + totalW / 2 > maxBoardX) {
      groupShiftX = maxBoardX - (cellLocal.x + totalW / 2);
    }

    // 垂直方向：前 2 行向下弹出，其余行向上弹出，确保不被顶部或底部 UI 遮挡
    const isTopHalf = pos.row <= 1;
    const yCenter = isTopHalf
      ? -Math.max(68, this.tileHeight * 0.5 + cardH * 0.5 + 14)
      : Math.max(68, this.tileHeight * 0.5 + cardH * 0.5 + 14);

    // 3. 绘制一体化浮空晶体舱底板 (Frosted Dock Capsule) 与指示三角
    const dockW = totalW + 20;
    const dockH = cardH + 18;
    const dockX = groupShiftX;
    const dockY = yCenter;

    // 舱体深邃夜幕毛玻璃底
    cellG.fillColor = new Color(10, 20, 36, 248);
    cellG.roundRect(dockX - dockW / 2, dockY - dockH / 2, dockW, dockH, 18);
    cellG.fill();

    // 舱体霓虹外发光边框
    cellG.strokeColor = new Color(0, 240, 255, 180);
    cellG.lineWidth = 1.8;
    cellG.roundRect(dockX - dockW / 2, dockY - dockH / 2, dockW, dockH, 18);
    cellG.stroke();

    // 舱体顶部镜面反光流线
    cellG.fillColor = new Color(255, 255, 255, 28);
    cellG.roundRect(dockX - dockW / 2 + 10, dockY + dockH / 2 - 6, dockW - 20, 4, 2);
    cellG.fill();

    // 指向目标地块的优雅光感三角指示标 (Pointer Arrow)
    cellG.fillColor = new Color(10, 20, 36, 248);
    cellG.strokeColor = new Color(0, 240, 255, 180);
    cellG.lineWidth = 1.8;
    const arrowX = 0; // 指向被选中的格子中心
    if (isTopHalf) {
      cellG.moveTo(arrowX - 8, dockY + dockH / 2);
      cellG.lineTo(arrowX, dockY + dockH / 2 + 9);
      cellG.lineTo(arrowX + 8, dockY + dockH / 2);
      cellG.close();
      cellG.fill();
      cellG.stroke();
    } else {
      cellG.moveTo(arrowX - 8, dockY - dockH / 2);
      cellG.lineTo(arrowX, dockY - dockH / 2 - 9);
      cellG.lineTo(arrowX + 8, dockY - dockH / 2);
      cellG.close();
      cellG.fill();
      cellG.stroke();
    }

    // 4. 生成舱内的每张水晶卡片（固定间距，100% 杜绝重叠）
    types.forEach((type, idx) => {
      const btnX = groupShiftX + (idx - (numCards - 1) / 2) * (cardW + gap);
      const btnY = yCenter;

      const btnNode = new Node(`DialBtn_${type}`);
      btnNode.layer = Layers.Enum.UI_2D;
      btnNode.setParent(dialNode);
      btnNode.setPosition(new Vec3(btnX, btnY, 10));
      btnNode.addComponent(UITransform).setContentSize(cardW, cardH);

      const g = btnNode.addComponent(Graphics);
      // 卡片内部毛玻璃面板
      g.fillColor = new Color(16, 28, 48, 230);
      g.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 14);
      g.fill();

      // 卡片边框（水晶主题色高亮）
      const col = this.tileColor(type);
      g.strokeColor = col;
      g.lineWidth = 2.2;
      g.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 14);
      g.stroke();

      // 居中水晶图元：使用根据当前地块精准计算的智能朝向（所见即所得）
      const previewTile = this.getBestTileOrientation(pos, createTile(type));
      const iconY = 10;
      this.drawTopDownTile(g, col, this.hex('#FFFFFF'), 1.8, 38, 38, iconY, 0, 3);
      this.drawTileArrow(g, previewTile, iconY, 0.48, 0, 14);

      // 下方大号清晰中文名称与方向指示
      const nameNode = new Node('DialName');
      nameNode.layer = Layers.Enum.UI_2D;
      nameNode.setParent(btnNode);
      nameNode.setPosition(new Vec3(0, -cardH / 2 + 15, 2));
      nameNode.addComponent(UITransform).setContentSize(cardW - 4, 22);
      const nameLbl = nameNode.addComponent(Label);
      let dirSuffix = '';
      if (isCurveType(type)) {
        switch (previewTile.rotation % 4) {
          case 0: dirSuffix = ' ↳'; break;
          case 1: dirSuffix = ' ↱'; break;
          case 2: dirSuffix = ' ↰'; break;
          case 3: dirSuffix = ' ↵'; break;
        }
      } else if (isStraightType(type)) {
        dirSuffix = previewTile.rotation % 2 === 0 ? ' ─' : ' │';
      }
      nameLbl.string = `${getTileDisplayName(type)}${dirSuffix}`;
      nameLbl.fontSize = 12;
      nameLbl.color = this.hex('#FFFFFF');

      // 右上角数量胶囊徽标
      const badgeNode = new Node('CountBadge');
      badgeNode.layer = Layers.Enum.UI_2D;
      badgeNode.setParent(btnNode);
      badgeNode.setPosition(new Vec3(cardW / 2 - 12, cardH / 2 - 10, 5));
      badgeNode.addComponent(UITransform).setContentSize(28, 18);
      const bg = badgeNode.addComponent(Graphics);
      bg.fillColor = this.hex('#00F0FF');
      bg.roundRect(-12, -8, 24, 16, 6);
      bg.fill();

      const labelNode = new Node('BadgeLabel');
      labelNode.layer = Layers.Enum.UI_2D;
      labelNode.setParent(badgeNode);
      labelNode.setPosition(new Vec3(0, 0, 1));
      const lbl = labelNode.addComponent(Label);
      lbl.string = `x${counts[type]}`;
      lbl.fontSize = 11;
      lbl.lineHeight = 13;
      lbl.color = this.hex('#000000');

      // 弹性弹出动画
      btnNode.setScale(new Vec3(0.2, 0.2, 1));
      tween(btnNode)
        .to(0.16, { scale: new Vec3(1.0, 1.0, 1) }, { easing: 'backOut' })
        .start();

      btnNode.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
        event.propagationStopped = true;
        const cardIndex = this.hand.indexOf(type);
        if (cardIndex !== -1) {
          this.placeTileAt(pos, previewTile, cardIndex);
          this.setStatus(`快捷落子：已放置 ${getTileDisplayName(type)}！轻点地砖可反向切换。`);
        }
      }, this);
    });

    this.radialDialNode = dialNode;
    this.setStatus('指尖快捷轮盘：轻点卡片直接放置水晶，点击背景取消。');
  }

  private getRotationDesc(rotation: number, type?: TileType): string {
    if (type && isStraightType(type)) {
      return (rotation % 2 === 0) ? '水平横向 ─' : '垂直纵向 │';
    }
    if (type && isCurveType(type)) {
      switch (rotation % 4) {
        case 0: return '┌ 右折下';
        case 1: return '└ 右折上';
        case 2: return '┘ 左折上';
        case 3: return '┐ 左折下';
      }
    }
    switch (rotation % 4) {
      case 0: return '初始 0°';
      case 1: return '顺时针 90°';
      case 2: return '180°';
      case 3: return '逆时针 90°';
      default: return '0°';
    }
  }

  public rotateCurrentTarget(sourceNode?: Node): boolean {
    this.closeRadialDial();

    // 1. 优先：右手正拖拽手牌（双手连招的核心体验）
    if (this.dragTile) {
      const prevRotation = this.dragTile.rotation;
      const incomingDir = this.hoverCell ? this.getIncomingLightDirection(this.hoverCell) : null;
      const rotated = smartRotateTile(this.dragTile, incomingDir);
      if (rotated.rotation === prevRotation) {
        WeChatService.vibrateShort('heavy');
        this.setStatus(`${getTileDisplayName(this.dragTile.type)}为特殊水晶，不可旋转。`);
        return false;
      }
      this.dragTile = rotated;
      this.refreshDragGhost();
      if (this.hoverCell) {
        this.renderPreview(this.hoverCell, this.dragTile);
      }
      WeChatService.vibrateShort('light');
      CrystalAudioService.playRotatePlink();
      this.setStatus(`水晶已切换为 ${this.getRotationDesc(this.dragTile.rotation, this.dragTile.type)}，松手即可放置！`);
      this.pulseRotateButton(sourceNode);
      return true;
    }

    // 2. 其次：棋盘上有已选中的已放置水晶
    if (this.selectedPlacedPos && this.grid) {
      const tile = this.grid.getTile(this.selectedPlacedPos);
      if (tile) {
        if (this.runner && this.selectedPlacedPos.row === this.runner.row && this.selectedPlacedPos.col === this.runner.col) {
          WeChatService.vibrateShort('heavy');
          this.setStatus('Runner 正在这里，不能旋转这块水晶。');
          return false;
        }
        if (tile.locked) {
          WeChatService.vibrateShort('light');
          this.setStatus('⚓ 锚定星桥不可旋转，顺着它接通光路即可！');
          return false;
        }
        const incomingDir = this.getIncomingLightDirection(this.selectedPlacedPos);
        const rotated = smartRotateTile(tile, incomingDir);
        if (rotated.rotation === tile.rotation) {
          WeChatService.vibrateShort('heavy');
          this.setStatus(`${getTileDisplayName(tile.type)}不能旋转。`);
          return false;
        }
        WeChatService.vibrateShort('light');
        CrystalAudioService.playRotatePlink();
        this.grid.setTile(this.selectedPlacedPos, rotated);
        this.renderTile(this.selectedPlacedPos, rotated);
        this.setSelectedPlacedPos(this.selectedPlacedPos);
        this.currentBulletTime = Math.min(this.maxBulletTime, this.currentBulletTime + 0.6);
        this.redrawBulletTimeMeter();
        if (isStraightType(tile.type)) {
          this.setStatus(`直线水晶：已切换为 ${rotated.rotation % 2 === 0 ? '水平横向 ─' : '垂直纵向 │'}`);
        } else if (isCurveType(tile.type)) {
          this.setStatus(`折角镜：已反向切换折光朝向，继续观察光路！`);
        } else {
          this.setStatus('水晶已旋转，补充 0.6s 子弹时间，继续观察光路。');
        }
        this.updateRoutePreviewLine();
        this.pulseRotateButton(sourceNode);
        return true;
      }
    }

    // 3. 再次：底栏手牌处于点击选中状态（准备点击空白格放置）
    if (this.selectedCardIndex !== -1 && this.cardSystem) {
      const type = this.hand[this.selectedCardIndex];
      const dummyTile = createTile(type, this.selectedCardRotation);
      const rotatedDummy = smartRotateTile(dummyTile, null);
      if (rotatedDummy.rotation === dummyTile.rotation) {
        WeChatService.vibrateShort('heavy');
        this.setStatus(`${getTileDisplayName(type)}不可旋转。`);
        return false;
      }
      this.selectedCardRotation = rotatedDummy.rotation;
      WeChatService.vibrateShort('light');
      this.setStatus(`手牌预置为 ${this.getRotationDesc(this.selectedCardRotation, type)}，点击地图空格直接放置！`);
      this.renderCards();
      this.pulseRotateButton(sourceNode);
      return true;
    }

    // 4. 兜底：如果棋盘上有刚刚放置的水晶（取历史记录最后一条）
    if (this.moveHistory.length > 0 && this.grid) {
      const lastMove = this.moveHistory[this.moveHistory.length - 1];
      const tile = this.grid.getTile(lastMove.pos);
      if (tile) {
        this.setSelectedPlacedPos(lastMove.pos);
        return this.rotateCurrentTarget(sourceNode);
      }
    }

    WeChatService.vibrateShort('heavy');
    this.setStatus('当前未选择水晶。拖起手牌或点击棋盘上的水晶后再按旋转。');
    return false;
  }

  private onPlacedTileTouch(pos: GridPos, event?: EventTouch): void {
    if (event) {
      event.propagationStopped = true;
    }
    if (!this.grid || !this.runner || this.runner.state === 'RUNNING') {
      return;
    }
    if (this.hintHighlightNode) {
      this.hintHighlightNode.destroy();
      this.hintHighlightNode = null;
    }
    this.closeRadialDial();

    if (pos.row === this.runner.row && pos.col === this.runner.col) {
      WeChatService.vibrateShort('heavy');
      this.setStatus('起点圣火位置不可旋转。');
      return;
    }

    const tile = this.grid.getTile(pos);
    if (!tile || this.grid.isObstacle(pos)) {
      return;
    }
    if (tile.locked) {
      WeChatService.vibrateShort('light');
      this.setStatus('⚓ 锚定星桥不可旋转，顺着它接通光路即可！');
      return;
    }

    const prevRot = tile.rotation;
    let nextRot = prevRot;
    if (isStraightType(tile.type)) {
      nextRot = (prevRot % 2 === 0) ? 1 : 0;
    } else {
      nextRot = (prevRot + 1) % 4;
    }

    this.moveHistory.push({ pos, prevRotation: prevRot, tileType: tile.type });

    const updatedTile: TileInstance = { ...tile, rotation: nextRot };
    this.grid.setTile(pos, updatedTile);
    this.usedMoves++;
    this.renderTile(pos, updatedTile);
    this.setSelectedPlacedPos(pos);
    WeChatService.vibrateShort('light');

    this.updateRoutePreviewLine();
    this.updateLabels();
    this.pulseRotateButton();

    const tileKey = this.key(pos);
    const node = this.tileNodes.get(tileKey);
    if (node) {
      tween(node)
        .to(0.06, { scale: new Vec3(1.18, 1.18, 1) }, { easing: 'quadOut' })
        .to(0.08, { scale: new Vec3(1.0, 1.0, 1) }, { easing: 'quadIn' })
        .start();
    }

    if (!this.isRouteCurrentlyConnected()) {
      if (isStraightType(tile.type)) {
        this.setStatus(`直线水晶：已切换为 ${nextRot === 0 ? '水平横向 ─' : '垂直纵向 │'}`);
      } else if (isCurveType(tile.type)) {
        this.setStatus(`折角镜：已顺时针旋转 90°`);
      } else {
        this.setStatus(`${getTileDisplayName(tile.type)}：已顺时针旋转 90°`);
      }
    }
  }

  private isRouteCurrentlyConnected(): boolean {
    if (!this.grid || !this.runner || !this.level) return false;
    return RouteSimulator.simulate(this.grid, this.runner, this.level.goals).success;
  }

  private selectCard(index: number): void {
    this.closeRadialDial();
    if (this.selectedCardIndex === index) {
      const type = this.hand[index];
      const dummyTile = createTile(type, this.selectedCardRotation);
      const rotated = smartRotateTile(dummyTile, null);
      this.selectedCardRotation = rotated.rotation;
      WeChatService.vibrateShort('light');
      this.renderCards();
    } else {
      this.selectedCardIndex = index;
      this.selectedCardRotation = 0;
      this.setSelectedPlacedPos(null);
      this.renderCards();
    }
  }

  private onCellTouch(pos: GridPos): void {
    if (!this.grid || !this.runner || this.runner.state === 'RUNNING') {
      return;
    }
    this.closeRadialDial();

    const existingTile = this.grid.getTile(pos);
    if (existingTile && !this.grid.isObstacle(pos)) {
      this.onPlacedTileTouch(pos);
      return;
    }

    this.setStatus('✦ 轻触水晶即可旋转朝向，连通光路通往终点！');
  }

  private applyPlacementSkill(tile: TileInstance, pos: GridPos): GridPos[] {
    if (!this.grid) {
      return [];
    }
    const config = resolveTileConfig(tile);
    if (config.skill !== 'vine' && config.skill !== 'mirror') {
      return [];
    }

    const outputs = Object.values(config.routing).filter((value) => !!value && value !== 'dead') as Direction[];
    const direction = outputs[0];
    if (!direction) {
      return [];
    }

    const growCount = config.skill === 'vine' ? (config.autoGrow || 1) : 1;
    let cursor = { ...pos };
    let placed = 0;
    const generatedPositions: GridPos[] = [];
    for (let i = 0; i < growCount; i++) {
      cursor = move(cursor, direction);
      if (!this.canPlace(cursor) || this.grid.getTile(cursor)) {
        break;
      }
      const type: TileType = config.skill === 'mirror' ? tile.type : 'straight';
      const generated = createTile(type, tile.rotation);
      this.grid.setTile(cursor, generated);
      this.renderTile(cursor, generated);
      generatedPositions.push({ ...cursor });
      placed++;
    }
    if (placed > 0) {
      const name = config.skill === 'vine' ? '生长水晶' : '镜像水晶';
      this.setStatus(`${name}触发：自动延展 ${placed} 格光路。`);
      AnalyticsService.track('skill_trigger', { levelId: this.level?.id ?? 0, skill: config.skill, placed });
    }
    return generatedPositions;
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

  private resetTransientInputState(): void {
    director.getScheduler().setTimeScale(1);
    this.dragTile = null;
    this.dragCardIndex = -1;
    this.hoverCell = null;
    this.hasMovedDuringDrag = false;
    this.isResolving = false;
    if (this.dragNode) {
      this.dragNode.destroy();
      this.dragNode = null;
    }
  }

  public updateRoutePreviewLine(): void {
    if (!this.grid || !this.runner || !this.level || !this.previewRoot || this.runner.state === 'RUNNING') {
      return;
    }
    this.clearNode(this.previewRoot);
    const preview = RouteSimulator.simulate(this.grid, this.runner, this.level.goals);
    const node = new Node('LivePreviewLine');
    node.layer = Layers.Enum.UI_2D;
    node.setParent(this.previewRoot);
    const graphics = node.addComponent(Graphics);

    const isConnected = preview.success;
    const start = this.getRouteAnchor(this.runner);
    const routePoints = this.getDrawableRoutePoints(preview.path);

    // Count active star cores along preview path & collect electrified tiles
    const nextIlluminated = new Set<string>();
    const pathAllKeys = new Set<string>();
    for (const p of preview.path) {
      const k = this.key(p);
      pathAllKeys.add(k);
      if (p.result !== 'dead' && p.result !== 'blocked') {
        nextIlluminated.add(k);
      }
    }
    if (preview.secondaryPath) {
      for (const sp of preview.secondaryPath) {
        const k = this.key(sp);
        pathAllKeys.add(k);
        if (sp.result !== 'dead' && sp.result !== 'blocked') {
          nextIlluminated.add(k);
        }
      }
    }

    const activeStars = this.getActiveBonusCells();
    let litStarCount = 0;
    for (const star of activeStars) {
      if (nextIlluminated.has(this.key(star))) {
        litStarCount++;
      }
    }
    this.previewLitStars = litStarCount;
    const allStarsLit = activeStars.length === 0 || litStarCount >= activeStars.length;
    const remainingUnlitStars = Math.max(0, activeStars.length - litStarCount);

    // Sync electrified crystal visuals (Cold Ice Blue <-> Radiant Celestial Gold)
    const prevLit = this.illuminatedCellKeys;
    const changedKeys: GridPos[] = [];
    this.grid.forEachCell((pos, tile) => {
      if (!tile) return;
      const k = this.key(pos);
      if (prevLit.has(k) !== nextIlluminated.has(k)) {
        changedKeys.push(pos);
      }
    });
    this.illuminatedCellKeys = nextIlluminated;
    for (const pos of changedKeys) {
      const t = this.grid.getTile(pos);
      if (t) this.renderTile(pos, t);
    }

    // Compute live route completion % toward nearest goal for immediate positive feedback
    const primaryGoal = this.level.goals[0];
    if (isConnected) {
      this.previewProgressRatio = 1;
    } else if (primaryGoal && this.runner) {
      const totalDist = Math.max(2, Math.abs(primaryGoal.row - this.runner.row) + Math.abs(primaryGoal.col - this.runner.col));
      const tipCell = routePoints.length > 0 ? routePoints[routePoints.length - 1] : this.runner;
      const remDist = Math.abs(primaryGoal.row - tipCell.row) + Math.abs(primaryGoal.col - tipCell.col);
      const distProgress = Math.max(0, (totalDist - remDist) / totalDist);
      const stepProgress = Math.min(0.9, nextIlluminated.size / (totalDist + 1));
      this.previewProgressRatio = Math.max(distProgress, stepProgress);
    } else {
      this.previewProgressRatio = Math.min(0.9, nextIlluminated.size / 6);
    }

    // Dim unused side-branch clutter as the player nears or completes the path ("越理越干净")
    const nextDimMode = !this.isEndlessMode && (isConnected || this.previewProgressRatio >= 0.72);
    if (nextDimMode !== this.boardDimMode) {
      this.boardDimMode = nextDimMode;
      this.grid.forEachCell((pos, tile) => {
        if (!tile) return;
        const k = this.key(pos);
        if (!nextIlluminated.has(k) && !tile.locked && !resolveTileConfig(tile).skill) {
          this.renderTile(pos, tile);
        }
      });
    }

    // Near-goal sanctuary anticipation pulse when within 2 cells of a goal
    const tipForGoal = routePoints.length > 0 ? routePoints[routePoints.length - 1] : this.runner;
    const nextNearGoal = !isConnected && !!primaryGoal && !!tipForGoal &&
      (Math.abs(tipForGoal.row - primaryGoal.row) + Math.abs(tipForGoal.col - primaryGoal.col) <= 2);
    if (nextNearGoal !== this.isNearGoal) {
      this.isNearGoal = nextNearGoal;
      for (const gNode of this.goalNodes) {
        if (!gNode || !gNode.isValid) continue;
        tween(gNode).stop();
        if (nextNearGoal && !this.powerSaveMode) {
          tween(gNode)
            .to(0.42, { scale: new Vec3(1.12, 1.12, 1) }, { easing: 'sineInOut' })
            .to(0.42, { scale: new Vec3(1.0, 1.0, 1) }, { easing: 'sineInOut' })
            .union()
            .repeatForever()
            .start();
        } else {
          gNode.setScale(new Vec3(1, 1, 1));
        }
      }
    }

    // Play rising harmonic chime & spawn spark when a move extends the live lit path
    if (this.usedMoves > 0 && nextIlluminated.size > this.lastPreviewLitCount && this.runner.state === 'IDLE') {
      CrystalAudioService.playStepChime(Math.min(12, nextIlluminated.size));
      if (!this.powerSaveMode && routePoints.length > 0) {
        const tipPt = this.getRouteAnchor(routePoints[routePoints.length - 1]);
        this.spawnLandingRipple(tipPt, this.hex(isConnected ? '#FDE047' : '#38BDF8'));
      }
    }
    if (isConnected && !this.lastPreviewConnected && this.usedMoves > 0) {
      CrystalAudioService.playStepChime(10);
    }
    this.lastPreviewLitCount = nextIlluminated.size;
    this.lastPreviewConnected = isConnected;

    // 1. Outer Laser Glow Halo (Golden Aurora when connected with all stars, Cyan when connected, Sky Blue when seeking)
    const outerCol = isConnected
      ? (allStarsLit ? this.hex('#FDE047') : this.hex('#00F0FF'))
      : this.hex('#38BDF8');
    ((outerCol as any)).a = isConnected ? (allStarsLit ? 220 : 185) : 135;
    graphics.strokeColor = outerCol;
    graphics.lineWidth = isConnected ? (allStarsLit ? 22 : 18) : 12;
    graphics.moveTo(start.x, start.y);
    for (const pathNode of routePoints) {
      const point = this.getRouteAnchor(pathNode);
      graphics.lineTo(point.x, point.y);
    }
    graphics.stroke();

    // 2. High-intensity Core Stream
    const coreCol = isConnected ? this.hex('#FFFFFF') : this.hex('#E0F2FE');
    graphics.strokeColor = coreCol;
    graphics.lineWidth = isConnected ? 6.5 : 4;
    graphics.moveTo(start.x, start.y);
    for (const pathNode of routePoints) {
      const point = this.getRouteAnchor(pathNode);
      graphics.lineTo(point.x, point.y);
    }
    graphics.stroke();

    // 3. Tip Photon Spark
    if (routePoints.length > 0) {
      const tipPos = this.getRouteAnchor(routePoints[routePoints.length - 1]);
      const lastPathNode = preview.path[preview.path.length - 1];
      const isBlocked = lastPathNode?.result === 'blocked';
      graphics.fillColor = isBlocked
        ? this.hex('#F43F5E')
        : (isConnected ? this.hex('#FDE047') : this.hex('#38BDF8'));
      graphics.circle(tipPos.x, tipPos.y, isConnected ? 11 : 7.5);
      graphics.fill();
    }

    // 3.5. 分光双色流光 (Secondary Golden Prism Beam)
    if (preview.secondaryPath && preview.secondaryPath.length > 0) {
      const secRoutePoints = this.getDrawableRoutePoints(preview.secondaryPath);
      if (secRoutePoints.length > 0) {
        const secOuter = this.hex('#F59E0B');
        ((secOuter as any)).a = 165;
        graphics.strokeColor = secOuter;
        graphics.lineWidth = 14;
        const splitStart = this.getRouteAnchor(secRoutePoints[0]);
        graphics.moveTo(splitStart.x, splitStart.y);
        for (let i = 1; i < secRoutePoints.length; i++) {
          const pt = this.getRouteAnchor(secRoutePoints[i]);
          graphics.lineTo(pt.x, pt.y);
        }
        graphics.stroke();

        graphics.strokeColor = this.hex('#FEF08A');
        graphics.lineWidth = 5;
        graphics.moveTo(splitStart.x, splitStart.y);
        for (let i = 1; i < secRoutePoints.length; i++) {
          const pt = this.getRouteAnchor(secRoutePoints[i]);
          graphics.lineTo(pt.x, pt.y);
        }
        graphics.stroke();

        const lastSec = this.getRouteAnchor(secRoutePoints[secRoutePoints.length - 1]);
        graphics.fillColor = this.hex('#F59E0B');
        graphics.circle(lastSec.x, lastSec.y, 8);
        graphics.fill();
      }
    }

    // 3.8. 障碍受阻警示反馈（禁止激光自动秒碎，维护谜题规则严肃性；引导使用【🔨破障】或绕行）
    this.cancelObstacleDrill();
    const blockedNode = preview.path.find((p) => p.result === 'blocked');
    this.previewBlockedOnObstacle = !!(blockedNode && this.grid.isObstacle(blockedNode));
    if (blockedNode && this.grid.isObstacle(blockedNode)) {
      const bp = this.getRouteAnchor(blockedNode);
      graphics.strokeColor = this.hex('#F43F5E');
      graphics.lineWidth = 2.8;
      graphics.circle(bp.x, bp.y, 16);
      graphics.stroke();
      if (this.usedMoves > 0 && !this.hammerModeActive) {
        this.setStatus('⚠ 前方陨石阻挡！点击下方「🔨 破障」可直接击碎障碍');
      }
    }

    // 4. Update Fog of War (for level 16+ mist)
    const fogSet = new Set<string>();
    if (this.runner) {
      fogSet.add(this.key(this.runner));
      for (const d of DIRECTIONS) {
        fogSet.add(this.key(move(this.runner, d)));
      }
    }
    for (const p of preview.path) {
      fogSet.add(this.key(p));
      for (const d of DIRECTIONS) {
        fogSet.add(this.key(move(p, d)));
      }
    }
    if (preview.secondaryPath) {
      for (const sp of preview.secondaryPath) {
        fogSet.add(this.key(sp));
        for (const d of DIRECTIONS) {
          fogSet.add(this.key(move(sp, d)));
        }
      }
    }

    if (isConnected) {
      this.dispelAllFog();
    } else {
      this.updateFogOfWar(fogSet);
    }

    // 5. Smart Auto-launch vs Manual Confirm (Never rob players of greedy 3-star detour!)
    if (isConnected && this.runner.state === 'IDLE' && !this.isResolving) {
      this.updateHeroButtonState(true, remainingUnlitStars);
      if (allStarsLit) {
        this.scheduleAutoLaunch();
      } else {
        this.cancelAutoLaunch();
        this.setStatus(`✦ 终点已通！可直接点下方冲关，或绕路再收 ${remainingUnlitStars} 颗星核拿 3★`);
      }
    } else {
      this.updateHeroButtonState(false, 0);
      this.cancelAutoLaunch();
    }
    this.updateLabels();
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

    if (!this.grid.isValid(next) || this.grid.isObstacle(next)) {
      this.handleDead('前方无法通行');
      return;
    }

    const directGoal = this.findGoal(next, this.level.goals);
    if (directGoal && this.isGoalColorMatched(directGoal)) {
      this.runner.row = next.row;
      this.runner.col = next.col;
      const complete = this.visitGoal(directGoal);
      this.afterRunnerStep();
      this.moveRunnerVisual(this.runner, () => {
        if (complete) {
          this.handleSuccess();
        }
      });
      return;
    } else if (directGoal) {
      this.handleDead('光的颜色不匹配');
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

    this.collectBonusAt(next);

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

    let completedByJump = false;
    if (config.jumpDistance && config.jumpDistance > 0) {
      for (let i = 0; i < config.jumpDistance; i++) {
        const landing = move(this.runner, this.runner.direction);
        if (!this.grid.isValid(landing) || this.grid.isObstacle(landing)) {
          this.handleDead('跃迁落点无法通行');
          return;
        }
        this.runner.row = landing.row;
        this.runner.col = landing.col;
        this.collectBonusAt(landing);
        const jumpGoal = this.findGoal(landing, this.level.goals);
        if (jumpGoal && this.isGoalColorMatched(jumpGoal)) {
          completedByJump = this.visitGoal(jumpGoal);
          break;
        }
      }
    }

    this.afterRunnerStep();
    CrystalAudioService.playStepChime(this.runnerStepCount);
    this.moveRunnerVisual(this.runner, () => {
      const goal = this.findGoal(this.runner!, this.level!.goals);
      if (completedByJump || (goal && this.isGoalColorMatched(goal) && this.visitGoal(goal))) {
        this.handleSuccess();
      }
    });
  }

  private collectBonusAt(pos: GridPos): void {
    const bonus = this.getActiveBonusCells().find((cell) => cell.row === pos.row && cell.col === pos.col);
    if (bonus) {
      this.collectedStarCoreKeys.add(this.key(pos));
      this.bonusCollected = this.getActiveBonusCells().length === 0;
      WeChatService.vibrateShort('medium');
      const reward = 30 + this.getBlessingEffectLevel('star_reward') * 10;
      this.pendingBonusDiamonds += reward;
      WeChatService.showToast(`收集星核 +${reward} 💎，通关结算`, 'success');
      const node = this.starCoreNodes.get(this.key(pos));
      node?.destroy();
      this.starCoreNodes.delete(this.key(pos));
      this.bonusNode = this.starCoreNodes.values().next().value ?? null;
      this.updateLabels();
    }
  }

  private isGoalColorMatched(goal: GoalConfig): boolean {
    return !!this.runner && (!goal.color || goal.color === 'none' || goal.color === this.runner.color);
  }

  private visitGoal(goal: GoalConfig): boolean {
    const requiredGoals = this.level?.goals.filter((item) => item.required) ?? [];
    if (requiredGoals.length === 0) {
      return true;
    }
    const key = posKey(goal);
    if (!this.litGoalKeys.has(key)) {
      this.litGoalKeys.add(key);
      goal.lit = true;
      AnalyticsService.track('goal_lit', { levelId: this.level?.id ?? 0, row: goal.row, col: goal.col, lit: this.litGoalKeys.size, total: requiredGoals.length });
      this.setStatus(`灯塔已点亮 ${this.litGoalKeys.size}/${requiredGoals.length}，继续接通剩余光点。`);
    }
    return requiredGoals.every((item) => this.litGoalKeys.has(posKey(item)));
  }

  private afterRunnerStep(): void {
    this.runnerStepCount++;
    this.resolveUnstableCells();
  }

  private resolveUnstableCells(): void {
    if (!this.level || !this.grid || !this.runner || !this.level.unstableCells) {
      return;
    }
    for (const cell of this.level.unstableCells) {
      if (cell.collapseAfterSteps < 0 || this.runnerStepCount < cell.collapseAfterSteps) {
        continue;
      }
      cell.collapseAfterSteps = -1;
      this.grid.setTile(cell, null);
      this.grid.setObstacle(cell, true);
      this.tileNodes.get(this.key(cell))?.destroy();
      this.tileNodes.delete(this.key(cell));
      AnalyticsService.track('unstable_collapse', { levelId: this.level.id, row: cell.row, col: cell.col, step: this.runnerStepCount });
      if (this.runner.row === cell.row && this.runner.col === cell.col) {
        this.handleDead('未来影子坍塌命中');
        return;
      }
      this.setStatus('未来影子坍塌了一块浮岛，提前规划路线！');
    }
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
    } else if (config.skill === 'jump') {
      this.currentBulletTime = Math.min(this.maxBulletTime + 2, this.currentBulletTime + 0.6);
      this.redrawBulletTimeMeter();
      WeChatService.showToast('跃迁水晶：跳过危险格', 'success');
      this.setStatus('跃迁水晶触发，流光跳过前方一格。');
    } else if (config.skill === 'blackhole') {
      this.hand = this.cardSystem.redrawAll();
      this.renderCards();
      WeChatService.showToast('黑洞水晶：吞掉卡手牌', 'success');
      this.setStatus('黑洞水晶触发，手牌已全部净化重抽。');
    } else if (config.skill === 'splitter') {
      const reward = 12 + this.getBlessingEffectLevel('star_reward') * 4;
      this.pendingBonusDiamonds += reward;
      WeChatService.showToast(`分光连锁 +${reward} 💎`, 'success');
      this.setStatus('分光水晶触发，多目标关会更容易点亮全部灯塔。');
    }
    AnalyticsService.track('skill_trigger', { levelId: this.level?.id ?? 0, skill: config.skill, tile: tile.type });
    ProfileManager.addTileMastery(tile.type, 1);
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
    const baseCol = this.runnerSkinColor(this.colorForRunner(this.runner?.color ?? 'none'));

    if (!this.powerSaveMode) {
      for (let i = 1; i <= 4; i++) {
        const ghostPos = startPos.clone().lerp(endPos, i * 0.2);
        this.spawnTrailGhost(ghostPos, baseCol, 0.02 * i);
      }
    }

    // 高速飞驰光子彗星 (0.08s 极速过山车式穿引)
    tween(this.runnerNode)
      .to(0.08, { position: endPos }, { easing: 'quadOut' })
      .call(() => {
        this.spawnLandingRipple(endPos, baseCol);
        this.isResolving = false;
        onDone();
      })
      .start();
  }

  private spawnTrailGhost(pos: Vec3, color: Color, delay: number): void {
    if (!this.runnerRoot || this.powerSaveMode) return;
    const trailColor = this.trailSkinColor(color);
    const ghost = new Node('TrailGhost');
    ghost.layer = Layers.Enum.UI_2D;
    ghost.setParent(this.runnerRoot);
    ghost.setPosition(pos);
    ghost.addComponent(UITransform).setContentSize(40, 40);
    const graphics = ghost.addComponent(Graphics);
    graphics.fillColor = new Color(trailColor.r, trailColor.g, trailColor.b, 140);
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

  private trailSkinColor(defaultColor: Color): Color {
    const trail = ProfileManager.getProfile().selectedTrail || 'trail_default';
    if (trail === 'trail_aurora') return this.hex('#67E8F9');
    if (trail === 'trail_sakura') return this.hex('#FDA4AF');
    if (trail === 'trail_neon') return this.hex('#C084FC');
    return defaultColor;
  }

  private spawnLandingRipple(pos: Vec3, color: Color): void {
    if (!this.runnerRoot || this.powerSaveMode) return;

    // 1. 动感晶石受击多米诺弹跳 (Pinball Crystal Bounce)
    if (this.runner) {
      const tileNode = this.tileNodes.get(this.key(this.runner));
      if (tileNode) {
        tween(tileNode)
          .to(0.04, { scale: new Vec3(1.24, 1.24, 1) }, { easing: 'quadOut' })
          .to(0.08, { scale: new Vec3(1.0, 1.0, 1) }, { easing: 'bounceOut' })
          .start();
      }
    }
    WeChatService.vibrateShort('light');

    // 2. 轻柔流光微圈
    const ripple = new Node('LandingRipple');
    ripple.layer = Layers.Enum.UI_2D;
    ripple.setParent(this.runnerRoot);
    ripple.setPosition(pos);
    ripple.addComponent(UITransform).setContentSize(44, 44);
    const graphics = ripple.addComponent(Graphics);
    graphics.strokeColor = new Color(color.r, color.g, color.b, 145);
    graphics.lineWidth = 2.0;
    graphics.circle(0, 0, 14);
    graphics.stroke();

    tween(ripple)
      .to(0.20, { scale: new Vec3(1.65, 1.65, 1) }, { easing: 'quadOut' })
      .call(() => ripple.destroy())
      .start();

    // 3. 4 向高能火花微粒飞溅
    for (let i = 0; i < 4; i++) {
      const spark = new Node('Spark');
      spark.layer = Layers.Enum.UI_2D;
      spark.setParent(this.runnerRoot);
      spark.setPosition(pos);
      const sg = spark.addComponent(Graphics);
      sg.fillColor = this.hex('#FFFFFF');
      sg.circle(0, 0, 3.2);
      sg.fill();
      const angle = (Math.PI * 2 * i) / 4 + Math.random() * 0.4;
      const dist = 36 + Math.random() * 14;
      const targetPos = pos.clone().add3f(Math.cos(angle) * dist, Math.sin(angle) * dist, 0);
      tween(spark)
        .to(0.18, { position: targetPos, scale: new Vec3(0.2, 0.2, 1) }, { easing: 'quadOut' })
        .call(() => spark.destroy())
        .start();
    }
  }

  private spawnPlacementPulse(pos: { row: number; col: number }): void {
    if (!this.boardRoot || this.powerSaveMode) return;
    const localPos = this.gridToLocal(pos);
    const pulse = new Node('PlacementPulse');
    pulse.layer = Layers.Enum.UI_2D;
    pulse.setParent(this.boardRoot);
    pulse.setPosition(localPos.x, localPos.y, 10);
    pulse.addComponent(UITransform).setContentSize(100, 60);
    const g = pulse.addComponent(Graphics);
    g.strokeColor = this.hex('#29BDE0');
    ((g.strokeColor) as any).a = 210;
    g.lineWidth = 2.4;
    g.ellipse(0, 0, 48, 26);
    g.stroke();
    g.fillColor = new Color(41, 189, 224, 45);
    g.ellipse(0, 0, 48, 26);
    g.fill();

    tween(pulse)
      .to(0.28, { scale: new Vec3(1.6, 1.6, 1) }, { easing: 'quadOut' })
      .call(() => pulse.destroy())
      .start();
  }

  private getPlacementSuccessText(): string {
    const completed = this.isPathCompleted();
    if (!this.isEndlessMode && !this.isDailyChallenge && this.levelIndex === 0) {
      return completed
        ? '接上了第一束光！现在点「启动流光」，看它冲向终点。'
        : '水晶已放好，青色光轨会帮你判断能不能接通。';
    }
    if (!this.isEndlessMode && !this.isDailyChallenge && this.levelIndex <= 2) {
      return completed
        ? '青色光轨已接通，点「启动流光」完成这一关。'
        : '已补充 1.2s 子弹时间。看青色预览线，必要时旋转水晶。';
    }
    if (this.isDailyChallenge) {
      return completed
        ? '今日光路已接通，启动后冲榜比步数。'
        : '已补充 1.2s 子弹时间。少走一步，排名就更靠前。';
    }
    return completed
      ? '光路已接通，启动流光完成结算。'
      : '放置成功！已补充 1.2s 子弹时间。可继续铺路或启动流光。';
  }

  private handleSuccess(): void {
    if (!this.runner || !this.level || this.runner.state === 'SUCCESS') {
      return;
    }
    this.runner.state = 'SUCCESS';
    WeChatService.vibrateShort('medium');

    if (!this.powerSaveMode) {
      this.playSanctumAwakeningCeremony(this.runner);
      this.spawnConfettiExplosion(this.gridToLocal(this.runner));
    }

    if (this.isDailyChallenge) {
      const score = Math.max(10, 100 - this.usedMoves * 8 + this.currentBulletTime * 5);
      const dateKey = CloudGameService.getTodayKey();
      const dailyScore = Math.floor(score);
      ProfileManager.updateDailyChallengeBest(dateKey, dailyScore, this.usedMoves);
      ProfileManager.recordLevelResult(this.level.id, true, this.usedMoves);
      const engagementSummary = this.applyEngagementSuccessRewards(Math.min(3, this.calculateStars()));
      const leaderboard = CloudGameService.submitDailyChallenge(dateKey, dailyScore, this.usedMoves);
      AnalyticsService.track('daily_success', { levelId: this.level.id, score: dailyScore, moves: this.usedMoves, beatPercent: leaderboard.beatPercent });
      const reward = this.usedMoves <= this.level.recommendedMoves ? 80 : 50;
      const totalReward = reward + this.pendingBonusDiamonds;
      ProfileManager.addDiamonds(totalReward);
      this.triggerVictoryShockwave();
      const estGlobalBeat = Math.min(99, Math.max(55, 96 - Math.max(0, this.usedMoves - 4) * 4));
      const beatLabel = leaderboard.beatPercent > 0 ? leaderboard.beatPercent : estGlobalBeat;
      this.setStatus(`每日一束光完成！${this.usedMoves} 步（超越 ${beatLabel}% 玩家），晶核 +${totalReward} 💎。${engagementSummary}`);
      this.updateLabels();
      WeChatService.showToast(`每日一束光通关 +${totalReward} 晶核`, 'success');
      if (this.onShowVictoryPosterCallback) {
        this.onShowVictoryPosterCallback(this.level.id, this.level.name, Math.min(3, this.calculateStars()), this.usedMoves);
      }
      return;
    }

    if (this.isEndlessMode) {
      this.endlessStageIndex++;
      const stageScore = 100 + Math.max(0, (this.level.recommendedMoves - this.usedMoves) * 15);
      this.endlessScore += stageScore;
      ProfileManager.updateEndlessBest(this.endlessStageIndex, this.endlessScore);
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
    ProfileManager.recordLevelResult(this.level.id, true, this.usedMoves);
    ProfileManager.recordJourneyStars(this.level.id, stars);
    const engagementSummary = this.applyEngagementSuccessRewards(stars);
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
    this.unlockMetaTitles(stars);
    const beatPercent = this.estimateFriendBeatPercent(stars, this.usedMoves);
    this.setStatus(`通关！${stars} 星，晶核 +${reward + this.pendingBonusDiamonds + assistBonus} 💎，击败 ${beatPercent}% 好友！${engagementSummary}`);
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
    if (!this.powerSaveMode) {
      this.playVictoryPathSweep();
    }
    const isChapterEnd = (this.levelIndex + 1) % 5 === 0;
    const showPoster = () => {
      if (this.onShowVictoryPosterCallback && this.level) {
        this.onShowVictoryPosterCallback(this.level.id, this.level.name, stars, this.usedMoves);
      }
    };
    if (isChapterEnd) {
      this.showBlessingChoice(showPoster);
    } else if (this.levelIndex >= 2 && this.onShowVictoryPosterCallback) {
      // Every level from Level 3 onward opens lightweight VictoryPoster (star ceremony + x2 ad hook + 1-tap next level)
      this.scheduleOnce(showPoster, 0.52);
    } else {
      // Levels 1-2: ultra-snappy seamless advance into Level 2/3 in the first 30 seconds
      this.scheduleOnce(() => {
        if (this.boardRoot) {
          tween(this.boardRoot)
            .to(0.22, { scale: new Vec3(0.92, 0.92, 1) }, { easing: 'quadIn' })
            .call(() => {
              this.loadLevel(this.levelIndex + 1);
            })
            .start();
        } else {
          this.loadLevel(this.levelIndex + 1);
        }
      }, 0.85);
    }
  }

  private playVictoryPathSweep(): void {
    if (!this.grid || !this.runner || !this.level) return;
    const sim = RouteSimulator.simulate(this.grid, this.runner, this.level.goals);
    const pts = sim.path.slice(0, 14);
    pts.forEach((p, idx) => {
      this.scheduleOnce(() => {
        if (!this.runnerRoot || !this.runnerRoot.isValid) return;
        const spark = new Node('SweepSpark');
        spark.layer = Layers.Enum.UI_2D;
        spark.setParent(this.runnerRoot);
        spark.setPosition(this.gridToLocal(p).add3f(0, 0, 12));
        const g = spark.addComponent(Graphics);
        g.fillColor = new Color(254, 240, 138, 220);
        g.circle(0, 0, 8);
        g.fill();
        g.fillColor = this.hex('#FFFFFF');
        g.circle(0, 0, 4);
        g.fill();
        tween(spark)
          .to(0.24, { scale: new Vec3(0.1, 0.1, 1) }, { easing: 'quadOut' })
          .call(() => spark.destroy())
          .start();
      }, idx * 0.032);
    });
  }

  private showBlessingChoice(onDone: () => void): void {
    if (this.blessingOverlayNode || this.isDailyChallenge || this.isEndlessMode) {
      onDone();
      return;
    }

    const optionPool: BlessingOption[] = [
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
      {
        id: 'mirror_chain',
        title: '镜像连锁',
        desc: '镜像水晶更容易出现，适合复制关键转弯。',
        color: '#C084FC',
      },
      {
        id: 'blackhole_flow',
        title: '黑洞净化',
        desc: '黑洞水晶更容易出现，能吞掉卡手牌。',
        color: '#F97316',
      },
    ];
    const options = optionPool
      .map((option) => ({ option, roll: Math.random() }))
      .sort((a, b) => a.roll - b.roll)
      .slice(0, 3)
      .map((entry) => entry.option);

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
    const palette = getUiPalette(this.currentTheme);
    g.fillColor = new Color(5, 10, 25, 205);
    g.rect(-halfW, -halfH, size.width, size.height);
    g.fill();
    g.fillColor = this.hex(palette.panel);
    ((g.fillColor) as any).a = 248;
    g.roundRect(-310, -260, 620, 520, 34);
    g.fill();
    g.fillColor = this.hex(palette.panelSoft);
    ((g.fillColor) as any).a = 60;
    g.roundRect(-292, -242, 584, 484, 28);
    g.fill();
    g.strokeColor = this.hex(palette.gold);
    g.lineWidth = 2.8;
    g.roundRect(-310, -260, 620, 520, 34);
    g.stroke();

    this.createOverlayLabel(overlay, 'BlessingTitle', new Vec3(0, 196, 141), '选择一个流光祝福', 28, palette.text, 520, 42);
    this.createOverlayLabel(overlay, 'BlessingSub', new Vec3(0, 158, 141), '通关后的永久成长：本次选择会升级对应祝福', 17, palette.gold, 560, 30);
    this.createOverlayLabel(overlay, 'BlessingTip', new Vec3(0, 126, 141), '从下一关开始生效，影响水晶出现概率、补时或晶核收益。', 15, palette.muted, 560, 26);

    options.forEach((option, idx) => {
      const y = 54 - idx * 102;
      const row = new Node(`Blessing_${option.id}`);
      row.layer = Layers.Enum.UI_2D;
      row.setParent(overlay);
      row.setPosition(new Vec3(0, y, 141));
      row.addComponent(UITransform).setContentSize(540, 82);
      const rg = row.addComponent(Graphics);
      rg.fillColor = this.hex(palette.panelSoft);
      ((rg.fillColor) as any).a = 242;
      rg.roundRect(-270, -41, 540, 82, 22);
      rg.fill();
      rg.strokeColor = this.hex(option.color);
      rg.lineWidth = 2.2;
      rg.stroke();

      const level = ProfileManager.getBlessingLevel(option.id);
      this.createOverlayLabel(row, 'Title', new Vec3(-130, 14, 1), `${option.title}  Lv.${level + 1}`, 21, '#FFFFFF', 250, 30);
      this.createOverlayLabel(row, 'Desc', new Vec3(-70, -18, 1), option.desc, 15, '#CBD5E1', 370, 24);
      this.createOverlayLabel(row, 'Pick', new Vec3(205, 0, 1), '升级', 18, option.color, 90, 34);

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

  private applyEngagementSuccessRewards(stars: number): string {
    if (!this.level) {
      return '';
    }

    const beautyScore = EngagementService.scoreBeautifulRoute(this.usedMoves, this.skillComboCount, this.bonusCollected, stars);
    const isBestBeauty = ProfileManager.updateBeautifulRouteBest(beautyScore);
    const mail = EngagementService.getLightMail(this.level, this.usedMoves);
    if (isBestBeauty && beautyScore >= 82) {
      const reward = EngagementService.pickCosmeticReward(this.skillComboCount, this.bonusCollected, !!this.residualAssistId);
      if (reward.kind === 'island_decor') {
        ProfileManager.addIslandDecor(reward.id);
      } else {
        ProfileManager.unlockCosmetic(reward.id);
      }
      WeChatService.showToast(`解锁${reward.name}：${reward.unlockText}`, 'success');
    }

    if (this.commuteStage >= 0) {
      const challenge = EngagementService.getCommuteChallenge();
      const dateKey = CloudGameService.getTodayKey();
      const doneCount = ProfileManager.recordCommuteStage(dateKey, this.commuteStage);
      if (doneCount >= challenge.stages.length && ProfileManager.claimCommuteReward(dateKey, challenge.reward)) {
        ProfileManager.unlockCosmetic('trail_aurora');
        WeChatService.showToast(`${challenge.title}完成 +${challenge.reward} 💎`, 'success');
      }
    }

    return `${mail} 光轨美感 ${beautyScore} 分。`;
  }

  private unlockMetaTitles(stars: number): void {
    const titles: string[] = [];
    if (stars >= 3) titles.push('完美接光者');
    if (this.skillComboCount >= 3) titles.push('流派连锁大师');
    if (this.level?.objective === 'light_all_goals') titles.push('灯塔唤醒者');
    for (const title of titles) {
      if (ProfileManager.unlockTitle(title)) {
        AnalyticsService.track('meta_title_unlock', { title, levelId: this.level?.id ?? 0 });
        WeChatService.showToast(`获得称号：${title}`, 'success');
      }
    }
  }

  private triggerVictoryShockwave(): void {
    if (this.powerSaveMode) {
      return;
    }
    this.showFlowCompleteBanner();
  }

  private showFlowCompleteBanner(): void {
    const banner = new Node('FlowCompleteBanner');
    banner.layer = Layers.Enum.UI_2D;
    banner.setParent(this.node);
    banner.setPosition(new Vec3(0, 100, 92));
    banner.addComponent(UITransform).setContentSize(460, 100);
    this.createOverlayLabel(banner, 'Title', new Vec3(0, 20, 1), 'FLOW COMPLETE', 28, '#FFFFFF', 420, 44);
    this.createOverlayLabel(banner, 'Sub', new Vec3(0, -20, 1), '✦ 极光回路·完美接通 ✦', 20, '#29BDE0', 360, 34);
    banner.setScale(new Vec3(0.82, 0.82, 1));
    tween(banner)
      .to(0.18, { scale: new Vec3(1.05, 1.05, 1) }, { easing: 'backOut' })
      .delay(0.45)
      .to(0.18, { scale: new Vec3(0.92, 0.92, 1) }, { easing: 'quadIn' })
      .call(() => banner.destroy())
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
    WeChatService.vibrateShort('heavy');
    this.runner.state = 'DEAD';
    const preview = this.grid && this.level ? RouteSimulator.simulate(this.grid, this.runner, this.level.goals) : null;
    this.lastFailureInsight = EngagementService.analyzeFailure(reason, this.runner, this.level?.goals ?? [], preview?.path ?? []);
    this.showFailureReplayMarker(this.lastFailureInsight.missingCell ?? null);
    ProfileManager.recordLevelResult(this.level?.id ?? this.levelIndex + 1, false, this.usedMoves, reason);
    AnalyticsService.track('level_fail', { levelId: this.level?.id ?? 0, moves: this.usedMoves, reason, grade: this.lastFailureInsight.grade, daily: this.isDailyChallenge, endless: this.isEndlessMode });
    this.setStatus(`${this.lastFailureInsight.grade}：${reason}。${this.lastFailureInsight.rescueText}`);
    this.updateLabels();

    if (this.isEndlessMode && !this.isDailyChallenge) {
      ProfileManager.updateEndlessBest(this.endlessStageIndex, this.endlessScore);
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
        grade: this.lastFailureInsight.grade,
        rescueText: this.lastFailureInsight.rescueText,
        shareText: this.lastFailureInsight.shareText,
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

  private showFailureReplayMarker(pos: GridPos | null): void {
    if (!pos || !this.boardRoot || !this.grid || !this.grid.isValid(pos) || this.powerSaveMode) {
      return;
    }
    if (this.hintHighlightNode) {
      this.hintHighlightNode.destroy();
      this.hintHighlightNode = null;
    }
    const marker = new Node('FailureReplayMarker');
    marker.layer = Layers.Enum.UI_2D;
    marker.setParent(this.boardRoot);
    marker.setPosition(this.gridToLocal(pos).add3f(0, 0, 8));
    marker.addComponent(UITransform).setContentSize(this.tileWidth, this.tileHeight);
    const g = marker.addComponent(Graphics);
    g.fillColor = new Color(255, 59, 48, 50);
    g.circle(0, 0, 42);
    g.fill();
    g.strokeColor = this.hex('#FF3B30');
    g.lineWidth = 5;
    g.circle(0, 0, 42);
    g.stroke();
    this.hintHighlightNode = marker;
    tween(marker)
      .to(0.45, { scale: new Vec3(1.18, 1.18, 1) }, { easing: 'sineInOut' })
      .to(0.45, { scale: new Vec3(1, 1, 1) }, { easing: 'sineInOut' })
      .union()
      .repeat(3)
      .start();
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
    const configuredStars = this.level.starCores?.length ?? (this.bonusCell ? 1 : 0);
    const collectedCount = Math.max(this.collectedStarCoreKeys.size, this.previewLitStars);

    if (configuredStars > 0) {
      if (collectedCount >= configuredStars) {
        return 3;
      }
      if (collectedCount >= 1) {
        return 2;
      }
      return 1;
    }

    let stars = 1;
    if (this.usedMoves <= this.level.recommendedMoves + 4) {
      stars++;
    }
    if (this.usedMoves <= this.level.recommendedMoves + 2) {
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
    const baseCol = this.runnerSkinColor(this.colorForRunner(this.runner.color));

    // 1. 光之灵双层极光光晕 (Ethereal Dual-Layer Aurora Corona)
    graphics.fillColor = new Color(baseCol.r, baseCol.g, baseCol.b, 55);
    graphics.circle(0, 0, 26);
    graphics.fill();
    graphics.fillColor = new Color(baseCol.r, baseCol.g, baseCol.b, 110);
    graphics.circle(0, 0, 19);
    graphics.fill();

    // 2. 灵动晶透光球本体 (Luminescent Fairy Core)
    graphics.fillColor = new Color(baseCol.r, baseCol.g, baseCol.b, 230);
    graphics.circle(0, 0, 15);
    graphics.fill();
    graphics.strokeColor = this.hex('#FFFFFF');
    graphics.lineWidth = 1.8;
    graphics.circle(0, 0, 15);
    graphics.stroke();

    // 3. 超纯白炽热能量光核 (Pure White Starlight Heart)
    graphics.fillColor = this.hex('#FFFFFF');
    graphics.circle(0, 0, 8);
    graphics.fill();

    // 4. 十字芒星高光与灵光微闪 (Cross Starlight Flares)
    graphics.strokeColor = this.hex('#FFFFFF');
    graphics.lineWidth = 1.6;
    graphics.moveTo(-13, 0); graphics.lineTo(13, 0);
    graphics.moveTo(0, -13); graphics.lineTo(0, 13);
    graphics.stroke();

    // 晶体折射反光高光点
    graphics.fillColor = new Color(255, 255, 255, 235);
    graphics.circle(-4, 4, 3.2);
    graphics.fill();
  }

  private runnerSkinColor(defaultColor: Color): Color {
    const skin = ProfileManager.getProfile().selectedRunnerSkin || 'runner_default';
    if (skin === 'runner_crystal_cat') return this.hex('#F9A8D4');
    if (skin === 'runner_paper_plane') return this.hex('#BAE6FD');
    return defaultColor;
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

    // 4. Clean subtle top glass specular sheen (no cluttered corner brackets)
    if (shadowDepth > 0) {
      g.fillColor = new Color(255, 255, 255, 34);
      g.roundRect(offsetX - halfW + 10, offsetY + halfH - 9, w - 20, 4, 2);
      g.fill();
    }
  }

  private drawDiamond(graphics: Graphics, fill: Color, stroke: Color, lineWidth: number): void {
    // Single clean frosted crystal prism module (no dark double-nested square box)
    this.drawTopDownTile(graphics, fill, stroke, lineWidth, this.tileWidth * 0.88, this.tileHeight * 0.88, 0, 0, 4);
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

  private drawTileArrow(graphics: Graphics, tile: TileInstance, offsetY = 0, scale = 1, offsetX = 0, lineBaseLength = 44, isLit = false, dimmed = false, faded = false): void {
    const config = resolveTileConfig(tile);
    const isRose = this.currentTheme === 1;
    const isGold = this.currentTheme === 2;

    const conduitColor = isLit
      ? this.hex('#FDE047')
      : (dimmed
        ? (tile.type === 'curve' ? this.hex('#5EEAD4') : (tile.type === 'cross' ? this.hex('#A5B4FC') : this.hex(isRose ? '#93C5FD' : (isGold ? '#5EEAD4' : '#7DD3FC'))))
        : (tile.type === 'curve'
          ? this.hex('#34D399')
          : this.hex(isRose ? '#5EEAD4' : (isGold ? '#2DD4BF' : '#38BDF8'))));
    if (dimmed && !isLit) {
      ((conduitColor as any)).a = faded ? 78 : 205;
    }
    const outerHaloColor = isLit
      ? this.hex('#F59E0B')
      : (tile.type === 'curve'
        ? this.hex('#10B981')
        : this.hex(isRose ? '#5EEAD4' : (isGold ? '#F59E0B' : '#0EA5E9')));

    for (const [input, output] of Object.entries(config.routing)) {
      if (!output || output === 'dead') {
        continue;
      }
      const start = this.directionPoint(input, -lineBaseLength * scale).add3f(offsetX, offsetY, 0);
      const end = this.directionPoint(output, lineBaseLength * scale).add3f(offsetX, offsetY, 0);

      // 1. 最外层极光色谱漫反射光雾 (Unlit dimmed tiles skip heavy halo so lit gold path pops cleanly!)
      if (!dimmed || isLit) {
        const aura = new Color(outerHaloColor.r, outerHaloColor.g, outerHaloColor.b, isLit ? 82 : 55);
        graphics.strokeColor = aura;
        graphics.lineWidth = (isLit ? 17 : 15) * scale;
        graphics.moveTo(start.x, start.y);
        graphics.lineTo(offsetX, offsetY);
        graphics.lineTo(end.x, end.y);
        graphics.stroke();
      }

      // 2. 中层导光管 (Muted slate-cyan when unlit; radiant neon when lit or in hand preview)
      graphics.strokeColor = conduitColor;
      graphics.lineWidth = (dimmed && !isLit ? 5.2 : 7.5) * scale;
      graphics.moveTo(start.x, start.y);
      graphics.lineTo(offsetX, offsetY);
      graphics.lineTo(end.x, end.y);
      graphics.stroke();

      // 3. 内层能量核心流 (Soft muted sheen on unlit board tiles; dazzling white core when lit)
      const innerCol = this.hex('#FFFFFF');
      if (dimmed && !isLit) {
        ((innerCol as any)).a = faded ? 32 : 85;
      }
      graphics.strokeColor = innerCol;
      graphics.lineWidth = (dimmed && !isLit ? 1.8 : 3.2) * scale;
      graphics.moveTo(start.x, start.y);
      graphics.lineTo(offsetX, offsetY);
      graphics.lineTo(end.x, end.y);
      graphics.stroke();

      // 4. 端点能量接口晶珠
      graphics.fillColor = conduitColor;
      graphics.circle(start.x, start.y, (dimmed && !isLit ? 3.2 : 4.5) * scale);
      graphics.circle(end.x, end.y, (dimmed && !isLit ? 3.2 : 4.5) * scale);
      graphics.fill();
      if (!dimmed || isLit) {
        graphics.fillColor = this.hex('#FFFFFF');
        graphics.circle(start.x, start.y, 2.2 * scale);
        graphics.circle(end.x, end.y, 2.2 * scale);
        graphics.fill();
      }
    }

    // 中心回旋节点：未连通保持内敛冷光，连通时点亮鎏金星钻！
    const gemCol = isLit
      ? this.hex('#FDE047')
      : (dimmed
        ? this.hex('#64748B')
        : this.hex(isGold ? '#FFD76A' : (isRose ? '#FDF2F8' : '#A5F3FC')));
    if (dimmed && !isLit) {
      ((gemCol as any)).a = 175;
    }
    const gemSize = dimmed && !isLit ? 5.5 : 8;
    graphics.fillColor = gemCol;
    graphics.moveTo(offsetX, offsetY + gemSize * scale);
    graphics.lineTo(offsetX + (gemSize - 1) * scale, offsetY);
    graphics.lineTo(offsetX, offsetY - gemSize * scale);
    graphics.lineTo(offsetX - (gemSize - 1) * scale, offsetY);
    graphics.close();
    graphics.fill();

    if (!dimmed || isLit) {
      graphics.strokeColor = this.hex('#FFFFFF');
      graphics.lineWidth = 1.2 * scale;
      graphics.moveTo(offsetX, offsetY + 8 * scale);
      graphics.lineTo(offsetX + 7 * scale, offsetY);
      graphics.lineTo(offsetX, offsetY - 8 * scale);
      graphics.lineTo(offsetX - 7 * scale, offsetY);
      graphics.close();
      graphics.stroke();

      graphics.strokeColor = this.hex('#FFFFFF');
      graphics.lineWidth = 1.5 * scale;
      graphics.moveTo(offsetX - 10 * scale, offsetY);
      graphics.lineTo(offsetX + 10 * scale, offsetY);
      graphics.moveTo(offsetX, offsetY - 10 * scale);
      graphics.lineTo(offsetX, offsetY + 10 * scale);
      graphics.stroke();
    }
  }

  private drawSkillBadge(graphics: Graphics, type: TileType, offsetX = 0, offsetY = 0): void {
    const config = resolveTileConfig({ type, rotation: 0 });
    if (!config.skill) {
      return;
    }
    const badgeY = offsetY + 30;
    const badgeColor = this.skillColor(config.skill);
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
    } else if (config.skill === 'star' || config.skill === 'splitter') {
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

  private skillColor(skill: string): Color {
    switch (skill) {
      case 'time':
        return this.hex('#22D3EE');
      case 'star':
      case 'splitter':
        return this.hex('#FDE047');
      case 'mirror':
        return this.hex('#C084FC');
      case 'vine':
        return this.hex('#84CC16');
      case 'jump':
        return this.hex('#FB7185');
      case 'blackhole':
        return this.hex('#F97316');
      case 'refresh':
      default:
        return this.hex('#34D399');
    }
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
    const palette = getUiPalette(this.currentTheme);
    const tileCol = this.tileColor(type);
    // 普通状态使用低饱和低亮度玻璃边框；仅在选中/预备放置时赋予金黄极光高光！
    const border = selected ? this.hex(palette.gold) : this.hex(palette.panelBorder);

    // Glassmorphic card base plate: readable but calmer than the board tiles.
    graphics.fillColor = this.hex(palette.panelSoft);
    ((graphics.fillColor) as any).a = selected ? 255 : 240;
    graphics.roundRect(-this.cardWidth / 2, -this.cardHeight / 2, this.cardWidth, this.cardHeight, 18);
    graphics.fill();
    graphics.fillColor = new Color(tileCol.r, tileCol.g, tileCol.b, selected ? 100 : 70);
    graphics.roundRect(-this.cardWidth / 2 + 6, -this.cardHeight / 2 + 6, this.cardWidth - 12, this.cardHeight - 12, 14);
    graphics.fill();
    graphics.strokeColor = border;
    ((graphics.strokeColor) as any).a = selected ? 255 : 175;
    graphics.lineWidth = selected ? 3.8 : 1.6;
    graphics.roundRect(-this.cardWidth / 2, -this.cardHeight / 2, this.cardWidth, this.cardHeight, 18);
    graphics.stroke();

    // Label strip keeps card names legible without making the whole card look disabled.
    graphics.fillColor = this.hex(palette.panel);
    ((graphics.fillColor) as any).a = 238;
    graphics.roundRect(-this.cardWidth / 2 + 6, -this.cardHeight / 2 + 6, this.cardWidth - 12, 26, 8);
    graphics.fill();

    // Bottom right charge badge.
    graphics.fillColor = this.hex(palette.violet);
    ((graphics.fillColor) as any).a = selected ? 210 : 165;
    graphics.roundRect(this.cardWidth / 2 - 36, -this.cardHeight / 2 + 36, 30, 20, 10);
    graphics.fill();
    graphics.strokeColor = this.hex(palette.violet);
    ((graphics.strokeColor) as any).a = 180;
    graphics.lineWidth = 1.5;
    graphics.roundRect(this.cardWidth / 2 - 36, -this.cardHeight / 2 + 36, 30, 20, 10);
    graphics.stroke();

    // Top specular line and selected glow.
    graphics.strokeColor = new Color(255, 255, 255, selected ? 138 : 96);
    graphics.lineWidth = 2.2;
    graphics.moveTo(-this.cardWidth / 2 + 15, this.cardHeight / 2 - 2);
    graphics.lineTo(this.cardWidth / 2 - 15, this.cardHeight / 2 - 2);
    graphics.stroke();
    if (selected) {
      graphics.fillColor = new Color(border.r, border.g, border.b, 24);
      graphics.roundRect(-this.cardWidth / 2 - 5, -this.cardHeight / 2 - 5, this.cardWidth + 10, this.cardHeight + 10, 22);
      graphics.fill();
    }

    // Glowing backdrop aura behind the crystal inside the card
    const topCol = tileCol;
    graphics.fillColor = new Color(topCol.r, topCol.g, topCol.b, selected ? 178 : 148);
    graphics.circle(0, 18, 40);
    graphics.fill();
    graphics.fillColor = new Color(255, 255, 255, 92);
    graphics.circle(0, 18, 24);
    graphics.fill();

    // Big bright 3D isometric crystal in upper area (offsetY = 14, brighter side walls)
    this.drawIsometricPlatform(graphics, topCol, this.darken(topCol, 0.78), this.darken(topCol, 0.96), this.hex('#EAF6FF'), 3.2, 15, 88, 52, 18);
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
      case 'mirror':
        return this.hex('#C084FC');
      case 'vine':
        return this.hex('#84CC16');
      case 'jump':
        return this.hex('#FB7185');
      case 'blackhole':
        return this.hex('#F97316');
      case 'splitter':
        return this.hex('#FACC15');
      case 'paint_red':
      case 'gate_red':
        return this.hex('#EF4444');
      case 'paint_blue':
      case 'gate_blue':
        return this.hex('#3B82F6');
      case 'time_crystal':
        return this.hex('#F59E0B');
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
        this.levelLabel.string = '每日一束光';
      } else if (this.isEndlessMode) {
        this.levelLabel.string = `无尽 · 第 ${this.endlessStageIndex + 1} 域`;
      } else {
        this.levelLabel.string = `第 ${this.levelIndex + 1} 关 · ${this.level.name}`;
      }
    }

    if (this.starPreviewLabel && this.level) {
      const connected = this.isRouteCurrentlyConnected();
      const predStars = connected ? this.calculateStars() : 0;
      const starIcons = predStars === 3 ? '★★★' : (predStars === 2 ? '★★☆' : (predStars === 1 ? '★☆☆' : '☆☆☆'));
      this.starPreviewLabel.string = `${starIcons} · ${this.usedMoves}步`;
      this.starPreviewLabel.color = predStars === 3
        ? this.hex('#FDE047')
        : (predStars > 0 ? this.hex('#38BDF8') : this.hex('#E2E8F0'));
    }

    const activeStars = this.getActiveBonusCells();
    const totalStars = activeStars.length;
    const unlitStars = Math.max(0, totalStars - this.previewLitStars);

    if (this.constellationLabel && this.level) {
      if (this.isDailyChallenge) {
        this.constellationLabel.string = totalStars > 0
          ? `✦ 今日同题冲榜 · 1★通关 · 3★全收星核 (${this.previewLitStars}/${totalStars}) · 步数越少榜越前`
          : `✦ 今日同题冲榜 · 三星基准 ≤${this.level.recommendedMoves + 2}步 · 步数越少排名越高`;
      } else if (this.isEndlessMode) {
        this.constellationLabel.string = `✦ 无尽星海 · 当前光能 ${this.endlessScore} · 破障锤 x${this.hammerCharges}`;
      } else {
        const chapterNames = ['天鹅座', '灵鹿座', '星鲸座', '天琴座', '凤凰座', '苍穹座'];
        const chapterIdx = Math.floor(this.levelIndex / 5);
        const chapterName = chapterNames[chapterIdx % chapterNames.length];
        const stageInChapter = (this.levelIndex % 5) + 1;
        this.constellationLabel.string = totalStars > 0
          ? `✦ ${chapterName}(${stageInChapter}/5) · 1★通关 · 2★收星核 · 3★全收集`
          : `✦ ${chapterName}(${stageInChapter}/5) · 1★通关 · 2★≤${this.level.recommendedMoves + 4}步 · 3★≤${this.level.recommendedMoves + 2}步`;
      }
    }

    if (this.hammerButtonLabel) {
      this.hammerButtonLabel.string = this.hammerModeActive
        ? '🔨 点陨石!'
        : `🔨 破障(${this.hammerCharges})`;
      this.hammerButtonLabel.color = this.hammerModeActive ? this.hex('#FDE047') : this.hex('#FECDD3');
    }

    if (this.tipLabel && this.level) {
      const bonusText = this.pendingBonusDiamonds > 0 ? ` · +${this.pendingBonusDiamonds}💎` : '';
      const starText = totalStars > 0
        ? (unlitStars === 0 ? ' · ✨星核已集齐' : ` · 待收星核 ${unlitStars}/${totalStars}`)
        : '';
      const connected = this.isRouteCurrentlyConnected();
      const pct = connected ? 100 : Math.min(95, Math.round(this.previewProgressRatio * 100));
      if (connected) {
        this.tipLabel.string = `✨ 光路已贯通圣所！点击下方按钮冲关${starText}${bonusText}`;
      } else if (this.previewBlockedOnObstacle) {
        this.tipLabel.string = `⚠ 光路撞上陨石 · 点下方「破障」可击碎${starText}${bonusText}`;
      } else if (this.isEndlessMode) {
        this.tipLabel.string = `⚡ 光路连通 ${pct}% · 光能 ${this.endlessScore}${starText}${bonusText}`;
      } else {
        const anchorTip = this.lockedBridgeCount > 0 ? ' · ⚓银框星桥已锁定' : '';
        this.tipLabel.string = `⚡ 光路已连通 ${pct}%${anchorTip}${starText}${bonusText}`;
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
    if (!node || !node.isValid) {
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

    emptyCells.sort((a, b) => this.scoreHintCell(a) - this.scoreHintCell(b));

    const tilesToPlace = [...this.hand].slice(0, 3);
    if (tilesToPlace.length === 0) return null;

    const solution: { row: number; col: number; type: TileType; rotation: number }[] = [];
    const searchCells = emptyCells.slice(0, this.levelIndex <= 2 ? 36 : 18);
    const maxAttempts = this.levelIndex <= 2 ? 12000 : 1800;
    let attempts = 0;

    const dfs = (tileIdx: number): boolean => {
      if (++attempts > maxAttempts) {
        return false;
      }
      const earlyRes = RouteSimulator.simulate(this.grid!, this.runner!, this.level!.goals);
      if (earlyRes.success) {
        return true;
      }

      if (tileIdx >= tilesToPlace.length) {
        return false;
      }

      const tileType = tilesToPlace[tileIdx];

      for (let i = 0; i < searchCells.length; i++) {
        const cell = searchCells[i];
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

  private scoreHintCell(cell: GridPos): number {
    if (!this.runner || !this.level) {
      return 0;
    }
    const runnerDistance = Math.abs(cell.row - this.runner.row) + Math.abs(cell.col - this.runner.col);
    const goalDistance = Math.min(...this.level.goals.map((goal) => Math.abs(cell.row - goal.row) + Math.abs(cell.col - goal.col)));
    return runnerDistance * 0.65 + goalDistance;
  }

  private showTutorialOverlayIfNeeded(): void {
    // 仅在第 1 关做极简聚光点拨，第 2 关起完全交给流畅心流体验，零遮挡！
    if (this.isEndlessMode || this.isDailyChallenge || this.levelIndex > 0 || !this.boardRoot || !this.level || !this.grid || !this.runner) {
      return;
    }

    const solSteps = this.currentSolutionSteps;
    const misaligned = solSteps.find((s) => {
      const t = this.grid?.getTile({ row: s.row, col: s.col });
      if (!t || t.locked) return false;
      return t.rotation !== s.correctRot;
    });
    const fallbackSteps = misaligned ? [] : this.bfsSolveAllGoals(this.runner, this.level.goals, new Set(), this.grid.rows, this.grid.cols);
    const targetPos = misaligned
      ? { row: misaligned.row, col: misaligned.col }
      : (solSteps[0]
        ? { row: solSteps[0].row, col: solSteps[0].col }
        : (fallbackSteps[0] ? { row: fallbackSteps[0].row, col: fallbackSteps[0].col } : { row: this.runner.row, col: this.runner.col }));

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
    g.fillColor = new Color(10, 22, 46, 145);
    g.rect(-halfW, -halfH, size.width, size.height);
    g.fill();

    // Spotlight ring directly over the actual board crystal to rotate
    g.fillColor = new Color(253, 224, 71, 56);
    g.circle(target.x, target.y, 78);
    g.fill();
    g.strokeColor = this.hex('#FDE047');
    g.lineWidth = 5;
    g.circle(target.x, target.y, 62);
    g.stroke();
    g.strokeColor = this.hex('#FFFFFF');
    g.lineWidth = 2.2;
    g.circle(target.x, target.y, 44);
    g.stroke();

    const panelY = Math.max(-halfH + 340, Math.min(halfH - 250, target.y - 165));
    g.fillColor = this.hex('#0F274A');
    ((g.fillColor) as any).a = 242;
    g.roundRect(-285, panelY - 62, 570, 124, 28);
    g.fill();
    g.strokeColor = this.hex('#FDE047');
    g.lineWidth = 2.6;
    g.stroke();

    this.createOverlayLabel(overlay, 'TutorialTitle', new Vec3(0, panelY + 24, 121), '第一束光：轻点高亮水晶旋转', 24, '#FFFFFF', 520, 34);
    this.createOverlayLabel(overlay, 'TutorialTip', new Vec3(0, panelY - 12, 121), '每点一次顺时针转 90°，接通圣所即可过关！', 18, '#FEF08A', 520, 30);
    this.createOverlayLabel(overlay, 'TutorialDismiss', new Vec3(0, panelY - 42, 121), '轻点任意处开始（通电水晶会亮起鎏金色）', 15, '#38BDF8', 420, 24);

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
    const tier = ProfileManager.nextHintTier(this.level?.id ?? this.levelIndex + 1);
    const runHint = (autoFixCount: number) => {
      if (!this.grid || !this.level || !this.runner) return;
      const preview = RouteSimulator.simulate(this.grid, this.runner, this.level.goals);
      if (preview.success) {
        WeChatService.showToast('光路已接通，点击下方即可冲关！', 'success');
        return;
      }

      // Resolve authoritative solution steps (guaranteed solvable via bfsSolveAllGoals)
      let solSteps = this.currentSolutionSteps;
      if (solSteps.length === 0) {
        const obstacleSet = new Set<string>();
        for (const [r, c] of this.level.obstacles ?? []) {
          obstacleSet.add(`${r}:${c}`);
        }
        const bfsSteps = this.bfsSolveAllGoals(this.level.start, this.level.goals, obstacleSet, this.grid.rows, this.grid.cols);
        solSteps = bfsSteps.map((s) => {
          const t = s.inDir === s.outDir ? 'straight' as TileType : 'curve' as TileType;
          let rot = 0;
          if (t === 'straight') {
            rot = (s.inDir === 'left' || s.inDir === 'right') ? 0 : 1;
          } else {
            for (let r = 0; r < 4; r++) {
              if (resolveTileConfig({ type: 'curve', rotation: r }).routing[s.inDir] === s.outDir) {
                rot = r;
                break;
              }
            }
          }
          return { row: s.row, col: s.col, type: t, correctRot: rot };
        });
      }

      const misalignedList = solSteps.filter((s) => {
        const t = this.grid?.getTile({ row: s.row, col: s.col });
        if (!t || t.locked || !resolveTileConfig(t).rotatable) return false;
        if (isStraightType(t.type)) {
          return (t.rotation % 2) !== (s.correctRot % 2);
        }
        return t.rotation !== s.correctRot;
      });

      if (misalignedList.length === 0) {
        WeChatService.showToast('观察光束末端落点，尝试绕开陨石或使用破障！', 'none');
        return;
      }

      // Rewarded-ad hint: auto-align up to autoFixCount key crystals directly into position!
      if (autoFixCount > 0) {
        const toFix = misalignedList.slice(0, autoFixCount);
        toFix.forEach((step, idx) => {
          const pos = { row: step.row, col: step.col };
          const curTile = this.grid?.getTile(pos);
          if (!curTile) return;
          const fixedTile: TileInstance = { ...curTile, type: step.type, rotation: step.correctRot };
          this.grid?.setTile(pos, fixedTile);
          this.renderTile(pos, fixedTile);
          if (!this.powerSaveMode) {
            this.spawnLandingRipple(this.gridToLocal(pos).add3f(0, 0, 10), this.hex('#FDE047'));
          }
          CrystalAudioService.playStepChime(6 + idx * 2);
        });
        WeChatService.vibrateShort('medium');
        this.updateRoutePreviewLine();
        this.updateLabels();
        this.setStatus(`✨ 星光指引已为你校准 ${toFix.length} 块关键水晶！`);
        WeChatService.showToast(`已自动校准 ${toFix.length} 块水晶`, 'success');
        return;
      }

      const targetStep = misalignedList[0];
      const t = this.grid.getTile(targetStep);
      const displayName = t ? getTileDisplayName(t.type) : '水晶';
      this.setStatus(`💡 提示：第 ${targetStep.row + 1} 行第 ${targetStep.col + 1} 列的【${displayName}】朝向需调整，轻点旋转即可接通！`);
      WeChatService.showToast('已为你高亮关键水晶', 'success');

      if (this.hintHighlightNode) {
        this.hintHighlightNode.destroy();
      }

      if (!this.boardRoot) return;

      const highlight = new Node('HintHighlight');
      highlight.layer = Layers.Enum.UI_2D;
      highlight.setParent(this.boardRoot);
      highlight.setPosition(this.gridToLocal(targetStep).add3f(0, 0, 3));
      highlight.addComponent(UITransform).setContentSize(this.tileWidth * 1.1, this.tileHeight * 1.1);
      const g = highlight.addComponent(Graphics);

      g.strokeColor = this.hex('#FDE047');
      g.lineWidth = 4.5;
      g.circle(0, 0, this.tileWidth * 0.52);
      g.stroke();

      tween(highlight)
        .to(0.4, { scale: new Vec3(1.18, 1.18, 1) }, { easing: 'sineInOut' })
        .to(0.4, { scale: new Vec3(0.95, 0.95, 1) }, { easing: 'sineInOut' })
        .union()
        .repeat(5)
        .call(() => {
          highlight.destroy();
          if (this.hintHighlightNode === highlight) this.hintHighlightNode = null;
        })
        .start();

      this.hintHighlightNode = highlight;

      this.scheduleOnce(() => {
        if (this.hintHighlightNode === highlight) {
          highlight.destroy();
          this.hintHighlightNode = null;
        }
      }, 8.0);
    };

    if (tier <= 1) {
      runHint(0);
      return;
    }

    AdService.showRewarded('foresight_card').then((res) => {
      if (res.completed) {
        runHint(2);
      } else {
        WeChatService.showToast(res.error || '观看完成后可自动校准 2 块关键水晶', 'none');
      }
    });
  }
}
