import { _decorator, Button, Color, Component, EventTouch, Graphics, Label, Layers, Node, UITransform, Vec3, view } from 'cc';
import { WeChatService } from '../wx/WeChatService';

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

    // 1. Top Navigation Bar (Y = halfH - 60)
    this.createTopNav(halfH);

    // 2. Chapter & Mode Tabs (Y = halfH * 0.73)
    this.tabsRoot = this.createNode('TabsRoot', new Vec3(0, halfH * 0.73, 0), this.node);
    this.ensureTransform(this.tabsRoot, 700, 56);
    this.renderTabs();

    // 3. 20-Level Isometric Grid Container (Y = -50)
    this.gridRoot = this.createNode('GridRoot', new Vec3(0, -50, 0), this.node);
    this.ensureTransform(this.gridRoot, 700, 1000);
    this.renderGrid(this.currentChapter);

    // 4. Bottom Progress Banner & Quick Launch Footer (Y = -halfH + 80)
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

    const tabXs = [-238, 0, 238];
    tabs.forEach((tab, i) => {
      const isSelected = !tab.isEndless && this.currentChapter === tab.idx;
      const tabNode = this.createNode(`Tab_${i}`, new Vec3(tabXs[i], 0, 0), this.tabsRoot!);
      this.ensureTransform(tabNode, 226, 48);

      const g = tabNode.addComponent(Graphics);
      if (isSelected) {
        g.fillColor = this.hex(activeBg);
        ((g.fillColor) as ((any)) as any).a = 240;
        g.roundRect(-113, -24, 226, 48, 16);
        g.fill();
        g.strokeColor = this.hex(activeBorder);
        g.lineWidth = 2.5;
        g.stroke();
      } else if (tab.isEndless) {
        g.fillColor = this.hex(isRose ? '#3B0764' : (isGold ? '#451A03' : '#4C1D95'));
        ((g.fillColor) as ((any)) as any).a = 200;
        g.roundRect(-113, -24, 226, 48, 16);
        g.fill();
        g.strokeColor = this.hex(isRose ? '#A78BFA' : (isGold ? '#FCD34D' : '#A78BFA'));
        g.lineWidth = 2.0;
        g.stroke();
      } else {
        g.fillColor = this.hex('#0F172A');
        ((g.fillColor) as ((any)) as any).a = 200;
        g.roundRect(-113, -24, 226, 48, 16);
        g.fill();
        g.strokeColor = this.hex('#334155');
        g.lineWidth = 1.5;
        g.stroke();
      }

      const textColor = isSelected ? '#FFFFFF' : (tab.isEndless ? (isGold ? '#FDE047' : '#F472B6') : '#94A3B8');
      this.createLabel(tabNode, 'Text', new Vec3(0, 1, 0), tab.name, 17, textColor, 215, 30);

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
    const colXs = [-172, 172];
    const spacing = halfH * 0.25;
    const rowYs = [spacing * 2, spacing, 0, -spacing, -spacing * 2];

    const startIdx = chapter * 10;

    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 2; c++) {
        const localIdx = r * 2 + c;
        const globalIdx = startIdx + localIdx;
        const levelNum = globalIdx + 1;

        let status: 'COMPLETED' | 'ACTIVE' | 'LOCKED' = 'LOCKED';
        let stars = 0;
        if (chapter === 0) {
          if (levelNum <= 8) {
            status = 'COMPLETED';
            stars = levelNum % 3 === 0 ? 3 : (levelNum % 2 === 0 ? 2 : 3);
          } else if (levelNum === 9) {
            status = 'ACTIVE';
          } else {
            status = 'LOCKED';
          }
        }

        const card = this.createNode(`LevelCard_${levelNum}`, new Vec3(colXs[c], rowYs[r], 0), this.gridRoot!);
        this.ensureTransform(card, 330, 160);

        const g = card.addComponent(Graphics);
        g.fillColor = status === 'LOCKED' ? this.hex('#0B0F19') : this.hex('#0D162C');
        ((g.fillColor) as ((any)) as any).a = status === 'LOCKED' ? 180 : 235;
        g.roundRect(-165, -80, 330, 160, 22);
        g.fill();

        if (status === 'COMPLETED') {
          g.strokeColor = this.hex(compBorder);
          g.lineWidth = 2.5;
          g.stroke();
        } else if (status === 'ACTIVE') {
          g.strokeColor = this.hex(activeBorder);
          g.lineWidth = 3.5;
          g.stroke();
        } else {
          g.strokeColor = this.hex('#334155');
          g.lineWidth = 1.8;
          g.stroke();
        }

        const numStr = levelNum < 10 ? `0${levelNum}` : `${levelNum}`;
        const numColor = status === 'LOCKED' ? '#475569' : (status === 'ACTIVE' ? activeBorder : '#FFFFFF');
        this.createLabel(card, 'Num', new Vec3(-125, 48, 0), numStr, 24, numColor, 56, 34);

        if (status === 'LOCKED') {
          this.createLabel(card, 'LockIcon', new Vec3(0, 12, 0), '• • •', 26, '#64748B', 80, 36);
          this.createLabel(card, 'StatusText', new Vec3(0, -48, 0), '未解锁', 16, '#475569', 130, 26);
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

          this.drawIsometricBlock(g, topCol, leftCol, rightCol, this.hex(compBorder), 2.0, 14, 68, 38, 8, 0);

          const crystalIcon = status === 'ACTIVE' ? '★' : '◆';
          this.createLabel(card, 'Crystal', new Vec3(0, 16, 0), crystalIcon, 22, compBorder, 44, 44);

          if (status === 'COMPLETED') {
            const starStr = stars === 3 ? '★ ★ ★' : (stars === 2 ? '★ ★ ☆' : '★ ☆ ☆');
            this.createLabel(card, 'Stars', new Vec3(0, -48, 0), starStr, 17, '#FDE047', 150, 28);
          } else {
            this.createLabel(card, 'ActiveText', new Vec3(0, -48, 0), '★ 进行中...', 16, activeBorder, 140, 26);
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
    const navRoot = this.createNode('TopNav', new Vec3(0, halfH - 85, 0), this.node);
    this.ensureTransform(navRoot, 700, 64);
    const g = navRoot.addComponent(Graphics);

    const isRose = this.currentTheme === 1;
    const isGold = this.currentTheme === 2;
    const borderCol = isRose ? '#A78BFA' : (isGold ? '#FCD34D' : '#3B82F6');

    g.fillColor = this.hex('#0D162C');
    ((g.fillColor) as ((any)) as any).a = 230;
    g.roundRect(-350, -32, 700, 64, 24);
    g.fill();
    g.strokeColor = this.hex(borderCol);
    g.lineWidth = 2;
    g.stroke();

    const backBtn = this.createNode('BackBtn', new Vec3(-240, 0, 0), navRoot);
    this.ensureTransform(backBtn, 160, 48);
    const bg = backBtn.addComponent(Graphics);
    bg.fillColor = this.hex('#1E293B');
    bg.roundRect(-80, -24, 160, 48, 16);
    bg.fill();
    bg.strokeColor = this.hex(borderCol);
    bg.lineWidth = 2.0;
    bg.stroke();
    this.createLabel(backBtn, 'Text', new Vec3(0, 1, 0), '< 返回主页', 18, '#FFFFFF', 150, 36);

    this.addClick(backBtn, () => {
      console.log('[LevelSelect] Clicked Return Home');
      if (this.onReturnHomeCallback) this.onReturnHomeCallback();
    });

    this.createLabel(navRoot, 'Title', new Vec3(5, 1, 0), '关卡选择 · 冰原章节', 22, '#FFFFFF', 260, 38);

    const starPill = this.createNode('StarPill', new Vec3(230, 0, 0), navRoot);
    this.ensureTransform(starPill, 130, 46);
    const sg = starPill.addComponent(Graphics);
    sg.fillColor = this.hex('#1E1B4B');
    sg.roundRect(-65, -23, 130, 46, 23);
    sg.fill();
    sg.strokeColor = this.hex('#FDE047');
    sg.lineWidth = 2.0;
    sg.stroke();
    this.createLabel(starPill, 'Text', new Vec3(0, 1, 0), '★ 22/30', 17, '#FDE047', 120, 32);
  }

  private createFooter(halfH: number): void {
    const footerRoot = this.createNode('Footer', new Vec3(0, -halfH + 70, 0), this.node);
    this.ensureTransform(footerRoot, 700, 82);
    const g = footerRoot.addComponent(Graphics);

    const isRose = this.currentTheme === 1;
    const isGold = this.currentTheme === 2;
    const borderCol = isRose ? '#A78BFA' : (isGold ? '#FCD34D' : '#3B82F6');
    const launchBg = isRose ? '#581C87' : (isGold ? '#7C2D12' : '#2563EB');
    const launchBorder = isRose ? '#C4B5FD' : (isGold ? '#FBBF24' : '#00F0FF');

    g.fillColor = this.hex('#0D162C');
    ((g.fillColor) as ((any)) as any).a = 230;
    g.roundRect(-350, -41, 700, 82, 24);
    g.fill();
    g.strokeColor = this.hex(borderCol);
    g.lineWidth = 2.2;
    g.stroke();

    this.createLabel(footerRoot, 'ProgText', new Vec3(-135, 1, 0), '进度: 8/10 关卡  |  累积: 22/30 ★', 16, borderCol, 410, 32);

    const launchBtn = this.createNode('QuickLaunchBtn', new Vec3(205, 0, 0), footerRoot);
    this.ensureTransform(launchBtn, 250, 60);
    const lg = launchBtn.addComponent(Graphics);
    lg.fillColor = this.hex(launchBg);
    lg.roundRect(-125, -30, 250, 60, 20);
    lg.fill();
    lg.strokeColor = this.hex(launchBorder);
    lg.lineWidth = 2.8;
    lg.stroke();
    this.createLabel(launchBtn, 'Text', new Vec3(0, 1, 0), '★ 继续旅途 (第9关)', 19, '#FFFFFF', 235, 36);

    this.addClick(launchBtn, () => {
      console.log('[LevelSelect] Clicked Quick Launch -> Start Level 9 (index 8)');
      if (this.onSelectLevelCallback) this.onSelectLevelCallback(8);
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
