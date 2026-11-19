import { _decorator, Button, Color, Component, EventTouch, Graphics, Label, Layers, Node, UITransform, Vec3, view } from 'cc';
import { ProfileManager } from '../core/ProfileManager';
import { WeChatService } from '../wx/WeChatService';
import { AnalyticsService } from '../wx/AnalyticsService';
import { getUiPalette } from '../ui/UiTheme';

const { ccclass } = _decorator;

@ccclass('SettingsModal')
export class SettingsModal extends Component {
  public onCloseCallback?: () => void;
  public onThemeChangedCallback?: (themeIndex: number) => void;
  public onPowerSaveChangedCallback?: (enabled: boolean) => void;

  private activeTab = 0; // 0: Theme, 1: Gameplay Rules, 2: About
  private entryMode: 'settings' | 'theme' = 'theme';
  private selectedTheme = ProfileManager.getProfile().selectedTheme || 0; // 0: Icefield, 1: Starport Mist, 2: Corona Dawn
  private powerSaveMode = ProfileManager.isPowerSaveMode();

  private dialogNode: Node | null = null;
  private tabsRoot: Node | null = null;
  private contentRoot: Node | null = null;
  private titleLabel: Label | null = null;

  protected onLoad(): void {
    console.log('[FloatFlow] SettingsModal onLoad');
    this.node.layer = Layers.Enum.UI_2D;
    this.ensureTransform(this.node, 1280, 720);
    this.node.destroyAllChildren();

    // 1. Semi-transparent Backdrop Overlay
    const overlay = this.createNode('Overlay', new Vec3(0, 0, 0), this.node);
    const overlaySize = view.getVisibleSize();
    this.ensureTransform(overlay, overlaySize.width, overlaySize.height);
    const og = overlay.addComponent(Graphics);
    og.fillColor = new Color(5, 10, 25, 180);
    og.rect(-overlaySize.width / 2, -overlaySize.height / 2, overlaySize.width, overlaySize.height);
    og.fill();
    this.addClick(overlay, () => {
      this.closeModal();
    });

    // 2. Main Glassmorphic Dialog Box (Size: 680 x 500)
    const dialog = this.createNode('DialogBox', new Vec3(0, 0, 0), this.node);
    this.ensureTransform(dialog, 680, 500);
    this.dialogNode = dialog;

    dialog.on(Node.EventType.TOUCH_END, (e: EventTouch) => {
      e.propagationStopped = true;
    });

    this.updateDialogStyle();

    // 3. Header & Close Button
    this.createHeader(dialog);

    // 4. Category Tabs (Y = 155)
    this.tabsRoot = this.createNode('TabsRoot', new Vec3(0, 155, 0), dialog);
    this.ensureTransform(this.tabsRoot, 600, 50);
    this.renderTabs();

    // 5. Dynamic Content Area (Y = -42)
    this.contentRoot = this.createNode('ContentRoot', new Vec3(0, -42, 0), dialog);
    this.ensureTransform(this.contentRoot, 620, 360);
    this.renderContent();
  }

  public applyTheme(themeIdx: number): void {
    console.log(`[SettingsModal] Apply Theme Index ${themeIdx}`);
    this.selectedTheme = themeIdx;
    this.updateDialogStyle();
    if (this.tabsRoot) this.renderTabs();
    if (this.contentRoot) this.renderContent();
  }

  public openAs(mode: 'settings' | 'theme'): void {
    this.entryMode = mode;
    this.activeTab = mode === 'theme' ? 0 : 1;
    this.updateHeaderTitle();
    if (this.tabsRoot) this.renderTabs();
    if (this.contentRoot) this.renderContent();
  }

  private updateDialogStyle(): void {
    if (!this.dialogNode) return;
    let dg = this.dialogNode.getComponent(Graphics);
    if (!dg) dg = this.dialogNode.addComponent(Graphics);
    dg.clear();

    const palette = getUiPalette(this.selectedTheme);
    const borderCol = this.selectedTheme === 2 ? palette.gold : palette.cyan;

    dg.fillColor = this.hex(palette.panel);
    ((dg.fillColor) as ((any)) as any).a = 245;
    dg.roundRect(-340, -250, 680, 500, 24);
    dg.fill();
    dg.strokeColor = this.hex(borderCol);
    dg.lineWidth = 2.5;
    dg.stroke();
  }

