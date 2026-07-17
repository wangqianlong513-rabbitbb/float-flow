import { _decorator, Button, Color, Component, Graphics, Label, Layers, Node, ResolutionPolicy, UITransform, Vec3, view } from 'cc';
import { GameRoot } from './GameRoot';
import { HomeRoot } from './HomeRoot';
import { LevelSelect } from './LevelSelect';
import { ReviveModal } from './ReviveModal';
import { SettingsModal } from './SettingsModal';
import { VictoryPoster } from './VictoryPoster';
import { WeChatService } from '../wx/WeChatService';

const { ccclass } = _decorator;

@ccclass('SceneBootstrap')
export class SceneBootstrap extends Component {
  private homePageRoot: Node | null = null;
  private gamePageRoot: Node | null = null;
  private levelSelectRootNode: Node | null = null;
  private settingsModalRootNode: Node | null = null;
  private reviveModalRootNode: Node | null = null;
  private victoryPosterRootNode: Node | null = null;
  private bgGraphicsNode: Graphics | null = null;
  private currentTheme = 0; // 0: Icefield, 1: Violet Dusk, 2: Sunset Glow

  private closeAllModals(): void {
    if (this.settingsModalRootNode) this.settingsModalRootNode.active = false;
    if (this.reviveModalRootNode) this.reviveModalRootNode.active = false;
    if (this.victoryPosterRootNode) this.victoryPosterRootNode.active = false;
  }

  private applyTheme(themeIdx: number): void {
    console.log(`[SceneBootstrap] Apply Theme Index ${themeIdx}`);
    this.currentTheme = themeIdx;
    if (!this.bgGraphicsNode) return;
    const g = this.bgGraphicsNode;
    g.clear();

    if (themeIdx === 1) {
      // Theme 1: Violet Dusk (暮色罗兰 - Deep Amethyst Twilight)
      g.fillColor = this.hex('#0E0818');
      g.rect(-1280, -1280, 2560, 2560);
      g.fill();
      g.fillColor = this.hex('#4C1D95');
      ((g.fillColor) as ((any)) as any).a = 55;
      g.circle(0, 320, 500);
      g.fill();
      g.fillColor = this.hex('#6B21A8');
      ((g.fillColor) as ((any)) as any).a = 45;
      g.circle(450, 180, 480);
      g.fill();
      g.fillColor = this.hex('#831843');
      ((g.fillColor) as ((any)) as any).a = 35;
      g.circle(-350, -150, 420);
      g.fill();
    } else if (themeIdx === 2) {
      // Theme 2: Sunset Glow (落日余晖 - Deep Terracotta Dusk)
      g.fillColor = this.hex('#120808');
      g.rect(-1280, -1280, 2560, 2560);
      g.fill();
      g.fillColor = this.hex('#7C2D12');
      ((g.fillColor) as ((any)) as any).a = 55;
      g.circle(0, 320, 500);
      g.fill();
      g.fillColor = this.hex('#9A3412');
      ((g.fillColor) as ((any)) as any).a = 45;
      g.circle(450, 180, 480);
      g.fill();
      g.fillColor = this.hex('#B45309');
      ((g.fillColor) as ((any)) as any).a = 35;
      g.circle(-350, -150, 420);
      g.fill();
    } else {
      // Theme 0: Icefield (极光冰原 - Sapphire/Cyan)
      g.fillColor = this.hex('#101E4A');
      g.rect(-1280, -1280, 2560, 2560);
      g.fill();
      g.fillColor = this.hex('#0083B0');
      ((g.fillColor) as ((any)) as any).a = 140;
      g.circle(0, 320, 500);
      g.fill();
      g.fillColor = this.hex('#6B21A8');
      ((g.fillColor) as ((any)) as any).a = 130;
      g.circle(450, 180, 480);
      g.fill();
      g.fillColor = this.hex('#00F0FF');
      ((g.fillColor) as ((any)) as any).a = 70;
      g.circle(-350, -150, 420);
      g.fill();
    }

    this.drawBackgroundDecorations(g, themeIdx);

    if (this.homePageRoot) {
      const home = this.homePageRoot.getComponent(HomeRoot);
      if (home) home.applyTheme(themeIdx);
    }
    if (this.levelSelectRootNode) {
      const levelSelect = this.levelSelectRootNode.getComponent(LevelSelect);
      if (levelSelect) levelSelect.applyTheme(themeIdx);
    }
    if (this.gamePageRoot) {
      const game = this.gamePageRoot.getComponent(GameRoot);
      if (game) game.applyTheme(themeIdx);
    }
    if (this.settingsModalRootNode) {
      const settings = this.settingsModalRootNode.getComponent(SettingsModal);
      if (settings) settings.applyTheme(themeIdx);
    }
  }

