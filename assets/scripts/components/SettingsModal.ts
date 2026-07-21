import { _decorator, Button, Color, Component, EventTouch, Graphics, Label, Layers, Node, UITransform, Vec3 } from 'cc';
import { ProfileManager } from '../core/ProfileManager';
import { WeChatService } from '../wx/WeChatService';
import { AnalyticsService } from '../wx/AnalyticsService';

const { ccclass } = _decorator;

@ccclass('SettingsModal')
export class SettingsModal extends Component {
  public onCloseCallback?: () => void;
  public onThemeChangedCallback?: (themeIndex: number) => void;
  public onPowerSaveChangedCallback?: (enabled: boolean) => void;

  private activeTab = 0; // 0: Theme, 1: Gameplay Rules, 2: About
  private selectedTheme = ProfileManager.getProfile().selectedTheme || 0; // 0: Icefield, 1: Violet Dusk, 2: Sunset Glow
  private bulletTimeSpeed = 1; // 0: Slow (25%), 1: Normal (50%), 2: Fast (100%)
  private selectedQuality = 2; // 0: Smooth, 1: Balanced, 2: HD
  private powerSaveMode = ProfileManager.isPowerSaveMode();

  private dialogNode: Node | null = null;
  private tabsRoot: Node | null = null;
  private contentRoot: Node | null = null;

