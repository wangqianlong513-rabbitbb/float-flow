import { _decorator, Button, Color, Component, EventTouch, Graphics, Label, Layers, Node, tween, UITransform, Vec3, view } from 'cc';
import { WeChatService } from '../wx/WeChatService';
import { ProfileManager } from '../core/ProfileManager';

declare const wx: any;

const { ccclass } = _decorator;

@ccclass('LevelSelect')
export class LevelSelect extends Component {
  public onSelectLevelCallback?: (levelIndex: number) => void;
  public onReturnHomeCallback?: () => void;
  public onStartEndlessCallback?: () => void;

  private currentChapter = 0; // 0 = Chapter 1 (1-10), 1 = Chapter 2 (11-20)
  private gridRoot: Node | null = null;
  private tabsRoot: Node | null = null;
  private currentTheme = 0; // 0: Icefield, 1: Violet Dusk, 2: Sunset Glow

  protected onLoad(): void {
    console.log('[FloatFlow] LevelSelect onLoad');
    this.node.layer = Layers.Enum.UI_2D;
    const vs = view.getVisibleSize();
    this.ensureTransform(this.node, vs.width, vs.height);
    this.rebuildUI();
  }

  public applyTheme(themeIdx: number): void {
    console.log(`[LevelSelect] Apply Theme Index ${themeIdx}`);
    this.currentTheme = themeIdx;
    this.rebuildUI();
  }

  private getBounds(): { halfW: number; halfH: number } {
    const size = view.getVisibleSize();
    let halfW = size.width / 2;
    let halfH = size.height / 2;
    if (halfW < 300 || isNaN(halfW)) halfW = 360;
    if (halfH < 600 || isNaN(halfH)) halfH = 779;
    return { halfW, halfH };
  }

  private rebuildUI(): void {
    this.node.destroyAllChildren();
    const { halfW, halfH } = this.getBounds();

    // 1. Top Navigation Bar (Moved safely to Y = halfH - 125 for iOS notch / capsule safety)
    this.createTopNav(halfH);

    // 2. Chapter & Mode Tabs (Y = halfH * 0.68)
    this.tabsRoot = this.createNode('TabsRoot', new Vec3(0, halfH * 0.68, 0), this.node);
    this.ensureTransform(this.tabsRoot, 700, 60);
    this.renderTabs();

    // 3. 20-Level Isometric Grid Container (下移至 Y = -90，配合更大卡片间距填充满整个列表区域！)
    this.gridRoot = this.createNode('GridRoot', new Vec3(0, -90, 0), this.node);
    this.ensureTransform(this.gridRoot, 700, 1150);
    this.renderGrid(this.currentChapter);

    // 4. Bottom Progress Banner & Quick Launch Footer (Y = -halfH + 65)
    this.createFooter(halfH);
  }

  private addClick(node: Node, onClick: () => void): void {
    let btn = node.getComponent(Button);
    if (!btn) btn = node.addComponent(Button);
    btn.transition = Button.Transition.SCALE;
    btn.zoomScale = 0.92;
    node.off(Button.EventType.CLICK);
    node.on(Button.EventType.CLICK, onClick, this);
  }

  public render(): void {
    this.renderTabs();
    this.renderGrid(this.currentChapter);
  }