  private addClick(node: Node, onClick: () => void): void {
    let btn = node.getComponent(Button);
    if (!btn) btn = node.addComponent(Button);
    btn.transition = Button.Transition.SCALE;
    btn.zoomScale = 0.92;
    node.off(Button.EventType.CLICK);
    node.on(Button.EventType.CLICK, onClick, this);
  }

  private closeModal(): void {
    console.log('[SettingsModal] Close');
    this.node.active = false;
    if (this.onCloseCallback) this.onCloseCallback();
  }

  private createHeader(parent: Node): void {
    this.titleLabel = this.createLabel(parent, 'Title', new Vec3(0, 205, 0), this.getHeaderTitle(), 30, '#FFFFFF', 400, 44);

    const closeBtn = this.createNode('CloseBtn', new Vec3(300, 205, 0), parent);
    this.ensureTransform(closeBtn, 44, 44);
    const cg = closeBtn.addComponent(Graphics);
    cg.fillColor = this.hex('#1E293B');
    cg.circle(0, 0, 18);
    cg.fill();
    const palette = getUiPalette(this.selectedTheme);
    cg.strokeColor = this.hex(this.selectedTheme === 2 ? palette.gold : palette.cyan);
    cg.lineWidth = 1.8;
    cg.stroke();
    this.createLabel(closeBtn, 'Icon', new Vec3(0, 1, 0), '✖', 18, '#FFFFFF', 36, 36);

    this.addClick(closeBtn, () => {
      this.closeModal();
    });
  }

  private getHeaderTitle(): string {
    return this.entryMode === 'theme' ? '主 题 馆' : '设 置 与 帮 助';
  }

  private updateHeaderTitle(): void {
    if (this.titleLabel) {
      this.titleLabel.string = this.getHeaderTitle();
    }
  }

  private renderTabs(): void {
    if (!this.tabsRoot) return;
    this.tabsRoot.destroyAllChildren();

    const tabs = ['主 题', '玩 法', '关 于'];
    const tabXs = [-200, 0, 200];

    const palette = getUiPalette(this.selectedTheme);
    const activeBg = palette.panelSoft;
    const activeBorder = this.selectedTheme === 2 ? palette.gold : palette.cyan;

    tabs.forEach((name, idx) => {
      const isSelected = this.activeTab === idx;
      const tabNode = this.createNode(`Tab_${idx}`, new Vec3(tabXs[idx], 0, 0), this.tabsRoot!);
      this.ensureTransform(tabNode, 180, 50);

      const g = tabNode.addComponent(Graphics);
      if (isSelected) {
        g.fillColor = this.hex(activeBg);
        g.roundRect(-90, -25, 180, 50, 16);
        g.fill();
        g.strokeColor = this.hex(activeBorder);
        g.lineWidth = 2;
        g.stroke();
      } else {
        g.fillColor = this.hex('#1E293B');
        ((g.fillColor) as ((any)) as any).a = 180;
        g.roundRect(-90, -25, 180, 50, 16);
        g.fill();
        g.strokeColor = this.hex('#334155');
        g.lineWidth = 1.5;
        g.stroke();
      }

      this.createLabel(tabNode, 'Text', new Vec3(0, 1, 0), name, 21, isSelected ? '#FFFFFF' : '#94A3B8', 170, 36);

      this.addClick(tabNode, () => {
        if (this.activeTab !== idx) {
          console.log(`[SettingsModal] Switch tab to ${name}`);
          this.activeTab = idx;
          this.renderTabs();
          this.renderContent();
        }
      });
    });
  }

  private renderContent(): void {
    if (!this.contentRoot) return;
    this.contentRoot.destroyAllChildren();

    if (this.activeTab === 0) {
      this.renderThemeTab(this.contentRoot);
    } else if (this.activeTab === 1) {
      this.renderGameplayRulesTab(this.contentRoot);
    } else if (this.activeTab === 2) {
      this.renderAboutTab(this.contentRoot);
    }
  }

