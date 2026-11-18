import { _decorator, Button, Color, Component, EventTouch, Graphics, Label, Layers, Node, ResolutionPolicy, tween, UITransform, Vec3, view } from 'cc';
import { GameRoot } from './GameRoot';
import type { FailureShareSummary } from './GameRoot';
import { HomeRoot } from './HomeRoot';
import { LevelSelect } from './LevelSelect';
import { ReviveModal } from './ReviveModal';
import { SettingsModal } from './SettingsModal';
import { VictoryPoster } from './VictoryPoster';
import { WeChatService } from '../wx/WeChatService';
import { ProfileManager } from '../core/ProfileManager';
import { AdService } from '../wx/AdService';
import { CloudGameService } from '../wx/CloudGameService';
import { AnalyticsService } from '../wx/AnalyticsService';
import { getUiPalette } from '../ui/UiTheme';

declare const wx: any;

const { ccclass } = _decorator;

@ccclass('SceneBootstrap')
export class SceneBootstrap extends Component {
  private homePageRoot: Node | null = null;
  private gamePageRoot: Node | null = null;
  private levelSelectRootNode: Node | null = null;
  private settingsModalRootNode: Node | null = null;
  private reviveModalRootNode: Node | null = null;
  private victoryPosterRootNode: Node | null = null;
  private gameActionSheetRootNode: Node | null = null;
  private bgGraphicsNode: Graphics | null = null;
  private currentTheme = ProfileManager.getProfile().selectedTheme || 0; // 0: Icefield, 1: Starport Mist, 2: Corona Dawn
  private powerSaveMode = ProfileManager.isPowerSaveMode();
  private rotateControlButtons: Node[] = [];
  private static hasShownSplashThisSession = false;

  private closeAllModals(): void {
    if (this.settingsModalRootNode) this.settingsModalRootNode.active = false;
    if (this.reviveModalRootNode) this.reviveModalRootNode.active = false;
    if (this.victoryPosterRootNode) this.victoryPosterRootNode.active = false;
    this.closeGameActionSheet();
    const home = this.homePageRoot?.getComponent(HomeRoot);
    if (home) home.closePopup();
  }

  private closeGameActionSheet(): void {
    if (this.gameActionSheetRootNode?.isValid) {
      this.gameActionSheetRootNode.destroy();
    }
    this.gameActionSheetRootNode = null;
  }

  private openExclusiveModal(modalRoot: Node | null): void {
    this.closeAllModals();
    if (modalRoot) modalRoot.active = true;
  }

  private applyTheme(themeIdx: number): void {
    console.log(`[SceneBootstrap] Apply Theme Index ${themeIdx}`);
    this.currentTheme = themeIdx;
    if (!this.bgGraphicsNode) return;
    const g = this.bgGraphicsNode;
    g.clear();

    const palette = getUiPalette(themeIdx);

    // 1. 天幕纵向空灵渐变 (从顶端深邃星空过渡到地平线灵光霞气，彻底告别死板深黑蓝！)
    const topHex = palette.skyTop || '#121432';
    const midHex = palette.skyMid || '#182C58';
    const btmHex = palette.skyBottom || '#194474';
    const cTop = this.hex(topHex);
    const cMid = this.hex(midHex);
    const cBtm = this.hex(btmHex);

    const halfW = 1280;
    const halfH = 1280;
    const steps = 14;
    const stepH = (halfH * 2) / steps;

    for (let s = 0; s < steps; s++) {
      const t = s / (steps - 1);
      const curCol = new Color();
      if (t < 0.5) {
        Color.lerp(curCol, cTop, cMid, t * 2);
      } else {
        Color.lerp(curCol, cMid, cBtm, (t - 0.5) * 2);
      }
      g.fillColor = curCol;
      const y = halfH - (s + 1) * stepH;
      g.rect(-halfW, y, halfW * 2, stepH + 2);
      g.fill();
    }

    // 2. 天穹极光柔和漫射流带 (Soft Horizontal Aurora Glow - 柔化流光，告别生硬机械同心圆)
    const auroraCol = this.hex(palette.auroraColor || palette.cyan);
    auroraCol.a = 24;
    g.fillColor = auroraCol;
    g.ellipse(0, 360, 680, 240);
    g.fill();
    auroraCol.a = 15;
    g.fillColor = auroraCol;
    g.ellipse(-120, 440, 560, 200);
    g.fill();
    g.ellipse(140, 420, 580, 210);
    g.fill();

    // 3. 玩法核心区背光透亮光晕 (Central Ethereal Light Bloom - 柔和极光微雾，告别生硬椭圆轮廓)
    const centerBloom = this.hex(palette.glowAura || palette.glacier);
    centerBloom.a = 18;
    g.fillColor = centerBloom;
    g.ellipse(0, 40, 520, 260);
    g.fill();
    centerBloom.a = 10;
    g.fillColor = centerBloom;
    g.ellipse(0, 40, 720, 380);
    g.fill();

    // 4. 地平线梦幻连绵流体云海 (Continuous Fluid Cloud Wave Ocean - 彻底铲除重叠肥皂泡与鱼鳞圆环纹！)
    // 采用纪念碑谷风格的连绵波浪多边形，底部整洁收拢，绝不侵占关卡卡片与操作区
    const cMist = this.hex(palette.cloudMist || '#E0F2FE');
    const cWhite = this.hex(palette.cloudWhite || '#FFFFFF');

    // 4.1 远景柔和薄雾基底层 (Distant Atmosphere Mist Ramp - 底端平滑霞光过渡)
    const mistSteps = 8;
    const mistTopY = -560;
    const mistH = 260;
    const mistStepH = mistH / mistSteps;
    for (let mi = 0; mi < mistSteps; mi++) {
      const mt = mi / (mistSteps - 1);
      const curMistA = Math.floor(10 + mt * 45);
      g.fillColor = new Color(cMist.r, cMist.g, cMist.b, curMistA);
      g.rect(-halfW, mistTopY - (mi + 1) * mistStepH, halfW * 2, mistStepH + 2);
      g.fill();
    }

    // 4.2 中景柔和极光薄雾波浪
    g.fillColor = new Color(cMist.r, cMist.g, cMist.b, 42);
    g.moveTo(-halfW, -660);
    g.bezierCurveTo(-380, -630, -220, -675, -60, -645);
    g.bezierCurveTo(100, -618, 260, -668, halfW, -640);
    g.lineTo(halfW, -halfH);
    g.lineTo(-halfW, -halfH);
    g.close();
    g.fill();

    // 4.3 前景轻透云霭波脊（柔和半透明，不形成生硬白底条）
    g.fillColor = new Color(cWhite.r, cWhite.g, cWhite.b, 68);
    g.moveTo(-halfW, -725);
    g.bezierCurveTo(-320, -695, -140, -735, 40, -705);
    g.bezierCurveTo(200, -685, 360, -722, halfW, -700);
    g.lineTo(halfW, -halfH);
    g.lineTo(-halfW, -halfH);
    g.close();
    g.fill();

    // 4.4 底端柔雾收拢带
    g.fillColor = new Color(cWhite.r, cWhite.g, cWhite.b, 92);
    g.rect(-halfW, -halfH, halfW * 2, halfH - 752);
    g.fill();

    if (!this.powerSaveMode) {
      this.drawBackgroundDecorations(g, themeIdx);
    }

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
    this.rotateControlButtons.forEach((btn) => {
      const g = btn.getComponent(Graphics);
      if (g) {
        this.drawRotateButtonVisuals(g, getUiPalette(themeIdx));
      }
    });
  }

  private applyPowerSaveMode(enabled: boolean): void {
    this.powerSaveMode = enabled;
    const home = this.homePageRoot?.getComponent(HomeRoot);
    if (home) home.applyPowerSaveMode(enabled);
    const game = this.gamePageRoot?.getComponent(GameRoot);
    if (game) game.applyPowerSaveMode(enabled);
    this.applyTheme(this.currentTheme);
  }