  private renderTabs(): void {
    if (!this.tabsRoot) return;
    this.tabsRoot.destroyAllChildren();

    const tabs = [
      { name: '极光冰原 (1-10)', idx: 0, isEndless: false },
      { name: '暮色时空 (11-20)', idx: 1, isEndless: false },
      { name: '★ 流光无尽模式', idx: 2, isEndless: true }
    ];

    const isRose = this.currentTheme === 1;
    const isGold = this.currentTheme === 2;
    const activeBg = isRose ? '#581C87' : (isGold ? '#7C2D12' : '#2563EB');
    const activeBorder = isRose ? '#C4B5FD' : (isGold ? '#FBBF24' : '#00F0FF');

    const tabXs = [-246, 0, 246];
    tabs.forEach((tab, i) => {
      const isSelected = !tab.isEndless && this.currentChapter === tab.idx;
      const tabNode = this.createNode(`Tab_${i}`, new Vec3(tabXs[i], 0, 0), this.tabsRoot!);
      this.ensureTransform(tabNode, 240, 56);

      const g = tabNode.addComponent(Graphics);
      if (isSelected) {
        g.fillColor = this.hex(activeBg);
        ((g.fillColor) as any).a = 245;
        g.roundRect(-120, -28, 240, 56, 18);
        g.fill();
        g.strokeColor = this.hex(activeBorder);
        g.lineWidth = 3.0;
        g.stroke();
      } else if (tab.isEndless) {
        g.fillColor = this.hex(isRose ? '#3B0764' : (isGold ? '#451A03' : '#4C1D95'));
        ((g.fillColor) as any).a = 220;
        g.roundRect(-120, -28, 240, 56, 18);
        g.fill();
        g.strokeColor = this.hex(isRose ? '#A78BFA' : (isGold ? '#FCD34D' : '#A78BFA'));
        g.lineWidth = 2.4;
        g.stroke();
      } else {
        g.fillColor = this.hex('#0F172A');
        ((g.fillColor) as any).a = 220;
        g.roundRect(-120, -28, 240, 56, 18);
        g.fill();
        g.strokeColor = this.hex('#334155');
        g.lineWidth = 2.0;
        g.stroke();
      }

      const textColor = isSelected ? '#FFFFFF' : (tab.isEndless ? (isGold ? '#FDE047' : '#F472B6') : '#CBD5E1');
      this.createLabel(tabNode, 'Text', new Vec3(0, 1, 0), tab.name, 19, textColor, 230, 36);

      this.addClick(tabNode, () => {
        if (tab.isEndless) {
          console.log('[LevelSelect] Start Endless Mode');
          if (this.onStartEndlessCallback) this.onStartEndlessCallback();
        } else {
          console.log(`[LevelSelect] Switch Chapter to ${tab.idx}`);
          this.currentChapter = tab.idx;
          this.renderTabs();
          this.renderGrid(this.currentChapter);
        }
      });
    });
  }