  private renderThemeTab(parent: Node): void {
    const palette = getUiPalette(this.selectedTheme);
    this.createLabel(parent, 'SubTitle', new Vec3(-200, 140, 0), '选择宇宙背景主题与配色：', 19, palette.cyan, 280, 32);

    const themes = [
      { name: '极光冰原', desc: '默认解锁', top: '#22D3EE', side: '#1E3A8A', border: '#67E8F9', cost: 0 },
      { name: '星港晨雾', desc: '300晶核解锁', top: '#3D7DDE', side: '#13233F', border: '#5DE6FF', cost: 300 },
      { name: '日冕晨光', desc: '分享/500晶核', top: '#5DE6D6', side: '#1D2A3B', border: '#FFD76A', cost: 500 }
    ];

    const cardXs = [-200, 0, 200];
    themes.forEach((th, idx) => {
      const isSelected = this.selectedTheme === idx;
      const isUnlocked = ProfileManager.isThemeUnlocked(idx);
      const card = this.createNode(`Theme_${idx}`, new Vec3(cardXs[idx], 40, 0), parent);
      this.ensureTransform(card, 170, 140);

      const g = card.addComponent(Graphics);
      g.fillColor = this.hex('#1E293B');
      ((g.fillColor) as ((any)) as any).a = 230;
      g.roundRect(-85, -70, 170, 140, 16);
      g.fill();
      g.strokeColor = isSelected ? this.hex(th.border) : (isUnlocked ? this.hex('#334155') : this.hex('#64748B'));
      g.lineWidth = isSelected ? 3 : 1.5;
      g.stroke();

      // Draw 3D isometric mini cube
      this.drawIsometricBlock(g, this.hex(th.top), this.hex(th.side), this.hex('#0F172A'), this.hex(th.border), 1.5, 12, 48, 28, 15, 0);

      this.createLabel(card, 'Name', new Vec3(0, -25, 0), th.name, 21, isSelected ? '#FFFFFF' : (isUnlocked ? '#CBD5E1' : '#94A3B8'), 150, 28);
      this.createLabel(card, 'Desc', new Vec3(0, -49, 0), isUnlocked ? th.desc : `解锁 ${th.cost}💎`, 15, isUnlocked ? '#64748B' : '#FDE047', 150, 22);

      if (isSelected) {
        const badge = this.createNode('Badge', new Vec3(46, 50, 0), card);
        this.ensureTransform(badge, 64, 24);
        const bg = badge.addComponent(Graphics);
        bg.fillColor = this.hex(th.border);
        bg.roundRect(-32, -12, 64, 24, 12);
        bg.fill();
        this.createLabel(badge, 'Check', new Vec3(0, 1, 0), '已启用', 12, '#06111F', 58, 20);
      } else if (!isUnlocked) {
        const lock = this.createNode('LockBadge', new Vec3(65, 50, 0), card);
        this.ensureTransform(lock, 38, 24);
        const lg = lock.addComponent(Graphics);
        lg.fillColor = this.hex('#1D2A3B');
        lg.roundRect(-19, -12, 38, 24, 10);
        lg.fill();
        lg.strokeColor = this.hex('#FDE047');
        lg.lineWidth = 1.3;
        lg.stroke();
        this.createLabel(lock, 'Lock', new Vec3(0, 1, 0), '锁', 13, '#FDE047', 30, 18);
      }

      this.addClick(card, () => {
        if (!ProfileManager.isThemeUnlocked(idx)) {
          if (!ProfileManager.unlockTheme(idx, th.cost)) {
            WeChatService.showToast(`晶核不足，还差 ${Math.max(0, th.cost - ProfileManager.getProfile().diamonds)} 💎`, 'none');
            return;
          }
          AnalyticsService.track('theme_unlock', { theme: idx, cost: th.cost });
          WeChatService.showToast(`${th.name} 已解锁！`, 'success');
        }
        if (this.selectedTheme !== idx) {
          console.log(`[SettingsModal] Selected Theme ${th.name}`);
          this.selectedTheme = idx;
          ProfileManager.setSelectedTheme(idx);
          AnalyticsService.track('theme_apply', { theme: idx });
          this.updateDialogStyle();
          this.renderTabs();
          this.renderContent();
          if (this.onThemeChangedCallback) {
            this.onThemeChangedCallback(idx);
          }
        }
      });
    });

    const pRow = this.createNode('PowerSaveRow', new Vec3(0, -90, 0), parent);
    this.ensureTransform(pRow, 580, 48);
    const pG = pRow.addComponent(Graphics);
    pG.fillColor = this.hex(this.powerSaveMode ? '#14532D' : '#1E293B');
    ((pG.fillColor) as any).a = this.powerSaveMode ? 210 : 150;
    pG.roundRect(-290, -24, 580, 48, 14);
    pG.fill();
    pG.strokeColor = this.hex(this.powerSaveMode ? '#86EFAC' : '#334155');
    pG.lineWidth = 1.5;
    pG.stroke();

    this.createLabel(pRow, 'PowerLabel', new Vec3(-172, 0, 0), '省电流畅模式', 18, '#93C5FD', 170, 28);
    this.createLabel(pRow, 'PowerDesc', new Vec3(35, 0, 0), this.powerSaveMode ? '已减少粒子/辉光/循环动效' : '低配安卓建议开启', 15, this.powerSaveMode ? '#BBF7D0' : '#94A3B8', 240, 26);
    const toggle = this.createNode('PowerToggle', new Vec3(236, 0, 0), pRow);
    this.ensureTransform(toggle, 78, 34);
    const tg = toggle.addComponent(Graphics);
    tg.fillColor = this.hex(this.powerSaveMode ? '#10B981' : '#334155');
    tg.roundRect(-39, -17, 78, 34, 17);
    tg.fill();
    tg.fillColor = this.hex('#FFFFFF');
    tg.circle(this.powerSaveMode ? 20 : -20, 0, 13);
    tg.fill();
    this.addClick(pRow, () => {
      this.powerSaveMode = !this.powerSaveMode;
      ProfileManager.setPowerSaveMode(this.powerSaveMode);
      if (this.onPowerSaveChangedCallback) this.onPowerSaveChangedCallback(this.powerSaveMode);
      this.renderContent();
    });

    this.createLabel(parent, 'ThemeNote', new Vec3(0, -144, 0), '主题只改变视觉氛围，不影响关卡难度与数值。', 14, palette.muted, 560, 24);
  }