  protected onLoad(): void {
    console.log('[FloatFlow] SettingsModal onLoad');
    this.node.layer = Layers.Enum.UI_2D;
    this.ensureTransform(this.node, 1280, 720);
    this.node.destroyAllChildren();

    // 1. Semi-transparent Backdrop Overlay
    const overlay = this.createNode('Overlay', new Vec3(0, 0, 0), this.node);
    this.ensureTransform(overlay, 1280, 720);
    const og = overlay.addComponent(Graphics);
    og.fillColor = new Color(5, 10, 25, 180);
    og.rect(-640, -360, 1280, 720);
    og.fill();
    this.addClick(overlay, () => {
      this.closeModal();
    });

    // 2. Main Glassmorphic Dialog Box (Size: 680 x 540)
    const dialog = this.createNode('DialogBox', new Vec3(0, 0, 0), this.node);
    this.ensureTransform(dialog, 680, 540);
    this.dialogNode = dialog;

    dialog.on(Node.EventType.TOUCH_END, (e: EventTouch) => {
      e.propagationStopped = true;
    });

    this.updateDialogStyle();

    // 3. Header & Close Button
    this.createHeader(dialog);

    // 4. Category Tabs (Y = 175)
    this.tabsRoot = this.createNode('TabsRoot', new Vec3(0, 175, 0), dialog);
    this.ensureTransform(this.tabsRoot, 600, 50);
    this.renderTabs();

    // 5. Dynamic Content Area (Y = -30)
    this.contentRoot = this.createNode('ContentRoot', new Vec3(0, -30, 0), dialog);
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

  private updateDialogStyle(): void {
    if (!this.dialogNode) return;
    let dg = this.dialogNode.getComponent(Graphics);
    if (!dg) dg = this.dialogNode.addComponent(Graphics);
    dg.clear();

    const isRose = this.selectedTheme === 1;
    const isGold = this.selectedTheme === 2;
    const borderCol = isRose ? '#A78BFA' : (isGold ? '#FCD34D' : '#3B82F6');

    dg.fillColor = this.hex('#0B132B');
    ((dg.fillColor) as ((any)) as any).a = 245;
    dg.roundRect(-340, -270, 680, 540, 24);
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
    this.createLabel(parent, 'Title', new Vec3(0, 225, 0), '⚙   设 置 与 帮 助', 30, '#FFFFFF', 400, 44);

    const closeBtn = this.createNode('CloseBtn', new Vec3(300, 225, 0), parent);
    this.ensureTransform(closeBtn, 44, 44);
    const cg = closeBtn.addComponent(Graphics);
    cg.fillColor = this.hex('#1E293B');
    cg.circle(0, 0, 18);
    cg.fill();
    const isRose = this.selectedTheme === 1;
    const isGold = this.selectedTheme === 2;
    cg.strokeColor = this.hex(isRose ? '#A78BFA' : (isGold ? '#FCD34D' : '#60A5FA'));
    cg.lineWidth = 1.8;
    cg.stroke();
    this.createLabel(closeBtn, 'Icon', new Vec3(0, 1, 0), '✖', 18, '#FFFFFF', 36, 36);

    this.addClick(closeBtn, () => {
      this.closeModal();
    });
  }

  private renderTabs(): void {
    if (!this.tabsRoot) return;
    this.tabsRoot.destroyAllChildren();

    const tabs = ['主 题', '玩 法', '关 于'];
    const tabXs = [-200, 0, 200];

    const isRose = this.selectedTheme === 1;
    const isGold = this.selectedTheme === 2;
    const activeBg = isRose ? '#581C87' : (isGold ? '#7C2D12' : '#2563EB');
    const activeBorder = isRose ? '#C4B5FD' : (isGold ? '#FBBF24' : '#00F0FF');

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
    this.createLabel(parent, 'SubTitle', new Vec3(-200, 140, 0), '✨ 选择宇宙背景主题与配色：', 19, '#93C5FD', 280, 32);

    const themes = [
      { name: '极光冰原', desc: '默认解锁', top: '#2563EB', side: '#1E3A8A', border: '#00F0FF', cost: 0 },
      { name: '暮色罗兰', desc: '300晶核解锁', top: '#7C3AED', side: '#581C87', border: '#C4B5FD', cost: 300 },
      { name: '落日余晖', desc: '分享/500晶核', top: '#C2410C', side: '#7C2D12', border: '#FBBF24', cost: 500 }
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
        const badge = this.createNode('Badge', new Vec3(65, 50, 0), card);
        this.ensureTransform(badge, 26, 26);
        const bg = badge.addComponent(Graphics);
        bg.fillColor = this.hex(th.border);
        bg.circle(0, 0, 12);
        bg.fill();
        this.createLabel(badge, 'Check', new Vec3(0, 1, 0), '✔', 14, '#000000', 24, 24);
      } else if (!isUnlocked) {
        const lock = this.createNode('LockBadge', new Vec3(65, 50, 0), card);
        this.ensureTransform(lock, 38, 24);
        const lg = lock.addComponent(Graphics);
        lg.fillColor = this.hex('#451A03');
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

    // Bullet Time Sensitivity Row Container (Y = -65)
    const btRow = this.createNode('BTRow', new Vec3(0, -65, 0), parent);
    this.ensureTransform(btRow, 580, 52);
    const btG = btRow.addComponent(Graphics);
    btG.fillColor = this.hex('#1E293B');
    ((btG.fillColor) as ((any)) as any).a = 150;
    btG.roundRect(-290, -26, 580, 52, 14);
    btG.fill();
    btG.strokeColor = this.hex('#334155');
    btG.lineWidth = 1.2;
    btG.stroke();

    this.createLabel(btRow, 'SliderLabel', new Vec3(-185, 0, 0), '子弹时间速率', 18, '#93C5FD', 160, 28);
    const speeds = ['慢速 (25%)', '适中 (50%)', '极速 (100%)'];
    const speedXs = [-40, 95, 230];
    speeds.forEach((sp, i) => {
      const isSel = this.bulletTimeSpeed === i;
      const btn = this.createNode(`Speed_${i}`, new Vec3(speedXs[i], 0, 0), btRow);
      this.ensureTransform(btn, 124, 40);
      const bg = btn.addComponent(Graphics);
      bg.fillColor = isSel ? this.hex('#2563EB') : this.hex('#0F172A');
      bg.roundRect(-62, -20, 124, 40, 12);
      bg.fill();
      bg.strokeColor = isSel ? this.hex('#00F0FF') : this.hex('#334155');
      bg.lineWidth = 1.5;
      bg.stroke();
      this.createLabel(btn, 'Text', new Vec3(0, 1, 0), sp, 16, isSel ? '#FFFFFF' : '#94A3B8', 118, 28);
      this.addClick(btn, () => {
        this.bulletTimeSpeed = i;
        this.renderContent();
      });
    });

    const qRow = this.createNode('QRow', new Vec3(0, -120, 0), parent);
    this.ensureTransform(qRow, 580, 48);
    const qG = qRow.addComponent(Graphics);
    qG.fillColor = this.hex('#1E293B');
    ((qG.fillColor) as ((any)) as any).a = 150;
    qG.roundRect(-290, -24, 580, 48, 14);
    qG.fill();
    qG.strokeColor = this.hex('#334155');
    qG.lineWidth = 1.2;
    qG.stroke();

    this.createLabel(qRow, 'QualityLabel', new Vec3(-185, 0, 0), '视网膜渲染画质', 18, '#93C5FD', 160, 28);
    const qualities = ['流畅 (60fps)', '均衡 (HD)', '极清 (Retina)'];
    qualities.forEach((q, i) => {
      const isSel = this.selectedQuality === i;
      const btn = this.createNode(`Qual_${i}`, new Vec3(speedXs[i], 0, 0), qRow);
      this.ensureTransform(btn, 124, 40);
      const bg = btn.addComponent(Graphics);
      bg.fillColor = isSel ? this.hex('#4C1D95') : this.hex('#0F172A');
      bg.roundRect(-62, -20, 124, 40, 12);
      bg.fill();
      bg.strokeColor = isSel ? this.hex('#E879F9') : this.hex('#334155');
      bg.lineWidth = 1.5;
      bg.stroke();
      this.createLabel(btn, 'Text', new Vec3(0, 1, 0), q, 16, isSel ? '#FFFFFF' : '#94A3B8', 118, 28);
      this.addClick(btn, () => {
        this.selectedQuality = i;
        if (i === 0 && !this.powerSaveMode) {
          this.powerSaveMode = true;
          ProfileManager.setPowerSaveMode(true);
          if (this.onPowerSaveChangedCallback) this.onPowerSaveChangedCallback(true);
        }
        this.renderContent();
      });
    });

    const pRow = this.createNode('PowerSaveRow', new Vec3(0, -176, 0), parent);
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

    this.createLabel(rulesBox, 'Title', new Vec3(0, 140, 0), '浮岛浮光 · 玩法速记', 25, '#FDE047', 540, 40);

    const rules = [
      '• 放置接光：拖拽/点击水晶，铺出从起点到终点的光路。',
      '• 子弹时间：光路卡住会减速，给你补路和调整的机会。',
      '• 撤回清盘：撤回退一步，清盘重拿手牌，救回死局。',
      '• 能量补给：闯关耗 1 能量，不够时到福利中心补满。'
    ];

    rules.forEach((r, idx) => {
      const y = 55 - idx * 64;
      const rNode = this.createNode(`Rule_${idx}`, new Vec3(0, y, 0), rulesBox);
      this.ensureTransform(rNode, 580, 60);
      const rg = rNode.addComponent(Graphics);
      rg.fillColor = this.hex('#0F172A');
      ((rg.fillColor) as any).a = 210;
      rg.roundRect(-280, -30, 560, 60, 14);
      rg.fill();
      this.createLabel(rNode, 'Text', new Vec3(-10, 0, 0), r, 19, '#E2E8F0', 560, 46);
    });
  }

  private renderAboutTab(parent: Node): void {
    const aboutBox = this.createNode('AboutBox', new Vec3(0, 20, 0), parent);
    this.ensureTransform(aboutBox, 580, 240);
    const g = aboutBox.addComponent(Graphics);
    g.fillColor = this.hex('#1E293B');
    ((g.fillColor) as any).a = 200;
    g.roundRect(-290, -120, 580, 240, 18);
    g.fill();
    g.strokeColor = this.hex('#60A5FA');
    g.lineWidth = 2;
    g.stroke();

    this.createLabel(aboutBox, 'Emblem', new Vec3(0, 75, 0), '浮 岛 浮 光 (Float & Flow)', 28, '#00F0FF', 500, 40);
    this.createLabel(aboutBox, 'Sub', new Vec3(0, 35, 0), '创意等距浮岛路线规划与流光引导解谜游戏', 18, '#93C5FD', 520, 30);
    this.createLabel(aboutBox, 'Ver', new Vec3(0, -10, 0), '当前版本: v1.0.0  |  Cocos 引擎开发', 16, '#CBD5E1', 500, 26);
    this.createLabel(aboutBox, 'Team', new Vec3(0, -45, 0), '核心特色: 唯美几何调色板 · 动态光路规划 · 极限子弹救场', 16, '#FDE047', 520, 26);
    this.createLabel(aboutBox, 'Copy', new Vec3(0, -80, 0), '© 2026 浮岛浮光 制作组. All Rights Reserved.', 15, '#64748B', 400, 22);

    const resetBtn = this.createNode('ResetBtn', new Vec3(0, -145, 0), parent);
    this.ensureTransform(resetBtn, 220, 46);
    const rg = resetBtn.addComponent(Graphics);
    rg.fillColor = this.hex('#3F1D2A');
    ((rg.fillColor) as any).a = 190;
    rg.roundRect(-110, -23, 220, 46, 16);
    rg.fill();
    rg.strokeColor = this.hex('#7F1D1D');
    rg.lineWidth = 1.6;
    rg.stroke();
    this.createLabel(resetBtn, 'Text', new Vec3(0, 1, 0), '重置进度', 18, '#FCA5A5', 180, 32);

    this.addClick(resetBtn, () => {
      console.log('[SettingsModal] Clicked Reset Progress!');
      this.closeModal();
    });
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
