import { _decorator, BlockInputEvents, Button, Color, Component, EventTouch, Graphics, Label, Layers, Node, tween, UIOpacity, UITransform, Vec3, view } from 'cc';
import { WeChatService } from '../wx/WeChatService';
import { ProfileManager } from '../core/ProfileManager';
import { CloudGameService } from '../wx/CloudGameService';
import { ShareService } from '../wx/ShareService';
import { AnalyticsService } from '../wx/AnalyticsService';
import { AdService } from '../wx/AdService';
import { getUiPalette, type UiPalette } from '../ui/UiTheme';

declare const wx: any;

const { ccclass } = _decorator;

@ccclass('HomeRoot')
export class HomeRoot extends Component {
  public onStartJourneyCallback?: () => void;
  public onStartEndlessCallback?: () => void;
  public onStartDailyCallback?: () => void;
  public onOpenSettingsCallback?: (entry?: 'settings' | 'theme') => void;
  public onOpenLevelSelectCallback?: () => void;
  public onBeforeOpenPopup?: () => void;

  private heroIslandNode: Node | null = null;
  private popupRoot: Node | null = null;
  private currentTheme = 0; // 0: 极光冰原, 1: 星港晨雾, 2: 日冕晨光
  private powerSaveMode = ProfileManager.isPowerSaveMode();
  private subContextContainer: Node | null = null;

  protected onLoad(): void {
    console.log('[FloatFlow] HomeRoot onLoad');
    this.node.layer = Layers.Enum.UI_2D;
    const vs = view.getVisibleSize();
    this.ensureTransform(this.node, vs.width, vs.height);
    this.rebuildUI();
  }

  public applyTheme(themeIdx: number): void {
    console.log(`[HomeRoot] Apply Theme Index ${themeIdx}`);
    this.currentTheme = themeIdx;
    this.rebuildUI();
  }

  public applyPowerSaveMode(enabled: boolean): void {
    this.powerSaveMode = enabled;
    this.rebuildUI();
  }

  public closePopup(): void {
    if (!this.popupRoot) {
      return;
    }
    if (this.subContextContainer) {
      WeChatService.hideFriendLeaderboard(this.subContextContainer);
      this.subContextContainer = null;
    }
    this.popupRoot.destroyAllChildren();
    this.popupRoot.active = false;
  }

  private beginExclusivePopup(): boolean {
    if (!this.popupRoot) {
      return false;
    }
    if (this.onBeforeOpenPopup) {
      this.onBeforeOpenPopup();
    }
    if (!this.popupRoot) {
      return false;
    }
    this.popupRoot.active = true;
    this.popupRoot.setSiblingIndex(this.node.children.length - 1);
    this.popupRoot.destroyAllChildren();
    return true;
  }

  private getBounds(): { halfW: number; halfH: number } {
    const size = view.getVisibleSize();
    let halfW = size.width / 2;
    let halfH = size.height / 2;
    if (halfW < 300 || isNaN(halfW)) halfW = 360;
    if (halfH < 600 || isNaN(halfH)) halfH = 779;
    return { halfW, halfH };
  }

  private getPalette(): UiPalette {
    return getUiPalette(this.currentTheme);
  }

  private getCurrentThemeName(): string {
    if (this.currentTheme === 1) return '星港晨雾';
    if (this.currentTheme === 2) return '日冕晨光';
    return '极光冰原';
  }

  private colorWithAlpha(hex: string, alpha: number): Color {
    const color = this.hex(hex);
    color.a = alpha;
    return color;
  }

  private drawGlassPanel(g: Graphics, width: number, height: number, radius: number, borderHex: string, fillHex = '#071126', fillAlpha = 224, lineWidth = 1.8): void {
    g.fillColor = this.colorWithAlpha(fillHex, fillAlpha);
    g.roundRect(-width / 2, -height / 2, width, height, radius);
    g.fill();
    g.fillColor = this.colorWithAlpha('#FFFFFF', 24);
    g.roundRect(-width / 2 + 8, height / 2 - 14, width - 16, 8, 4);
    g.fill();
    g.strokeColor = this.colorWithAlpha(borderHex, 180);
    g.lineWidth = lineWidth;
    g.roundRect(-width / 2, -height / 2, width, height, radius);
    g.stroke();
  }

  private createPopupOverlay(parent: Node, onClose: () => void, alpha = 160): Node {
    const overlay = this.createNode('Overlay', new Vec3(0, 0, 0), parent);
    const overlaySize = view.getVisibleSize();
    this.ensureTransform(overlay, overlaySize.width, overlaySize.height);
    const og = overlay.addComponent(Graphics);
    og.fillColor = new Color(5, 10, 25, alpha);
    og.rect(-overlaySize.width / 2, -overlaySize.height / 2, overlaySize.width, overlaySize.height);
    og.fill();
    this.addClick(overlay, onClose);
    return overlay;
  }

  private blockTouchThrough(node: Node): void {
    if (!node.getComponent(BlockInputEvents)) {
      node.addComponent(BlockInputEvents);
    }
    const stop = (event: EventTouch) => {
      event.propagationStopped = true;
    };
    node.on(Node.EventType.TOUCH_START, stop, this);
    node.on(Node.EventType.TOUCH_MOVE, stop, this);
    node.on(Node.EventType.TOUCH_END, stop, this);
    node.on(Node.EventType.TOUCH_CANCEL, stop, this);
  }