  private renderGrid(chapter: number): void {
    if (!this.gridRoot) return;
    this.gridRoot.destroyAllChildren();

    const isRose = this.currentTheme === 1;
    const isGold = this.currentTheme === 2;
    const activeBorder = isRose ? '#A78BFA' : (isGold ? '#FCD34D' : '#FDE047');
    const compBorder = isRose ? '#C4B5FD' : (isGold ? '#FBBF24' : '#00F0FF');

    const { halfH } = this.getBounds();
    const colXs = [-176, 176];
    const spacing = 228;
    const rowYs = [spacing * 2, spacing, 0, -spacing, -spacing * 2];

    const startIdx = chapter * 10;

    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 2; c++) {
        const localIdx = r * 2 + c;
        const globalIdx = startIdx + localIdx;
        const levelNum = globalIdx + 1;

        const profile = ProfileManager.getProfile();
        let status: 'COMPLETED' | 'ACTIVE' | 'LOCKED' = 'LOCKED';
        let stars = 0;

        if (globalIdx < profile.levelProgress) {
          status = 'COMPLETED';
          stars = 3;
        } else if (globalIdx === profile.levelProgress) {
          status = 'ACTIVE';
        } else {
          status = 'LOCKED';
        }

        const card = this.createNode(`LevelCard_${levelNum}`, new Vec3(colXs[c], rowYs[r], 0), this.gridRoot!);
        this.ensureTransform(card, 340, 196);

        const g = card.addComponent(Graphics);
        if (status === 'LOCKED') {
          g.fillColor = this.hex('#060912');
          ((g.fillColor) as any).a = 140;
          g.roundRect(-170, -98, 340, 196, 26);
          g.fill();
          g.strokeColor = this.hex('#1E293B');
          g.lineWidth = 1.8;
          g.stroke();
        } else if (status === 'ACTIVE') {
          // 优化：当前进行中的关卡给予极高亮度、双重金青霓虹流光边框、微光背景与呼吸灯脉冲特效！
          g.fillColor = this.hex('#0D162C');
          ((g.fillColor) as any).a = 250;
          g.roundRect(-170, -98, 340, 196, 26);
          g.fill();
          // Active level inner gold aura
          g.fillColor = new Color(253, 224, 71, 32);
          g.roundRect(-165, -93, 330, 186, 22);
          g.fill();
          // Top Cyber Header Banner for ACTIVE card
          g.fillColor = this.hex('#F59E0B');
          g.roundRect(-170, 68, 340, 30, 14);
          g.fill();

          g.strokeColor = this.hex(activeBorder);
          g.lineWidth = 4.5;
          g.stroke();

          tween(card)
            .to(1.4, { scale: new Vec3(1.038, 1.038, 1) }, { easing: 'sineInOut' })
            .to(1.4, { scale: new Vec3(1.0, 1.0, 1) }, { easing: 'sineInOut' })
            .union()
            .repeatForever()
            .start();
        } else {
          g.fillColor = this.hex('#0D162C');
          ((g.fillColor) as any).a = 236;
          g.roundRect(-170, -98, 340, 196, 26);
          g.fill();
          // Completed top accent banner
          g.fillColor = this.hex('#1E3A8A');
          g.roundRect(-170, 68, 340, 30, 14);
          g.fill();

          g.strokeColor = this.hex(compBorder);
          g.lineWidth = 2.8;
          g.stroke();
        }

        const numStr = levelNum < 10 ? `0${levelNum}` : `${levelNum}`;
        const numColor = status === 'LOCKED' ? '#334155' : (status === 'ACTIVE' ? activeBorder : '#FFFFFF');
        this.createLabel(card, 'Num', new Vec3(-126, 48, 0), numStr, 34, numColor, 76, 46);

        if (status === 'LOCKED') {
          this.createLabel(card, 'LockIcon', new Vec3(0, 12, 0), '• • •', 28, '#475569', 90, 40);
          this.createLabel(card, 'StatusText', new Vec3(0, -56, 0), '未解锁', 20, '#475569', 140, 34);
        } else {
          let topCol = status === 'ACTIVE' ? this.hex('#D97706') : (levelNum % 2 === 0 ? this.hex('#1E3A8A') : this.hex('#2563EB'));
          let leftCol = status === 'ACTIVE' ? this.hex('#92400E') : this.hex('#1E293B');
          let rightCol = status === 'ACTIVE' ? this.hex('#B45309') : this.hex('#0F172A');

          if (isRose) {
            topCol = status === 'ACTIVE' ? this.hex('#6D28D9') : (levelNum % 2 === 0 ? this.hex('#4C1D95') : this.hex('#581C87'));
            leftCol = status === 'ACTIVE' ? this.hex('#4C1D95') : this.hex('#312E81');
            rightCol = status === 'ACTIVE' ? this.hex('#3B0764') : this.hex('#1E1B4B');
          } else if (isGold) {
            topCol = status === 'ACTIVE' ? this.hex('#B45309') : (levelNum % 2 === 0 ? this.hex('#7C2D12') : this.hex('#9A3412'));
            leftCol = status === 'ACTIVE' ? this.hex('#7C2D12') : this.hex('#451A03');
            rightCol = status === 'ACTIVE' ? this.hex('#451A03') : this.hex('#260C08');
          }

          this.drawIsometricBlock(g, topCol, leftCol, rightCol, this.hex(compBorder), 2.2, 16, 74, 42, 6, 0);

          const crystalIcon = status === 'ACTIVE' ? '★' : '◆';
          this.createLabel(card, 'Crystal', new Vec3(0, 14, 0), crystalIcon, 26, compBorder, 52, 52);

          if (status === 'COMPLETED') {
            const starStr = stars === 3 ? '★ ★ ★' : (stars === 2 ? '★ ★ ☆' : '★ ☆ ☆');
            this.createLabel(card, 'Stars', new Vec3(0, -56, 0), starStr, 20, '#FDE047', 170, 34);
            this.createLabel(card, 'BannerText', new Vec3(0, 82, 0), '✔ 已通过 · 3星', 14, '#93C5FD', 260, 24);
          } else {
            this.createLabel(card, 'ActiveText', new Vec3(0, -56, 0), '★ 正在挑战中 ★', 20, activeBorder, 170, 34);
            this.createLabel(card, 'BannerText', new Vec3(0, 82, 0), '🔥 当前进度关卡 · CURRENT 🔥', 14, '#FFFFFF', 300, 24);
          }
        }

        this.addClick(card, () => {
          if (status === 'LOCKED') {
            return;
          }
          console.log(`[LevelSelect] Selected Level ${levelNum} (Index: ${globalIdx})`);
          if (this.onSelectLevelCallback) {
            const targetIdx = globalIdx % 10;
            this.onSelectLevelCallback(targetIdx);
          }
        });
      }
    }
  }

  private createTopNav(halfH: number): void {
    let capsuleYOffset = 135;
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
        console.warn('[LevelSelect] Failed to compute WeChat capsule bounding rect, using fallback:', e);
      }
    }

    const navRoot = this.createNode('TopNav', new Vec3(0, halfH - capsuleYOffset, 0), this.node);
    this.ensureTransform(navRoot, 510, 68);
    const g = navRoot.addComponent(Graphics);

    const isRose = this.currentTheme === 1;
    const isGold = this.currentTheme === 2;
    const borderCol = isRose ? '#A78BFA' : (isGold ? '#FCD34D' : '#3B82F6');

    g.fillColor = this.hex('#0D162C');
    ((g.fillColor) as any).a = 230;
    g.roundRect(-335, -34, 510, 68, 26);
    g.fill();
    g.strokeColor = this.hex(borderCol);
    g.lineWidth = 2.5;
    g.stroke();

    // 优化：靠左与居中放置，最右边缘仅到 +95+68=+163，保证右上角胶囊区域 (X>+180) 彻底留白！
    const backBtn = this.createNode('BackBtn', new Vec3(-260, 0, 0), navRoot);
    this.ensureTransform(backBtn, 140, 50);
    const bg = backBtn.addComponent(Graphics);
    bg.fillColor = this.hex('#1E293B');
    bg.roundRect(-70, -25, 140, 50, 20);
    bg.fill();
    bg.strokeColor = this.hex(borderCol);
    bg.lineWidth = 2.4;
    bg.stroke();
    this.createLabel(backBtn, 'Text', new Vec3(0, 1, 0), '< 返回主页', 19, '#FFFFFF', 130, 40);

    this.addClick(backBtn, () => {
      console.log('[LevelSelect] Clicked Return Home');
      if (this.onReturnHomeCallback) this.onReturnHomeCallback();
    });

    this.createLabel(navRoot, 'Title', new Vec3(-80, 1, 0), '关卡选择 · 冰原章节', 22, '#FFFFFF', 210, 42);

    const starPill = this.createNode('StarPill', new Vec3(95, 0, 0), navRoot);
    this.ensureTransform(starPill, 136, 50);
    const sg = starPill.addComponent(Graphics);
    sg.fillColor = this.hex('#1E1B4B');
    sg.roundRect(-68, -25, 136, 50, 25);
    sg.fill();
    sg.strokeColor = this.hex('#FDE047');
    sg.lineWidth = 2.4;
    sg.stroke();
    this.createLabel(starPill, 'Text', new Vec3(0, 1, 0), '★ 22/30', 19, '#FDE047', 126, 38);
  }

  private createFooter(halfH: number): void {
    // 优化：去掉底部的“继续旅途”大按钮（因为上方列表里的09关本来就高亮且直接点击可入），腾出空间转为单行精简进度显示条！
    const footerRoot = this.createNode('Footer', new Vec3(0, -halfH + 48, 0), this.node);
    this.ensureTransform(footerRoot, 700, 54);
    const g = footerRoot.addComponent(Graphics);

    const isRose = this.currentTheme === 1;
    const isGold = this.currentTheme === 2;
    const borderCol = isRose ? '#A78BFA' : (isGold ? '#FCD34D' : '#3B82F6');

    g.fillColor = this.hex('#0D162C');
    ((g.fillColor) as any).a = 230;
    g.roundRect(-350, -27, 700, 54, 22);
    g.fill();
    g.strokeColor = this.hex(borderCol);
    g.lineWidth = 2.2;
    g.stroke();

    this.createLabel(footerRoot, 'ProgText', new Vec3(0, 1, 0), '🌟  章节探索进度:  8 / 10 关卡   |   累积获得星徽:  22 / 30 ★', 18, borderCol, 660, 40);
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