  private drawBackgroundDecorations(graphics: Graphics, themeIdx: number): void {
    // 5. Center Nebula Aura
    graphics.fillColor = themeIdx === 1 ? this.hex('#3B0764') : (themeIdx === 2 ? this.hex('#451A03') : this.hex('#312E81'));
    ((graphics.fillColor) as ((any)) as any).a = 80;
    graphics.circle(0, 0, 450);
    graphics.fill();

    // 6. Distant Floating Isometric Shards
    const shards = [
      { x: -500, y: 240, size: 55, colTop: '#3B82F6', colLeft: '#1D4ED8', colRight: '#1E3A8A', a: 130, h: 26 },
      { x: 540, y: 200, size: 45, colTop: '#A855F7', colLeft: '#6B21A8', colRight: '#4C1D95', a: 120, h: 22 },
      { x: -540, y: -40, size: 42, colTop: '#00F0FF', colLeft: '#0083B0', colRight: '#004D61', a: 140, h: 20 },
      { x: 560, y: -60, size: 60, colTop: '#EC4899', colLeft: '#BE185D', colRight: '#831843', a: 110, h: 28 },
      { x: -440, y: -250, size: 50, colTop: '#60A5FA', colLeft: '#2563EB', colRight: '#1D4ED8', a: 125, h: 24 },
      { x: 490, y: -230, size: 52, colTop: '#C084FC', colLeft: '#7E22CE', colRight: '#581C87', a: 130, h: 26 },
      { x: -290, y: 290, size: 36, colTop: '#F472B6', colLeft: '#DB2777', colRight: '#9D174D', a: 105, h: 16 },
      { x: 330, y: 270, size: 38, colTop: '#38BDF8', colLeft: '#0284C7', colRight: '#0369A1', a: 115, h: 18 },
      { x: -590, y: 100, size: 32, colTop: '#818CF8', colLeft: '#4F46E5', colRight: '#3730A3', a: 100, h: 15 },
      { x: 590, y: 80, size: 34, colTop: '#34D399', colLeft: '#059669', colRight: '#047857', a: 110, h: 16 },
      { x: -220, y: -280, size: 44, colTop: '#E879F9', colLeft: '#A21CAF', colRight: '#701A75', a: 120, h: 20 },
      { x: 240, y: -270, size: 46, colTop: '#60A5FA', colLeft: '#3B82F6', colRight: '#1D4ED8', a: 125, h: 22 },
    ];

    for (const s of shards) {
      const halfW = s.size;
      const halfH = s.size * 0.5;
      let topCol = this.hex(s.colTop);
      let leftCol = this.hex(s.colLeft);
      let rightCol = this.hex(s.colRight);
      if (themeIdx === 1) {
        topCol = this.hex('#7C3AED'); leftCol = this.hex('#581C87'); rightCol = this.hex('#3B0764');
      } else if (themeIdx === 2) {
        topCol = this.hex('#C2410C'); leftCol = this.hex('#9A3412'); rightCol = this.hex('#7C2D12');
      }
      ((topCol) as ((any)) as any).a = s.a; ((leftCol) as ((any)) as any).a = s.a; ((rightCol) as ((any)) as any).a = s.a;

      graphics.fillColor = topCol;
      graphics.moveTo(s.x, s.y + halfH);
      graphics.lineTo(s.x + halfW, s.y);
      graphics.lineTo(s.x, s.y - halfH);
      graphics.lineTo(s.x - halfW, s.y);
      graphics.close();
      graphics.fill();

      graphics.fillColor = leftCol;
      graphics.moveTo(s.x - halfW, s.y);
      graphics.lineTo(s.x, s.y - halfH);
      graphics.lineTo(s.x, s.y - halfH - s.h);
      graphics.lineTo(s.x - halfW, s.y - s.h);
      graphics.close();
      graphics.fill();

      graphics.fillColor = rightCol;
      graphics.moveTo(s.x, s.y - halfH);
      graphics.lineTo(s.x + halfW, s.y);
      graphics.lineTo(s.x + halfW, s.y - s.h);
      graphics.lineTo(s.x, s.y - halfH - s.h);
      graphics.close();
      graphics.fill();

      graphics.strokeColor = this.hex('#FFFFFF');
      ((graphics.strokeColor) as ((any)) as any).a = s.a + 50;
      graphics.lineWidth = 1.5;
      graphics.moveTo(s.x, s.y + halfH);
      graphics.lineTo(s.x + halfW, s.y);
      graphics.lineTo(s.x, s.y - halfH);
      graphics.lineTo(s.x - halfW, s.y);
      graphics.close();
      graphics.stroke();
    }

    // 7. Starfield particles & cyber sparkles
    for (let i = 0; i < 45; i++) {
      const x = Math.sin(i * 997) * 620;
      const y = Math.cos(i * 631) * 360;
      const radius = 1.2 + (i % 3) * 0.8;
      graphics.fillColor = themeIdx === 1 ? (i % 2 === 0 ? this.hex('#E879F9') : this.hex('#FFFFFF')) : (themeIdx === 2 ? (i % 2 === 0 ? this.hex('#FDE047') : this.hex('#FFFFFF')) : (i % 4 === 0 ? this.hex('#00F0FF') : (i % 3 === 0 ? this.hex('#F472B6') : this.hex('#FFFFFF'))));
      ((graphics.fillColor) as ((any)) as any).a = 160 + (i % 5) * 18;
      graphics.circle(x, y, radius);
      graphics.fill();

      if (radius > 2) {
        graphics.strokeColor = graphics.fillColor;
        graphics.lineWidth = 1;
        graphics.moveTo(x - radius * 2.5, y);
        graphics.lineTo(x + radius * 2.5, y);
        graphics.moveTo(x, y - radius * 2.5);
        graphics.lineTo(x, y + radius * 2.5);
        graphics.stroke();
      }
    }
  }