  private animatePopup(dialog: Node): void {
    if (this.powerSaveMode) {
      return;
    }
    let opacity = dialog.getComponent(UIOpacity);
    if (!opacity) opacity = dialog.addComponent(UIOpacity);
    dialog.setScale(new Vec3(0.92, 0.92, 1));
    opacity.opacity = 0;
    tween(dialog)
      .to(0.22, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
      .start();
    tween(opacity).to(0.16, { opacity: 255 }).start();
  }

  private rebuildUI(): void {
    this.node.destroyAllChildren();
    const { halfW, halfH } = this.getBounds();

    // 1. Top Resource & Settings Bar (Y = halfH - 125, safely left-aligned to leave X > +150 100% BLANK for WeChat Capsule!)
    this.createTopBar(halfH);

    // 2. Main Title Typography & Glow Aura (Y = halfH * 0.73)
    this.createTitleSection(halfH);

    // 3. Center Hero Floating 3D Isometric Island & Crystal Core (Y = halfH * 0.36)
    this.createHeroIsland(halfH);
    this.createFlowMascot(halfW, halfH);

    // 4. Left Sidebar Modern Flat Icon Buttons (X = -halfW + 52) - Sleek concrete icons replacing rigid text boxes!
    this.createSidebarIcons(halfW, halfH);

    // 5. Center/Bottom Dual Mode Hero Cards (Y = -halfH * 0.04) - Enhanced visual dominance!
    this.createModeCards(halfH);

    // 6. Bottom Feature Mini Pills (Y = -halfH + 160) - Compact row, no longer competing with gameplay modes!
    this.createBottomFeatureRow(halfH);

    // 7. Interactive Sidebar Popup Root
    const vs = view.getVisibleSize();
    this.popupRoot = this.createNode('PopupRoot', new Vec3(0, 0, 0), this.node);
    this.ensureTransform(this.popupRoot, vs.width, vs.height);
    this.popupRoot.active = false;

    if (!ProfileManager.isHealthNoticeAccepted()) {
      this.scheduleOnce(() => this.showHealthAdvisoryPopup(false), 0.2);
    }
  }

  private addClick(node: Node, onClick: () => void): void {
    let btn = node.getComponent(Button);
    if (!btn) btn = node.addComponent(Button);
    btn.transition = Button.Transition.SCALE;
    btn.zoomScale = 0.92;
    node.on(Node.EventType.TOUCH_START, (event: EventTouch) => {
      event.propagationStopped = true;
    }, this);
    node.on(Node.EventType.TOUCH_MOVE, (event: EventTouch) => {
      event.propagationStopped = true;
    }, this);
    node.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
      event.propagationStopped = true;
    }, this);
    node.on(Node.EventType.TOUCH_CANCEL, (event: EventTouch) => {
      event.propagationStopped = true;
    }, this);
    node.off(Button.EventType.CLICK);
    node.on(Button.EventType.CLICK, onClick, this);
  }

  private createTopBar(halfH: number): void {
    // 微信胶囊按钮固定于屏幕右上角。
    // 本次优化通过 wx.getMenuButtonBoundingClientRect() 动态计算安全 Y 偏移！
    let capsuleYOffset = 125;
    if (typeof wx !== 'undefined' && wx.getMenuButtonBoundingClientRect) {
      try {
        const rect = wx.getMenuButtonBoundingClientRect();
        const systemInfo = wx.getSystemInfoSync();
        const screenHeight = systemInfo.screenHeight || systemInfo.windowHeight;
        if (screenHeight > 0) {
          const ratio = view.getVisibleSize().height / screenHeight;
          const capsuleCenterYFromTop = (rect.top + rect.height / 2) * ratio;
          capsuleYOffset = capsuleCenterYFromTop;
        }
      } catch (e) {
        console.warn('[HomeRoot] Failed to compute WeChat capsule bounding rect, using fallback:', e);
      }
    }

    const topBar = this.createNode('TopBar', new Vec3(0, halfH - capsuleYOffset - 10, 0), this.node);
    this.ensureTransform(topBar, 1280, 76);

    const palette = this.getPalette();
    const dBorder = palette.cyan;
    const dBg = palette.panelSoft;
    const eBorder = this.currentTheme === 2 ? palette.violet : palette.blue;
    const eBg = palette.panelSoft;

    // 1. 设置齿轮按钮 (X = -268, 宽度 120, 高度 56, 左边缘对齐 -328)
    const settingsBtn = this.createNode('SettingsBtn', new Vec3(-268, 0, 0), topBar);
    this.ensureTransform(settingsBtn, 120, 56);
    const sg = settingsBtn.addComponent(Graphics);
    sg.fillColor = this.hex(dBg);
    ((sg.fillColor) as any).a = 210;
    sg.roundRect(-60, -28, 120, 56, 28); // 圆角 28
    sg.fill();
    const borderCol = this.hex(dBorder);
    borderCol.a = 120;
    sg.strokeColor = borderCol;
    sg.lineWidth = 1.6;
    sg.stroke();

    // Top highlight specular line
    sg.strokeColor = new Color(255, 255, 255, 80);
    sg.lineWidth = 1.2;
    sg.moveTo(-40, 24);
    sg.lineTo(40, 24);
    sg.stroke();

    // Draw settings gear icon
    this.drawGearIcon(sg, -28, 0, 10);

    this.createLabel(settingsBtn, 'Icon', new Vec3(14, 1, 0), '设置', 21, '#FFFFFF', 70, 44); // 字体 21

    this.addClick(settingsBtn, () => {
      console.log('[HomeRoot] Click Settings');
      if (this.onOpenSettingsCallback) this.onOpenSettingsCallback('settings');
    });

    const profile = ProfileManager.getProfile();
    // 2. 晶核资源胶囊 (X = -102, 宽度 180, 高度 56, 间距 16px)
    const diamondPill = this.createResourcePill(topBar, 'DiamondPill', new Vec3(-102, 0, 0), `${profile.diamonds} +`, dBorder, dBg, 180, 'diamond');
    this.addClick(diamondPill, () => this.showWelfareCenter());

    // 3. 能量资源胶囊 (X = 94, 宽度 180, 高度 56, 间距 16px, 最右侧边缘到 +184)
    const energyPill = this.createResourcePill(topBar, 'EnergyPill', new Vec3(94, 0, 0), `${profile.energy}/10 +`, eBorder, eBg, 180, 'energy');
    this.addClick(energyPill, () => this.showWelfareCenter());
  }

  private drawGearIcon(g: Graphics, x: number, y: number, radius: number): void {
    g.strokeColor = Color.WHITE;
    g.fillColor = Color.WHITE;
    g.lineWidth = 1.6;
    g.circle(x, y, radius * 0.35);
    g.stroke();

    g.circle(x, y, radius * 0.65);
    g.stroke();

    const teeth = 8;
    for (let i = 0; i < teeth; i++) {
      const angle = (i * Math.PI * 2) / teeth;
      const x0 = x + Math.cos(angle) * (radius * 0.65);
      const y0 = y + Math.sin(angle) * (radius * 0.65);
      const x1 = x + Math.cos(angle) * (radius * 0.95);
      const y1 = y + Math.sin(angle) * (radius * 0.95);
      g.moveTo(x0, y0);
      g.lineTo(x1, y1);
      g.stroke();
    }
  }

  private createResourcePill(parent: Node, name: string, pos: Vec3, text: string, borderHex: string, bgHex: string, width: number, iconType: 'diamond' | 'energy'): Node {
    const pill = this.createNode(name, pos, parent);
    this.ensureTransform(pill, width, 56); // 56px 高度
    const g = pill.addComponent(Graphics);
    g.fillColor = this.hex(bgHex);
    ((g.fillColor) as any).a = 200;
    g.roundRect(-width / 2, -28, width, 56, 28); // 圆角 28
    g.fill();
    const borderCol = this.hex(borderHex);
    borderCol.a = 120;
    g.strokeColor = borderCol;
    g.lineWidth = 1.6;
    g.stroke();

    // Top highlight specular line for glassmorphic style
    g.strokeColor = new Color(255, 255, 255, 80);
    g.lineWidth = 1.2;
    g.moveTo(-width / 2 + 20, 24);
    g.lineTo(width / 2 - 20, 24);
    g.stroke();

    // Draw custom vector icon on the left
    const iconX = -width / 2 + 28;
    if (iconType === 'diamond') {
      g.fillColor = this.hex('#00F0FF');
      g.strokeColor = Color.WHITE;
      g.lineWidth = 1.5;
      g.moveTo(iconX - 12, 1);
      g.lineTo(iconX, 13);
      g.lineTo(iconX + 12, 1);
      g.lineTo(iconX, -11);
      g.close();
      g.fill();
      g.stroke();
    } else if (iconType === 'energy') {
      g.fillColor = this.hex('#FDE047');
      g.strokeColor = Color.WHITE;
      g.lineWidth = 1.5;
      g.moveTo(iconX + 2, 13);
      g.lineTo(iconX - 8, -3);
      g.lineTo(iconX - 1, -3);
      g.lineTo(iconX - 3, -13);
      g.lineTo(iconX + 8, 1);
      g.lineTo(iconX + 1, 1);
      g.close();
      g.fill();
      g.stroke();
    }

    this.createLabel(pill, 'Text', new Vec3(14, 1, 0), text, 21, '#FFFFFF', width - 56, 44); // 字体 21
    return pill;
  }

  private createTitleSection(halfH: number): void {
    // 优化：把主标题下移至 halfH * 0.64 (约 +498)，为顶部导航条与中间浮岛留出完美黄金分割布局
    const titleRoot = this.createNode('TitleRoot', new Vec3(0, halfH * 0.64, 0), this.node);
    this.ensureTransform(titleRoot, 640, 130);

    const palette = this.getPalette();
    const auraOuter = palette.blue;
    const auraInner = this.currentTheme === 2 ? palette.violet : palette.cyan;
    const subCol = this.currentTheme === 2 ? palette.gold : palette.cyan;

    const aura = this.createNode('TitleAura', new Vec3(0, 2, 0), titleRoot);
    this.ensureTransform(aura, 400, 80);
    const ag = aura.addComponent(Graphics);
    ag.fillColor = this.hex(auraOuter);
    ((ag.fillColor) as any).a = 150; // Softened
    ag.circle(0, 4, 76);
    ag.fill();
    ag.fillColor = this.hex(auraInner);
    ((ag.fillColor) as any).a = 90;
    ag.circle(0, 4, 42);
    ag.fill();

    this.createLabel(titleRoot, 'MainTitle', new Vec3(0, 14, 0), '浮 岛 浮 光', 60, '#FFFFFF', 540, 72);
    this.createLabel(titleRoot, 'SubTitle', new Vec3(0, -36, 0), '═══  F L O A T   &   F L O W  ═══', 18, subCol, 500, 34);
  }

  private createHeroIsland(halfH: number): void {
    // 优化：把浮岛位置调整到 halfH * 0.22 (约 +171)，并使之成为可点击入口，且修复了 tween 跳动的 Bug
    const islandY = halfH * 0.25;
    const islandRoot = this.createNode('HeroIslandRoot', new Vec3(0, islandY, 0), this.node);
    this.ensureTransform(islandRoot, 620, 420);
    this.heroIslandNode = islandRoot;

    const g = islandRoot.addComponent(Graphics);

    const tileW = 152;
    const tileH = 88;
    const depth = 34;
    const coords = [
      { r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 },
      { r: 1, c: 0 }, { r: 1, c: 1 }, { r: 1, c: 2 },
      { r: 2, c: 0 }, { r: 2, c: 1 }
    ];

    const isRose = this.currentTheme === 1;
    const isGold = this.currentTheme === 2;

    coords.forEach(({ r, c }) => {
      const x = (c - r) * (tileW / 2);
      const y = (c + r) * (tileH / 2) - 40;
      const isCenter = r === 1 && c === 1;

      let topCol = isCenter ? this.hex('#22D3EE') : ((r + c) % 2 === 0 ? this.hex('#2563EB') : this.hex('#0EA5E9'));
      let leftCol = isCenter ? this.hex('#0F766E') : ((r + c) % 2 === 0 ? this.hex('#1E40AF') : this.hex('#0369A1'));
      let rightCol = isCenter ? this.hex('#164E63') : ((r + c) % 2 === 0 ? this.hex('#1E3A8A') : this.hex('#075985'));
      let strokeCol = isCenter ? this.hex('#A5F3FC') : ((r + c) % 2 === 0 ? this.hex('#60A5FA') : this.hex('#67E8F9'));

      if (isRose) {
        topCol = isCenter ? this.hex('#25418A') : ((r + c) % 2 === 0 ? this.hex('#2D61C9') : this.hex('#3D7DDE'));
        leftCol = isCenter ? this.hex('#18346D') : ((r + c) % 2 === 0 ? this.hex('#24539C') : this.hex('#2A62B8'));
        rightCol = isCenter ? this.hex('#0D1F44') : ((r + c) % 2 === 0 ? this.hex('#132B55') : this.hex('#18346D'));
        strokeCol = isCenter ? this.hex('#5DE6FF') : ((r + c) % 2 === 0 ? this.hex('#5DE6FF') : this.hex('#8BB6FF'));
      } else if (isGold) {
        topCol = isCenter ? this.hex('#F6A44D') : ((r + c) % 2 === 0 ? this.hex('#2C7A7B') : this.hex('#2F83FF'));
        leftCol = isCenter ? this.hex('#A76328') : ((r + c) % 2 === 0 ? this.hex('#215C63') : this.hex('#24539C'));
        rightCol = isCenter ? this.hex('#1D2A3B') : ((r + c) % 2 === 0 ? this.hex('#19385E') : this.hex('#1D2A3B'));
        strokeCol = isCenter ? this.hex('#FFD76A') : ((r + c) % 2 === 0 ? this.hex('#5DE6D6') : this.hex('#FFD76A'));
      }

      this.drawIsometricBlock(g, topCol, leftCol, rightCol, strokeCol, 2.2, depth, tileW, tileH, y, x);
    });

    const coreY = 63;
    const coreGlowHex = isRose ? '#5DE6FF' : (isGold ? '#FFD76A' : '#00F0FF');
    const cg = this.hex(coreGlowHex);
    g.fillColor = new Color(cg.r, cg.g, cg.b, 55);
    g.circle(0, coreY, 76);
    g.fill();
    g.fillColor = new Color(255, 255, 255, 110);
    g.circle(0, coreY, 40);
    g.fill();

    const cTop = isRose ? this.hex('#A8C7FF') : (isGold ? this.hex('#FFD76A') : this.hex('#00F0FF'));
    const cLeft = isRose ? this.hex('#3D7DDE') : (isGold ? this.hex('#2C7A7B') : this.hex('#0099BB'));
    const cRight = isRose ? this.hex('#25418A') : (isGold ? this.hex('#1D2A3B') : this.hex('#00CCD9'));

    this.drawIsometricBlock(g, cTop, cLeft, cRight, this.hex('#FFFFFF'), 3.2, 36, 86, 50, coreY, 0);

    const decor = ProfileManager.getProfile().islandDecor || [];
    this.drawIslandDecor(g, decor);
    this.createLabel(islandRoot, 'RepairProgress', new Vec3(0, -148, 2), `岛屿修复 ${Math.min(3, decor.length)}/3`, 16, '#E0F2FE', 220, 28);

    // 点击浮岛进入关卡地图，主按钮则负责一键续玩。
    this.addClick(islandRoot, () => {
      console.log('[HomeRoot] Clicked hero island -> open level map');
      if (this.onOpenLevelSelectCallback) {
        this.onOpenLevelSelectCallback();
      } else if (this.onStartJourneyCallback) {
        this.onStartJourneyCallback();
      }
    });

    if (!this.powerSaveMode) {
      tween(islandRoot)
        .to(2.2, { position: new Vec3(0, islandY + 10, 0) }, { easing: 'sineInOut' })
        .to(2.2, { position: new Vec3(0, islandY - 10, 0) }, { easing: 'sineInOut' })
        .union()
        .repeatForever()
        .start();
    }
  }

  private drawIslandDecor(g: Graphics, decor: string[]): void {
    if (decor.includes('decor_lighthouse')) {
      g.fillColor = this.hex('#F8FAFC');
      g.fillRect(-128, 28, 20, 48);
      g.fillColor = this.hex('#EF4444');
      g.fillRect(-130, 45, 24, 10);
      g.moveTo(-134, 76);
      g.lineTo(-104, 76);
      g.lineTo(-119, 92);
      g.close();
      g.fill();
      g.fillColor = new Color(253, 224, 71, 110);
      g.circle(-119, 88, 24);
      g.fill();
    }
    if (decor.includes('decor_cafe')) {
      g.fillColor = this.hex('#F59E0B');
      g.roundRect(72, 4, 58, 38, 5);
      g.fill();
      g.fillColor = this.hex('#FEF3C7');
      g.fillRect(80, 12, 15, 17);
      g.fillRect(106, 12, 15, 17);
      g.fillColor = this.hex('#EF4444');
      g.moveTo(66, 42);
      g.lineTo(136, 42);
      g.lineTo(122, 58);
      g.lineTo(80, 58);
      g.close();
      g.fill();
    }
    if (decor.includes('decor_star_tree')) {
      g.fillColor = this.hex('#7C3AED');
      g.fillRect(110, 68, 10, 32);
      g.fillColor = this.hex('#34D399');
      g.circle(115, 111, 25);
      g.fill();
      g.fillColor = this.hex('#FDE047');
      for (let i = 0; i < 5; i++) {
        const angle = i * Math.PI * 0.4 - Math.PI / 2;
        const next = angle + Math.PI * 0.2;
        const radius = i === 0 ? 13 : 13;
        const inner = 6;
        if (i === 0) g.moveTo(115 + Math.cos(angle) * radius, 116 + Math.sin(angle) * radius);
        g.lineTo(115 + Math.cos(next) * inner, 116 + Math.sin(next) * inner);
        g.lineTo(115 + Math.cos(angle + Math.PI * 0.4) * radius, 116 + Math.sin(angle + Math.PI * 0.4) * radius);
      }
      g.close();
      g.fill();
    }
  }

  private drawSidebarGlyph(g: Graphics, id: string, accentHex: string, palette: UiPalette): void {
    const centerY = 10;
    const accent = this.hex(accentHex);
    const softCyan = this.hex(palette.cyan);
    const gold = this.hex(palette.gold);

    g.strokeColor = accent;
    g.fillColor = this.colorWithAlpha(accentHex, 46);
    g.lineWidth = 2.2;

    if (id === 'daily') {
      g.roundRect(-15, centerY - 13, 30, 26, 7);
      g.fill();
      g.stroke();
      g.strokeColor = gold;
      g.lineWidth = 2;
      g.moveTo(-8, centerY + 17);
      g.lineTo(-8, centerY + 10);
      g.moveTo(8, centerY + 17);
      g.lineTo(8, centerY + 10);
      g.stroke();
      g.strokeColor = softCyan;
      g.lineWidth = 1.4;
      g.moveTo(-8, centerY + 2);
      g.lineTo(8, centerY + 2);
      g.moveTo(-8, centerY - 6);
      g.lineTo(8, centerY - 6);
      g.stroke();
    } else if (id === 'rank') {
      g.moveTo(-16, centerY - 10);
      g.lineTo(-7, centerY + 2);
      g.lineTo(2, centerY - 2);
      g.lineTo(14, centerY + 12);
      g.stroke();
      g.fillColor = gold;
      g.circle(14, centerY + 12, 4);
      g.fill();
      g.strokeColor = softCyan;
      g.lineWidth = 1.5;
      g.moveTo(-17, centerY - 14);
      g.lineTo(17, centerY - 14);
      g.stroke();
      g.fillColor = this.colorWithAlpha(palette.cyan, 52);
      g.roundRect(-17, centerY - 14, 34, 6, 3);
      g.fill();
    } else {
      const outer = 15;
      const inner = 7;
      for (let i = 0; i < 10; i++) {
        const angle = -Math.PI / 2 + i * Math.PI / 5;
        const radius = i % 2 === 0 ? outer : inner;
        const x = Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.close();
      g.fill();
      g.stroke();
      g.fillColor = gold;
      g.circle(0, centerY, 4.5);
      g.fill();
    }
  }

  private createSidebarIcons(halfW: number, halfH: number): void {
    const sidebar = this.createNode('Sidebar', new Vec3(-halfW + 62, halfH * 0.2, 0), this.node);
    this.ensureTransform(sidebar, 84, 330);

    const progress = ProfileManager.getProfile().levelProgress;
    const palette = this.getPalette();
    const unlockedItems = [
      { id: 'daily', name: '签 到', border: palette.gold, bg: palette.panelSoft, unlockAt: 3 },
      { id: 'rank', name: '排 行', border: palette.cyan, bg: palette.panelSoft, unlockAt: 8 },
      { id: 'achieve', name: '成 就', border: palette.blue, bg: palette.panelSoft, unlockAt: 5 }
    ].filter((item) => progress >= item.unlockAt);
    const spacing = Math.min(126, halfH * 0.16);
    const items = unlockedItems.map((item, index) => ({
      ...item,
      y: (unlockedItems.length - 1 - index * 2) * spacing / 2,
    }));

    items.forEach((item) => {
      const btn = this.createNode(`Btn_${item.id}`, new Vec3(0, item.y, 0), sidebar);
      this.ensureTransform(btn, 84, 84);
      const g = btn.addComponent(Graphics);

      // Sleek Circular Icon Badge
      g.fillColor = this.hex(item.bg);
      ((g.fillColor) as any).a = 210;
      g.circle(0, 10, 32);
      g.fill();
      const sBorderCol = this.hex(item.border);
      sBorderCol.a = 120; // 降低描边亮度以凸显主界面游戏按钮
      g.strokeColor = sBorderCol;
      g.lineWidth = 1.6;
      g.circle(0, 10, 32);
      g.stroke();

      // Inner subtle glow ring
      g.strokeColor = new Color(255, 255, 255, 60);
      g.lineWidth = 0.8;
      g.circle(0, 10, 26);
      g.stroke();

      this.drawSidebarGlyph(g, item.id, item.border, palette);

      // Clean single-line label below the badge
      this.createLabel(btn, 'Label', new Vec3(0, -32, 0), item.name.replace(' ', ''), 15, item.border, 78, 24);
      const sidebarProfile = ProfileManager.getProfile();
      const showDot = (item.id === 'daily' && !ProfileManager.isTodaySignedin()) ||
        (item.id === 'achieve' && sidebarProfile.levelProgress >= 1 && !ProfileManager.isAchievementClaimed('first_start'));
      if (showDot) {
        this.createRedDot(btn, new Vec3(25, 34, 1));
      }

      this.addClick(btn, () => {
        console.log(`[HomeRoot] Clicked sidebar item: ${item.name}`);
        if (item.id === 'daily') {
          this.openDailySigninPopup();
        } else if (item.id === 'rank') {
          this.openFriendLeaderboardPopup();
        } else if (item.id === 'achieve') {
          this.openAchievementPopup();
        }
      });
    });
  }

  private openFriendLeaderboardPopup(): void {
    if (!this.beginExclusivePopup() || !this.popupRoot) return;

    const profile = ProfileManager.getProfile();
    const palette = this.getPalette();
    this.createPopupOverlay(this.popupRoot, () => {
      this.closePopup();
      if (this.subContextContainer) {
        WeChatService.hideFriendLeaderboard(this.subContextContainer);
        this.subContextContainer = null;
      }
    }, 148);

    const dialogW = 600;
    const dialogH = WeChatService.isWeChatMiniGame() ? 500 : 430;
    const halfDialogH = dialogH / 2;
    const dialog = this.createNode('FriendRankDialog', new Vec3(0, -12, 0), this.popupRoot);
    this.ensureTransform(dialog, dialogW, dialogH);
    const dg = dialog.addComponent(Graphics);
    this.drawGlassPanel(dg, dialogW, dialogH, 30, palette.cyan, palette.panel, 228, 2.0);
    this.blockTouchThrough(dialog);

    this.createLabel(dialog, 'Title', new Vec3(0, halfDialogH - 48, 1), '微信好友排行榜', 27, palette.text, 430, 42);
    this.createLabel(dialog, 'Self', new Vec3(0, halfDialogH - 92, 1), `你 · 流光开拓者    ${profile.levelProgress}关 · ${profile.totalStars || 0}★`, 17, '#FDE68A', 520, 28);

    const closeBtn = this.createNode('CloseBtn', new Vec3(260, halfDialogH - 48, 1), dialog);
    this.ensureTransform(closeBtn, 42, 42);
    const closeG = closeBtn.addComponent(Graphics);
    closeG.fillColor = this.colorWithAlpha(palette.panelSoft, 220);
    closeG.circle(0, 0, 18);
    closeG.fill();
    closeG.strokeColor = this.colorWithAlpha(palette.cyan, 160);
    closeG.lineWidth = 1.6;
    closeG.stroke();
    this.createLabel(closeBtn, 'Icon', new Vec3(0, 1, 0), '✕', 16, palette.text, 32, 32);
    this.addClick(closeBtn, () => this.closePopup());

    if (WeChatService.isWeChatMiniGame()) {
      const loading = this.createNode('FriendRankLoadingState', new Vec3(0, 20, 1), dialog);
      this.ensureTransform(loading, 540, 250);
      const lg = loading.addComponent(Graphics);
      this.drawGlassPanel(lg, 540, 250, 24, palette.cyan, palette.panelSoft, 128, 1.2);
      lg.strokeColor = this.colorWithAlpha(palette.cyan, 130);
      lg.lineWidth = 1.8;
      lg.circle(0, 62, 38);
      lg.stroke();
      lg.strokeColor = this.colorWithAlpha(palette.gold, 180);
      lg.lineWidth = 2.0;
      lg.moveTo(-18, 62);
      lg.lineTo(-6, 50);
      lg.lineTo(7, 74);
      lg.lineTo(20, 54);
      lg.stroke();
      this.createLabel(loading, 'Title', new Vec3(0, 6, 1), '正在同步好友榜...', 22, palette.text, 420, 34);
      this.createLabel(loading, 'Sub', new Vec3(0, -28, 1), '若暂无好友上榜，邀请好友点亮第一束流光', 16, palette.muted, 500, 28);
      const container = this.createNode('SubContextContainer', new Vec3(0, 20, 1), dialog);
      this.ensureTransform(container, 540, 250);
      this.blockTouchThrough(container);
      this.subContextContainer = container;
      WeChatService.showFriendLeaderboard(container);
      const touchShield = this.createNode('RankTouchShield', new Vec3(0, 20, 4), dialog);
      this.ensureTransform(touchShield, 540, 250);
      const shieldG = touchShield.addComponent(Graphics);
      shieldG.fillColor = new Color(255, 255, 255, 1);
      shieldG.rect(-270, -125, 540, 250);
      shieldG.fill();
      this.blockTouchThrough(touchShield);
    } else {
      const empty = this.createNode('EmptyState', new Vec3(0, 14, 1), dialog);
      this.ensureTransform(empty, 520, 180);
      const eg = empty.addComponent(Graphics);
      eg.fillColor = this.colorWithAlpha('#15B86A', 34);
      eg.circle(0, 48, 42);
      eg.fill();
      eg.strokeColor = this.colorWithAlpha('#86EFAC', 170);
      eg.lineWidth = 1.8;
      eg.circle(0, 48, 42);
      eg.stroke();
      eg.strokeColor = this.colorWithAlpha('#FFFFFF', 190);
      eg.lineWidth = 2;
      eg.moveTo(-16, 50);
      eg.lineTo(-5, 38);
      eg.lineTo(8, 62);
      eg.lineTo(20, 43);
      eg.stroke();
      this.createLabel(empty, 'Title', new Vec3(0, -10, 1), '暂无好友成绩', 23, palette.text, 420, 34);
      this.createLabel(empty, 'Sub', new Vec3(0, -42, 1), '邀请好友来比通关数，双方都能获得晶核', 16, palette.muted, 500, 28);
    }

    const cta = this.createNode('FriendRankCta', new Vec3(0, -halfDialogH + 62, 1), dialog);
    this.ensureTransform(cta, 430, 64);
    const cg = cta.addComponent(Graphics);
    cg.fillColor = this.hex('#065F46');
    cg.roundRect(-215, -32, 430, 64, 28);
    cg.fill();
    cg.strokeColor = this.hex('#86EFAC');
    cg.lineWidth = 2.2;
    cg.roundRect(-215, -32, 430, 64, 28);
    cg.stroke();
    this.createLabel(cta, 'Text', new Vec3(0, 1, 1), '邀好友冲榜，双方得晶核', 20, '#FFFFFF', 390, 38);
    this.addClick(cta, () => {
      if (typeof wx !== 'undefined' && wx.shareAppMessage) {
        wx.shareAppMessage({ title: '我在《浮岛流光》向你发起好友冲榜挑战，敢来比比谁通关更多吗？' });
      } else {
        ShareService.shareInvite();
      }
    });
    this.animatePopup(dialog);
  }

  private showPopup(title: string, lines: string[], btnText: string, borderHex: string, btnBgHex: string, onActionClick?: () => void): void {
    if (!this.beginExclusivePopup() || !this.popupRoot) return;

    const isCheckin = title.indexOf('签到') >= 0;
    const isLeaderboard = title.indexOf('排行') >= 0;
    const isReinforce = title.indexOf('强化') >= 0;
    const isAchievement = title.indexOf('成就') >= 0;

    const palette = this.getPalette();
    this.createPopupOverlay(this.popupRoot, () => {
      this.closePopup();
      if (this.subContextContainer) {
        WeChatService.hideFriendLeaderboard(this.subContextContainer);
        this.subContextContainer = null;
      }
    });

    const dialogHeight = isCheckin ? 650 : 500;
    const halfDialogH = dialogHeight / 2;

    // 2. Glassmorphic Dialog Box (宽度 620 符合 86% 规范，圆角 32)
    const dialog = this.createNode('Dialog', new Vec3(0, -12, 0), this.popupRoot);
    this.ensureTransform(dialog, 620, dialogHeight);
    const dg = dialog.addComponent(Graphics);
    this.drawGlassPanel(dg, 620, dialogHeight, 32, borderHex, palette.panel, 228, 2.2);

    dialog.on(Node.EventType.TOUCH_END, (e: EventTouch) => {
      e.propagationStopped = true;
    });

    // 3. Title & Close Button
    this.createLabel(dialog, 'Title', new Vec3(0, halfDialogH - 45, 0), title, 24, palette.text, 420, 40); // Size 24
    const closeBtn = this.createNode('CloseBtn', new Vec3(270, halfDialogH - 45, 0), dialog); // 270 使得按钮外侧留距正好 30-40px
    this.ensureTransform(closeBtn, 40, 40);
    const cg = closeBtn.addComponent(Graphics);
    cg.fillColor = this.colorWithAlpha(palette.panelSoft, 230);
    cg.circle(0, 0, 18);
    cg.fill();
    cg.strokeColor = this.hex(borderHex);
    cg.lineWidth = 1.8;
    cg.stroke();
    this.createLabel(closeBtn, 'Icon', new Vec3(0, 1, 0), '✖', 16, '#FFFFFF', 32, 32);
    this.addClick(closeBtn, () => {
      this.closePopup();
      if (this.subContextContainer) {
        WeChatService.hideFriendLeaderboard(this.subContextContainer);
        this.subContextContainer = null;
      }
    });

    // 4. Custom List Items Rendering Engine (宽度 556，左右留距 32px 边距安全区)
    if (isLeaderboard && WeChatService.isWeChatMiniGame()) {
      const container = this.createNode('SubContextContainer', new Vec3(0, -10, 0), dialog);
      this.ensureTransform(container, 556, 300);
      this.subContextContainer = container;
      WeChatService.showFriendLeaderboard(container);
    } else {
      lines.forEach((line, idx) => {
        let itemBg = palette.panelSoft;
        let itemBgAlpha = 210;
        let itemBorder = '#263B5F';
        let borderWidth = 1.2;
        let textColor = palette.text;
        let rowHeight = 46;
        let yOffset = (halfDialogH - 115) - idx * 60; // 默认垂直排版
        let fontSize = 17;

        if (isCheckin) {
          rowHeight = 48;
          yOffset = (halfDialogH - 110) - idx * 62;
          if (line.indexOf('今日可领') >= 0) {
            itemBg = palette.panelSoft;
            itemBgAlpha = 250;
            itemBorder = borderHex; 
            borderWidth = 2.4;
            textColor = '#FFFBEB';
            fontSize = 18;
          } else if (line.indexOf('已领取') >= 0) {
            itemBg = palette.panel;
            itemBgAlpha = 110;
            textColor = '#64748B';
            itemBorder = '#1E293B';
            borderWidth = 1.0;
          } else {
            itemBg = palette.panel;
            itemBgAlpha = 140;
            textColor = '#475569';
            itemBorder = '#1E293B';
            borderWidth = 1.0;
          }
        } else if (isLeaderboard) {
          rowHeight = 48;
          yOffset = (halfDialogH - 110) - idx * 62;
          if (idx === 0) {
            itemBg = '#1D2A3B';
            itemBgAlpha = 245;
            itemBorder = palette.gold;
            borderWidth = 2.2;
            textColor = palette.gold;
            fontSize = 18;
          } else if (idx === 1) {
            itemBg = '#0E7490';
            itemBgAlpha = 235;
            itemBorder = '#22D3EE';
            borderWidth = 2.4;
            textColor = '#ECFEFF';
            fontSize = 18;
          } else if (idx === 2) {
            itemBg = '#23426D';
            itemBgAlpha = 220;
            itemBorder = '#5DE6D6';
            borderWidth = 1.4;
            textColor = '#EFFFFB';
          }
        } else if (isReinforce) {
          rowHeight = 50;
          yOffset = (halfDialogH - 110) - idx * 64; 
          if (line.indexOf('激励视频广告') >= 0) {
            itemBg = palette.panelSoft;
            itemBgAlpha = 245;
            itemBorder = this.currentTheme === 2 ? palette.gold : palette.blue;
            borderWidth = 2.2;
            textColor = palette.text;
            fontSize = 18;
          }
        } else if (isAchievement) {
          rowHeight = 50;
          yOffset = (halfDialogH - 110) - idx * 64;
          if ((line.indexOf('领取') >= 0 || line.indexOf('可领') >= 0) && line.indexOf('已达成') < 0 && line.indexOf('已领取') < 0) {
            itemBg = '#1E3A8A';
            itemBgAlpha = 240;
            itemBorder = '#60A5FA';
            borderWidth = 2.2;
            textColor = '#EFF6FF';
            fontSize = 18;
          }
        }

        const itemNode = this.createNode(`Item_${idx}`, new Vec3(0, yOffset, 0), dialog);
        this.ensureTransform(itemNode, 556, rowHeight); // 宽度 556
        const ig = itemNode.addComponent(Graphics);
        ig.fillColor = this.hex(itemBg);
        ((ig.fillColor) as any).a = itemBgAlpha;
        ig.roundRect(-278, -rowHeight / 2, 556, rowHeight, 16); // 278符合一半宽度
        ig.fill();
        ig.strokeColor = this.hex(itemBorder);
        ig.lineWidth = borderWidth;
        ig.stroke();

        this.createLabel(itemNode, 'Text', new Vec3(-10, 0, 0), line, fontSize, textColor, 510, rowHeight - 6);
      });
    }

    // 5. Bottom Hero Action Button (符合 Primary CTA 规范：高度 72, 圆角 36)
    const heroBtn = this.createNode('HeroBtn', new Vec3(0, -halfDialogH + 60, 0), dialog);
    this.ensureTransform(heroBtn, 400, 72);
    const hg = heroBtn.addComponent(Graphics);
    hg.fillColor = this.hex(btnBgHex);
    hg.roundRect(-200, -36, 400, 72, 36); // 72高度，36圆角
    hg.fill();
    hg.strokeColor = this.hex(borderHex);
    hg.lineWidth = 2.6;
    hg.stroke();
    this.createLabel(heroBtn, 'Text', new Vec3(0, 2, 0), btnText, 21, '#FFFFFF', 360, 44);
    this.animatePopup(dialog);

    this.addClick(heroBtn, () => {
      console.log(`[HomeRoot] Popup action clicked: ${btnText}`);
      this.closePopup();
      if (this.subContextContainer) {
        WeChatService.hideFriendLeaderboard(this.subContextContainer);
        this.subContextContainer = null;
      }
      if (onActionClick) {
        onActionClick();
      }
      if (isLeaderboard && typeof wx !== 'undefined' && wx.shareAppMessage) {
        wx.shareAppMessage({
          title: '我在《浮岛流光》向你发起好友冲榜挑战，敢来比比谁通关更多吗？'
        });
      }
    });
  }


  private createModeCards(halfH: number): void {
    // 优化：重构为单核心主按钮 + 次级入口结构。宽度为 656，两侧留出 32px 边距安全区。
    const cardsRoot = this.createNode('ModeCardsRoot', new Vec3(0, -halfH * 0.16, 0), this.node);
    this.ensureTransform(cardsRoot, 656, 240);

    const palette = this.getPalette();
    const jBg = palette.panel;
    const jBorder = this.currentTheme === 2 ? palette.gold : palette.cyan;

    const eBg = palette.panelSoft;
    const eBorder = this.currentTheme === 2 ? palette.violet : palette.blue;

    // 1. 核心绝对主行动按钮 (Primary CTA)：继续冒险 (高度从 72 提高到 88, 圆角 44, 更加显眼易触)
    const journeyCard = this.createNode('JourneyCard', new Vec3(0, 56, 0), cardsRoot);
    this.ensureTransform(journeyCard, 580, 88);
    const jg = journeyCard.addComponent(Graphics);
    
    // Outer cyber neon pulse aura
    jg.fillColor = this.hex(jBorder);
    ((jg.fillColor) as any).a = 40;
    jg.roundRect(-298, -50, 596, 100, 50);
    jg.fill();
    
    // Card base
    jg.fillColor = this.hex(jBg);
    ((jg.fillColor) as any).a = 255;
    jg.roundRect(-290, -44, 580, 88, 44);
    jg.fill();
    jg.strokeColor = this.hex(jBorder);
    jg.lineWidth = 3.6; // 3.6px 描边
    jg.stroke();
    
    // Inner level status tag pill
    jg.fillColor = this.hex('#060916');
    jg.roundRect(120, -20, 150, 40, 20);
    jg.fill();
    jg.strokeColor = this.hex(jBorder);
    jg.lineWidth = 1.6;
    jg.stroke();

    // Draw play triangle on jg
    jg.fillColor = this.hex('#FFD700');
    jg.moveTo(-210, -12);
    jg.lineTo(-210, 12);
    jg.lineTo(-192, 0);
    jg.close();
    jg.fill();

    const profile = ProfileManager.getProfile();
    const journeyLevelCount = 30;
    const currentLevel = Math.min(profile.levelProgress + 1, journeyLevelCount);
    this.createLabel(journeyCard, 'Title', new Vec3(-45, 2, 0), '一 键 续 光', 32, '#FFFFFF', 300, 48); // 字体 32
    this.createLabel(journeyCard, 'Sub', new Vec3(195, 2, 0), `第 ${currentLevel} / ${journeyLevelCount} 关`, 19, jBorder, 136, 32);  // 字体 19

    this.addClick(journeyCard, () => {
      console.log('[HomeRoot] Clicked Primary CTA: Journey Mode!');
      if (this.onStartJourneyCallback) this.onStartJourneyCallback();
    });

    if (!this.powerSaveMode) {
      tween(journeyCard)
        .to(1.4, { scale: new Vec3(1.03, 1.03, 1) }, { easing: 'sineInOut' })
        .to(1.4, { scale: new Vec3(1.0, 1.0, 1) }, { easing: 'sineInOut' })
        .union()
        .repeatForever()
        .start();
    }

    // 次级模式随主线进度逐步出现，避免新手首屏同时面对全部系统。
    const endlessUnlocked = profile.levelProgress >= 10;
    const dailyUnlocked = profile.levelProgress >= 5;
    if (endlessUnlocked) {
      const endlessCard = this.createNode('EndlessCard', new Vec3(0, -56, 0), cardsRoot);
    this.ensureTransform(endlessCard, 460, 76);
    const eg = endlessCard.addComponent(Graphics);
    eg.fillColor = this.hex(eBg);
    ((eg.fillColor) as any).a = 210;
    eg.roundRect(-230, -38, 460, 76, 38);
    eg.fill();
    
    const eBorderColor = this.hex(eBorder);
    eBorderColor.a = 120; // 降低次级按钮描边亮度，不喧宾夺主
    eg.strokeColor = eBorderColor;
    eg.lineWidth = 2.0;
    eg.stroke();
    
    // Inner highscore status tag pill
    eg.fillColor = this.hex('#0A0F24');
    eg.roundRect(95, -16, 116, 32, 16);
    eg.fill();
    eg.strokeColor = eBorderColor;
    eg.lineWidth = 1.2;
    eg.stroke();

    // Draw a star/sparkle on eg instead of rocket emoji
    eg.fillColor = this.hex('#38BDF8');
    eg.moveTo(-202, -10);
    eg.lineTo(-199, -2);
    eg.lineTo(-190, 0);
    eg.lineTo(-199, 2);
    eg.lineTo(-202, 10);
    eg.lineTo(-205, 2);
    eg.lineTo(-214, 0);
    eg.lineTo(-205, -2);
    eg.close();
    eg.fill();

    this.createLabel(endlessCard, 'Title', new Vec3(-35, 2, 0), '极限挑战 · 无尽模式', 22, '#FFFFFF', 260, 38); // 字体 22
    this.createLabel(endlessCard, 'Sub', new Vec3(153, 2, 0), `最佳 ${profile.endlessBestStage || 0} 阶`, 16, eBorder, 100, 28); // 字体 16

    this.addClick(endlessCard, () => {
      console.log('[HomeRoot] Clicked Secondary CTA: Endless Mode!');
      if (this.onStartEndlessCallback) this.onStartEndlessCallback();
    });
    }

    if (dailyUnlocked) {
    const dailyCard = this.createNode('DailyCard', new Vec3(0, endlessUnlocked ? -136 : -54, 0), cardsRoot);
    this.ensureTransform(dailyCard, 390, 52);
    const dg = dailyCard.addComponent(Graphics);
    dg.fillColor = this.hex(this.currentTheme === 2 ? '#1D2A3B' : '#0F172A');
    ((dg.fillColor) as any).a = 178;
    dg.roundRect(-195, -26, 390, 52, 26);
    dg.fill();
    dg.strokeColor = this.hex('#FDE047');
    ((dg.strokeColor) as any).a = 150;
    dg.lineWidth = 1.7;
    dg.stroke();
    dg.fillColor = this.hex('#FDE047');
    ((dg.fillColor) as any).a = 220;
    dg.circle(-164, 0, 10);
    dg.fill();
    const todayKey = CloudGameService.getTodayKey();
    const hasPlayedDaily = profile.dailyChallengeDate === todayKey && (profile.dailyChallengeBest || 0) > 0;
    const dailySub = hasPlayedDaily
      ? `${profile.dailyChallengeBestMoves || '--'}步 · 看榜`
      : '同题比步';
    this.createLabel(dailyCard, 'Title', new Vec3(-34, 1, 0), '每日一束光', 19, '#FFFFFF', 210, 30);
    this.createLabel(dailyCard, 'Sub', new Vec3(104, 1, 0), dailySub, 14, '#FDE047', 104, 24);
    const rankBtn = this.createNode('DailyRankBtn', new Vec3(168, 0, 1), dailyCard);
    this.ensureTransform(rankBtn, 44, 38);
    const rg = rankBtn.addComponent(Graphics);
    rg.fillColor = this.hex('#14532D');
    rg.roundRect(-22, -19, 44, 38, 16);
    rg.fill();
    rg.strokeColor = this.hex('#86EFAC');
    rg.lineWidth = 1.8;
    rg.stroke();
    this.createLabel(rankBtn, 'Text', new Vec3(0, 1, 0), '榜', 16, '#FFFFFF', 38, 26);
    rankBtn.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
      event.propagationStopped = true;
      this.showDailyLeaderboard();
    });
    this.addClick(dailyCard, () => {
      console.log('[HomeRoot] Clicked Daily Challenge!');
      AnalyticsService.track('home_start_daily');
      if (this.onStartDailyCallback) this.onStartDailyCallback();
    });
    }
  }

  private createFlowMascot(halfW: number, halfH: number): void {
    const profile = ProfileManager.getProfile();
    if (profile.levelProgress < 10 || profile.energy > 2) {
      return;
    }
    const mascot = this.createNode('FlowMascot', new Vec3(halfW - 88, halfH * 0.22, 0), this.node);
    this.ensureTransform(mascot, 86, 104);
    const g = mascot.addComponent(Graphics);
    g.fillColor = new Color(0, 240, 255, 48);
    g.circle(0, 10, 36);
    g.fill();
    g.fillColor = this.hex('#00E5FF');
    g.circle(0, 12, 24);
    g.fill();
    g.strokeColor = this.hex('#FFFFFF');
    g.lineWidth = 2.4;
    g.stroke();
    g.fillColor = this.hex('#FFFFFF');
    g.circle(-7, 18, 3.5);
    g.circle(8, 18, 3.5);
    g.fill();
    g.strokeColor = this.hex('#FDE047');
    g.lineWidth = 3;
    g.moveTo(-13, 3);
    g.quadraticCurveTo(0, -6, 13, 3);
    g.stroke();
    g.fillColor = this.hex('#FDE047');
    g.moveTo(0, 62);
    g.lineTo(7, 44);
    g.lineTo(26, 42);
    g.lineTo(10, 31);
    g.lineTo(16, 12);
    g.lineTo(0, 24);
    g.lineTo(-16, 12);
    g.lineTo(-10, 31);
    g.lineTo(-26, 42);
    g.lineTo(-7, 44);
    g.close();
    g.fill();

    this.createLabel(mascot, 'Bubble', new Vec3(0, -43, 0), '求助', 13, '#FDE047', 72, 22);
    if (!this.powerSaveMode) {
      tween(mascot)
        .to(1.4, { position: new Vec3(halfW - 88, halfH * 0.22 + 8, 0) }, { easing: 'sineInOut' })
        .to(1.4, { position: new Vec3(halfW - 88, halfH * 0.22 - 5, 0) }, { easing: 'sineInOut' })
        .union()
        .repeatForever()
        .start();
    }
    this.addClick(mascot, () => {
      WeChatService.showToast('今日挑战和残局求助，都能让好友帮你接光！', 'none');
    });
  }

  private createBottomFeatureRow(halfH: number): void {
    // 软著截图需要能在首页直接打开健康忠告和全部形象/系统图鉴。
    const pillsRoot = this.createNode('FeatureRowRoot', new Vec3(0, -halfH + 112, 0), this.node);
    this.ensureTransform(pillsRoot, 620, 62);

    const palette = this.getPalette();
    const profile = ProfileManager.getProfile();
    const welfareUnlocked = profile.levelProgress >= 3;
    const hasDailyReward = !ProfileManager.isTodaySignedin();
    const hasAchievementReward = profile.levelProgress >= 1 && !ProfileManager.isAchievementClaimed('first_start');
    const hasShareReward = profile.lastShareRewardDate !== CloudGameService.getTodayKey();
    const shouldShowWelfareDot = hasDailyReward || hasShareReward || hasAchievementReward || profile.energy < 10;

    const themeSub = this.getCurrentThemeName();
    const canUnlockTheme = (!ProfileManager.isThemeUnlocked(1) && profile.diamonds >= 300) ||
      (!ProfileManager.isThemeUnlocked(2) && profile.diamonds >= 500);
    type FeatureItem = {
      id: 'welfare' | 'health' | 'gallery' | 'theme';
      title: string;
      sub: string;
      x: number;
      w: number;
      bg: string;
      border: string;
      col: string;
      dot: boolean;
    };
    const itemW = welfareUnlocked ? 132 : 168;
    const spacing = welfareUnlocked ? 150 : 188;
    const itemXs = welfareUnlocked ? [-225, -75, 75, 225] : [-188, 0, 188];
    const seedItems: Omit<FeatureItem, 'x' | 'w'>[] = welfareUnlocked ? [
      { id: 'welfare', title: '福利', sub: hasDailyReward ? '今日可领' : (profile.energy < 10 ? '补能' : '奖励'), bg: palette.panel, border: palette.gold, col: '#FDE68A', dot: shouldShowWelfareDot },
      { id: 'health', title: '健康', sub: '忠告', bg: palette.panelSoft, border: '#6EE7B7', col: '#BBF7D0', dot: !ProfileManager.isHealthNoticeAccepted() },
      { id: 'gallery', title: '图鉴', sub: '角色系统', bg: palette.panelSoft, border: palette.blue, col: '#DBEAFE', dot: false },
      { id: 'theme', title: '主题', sub: themeSub, bg: palette.panelSoft, border: this.currentTheme === 2 ? palette.gold : palette.cyan, col: this.currentTheme === 2 ? '#FFF8E8' : '#DBEAFE', dot: canUnlockTheme },
    ] : [
      { id: 'health', title: '健康', sub: '忠告', bg: palette.panelSoft, border: '#6EE7B7', col: '#BBF7D0', dot: !ProfileManager.isHealthNoticeAccepted() },
      { id: 'gallery', title: '图鉴', sub: '角色系统', bg: palette.panelSoft, border: palette.blue, col: '#DBEAFE', dot: false },
      { id: 'theme', title: '主题', sub: themeSub, bg: palette.panelSoft, border: this.currentTheme === 2 ? palette.gold : palette.cyan, col: this.currentTheme === 2 ? '#FFF8E8' : '#DBEAFE', dot: canUnlockTheme },
    ];
    const items: FeatureItem[] = seedItems.map((item, index) => ({
      ...item,
      x: itemXs[index] ?? (index - (seedItems.length - 1) / 2) * spacing,
      w: itemW,
    }));

    items.forEach((p, idx) => {
      const node = this.createNode(`FeatureMini_${idx}`, new Vec3(p.x, 0, 0), pillsRoot);
      this.ensureTransform(node, p.w, 62);
      const g = node.addComponent(Graphics);
      g.fillColor = this.hex(p.bg);
      ((g.fillColor) as any).a = 170;
      g.roundRect(-p.w / 2, -31, p.w, 62, 22);
      g.fill();
      const bCol = this.hex(p.border);
      bCol.a = p.id === 'welfare' && p.dot ? 205 : 105;
      g.strokeColor = bCol;
      g.lineWidth = p.id === 'welfare' && p.dot ? 2.2 : 1.4;
      g.stroke();

      g.strokeColor = new Color(255, 255, 255, 75);
      g.lineWidth = 1.2;
      g.moveTo(-p.w / 2 + 18, 27);
      g.lineTo(p.w / 2 - 18, 27);
      g.stroke();

      const iconX = p.w <= 150 ? -43 : -72;
      if (p.id === 'welfare') {
        g.fillColor = this.hex('#F59E0B');
        g.strokeColor = Color.WHITE;
        g.lineWidth = 1.6;
        g.roundRect(iconX - 16, -13, 32, 27, 5);
        g.fill();
        g.stroke();
        g.fillColor = this.hex('#FDE047');
        g.fillRect(iconX - 3, -13, 6, 27);
        g.fillRect(iconX - 16, -5, 32, 7);
      } else if (p.id === 'health') {
        g.fillColor = this.hex('#10B981');
        g.strokeColor = Color.WHITE;
        g.lineWidth = 1.6;
        g.circle(iconX, 0, 15);
        g.fill();
        g.stroke();
        g.strokeColor = Color.WHITE;
        g.lineWidth = 4;
        g.moveTo(iconX - 9, 0);
        g.lineTo(iconX + 9, 0);
        g.moveTo(iconX, -9);
        g.lineTo(iconX, 9);
        g.stroke();
      } else if (p.id === 'gallery') {
        g.fillColor = this.hex('#38BDF8');
        g.strokeColor = Color.WHITE;
        g.lineWidth = 1.5;
        g.circle(iconX - 8, 5, 9);
        g.circle(iconX + 8, 5, 9);
        g.circle(iconX, -10, 9);
        g.fill();
        g.stroke();
      } else {
        g.fillColor = this.hex('#EC4899');
        g.strokeColor = Color.WHITE;
        g.lineWidth = 1.5;
        g.circle(iconX, 0, 14);
        g.fill();
        g.stroke();
        g.fillColor = this.hex('#3B82F6');
        g.circle(iconX - 4, 4, 3);
        g.fill();
        g.fillColor = this.hex('#10B981');
        g.circle(iconX + 5, -4, 3);
        g.fill();
        g.fillColor = this.hex('#F59E0B');
        g.circle(iconX, -3, 3);
        g.fill();
      }

      const labelW = p.w - 52;
      const titleLabel = this.createLabel(node, 'Title', new Vec3(24, 10, 0), p.title, p.w <= 150 ? 16 : 18, '#FFFFFF', labelW, 26);
      const subLabel = this.createLabel(node, 'Sub', new Vec3(24, -13, 0), p.sub, p.w <= 150 ? 11 : 13, p.col, labelW, 20);
      titleLabel.overflow = Label.Overflow.NONE;
      subLabel.overflow = Label.Overflow.NONE;
      if (p.dot) this.createRedDot(node, new Vec3(p.w / 2 - 18, 23, 1));

      this.addClick(node, () => {
        console.log(`[HomeRoot] Clicked bottom feature: ${p.title}`);
        if (p.id === 'health') {
          this.showHealthAdvisoryPopup(true);
          return;
        }
        if (p.id === 'gallery') {
          this.showSystemGalleryPopup();
          return;
        }
        if (p.id === 'theme') {
          if (this.onOpenSettingsCallback) this.onOpenSettingsCallback('theme');
          return;
        }
        AnalyticsService.track('home_open_welfare');
        this.showWelfareCenter();
      });

      if (p.id === 'welfare' && p.dot && !this.powerSaveMode) {
        tween(node)
          .to(1.2, { scale: new Vec3(1.025, 1.025, 1) }, { easing: 'sineInOut' })
          .to(1.2, { scale: new Vec3(1, 1, 1) }, { easing: 'sineInOut' })
          .union()
          .repeatForever()
          .start();
      }
    });
  }

  private showHealthAdvisoryPopup(manual: boolean): void {
    if (!this.beginExclusivePopup() || !this.popupRoot) return;

    const palette = this.getPalette();
    this.createPopupOverlay(this.popupRoot, () => this.closePopup(), manual ? 148 : 176);

    const dialog = this.createNode('HealthAdvisoryDialog', new Vec3(0, -6, 0), this.popupRoot);
    this.ensureTransform(dialog, 620, 520);
    const g = dialog.addComponent(Graphics);
    this.drawGlassPanel(g, 620, 520, 32, '#6EE7B7', palette.panel, 235, 2.4);
    dialog.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
      event.propagationStopped = true;
    });

    this.createLabel(dialog, 'Title', new Vec3(0, 210, 1), '游戏健康忠告', 30, '#BBF7D0', 420, 44);
    this.createLabel(dialog, 'Sub', new Vec3(0, 174, 1), '抵制不良游戏，拒绝盗版游戏。注意自我保护，谨防受骗上当。', 17, palette.text, 560, 28);

    const lines = [
      '适度游戏益脑，沉迷游戏伤身。请合理安排时间，享受健康生活。',
      '本游戏为休闲益智小游戏，建议每次连续体验不超过 30 分钟。',
      '未成年人应在监护人指导下使用，并遵守当地网络游戏相关规定。',
      '如在移动、乘车或光线较暗环境中游玩，请注意安全并保护视力。',
    ];

    lines.forEach((text, index) => {
      const row = this.createNode(`HealthLine_${index}`, new Vec3(0, 104 - index * 66, 1), dialog);
      this.ensureTransform(row, 550, 54);
      const rg = row.addComponent(Graphics);
      rg.fillColor = this.colorWithAlpha(index === 0 ? '#064E3B' : palette.panelSoft, index === 0 ? 225 : 190);
      rg.roundRect(-275, -27, 550, 54, 18);
      rg.fill();
      rg.strokeColor = this.colorWithAlpha(index === 0 ? '#6EE7B7' : '#334155', index === 0 ? 210 : 130);
      rg.lineWidth = index === 0 ? 2.0 : 1.2;
      rg.stroke();
      this.createLabel(row, 'Index', new Vec3(-242, 0, 1), `${index + 1}`, 18, '#BBF7D0', 36, 30);
      this.createLabel(row, 'Text', new Vec3(22, 0, 1), text, 16, '#EAF7FF', 478, 38);
    });

    const heroBtn = this.createNode('AcceptHealthBtn', new Vec3(0, -208, 1), dialog);
    this.ensureTransform(heroBtn, 430, 66);
    const hg = heroBtn.addComponent(Graphics);
    hg.fillColor = this.hex('#10B981');
    hg.roundRect(-215, -33, 430, 66, 28);
    hg.fill();
    hg.strokeColor = this.hex('#BBF7D0');
    hg.lineWidth = 2.4;
    hg.stroke();
    this.createLabel(heroBtn, 'Text', new Vec3(0, 1, 1), manual ? '返 回 首 页' : '我 已 知 晓，健 康 开 始', 20, '#FFFFFF', 380, 40);
    this.addClick(heroBtn, () => {
      ProfileManager.setHealthNoticeAccepted(true);
      this.closePopup();
      if (!manual) this.rebuildUI();
    });

    this.animatePopup(dialog);
  }

  private showSystemGalleryPopup(): void {
    if (!this.beginExclusivePopup() || !this.popupRoot) return;

    const palette = this.getPalette();
    this.createPopupOverlay(this.popupRoot, () => this.closePopup(), 148);

    const dialog = this.createNode('SystemGalleryDialog', new Vec3(0, -8, 0), this.popupRoot);
    this.ensureTransform(dialog, 650, 680);
    const g = dialog.addComponent(Graphics);
    this.drawGlassPanel(g, 650, 680, 34, palette.blue, palette.panel, 235, 2.4);
    dialog.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
      event.propagationStopped = true;
    });

    this.createLabel(dialog, 'Title', new Vec3(0, 292, 1), '角色形象与系统图鉴', 29, palette.text, 460, 42);
    this.createLabel(dialog, 'Sub', new Vec3(0, 258, 1), '软著材料截图页：集中展示所有可体验形象、装扮与水晶系统。', 15, palette.gold, 590, 24);

    const closeBtn = this.createNode('CloseBtn', new Vec3(286, 292, 1), dialog);
    this.ensureTransform(closeBtn, 42, 42);
    const closeG = closeBtn.addComponent(Graphics);
    closeG.fillColor = this.colorWithAlpha(palette.panelSoft, 230);
    closeG.circle(0, 0, 18);
    closeG.fill();
    closeG.strokeColor = this.colorWithAlpha(palette.blue, 180);
    closeG.lineWidth = 1.6;
    closeG.stroke();
    this.createLabel(closeBtn, 'Icon', new Vec3(0, 1, 1), 'X', 16, palette.text, 32, 32);
    this.addClick(closeBtn, () => this.closePopup());

    this.createLabel(dialog, 'RunnerTitle', new Vec3(-220, 216, 1), '一、主角形象', 19, '#BBF7D0', 180, 28);
    const runners = [
      { name: '默认流光', color: '#F8FEFF', desc: '初始水晶球' },
      { name: '光猫', color: '#F9A8D4', desc: '好友助攻解锁' },
      { name: '纸飞机', color: '#BAE6FD', desc: '短时挑战解锁' },
    ];
    runners.forEach((item, index) => {
      const x = -208 + index * 208;
      const card = this.createNode(`RunnerCard_${index}`, new Vec3(x, 166, 1), dialog);
      this.ensureTransform(card, 182, 84);
      const cg = card.addComponent(Graphics);
      cg.fillColor = this.colorWithAlpha(palette.panelSoft, 205);
      cg.roundRect(-91, -42, 182, 84, 20);
      cg.fill();
      cg.strokeColor = this.colorWithAlpha(item.color, 210);
      cg.lineWidth = 1.8;
      cg.stroke();
      const body = this.hex(item.color);
      cg.fillColor = new Color(body.r, body.g, body.b, 70);
      cg.circle(-55, 10, 25);
      cg.fill();
      cg.fillColor = new Color(body.r, body.g, body.b, 225);
      cg.circle(-55, 10, 15);
      cg.fill();
      cg.fillColor = this.hex('#FFFFFF');
      cg.circle(-55, 10, 7);
      cg.fill();
      this.createLabel(card, 'Name', new Vec3(24, 13, 1), item.name, 17, '#FFFFFF', 100, 24);
      this.createLabel(card, 'Desc', new Vec3(24, -13, 1), item.desc, 12, palette.muted, 110, 20);
    });

    this.createLabel(dialog, 'TrailTitle', new Vec3(-220, 96, 1), '二、光轨与浮岛装扮', 19, '#BBF7D0', 230, 28);
    const cosmetics = [
      { name: '默认光轨', color: '#F8FEFF' },
      { name: '极光光轨', color: '#67E8F9' },
      { name: '樱花光轨', color: '#FDA4AF' },
      { name: '霓虹光轨', color: '#C084FC' },
      { name: '灯塔摆件', color: '#FDE047' },
      { name: '咖啡馆摆件', color: '#F59E0B' },
      { name: '星核树摆件', color: '#34D399' },
    ];
    cosmetics.forEach((item, index) => {
      const col = index % 4;
      const row = Math.floor(index / 4);
      const chip = this.createNode(`Cosmetic_${index}`, new Vec3(-234 + col * 156, 54 - row * 42, 1), dialog);
      this.ensureTransform(chip, 138, 32);
      const cg = chip.addComponent(Graphics);
      cg.fillColor = this.colorWithAlpha(palette.panelSoft, 200);
      cg.roundRect(-69, -16, 138, 32, 14);
      cg.fill();
      cg.strokeColor = this.colorWithAlpha(item.color, 190);
      cg.lineWidth = 1.3;
      cg.stroke();
      cg.fillColor = this.hex(item.color);
      cg.circle(-50, 0, 7);
      cg.fill();
      this.createLabel(chip, 'Text', new Vec3(16, 0, 1), item.name, 13, '#EAF7FF', 100, 22);
    });

    this.createLabel(dialog, 'CrystalTitle', new Vec3(-220, -34, 1), '三、可体验水晶系统', 19, '#BBF7D0', 230, 28);
    const crystals = [
      ['直线水晶', '#06B6D4'], ['折角镜', '#10B981'], ['十字水晶', '#60A5FA'], ['崩塌晶体', '#F59E0B'],
      ['加速晶体', '#F472B6'], ['镜像水晶', '#C084FC'], ['生长水晶', '#84CC16'], ['跃迁水晶', '#FB7185'],
      ['黑洞水晶', '#F97316'], ['分光水晶', '#FACC15'], ['红色染晶', '#EF4444'], ['蓝色染晶', '#3B82F6'],
      ['红色能量门', '#EF4444'], ['蓝色能量门', '#3B82F6'], ['时间水晶', '#22D3EE'], ['星光水晶', '#FDE047'],
      ['刷新水晶', '#34D399'], ['万能水晶', '#FDE68A'],
    ];
    crystals.forEach(([name, color], index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const chip = this.createNode(`Crystal_${index}`, new Vec3(-202 + col * 202, -76 - row * 35, 1), dialog);
      this.ensureTransform(chip, 178, 28);
      const cg = chip.addComponent(Graphics);
      cg.fillColor = this.colorWithAlpha('#0F172A', 218);
      cg.roundRect(-89, -14, 178, 28, 12);
      cg.fill();
      cg.strokeColor = this.colorWithAlpha(color, 180);
      cg.lineWidth = 1.2;
      cg.stroke();
      cg.fillColor = this.hex(color);
      cg.moveTo(-70, 9);
      cg.lineTo(-58, 0);
      cg.lineTo(-70, -9);
      cg.lineTo(-82, 0);
      cg.close();
      cg.fill();
      this.createLabel(chip, 'Text', new Vec3(16, 0, 1), name, 13, '#EAF7FF', 128, 20);
    });

    this.createLabel(dialog, 'Footer', new Vec3(0, -304, 1), '截图建议：本页可作为“所有角色形象、全部系统与主要特点”的集中说明图。', 14, palette.gold, 600, 24);
    this.animatePopup(dialog);
  }

  private showDailyLeaderboard(refreshCloud = true): void {
    if (!this.beginExclusivePopup() || !this.popupRoot) return;
    AnalyticsService.track('home_open_daily_rank');

    const profile = ProfileManager.getProfile();
    const palette = this.getPalette();
    const dateKey = CloudGameService.getTodayKey();
    const result = CloudGameService.getDailyLeaderboard(
      dateKey,
      profile.dailyChallengeDate === dateKey ? (profile.dailyChallengeBest || 0) : 0,
      profile.dailyChallengeDate === dateKey ? (profile.dailyChallengeBestMoves || 0) : 0
    );

    if (refreshCloud) {
      void CloudGameService.fetchDailyLeaderboard(
        dateKey,
        profile.dailyChallengeDate === dateKey ? (profile.dailyChallengeBest || 0) : 0,
        profile.dailyChallengeDate === dateKey ? (profile.dailyChallengeBestMoves || 0) : 0
      ).then(() => {
        if (dialog.isValid && dialog.parent === this.popupRoot && this.popupRoot?.children.includes(dialog)) {
          this.showDailyLeaderboard(false);
        }
      });
    }

    this.createPopupOverlay(this.popupRoot, () => { this.closePopup(); }, 148);

    const dialog = this.createNode('DailyRankDialog', new Vec3(0, -10, 0), this.popupRoot);
    this.ensureTransform(dialog, 600, 500);
    const g = dialog.addComponent(Graphics);
    this.drawGlassPanel(g, 600, 500, 30, '#34D399', palette.panel, 228, 2.0);
    dialog.on(Node.EventType.TOUCH_END, (event: EventTouch) => { event.propagationStopped = true; });

    const selfMoves = profile.dailyChallengeDate === dateKey && profile.dailyChallengeBestMoves
      ? `你今天 ${profile.dailyChallengeBestMoves} 步 · ${result.hintText}`
      : '同一道题，同一副手牌，比谁更少步';
    this.createLabel(dialog, 'Title', new Vec3(0, 202, 0), '每日一束光 · 好友榜', 27, palette.text, 420, 42);
    this.createLabel(dialog, 'Hint', new Vec3(0, 168, 0), selfMoves, 17, '#FDE047', 540, 30);

    result.entries.slice(0, 6).forEach((entry, idx) => {
      const y = 108 - idx * 52;
      const row = this.createNode(`DailyRankRow_${idx}`, new Vec3(0, y, 0), dialog);
      this.ensureTransform(row, 520, 48);
      const rowG = row.addComponent(Graphics);
      rowG.fillColor = this.hex(entry.isSelf ? '#0E7490' : palette.panelSoft);
      ((rowG.fillColor) as any).a = entry.isSelf ? 230 : 188;
      rowG.roundRect(-260, -24, 520, 48, 16);
      rowG.fill();
      rowG.strokeColor = this.hex(entry.isSelf ? '#22D3EE' : '#334155');
      rowG.lineWidth = entry.isSelf ? 2.6 : 1.2;
      rowG.stroke();

      this.createLabel(row, 'Rank', new Vec3(-226, 0, 0), `${idx + 1}`, 20, idx < 3 ? '#FDE047' : '#CBD5E1', 40, 30);
      this.createLabel(row, 'Avatar', new Vec3(-174, 0, 0), entry.avatarText, 17, '#FFFFFF', 36, 30);
      this.createLabel(row, 'Name', new Vec3(-90, 0, 0), entry.nickname, 18, '#FFFFFF', 130, 30);
      this.createLabel(row, 'Moves', new Vec3(70, 0, 0), `${entry.moves} 步`, 17, '#93C5FD', 90, 28);
      this.createLabel(row, 'Score', new Vec3(186, 0, 0), `${entry.score} 分`, 18, '#34D399', 100, 30);
    });
    if (result.entries.length === 0) {
      const empty = this.createNode('EmptyState', new Vec3(0, 28, 0), dialog);
      this.ensureTransform(empty, 500, 160);
      const eg = empty.addComponent(Graphics);
      eg.fillColor = this.colorWithAlpha('#15B86A', 36);
      eg.circle(0, 35, 38);
      eg.fill();
      eg.strokeColor = this.colorWithAlpha('#86EFAC', 180);
      eg.lineWidth = 1.8;
      eg.circle(0, 35, 38);
      eg.stroke();
      eg.strokeColor = this.colorWithAlpha('#FFFFFF', 190);
      eg.lineWidth = 2;
      eg.moveTo(-14, 35);
      eg.lineTo(-3, 24);
      eg.lineTo(9, 48);
      eg.lineTo(20, 30);
      eg.stroke();
      this.createLabel(empty, 'Title', new Vec3(0, -18, 1), '暂无好友成绩', 22, palette.text, 420, 32);
      this.createLabel(empty, 'Sub', new Vec3(0, -48, 1), '完成后发给好友：同题比步数，少一步就有炫耀点', 16, palette.muted, 500, 28);
    }

    const cta = this.createNode('DailyChallengeCta', new Vec3(0, -188, 0), dialog);
    this.ensureTransform(cta, 420, 64);
    const cg = cta.addComponent(Graphics);
    cg.fillColor = this.hex('#10B981');
    cg.roundRect(-210, -32, 420, 64, 22);
    cg.fill();
    cg.strokeColor = this.hex('#86EFAC');
    cg.lineWidth = 2.4;
    cg.stroke();
    this.createLabel(cta, 'Text', new Vec3(0, 1, 0), result.selfRank > 0 ? '再接一束，少一步上榜' : '开始今日这一束光', 21, '#FFFFFF', 360, 38);
    this.addClick(cta, () => {
      this.closePopup();
      if (this.onStartDailyCallback) this.onStartDailyCallback();
    });
    this.animatePopup(dialog);
  }

  private showWelfareCenter(): void {
    if (!this.beginExclusivePopup() || !this.popupRoot) return;

    const profile = ProfileManager.getProfile();
    const signedInToday = ProfileManager.isTodaySignedin();
    const hasAchievementReward = profile.levelProgress >= 1 && !ProfileManager.isAchievementClaimed('first_start');
    const palette = this.getPalette();

    this.createPopupOverlay(this.popupRoot, () => { this.closePopup(); }, 148);

    const dialog = this.createNode('WelfareDialog', new Vec3(0, -12, 0), this.popupRoot);
    this.ensureTransform(dialog, 620, 510);
    const dg = dialog.addComponent(Graphics);
    this.drawGlassPanel(dg, 620, 510, 32, '#FDE047', palette.panel, 230, 2.2);
    dialog.on(Node.EventType.TOUCH_END, (e: EventTouch) => { e.propagationStopped = true; });

    this.createLabel(dialog, 'Title', new Vec3(0, 208, 0), '福利中心', 27, palette.text, 420, 42);
    this.createLabel(dialog, 'Sub', new Vec3(0, 174, 0), '奖励、补能、强化都收在这里，先玩再领不打扰', 16, palette.gold, 520, 28);

    const closeBtn = this.createNode('CloseBtn', new Vec3(270, 208, 0), dialog);
    this.ensureTransform(closeBtn, 42, 42);
    const cg = closeBtn.addComponent(Graphics);
    cg.fillColor = this.colorWithAlpha(palette.panelSoft, 230);
    cg.circle(0, 0, 18);
    cg.fill();
    cg.strokeColor = this.hex('#FDE047');
    cg.lineWidth = 1.8;
    cg.stroke();
    this.createLabel(closeBtn, 'Icon', new Vec3(0, 1, 0), '✖', 16, '#FFFFFF', 32, 32);
    this.addClick(closeBtn, () => { this.closePopup(); });

    const cards = [
      { id: 'daily', title: signedInToday ? '今日已领' : '每日签到', sub: signedInToday ? '明天继续连签' : '今日钻石可领', action: signedInToday ? '已领' : '领取', icon: '礼', y: 115, border: signedInToday ? '#64748B' : palette.gold, bg: signedInToday ? palette.panelSoft : '#17233A', dot: !signedInToday },
      { id: 'share', title: '分享好友领奖', sub: '每日首分享 +60', action: '分享', icon: '享', y: 45, border: '#6EE7B7', bg: palette.panelSoft, dot: (profile.lastShareRewardDate !== CloudGameService.getTodayKey()) },
      { id: 'energy', title: `时空能量 ${profile.energy}/10`, sub: profile.energy >= 10 ? '能量已满' : '50钻回满', action: profile.energy >= 10 ? '已满' : '补满', icon: '电', y: -25, border: profile.energy >= 10 ? '#38BDF8' : palette.gold, bg: palette.panelSoft, dot: profile.energy < 10 },
      { id: 'achieve', title: hasAchievementReward ? '成就奖励可领' : '成就进度', sub: hasAchievementReward ? '初次启航待领' : '查看目标奖励', action: '查看', icon: '奖', y: -165, border: hasAchievementReward ? palette.gold : palette.blue, bg: palette.panelSoft, dot: hasAchievementReward },
    ]
      .filter((card) => card.id !== 'achieve' || profile.levelProgress >= 5)
      .sort((a, b) => {
        if (profile.energy < 10 && a.id === 'energy') return -1;
        if (profile.energy < 10 && b.id === 'energy') return 1;
        return 0;
      })
      .map((card, idx) => ({ ...card, y: 115 - idx * 70 }));

    cards.forEach((card) => {
      const row = this.createNode(`Welfare_${card.id}`, new Vec3(0, card.y, 0), dialog);
      this.ensureTransform(row, 540, 58);
      const rg = row.addComponent(Graphics);
      rg.fillColor = this.hex(card.bg);
      ((rg.fillColor) as any).a = card.dot ? 222 : 174;
      rg.roundRect(-270, -29, 540, 58, 20);
      rg.fill();
      rg.strokeColor = this.hex(card.border);
      rg.lineWidth = card.dot ? 2.2 : 1.3;
      rg.stroke();

      rg.fillColor = this.hex(card.border);
      rg.circle(-228, 0, 20);
      rg.fill();
      this.createLabel(row, 'Icon', new Vec3(-228, 1, 0), card.icon, 17, '#111827', 36, 30);
      this.createLabel(row, 'Title', new Vec3(-55, 11, 0), card.title, 19, '#FFFFFF', 290, 24);
      this.createLabel(row, 'Sub', new Vec3(-55, -13, 0), card.sub, 14, '#CBD5E1', 290, 20);
      this.createLabel(row, 'Action', new Vec3(205, 0, 0), card.action, 17, card.border, 82, 28);
      if (card.dot) this.createRedDot(row, new Vec3(252, 22, 1));

      this.addClick(row, () => {
        if (card.id === 'daily') {
          this.closePopup();
          this.openDailySigninPopup();
        } else if (card.id === 'share') {
          ShareService.shareInvite();
          AnalyticsService.track('share_invite', { source: 'welfare' });
          const claimed = ProfileManager.claimShareReward(CloudGameService.getTodayKey(), 60, 1);
          this.closePopup();
          this.rebuildUI();
          WeChatService.showToast(claimed ? '分享奖励 +60 💎' : '今日分享奖励已领取', claimed ? 'success' : 'none');
        } else if (card.id === 'energy') {
          if (profile.energy >= 10) {
            WeChatService.showToast('能量已满，直接开玩吧！', 'none');
            return;
          }
          if (profile.diamonds >= 50) {
            ProfileManager.addDiamonds(-50);
            ProfileManager.addEnergy(10);
            this.closePopup();
            this.rebuildUI();
            WeChatService.showToast('时空能量已回满！', 'success');
          } else {
            WeChatService.showToast('晶核不足 50，先去签到或通关领奖！', 'none');
          }
        } else if (card.id === 'achieve') {
          this.closePopup();
          this.openAchievementPopup();
        }
      });
    });
    this.animatePopup(dialog);
  }

  private openDailySigninPopup(): void {
    if (!this.beginExclusivePopup() || !this.popupRoot) return;

    const nextDayIndex = Math.min(6, ProfileManager.getSigninDayIndex());
    const profile = ProfileManager.getProfile();
    const signedInToday = ProfileManager.isTodaySignedin();
    const claimedDays = profile.claimedSignins || [];
    const palette = this.getPalette();
    const daysConfig = [
      { day: 1, reward: 50, label: '50 钻石', short: '50钻', fillEnergy: false, decorId: '' },
      { day: 2, reward: 80, label: '80 钻石', short: '80钻', fillEnergy: false, decorId: '' },
      { day: 3, reward: 120, label: '120 钻石', short: '120钻', fillEnergy: false, decorId: '' },
      { day: 4, reward: 0, label: '时空能量回满', short: '满能量', fillEnergy: true, decorId: '' },
      { day: 5, reward: 180, label: '180 钻石', short: '180钻', fillEnergy: false, decorId: '' },
      { day: 6, reward: 260, label: '260 钻石', short: '260钻', fillEnergy: false, decorId: '' },
      { day: 7, reward: 500, label: '500 钻石 + 星核树', short: '500钻+', fillEnergy: false, decorId: 'decor_star_tree' },
    ];

    this.createPopupOverlay(this.popupRoot, () => this.closePopup(), 148);

    const dialogW = 620;
    const dialogH = 540;
    const halfDialogH = dialogH / 2;
    const dialog = this.createNode('SigninDialog', new Vec3(0, -12, 0), this.popupRoot);
    this.ensureTransform(dialog, dialogW, dialogH);
    const dg = dialog.addComponent(Graphics);
    this.drawGlassPanel(dg, dialogW, dialogH, 32, signedInToday ? '#64748B' : palette.gold, palette.panel, 230, 2.2);
    dialog.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
      event.propagationStopped = true;
    });

    this.createLabel(dialog, 'Title', new Vec3(0, halfDialogH - 48, 1), '每日签到奖励', 28, palette.text, 430, 42);
    this.createLabel(dialog, 'Hint', new Vec3(0, halfDialogH - 84, 1), signedInToday ? '今日已领取，明天继续点亮浮岛' : '今日可领，连续签到解锁更高奖励', 16, signedInToday ? palette.muted : '#FDE68A', 520, 26);

    const closeBtn = this.createNode('CloseBtn', new Vec3(270, halfDialogH - 48, 1), dialog);
    this.ensureTransform(closeBtn, 42, 42);
    const closeG = closeBtn.addComponent(Graphics);
    closeG.fillColor = this.colorWithAlpha(palette.panelSoft, 230);
    closeG.circle(0, 0, 18);
    closeG.fill();
    closeG.strokeColor = this.colorWithAlpha(signedInToday ? '#64748B' : palette.gold, 175);
    closeG.lineWidth = 1.6;
    closeG.stroke();
    this.createLabel(closeBtn, 'Icon', new Vec3(0, 1, 0), '✕', 16, palette.text, 32, 32);
    this.addClick(closeBtn, () => this.closePopup());

    const cardW = 74;
    const cardH = 112;
    const gap = 8;
    const startX = -((daysConfig.length - 1) * (cardW + gap)) / 2;
    daysConfig.forEach((day, idx) => {
      const isClaimed = claimedDays.includes(idx);
      const isToday = idx === nextDayIndex && !signedInToday;
      const isNext = idx === nextDayIndex && signedInToday;
      const card = this.createNode(`SigninDay_${day.day}`, new Vec3(startX + idx * (cardW + gap), 74, 1), dialog);
      this.ensureTransform(card, cardW, cardH);
      const cg = card.addComponent(Graphics);
      const isGrandPrize = !!day.decorId;
      const fill = isToday ? '#1D2A3B' : (isGrandPrize ? '#1D2A3B' : (isClaimed ? '#0F172A' : palette.panelSoft));
      const border = isToday || isGrandPrize ? palette.gold : (isClaimed ? '#38BDF8' : '#334155');
      cg.fillColor = this.colorWithAlpha(fill, isToday ? 245 : 196);
      cg.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 18);
      cg.fill();
      cg.strokeColor = this.colorWithAlpha(border, isToday || isGrandPrize ? 230 : 130);
      cg.lineWidth = isToday ? 2.8 : (isGrandPrize ? 2.2 : 1.4);
      cg.stroke();
      cg.fillColor = this.colorWithAlpha(isToday || isGrandPrize ? palette.gold : (isClaimed ? '#38BDF8' : '#475569'), isToday ? 255 : 210);
      cg.circle(0, 24, 18);
      cg.fill();
      this.createLabel(card, 'Day', new Vec3(0, 24, 1), isGrandPrize ? '★' : `${day.day}`, 17, isToday || isGrandPrize ? '#111827' : '#FFFFFF', 34, 30);
      this.createLabel(card, 'Reward', new Vec3(0, -13, 1), day.short, 14, isToday ? '#FFFBEB' : (isClaimed ? '#A5F3FC' : palette.muted), 66, 22);
      this.createLabel(card, 'State', new Vec3(0, -39, 1), isClaimed ? '已领' : (isToday ? '可领' : (isNext ? '明日' : '待解锁')), 12, isToday ? palette.gold : '#64748B', 66, 20);
    });

    const currentReward = daysConfig[nextDayIndex];
    const rewardText = currentReward.fillEnergy ? '满能量' : `${currentReward.reward} 钻石`;
    const btnText = signedInToday ? '今 日 已 签 到  (明 日 再 来)' : `立 即 领 取 ${rewardText}`;
    const btnBgHex = signedInToday ? '#334155' : (this.currentTheme === 2 ? '#1D2A3B' : palette.blue);

    const detail = this.createNode('SigninDetail', new Vec3(0, -78, 1), dialog);
    this.ensureTransform(detail, 530, 86);
    const detailG = detail.addComponent(Graphics);
    this.drawGlassPanel(detailG, 530, 86, 20, signedInToday ? '#475569' : palette.gold, palette.panelSoft, 188, 1.4);
    this.createLabel(detail, 'RewardTitle', new Vec3(0, 16, 1), signedInToday ? '今日奖励已到账' : `今日奖励：${currentReward.label}`, 20, palette.text, 460, 28);
    this.createLabel(detail, 'RewardSub', new Vec3(0, -15, 1), currentReward.decorId ? '第 7 天额外解锁星核树摆件' : '奖励会飞入顶部资源栏，减少领取打扰', 15, palette.muted, 500, 24);

    const heroBtn = this.createNode('HeroBtn', new Vec3(0, -205, 1), dialog);
    this.ensureTransform(heroBtn, 430, 68);
    const hg = heroBtn.addComponent(Graphics);
    hg.fillColor = this.hex(btnBgHex);
    hg.roundRect(-215, -34, 430, 68, 34);
    hg.fill();
    hg.strokeColor = this.hex(signedInToday ? '#64748B' : palette.gold);
    hg.lineWidth = 2.4;
    hg.stroke();
    this.createLabel(heroBtn, 'Text', new Vec3(0, 1, 1), btnText, 20, '#FFFFFF', 390, 40);
    this.addClick(heroBtn, () => {
      if (ProfileManager.isTodaySignedin()) {
        WeChatService.showToast('今天已经签到，明天继续连签', 'none');
        return;
      }
      const claimed = ProfileManager.claimDailySignin(nextDayIndex, currentReward.reward, currentReward.fillEnergy, currentReward.decorId);
      this.closePopup();
      this.rebuildUI();
      WeChatService.showToast(claimed ? `签到成功：${currentReward.label}` : '签到状态已更新，请重试', claimed ? 'success' : 'none');
    });
    this.animatePopup(dialog);
  }

  private openAchievementPopup(): void {
    if (!this.beginExclusivePopup() || !this.popupRoot) return;

    const profile = ProfileManager.getProfile();
    const unlockedThemeCount = (profile.unlockedThemes || [0]).length;
    const bulletTimeUses = profile.bulletTimeUses || 0;
    const totalStars = profile.totalStars || 0;
    const endlessBestStage = profile.endlessBestStage || 0;
    const palette = this.getPalette();
    const achievements = [
      { id: 'first_start', title: '初次启航', desc: '完成第 1 关', reward: 50, current: Math.min(1, profile.levelProgress), target: 1 },
      { id: 'bullet_master', title: '子弹时间大师', desc: '触发极限减速 50 次', reward: 100, current: Math.min(50, bulletTimeUses), target: 50 },
      { id: 'high_star', title: '高分王者', desc: '累计获得 60 颗星', reward: 200, current: Math.min(60, totalStars), target: 60 },
      { id: 'endless', title: '流光无尽', desc: '连续接通 10 阶段', reward: 150, current: Math.min(10, endlessBestStage), target: 10 },
      { id: 'theme_collector', title: '全图鉴收藏', desc: '解锁 3 种太空流光主题', reward: 300, current: Math.min(3, unlockedThemeCount), target: 3 },
    ].map((ach) => {
      const isUnlocked = ach.current >= ach.target;
      const isClaimed = ProfileManager.isAchievementClaimed(ach.id);
      return { ...ach, isUnlocked, isClaimed, isClaimable: isUnlocked && !isClaimed };
    }).sort((a, b) => Number(b.isClaimable) - Number(a.isClaimable));

    const claimableItems: { id: string; reward: number }[] = [];
    achievements.forEach((ach) => {
      if (ach.isClaimable) {
        claimableItems.push({ id: ach.id, reward: ach.reward });
      }
    });
    const totalUnclaimed = claimableItems.reduce((sum, i) => sum + i.reward, 0);
    const btnText = totalUnclaimed > 0 ? `一 键 领 取 (${totalUnclaimed} 钻石)` : '所 有 成 就 已 领 取';
    const btnBgHex = totalUnclaimed > 0 ? palette.panelSoft : '#1E293B';
    const borderHex = totalUnclaimed > 0 ? '#FDE047' : '#475569';

    this.createPopupOverlay(this.popupRoot, () => this.closePopup(), 148);

    const dialog = this.createNode('AchievementDialog', new Vec3(0, -12, 0), this.popupRoot);
    this.ensureTransform(dialog, 620, 560);
    const dg = dialog.addComponent(Graphics);
    this.drawGlassPanel(dg, 620, 560, 32, borderHex, palette.panel, 230, 2.2);
    dialog.on(Node.EventType.TOUCH_END, (event: EventTouch) => { event.propagationStopped = true; });

    this.createLabel(dialog, 'Title', new Vec3(0, 230, 1), '荣誉勋章与成就', 27, palette.text, 430, 42);
    this.createLabel(dialog, 'Sub', new Vec3(0, 196, 1), totalUnclaimed > 0 ? '可领取奖励已置顶，点一次全部收下' : '继续通关、收星与挑战，解锁更多晶核奖励', 16, palette.muted, 540, 28);

    const closeBtn = this.createNode('CloseBtn', new Vec3(270, 230, 1), dialog);
    this.ensureTransform(closeBtn, 42, 42);
    const closeG = closeBtn.addComponent(Graphics);
    closeG.fillColor = this.colorWithAlpha(palette.panelSoft, 230);
    closeG.circle(0, 0, 18);
    closeG.fill();
    closeG.strokeColor = this.colorWithAlpha(borderHex, 170);
    closeG.lineWidth = 1.6;
    closeG.stroke();
    this.createLabel(closeBtn, 'Icon', new Vec3(0, 1, 0), '✕', 16, palette.text, 32, 32);
    this.addClick(closeBtn, () => this.closePopup());

    achievements.forEach((ach, idx) => {
      const y = 132 - idx * 66;
      const row = this.createNode(`Achievement_${ach.id}`, new Vec3(0, y, 1), dialog);
      this.ensureTransform(row, 540, 56);
      const rg = row.addComponent(Graphics);
      const border = ach.isClaimable ? '#FDE047' : (ach.isClaimed ? '#38BDF8' : '#334155');
      const fill = ach.isClaimable ? '#1D2A3B' : palette.panelSoft;
      rg.fillColor = this.colorWithAlpha(fill, ach.isClaimable ? 230 : 188);
      rg.roundRect(-270, -28, 540, 56, 18);
      rg.fill();
      rg.strokeColor = this.colorWithAlpha(border, ach.isClaimable ? 230 : 135);
      rg.lineWidth = ach.isClaimable ? 2.4 : 1.4;
      rg.stroke();

      rg.fillColor = this.colorWithAlpha(border, ach.isClaimable ? 255 : 180);
      rg.circle(-238, 0, 18);
      rg.fill();
      rg.strokeColor = this.colorWithAlpha('#111827', 190);
      rg.lineWidth = 2;
      const sx = -238;
      const sy = 1;
      for (let i = 0; i < 10; i++) {
        const angle = -Math.PI / 2 + i * Math.PI / 5;
        const radius = i % 2 === 0 ? 9 : 4;
        const x = sx + Math.cos(angle) * radius;
        const y = sy + Math.sin(angle) * radius;
        if (i === 0) rg.moveTo(x, y);
        else rg.lineTo(x, y);
      }
      rg.close();
      rg.stroke();
      this.createLabel(row, 'Title', new Vec3(-86, 10, 1), ach.title, 18, palette.text, 240, 24);
      this.createLabel(row, 'Desc', new Vec3(-86, -13, 1), ach.desc, 13, palette.muted, 240, 20);

      const ratio = Math.max(0, Math.min(1, ach.current / ach.target));
      rg.fillColor = this.colorWithAlpha('#0B1026', 230);
      rg.roundRect(42, -17, 160, 12, 6);
      rg.fill();
      rg.fillColor = this.colorWithAlpha(ach.isClaimable ? '#FDE047' : '#12E8FF', ach.isClaimed ? 80 : 220);
      rg.roundRect(42, -17, Math.max(8, 160 * ratio), 12, 6);
      rg.fill();

      const state = ach.isClaimed ? '已领' : (ach.isClaimable ? `领 ${ach.reward}` : `${ach.current}/${ach.target}`);
      this.createLabel(row, 'State', new Vec3(222, 1, 1), state, 16, ach.isClaimable ? '#FDE047' : (ach.isClaimed ? '#64748B' : '#A5F3FC'), 86, 28);
    });

    const heroBtn = this.createNode('HeroBtn', new Vec3(0, -225, 1), dialog);
    this.ensureTransform(heroBtn, 430, 66);
    const hg = heroBtn.addComponent(Graphics);
    hg.fillColor = this.hex(btnBgHex);
    hg.roundRect(-215, -33, 430, 66, 33);
    hg.fill();
    hg.strokeColor = this.hex(borderHex);
    hg.lineWidth = 2.4;
    hg.stroke();
    this.createLabel(heroBtn, 'Text', new Vec3(0, 1, 1), btnText, 20, '#FFFFFF', 390, 38);
    this.addClick(heroBtn, () => {
      if (totalUnclaimed <= 0) {
        WeChatService.showToast('暂无未领取的成就奖励！', 'none');
        return;
      }
      const claimedAmount = ProfileManager.claimAchievements(claimableItems);
      this.closePopup();
      this.rebuildUI();
      WeChatService.showToast(`成功领取成就奖励 +${claimedAmount} 💎`, 'success');
    });
    this.animatePopup(dialog);
  }

  private createRedDot(parent: Node, pos: Vec3): void {
    const dot = this.createNode('RewardRedDot', pos, parent);
    this.ensureTransform(dot, 22, 22);
    const g = dot.addComponent(Graphics);
    g.fillColor = this.hex('#EF4444');
    g.circle(0, 0, 10);
    g.fill();
    g.strokeColor = this.hex('#FDE047');
    g.lineWidth = 1.6;
    g.stroke();
    this.createLabel(dot, 'Bang', new Vec3(0, 1, 0), '!', 14, '#FFFFFF', 18, 18);
    if (!this.powerSaveMode) {
      tween(dot)
        .to(0.65, { scale: new Vec3(1.18, 1.18, 1) }, { easing: 'sineInOut' })
        .to(0.65, { scale: new Vec3(1, 1, 1) }, { easing: 'sineInOut' })
        .union()
        .repeatForever()
        .start();
    }
  }

  private drawIsometricBlock(
    g: Graphics,
    topFill: Color, sideDark: Color, sideLight: Color, stroke: Color,
    lineWidth: number, depth: number, customW: number, customH: number, offsetY: number, offsetX: number
  ): void {
    const halfW = customW / 2;
    const halfH = customH / 2;

    g.fillColor = sideDark;
    g.moveTo(offsetX - halfW, offsetY);
    g.lineTo(offsetX - halfW, offsetY - depth);
    g.lineTo(offsetX, offsetY - halfH - depth);
    g.lineTo(offsetX, offsetY - halfH);
    g.close();
    g.fill();

    g.fillColor = sideLight;
    g.moveTo(offsetX, offsetY - halfH);
    g.lineTo(offsetX, offsetY - halfH - depth);
    g.lineTo(offsetX + halfW, offsetY - depth);
    g.lineTo(offsetX + halfW, offsetY);
    g.close();
    g.fill();

    g.strokeColor = stroke;
    g.lineWidth = lineWidth;
    g.moveTo(offsetX - halfW, offsetY - depth);
    g.lineTo(offsetX, offsetY - halfH - depth);
    g.lineTo(offsetX + halfW, offsetY - depth);
    g.stroke();
    g.moveTo(offsetX, offsetY - halfH);
    g.lineTo(offsetX, offsetY - halfH - depth);
    g.stroke();

    g.fillColor = topFill;
    g.strokeColor = stroke;
    g.lineWidth = lineWidth;
    g.moveTo(offsetX, offsetY + halfH);
    g.lineTo(offsetX + halfW, offsetY);
    g.lineTo(offsetX, offsetY - halfH);
    g.lineTo(offsetX - halfW, offsetY);
    g.close();
    g.fill();
    g.stroke();
  }

  private createNode(name: string, pos: Vec3, parent?: Node): Node {
    const node = new Node(name);
    node.layer = Layers.Enum.UI_2D;
    if (parent) node.setParent(parent);
    node.setPosition(pos);
    return node;
  }

  private ensureTransform(node: Node, w: number, h: number): UITransform {
    let t = node.getComponent(UITransform);
    if (!t) t = node.addComponent(UITransform);
    t.setContentSize(w, h);
    return t;
  }

  private createLabel(parent: Node, name: string, pos: Vec3, text: string, fontSize: number, hexColor: string, w: number, h: number): Label {
    const node = this.createNode(name, pos, parent);
    this.ensureTransform(node, w, h);
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

  private hex(hexStr: string): Color {
    const clean = hexStr.replace('#', '');
    const r = parseInt(clean.substring(0, 2), 16) || 0;
    const g = parseInt(clean.substring(2, 4), 16) || 0;
    const b = parseInt(clean.substring(4, 6), 16) || 0;
    return new Color(r, g, b, 255);
  }
}