  private drawBackgroundDecorations(graphics: Graphics, themeIdx: number): void {
    const palette = getUiPalette(themeIdx);

    // 5. 空灵柔光弯月与星云漫反射 (Ethereal Luminous Crescent Moon)
    const moonX = 258;
    const moonY = 472;
    const moonR = 32;
    const moonCol = this.hex(palette.moonColor || '#FFFBEB');
    const moonGlowCol = this.hex(palette.moonGlow || palette.cyan);

    graphics.fillColor = new Color(moonGlowCol.r, moonGlowCol.g, moonGlowCol.b, 14);
    graphics.circle(moonX, moonY, 68);
    graphics.fill();
    graphics.fillColor = new Color(moonGlowCol.r, moonGlowCol.g, moonGlowCol.b, 24);
    graphics.circle(moonX, moonY, 48);
    graphics.fill();

    graphics.fillColor = new Color(moonCol.r, moonCol.g, moonCol.b, 175);
    graphics.circle(moonX, moonY, moonR);
    graphics.fill();

    // 天穹同色弯月遮罩，营造通透弦月质感
    const moonShadowCol = this.hex(palette.skyTop);
    graphics.fillColor = new Color(moonShadowCol.r, moonShadowCol.g, moonShadowCol.b, 235);
    graphics.circle(moonX - 11, moonY + 7, 27);
    graphics.fill();

    // 6. 远景悬浮浮岛剪影（避让中央棋盘区，不戳出棋盘边缘）
    const isRose = themeIdx === 1;
    const isGold = themeIdx === 2;

    const satelliteIslands = [
      { x: -290, y: 430, w: 76, h: 22, depth: 36, hasWaterfall: true, hasCrystal: true, scale: 0.85 },
      { x: 295, y: 310, w: 68, h: 18, depth: 30, hasWaterfall: false, hasCrystal: true, scale: 0.78 },
      { x: -290, y: -420, w: 64, h: 18, depth: 28, hasWaterfall: false, hasCrystal: false, scale: 0.72 },
      { x: 285, y: -440, w: 58, h: 16, depth: 26, hasWaterfall: false, hasCrystal: false, scale: 0.68 },
    ];

    satelliteIslands.forEach((isle) => {
      const halfW = isle.w * 0.5;
      const halfH = isle.h * 0.5;
      const depth = isle.depth;

      // 浮岛底部倒悬低多边形山体 (Inverted Low-Poly Crag)
      const rockL = this.hex(isGold ? '#1F2937' : (isRose ? '#261238' : '#0B1D36'));
      const rockR = this.hex(isGold ? '#111827' : (isRose ? '#170924' : '#071326'));

      // 倒锥左受光面
      graphics.fillColor = rockL;
      graphics.moveTo(isle.x - halfW, isle.y);
      graphics.lineTo(isle.x, isle.y - depth);
      graphics.lineTo(isle.x, isle.y + halfH * 0.3);
      graphics.close();
      graphics.fill();

      // 倒锥右阴影面
      graphics.fillColor = rockR;
      graphics.moveTo(isle.x, isle.y + halfH * 0.3);
      graphics.lineTo(isle.x, isle.y - depth);
      graphics.lineTo(isle.x + halfW, isle.y);
      graphics.close();
      graphics.fill();

      // 岛体平顶雪原/冰晶草地 (Isle Top Plateau - 高亮纯净雪原，告别暗蓝)
      const topCol = this.hex(isGold ? '#10B981' : (isRose ? '#F472B6' : (palette.plateauSnow || '#F8FAFC')));
      graphics.fillColor = topCol;
      graphics.moveTo(isle.x, isle.y + halfH);
      graphics.lineTo(isle.x + halfW, isle.y);
      graphics.lineTo(isle.x, isle.y - halfH);
      graphics.lineTo(isle.x - halfW, isle.y);
      graphics.close();
      graphics.fill();

      // 边缘微光描线
      graphics.strokeColor = this.hex(isle.hasCrystal ? (isRose ? '#F472B6' : '#38BDF8') : '#FFFFFF');
      ((graphics.strokeColor) as any).a = 125;
      graphics.lineWidth = 1.0;
      graphics.moveTo(isle.x - halfW, isle.y);
      graphics.lineTo(isle.x, isle.y + halfH);
      graphics.lineTo(isle.x + halfW, isle.y);
      graphics.stroke();

      // 悬崖飞瀑倾泻效果 (Waterfall Cascading into Void)
      if (isle.hasWaterfall) {
        const fallX = isle.x - halfW * 0.25;
        const fallStartY = isle.y - halfH * 0.2;
        const fallLen = depth + 38;

        const wfCol = this.hex(palette.waterfallColor || '#38BDF8');
        graphics.fillColor = new Color(wfCol.r, wfCol.g, wfCol.b, 175);
        graphics.rect(fallX - 3.5, fallStartY - fallLen, 7, fallLen);
        graphics.fill();

        // 瀑布核心高光
        graphics.strokeColor = this.hex('#FFFFFF');
        ((graphics.strokeColor) as any).a = 210;
        graphics.lineWidth = 1.5;
        graphics.moveTo(fallX, fallStartY);
        graphics.lineTo(fallX, fallStartY - fallLen);
        graphics.stroke();

        // 跌落处散发的光雾飞沫
        graphics.fillColor = new Color(255, 255, 255, 120);
        graphics.circle(fallX - 4, fallStartY - fallLen - 4, 3);
        graphics.circle(fallX + 4, fallStartY - fallLen - 2, 2.5);
        graphics.circle(fallX, fallStartY - fallLen - 6, 4.5);
        graphics.fill();
      }

      // 岛顶矗立的伴生晶体 (Isle Top Crystals)
      if (isle.hasCrystal) {
        const cryX = isle.x + halfW * 0.2;
        const cryY = isle.y + halfH;
        const cryH = 22 * isle.scale;
        const cryW = 6 * isle.scale;

        const cryCol = this.hex(isRose ? '#F472B6' : (isGold ? '#F59E0B' : '#00F0FF'));
        graphics.fillColor = new Color(cryCol.r, cryCol.g, cryCol.b, 210);
        graphics.moveTo(cryX - cryW, cryY);
        graphics.lineTo(cryX, cryY + cryH);
        graphics.lineTo(cryX + cryW, cryY);
        graphics.close();
        graphics.fill();

        graphics.strokeColor = this.hex('#FFFFFF');
        ((graphics.strokeColor) as any).a = 180;
        graphics.lineWidth = 1.0;
        graphics.moveTo(cryX, cryY);
        graphics.lineTo(cryX, cryY + cryH);
        graphics.stroke();
      }
    });

    // 7. 漫天星轨星辰与十字芒星 (Starfield & Cross Sparkles)
    for (let i = 0; i < 28; i++) {
      const x = Math.sin(i * 997) * 640;
      const y = Math.cos(i * 631) * 420 + 60;
      const radius = 1.2 + (i % 3) * 0.9;
      graphics.fillColor = themeIdx === 1
        ? (i % 2 === 0 ? this.hex('#F472B6') : this.hex('#FFFFFF'))
        : (themeIdx === 2
          ? (i % 2 === 0 ? this.hex('#FFD76A') : this.hex('#E0F2FE'))
          : (i % 4 === 0 ? this.hex('#00F0FF') : (i % 3 === 0 ? this.hex('#C084FC') : this.hex('#FFFFFF'))));
      ((graphics.fillColor) as ((any)) as any).a = 180 + (i % 4) * 20;
      graphics.circle(x, y, radius);
      graphics.fill();

      if (radius > 2.0) {
        graphics.strokeColor = graphics.fillColor;
        graphics.lineWidth = 1;
        graphics.moveTo(x - radius * 2.8, y);
        graphics.lineTo(x + radius * 2.8, y);
        graphics.moveTo(x, y - radius * 2.8);
        graphics.lineTo(x, y + radius * 2.8);
        graphics.stroke();
      }
    }
  }