  protected onLoad(): void {
    console.log('[FloatFlow] SceneBootstrap onLoad');
    WeChatService.initShareMenu();
    view.setDesignResolutionSize(720, 1558, ResolutionPolicy.FIXED_WIDTH);
    const visibleSize = view.getVisibleSize();
    const root = this.node;
    root.name = root.name || 'Root';
    root.layer = Layers.Enum.UI_2D;
    root.setPosition(new Vec3(0, 0, 0));
    this.ensureTransform(root, visibleSize.width, visibleSize.height);
    root.destroyAllChildren();

    // 0. Shared Cosmic Sapphire Background
    const bgRoot = this.createRoot('BgRoot', new Vec3(0, 0, 0));
    this.createBackground(bgRoot);

    // 1. Home Page Root (Default Active!)
    const homePage = this.createRoot('HomePage', new Vec3(0, 0, 0));
    this.homePageRoot = homePage;
    const home = homePage.addComponent(HomeRoot);

    // 2. Game Page Root (Hidden by default until player starts a game!)
    const gamePage = this.createRoot('GamePage', new Vec3(0, 0, 0));
    this.gamePageRoot = gamePage;
    gamePage.active = false;

    const halfW = visibleSize.width / 2;
    const halfH = visibleSize.height / 2;

    // 动态计算在顶部导航条与底部操作区（Y = -halfH + 495）之间的可用垂直空间，求出其中心坐标
    const boardCenterY = (halfH - 436) / 2;

    const boardRoot = this.createRoot('BoardRoot', new Vec3(0, boardCenterY, 0), gamePage);
    const previewRoot = this.createRoot('PreviewRoot', new Vec3(0, boardCenterY, 0), gamePage);
    const runnerRoot = this.createRoot('RunnerRoot', new Vec3(0, boardCenterY, 0), gamePage);
    const cardRoot = this.createRoot('CardRoot', new Vec3(0, -halfH + 260, 0), gamePage); // 下移至 -halfH + 260 消除底部空白
    const uiRoot = this.createRoot('UI', new Vec3(0, 0, 0), gamePage);

    // 1. Top Navigation Bar with embedded Level Label (never overlaps iOS notch or WeChat top capsule!)
    const levelLabel = this.createTopNav(uiRoot, new Vec3(0, halfH - 135, 0));

    // 2. Bottom Card Deck Background tightly matching CardRoot at Y = -halfH + 260
    this.createBottomDeck(uiRoot, new Vec3(0, -halfH + 260, 0));

    // 3. 提示字条 与 状态文本 (整体下移并拉开间距，解决文字重叠)
    const tipPill = this.createRoot('TipPill', new Vec3(0, -halfH + 495, 0), uiRoot); // 下移
    this.ensureTransform(tipPill, 540, 36);
    const tg = tipPill.addComponent(Graphics);
    tg.fillColor = this.hex('#080E24');
    ((tg.fillColor) as any).a = 150;
    tg.roundRect(-270, -18, 540, 36, 18);
    tg.fill();
    const tipLabel = this.createLabel(tipPill, 'TipLabel', new Vec3(0, 1, 0), '💡 提示：拖拽手牌触发子弹时间减速 | 点击地图水晶旋转', 17, '#A5F3FC', 520, 32);

    const statusLabel = this.createLabel(uiRoot, 'StatusLabel', new Vec3(0, -halfH + 450, 0), '拖动手牌到地图放置', 22, '#60A5FA', 680, 36); // 下移

    const game = gamePage.getComponent(GameRoot) ?? gamePage.addComponent(GameRoot);
    game.boardRoot = boardRoot;
    game.previewRoot = previewRoot;
    game.runnerRoot = runnerRoot;
    game.cardRoot = cardRoot;
    game.levelLabel = levelLabel;
    game.tipLabel = tipLabel;
    game.statusLabel = statusLabel;

    // 4. 下方横排辅助操作区 ActionRow (下移至 -halfH + 395 消除与文字重叠)
    const actionRow = this.createRoot('ActionRow', new Vec3(0, -halfH + 395, 0), uiRoot);
    const btMeter = this.createBulletTimeMeter(actionRow, new Vec3(-220, 0, 0));
    game.bulletTimeNode = btMeter.node;
    game.bulletTimeGraphics = btMeter.graphics;
    game.bulletTimeValueLabel = btMeter.valueLabel;
    this.createSideActionButtons(actionRow, game, new Vec3(65, 0, 0));

    // 5. 底部操控中心：平时仅保留极具统治力的大巨幕“启动流光”按钮，隐藏次要常驻按钮
    this.createHeroButton(uiRoot, 'StartButton', new Vec3(0, -halfH + 90, 0), '★  启 动 流 光  [ 释放光速波 ]', () => game.startRunner());

    // 3. Settings Modal Root (Hidden by default!)
    const settingsModalRoot = this.createRoot('SettingsModalRoot', new Vec3(0, 0, 0));
    settingsModalRoot.active = false;
    this.settingsModalRootNode = settingsModalRoot;
    const settingsModal = settingsModalRoot.addComponent(SettingsModal);
    settingsModal.onThemeChangedCallback = (idx: number) => {
      this.applyTheme(idx);
    };

    // 6. Revive Modal Root (Hidden by default!)
    const reviveModalRoot = this.createRoot('ReviveModalRoot', new Vec3(0, 0, 0));
    reviveModalRoot.active = false;
    this.reviveModalRootNode = reviveModalRoot;
    const reviveModal = reviveModalRoot.addComponent(ReviveModal);
    reviveModal.onReviveCallback = () => {
      console.log('[SceneBootstrap] Revive -> Continue runner!');
      game.reviveRunner();
    };
    reviveModal.onGiveUpCallback = () => {
      console.log('[SceneBootstrap] Give up -> Restart level!');
      game.restartLevel();
    };
    game.onShowReviveModalCallback = () => {
      console.log('[SceneBootstrap] Show Revive Modal!');
      reviveModal.show();
    };

    // 7. Level Select Root (Hidden by default!)
    const levelSelectRoot = this.createRoot('LevelSelectRoot', new Vec3(0, 0, 0));
    levelSelectRoot.active = false;
    this.levelSelectRootNode = levelSelectRoot;
    const levelSelect = levelSelectRoot.addComponent(LevelSelect);
    levelSelect.onSelectLevelCallback = (idx: number) => {
      console.log(`[SceneBootstrap] LevelSelect -> Start Level Index ${idx}!`);
      this.closeAllModals();
      levelSelectRoot.active = false;
      gamePage.active = true;
      game.loadLevel(idx);
    };
    levelSelect.onReturnHomeCallback = () => {
      console.log('[SceneBootstrap] LevelSelect -> Return to HomePage!');
      this.closeAllModals();
      levelSelectRoot.active = false;
      homePage.active = true;
    };
    levelSelect.onStartEndlessCallback = () => {
      console.log('[SceneBootstrap] LevelSelect -> Start Endless Mode!');
      this.closeAllModals();
      levelSelectRoot.active = false;
      gamePage.active = true;
      game.restartLevel();
    };

    // 8. Victory Poster Root (Hidden by default!)
    const victoryPosterRoot = this.createRoot('VictoryPosterRoot', new Vec3(0, 0, 0));
    victoryPosterRoot.active = false;
    this.victoryPosterRootNode = victoryPosterRoot;
    const victoryPoster = victoryPosterRoot.addComponent(VictoryPoster);
    victoryPoster.onCloseCallback = () => {
      console.log('[SceneBootstrap] VictoryPoster closed -> Return to LevelSelect!');
      this.closeAllModals();
      gamePage.active = false;
      levelSelectRoot.active = true;
    };
    victoryPoster.onNextLevelCallback = () => {
      console.log('[SceneBootstrap] VictoryPoster Next Level -> Load Next!');
      this.closeAllModals();
      game.loadNextLevel();
    };
    game.onShowVictoryPosterCallback = (levelName: string, stars: number, moves: number) => {
      console.log(`[SceneBootstrap] Show Victory Poster for ${levelName}!`);
      victoryPosterRoot.active = true;
      victoryPoster.showVictory(levelName, stars, moves);
    };

    // Connect Home Page to Game Page, Level Select & Settings!
    home.onOpenSettingsCallback = () => {
      console.log('[SceneBootstrap] Open Settings Modal!');
      settingsModalRoot.active = true;
    };
    home.onStartJourneyCallback = () => {
      console.log('[SceneBootstrap] Start Journey Mode -> Open LevelSelect!');
      this.closeAllModals();
      homePage.active = false;
      levelSelectRoot.active = true;
    };
    home.onStartEndlessCallback = () => {
      console.log('[SceneBootstrap] Start Endless Mode -> Switch to GamePage!');
      this.closeAllModals();
      homePage.active = false;
      gamePage.active = true;
      game.restartLevel();
    };

    WeChatService.checkLaunchQuery(
      (levelId: number) => {
        console.log(`[SceneBootstrap] Launch from share with levelId=${levelId}`);
        const idx = game.findIndexByLevelId(levelId);
        if (idx >= 0) {
          this.closeAllModals();
          if (this.homePageRoot) this.homePageRoot.active = false;
          if (this.levelSelectRootNode) this.levelSelectRootNode.active = false;
          gamePage.active = true;
          game.loadLevel(idx);
        }
      },
      (residualStr: string) => {
        console.log('[SceneBootstrap] Launch from share with residualStr');
        this.closeAllModals();
        if (this.homePageRoot) this.homePageRoot.active = false;
        if (this.levelSelectRootNode) this.levelSelectRootNode.active = false;
        gamePage.active = true;
        game.loadResidualFromShare(residualStr);
      }
    );
  }