  private renderGameplayRulesTab(parent: Node): void {
    const rulesBox = this.createNode('RulesBox', new Vec3(0, 0, 0), parent);
    this.ensureTransform(rulesBox, 620, 340);
    const g = rulesBox.addComponent(Graphics);
    g.fillColor = this.hex('#1E293B');
    ((g.fillColor) as any).a = 180;
    g.roundRect(-310, -170, 620, 340, 20);
    g.fill();
    g.strokeColor = this.hex('#3B82F6');
    g.lineWidth = 2.0;
    g.stroke();

    this.createLabel(rulesBox, 'Title', new Vec3(0, 140, 0), '浮岛流光 · 玩法速记', 26, '#FDE047', 540, 40);

    const rules = [
      { tag: '放置接光', desc: '拖拽或点击手牌铺设，连接起点与终点光路。', color: '#38BDF8' },
      { tag: '指哪转哪', desc: '轻点手中卡牌或棋盘已放地砖，直接原地旋转 90°！', color: '#34D399' },
      { tag: '子弹时间', desc: '流光跑动时拖起手牌触发减速，争取关键补路时间。', color: '#FDE047' },
      { tag: '撤回重置', desc: '撤回退一步，重置清盘重拿手牌，随时救回死局。', color: '#F472B6' }
    ];

    rules.forEach((r, idx) => {
      const y = 60 - idx * 64;
      const rNode = this.createNode(`Rule_${idx}`, new Vec3(0, y, 0), rulesBox);
      this.ensureTransform(rNode, 580, 56);
      const rg = rNode.addComponent(Graphics);
      rg.fillColor = this.hex('#0F172A');
      ((rg.fillColor) as any).a = 220;
      rg.roundRect(-280, -28, 560, 56, 14);
      rg.fill();
      rg.strokeColor = this.hex(r.color);
      ((rg.strokeColor) as any).a = 150;
      rg.lineWidth = 1.4;
      rg.roundRect(-280, -28, 560, 56, 14);
      rg.stroke();

      // Colored tag badge
      const tagBg = this.createNode('Tag', new Vec3(-215, 0, 1), rNode);
      this.ensureTransform(tagBg, 96, 32);
      const tg = tagBg.addComponent(Graphics);
      tg.fillColor = this.hex(r.color);
      ((tg.fillColor) as any).a = 45;
      tg.roundRect(-48, -16, 96, 32, 10);
      tg.fill();
      tg.strokeColor = this.hex(r.color);
      tg.lineWidth = 1.4;
      tg.roundRect(-48, -16, 96, 32, 10);
      tg.stroke();
      this.createLabel(tagBg, 'Text', new Vec3(0, 1, 0), r.tag, 16, r.color, 90, 26);

      this.createLabel(rNode, 'Text', new Vec3(50, 0, 0), r.desc, 17, '#E2E8F0', 430, 36);
    });
  }