  protected onLoad(): void {
    console.log('[FloatFlow] SceneBootstrap onLoad');
    WeChatService.disableDebugMode();
    WeChatService.checkUpdate();
    WeChatService.initShareMenu();
    AdService.init(WeChatService.adUnitId, WeChatService.interstitialAdUnitId);
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
    home.applyTheme(this.currentTheme);
    home.applyPowerSaveMode(this.powerSaveMode);

    // 2. Game Page Root (Hidden by default until player starts a game!)
    const gamePage = this.createRoot('GamePage', new Vec3(0, 0, 0));
    this.gamePageRoot = gamePage;
    gamePage.active = false;

    const halfW = visibleSize.width / 2;
    const halfH = visibleSize.height / 2;

    // 动态计算在顶部导航条与底部操作区之间的可用垂直空间（初始居中，载入关卡时动态自适应贴合）
    const boardCenterY = 153;

    const boardRoot = this.createRoot('BoardRoot', new Vec3(0, boardCenterY, 0), gamePage);
    const previewRoot = this.createRoot('PreviewRoot', new Vec3(0, boardCenterY, 0), gamePage);
    const runnerRoot = this.createRoot('RunnerRoot', new Vec3(0, boardCenterY, 0), gamePage);
    const uiRoot = this.createRoot('UI', new Vec3(0, 0, 0), gamePage);

    // 1. 顶部导航栏（主页 & 关卡标题）：优雅移至微信胶囊按钮正下方
    // 彻底告别原先与胶囊挤在同一行导致的“右侧被迫断截断、关卡偏左、且与网格间留有 150px 巨大空洞”的问题！
    // 移至胶囊下方后，成为 672px 居中对称的高级玻璃拟态通栏，并显著缩小与网格的上下间距。
    let capsuleBottomOffset = 150;
    if (typeof wx !== 'undefined' && wx.getMenuButtonBoundingClientRect) {
      try {
        const rect = wx.getMenuButtonBoundingClientRect();
        const systemInfo = wx.getSystemInfoSync();
        const screenHeight = systemInfo.screenHeight || systemInfo.windowHeight;
        if (screenHeight > 0) {
          const ratio = view.getVisibleSize().height / screenHeight;
          capsuleBottomOffset = (rect.bottom) * ratio;
        }
      } catch (e) {
        console.warn('[SceneBootstrap] Failed to compute WeChat capsule bounding rect, using fallback:', e);
      }
    }
    const topNavHeight = 68;
    const topNavMarginTop = 18;
    const topNavYFromTop = capsuleBottomOffset + topNavMarginTop + topNavHeight / 2;
    const topNavY = halfH - topNavYFromTop;
    const { levelLabel, starPreviewLabel } = this.createTopNav(uiRoot, new Vec3(0, topNavY, 0));
    const constellationLabel = this.createConstellationStrip(uiRoot, new Vec3(0, topNavY - 54, 0));

    // 2. 底部卡槽保持隐藏（直接棋盘旋转模式），释放底部空间给 3 合 1 轻道具坞与冲关按钮
    const bottomDeckGraphics = this.createBottomDeck(uiRoot, new Vec3(0, -halfH + 280, 0));
    bottomDeckGraphics.node.active = false;
    const cardRoot = this.createRoot('CardRoot', new Vec3(0, -halfH + 280, 1), uiRoot);
    cardRoot.active = false;

    // 3. 通透实时进度胶囊（紧邻操作栏上方，消除重复规则文案）
    const tipPill = this.createRoot('TipPill', new Vec3(0, -halfH + 224, 0), uiRoot);
    this.ensureTransform(tipPill, 620, 34);
    const tg = tipPill.addComponent(Graphics);
    tg.fillColor = this.hex('#0F2344');
    ((tg.fillColor) as any).a = 165;
    tg.roundRect(-310, -17, 620, 34, 17);
    tg.fill();
    tg.strokeColor = this.hex('#38BDF8');
    ((tg.strokeColor) as any).a = 95;
    tg.lineWidth = 1.1;
    tg.stroke();
    const tipLabel = this.createLabel(tipPill, 'TipLabel', new Vec3(0, 1, 0), '⚡ 光路已接通 0% · 轻触水晶旋转导光', 17, '#E0F2FE', 590, 30);
    tipLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
    const btMeter = this.createBulletTimeMeter(tipPill, new Vec3(218, 0, 0));
    btMeter.node.active = false;

    const statusToast = this.createRoot('StatusToast', new Vec3(0, -halfH + 294, 0), uiRoot);
    this.ensureTransform(statusToast, 620, 42);
    const stg = statusToast.addComponent(Graphics);
    stg.fillColor = this.hex('#0F2344');
    ((stg.fillColor) as any).a = 225;
    stg.roundRect(-310, -21, 620, 42, 21);
    stg.fill();
    stg.strokeColor = this.hex('#FDE047');
    ((stg.strokeColor) as any).a = 180;
    stg.lineWidth = 1.6;
    stg.stroke();
    const statusLabel = this.createLabel(statusToast, 'StatusLabel', new Vec3(0, 1, 0), '轻触水晶旋转朝向', 19, '#FEF08A', 590, 34);
    statusToast.active = false;

    const game = gamePage.getComponent(GameRoot) ?? gamePage.addComponent(GameRoot);
    game.boardRoot = boardRoot;
    game.previewRoot = previewRoot;
    game.runnerRoot = runnerRoot;
    game.cardRoot = cardRoot;
    game.bottomDeckGraphics = bottomDeckGraphics;
    game.topNavNode = constellationLabel.node.parent;
    game.levelLabel = levelLabel;
    game.starPreviewLabel = starPreviewLabel;
    game.constellationLabel = constellationLabel;
    game.tipLabel = tipLabel;
    game.statusLabel = statusLabel;
    game.applyPowerSaveMode(this.powerSaveMode);

    // 4. 底部 3 合 1 轻道具坞：💡提示 · 🔨破障 · ↺重置（明确规则边界与求助出口）
    const actionRow = this.createRoot('ActionRow', new Vec3(0, -halfH + 168, 0), uiRoot);
    actionRow.active = true;
    game.bulletTimeNode = btMeter.node;
    game.bulletTimeGraphics = btMeter.graphics;
    game.bulletTimeValueLabel = btMeter.valueLabel;
    const { hammerBtnNode, hammerBtnLabel } = this.createSideActionButtons(actionRow, game, new Vec3(0, 0, 0));
    game.hammerButtonNode = hammerBtnNode;
    game.hammerButtonLabel = hammerBtnLabel;

    // 5. 底部核心冲关大按钮：连通终点时浮现（未吃满星核时由玩家自主选择直接冲关或继续拿满 3 星）
    this.createHeroButton(uiRoot, 'StartButton', new Vec3(0, -halfH + 84, 0), '🚀 立 即 冲 关', () => game.startRunner(), game);

    // 6. 旋转全面升级为原生自然交互：轻点手中卡牌即旋转、轻点棋盘地砖即旋转！彻底告别侧边悬空浮标，屏幕通透明亮。
    game.leftRotateButtonNode = null;
    game.rightRotateButtonNode = null;
    game.rotateButtonNode = null;
    this.rotateControlButtons = [];

    // 3. Settings Modal Root (Hidden by default!)
    const settingsModalRoot = this.createRoot('SettingsModalRoot', new Vec3(0, 0, 0));
    settingsModalRoot.active = false;
    this.settingsModalRootNode = settingsModalRoot;
    const settingsModal = settingsModalRoot.addComponent(SettingsModal);
    settingsModal.onThemeChangedCallback = (idx: number) => {
      this.applyTheme(idx);
    };
    settingsModal.onPowerSaveChangedCallback = (enabled: boolean) => {
      AnalyticsService.track('power_save_toggle', { enabled });
      this.applyPowerSaveMode(enabled);
      WeChatService.showToast(enabled ? '已开启省电流畅模式' : '已恢复完整流光特效', 'success');
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
    reviveModal.onShareHelpCallback = () => {
      console.log('[SceneBootstrap] Share current residual for help!');
      game.shareCurrentResidual();
    };
    game.onShowReviveModalCallback = (summary: FailureShareSummary) => {
      console.log('[SceneBootstrap] Show Revive Modal!');
      reviveModal.show(summary);
    };

    // 7. Level Select Root (Hidden by default!)
    const levelSelectRoot = this.createRoot('LevelSelectRoot', new Vec3(0, 0, 0));
    levelSelectRoot.active = false;
    this.levelSelectRootNode = levelSelectRoot;
    const levelSelect = levelSelectRoot.addComponent(LevelSelect);
    const journeyLevelCount = 30;

    const startJourneyLevel = (idx: number, source: 'continue' | 'select' | 'share' = 'select') => {
      const safeIndex = Math.max(0, Math.min(idx, journeyLevelCount - 1));
      const profile = ProfileManager.getProfile();
      const isFtueLevel = safeIndex < 8;
      if (!isFtueLevel && profile.energy <= 0) {
        this.showEnergyEmptyDialog(() => {
          this.closeAllModals();
          levelSelectRoot.active = false;
          gamePage.active = false;
          homePage.active = true;
        });
        return;
      }
      if (!isFtueLevel) {
        ProfileManager.addEnergy(-1);
      }

      // Auto apply themed scene color based on level index
      if (safeIndex >= 20 && safeIndex < 30) {
        this.applyTheme(2); // Theme 2: Corona Dawn for the final chapter.
      } else if (safeIndex >= 10 && safeIndex < 20) {
        this.applyTheme(1); // Theme 1: Starport Mist
      } else {
        this.applyTheme(0); // Theme 0: Icefield
      }

      console.log(`[SceneBootstrap] Start journey from ${source}, level index ${safeIndex}!`);
      this.closeAllModals();
      homePage.active = false;
      levelSelectRoot.active = false;
      gamePage.active = true;
      game.loadLevel(safeIndex);
    };
    levelSelect.onSelectLevelCallback = (idx: number) => {
      startJourneyLevel(idx, 'select');
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
      game.loadLevel(0, false, true);
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
      if (game.continueSpecialChallengeIfAny()) {
        return;
      }
      const nextIndex = game.getLevelIndex() + 1;
      if (nextIndex >= journeyLevelCount) {
        gamePage.active = false;
        levelSelectRoot.active = true;
        WeChatService.showToast('旅途关卡已全通，去无尽模式冲榜吧！', 'success');
        return;
      }
      startJourneyLevel(nextIndex, 'continue');
    };
    game.onShowVictoryPosterCallback = (levelId: number, levelName: string, stars: number, moves: number) => {
      console.log(`[SceneBootstrap] Show Victory Poster for ${levelName}!`);
      victoryPosterRoot.active = true;
      victoryPoster.showVictory(levelId, levelName, stars, moves);
      // 对接：自动同步通关层级和分数至微信关系链排行榜云存储
      const score = levelName.indexOf('今日光路') !== -1 ? Math.max(10, 100 - moves * 8) : (game.getLevelIndex() + 1) * 10 + stars;
      if (levelName.indexOf('今日光路') !== -1) {
        const profile = ProfileManager.getProfile();
        const rank = CloudGameService.getDailyLeaderboard(CloudGameService.getTodayKey(), profile.dailyChallengeBest || score, profile.dailyChallengeBestMoves || moves);
        WeChatService.showToast(rank.hintText, 'none');
      }
      WeChatService.uploadUserScore(game.getLevelIndex(), score);
      AdService.onNaturalBreak(ProfileManager.getProfile().levelProgress);
    };

    // Connect Home Page to Game Page, Level Select & Settings!
    home.onBeforeOpenPopup = () => {
      this.closeAllModals();
    };
    home.onOpenSettingsCallback = (entry: 'settings' | 'theme' = 'settings') => {
      console.log(`[SceneBootstrap] Open ${entry === 'theme' ? 'Theme Gallery' : 'Settings'} Modal!`);
      settingsModal.openAs(entry);
      this.openExclusiveModal(settingsModalRoot);
    };
    home.onOpenLevelSelectCallback = () => {
      console.log('[SceneBootstrap] Open LevelSelect from hero island!');
      this.closeAllModals();
      homePage.active = false;
      levelSelectRoot.active = true;
    };
    home.onStartJourneyCallback = () => {
      const profile = ProfileManager.getProfile();
      const continueIndex = Math.max(0, Math.min(profile.levelProgress, journeyLevelCount - 1));
      AnalyticsService.track('home_start_journey', { levelIndex: continueIndex });
      console.log(`[SceneBootstrap] Start Journey Mode -> Continue Level ${continueIndex + 1}!`);
      startJourneyLevel(continueIndex, 'continue');
    };
    home.onStartEndlessCallback = () => {
      console.log('[SceneBootstrap] Start Endless Mode -> Switch to GamePage!');
      this.closeAllModals();
      homePage.active = false;
      gamePage.active = true;
      game.loadLevel(0, false, true);
    };
    home.onStartDailyCallback = () => {
      console.log('[SceneBootstrap] Start Daily Challenge -> Switch to GamePage!');
      this.closeAllModals();
      homePage.active = false;
      levelSelectRoot.active = false;
      gamePage.active = true;
      game.loadDailyChallenge();
    };

    let handledInitialDeepLink = WeChatService.hasInitialLaunchQuery();
    WeChatService.checkLaunchQuery(
      (levelId: number, challengeMoves?: number) => {
        handledInitialDeepLink = true;
        console.log(`[SceneBootstrap] Launch from share with levelId=${levelId}, challengeMoves=${challengeMoves}`);
        const idx = game.findIndexByLevelId(levelId);
        if (idx >= 0) {
          this.closeAllModals();
          if (this.homePageRoot) this.homePageRoot.active = false;
          if (this.levelSelectRootNode) this.levelSelectRootNode.active = false;
          gamePage.active = true;
          game.loadLevel(idx);
          if (challengeMoves && challengeMoves > 0) {
            this.scheduleOnce(() => {
              WeChatService.showToast(`好友用 ${challengeMoves} 步破局，你能少一步吗？`, 'none');
            }, 0.5);
          }
        }
      },
      (residualStr: string) => {
        handledInitialDeepLink = true;
        console.log('[SceneBootstrap] Launch from share with residualStr');
        this.closeAllModals();
        if (this.homePageRoot) this.homePageRoot.active = false;
        if (this.levelSelectRootNode) this.levelSelectRootNode.active = false;
        gamePage.active = true;
        game.loadResidualFromShare(residualStr);
      },
      (assistId: string) => {
        handledInitialDeepLink = true;
        console.log(`[SceneBootstrap] Launch from solved residual assistId=${assistId}`);
        const canClaim = CloudGameService.canClaimResidualRequesterReward(assistId);
        const claimed = canClaim && ProfileManager.claimResidualHelpReward(assistId, 60);
        if (claimed) {
          CloudGameService.markResidualRequesterRewardClaimed(assistId);
        }
        WeChatService.showToast(claimed ? '好友已帮你接通，晶核 +60 💎' : '这份助攻奖励已领取或已过期', claimed ? 'success' : 'none');
        this.closeAllModals();
        if (this.homePageRoot) this.homePageRoot.active = true;
        if (this.levelSelectRootNode) this.levelSelectRootNode.active = false;
        gamePage.active = false;
      },
      () => {
        handledInitialDeepLink = true;
        console.log('[SceneBootstrap] Launch from daily challenge share');
        this.closeAllModals();
        if (this.homePageRoot) this.homePageRoot.active = false;
        if (this.levelSelectRootNode) this.levelSelectRootNode.active = false;
        gamePage.active = true;
        game.loadDailyChallenge();
      }
    );

    const initialProfile = ProfileManager.getProfile();
    const hasStartedJourney = Object.values(initialProfile.levelAttempts || {}).some((attempt) => attempt.starts > 0);
    if (!handledInitialDeepLink && initialProfile.levelProgress === 0 && !hasStartedJourney) {
      this.scheduleOnce(() => startJourneyLevel(0, 'continue'), 0);
    }
  }

  private showStudioSplash(): void {
    if (SceneBootstrap.hasShownSplashThisSession) {
      return;
    }
    SceneBootstrap.hasShownSplashThisSession = true;

    const visibleSize = view.getVisibleSize();
    const splashRoot = this.createRoot('StudioSplashRoot', new Vec3(0, 0, 999), this.node);
    this.ensureTransform(splashRoot, visibleSize.width, visibleSize.height);

    const bg = splashRoot.addComponent(Graphics);
    bg.fillColor = new Color(4, 11, 22, 255);
    bg.rect(-visibleSize.width / 2, -visibleSize.height / 2, visibleSize.width, visibleSize.height);
    bg.fill();

    const emblem = this.createRoot('Emblem', new Vec3(0, 52, 1), splashRoot);
    this.ensureTransform(emblem, 90, 90);
    const eg = emblem.addComponent(Graphics);
    eg.fillColor = new Color(41, 189, 224, 35);
    eg.circle(0, 0, 48);
    eg.fill();
    eg.fillColor = new Color(181, 233, 255, 230);
    eg.moveTo(0, 36);
    eg.lineTo(26, 0);
    eg.lineTo(0, -32);
    eg.lineTo(-26, 0);
    eg.close();
    eg.fill();
    eg.fillColor = new Color(41, 189, 224, 255);
    eg.moveTo(0, 22);
    eg.lineTo(15, 0);
    eg.lineTo(0, -18);
    eg.lineTo(-15, 0);
    eg.close();
    eg.fill();

    this.createLabel(splashRoot, 'BrandEn', new Vec3(0, -16, 1), 'HAMITU GAMES', 30, '#FFFFFF', 460, 40);
    this.createLabel(splashRoot, 'BrandZh', new Vec3(0, -56, 1), '哈密兔独立工作室 · 诚意出品', 18, '#29BDE0', 460, 28);
    this.createLabel(splashRoot, 'GameTag', new Vec3(0, -90, 1), '梦幻极光 · 浮岛连线益智', 14, '#94A3B8', 460, 24);

    let dismissed = false;
    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;
      tween(splashRoot)
        .to(0.32, { scale: new Vec3(1.04, 1.04, 1) }, { easing: 'quadOut' })
        .call(() => {
          if (splashRoot.isValid) splashRoot.destroy();
        })
        .start();
    };

    this.addClick(splashRoot, dismiss);
    this.scheduleOnce(() => {
      dismiss();
    }, 1.25);
  }