  private createRoot(name: string, position: Vec3, parent?: Node): Node {
    const node = new Node(name);
    node.layer = Layers.Enum.UI_2D;
    node.setParent(parent || this.node);
    node.setPosition(position);
    this.ensureTransform(node, 1, 1);
    return node;
  }

  private createBackground(parent: Node): void {
    const node = new Node('Background');
    node.layer = Layers.Enum.UI_2D;
    node.setParent(parent);
    node.setPosition(new Vec3(0, 0, -10));
    this.ensureTransform(node, 2560, 2560);
    const graphics = node.addComponent(Graphics);
    this.bgGraphicsNode = graphics;
    this.applyTheme(0);
  }

  private createTopNav(parent: Node, position: Vec3): Label {
    const node = new Node('TopNav');
    node.layer = Layers.Enum.UI_2D;
    node.setParent(parent);
    node.setPosition(position);
    this.ensureTransform(node, 700, 80);
    const graphics = node.addComponent(Graphics);

    // Glassmorphic top navigation panel
    graphics.fillColor = this.hex('#0D162C');
    ((graphics.fillColor) as ((any)) as any).a = 220;
    graphics.roundRect(-350, -40, 700, 80, 26);
    graphics.fill();
    graphics.strokeColor = this.hex('#00F0FF');
    graphics.lineWidth = 2.0;
    graphics.stroke();

    // Left Pause Icon Button [ || ]
    graphics.fillColor = this.hex('#1E293B');
    graphics.roundRect(-335, -22, 44, 44, 12);
    graphics.fill();
    graphics.strokeColor = this.hex('#00F0FF');
    graphics.lineWidth = 2.5;
    graphics.moveTo(-317, -10);
    graphics.lineTo(-317, 10);
    graphics.moveTo(-309, -10);
    graphics.lineTo(-309, 10);
    graphics.stroke();

    // Far-Right Energy Pill (⚡ 3/3 +)
    graphics.fillColor = this.hex('#1E1B4B');
    graphics.roundRect(260, -20, 80, 40, 20);
    graphics.fill();
    graphics.strokeColor = this.hex('#A78BFA');
    graphics.lineWidth = 1.5;
    graphics.stroke();
    this.createLabel(node, 'EnergyText', new Vec3(300, 0, 0), '⚡ 3/3 +', 15, '#FDE047', 75, 30);

    // Level Title Label inside TopNav
    const levelLabel = this.createLabel(node, 'LevelLabel', new Vec3(-60, 15, 0), '旅途模式 · 5-12', 24, '#FFFFFF', 210, 40);

    // Level Progress Dots Line (O——●——O——O  到达终点)
    graphics.strokeColor = this.hex('#00F0FF');
    graphics.lineWidth = 2;
    graphics.moveTo(-150, -18);
    graphics.lineTo(30, -18);
    graphics.stroke();

    const dotXs = [-150, -90, -30, 30];
    dotXs.forEach((dx, idx) => {
      if (idx === 0) {
        graphics.fillColor = this.hex('#00F0FF');
        graphics.circle(dx, -18, 5);
        graphics.fill();
      } else if (idx === 1) {
        graphics.fillColor = this.hex('#FFFFFF');
        graphics.circle(dx, -18, 6);
        graphics.fill();
        graphics.strokeColor = this.hex('#00F0FF');
        graphics.lineWidth = 2.5;
        graphics.circle(dx, -18, 7);
        graphics.stroke();
      } else {
        graphics.fillColor = this.hex('#1E3A8A');
        graphics.circle(dx, -18, 6);
        graphics.fill();
        graphics.strokeColor = this.hex('#60A5FA');
        graphics.lineWidth = 1.5;
        graphics.circle(dx, -18, 6);
        graphics.stroke();
      }
    });
    this.createLabel(node, 'ProgressSub', new Vec3(-60, -32, 0), '到 达 终 点', 12, '#93C5FD', 100, 18);

    // Clickable Pause / Return to Home button!
    const homeReturnBtn = new Node('HomeReturnBtn');
    homeReturnBtn.layer = Layers.Enum.UI_2D;
    homeReturnBtn.setParent(node);
    homeReturnBtn.setPosition(new Vec3(-262, 0, 0));
    this.ensureTransform(homeReturnBtn, 116, 50);
    const hBg = homeReturnBtn.addComponent(Graphics);
    hBg.fillColor = this.hex('#1E293B');
    hBg.roundRect(-58, -25, 116, 50, 16);
    hBg.fill();
    hBg.strokeColor = this.hex('#60A5FA');
    hBg.lineWidth = 2.4;
    hBg.stroke();
    this.createLabel(homeReturnBtn, 'Text', new Vec3(0, 1, 0), '|| 主页', 22, '#FFFFFF', 106, 38);

    this.addClick(homeReturnBtn, () => {
      console.log('[SceneBootstrap] Clicked Home/Pause -> Return to LevelSelect or HomePage!');
      this.closeAllModals();
      if (this.gamePageRoot) {
        this.gamePageRoot.active = false;
      }
      if (this.levelSelectRootNode) {
        this.levelSelectRootNode.active = true;
      } else if (this.homePageRoot) {
        this.homePageRoot.active = true;
      }
    });

    // Clickable Share / Ask for Help button
    const shareBtn = new Node('ShareHelpBtn');
    shareBtn.layer = Layers.Enum.UI_2D;
    shareBtn.setParent(node);
    shareBtn.setPosition(new Vec3(145, 0, 0));
    this.ensureTransform(shareBtn, 110, 50);
    const sg = shareBtn.addComponent(Graphics);
    sg.fillColor = this.hex('#1D4ED8');
    sg.roundRect(-55, -25, 110, 50, 18);
    sg.fill();
    sg.strokeColor = this.hex('#60A5FA');
    sg.lineWidth = 2.4;
    sg.stroke();
    this.createLabel(shareBtn, 'ShareText', new Vec3(0, 1, 0), '★ 求助', 22, '#FFFFFF', 100, 38);
    this.addClick(shareBtn, () => {
      console.log('[SceneBootstrap] Clicked Share/Help button!');
      if (this.gamePageRoot && this.gamePageRoot.active) {
        const game = this.gamePageRoot.getComponent(GameRoot);
        if (game) game.shareCurrentResidual();
      }
    });

    return levelLabel;
  }

