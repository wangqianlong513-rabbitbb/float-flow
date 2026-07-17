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

  public onShowReviveModalCallback?: () => void;
  public onShowVictoryPosterCallback?: (levelName: string, stars: number, moves: number) => void;

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

  public applyTheme(themeIdx: number): void {
    console.log(`[GameRoot] Apply Theme Index ${themeIdx}`);
    this.currentTheme = themeIdx;
    if (this.level) {
      this.renderBoard();
      this.renderAllTiles();
      this.renderCards();
    }
  }

  protected start(): void {
    // If this log does not appear in Preview console, the component is not mounted.
    console.log('[FloatFlow] GameRoot started');
    this.ensureRoots();
    this.loadLevel(0);
  }

  protected update(deltaTime: number): void {
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

  public loadNextLevel(): void {
    WeChatService.vibrateShort('light');
    const next = (this.levelIndex + 1) % this.levels.length;
    this.loadLevel(next);
  }

  public restartLevel(preserveChances = false): void {
    WeChatService.vibrateShort('light');
    this.loadLevel(this.levelIndex, preserveChances);
  }

  public startRunner(): void {
    if (this.runner && this.runner.state === 'IDLE') {
      WeChatService.vibrateShort('light');
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
    ShareService.shareResidual(this.level, {
      levelId: this.level.id,
      runner: this.runner,
      hand: this.hand,
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
        this.hand = [...payload.hand];
        this.renderCards();
      }
      this.setStatus('已还原好友求助残局，帮 TA 接上这束光吧！');
      WeChatService.vibrateShort('medium');
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

  public loadLevel(index: number, preserveChances = false): void {
    if (!preserveChances || this.levelIndex !== index) {
      this.undoRemaining = 1;
      this.eraseRemaining = 1;
    }
    this.moveHistory = [];
    this.levelIndex = index;
    this.level = this.levels[index];
    this.grid = GridManager.fromLevel(this.level);
    this.runner = { ...this.level.start, state: this.level.autoStart ? 'RUNNING' : 'IDLE' };
    this.cardSystem = new CardSystem(this.level.tilePool, this.level.handSize, this.level.fixedHands ?? []);
    this.hand = this.cardSystem.drawInitial();
    this.usedMoves = 0;
    this.flowEnergy = this.level.bulletTimeEnergy ?? 3;
    this.runnerTimer = 0;
    this.isResolving = false;

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
    shadowG.fillColor = this.hex(isRose ? '#4C1D95' : (isGold ? '#7C2D12' : '#4C1D95'));
    ((shadowG.fillColor) as ((any)) as any).a = 75;
    shadowG.ellipse(0, 0, 240, 110);
    shadowG.fill();
    // Core glow
    shadowG.fillColor = this.hex(isRose ? '#831843' : (isGold ? '#B45309' : '#0083B0'));
    ((shadowG.fillColor) as ((any)) as any).a = 90;
    shadowG.ellipse(0, 0, 160, 70);
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
        let strokeCol = isEven ? this.hex('#3B82F6') : this.hex('#60A5FA');

        if (isRose) {
          topCol = isEven ? this.hex('#4C1D95') : this.hex('#6D28D9');
          strokeCol = isEven ? this.hex('#7C3AED') : this.hex('#A78BFA');
        } else if (isGold) {
          topCol = isEven ? this.hex('#7C2D12') : this.hex('#B45309');
          strokeCol = isEven ? this.hex('#C2410C') : this.hex('#FBBF24');
        }

        this.drawTopDownTile(graphics, topCol, strokeCol, 2, this.tileWidth, this.tileHeight, 0, 0, 6);
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
    const totalSlots = Math.max(1, this.hand.length + 1); // Include + button slot

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

    this.hand.forEach((type, index) => {
      const card = new Node(`Card_${index}_${type}`);
      card.layer = Layers.Enum.UI_2D;
      card.setParent(this.cardRoot!);
      card.setPosition(new Vec3(startX + index * spacing, 0, 0));
      card.addComponent(UITransform).setContentSize(this.cardWidth, this.cardHeight);
      const graphics = card.addComponent(Graphics);
      this.drawCard(graphics, type);
      const arrowScale = (this.cardWidth / 196) * 0.9;
      this.drawTileArrow(graphics, { type, rotation: 0 }, 14 * (this.cardHeight / 160), arrowScale, 0, 24);

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

    // Plus expansion slot at far right
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
  }

  private onCardTouchStart(event: EventTouch, index: number): void {
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

    const pos = event.getUILocation();
    const cell = this.uiToGrid(pos.x, pos.y);
    if (cell && this.canPlace(cell)) {
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

    const start = this.gridToLocal(this.runner).add3f(0, 10, 0);
    const outerCol = preview.success ? this.hex('#00F0FF') : this.hex('#FF3B30');
    ((outerCol) as ((any)) as any).a = 140;
    graphics.strokeColor = outerCol;
    graphics.lineWidth = 12;
    graphics.moveTo(start.x, start.y);
    for (const pathNode of preview.path) {
      const point = this.gridToLocal(pathNode).add3f(0, 10, 0);
      graphics.lineTo(point.x, point.y);
    }
    graphics.stroke();

    graphics.strokeColor = preview.success ? this.hex('#E0FFFF') : this.hex('#FFD1D1');
    graphics.lineWidth = 4;
    graphics.moveTo(start.x, start.y);
    for (const pathNode of preview.path) {
      const point = this.gridToLocal(pathNode).add3f(0, 0, 0);
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

    const start = this.gridToLocal(this.runner).add3f(0, 10, 0);
    const outerCol = preview.success ? this.hex('#00F0FF') : this.hex('#FF3B30');
    ((outerCol) as ((any)) as any).a = 140;
    graphics.strokeColor = outerCol;
    graphics.lineWidth = 12;
    graphics.moveTo(start.x, start.y);
    for (const pathNode of preview.path) {
      const point = this.gridToLocal(pathNode).add3f(0, 10, 0);
      graphics.lineTo(point.x, point.y);
    }
    graphics.stroke();

    graphics.strokeColor = preview.success ? this.hex('#E0FFFF') : this.hex('#FFD1D1');
    graphics.lineWidth = 4;
    graphics.moveTo(start.x, start.y);
    for (const pathNode of preview.path) {
      const point = this.gridToLocal(pathNode).add3f(0, 0, 0);
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

  private moveRunnerVisual(pos: GridPos, onDone: () => void): void {
    if (!this.runnerNode || !this.runnerRoot) {
      onDone();
      return;
    }
    this.isResolving = true;
    const startPos = this.runnerNode.position.clone();
    const endPos = this.gridToLocal(pos).add3f(0, 0, 10);
    const baseCol = this.colorForRunner(this.runner?.color ?? 'none');

    // Spawn 3 high-speed laser afterimage / trail ghosts along the movement path
    for (let i = 1; i <= 3; i++) {
      const ghostPos = startPos.clone().lerp(endPos, i * 0.25);
      this.spawnTrailGhost(ghostPos, baseCol, 0.04 * i);
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
    if (!this.runnerRoot) return;
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
    if (!this.runnerRoot) return;
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
    const stars = this.calculateStars();
    this.setStatus(`通关！${stars} 星，光能 +${stars * 20}`);
    this.updateLabels();
    if (this.onShowVictoryPosterCallback) {
      this.onShowVictoryPosterCallback(this.level.name, stars, this.usedMoves);
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
    this.setStatus(`失败：${reason}。呼叫时空导师救我一命！`);
    this.updateLabels();
    if (this.onShowReviveModalCallback) {
      this.onShowReviveModalCallback();
    }
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

  private drawCard(graphics: Graphics, type: TileType): void {
    graphics.clear();
    // Glassmorphic card base plate (vibrant royal blue / sapphire plate, NO GREY!)
    graphics.fillColor = new Color(37, 99, 235, 235);
    graphics.roundRect(-this.cardWidth / 2, -this.cardHeight / 2, this.cardWidth, this.cardHeight, 18);
    graphics.fill();
    graphics.strokeColor = this.hex('#00F0FF');
    graphics.lineWidth = 2.5;
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

    // 优化：改为横排精致子弹时间能量胶囊条 (对应下方操作栏 ActionRow 横排设计)
    const ratio = Math.max(0, Math.min(1, this.currentBulletTime / this.maxBulletTime));
    g.fillColor = this.hex('#0B132B');
    ((g.fillColor) as any).a = 230;
    g.roundRect(-68, -26, 136, 52, 22);
    g.fill();
    g.strokeColor = this.hex('#3B82F6');
    g.lineWidth = 2.2;
    g.stroke();

    // Active Liquid Fill Bar
    const barW = 124 * ratio;
    if (barW > 2) {
      if (ratio > 0.5) {
        g.fillColor = this.hex('#00F0FF');
      } else if (ratio > 0.25) {
        g.fillColor = this.hex('#FBBF24');
      } else {
        g.fillColor = this.hex('#FF3B30');
      }
      ((g.fillColor) as any).a = 210;
      g.roundRect(-62, -20, barW, 40, 18);
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
      this.levelLabel.string = `第 ${this.level.id} 关  ${this.level.name}`;
    }
    if (this.tipLabel && this.level) {
      this.tipLabel.string = `手数 ${this.usedMoves}/${this.level.recommendedMoves}   救场能量 ${this.flowEnergy}`;
    }
  }

  private setStatus(text: string): void {
    if (this.statusLabel) {
      this.statusLabel.string = text;
    }
  }

  private clearNode(node: Node | null): void {
    if (!node) {
      return;
    }
    node.destroyAllChildren();
  }
}