  private showEnergyEmptyDialog(onGoHome: () => void): void {
    const visibleSize = view.getVisibleSize();
    const palette = getUiPalette(this.currentTheme);
    const root = this.createRoot('EnergyEmptyDialog', new Vec3(0, 0, 20), this.node);
    this.ensureTransform(root, visibleSize.width, visibleSize.height);

    const overlay = this.createRoot('Overlay', new Vec3(0, 0, 0), root);
    this.ensureTransform(overlay, visibleSize.width, visibleSize.height);
    const og = overlay.addComponent(Graphics);
    og.fillColor = new Color(5, 10, 25, 168);
    og.rect(-visibleSize.width / 2, -visibleSize.height / 2, visibleSize.width, visibleSize.height);
    og.fill();
    this.addClick(overlay, () => root.destroy());

    const dialog = this.createRoot('Dialog', new Vec3(0, 0, 2), root);
    this.ensureTransform(dialog, 600, 380);
    const dg = dialog.addComponent(Graphics);
    dg.fillColor = this.hex(palette.panel);
    ((dg.fillColor) as any).a = 248;
    dg.roundRect(-300, -190, 600, 380, 30);
    dg.fill();
    dg.fillColor = this.hex(palette.panelSoft);
    ((dg.fillColor) as any).a = 76;
    dg.roundRect(-284, -174, 568, 348, 24);
    dg.fill();
    dg.fillColor = new Color(255, 255, 255, 24);
    dg.roundRect(-264, 158, 528, 8, 4);
    dg.fill();
    dg.strokeColor = this.hex(palette.gold);
    ((dg.strokeColor) as any).a = 210;
    dg.lineWidth = 2.4;
    dg.roundRect(-300, -190, 600, 380, 30);
    dg.stroke();
    dialog.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
      event.propagationStopped = true;
    });

    const icon = this.createRoot('EnergyIcon', new Vec3(0, 116, 3), dialog);
    this.ensureTransform(icon, 86, 86);
    const ig = icon.addComponent(Graphics);
    ig.fillColor = this.hex(palette.gold);
    ((ig.fillColor) as any).a = 45;
    ig.circle(0, 0, 42);
    ig.fill();
    ig.strokeColor = this.hex(palette.gold);
    ig.lineWidth = 2.4;
    ig.circle(0, 0, 34);
    ig.stroke();
    ig.fillColor = this.hex(palette.gold);
    ig.moveTo(8, 26);
    ig.lineTo(-14, -2);
    ig.lineTo(0, -2);
    ig.lineTo(-8, -28);
    ig.lineTo(18, 6);
    ig.lineTo(4, 6);
    ig.close();
    ig.fill();

    this.createLabel(dialog, 'Title', new Vec3(0, 58, 3), '时空能量不足', 28, palette.text, 420, 42);
    this.createLabel(dialog, 'Body', new Vec3(0, 10, 3), '旅途关卡需要 1 点能量。回首页点底部「福利-补能」，或点击顶部能量旁的「+」补充。', 18, palette.muted, 500, 62);
    this.createLabel(dialog, 'Tip', new Vec3(0, -42, 3), '也可以先玩无尽模式，不消耗旅途能量。', 16, palette.cyan, 500, 30);

    const goHome = this.createRoot('GoHomeBtn', new Vec3(-112, -126, 3), dialog);
    this.ensureTransform(goHome, 230, 58);
    const hg = goHome.addComponent(Graphics);
    hg.fillColor = this.hex(palette.gold);
    hg.roundRect(-115, -29, 230, 58, 24);
    hg.fill();
    hg.strokeColor = this.hex('#FFFFFF');
    ((hg.strokeColor) as any).a = 190;
    hg.lineWidth = 2.0;
    hg.roundRect(-115, -29, 230, 58, 24);
    hg.stroke();
    this.createLabel(goHome, 'Text', new Vec3(0, 1, 1), '去福利补能', 20, '#071126', 200, 36);
    this.addClick(goHome, () => {
      root.destroy();
      onGoHome();
    });

    const cancel = this.createRoot('CancelBtn', new Vec3(132, -126, 3), dialog);
    this.ensureTransform(cancel, 190, 58);
    const cg = cancel.addComponent(Graphics);
    cg.fillColor = this.hex(palette.panelSoft);
    ((cg.fillColor) as any).a = 230;
    cg.roundRect(-95, -29, 190, 58, 24);
    cg.fill();
    cg.strokeColor = this.hex(palette.cyan);
    ((cg.strokeColor) as any).a = 160;
    cg.lineWidth = 1.8;
    cg.roundRect(-95, -29, 190, 58, 24);
    cg.stroke();
    this.createLabel(cancel, 'Text', new Vec3(0, 1, 1), '稍后再说', 19, palette.text, 160, 36);
    this.addClick(cancel, () => root.destroy());

    if (!this.powerSaveMode) {
      dialog.setScale(new Vec3(0.92, 0.92, 1));
      tween(dialog)
        .to(0.22, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
        .start();
    }
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
    this.applyTheme(this.currentTheme);
  }

  private createTopNav(parent: Node, position: Vec3): { levelLabel: Label; starPreviewLabel: Label } {
    const node = new Node('TopNav');
    node.layer = Layers.Enum.UI_2D;
    node.setParent(parent);
    node.setPosition(position);
    this.ensureTransform(node, 672, 68);
    const graphics = node.addComponent(Graphics);
    const palette = getUiPalette(this.currentTheme);

    // Glassmorphic top navigation panel - 672px 居中对称通栏
    graphics.fillColor = this.hex(palette.panel);
    ((graphics.fillColor) as ((any)) as any).a = 205;
    graphics.roundRect(-336, -34, 672, 68, 22);
    graphics.fill();
    graphics.strokeColor = this.hex(palette.cyan);
    ((graphics.strokeColor) as any).a = 210;
    graphics.lineWidth = 2.0;
    graphics.roundRect(-336, -34, 672, 68, 22);
    graphics.stroke();

    // 关卡标题：居中偏左，留出右侧实时星级与步数徽章空间
    const levelLabel = this.createLabel(node, 'LevelLabel', new Vec3(-22, 0, 0), '第 1 关  光信出发', 22, palette.text, 310, 40);

    // 右侧实时星级与步数预判胶囊
    const starPillBg = new Node('StarPreviewPill');
    starPillBg.layer = Layers.Enum.UI_2D;
    starPillBg.setParent(node);
    starPillBg.setPosition(new Vec3(230, 0, 0));
    this.ensureTransform(starPillBg, 184, 46);
    const spg = starPillBg.addComponent(Graphics);
    spg.fillColor = this.hex(palette.panelSoft);
    ((spg.fillColor) as any).a = 215;
    spg.roundRect(-92, -23, 184, 46, 16);
    spg.fill();
    spg.strokeColor = this.hex('#FDE047');
    ((spg.strokeColor) as any).a = 175;
    spg.lineWidth = 1.6;
    spg.stroke();
    const starPreviewLabel = this.createLabel(starPillBg, 'StarPreviewLabel', new Vec3(0, 1, 0), '☆☆☆ · 0步', 18, '#FDE047', 176, 36);

    // 左侧「|| 主页」返回胶囊
    const homeReturnBtn = new Node('HomeReturnBtn');
    homeReturnBtn.layer = Layers.Enum.UI_2D;
    homeReturnBtn.setParent(node);
    homeReturnBtn.setPosition(new Vec3(-268, 0, 0));
    this.ensureTransform(homeReturnBtn, 112, 48);
    const hBg = homeReturnBtn.addComponent(Graphics);
    hBg.fillColor = this.hex(palette.panelSoft);
    ((hBg.fillColor) as any).a = 210;
    hBg.roundRect(-56, -24, 112, 48, 16);
    hBg.fill();
    hBg.strokeColor = this.hex('#60A5FA');
    ((hBg.strokeColor) as any).a = 210;
    hBg.lineWidth = 1.8;
    hBg.roundRect(-56, -24, 112, 48, 16);
    hBg.stroke();
    this.createLabel(homeReturnBtn, 'Text', new Vec3(0, 1, 0), '|| 主页', 20, '#FFFFFF', 106, 36);

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

    return { levelLabel, starPreviewLabel };
  }

  private createConstellationStrip(parent: Node, position: Vec3): Label {
    const node = new Node('ConstellationStrip');
    node.layer = Layers.Enum.UI_2D;
    node.setParent(parent);
    node.setPosition(position);
    this.ensureTransform(node, 672, 34);
    const g = node.addComponent(Graphics);
    const palette = getUiPalette(this.currentTheme);

    g.fillColor = this.hex(palette.panel);
    ((g.fillColor) as any).a = 155;
    g.roundRect(-336, -17, 672, 34, 17);
    g.fill();
    g.strokeColor = this.hex(palette.gold);
    ((g.strokeColor) as any).a = 120;
    g.lineWidth = 1.2;
    g.stroke();

    return this.createLabel(node, 'ConstellationLabel', new Vec3(0, 1, 0), '✦ 唤醒星座：天鹅座 (1/5) · 再过 4 关点亮星图', 16, '#FDE68A', 640, 28);
  }

  private createBottomDeck(parent: Node, position: Vec3): Graphics {
    const node = new Node('BottomDeck');
    node.layer = Layers.Enum.UI_2D;
    node.setParent(parent);
    node.setPosition(position);
    this.ensureTransform(node, 692, 176);
    const graphics = node.addComponent(Graphics);
    const palette = getUiPalette(this.currentTheme);

    // Luminous Sapphire Glassmorphic Tray
    graphics.fillColor = this.hex(palette.panel);
    ((graphics.fillColor) as any).a = 150;
    graphics.roundRect(-346, -88, 692, 176, 28);
    graphics.fill();
    graphics.fillColor = this.hex(palette.blue);
    ((graphics.fillColor) as any).a = 18;
    graphics.roundRect(-338, -80, 676, 160, 22);
    graphics.fill();
    graphics.fillColor = new Color(255, 255, 255, 24);
    graphics.roundRect(-328, 70, 656, 8, 4);
    graphics.fill();
    graphics.strokeColor = this.hex(palette.cyan);
    ((graphics.strokeColor) as any).a = 190;
    graphics.lineWidth = 2.2;
    graphics.roundRect(-346, -88, 692, 176, 28);
    graphics.stroke();
    return graphics;
  }

  private createBulletTimeMeter(parent: Node, position: Vec3): { node: Node; graphics: Graphics; valueLabel: Label } {
    const node = new Node('BulletTimeMeter');
    node.layer = Layers.Enum.UI_2D;
    node.setParent(parent);
    node.setPosition(position);
    this.ensureTransform(node, 156, 34);

    const g = node.addComponent(Graphics);
    // Graphics drawn dynamically in game.redrawBulletTimeMeter()

    this.createLabel(node, 'Title', new Vec3(-45, 0, 0), '缓冲', 15, '#93C5FD', 48, 26);
    const valueLabel = this.createLabel(node, 'Value', new Vec3(26, 0, 0), '⏱ 3.0s', 18, '#00F0FF', 90, 28);
    return { node, graphics: g, valueLabel };
  }

  private createSideActionButtons(parent: Node, game: GameRoot, position: Vec3): { hammerBtnNode: Node; hammerBtnLabel: Label } {
    const root = new Node('SideActions');
    root.layer = Layers.Enum.UI_2D;
    root.setParent(parent);
    root.setPosition(position);
    this.ensureTransform(root, 620, 58);
    const palette = getUiPalette(this.currentTheme);

    this.createSideActionButton(root, 'HintBtn', new Vec3(-196, 0, 0), 178, '💡 提 示', palette.panelSoft, '#FACC15', '#FEF08A', () => {
      game.showGameplayHint();
    });

    const hammerRes = this.createSideActionButton(root, 'HammerBtn', new Vec3(0, 0, 0), 192, '🔨 破障(2)', palette.panelSoft, '#F43F5E', '#FECDD3', () => {
      game.activateHammerMode();
    });

    this.createSideActionButton(root, 'ResetBtn', new Vec3(196, 0, 0), 178, '↺ 重 置', palette.panel, '#38BDF8', '#E0F2FE', () => {
      game.clearPlacedTiles();
    });

    return { hammerBtnNode: hammerRes.node, hammerBtnLabel: hammerRes.label };
  }

  private showMoreGameActions(game: GameRoot): void {
    if (!this.gamePageRoot) {
      return;
    }
    this.closeGameActionSheet();

    const visibleSize = view.getVisibleSize();
    const halfH = visibleSize.height / 2;
    const palette = getUiPalette(this.currentTheme);
    const root = this.createRoot('GameMoreDrawer', new Vec3(0, 0, 0), this.gamePageRoot);
    this.ensureTransform(root, visibleSize.width, visibleSize.height);
    root.setSiblingIndex(this.gamePageRoot.children.length - 1);
    this.gameActionSheetRootNode = root;

    const overlay = this.createRoot('DrawerOverlay', new Vec3(0, 0, 0), root);
    this.ensureTransform(overlay, visibleSize.width, visibleSize.height);
    const og = overlay.addComponent(Graphics);
    og.fillColor = new Color(5, 10, 25, 132);
    og.rect(-visibleSize.width / 2, -visibleSize.height / 2, visibleSize.width, visibleSize.height);
    og.fill();
    this.addClick(overlay, () => this.closeGameActionSheet());

    const sheetH = 360;
    const sheet = this.createRoot('DrawerSheet', new Vec3(0, -halfH + sheetH / 2, 1), root);
    this.ensureTransform(sheet, 660, sheetH);
    const sg = sheet.addComponent(Graphics);
    sg.fillColor = this.hex(palette.panel);
    ((sg.fillColor) as any).a = 248;
    sg.roundRect(-330, -sheetH / 2, 660, sheetH, 32);
    sg.fill();
    sg.fillColor = this.hex(palette.panelSoft);
    ((sg.fillColor) as any).a = 96;
    sg.roundRect(-314, -sheetH / 2 + 16, 628, sheetH - 32, 26);
    sg.fill();
    sg.strokeColor = this.hex(palette.cyan);
    ((sg.strokeColor) as any).a = 180;
    sg.lineWidth = 2.2;
    sg.roundRect(-330, -sheetH / 2, 660, sheetH, 32);
    sg.stroke();
    sheet.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
      event.propagationStopped = true;
    });

    this.createLabel(sheet, 'Title', new Vec3(0, 128, 2), '更多操作', 25, palette.text, 360, 38);
    this.createLabel(sheet, 'Hint', new Vec3(0, 101, 2), '低频操作收在这里，保持棋盘专注', 14, palette.muted, 460, 22);

    const actions = [
      { icon: '助', title: '残局求助', desc: '分享给好友帮你接光', border: '#22C55E', run: () => game.shareCurrentResidual() },
      { icon: '导', title: '光轨预测', desc: '切换棋盘虚线光路指引', border: '#38BDF8', run: () => game.showRoutePreview() },
      { icon: '勤', title: '通勤挑战', desc: '来一局短时挑战', border: palette.gold, run: () => game.loadCommuteChallenge() },
      { icon: '清', title: '重置棋盘', desc: '清空已放置手牌', border: '#64748B', run: () => game.clearPlacedTiles() },
    ];

    actions.forEach((action, index) => {
      const y = 48 - index * 54;
      const row = this.createRoot(`DrawerAction_${index}`, new Vec3(0, y, 2), sheet);
      this.ensureTransform(row, 582, 46);
      const rg = row.addComponent(Graphics);
      rg.fillColor = this.hex(palette.panelSoft);
      ((rg.fillColor) as any).a = index === actions.length - 1 ? 184 : 214;
      rg.roundRect(-291, -23, 582, 46, 15);
      rg.fill();
      const border = this.hex(action.border);
      border.a = index === actions.length - 1 ? 105 : 168;
      rg.strokeColor = border;
      rg.lineWidth = 1.4;
      rg.roundRect(-291, -23, 582, 46, 15);
      rg.stroke();

      rg.fillColor = new Color(border.r, border.g, border.b, 38);
      rg.circle(-258, 0, 20);
      rg.fill();
      this.createLabel(row, 'Icon', new Vec3(-258, 1, 1), action.icon, 18, action.border, 40, 32);
      this.createLabel(row, 'Title', new Vec3(-92, 8, 1), action.title, 18, palette.text, 250, 24);
      this.createLabel(row, 'Desc', new Vec3(-92, -12, 1), action.desc, 13, palette.muted, 250, 20);
      this.createLabel(row, 'Chevron', new Vec3(264, 0, 1), '›', 24, action.border, 34, 36);
      this.addClick(row, () => {
        this.closeGameActionSheet();
        action.run();
      });
    });

    const cancel = this.createRoot('DrawerCancel', new Vec3(0, -154, 2), sheet);
    this.ensureTransform(cancel, 582, 40);
    const cg = cancel.addComponent(Graphics);
    cg.fillColor = this.hex('#0D162C');
    ((cg.fillColor) as any).a = 230;
    cg.roundRect(-291, -20, 582, 40, 18);
    cg.fill();
    cg.strokeColor = this.hex('#475569');
    cg.lineWidth = 1.4;
    cg.roundRect(-291, -20, 582, 40, 18);
    cg.stroke();
    this.createLabel(cancel, 'Text', new Vec3(0, 1, 1), '取消', 18, '#CBD5E1', 300, 30);
    this.addClick(cancel, () => this.closeGameActionSheet());

    if (!this.powerSaveMode) {
      sheet.setPosition(new Vec3(0, -halfH - sheetH / 2, 1));
      tween(sheet)
        .to(0.22, { position: new Vec3(0, -halfH + sheetH / 2, 1) }, { easing: 'backOut' })
        .start();
    }
  }

  private createSideActionButton(parent: Node, name: string, pos: Vec3, width: number, labelStr: string, bgHex: string, borderHex: string, textHex: string, onClick: () => void): { node: Node; label: Label } {
    const node = new Node(name);
    node.layer = Layers.Enum.UI_2D;
    node.setParent(parent);
    node.setPosition(pos);
    const btnHeight = 54;
    this.ensureTransform(node, width, btnHeight);

    const g = node.addComponent(Graphics);
    g.fillColor = this.hex(bgHex);
    ((g.fillColor) as any).a = labelStr.includes('提示') ? 225 : 200;
    g.roundRect(-width / 2, -btnHeight / 2, width, btnHeight, 22);
    g.fill();
    g.strokeColor = this.hex(borderHex);
    ((g.strokeColor) as any).a = labelStr.includes('提示') ? 220 : 180;
    g.lineWidth = labelStr.includes('提示') ? 2.2 : 1.8;
    g.roundRect(-width / 2, -btnHeight / 2, width, btnHeight, 22);
    g.stroke();

    const label = this.createLabel(node, 'Text', new Vec3(0, 1, 0), labelStr, 21, textHex, width - 8, 38);
    this.addClick(node, () => {
      tween(node)
        .to(0.08, { scale: new Vec3(0.96, 0.96, 1) })
        .to(0.12, { scale: new Vec3(1.03, 1.03, 1) })
        .to(0.08, { scale: new Vec3(1.0, 1.0, 1) })
        .start();
      onClick();
    });
    return { node, label };
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
    this.addClick(node, () => {
      tween(node)
        .to(0.08, { scale: new Vec3(0.96, 0.96, 1) })
        .to(0.12, { scale: new Vec3(1.03, 1.03, 1) })
        .to(0.08, { scale: new Vec3(1.0, 1.0, 1) })
        .start();
      onClick();
    });
  }

  private createHeroButton(parent: Node, name: string, position: Vec3, text: string, onClick: () => void, game?: GameRoot): void {
    const node = new Node(name);
    node.layer = Layers.Enum.UI_2D;
    node.setParent(parent);
    node.setPosition(position);
    const width = 540; // 540 宽度
    const height = 72; // 72 高度符合 8pt
    const palette = getUiPalette(this.currentTheme);
    this.ensureTransform(node, width, height);

    const graphics = node.addComponent(Graphics);
    graphics.fillColor = this.hex(palette.cyan);
    ((graphics.fillColor) as any).a = 56;
    graphics.roundRect(-width / 2 - 10, -height / 2 - 7, width + 20, height + 14, 43);
    graphics.fill();
    graphics.fillColor = this.hex('#0891B2');
    graphics.roundRect(-width / 2, -height / 2, width, height, 36);
    graphics.fill();
    graphics.fillColor = this.hex(palette.cyan);
    ((graphics.fillColor) as any).a = 232;
    graphics.roundRect(-width / 2 + 10, -height / 2 + 8, width - 20, height - 16, 30);
    graphics.fill();
    graphics.fillColor = new Color(255, 255, 255, 58);
    graphics.roundRect(-width / 2 + 22, height / 2 - 16, width - 44, 8, 4);
    graphics.fill();
    graphics.strokeColor = this.hex('#FFFFFF');
    ((graphics.strokeColor) as any).a = 225;
    graphics.lineWidth = 3.0;
    graphics.roundRect(-width / 2, -height / 2, width, height, 36);
    graphics.stroke();

    const labelNode = new Node('Label');
    labelNode.layer = Layers.Enum.UI_2D;
    labelNode.setParent(node);
    labelNode.setPosition(new Vec3(0, -2, 1));
    this.ensureTransform(labelNode, width, height - 8);
    const label = labelNode.addComponent(Label);
    label.string = text;
    label.fontSize = 28; // H3 (28px)
    label.color = this.hex('#071126');

    if (game) {
      game.heroButtonNode = node;
      game.heroButtonLabel = label;
      node.active = false; // 初始静默隐藏，贯通时辉煌浮现
    }

    this.addClick(node, () => {
      tween(node)
        .to(0.08, { scale: new Vec3(0.96, 0.96, 1) })
        .to(0.12, { scale: new Vec3(1.03, 1.03, 1) })
        .to(0.08, { scale: new Vec3(1.0, 1.0, 1) })
        .start();
      onClick();
    });

    if (!this.powerSaveMode) {
      tween(node)
        .to(1.1, { scale: new Vec3(1.035, 1.035, 1) }, { easing: 'sineInOut' })
        .to(1.1, { scale: new Vec3(1.0, 1.0, 1) }, { easing: 'sineInOut' })
        .union()
        .repeatForever()
        .start();
    }
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
    const palette = getUiPalette(this.currentTheme);
    // Sleek secondary button, tuned by the current theme palette.
    graphics.fillColor = this.hex(palette.panelSoft);
    graphics.roundRect(-width / 2, -height / 2, width, height, 32); // 32 圆角符合 8pt
    graphics.fill();
    const sBorder = this.hex(this.currentTheme === 2 ? palette.gold : palette.blue);
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

    this.addClick(node, () => {
      tween(node)
        .to(0.08, { scale: new Vec3(0.96, 0.96, 1) })
        .to(0.12, { scale: new Vec3(1.03, 1.03, 1) })
        .to(0.08, { scale: new Vec3(1.0, 1.0, 1) })
        .start();
      onClick();
    });
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

  private createRotateControlButton(parent: Node, game: GameRoot, position: Vec3, name = 'RotateControlButton'): Node {
    const node = new Node(name);
    node.layer = Layers.Enum.UI_2D;
    node.setParent(parent);
    node.setPosition(position);
    const size = 76;
    this.ensureTransform(node, 92, 92); // 92x92 触控扩大判定区

    const graphics = node.addComponent(Graphics);
    const palette = getUiPalette(this.currentTheme);
    this.drawRotateButtonVisuals(graphics, palette);

    // 文字标识：下半部微标
    const labelNode = new Node('Label');
    labelNode.layer = Layers.Enum.UI_2D;
    labelNode.setParent(node);
    labelNode.setPosition(new Vec3(0, -18, 1));
    this.ensureTransform(labelNode, size, 24);
    const label = labelNode.addComponent(Label);
    label.string = '旋转';
    label.fontSize = 17;
    label.color = this.hex('#FFFFFF');

    // 触摸监听（TouchStart 即发，双手连招零延迟！）
    node.on(Node.EventType.TOUCH_START, () => {
      tween(node).stop();
      tween(node).to(0.06, { scale: new Vec3(0.88, 0.88, 1) }).start();
      game.rotateCurrentTarget(node);
    }, this);

    node.on(Node.EventType.TOUCH_END, () => {
      tween(node).stop();
      tween(node).to(0.12, { scale: new Vec3(1.0, 1.0, 1) }, { easing: 'backOut' }).start();
    }, this);

    node.on(Node.EventType.TOUCH_CANCEL, () => {
      tween(node).stop();
      node.setScale(new Vec3(1.0, 1.0, 1));
    }, this);

    if (!this.powerSaveMode) {
      // 待机轻微呼吸流光提示
      tween(node)
        .to(1.4, { scale: new Vec3(1.03, 1.03, 1) }, { easing: 'sineInOut' })
        .to(1.4, { scale: new Vec3(1.0, 1.0, 1) }, { easing: 'sineInOut' })
        .union()
        .repeatForever()
        .start();
    }

    return node;
  }

  private drawRotateButtonVisuals(graphics: Graphics, palette: any): void {
    graphics.clear();
    const radius = 38;

    // 1. 底板外围暗色晕影
    graphics.fillColor = this.hex('#040B18');
    ((graphics.fillColor) as any).a = 235;
    graphics.circle(0, 0, radius);
    graphics.fill();

    // 2. 内层微光水蓝色光斑
    graphics.fillColor = this.hex(palette.cyan);
    ((graphics.fillColor) as any).a = 38;
    graphics.circle(0, 0, radius - 4);
    graphics.fill();

    // 3. 赛博流光双层描边
    graphics.strokeColor = this.hex(palette.cyan);
    ((graphics.strokeColor) as any).a = 220;
    graphics.lineWidth = 2.4;
    graphics.circle(0, 0, radius);
    graphics.stroke();

    graphics.strokeColor = this.hex('#FFFFFF');
    ((graphics.strokeColor) as any).a = 70;
    graphics.lineWidth = 1.0;
    graphics.circle(0, 0, radius - 4);
    graphics.stroke();

    // 4. 顺时针旋转箭头图标（绘制在按钮上半部分 Y = 10 处）
    const centerY = 10;
    const arcRadius = 14;

    graphics.strokeColor = this.hex('#FFFFFF');
    graphics.lineWidth = 3.2;
    // 顺时针圆弧：从 0.2*PI 到 1.55*PI（即大半圈）
    graphics.arc(0, centerY, arcRadius, Math.PI * 0.2, Math.PI * 1.55, false);
    graphics.stroke();

    // 箭头小三角（位于弧线终点 Math.PI * 0.2 附近，顺时针向下）
    const tipX = arcRadius * Math.cos(Math.PI * 0.2);
    const tipY = centerY + arcRadius * Math.sin(Math.PI * 0.2);

    graphics.fillColor = this.hex('#FFFFFF');
    graphics.moveTo(tipX + 6, tipY + 4);
    graphics.lineTo(tipX - 1, tipY - 4);
    graphics.lineTo(tipX - 6, tipY + 6);
    graphics.close();
    graphics.fill();

    // 5. 左下角与右上角流光点缀
    graphics.fillColor = this.hex(palette.cyan);
    graphics.circle(-arcRadius + 2, centerY - 2, 2.0);
    graphics.circle(arcRadius - 3, centerY - 3, 2.0);
    graphics.fill();
  }
}