  private createBottomDeck(parent: Node, position: Vec3): void {
    const node = new Node('BottomDeck');
    node.layer = Layers.Enum.UI_2D;
    node.setParent(parent);
    node.setPosition(position);
    this.ensureTransform(node, 692, 176);
    const graphics = node.addComponent(Graphics);

    // Luminous Sapphire Glassmorphic Tray
    graphics.fillColor = this.hex('#1E3A8A');
    ((graphics.fillColor) as any).a = 155;
    graphics.roundRect(-346, -88, 692, 176, 28);
    graphics.fill();
    graphics.fillColor = this.hex('#4C1D95');
    ((graphics.fillColor) as any).a = 110;
    graphics.roundRect(-338, -80, 676, 160, 22);
    graphics.fill();
    graphics.strokeColor = this.hex('#60A5FA');
    graphics.lineWidth = 2.8;
    graphics.stroke();
  }

  private createBulletTimeMeter(parent: Node, position: Vec3): { node: Node; graphics: Graphics; valueLabel: Label } {
    const node = new Node('BulletTimeMeter');
    node.layer = Layers.Enum.UI_2D;
    node.setParent(parent);
    node.setPosition(position);
    this.ensureTransform(node, 136, 52);

    const g = node.addComponent(Graphics);
    // Graphics drawn dynamically in game.redrawBulletTimeMeter()

    this.createLabel(node, 'Title', new Vec3(-30, 11, 0), '时空缓冲', 13, '#93C5FD', 70, 20);
    const valueLabel = this.createLabel(node, 'Value', new Vec3(25, 1, 0), '⏱ 3.0s', 17, '#00F0FF', 80, 30);
    return { node, graphics: g, valueLabel };
  }

