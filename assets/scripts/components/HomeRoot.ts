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

  private drawGlassPanel(g: Graphics, width: number, height: number, radius: number, borderHex?: string, fillHex?: string, fillAlpha = 224, lineWidth = 1.8): void {
    const palette = this.getPalette();
    const finalFill = fillHex || palette.panel;
    const finalBorder = borderHex || palette.panelBorder;
    g.fillColor = this.colorWithAlpha(finalFill, fillAlpha);
    g.roundRect(-width / 2, -height / 2, width, height, radius);
    g.fill();
    g.fillColor = this.colorWithAlpha('#FFFFFF', 28);
    g.roundRect(-width / 2 + 8, height / 2 - 14, width - 16, 8, 4);
    g.fill();
    g.strokeColor = this.colorWithAlpha(finalBorder, 180);
    g.lineWidth = lineWidth;
    g.roundRect(-width / 2, -height / 2, width, height, radius);
    g.stroke();
  }

  private createPopupOverlay(parent: Node, onClose: () => void, alpha = 200): Node {
    const overlay = this.createNode('Overlay', new Vec3(0, 0, 0), parent);
    const overlaySize = view.getVisibleSize();
    this.ensureTransform(overlay, overlaySize.width, overlaySize.height);
    const og = overlay.addComponent(Graphics);
    // 弹窗深海暗化遮罩（提升至 78%~84% 纯净暗化度），聚焦前景弹窗，阻绝背景噪点干扰
    const safeAlpha = Math.max(195, alpha);
    og.fillColor = new Color(3, 8, 20, safeAlpha);
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

    // 4. 左侧不再堆叠悬浮图标，将签到与成就整合进底部「福利中心」，彻底露出空灵沉浸的浮岛星空背景！
    // this.createSidebarIcons(halfW, halfH);

    // 5. Center/Bottom Dual Mode Hero Cards (Y = -halfH * 0.04) - Enhanced visual dominance!
    this.createModeCards(halfH);

    // 6. Bottom Feature Mini Pills (Y = -halfH + 160) - Compact row, no longer competing with gameplay modes!
    this.createBottomFeatureRow(halfH);

    // 6.1 Studio Branding & Cross Promotion Pill (Y = -halfH + 44)
    this.createStudioBrandingRow(halfH);

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
    this.ensureTransform(aura, 540, 80);
    const ag = aura.addComponent(Graphics);
    const cAuraOuter = this.hex(auraOuter);
    ag.fillColor = new Color(cAuraOuter.r, cAuraOuter.g, cAuraOuter.b, 45);
    ag.ellipse(0, 6, 240, 45);
    ag.fill();
    const cAuraInner = this.hex(auraInner);
    ag.fillColor = new Color(cAuraInner.r, cAuraInner.g, cAuraInner.b, 65);
    ag.ellipse(0, 6, 150, 30);
    ag.fill();

    this.createLabel(titleRoot, 'MainTitle', new Vec3(0, 14, 0), '浮 岛 浮 光', 60, '#FFFFFF', 540, 72);
    this.createLabel(titleRoot, 'SubTitle', new Vec3(0, -36, 0), '═══  F L O A T   &   F L O W  ═══', 18, subCol, 500, 34);
  }

  private createHeroIsland(halfH: number): void {
    const islandY = halfH * 0.25;
    const islandRoot = this.createNode('HeroIslandRoot', new Vec3(0, islandY, 0), this.node);
    this.ensureTransform(islandRoot, 640, 480);
    this.heroIslandNode = islandRoot;

    const g = islandRoot.addComponent(Graphics);
    const palette = this.getPalette();

    const isRose = this.currentTheme === 1;
    const isGold = this.currentTheme === 2;

    // 1. 浮岛底部多面倒悬低多边形山体与深渊断崖 (Sub-island Inverted Low-Poly Mountain Roots - 参考图 3 & 图 4)
    const rockDark = this.hex(isGold ? '#1C1917' : (isRose ? '#240F30' : '#091528'));
    const rockMid  = this.hex(isGold ? '#292524' : (isRose ? '#351646' : '#0F2340'));
    const rockLight= this.hex(isGold ? '#44403C' : (isRose ? '#4C1D6B' : '#173660'));
    const rockRim  = this.hex(isGold ? '#F59E0B' : (isRose ? '#E879F9' : '#38BDF8'));

    // 绘制深渊倒悬山根多边形棱面
    const crags = [
      // 中心主脊山根（最深处直插虚空）
      { pts: [[0, -35], [-70, -30], [-35, -120], [0, -188]], col: rockMid },
      { pts: [[0, -35], [0, -188], [40, -125], [75, -28]], col: rockDark },
      // 左侧中翼倒锥岩层
      { pts: [[-70, -30], [-150, -25], [-125, -95], [-35, -120]], col: rockLight },
      { pts: [[-150, -25], [-220, -15], [-175, -65], [-125, -95]], col: rockDark },
      // 右侧中翼倒锥岩层
      { pts: [[75, -28], [40, -125], [130, -90], [155, -22]], col: rockLight },
      { pts: [[155, -22], [130, -90], [180, -60], [225, -12]], col: rockMid },
    ];

    crags.forEach(c => {
      g.fillColor = c.col;
      g.moveTo(c.pts[0][0], c.pts[0][1]);
      for (let i = 1; i < c.pts.length; i++) {
        g.lineTo(c.pts[i][0], c.pts[i][1]);
      }
      g.close();
      g.fill();
    });

    // 倒锥山棱边缘反光勾线
    g.strokeColor = rockRim;
    ((g.strokeColor) as any).a = 90;
    g.lineWidth = 1.2;
    g.moveTo(0, -35); g.lineTo(0, -188);
    g.moveTo(-70, -30); g.lineTo(-35, -120); g.lineTo(0, -188);
    g.moveTo(75, -28); g.lineTo(40, -125); g.lineTo(0, -188);
    g.stroke();

    // 2. 悬崖垂挂常春绿藤与晶莹棱镜吊坠 (Hanging Vines & Dangling Crystal Pendants - 参考图 1 & 图 3)
    const vineCol = this.hex(isGold ? '#059669' : (isRose ? '#7C3AED' : '#10B981'));
    const vineDark = this.hex(isGold ? '#047857' : (isRose ? '#5B21B6' : '#047857'));
    g.strokeColor = vineCol;
    g.lineWidth = 2.2;
    // 藤蔓 1
    g.moveTo(-160, -26); g.lineTo(-165, -55); g.lineTo(-158, -82); g.lineTo(-162, -108); g.stroke();
    // 藤蔓 2
    g.moveTo(-90, -32); g.lineTo(-84, -62); g.lineTo(-88, -92); g.stroke();
    // 藤蔓 3
    g.moveTo(110, -30); g.lineTo(116, -58); g.lineTo(112, -88); g.stroke();
    // 藤蔓 4
    g.moveTo(180, -24); g.lineTo(186, -52); g.lineTo(182, -80); g.lineTo(185, -102); g.stroke();

    // 垂挂发光水晶吊坠 (Dangling Prismatic Pendants)
    const pendants = [
      { x: -162, y: -108, len: 18, w: 7, col: palette.cyan },
      { x: -88,  y: -92,  len: 22, w: 8, col: palette.violet },
      { x: 112,  y: -88,  len: 20, w: 8, col: palette.gold },
      { x: 185,  y: -102, len: 16, w: 6, col: palette.pink },
    ];
    pendants.forEach(p => {
      // 细线吊绳
      g.strokeColor = this.hex('#FFFFFF');
      ((g.strokeColor) as any).a = 120;
      g.lineWidth = 1.0;
      g.moveTo(p.x, p.y);
      g.lineTo(p.x, p.y - 12);
      g.stroke();

      // 双面棱镜坠子
      const pendCol = this.hex(p.col);
      const py = p.y - 12;
      g.fillColor = pendCol;
      g.moveTo(p.x, py);
      g.lineTo(p.x - p.w * 0.5, py - p.len * 0.5);
      g.lineTo(p.x, py - p.len);
      g.lineTo(p.x + p.w * 0.5, py - p.len * 0.5);
      g.close();
      g.fill();

      // 水晶高光中心线
      g.strokeColor = this.hex('#FFFFFF');
      ((g.strokeColor) as any).a = 210;
      g.lineWidth = 1.2;
      g.moveTo(p.x, py);
      g.lineTo(p.x, py - p.len);
      g.stroke();
    });

    // 3. 下层主岛宽阔雪原/冰晶台地 (Plateau Surface - 纯净雪峰与冰晶雪原，彻底告别深蓝塑料感！)
    const snowWhite = this.hex(palette.plateauSnow || '#F8FAFC');
    const iceCyan   = this.hex(palette.plateauIce || '#BAE6FD');
    const frostGlow = this.hex(palette.glacier || '#E0F2FE');
    const mossDeep  = this.hex(isGold ? '#047857' : (isRose ? '#4C1D95' : '#0B2942'));

    // 主岛基座厚度（侧立面低多边形断崖）
    g.fillColor = rockMid;
    g.moveTo(-235, -10);
    g.lineTo(-235, -28);
    g.lineTo(0, -48);
    g.lineTo(235, -24);
    g.lineTo(235, -6);
    g.lineTo(0, -26);
    g.close();
    g.fill();

    // 主岛平顶纯净雪原 (Snow Plateau - 高亮纯白积雪覆盖)
    g.fillColor = snowWhite;
    g.moveTo(0, 36);
    g.lineTo(235, -6);
    g.lineTo(0, -26);
    g.lineTo(-235, -10);
    g.close();
    g.fill();

    // 雪原受光切面（左阳面受天幕极光映射，泛着空灵冰蓝浅霞）
    g.fillColor = frostGlow;
    g.moveTo(-235, -10);
    g.lineTo(-60, 18);
    g.lineTo(0, -26);
    g.close();
    g.fill();

    // 右侧雪原地表（冰晶背光切面，泛着晶莹浅湖蓝）
    g.fillColor = iceCyan;
    g.moveTo(0, -26);
    g.lineTo(60, 12);
    g.lineTo(235, -6);
    g.close();
    g.fill();

    // 雪原边缘天然冰棱与微光勾边
    g.strokeColor = this.hex('#FFFFFF');
    ((g.strokeColor) as any).a = 210;
    g.lineWidth = 1.4;
    g.moveTo(-235, -10);
    g.lineTo(0, 36);
    g.lineTo(235, -6);
    g.stroke();

    // 4. 上层天然天泉源台与双层飞瀑 (Natural Stone Spring Basin & Cascades - 告别生硬灰色胶囊框！)
    // 天然垒石天泉基座（自然堆叠的低多边形山石）
    const stoneCol = this.hex('#334155');
    const stoneHighlight = this.hex('#64748B');
    const stones = [
      { x: -160, y: 36, w: 28, h: 22 },
      { x: -140, y: 22, w: 32, h: 20 },
      { x: -110, y: 18, w: 34, h: 22 },
      { x: -80,  y: 22, w: 30, h: 24 },
      { x: -60,  y: 38, w: 26, h: 22 },
      { x: -80,  y: 62, w: 32, h: 20 },
      { x: -115, y: 68, w: 36, h: 22 },
      { x: -145, y: 58, w: 28, h: 22 },
    ];
    stones.forEach(s => {
      g.fillColor = stoneCol;
      g.circle(s.x, s.y, s.w * 0.5);
      g.fill();
      g.strokeColor = stoneHighlight;
      ((g.strokeColor) as any).a = 150;
      g.lineWidth = 1.0;
      g.circle(s.x, s.y, s.w * 0.5);
      g.stroke();
    });

    // 天泉水池内部 (Natural Spring Basin Pool)
    const waterCol = this.hex(palette.waterfallColor || '#38BDF8');
    g.fillColor = new Color(waterCol.r, waterCol.g, waterCol.b, 245);
    g.ellipse(-110, 42, 38, 18);
    g.fill();

    // 天池水面纯白同心涟漪
    g.strokeColor = this.hex('#FFFFFF');
    ((g.strokeColor) as any).a = 200;
    g.lineWidth = 1.5;
    g.ellipse(-110, 42, 22, 10);
    g.stroke();
    g.ellipse(-110, 42, 9, 4);
    g.stroke();

    // 泉水石阶溢流 (Upper Cascade falling over natural stone notch)
    g.fillColor = new Color(waterCol.r, waterCol.g, waterCol.b, 230);
    g.rect(-118, 8, 16, 26);
    g.fill();
    g.strokeColor = this.hex('#FFFFFF');
    ((g.strokeColor) as any).a = 240;
    g.lineWidth = 1.8;
    g.moveTo(-110, 32); g.lineTo(-110, 8); g.stroke();

    // 下层聚集的小水潭 (Lower Terrace Pool)
    g.fillColor = new Color(waterCol.r, waterCol.g, waterCol.b, 220);
    g.ellipse(-95, -6, 32, 14);
    g.fill();

    // 悬崖主跌水飞瀑！直冲而下倾泻入云海虚空 (Main Cliff Waterfall)
    const fallX = -95;
    const fallStartY = -14;
    const fallH = 160;
    g.fillColor = new Color(waterCol.r, waterCol.g, waterCol.b, 210);
    g.moveTo(fallX - 12, fallStartY);
    g.lineTo(fallX + 12, fallStartY);
    g.lineTo(fallX + 7, fallStartY - fallH);
    g.lineTo(fallX - 7, fallStartY - fallH);
    g.close();
    g.fill();

    // 瀑布急流纵向纯白反光线
    g.strokeColor = this.hex('#FFFFFF');
    ((g.strokeColor) as any).a = 240;
    g.lineWidth = 2.0;
    g.moveTo(fallX - 4, fallStartY); g.lineTo(fallX - 2, fallStartY - fallH);
    g.moveTo(fallX + 4, fallStartY); g.lineTo(fallX + 2, fallStartY - fallH);
    g.stroke();

    // 瀑布跌入云海的激扬光雾飞沫 (Falling Water Mist Particles)
    g.fillColor = new Color(255, 255, 255, 180);
    g.circle(fallX - 10, fallStartY - fallH - 6, 4.0);
    g.circle(fallX + 9,  fallStartY - fallH - 4, 3.5);
    g.circle(fallX,      fallStartY - fallH - 10, 6.0);
    g.circle(fallX - 6,  fallStartY - fallH - 18, 3.0);
    g.circle(fallX + 7,  fallStartY - fallH - 22, 2.8);
    g.fill();

    // 5. 符文王冠巨型棱镜水晶 (Runic Giant Crystal Monolith - 多面宝石切割与金白符文)
    const cryX = 45;
    const cryBaseY = 10;
    const cryTopY = 175;
    const cryW = 34;

    // 水晶背后的极光圣光光冕 (Radial Crystal Bloom)
    const cryBloomCol = this.hex(palette.crystalPrimary || palette.cyan);
    g.fillColor = new Color(cryBloomCol.r, cryBloomCol.g, cryBloomCol.b, 40);
    g.circle(cryX, cryBaseY + 80, 110);
    g.fill();
    g.fillColor = new Color(cryBloomCol.r, cryBloomCol.g, cryBloomCol.b, 75);
    g.circle(cryX, cryBaseY + 80, 65);
    g.fill();

    // 巨晶左受光晶面 (Left Refraction Facet)
    const cryL = this.hex(isGold ? '#FDE047' : (isRose ? '#F472B6' : '#22D3EE'));
    const cryR = this.hex(isGold ? '#D97706' : (isRose ? '#A21CAF' : '#0369A1'));
    const cryTop = this.hex(isGold ? '#FFFBEB' : (isRose ? '#FDF2F8' : '#E0F2FE'));

    // 左主棱面
    g.fillColor = cryL;
    g.moveTo(cryX, cryTopY);
    g.lineTo(cryX - cryW, cryBaseY + 95);
    g.lineTo(cryX - cryW * 0.75, cryBaseY);
    g.lineTo(cryX, cryBaseY + 18);
    g.close();
    g.fill();

    // 右阴面
    g.fillColor = cryR;
    g.moveTo(cryX, cryTopY);
    g.lineTo(cryX, cryBaseY + 18);
    g.lineTo(cryX + cryW * 0.75, cryBaseY);
    g.lineTo(cryX + cryW, cryBaseY + 95);
    g.close();
    g.fill();

    // 晶尖棱角与高光倒角
    g.fillColor = cryTop;
    g.moveTo(cryX, cryTopY);
    g.lineTo(cryX - cryW * 0.45, cryBaseY + 120);
    g.lineTo(cryX, cryBaseY + 130);
    g.lineTo(cryX + cryW * 0.45, cryBaseY + 120);
    g.close();
    g.fill();

    // 巨晶表面发光符文几何印记 (Inscribed Glowing Runes - 参考图 2 魔法印记)
    const runeY = cryBaseY + 70;
    g.strokeColor = this.hex('#FFFFFF');
    ((g.strokeColor) as any).a = 240;
    g.lineWidth = 1.8;
    // 符文光环
    g.circle(cryX, runeY, 18);
    g.stroke();
    // 符文内嵌倒三角与十字光标
    g.moveTo(cryX, runeY - 12);
    g.lineTo(cryX - 10, runeY + 6);
    g.lineTo(cryX + 10, runeY + 6);
    g.close();
    g.stroke();
    g.moveTo(cryX, runeY - 18); g.lineTo(cryX, runeY + 18);
    g.stroke();

    // 巨晶棱线纯白高光勾勒
    g.strokeColor = this.hex('#FFFFFF');
    ((g.strokeColor) as any).a = 210;
    g.lineWidth = 1.6;
    g.moveTo(cryX, cryTopY); g.lineTo(cryX - cryW, cryBaseY + 95);
    g.moveTo(cryX, cryTopY); g.lineTo(cryX + cryW, cryBaseY + 95);
    g.moveTo(cryX, cryTopY); g.lineTo(cryX, cryBaseY + 18);
    g.stroke();

    // 巨晶根部伴生小水晶簇 (Companion Shards)
    const shards = [
      { x: cryX - 32, y: cryBaseY + 4, w: 9, h: 42, angle: -24, col: palette.cyan },
      { x: cryX + 28, y: cryBaseY + 2, w: 8, h: 36, angle: 26,  col: palette.violet },
      { x: cryX - 18, y: cryBaseY - 6, w: 7, h: 26, angle: -12, col: palette.pink },
      { x: cryX + 14, y: cryBaseY - 8, w: 6, h: 22, angle: 16,  col: palette.glacier },
    ];
    shards.forEach(s => {
      const col = this.hex(s.col);
      g.fillColor = col;
      g.moveTo(s.x - s.w * 0.5, s.y);
      g.lineTo(s.x + Math.sin(s.angle * Math.PI / 180) * s.h, s.y + Math.cos(s.angle * Math.PI / 180) * s.h);
      g.lineTo(s.x + s.w * 0.5, s.y);
      g.close();
      g.fill();
      g.strokeColor = this.hex('#FFFFFF');
      ((g.strokeColor) as any).a = 200;
      g.lineWidth = 1.0;
      g.moveTo(s.x, s.y);
      g.lineTo(s.x + Math.sin(s.angle * Math.PI / 180) * s.h, s.y + Math.cos(s.angle * Math.PI / 180) * s.h);
      g.stroke();
    });

    // 6. 生态点缀：手绘感多层立体雪松与温暖木架地灯 (Organic Stylized Snow Pines & Warm Lantern)
    // 左后方有机造型雪松 1
    const drawSnowPine = (tx: number, ty: number, scale: number) => {
      // 树干
      g.fillColor = this.hex('#451A03');
      g.fillRect(tx - 3 * scale, ty, 6 * scale, 18 * scale);
      // 3 层自然分枝绿冠与雪顶
      const tiers = [
        { y: ty + 10 * scale, w: 26 * scale, h: 22 * scale },
        { y: ty + 24 * scale, w: 20 * scale, h: 20 * scale },
        { y: ty + 38 * scale, w: 14 * scale, h: 18 * scale },
      ];
      tiers.forEach((t, idx) => {
        // 深翠松针底色
        g.fillColor = this.hex(idx === 2 ? '#059669' : (idx === 1 ? '#047857' : '#064E3B'));
        g.moveTo(tx, t.y + t.h);
        g.lineTo(tx - t.w, t.y);
        g.lineTo(tx - t.w * 0.5, t.y + 4 * scale);
        g.lineTo(tx, t.y + 2 * scale);
        g.lineTo(tx + t.w * 0.5, t.y + 4 * scale);
        g.lineTo(tx + t.w, t.y);
        g.close();
        g.fill();
        // 松枝纯白厚积雪顶 (Snow Crust)
        g.fillColor = this.hex('#FFFFFF');
        g.moveTo(tx, t.y + t.h);
        g.lineTo(tx - t.w * 0.65, t.y + t.h * 0.35);
        g.lineTo(tx - t.w * 0.25, t.y + t.h * 0.45);
        g.lineTo(tx + t.w * 0.25, t.y + t.h * 0.45);
        g.lineTo(tx + t.w * 0.65, t.y + t.h * 0.35);
        g.close();
        g.fill();
      });
    };

    drawSnowPine(-175, 14, 1.2);
    drawSnowPine(-205, 4, 0.9);

    // 右前侧木架与暖色悬空地灯 (Warm Lantern Post)
    const postX = 145;
    const postY = -8;
    g.strokeColor = this.hex('#78350F');
    g.lineWidth = 3.0;
    g.moveTo(postX, postY);
    g.lineTo(postX, postY + 44);
    g.lineTo(postX - 14, postY + 44);
    g.stroke();

    // 悬挂暖黄地灯
    g.fillColor = new Color(245, 158, 11, 75);
    g.circle(postX - 14, postY + 34, 24); // 暖光漫反射光晕
    g.fill();
    g.fillColor = this.hex('#FEF08A');
    g.circle(postX - 14, postY + 34, 6.5);
    g.fill();

    // 草地野花碎点 (Blossom Petals)
    const flowers = [
      { x: -50, y: -8,  col: '#F472B6' },
      { x: -35, y: -18, col: '#FDE047' },
      { x: -10, y: -6,  col: '#67E8F9' },
      { x: 15,  y: -14, col: '#F472B6' },
      { x: 80,  y: -16, col: '#FDE047' },
      { x: 110, y: -4,  col: '#A78BFA' },
      { x: 170, y: -12, col: '#F472B6' },
    ];
    flowers.forEach(f => {
      g.fillColor = this.hex(f.col);
      g.circle(f.x, f.y, 2.2);
      g.fill();
    });

    const profile = ProfileManager.getProfile();
    const journeyLevelCount = 30;
    const currentLevel = Math.min(profile.levelProgress + 1, journeyLevelCount);
    const chapterName = currentLevel <= 10 ? '极光冰原' : (currentLevel <= 20 ? '幻彩星港' : '日冕晨光');

    const decor = profile.islandDecor || [];
    this.drawIslandDecor(g, decor);
    this.createLabel(islandRoot, 'IslandHint', new Vec3(0, -172, 2), `✦ ${chapterName} · 点击浮岛选择关卡 ✦`, 17, '#BAE6FD', 380, 30);

    // 7. 浮岛生命力动态系统 (Living Island Dynamics - 核心水晶呼吸、瀑布激沫、悬浮微粒与整岛轻盈浮动)
    if (!this.powerSaveMode) {
      // 整座浮岛极轻微上下悬浮，宛如悬浮在星海与极光之间的微型天地 (周期 4s，上下浮动 6px)
      tween(islandRoot)
        .to(2.6, { position: new Vec3(0, islandY + 6, 0) }, { easing: 'sineInOut' })
        .to(2.6, { position: new Vec3(0, islandY - 6, 0) }, { easing: 'sineInOut' })
        .union()
        .repeatForever()
        .start();

      // 核心水晶独立明暗呼吸光冕 (Crystal Breathing Aura)
      const cryPulseNode = this.createNode('CrystalPulseAura', new Vec3(cryX, cryBaseY + 80, -1), islandRoot);
      const cpg = cryPulseNode.addComponent(Graphics);
      cpg.fillColor = new Color(cryBloomCol.r, cryBloomCol.g, cryBloomCol.b, 35);
      cpg.circle(0, 0, 115);
      cpg.fill();
      cpg.fillColor = new Color(cryBloomCol.r, cryBloomCol.g, cryBloomCol.b, 70);
      cpg.circle(0, 0, 68);
      cpg.fill();
      tween(cryPulseNode)
        .to(2.2, { scale: new Vec3(1.16, 1.16, 1) }, { easing: 'sineInOut' })
        .to(2.2, { scale: new Vec3(0.92, 0.92, 1) }, { easing: 'sineInOut' })
        .union()
        .repeatForever()
        .start();

      // 瀑布倾泻跌入云海的动态水花与柔光气泡 (Waterfall Impact Splash Rings)
      const splashNode = this.createNode('WaterfallSplash', new Vec3(fallX, fallStartY - fallH - 10, 1), islandRoot);
      const spg = splashNode.addComponent(Graphics);
      spg.strokeColor = new Color(255, 255, 255, 140);
      spg.lineWidth = 1.4;
      spg.ellipse(0, 0, 18, 7);
      spg.stroke();
      spg.fillColor = new Color(186, 230, 253, 90);
      spg.circle(0, -3, 6);
      spg.circle(-7, 2, 4);
      spg.circle(8, 1, 4.5);
      spg.fill();
      tween(splashNode)
        .to(1.6, { scale: new Vec3(1.22, 1.22, 1) }, { easing: 'sineInOut' })
        .to(1.6, { scale: new Vec3(0.85, 0.85, 1) }, { easing: 'sineInOut' })
        .union()
        .repeatForever()
        .start();

      // 围绕浮岛缓缓漂浮闪烁的仙灵星尘微粒 (Floating Stardust Motes)
      const motes = [
        { x: -175, y: 75, r: 2.2, col: '#38BDF8', delay: 0 },
        { x: -115, y: 140, r: 1.8, col: '#E0F2FE', delay: 0.7 },
        { x: 125, y: 105, r: 2.0, col: '#FDE047', delay: 1.3 },
        { x: 185, y: 55, r: 2.4, col: '#F472B6', delay: 0.4 },
        { x: 65, y: 175, r: 1.6, col: '#BAE6FD', delay: 1.0 },
      ];
      motes.forEach((m, idx) => {
        const moteNode = this.createNode(`IslandMote_${idx}`, new Vec3(m.x, m.y, 2), islandRoot);
        const mg = moteNode.addComponent(Graphics);
        mg.fillColor = this.hex(m.col);
        mg.circle(0, 0, m.r);
        mg.fill();
        tween(moteNode)
          .delay(m.delay)
          .by(2.5, { position: new Vec3(0, 12, 0) }, { easing: 'sineInOut' })
          .by(2.5, { position: new Vec3(0, -12, 0) }, { easing: 'sineInOut' })
          .union()
          .repeatForever()
          .start();
      });
    }

    // 点击浮岛触发涟漪与音效反馈
    this.addClick(islandRoot, () => {
      console.log('[HomeRoot] Clicked hero island -> open level map');
      if (this.onOpenLevelSelectCallback) {
        this.onOpenLevelSelectCallback();
      } else if (this.onStartJourneyCallback) {
        this.onStartJourneyCallback();
      }
    });

    // 7. 环绕浮岛盘旋的极光萤火粒子 (Ambient Floating Spores)
    if (!this.powerSaveMode) {
      for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * Math.PI * 2;
        const px = Math.cos(angle) * (195 + (i % 3) * 25);
        const py = Math.sin(angle) * (75 + (i % 2) * 20) + 15;
        const pNode = this.createNode(`GlowMote_${i}`, new Vec3(px, py, 3), islandRoot);
        this.ensureTransform(pNode, 12, 12);
        const pg = pNode.addComponent(Graphics);
        const moteCol = i % 3 === 0 ? palette.cyan : (i % 2 === 0 ? palette.gold : palette.pink);
        pg.fillColor = this.hex(moteCol);
        ((pg.fillColor) as any).a = 185;
        pg.circle(0, 0, 2.6 + (i % 3) * 0.7);
        pg.fill();

        tween(pNode)
          .to(2.2 + (i % 4) * 0.4, { position: new Vec3(px + (i % 2 === 0 ? 15 : -15), py + 22, 3) }, { easing: 'sineInOut' })
          .to(2.2 + (i % 4) * 0.4, { position: new Vec3(px, py, 3) }, { easing: 'sineInOut' })
          .union()
          .repeatForever()
          .start();
      }
    }

    // 浮岛整体悠扬平缓的上下悬浮动效 (Floating Island Breathing Tween)
    if (!this.powerSaveMode) {
      tween(islandRoot)
        .to(2.6, { position: new Vec3(0, islandY + 8, 0) }, { easing: 'sineInOut' })
        .to(2.6, { position: new Vec3(0, islandY - 8, 0) }, { easing: 'sineInOut' })
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

    // Draw faceted energy crystal emblem on jg (精致多面能量水晶徽标，赋予真正的探索启动仪式感)
    const iconX = -204;
    const iconY = 0;
    // 水晶背光微晕
    jg.fillColor = this.hex(jBorder);
    ((jg.fillColor) as any).a = 85;
    jg.circle(iconX, iconY, 20);
    jg.fill();
    // 棱晶主体 (菱形多面切割)
    jg.fillColor = this.hex(this.currentTheme === 2 ? '#F59E0B' : '#06B6D4');
    jg.moveTo(iconX, iconY + 16);
    jg.lineTo(iconX + 13, iconY);
    jg.lineTo(iconX, iconY - 16);
    jg.lineTo(iconX - 13, iconY);
    jg.close();
    jg.fill();
    // 晶体左阳受光面
    jg.fillColor = this.hex('#E0F2FE');
    jg.moveTo(iconX, iconY + 16);
    jg.lineTo(iconX, iconY - 16);
    jg.lineTo(iconX - 13, iconY);
    jg.close();
    jg.fill();
    // 核心高光星芒
    jg.fillColor = this.hex('#FFFFFF');
    jg.circle(iconX - 2, iconY + 2, 2.5);
    jg.fill();
    // 前进引导小金星
    jg.fillColor = this.hex('#FDE047');
    jg.moveTo(iconX + 8, iconY);
    jg.lineTo(iconX + 1, iconY + 6);
    jg.lineTo(iconX + 1, iconY - 6);
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
    const dailyUnlocked = true;
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
    const dailyBeat = hasPlayedDaily
      ? Math.min(99, Math.max(55, 96 - Math.max(0, (profile.dailyChallengeBestMoves || 12) - 4) * 4))
      : 72;
    const dailySub = hasPlayedDaily
      ? `${profile.dailyChallengeBestMoves || '--'}步 · 胜${dailyBeat}%`
      : `通关率${dailyBeat}%`;
    this.createLabel(dailyCard, 'Title', new Vec3(-34, 1, 0), '每日一束光', 20, '#FFFFFF', 210, 30);
    this.createLabel(dailyCard, 'Sub', new Vec3(104, 1, 0), dailySub, 15, '#FDE047', 108, 24);
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
    const shouldShowWelfareDot = hasDailyReward || hasShareReward || hasAchievementReward;

    const themeSub = this.getCurrentThemeName();
    const unlockedThemeCount = (ProfileManager.isThemeUnlocked(0) ? 1 : 0) +
      (ProfileManager.isThemeUnlocked(1) ? 1 : 0) +
      (ProfileManager.isThemeUnlocked(2) ? 1 : 0);
    const canUnlockTheme = (!ProfileManager.isThemeUnlocked(1) && profile.diamonds >= 300) ||
      (!ProfileManager.isThemeUnlocked(2) && profile.diamonds >= 500);
    type FeatureItem = {
      id: 'welfare' | 'gallery';
      title: string;
      sub: string;
      x: number;
      w: number;
      bg: string;
      border: string;
      col: string;
      dot: boolean;
    };
    const itemW = 280;
    const items: FeatureItem[] = [
      {
        id: 'welfare',
        title: '福利中心',
        sub: hasDailyReward
          ? '今日签到可领'
          : (hasAchievementReward ? '荣誉成就可领' : (hasShareReward ? '分享可领 +60💎' : '奖励 · 补能 · 签到')),
        x: -148,
        w: itemW,
        bg: palette.panel,
        border: palette.gold,
        col: '#FDE68A',
        dot: shouldShowWelfareDot,
      },
      {
        id: 'gallery',
        title: '外观图鉴',
        sub: `已解锁 ${unlockedThemeCount}/3 主题`,
        x: 148,
        w: itemW,
        bg: palette.panelSoft,
        border: this.currentTheme === 2 ? palette.gold : palette.cyan,
        col: this.currentTheme === 2 ? '#FFF8E8' : '#BAE6FD',
        dot: canUnlockTheme,
      },
    ];

    items.forEach((p, idx) => {
      const node = this.createNode(`FeatureMini_${idx}`, new Vec3(p.x, 0, 0), pillsRoot);
      this.ensureTransform(node, p.w, 68);
      const g = node.addComponent(Graphics);
      g.fillColor = this.hex(p.bg);
      ((g.fillColor) as any).a = 210;
      g.roundRect(-p.w / 2, -34, p.w, 68, 26);
      g.fill();
      const bCol = this.hex(p.border);
      bCol.a = p.dot ? 220 : 130;
      g.strokeColor = bCol;
      g.lineWidth = p.dot ? 2.4 : 1.8;
      g.roundRect(-p.w / 2, -34, p.w, 68, 26);
      g.stroke();

      g.strokeColor = new Color(255, 255, 255, 80);
      g.lineWidth = 1.2;
      g.moveTo(-p.w / 2 + 24, 30);
      g.lineTo(p.w / 2 - 24, 30);
      g.stroke();

      const iconX = -86;
      if (p.id === 'welfare') {
        g.fillColor = this.hex('#F59E0B');
        g.strokeColor = Color.WHITE;
        g.lineWidth = 1.8;
        g.roundRect(iconX - 18, -15, 36, 30, 6);
        g.fill();
        g.stroke();
        g.fillColor = this.hex('#FDE047');
        g.fillRect(iconX - 4, -15, 8, 30);
        g.fillRect(iconX - 18, -6, 36, 8);
      } else {
        // 调色板与晶核水晶图标
        g.fillColor = this.hex('#0EA5E9');
        g.strokeColor = Color.WHITE;
        g.lineWidth = 1.6;
        g.circle(iconX, 0, 16);
        g.fill();
        g.stroke();
        g.fillColor = this.hex('#EC4899');
        g.circle(iconX - 5, 5, 4);
        g.fill();
        g.fillColor = this.hex('#10B981');
        g.circle(iconX + 6, -4, 4);
        g.fill();
        g.fillColor = this.hex('#F59E0B');
        g.circle(iconX, -5, 4);
        g.fill();
      }

      const labelW = 176;
      const titleLabel = this.createLabel(node, 'Title', new Vec3(22, 11, 0), p.title, 22, '#FFFFFF', labelW, 28);
      const subLabel = this.createLabel(node, 'Sub', new Vec3(22, -14, 0), p.sub, 16, p.col, labelW, 24);
      titleLabel.overflow = Label.Overflow.NONE;
      subLabel.overflow = Label.Overflow.NONE;
      if (p.dot) this.createRedDot(node, new Vec3(p.w / 2 - 18, 25, 1));

      this.addClick(node, () => {
        console.log(`[HomeRoot] Clicked bottom feature: ${p.title}`);
        if (p.id === 'gallery') {
          this.showSystemGalleryPopup();
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

  private createStudioBrandingRow(halfH: number): void {
    const studioNode = this.createNode('StudioBrandPill', new Vec3(0, -halfH + 46, 0), this.node);
    this.ensureTransform(studioNode, 320, 38);
    const g = studioNode.addComponent(Graphics);
    g.fillColor = this.hex('#061122');
    ((g.fillColor) as any).a = 180;
    g.roundRect(-160, -19, 320, 38, 19);
    g.fill();
    g.strokeColor = this.hex('#29BDE0');
    ((g.strokeColor) as any).a = 90;
    g.lineWidth = 1.2;
    g.roundRect(-160, -19, 320, 38, 19);
    g.stroke();

    this.createLabel(studioNode, 'Text', new Vec3(0, 0, 0), '🐰 哈密兔工作室 · 更多好玩 ➔', 14, '#94A3B8', 300, 26);
    this.addClick(studioNode, () => {
      WeChatService.vibrateShort('light');
      this.showHamituStudioDialog();
    });
  }

  private showHamituStudioDialog(): void {
    if (!this.beginExclusivePopup() || !this.popupRoot) return;

    const palette = this.getPalette();
    this.createPopupOverlay(this.popupRoot, () => this.closePopup(), 180);

    const dialog = this.createNode('StudioDialog', new Vec3(0, 0, 0), this.popupRoot);
    this.ensureTransform(dialog, 600, 520);
    const g = dialog.addComponent(Graphics);
    this.drawGlassPanel(g, 600, 520, 28, palette.cyan, palette.panel, 245, 2.2);
    dialog.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
      event.propagationStopped = true;
    });

    // Close button
    const closeBtn = this.createNode('CloseBtn', new Vec3(250, 218, 1), dialog);
    this.ensureTransform(closeBtn, 40, 40);
    const cg = closeBtn.addComponent(Graphics);
    cg.fillColor = this.hex('#1E293B');
    cg.circle(0, 0, 16);
    cg.fill();
    cg.strokeColor = this.hex(palette.cyan);
    cg.lineWidth = 1.5;
    cg.stroke();
    this.createLabel(closeBtn, 'X', new Vec3(0, 1, 0), '✕', 16, '#FFFFFF', 32, 32);
    this.addClick(closeBtn, () => this.closePopup());

    // Header
    this.createLabel(dialog, 'Title', new Vec3(0, 205, 1), '🐰 哈密兔独立游戏工作室', 26, '#FFFFFF', 500, 36);
    this.createLabel(dialog, 'Sub', new Vec3(0, 168, 1), 'HAMITU GAMES · 专注原创唯美与纯粹解压', 16, '#29BDE0', 500, 26);

    // Cross-promotion Card: 《穿针引线》
    const card = this.createNode('ZhenxianCard', new Vec3(0, 40, 1), dialog);
    this.ensureTransform(card, 530, 200);
    const cardG = card.addComponent(Graphics);
    cardG.fillColor = this.hex(palette.panelSoft);
    ((cardG.fillColor) as any).a = 210;
    cardG.roundRect(-265, -100, 530, 200, 18);
    cardG.fill();
    cardG.strokeColor = this.hex(palette.gold);
    cardG.lineWidth = 1.6;
    cardG.roundRect(-265, -100, 530, 200, 18);
    cardG.stroke();

    this.createLabel(card, 'CardTitle', new Vec3(-110, 60, 1), '⚡《穿针引线》', 22, palette.gold, 260, 32);
    this.createLabel(card, 'CardTag', new Vec3(130, 60, 1), '极速微操 · 节奏破壁', 15, '#38BDF8', 200, 26);
    this.createLabel(card, 'CardDesc', new Vec3(0, 5, 1), '单手解压、极速穿透！挑战手速与直觉极限。\n连续穿透触发升调和弦与量子护盾，手感爆棚！', 16, '#E2E8F0', 480, 48);

    // Launch button
    const launchBtn = this.createNode('LaunchBtn', new Vec3(0, -60, 1), card);
    this.ensureTransform(launchBtn, 460, 46);
    const lbg = launchBtn.addComponent(Graphics);
    lbg.fillColor = this.hex(palette.gold);
    lbg.roundRect(-230, -23, 460, 46, 23);
    lbg.fill();
    this.createLabel(launchBtn, 'LText', new Vec3(0, 1, 0), '▶ 立即前往挑战《穿针引线》➔', 18, '#080E1A', 440, 32);
    this.addClick(launchBtn, () => {
      WeChatService.vibrateShort('medium');
      WeChatService.openMiniProgram('wxa8a598a3c86c1234', '', '正在联动唤起《穿针引线》...');
    });

    // Studio manifesto
    const infoBox = this.createNode('InfoBox', new Vec3(0, -145, 1), dialog);
    this.ensureTransform(infoBox, 530, 110);
    const ig = infoBox.addComponent(Graphics);
    ig.fillColor = this.hex('#061122');
    ((ig.fillColor) as any).a = 160;
    ig.roundRect(-265, -55, 530, 110, 16);
    ig.fill();
    ig.strokeColor = this.hex('#334155');
    ig.lineWidth = 1.2;
    ig.roundRect(-265, -55, 530, 110, 16);
    ig.stroke();

    this.createLabel(infoBox, 'DevTitle', new Vec3(0, 24, 1), '✨ 开发者理念', 16, '#A5F3FC', 480, 24);
    this.createLabel(infoBox, 'DevBody', new Vec3(0, -14, 1), '不靠粗糙换皮，只打磨极致 Game Feel 与优雅视听。\n愿这两款独立小游戏，能陪伴你度过一段治愈时光。', 14, '#94A3B8', 490, 44);

    this.animatePopup(dialog);
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
    this.createPopupOverlay(this.popupRoot, () => this.closePopup(), 200);

    const dialog = this.createNode('SystemGalleryDialog', new Vec3(0, -6, 0), this.popupRoot);
    this.ensureTransform(dialog, 660, 720);
    const g = dialog.addComponent(Graphics);
    this.drawGlassPanel(g, 660, 720, 32, palette.cyan, palette.panel, 240, 2.2);
    dialog.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
      event.propagationStopped = true;
    });

    this.createLabel(dialog, 'Title', new Vec3(0, 318, 1), '外观装扮与核心图鉴', 28, palette.text, 460, 40);
    this.createLabel(dialog, 'Sub', new Vec3(0, 284, 1), '探索角色形象、浮岛装扮、核心水晶技能与太空主题', 15, palette.muted, 600, 24);

    const closeBtn = this.createNode('CloseBtn', new Vec3(290, 318, 1), dialog);
    this.ensureTransform(closeBtn, 44, 44);
    const closeG = closeBtn.addComponent(Graphics);
    closeG.fillColor = this.colorWithAlpha(palette.panelSoft, 230);
    closeG.circle(0, 0, 19);
    closeG.fill();
    closeG.strokeColor = this.colorWithAlpha(palette.cyan, 180);
    closeG.lineWidth = 1.6;
    closeG.stroke();
    this.createLabel(closeBtn, 'Icon', new Vec3(0, 1, 1), '✕', 18, palette.text, 34, 34);
    this.addClick(closeBtn, () => this.closePopup());

    let currentTab = 0; // 0: 角色形象, 1: 浮岛装扮, 2: 核心水晶, 3: 太空主题
    let selectedCrystalIdx = 0;

    const tabsBar = this.createNode('TabsBar', new Vec3(0, 240, 1), dialog);
    this.ensureTransform(tabsBar, 620, 46);

    const contentArea = this.createNode('ContentArea', new Vec3(0, -10, 1), dialog);
    this.ensureTransform(contentArea, 620, 430);

    const tabNames = ['角色形象', '浮岛装扮', '核心水晶', '太空主题'];
    const tabXs = [-225, -75, 75, 225];

    const renderTabs = () => {
      tabsBar.destroyAllChildren();
      tabNames.forEach((name, idx) => {
        const isSel = currentTab === idx;
        const tabBtn = this.createNode(`Tab_${idx}`, new Vec3(tabXs[idx], 0, 0), tabsBar);
        this.ensureTransform(tabBtn, 140, 42);
        const tg = tabBtn.addComponent(Graphics);
        tg.fillColor = this.hex(isSel ? palette.panelSoft : '#0B1528');
        ((tg.fillColor) as any).a = isSel ? 240 : 160;
        tg.roundRect(-70, -21, 140, 42, 14);
        tg.fill();
        tg.strokeColor = this.hex(isSel ? palette.cyan : '#1E293B');
        tg.lineWidth = isSel ? 2.2 : 1.2;
        tg.roundRect(-70, -21, 140, 42, 14);
        tg.stroke();
        this.createLabel(tabBtn, 'Text', new Vec3(0, 1, 0), name, 17, isSel ? '#FFFFFF' : palette.muted, 130, 30);

        this.addClick(tabBtn, () => {
          if (currentTab !== idx) {
            currentTab = idx;
            renderTabs();
            renderContent();
          }
        });
      });
    };

    const renderContent = () => {
      contentArea.destroyAllChildren();

      if (currentTab === 0) {
        // 1. 角色形象 (Avatars)
        const runners = [
          { name: '默认流光', color: '#38BDF8', desc: '纯净水晶球 · 初始赠送', unlocked: true },
          { name: '灵动光猫', color: '#F472B6', desc: '灵动猫耳 · 分享好友解锁', unlocked: true },
          { name: '纸飞机', color: '#FBBF24', desc: '折翼微光 · 挑战关卡解锁', unlocked: false },
        ];
        runners.forEach((item, index) => {
          const x = -205 + index * 205;
          const card = this.createNode(`RunnerCard_${index}`, new Vec3(x, 40, 0), contentArea);
          this.ensureTransform(card, 192, 280);
          const cg = card.addComponent(Graphics);
          cg.fillColor = this.hex(palette.panelSoft);
          ((cg.fillColor) as any).a = 230;
          cg.roundRect(-96, -140, 192, 280, 20);
          cg.fill();
          cg.strokeColor = this.hex(item.unlocked ? item.color : '#334155');
          cg.lineWidth = item.unlocked ? 2.0 : 1.4;
          cg.roundRect(-96, -140, 192, 280, 20);
          cg.stroke();

          // Large glowing avatar preview orb
          const orb = this.hex(item.color);
          cg.fillColor = new Color(orb.r, orb.g, orb.b, item.unlocked ? 60 : 25);
          cg.circle(0, 48, 48);
          cg.fill();
          cg.fillColor = new Color(orb.r, orb.g, orb.b, item.unlocked ? 220 : 80);
          cg.circle(0, 48, 28);
          cg.fill();
          cg.fillColor = this.hex('#FFFFFF');
          ((cg.fillColor) as any).a = item.unlocked ? 240 : 80;
          cg.circle(-8, 56, 8);
          cg.fill();

          this.createLabel(card, 'Name', new Vec3(0, -32, 1), item.name, 20, '#FFFFFF', 170, 28);
          this.createLabel(card, 'Desc', new Vec3(0, -64, 1), item.desc, 14, palette.muted, 170, 22);

          const statusBadge = this.createNode('StatusBadge', new Vec3(0, -106, 1), card);
          this.ensureTransform(statusBadge, 130, 34);
          const sbg = statusBadge.addComponent(Graphics);
          sbg.fillColor = this.hex(item.unlocked ? (index === 0 ? '#065F46' : '#1E293B') : '#182030');
          sbg.roundRect(-65, -17, 130, 34, 12);
          sbg.fill();
          sbg.strokeColor = this.hex(item.unlocked ? (index === 0 ? '#34D399' : palette.cyan) : '#475569');
          sbg.lineWidth = 1.4;
          sbg.roundRect(-65, -17, 130, 34, 12);
          sbg.stroke();
          const badgeText = index === 0 ? '✓ 已启用' : (item.unlocked ? '可体验' : '🔒 待解锁');
          this.createLabel(statusBadge, 'Text', new Vec3(0, 1, 0), badgeText, 15, item.unlocked ? '#FFFFFF' : '#64748B', 120, 26);
        });
      } else if (currentTab === 1) {
        // 2. 浮岛装扮与光轨 (Trails & Decors)
        const cosmetics = [
          { name: '极光光轨', color: '#29BDE0', type: '光轨装扮', desc: '流光拖尾散发青蓝极光粒子' },
          { name: '樱花光轨', color: '#F472B6', type: '光轨装扮', desc: '浪漫樱粉光带飘洒落英' },
          { name: '霓虹光轨', color: '#A78BFA', type: '光轨装扮', desc: '赛博梦幻紫调时空流线' },
          { name: '灯塔摆件', color: '#FFD66B', type: '浮岛雕塑', desc: '耸立在主界面浮岛边缘守护' },
          { name: '咖啡馆摆件', color: '#FB923C', type: '浮岛雕塑', desc: '漂浮在星际里的温暖小驿站' },
          { name: '星核树摆件', color: '#39D6B0', type: '浮岛雕塑', desc: '7天签到大奖，汲取星空能量' },
        ];
        cosmetics.forEach((item, index) => {
          const col = index % 2;
          const row = Math.floor(index / 2);
          const x = -155 + col * 310;
          const y = 80 - row * 105;
          const card = this.createNode(`Cosmetic_${index}`, new Vec3(x, y, 0), contentArea);
          this.ensureTransform(card, 290, 88);
          const cg = card.addComponent(Graphics);
          cg.fillColor = this.hex(palette.panelSoft);
          ((cg.fillColor) as any).a = 230;
          cg.roundRect(-145, -44, 290, 88, 16);
          cg.fill();
          cg.strokeColor = this.hex(item.color);
          ((cg.strokeColor) as any).a = 180;
          cg.lineWidth = 1.6;
          cg.roundRect(-145, -44, 290, 88, 16);
          cg.stroke();

          // Glowing color jewel
          cg.fillColor = this.hex(item.color);
          cg.circle(-100, 0, 18);
          cg.fill();
          cg.strokeColor = this.hex('#FFFFFF');
          cg.lineWidth = 2.0;
          cg.circle(-100, 0, 18);
          cg.stroke();

          this.createLabel(card, 'Name', new Vec3(20, 14, 1), item.name, 19, '#FFFFFF', 180, 26);
          this.createLabel(card, 'Desc', new Vec3(20, -14, 1), item.desc, 13, palette.muted, 190, 20);
        });
      } else if (currentTab === 2) {
        // 3. 核心水晶与机制详情 (Interactive Crystal Inspector!)
        const crystals = [
          { name: '直线水晶', color: '#06B6D4', type: '基础传导', desc: '最基础的光路部件。沿入射方向单向穿透，将光束笔直导向前方。' },
          { name: '折角镜', color: '#10B981', type: '光线折射', desc: '光路拐弯必备。90° 直角改变流光方向，是破除死局的核心元件。' },
          { name: '十字水晶', color: '#60A5FA', type: '双向交叉', desc: '立交桥传导。垂直与水平双向互通，让两条不同光路同格交织通过。' },
          { name: '崩塌晶体', color: '#F59E0B', type: '脆弱结构', desc: '极度脆弱。流光首次穿透后立即碎裂崩塌，考验一次性路线规划！' },
          { name: '跃迁水晶', color: '#FB7185', type: '空间折跃', desc: '穿透虚空。触发瞬间让流光直接跨过前方 1 格障碍，传送至后方格。' },
          { name: '镜像水晶', color: '#C084FC', type: '路径复制', desc: '对称延展。放置时自动沿中心轴对称复制镜像水晶，效率翻倍。' },
          { name: '生长水晶', color: '#84CC16', type: '自动铺路', desc: '生命滋长。放置后自动向前延伸额外 1 格光路，补救断头路。' },
          { name: '黑洞水晶', color: '#F97316', type: '重整洗牌', desc: '虚空吞噬。放置后立刻吞噬回收当前所有手牌，全盘重新洗牌！' },
        ];

        // Top 8 Crystal Selector Chips (2 rows x 4 cols)
        crystals.forEach((c, index) => {
          const col = index % 4;
          const row = Math.floor(index / 4);
          const x = -225 + col * 150;
          const y = 135 - row * 58;
          const isSel = selectedCrystalIdx === index;
          const chip = this.createNode(`CrystalChip_${index}`, new Vec3(x, y, 0), contentArea);
          this.ensureTransform(chip, 140, 48);
          const cg = chip.addComponent(Graphics);
          cg.fillColor = this.hex(isSel ? '#1E293B' : '#0B1426');
          ((cg.fillColor) as any).a = 230;
          cg.roundRect(-70, -24, 140, 48, 14);
          cg.fill();
          cg.strokeColor = this.hex(isSel ? c.color : '#334155');
          cg.lineWidth = isSel ? 2.5 : 1.2;
          cg.roundRect(-70, -24, 140, 48, 14);
          cg.stroke();

          // Small crystal diamond icon
          cg.fillColor = this.hex(c.color);
          cg.moveTo(-48, 8);
          cg.lineTo(-40, 0);
          cg.lineTo(-48, -8);
          cg.lineTo(-56, 0);
          cg.close();
          cg.fill();

          this.createLabel(chip, 'Name', new Vec3(12, 1, 0), c.name, 16, isSel ? '#FFFFFF' : '#CBD5E1', 94, 26);

          this.addClick(chip, () => {
            selectedCrystalIdx = index;
            renderContent();
          });
        });

        // Bottom Detailed Crystal Inspector Box (ChatGPT 强烈要求的“增加水晶详情展示”)
        const selC = crystals[selectedCrystalIdx];
        const inspector = this.createNode('Inspector', new Vec3(0, -75, 0), contentArea);
        this.ensureTransform(inspector, 580, 170);
        const ig = inspector.addComponent(Graphics);
        ig.fillColor = this.hex(palette.panelSoft);
        ((ig.fillColor) as any).a = 240;
        ig.roundRect(-290, -85, 580, 170, 20);
        ig.fill();
        ig.strokeColor = this.hex(selC.color);
        ig.lineWidth = 2.0;
        ig.roundRect(-290, -85, 580, 170, 20);
        ig.stroke();

        // Large 3D crystal preview on left
        ig.fillColor = this.hex(selC.color);
        ig.moveTo(-210, 40);
        ig.lineTo(-170, 0);
        ig.lineTo(-210, -40);
        ig.lineTo(-250, 0);
        ig.close();
        ig.fill();
        ig.strokeColor = this.hex('#FFFFFF');
        ig.lineWidth = 2.4;
        ig.moveTo(-210, 40);
        ig.lineTo(-170, 0);
        ig.lineTo(-210, -40);
        ig.lineTo(-250, 0);
        ig.close();
        ig.stroke();

        this.createLabel(inspector, 'Title', new Vec3(35, 45, 1), `✦ ${selC.name} · ${selC.type} ✦`, 22, '#FFFFFF', 380, 32);
        this.createLabel(inspector, 'Desc', new Vec3(35, -5, 1), selC.desc, 16, '#E0F2FE', 380, 56);
        this.createLabel(inspector, 'Tip', new Vec3(35, -52, 1), '💡 战斗小贴士：局内轻点手中卡牌或棋盘地砖即可顺时针旋转90°', 14, '#FDE047', 400, 24);
      } else if (currentTab === 3) {
        // 4. 太空主题 (Themes)
        const themes = [
          { name: '极光冰原', desc: '静谧空灵的极光之海，默认解锁', col: '#29BDE0' },
          { name: '星港晨雾', desc: '穿梭于深空航道，300晶核解锁', col: '#818CF8' },
          { name: '日冕晨光', desc: '初升暖阳的金辉，500晶核解锁', col: '#FFD66B' },
        ];
        themes.forEach((th, index) => {
          const y = 80 - index * 95;
          const card = this.createNode(`ThemeCard_${index}`, new Vec3(0, y, 0), contentArea);
          this.ensureTransform(card, 560, 80);
          const cg = card.addComponent(Graphics);
          cg.fillColor = this.hex(palette.panelSoft);
          ((cg.fillColor) as any).a = 230;
          cg.roundRect(-280, -40, 560, 80, 18);
          cg.fill();
          cg.strokeColor = this.hex(th.col);
          cg.lineWidth = 1.8;
          cg.roundRect(-280, -40, 560, 80, 18);
          cg.stroke();

          cg.fillColor = this.hex(th.col);
          cg.circle(-220, 0, 18);
          cg.fill();

          this.createLabel(card, 'Title', new Vec3(-30, 12, 1), th.name, 20, '#FFFFFF', 300, 26);
          this.createLabel(card, 'Desc', new Vec3(-30, -14, 1), th.desc, 14, palette.muted, 320, 22);
          this.createLabel(card, 'Action', new Vec3(200, 0, 1), '前往切换 ❯', 16, th.col, 120, 26);

          this.addClick(card, () => {
            this.closePopup();
            if (this.onOpenSettingsCallback) this.onOpenSettingsCallback('theme');
          });
        });
      }
    };

    renderTabs();
    renderContent();
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

    const estBeat = profile.dailyChallengeDate === dateKey && profile.dailyChallengeBestMoves
      ? Math.min(99, Math.max(55, 96 - Math.max(0, profile.dailyChallengeBestMoves - 4) * 4))
      : 72;
    const selfMoves = profile.dailyChallengeDate === dateKey && profile.dailyChallengeBestMoves
      ? `今日 ${profile.dailyChallengeBestMoves} 步 · 超越 ${estBeat}% 玩家 · ${result.hintText}`
      : `今日全服通关率 ${estBeat}% · 同题比步数，越少越靠前`;
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

  private showWelfareCenter(initialTab = 0): void {
    if (!this.beginExclusivePopup() || !this.popupRoot) return;

    const palette = this.getPalette();
    this.createPopupOverlay(this.popupRoot, () => { this.closePopup(); }, 210);

    const dialogW = 630;
    const dialogH = 600;
    const halfDialogH = dialogH / 2;
    const dialog = this.createNode('WelfareDialog', new Vec3(0, -10, 0), this.popupRoot);
    this.ensureTransform(dialog, dialogW, dialogH);
    const dg = dialog.addComponent(Graphics);
    this.drawGlassPanel(dg, dialogW, dialogH, 30, palette.gold, palette.panel, 235, 2.2);
    dialog.on(Node.EventType.TOUCH_END, (e: EventTouch) => { e.propagationStopped = true; });

    this.createLabel(dialog, 'Title', new Vec3(0, halfDialogH - 38, 0), '福利与成长中心', 28, palette.text, 440, 40);
    this.createLabel(dialog, 'Sub', new Vec3(0, halfDialogH - 70, 0), '签到补能 · 荣誉成就 · 收集星空晶核', 15, palette.muted, 540, 24);

    const closeBtn = this.createNode('CloseBtn', new Vec3(dialogW / 2 - 38, halfDialogH - 38, 0), dialog);
    this.ensureTransform(closeBtn, 42, 42);
    const cg = closeBtn.addComponent(Graphics);
    cg.fillColor = this.colorWithAlpha(palette.panelSoft, 230);
    cg.circle(0, 0, 18);
    cg.fill();
    cg.strokeColor = this.colorWithAlpha(palette.gold, 180);
    cg.lineWidth = 1.6;
    cg.stroke();
    this.createLabel(closeBtn, 'Icon', new Vec3(0, 1, 0), '✕', 16, '#FFFFFF', 32, 32);
    this.addClick(closeBtn, () => { this.closePopup(); });

    let activeTab = initialTab; // 0: 每日签到 & 能量, 1: 荣誉勋章与成就

    const tabsBar = this.createNode('WelfareTabs', new Vec3(0, halfDialogH - 110, 0), dialog);
    this.ensureTransform(tabsBar, 580, 44);

    const contentArea = this.createNode('WelfareContent', new Vec3(0, -32, 0), dialog);
    this.ensureTransform(contentArea, 580, 420);

    const tabNames = ['每日签到 & 补给', '荣誉勋章与成就'];
    const tabXs = [-146, 146];

    const renderTabs = () => {
      tabsBar.destroyAllChildren();
      const profile = ProfileManager.getProfile();
      const hasDailyReward = !ProfileManager.isTodaySignedin();
      const hasAchievementReward = profile.levelProgress >= 1 && !ProfileManager.isAchievementClaimed('first_start');

      tabNames.forEach((name, idx) => {
        const isSel = activeTab === idx;
        const tabBtn = this.createNode(`Tab_${idx}`, new Vec3(tabXs[idx], 0, 0), tabsBar);
        this.ensureTransform(tabBtn, 280, 40);
        const tg = tabBtn.addComponent(Graphics);
        tg.fillColor = this.hex(isSel ? palette.panelSoft : '#0B1528');
        ((tg.fillColor) as any).a = isSel ? 240 : 160;
        tg.roundRect(-140, -20, 280, 40, 14);
        tg.fill();
        tg.strokeColor = this.hex(isSel ? palette.gold : '#1E293B');
        tg.lineWidth = isSel ? 2.2 : 1.2;
        tg.roundRect(-140, -20, 280, 40, 14);
        tg.stroke();

        this.createLabel(tabBtn, 'Text', new Vec3(0, 1, 0), name, 17, isSel ? '#FFFFFF' : palette.muted, 260, 28);

        const hasDot = (idx === 0 && (hasDailyReward || profile.energy < 10)) || (idx === 1 && hasAchievementReward);
        if (hasDot) {
          this.createRedDot(tabBtn, new Vec3(120, 12, 1));
        }

        this.addClick(tabBtn, () => {
          if (activeTab !== idx) {
            activeTab = idx;
            renderTabs();
            renderContent();
          }
        });
      });
    };

    const renderContent = () => {
      contentArea.destroyAllChildren();
      const profile = ProfileManager.getProfile();

      if (activeTab === 0) {
        // TAB 0: 每日签到 & 能量补给
        const nextDayIndex = Math.min(6, ProfileManager.getSigninDayIndex());
        const signedInToday = ProfileManager.isTodaySignedin();
        const claimedDays = profile.claimedSignins || [];
        const daysConfig = [
          { day: 1, reward: 50, label: '50 钻石', short: '50钻', fillEnergy: false, decorId: '' },
          { day: 2, reward: 80, label: '80 钻石', short: '80钻', fillEnergy: false, decorId: '' },
          { day: 3, reward: 120, label: '120 钻石', short: '120钻', fillEnergy: false, decorId: '' },
          { day: 4, reward: 0, label: '时空能量回满', short: '满能量', fillEnergy: true, decorId: '' },
          { day: 5, reward: 180, label: '180 钻石', short: '180钻', fillEnergy: false, decorId: '' },
          { day: 6, reward: 260, label: '260 钻石', short: '260钻', fillEnergy: false, decorId: '' },
          { day: 7, reward: 500, label: '500 钻石 + 星核树', short: '500钻+', fillEnergy: false, decorId: 'decor_star_tree' },
        ];

        // 7-day sign-in cards row (Y = 145)
        const cardW = 74;
        const cardH = 104;
        const gap = 8;
        const startX = -((daysConfig.length - 1) * (cardW + gap)) / 2;
        daysConfig.forEach((day, idx) => {
          const isClaimed = claimedDays.includes(idx);
          const isToday = idx === nextDayIndex && !signedInToday;
          const isNext = idx === nextDayIndex && signedInToday;
          const card = this.createNode(`SigninDay_${day.day}`, new Vec3(startX + idx * (cardW + gap), 145, 1), contentArea);
          this.ensureTransform(card, cardW, cardH);
          const cg = card.addComponent(Graphics);
          const isGrandPrize = !!day.decorId;
          const fill = isToday ? '#1A2942' : (isGrandPrize ? '#1E2538' : (isClaimed ? '#0A1324' : palette.panelSoft));
          const border = isToday || isGrandPrize ? palette.gold : (isClaimed ? '#38BDF8' : '#334155');
          cg.fillColor = this.colorWithAlpha(fill, isToday ? 245 : 196);
          cg.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 16);
          cg.fill();
          cg.strokeColor = this.colorWithAlpha(border, isToday || isGrandPrize ? 230 : 130);
          cg.lineWidth = isToday ? 2.5 : 1.3;
          cg.stroke();

          cg.fillColor = this.colorWithAlpha(isToday || isGrandPrize ? palette.gold : (isClaimed ? '#38BDF8' : '#475569'), isToday ? 255 : 210);
          cg.circle(0, 22, 16);
          cg.fill();
          this.createLabel(card, 'Day', new Vec3(0, 22, 1), isGrandPrize ? '★' : `${day.day}`, 17, isToday || isGrandPrize ? '#111827' : '#FFFFFF', 32, 28);
          this.createLabel(card, 'Reward', new Vec3(0, -12, 1), day.short, 14, isToday ? '#FFFBEB' : (isClaimed ? '#A5F3FC' : palette.muted), 68, 20);
          this.createLabel(card, 'State', new Vec3(0, -36, 1), isClaimed ? '已领' : (isToday ? '可领' : (isNext ? '明日' : '待解锁')), 13, isToday ? palette.gold : '#64748B', 68, 18);
        });

        // Signin CTA Button (Y = 64)
        const currentReward = daysConfig[nextDayIndex];
        const rewardText = currentReward.fillEnergy ? '满能量' : `${currentReward.reward} 钻石`;
        const btnText = signedInToday ? '今 日 已 签 到 (明 日 再 来)' : `立 即 领 取 今 日 签 到 (${rewardText})`;
        const signinBtn = this.createNode('SigninActionBtn', new Vec3(0, 64, 1), contentArea);
        this.ensureTransform(signinBtn, 460, 48);
        const sbg = signinBtn.addComponent(Graphics);
        sbg.fillColor = this.hex(signedInToday ? '#1E293B' : palette.gold);
        ((sbg.fillColor) as any).a = signedInToday ? 180 : 255;
        sbg.roundRect(-230, -24, 460, 48, 24);
        sbg.fill();
        sbg.strokeColor = this.hex(signedInToday ? '#475569' : '#FFFFFF');
        sbg.lineWidth = 1.6;
        sbg.stroke();
        this.createLabel(signinBtn, 'Text', new Vec3(0, 1, 1), btnText, 18, signedInToday ? '#94A3B8' : '#111827', 420, 30);
        this.addClick(signinBtn, () => {
          if (ProfileManager.isTodaySignedin()) {
            WeChatService.showToast('今天已经签到，明天继续连签', 'none');
            return;
          }
          const claimed = ProfileManager.claimDailySignin(nextDayIndex, currentReward.reward, currentReward.fillEnergy, currentReward.decorId);
          this.rebuildUI();
          renderTabs();
          renderContent();
          WeChatService.showToast(claimed ? `签到成功：${currentReward.label}` : '签到状态已更新', claimed ? 'success' : 'none');
        });

        // Middle Row: Daily Share bonus (Y = -8)
        const shareRow = this.createNode('ShareRow', new Vec3(0, -8, 1), contentArea);
        this.ensureTransform(shareRow, 560, 64);
        const srg = shareRow.addComponent(Graphics);
        srg.fillColor = this.hex(palette.panelSoft);
        ((srg.fillColor) as any).a = 210;
        srg.roundRect(-280, -32, 560, 64, 18);
        srg.fill();
        srg.strokeColor = this.hex('#39D6B0');
        srg.lineWidth = 1.4;
        srg.stroke();
        this.createLabel(shareRow, 'Title', new Vec3(-70, 10, 1), '每日好友分享好礼', 18, '#FFFFFF', 300, 24);
        const isSharedToday = profile.lastShareRewardDate === CloudGameService.getTodayKey();
        this.createLabel(shareRow, 'Sub', new Vec3(-70, -14, 1), isSharedToday ? '今日首分享已领 +60 💎' : '分享光路给好友，立即赠送 +60 💎 晶核', 14, isSharedToday ? '#6EE7B7' : palette.muted, 300, 20);

        const shareBtn = this.createNode('ShareBtn', new Vec3(200, 0, 1), shareRow);
        this.ensureTransform(shareBtn, 110, 40);
        const shg = shareBtn.addComponent(Graphics);
        shg.fillColor = this.hex(isSharedToday ? '#1E293B' : '#10B981');
        shg.roundRect(-55, -20, 110, 40, 14);
        shg.fill();
        this.createLabel(shareBtn, 'BtnText', new Vec3(0, 1, 1), isSharedToday ? '已领取' : '去分享', 16, '#FFFFFF', 100, 26);
        this.addClick(shareBtn, () => {
          ShareService.shareInvite();
          AnalyticsService.track('share_invite', { source: 'welfare_tab' });
          const claimed = ProfileManager.claimShareReward(CloudGameService.getTodayKey(), 60, 1);
          this.rebuildUI();
          renderTabs();
          renderContent();
          WeChatService.showToast(claimed ? '分享成功，赠送 +60 💎！' : '今日分享奖励已领过啦', claimed ? 'success' : 'none');
        });

        // Bottom Row: Energy Quick Replenish (Y = -86)
        const energyRow = this.createNode('EnergyRow', new Vec3(0, -86, 1), contentArea);
        this.ensureTransform(energyRow, 560, 64);
        const erg = energyRow.addComponent(Graphics);
        erg.fillColor = this.hex(palette.panelSoft);
        ((erg.fillColor) as any).a = 210;
        erg.roundRect(-280, -32, 560, 64, 18);
        erg.fill();
        erg.strokeColor = this.hex(palette.cyan);
        erg.lineWidth = 1.4;
        erg.stroke();
        this.createLabel(energyRow, 'Title', new Vec3(-70, 10, 1), `时空能量储备：${profile.energy}/10`, 18, '#FFFFFF', 300, 24);
        this.createLabel(energyRow, 'Sub', new Vec3(-70, -14, 1), profile.energy >= 10 ? '能量充盈，直接开启探险吧！' : '消耗 50 💎 立即回复满 10 点能量', 14, palette.muted, 300, 20);

        const energyBtn = this.createNode('EnergyBtn', new Vec3(200, 0, 1), energyRow);
        this.ensureTransform(energyBtn, 110, 40);
        const ebg = energyBtn.addComponent(Graphics);
        ebg.fillColor = this.hex(profile.energy >= 10 ? '#1E293B' : '#2563EB');
        ebg.roundRect(-55, -20, 110, 40, 14);
        ebg.fill();
        this.createLabel(energyBtn, 'BtnText', new Vec3(0, 1, 1), profile.energy >= 10 ? '已充沛' : '50钻补满', 16, '#FFFFFF', 100, 26);
        this.addClick(energyBtn, () => {
          if (profile.energy >= 10) {
            WeChatService.showToast('能量已满，直接开玩吧！', 'none');
            return;
          }
          if (profile.diamonds >= 50) {
            ProfileManager.addDiamonds(-50);
            ProfileManager.addEnergy(10);
            this.rebuildUI();
            renderTabs();
            renderContent();
            WeChatService.showToast('时空能量已回满！', 'success');
          } else {
            WeChatService.showToast('晶核不足 50，先去签到或通关领奖！', 'none');
          }
        });

      } else {
        // TAB 1: 荣誉勋章与成就
        const unlockedThemeCount = (profile.unlockedThemes || [0]).length;
        const bulletTimeUses = profile.bulletTimeUses || 0;
        const totalStars = profile.totalStars || 0;
        const endlessBestStage = profile.endlessBestStage || 0;

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

        achievements.forEach((ach, idx) => {
          const y = 145 - idx * 62;
          const row = this.createNode(`Achievement_${ach.id}`, new Vec3(0, y, 1), contentArea);
          this.ensureTransform(row, 560, 52);
          const rg = row.addComponent(Graphics);
          const border = ach.isClaimable ? palette.gold : (ach.isClaimed ? '#38BDF8' : '#334155');
          const fill = ach.isClaimable ? '#1D2A3B' : palette.panelSoft;
          rg.fillColor = this.colorWithAlpha(fill, ach.isClaimable ? 230 : 188);
          rg.roundRect(-280, -26, 560, 52, 16);
          rg.fill();
          rg.strokeColor = this.colorWithAlpha(border, ach.isClaimable ? 230 : 135);
          rg.lineWidth = ach.isClaimable ? 2.2 : 1.3;
          rg.stroke();

          rg.fillColor = this.colorWithAlpha(border, ach.isClaimable ? 255 : 180);
          rg.circle(-248, 0, 16);
          rg.fill();
          this.createLabel(row, 'Star', new Vec3(-248, 1, 1), '★', 16, '#111827', 28, 24);

          this.createLabel(row, 'Title', new Vec3(-95, 10, 1), ach.title, 18, palette.text, 220, 24);
          this.createLabel(row, 'Desc', new Vec3(-95, -12, 1), ach.desc, 14, palette.muted, 220, 20);

          const ratio = Math.max(0, Math.min(1, ach.current / ach.target));
          rg.fillColor = this.colorWithAlpha('#0B1026', 230);
          rg.roundRect(35, -15, 150, 10, 5);
          rg.fill();
          rg.fillColor = this.colorWithAlpha(ach.isClaimable ? palette.gold : '#12E8FF', ach.isClaimed ? 80 : 220);
          rg.roundRect(35, -15, Math.max(6, 150 * ratio), 10, 5);
          rg.fill();

          const state = ach.isClaimed ? '已领' : (ach.isClaimable ? `领 ${ach.reward}💎` : `${ach.current}/${ach.target}`);
          this.createLabel(row, 'State', new Vec3(228, 1, 1), state, 16, ach.isClaimable ? palette.gold : (ach.isClaimed ? '#64748B' : '#A5F3FC'), 90, 26);
        });

        // Batch Claim CTA (Y = -180)
        const btnText = totalUnclaimed > 0 ? `一 键 领 取 全 部 成 就 (${totalUnclaimed} 钻石)` : '所 有 成 就 已 领 取';
        const btnBgHex = totalUnclaimed > 0 ? palette.gold : '#1E293B';
        const batchBtn = this.createNode('BatchClaimBtn', new Vec3(0, -180, 1), contentArea);
        this.ensureTransform(batchBtn, 460, 48);
        const bbg = batchBtn.addComponent(Graphics);
        bbg.fillColor = this.hex(btnBgHex);
        ((bbg.fillColor) as any).a = totalUnclaimed > 0 ? 255 : 180;
        bbg.roundRect(-230, -24, 460, 48, 24);
        bbg.fill();
        bbg.strokeColor = this.hex(totalUnclaimed > 0 ? '#FFFFFF' : '#475569');
        bbg.lineWidth = 1.6;
        bbg.stroke();
        this.createLabel(batchBtn, 'Text', new Vec3(0, 1, 1), btnText, 18, totalUnclaimed > 0 ? '#111827' : '#94A3B8', 420, 30);
        this.addClick(batchBtn, () => {
          if (totalUnclaimed <= 0) {
            WeChatService.showToast('暂无未领取的成就奖励！', 'none');
            return;
          }
          const claimedAmount = ProfileManager.claimAchievements(claimableItems);
          this.rebuildUI();
          renderTabs();
          renderContent();
          WeChatService.showToast(`成功领取成就奖励 +${claimedAmount} 💎`, 'success');
        });
      }
    };

    renderTabs();
    renderContent();
    this.animatePopup(dialog);
  }

  private openDailySigninPopup(): void {
    this.showWelfareCenter(0);
  }

  private openAchievementPopup(): void {
    this.showWelfareCenter(1);
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