  private renderAboutTab(parent: Node): void {
    const aboutBox = this.createNode('AboutBox', new Vec3(0, 15, 0), parent);
    this.ensureTransform(aboutBox, 580, 280);
    const g = aboutBox.addComponent(Graphics);
    g.fillColor = this.hex('#1E293B');
    ((g.fillColor) as any).a = 200;
    g.roundRect(-290, -140, 580, 280, 18);
    g.fill();
    g.strokeColor = this.hex('#60A5FA');
    g.lineWidth = 2;
    g.stroke();

    this.createLabel(aboutBox, 'Emblem', new Vec3(0, 98, 0), '浮 岛 浮 光 (Float & Flow)', 28, '#00F0FF', 500, 38);
    this.createLabel(aboutBox, 'Sub', new Vec3(0, 62, 0), '创意等距浮岛路线规划与流光引导解谜游戏', 17, '#93C5FD', 520, 26);
    this.createLabel(aboutBox, 'Ver', new Vec3(0, 28, 0), 'HAMITU GAMES · 哈密兔独立工作室 诚意出品', 16, '#FDE047', 500, 24);

    // Cross-promotion button to Zhenxian
    const promoBtn = this.createNode('PromoBtn', new Vec3(0, -12, 1), aboutBox);
    this.ensureTransform(promoBtn, 480, 42);
    const pg = promoBtn.addComponent(Graphics);
    pg.fillColor = this.hex('#0F2847');
    pg.roundRect(-240, -21, 480, 42, 21);
    pg.fill();
    pg.strokeColor = this.hex('#29BDE0');
    pg.lineWidth = 1.4;
    pg.roundRect(-240, -21, 480, 42, 21);
    pg.stroke();
    this.createLabel(promoBtn, 'Text', new Vec3(0, 1, 0), '🐰 更多好玩 · 体验哈密兔新作《穿针引线》➔', 16, '#A5F3FC', 460, 28);
    this.addClick(promoBtn, () => {
      WeChatService.vibrateShort('medium');
      WeChatService.openMiniProgram('wxe9f9a64cf4c28136', '', '正在前往《穿针引线》...');
    });

    // 健康游戏忠告框
    const healthBox = this.createNode('HealthNotice', new Vec3(0, -82, 1), aboutBox);
    this.ensureTransform(healthBox, 540, 56);
    const hg = healthBox.addComponent(Graphics);
    hg.fillColor = this.hex('#064E3B');
    ((hg.fillColor) as any).a = 180;
    hg.roundRect(-270, -28, 540, 56, 12);
    hg.fill();
    hg.strokeColor = this.hex('#34D399');
    hg.lineWidth = 1.4;
    hg.roundRect(-270, -28, 540, 56, 12);
    hg.stroke();
    this.createLabel(healthBox, 'HTitle', new Vec3(0, 10, 1), '健康游戏忠告', 15, '#A7F3D0', 500, 20);
    this.createLabel(healthBox, 'HBody', new Vec3(0, -11, 1), '抵制不良游戏，拒绝盗版。适度益脑，沉迷伤身。合理安排时间，享受健康生活。', 13, '#E6FFFA', 530, 18);
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