  private createSideActionButtons(parent: Node, game: GameRoot, position: Vec3): void {
    const root = new Node('SideActions');
    root.layer = Layers.Enum.UI_2D;
    root.setParent(parent);
    root.setPosition(position);
    this.ensureTransform(root, 440, 56);

    // 优化：把原本右侧竖着的“预览、撤回、清盘”移到下方横排，不仅释放右侧空间让棋盘放大，且与手牌操作连贯一致！
    this.createSideActionButton(root, 'PreviewBtn', new Vec3(-148, 0, 0), '◎ 预 览', '#0D162C', '#00F0FF', '#60A5FA', () => {
      game.showRoutePreview();
    });

    this.createSideActionButton(root, 'UndoBtn', new Vec3(0, 0, 0), '< 撤 回', '#0D162C', '#38BDF8', '#38BDF8', () => {
      game.undoLastMove();
    });

    this.createSideActionButton(root, 'EraseBtn', new Vec3(148, 0, 0), '× 清 盘', '#1E3A8A', '#FF4B3E', '#FF4B3E', () => {
      game.clearPlacedTiles();
    });
  }

  private createSideActionButton(parent: Node, name: string, pos: Vec3, labelStr: string, bgHex: string, borderHex: string, textHex: string, onClick: () => void): void {
    const node = new Node(name);
    node.layer = Layers.Enum.UI_2D;
    node.setParent(parent);
    node.setPosition(pos);
    this.ensureTransform(node, 136, 52);

    const g = node.addComponent(Graphics);
    g.fillColor = this.hex(bgHex);
    ((g.fillColor) as any).a = 230;
    g.roundRect(-68, -26, 136, 52, 22);
    g.fill();
    g.strokeColor = this.hex(borderHex);
    g.lineWidth = 2.4;
    g.stroke();

    this.createLabel(node, 'Text', new Vec3(0, 1, 0), labelStr, 18, textHex, 126, 40);
    this.addClick(node, onClick);
  }

  private addClick(node: Node, onClick: () => void): void {
    let btn = node.getComponent(Button);
    if (!btn) btn = node.addComponent(Button);
    btn.transition = Button.Transition.SCALE;
    btn.zoomScale = 0.92;
    node.off(Button.EventType.CLICK);
    node.on(Button.EventType.CLICK, onClick, this);
  }

  private createCircularButton(parent: Node, name: string, position: Vec3, icon: string, labelText: string, onClick: () => void): void {
    const node = new Node(name);
    node.layer = Layers.Enum.UI_2D;
    node.setParent(parent);
    node.setPosition(position);
    this.ensureTransform(node, 104, 92);

    const graphics = node.addComponent(Graphics);
    graphics.fillColor = this.hex('#0D162C');
    ((graphics.fillColor) as any).a = 230;
    graphics.roundRect(-52, -46, 104, 92, 24);
    graphics.fill();
    graphics.strokeColor = this.hex('#00F0FF');
    graphics.lineWidth = 2.8;
    graphics.stroke();

    this.createLabel(node, 'Icon', new Vec3(0, 16, 1), icon, 28, '#FFFFFF', 88, 42);
    this.createLabel(node, 'Text', new Vec3(0, -20, 1), labelText, 18, '#60A5FA', 90, 30);
    this.addClick(node, onClick);
  }

  private createHeroButton(parent: Node, name: string, position: Vec3, text: string, onClick: () => void): void {
    const node = new Node(name);
    node.layer = Layers.Enum.UI_2D;
    node.setParent(parent);
    node.setPosition(position);
    const width = 540; // 540 宽度
    const height = 72; // 72 高度符合 8pt
    this.ensureTransform(node, width, height);

    const graphics = node.addComponent(Graphics);
    // Vibrant Neon Cyan/Blue Hero Button
    graphics.fillColor = this.hex('#00E5FF');
    graphics.roundRect(-width / 2, -height / 2, width, height, 36); // 36 圆角符合 8pt
    graphics.fill();
    graphics.strokeColor = this.hex('#FFFFFF');
    graphics.lineWidth = 3.5;
    graphics.stroke();

    const labelNode = new Node('Label');
    labelNode.layer = Layers.Enum.UI_2D;
    labelNode.setParent(node);
    labelNode.setPosition(new Vec3(0, -2, 1));
    this.ensureTransform(labelNode, width, height - 8);
    const label = labelNode.addComponent(Label);
    label.string = text;
    label.fontSize = 28; // H3 (28px)
    label.color = this.hex('#080E24');

    this.addClick(node, onClick);
  }

  private createSecondaryButton(parent: Node, name: string, position: Vec3, text: string, onClick: () => void): void {
    const node = new Node(name);
    node.layer = Layers.Enum.UI_2D;
    node.setParent(parent);
    node.setPosition(position);
    const width = 280;
    const height = 64; // 64 高度符合 8pt
    this.ensureTransform(node, width, height);

    const graphics = node.addComponent(Graphics);
    // Sleek Cyber Violet Secondary Button
    graphics.fillColor = this.hex('#1E1B4B');
    graphics.roundRect(-width / 2, -height / 2, width, height, 32); // 32 圆角符合 8pt
    graphics.fill();
    const sBorder = this.hex('#A78BFA');
    sBorder.a = 150; // Soften stroke
    graphics.strokeColor = sBorder;
    graphics.lineWidth = 2.0; // 2px 描边
    graphics.stroke();

    const labelNode = new Node('Label');
    labelNode.layer = Layers.Enum.UI_2D;
    labelNode.setParent(node);
    labelNode.setPosition(new Vec3(0, -2, 1));
    this.ensureTransform(labelNode, width, height - 8);
    const label = labelNode.addComponent(Label);
    label.string = text;
    label.fontSize = 22; // size 22
    label.color = this.hex('#FFFFFF');

    this.addClick(node, onClick);
  }

  private createLabel(parent: Node, name: string, position: Vec3, text: string, size: number, color: string, width = 520, height = 60): Label {
    const node = new Node(name);
    node.layer = Layers.Enum.UI_2D;
    node.setParent(parent);
    node.setPosition(position);
    this.ensureTransform(node, width, height);
    const label = node.addComponent(Label);
    label.string = text;
    label.fontSize = size;
    label.color = this.hex(color);
    return label;
  }

  private ensureTransform(node: Node, width: number, height: number): UITransform {
    let transform = node.getComponent(UITransform);
    if (!transform) {
      transform = node.addComponent(UITransform);
    }
    transform.setContentSize(width, height);
    return transform;
  }

  private hex(value: string): Color {
    const color = new Color();
    Color.fromHEX(color, value);
    return color;
  }
}
