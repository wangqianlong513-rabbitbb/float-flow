import { _decorator, Button, Color, Component, EventTouch, Graphics, Label, Layers, Node, tween, UITransform, Vec3, view } from 'cc';
import { WeChatService } from '../wx/WeChatService';
import { ProfileManager } from '../core/ProfileManager';
import { getUiPalette } from '../ui/UiTheme';

declare const wx: any;

const { ccclass } = _decorator;

@ccclass('LevelSelect')
export class LevelSelect extends Component {
  public onSelectLevelCallback?: (levelIndex: number) => void;
  public onReturnHomeCallback?: () => void;
  public onStartEndlessCallback?: () => void;

  private currentChapter = 0; // 0/1/2 = journey chapters, each chapter has 10 levels.
  private gridRoot: Node | null = null;
  private tabsRoot: Node | null = null;
  private currentTheme = 0; // 0: Icefield, 1: Starport Mist, 2: Corona Dawn

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

    // 2.1 微叙事诗意章节副标题 (Y = halfH * 0.68 - 48)
    this.createChapterPoetry(halfH);

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
      { name: '冰原 1-10', idx: 0, isEndless: false },
      { name: '星港 11-20', idx: 1, isEndless: false },
      { name: '晨光 21-30', idx: 2, isEndless: false },
      { name: '★ 无尽', idx: 3, isEndless: true }
    ];

    const palette = getUiPalette(this.currentTheme);
    const activeBg = palette.panelSoft;
    const activeBorder = this.currentTheme === 2 ? palette.gold : palette.cyan;

    const tabXs = [-258, -86, 86, 258];
    tabs.forEach((tab, i) => {
      const isSelected = !tab.isEndless && this.currentChapter === tab.idx;
      const tabNode = this.createNode(`Tab_${i}`, new Vec3(tabXs[i], 0, 0), this.tabsRoot!);
      this.ensureTransform(tabNode, 166, 56);

      const g = tabNode.addComponent(Graphics);
      if (isSelected) {
        g.fillColor = this.hex(activeBg);
        ((g.fillColor) as any).a = 245;
        g.roundRect(-83, -28, 166, 56, 18);
        g.fill();
        g.strokeColor = this.hex(activeBorder);
        g.lineWidth = 3.0;
        g.stroke();
      } else if (tab.isEndless) {
        g.fillColor = this.hex(this.currentTheme === 2 ? '#1D2A3B' : palette.panelSoft);
        ((g.fillColor) as any).a = 220;
        g.roundRect(-83, -28, 166, 56, 18);
        g.fill();
        g.strokeColor = this.hex(this.currentTheme === 2 ? palette.gold : palette.blue);
        g.lineWidth = 2.4;
        g.stroke();
      } else {
        g.fillColor = this.hex('#0F172A');
        ((g.fillColor) as any).a = 150;
        g.roundRect(-83, -28, 166, 56, 18);
        g.fill();
        g.strokeColor = this.hex('#334155');
        ((g.strokeColor) as any).a = 130;
        g.lineWidth = 2.0;
        g.stroke();
      }

      const textColor = isSelected ? '#FFFFFF' : (tab.isEndless ? (this.currentTheme === 2 ? palette.gold : palette.blue) : '#CBD5E1');
      this.createLabel(tabNode, 'Text', new Vec3(0, 1, 0), tab.name, 18, textColor, 158, 36);

      this.addClick(tabNode, () => {
        if (tab.isEndless) {
          console.log('[LevelSelect] Start Endless Mode');
          if (this.onStartEndlessCallback) this.onStartEndlessCallback();
        } else {
          console.log(`[LevelSelect] Switch Chapter to ${tab.idx}`);
          this.currentChapter = tab.idx;
          this.rebuildUI();
        }
      });
    });
  }

  private createChapterPoetry(halfH: number): void {
    const poetryNode = this.createNode('ChapterPoetry', new Vec3(0, halfH * 0.68 - 48, 0), this.node);
    this.ensureTransform(poetryNode, 640, 32);

    const poems = [
      { text: '✦ 极光冰原 · 终年冰封的星海，唤醒沉睡的第一缕晨曦 ✦', color: '#B5E9FF' },
      { text: '✦ 星港迷雾 · 错综交织的星轨，在迷雾中寻觅回家的航标 ✦', color: '#C7D2FE' },
      { text: '✦ 日冕晨光 · 穿越无尽破晓，让浮岛重沐炽热辉光 ✦', color: '#FFD66B' },
      { text: '✦ 无尽星域 · 超越极限维度，探寻宇宙尽头的光芒 ✦', color: '#39D6B0' },
    ];
    const current = poems[this.currentChapter] || poems[0];
    this.createLabel(poetryNode, 'PoetryText', new Vec3(0, 0, 0), current.text, 15, current.color, 620, 26);
  }

  private renderGrid(chapter: number): void {
    if (!this.gridRoot) return;
    this.gridRoot.destroyAllChildren();

    const palette = getUiPalette(this.currentTheme);
    const isRose = this.currentTheme === 1;
    const isGold = this.currentTheme === 2;

    // 增强章节专属色彩辨识度：冰原(极光青/冰川蓝)、星港(梦幻紫/迷雾蓝)、晨光(温暖金/琥珀)
    let chapterAccent = '#29BDE0';
    let chapterSub = '#B5E9FF';
    let chapterHeader = '#0E3A5F';
    if (chapter === 1) {
      chapterAccent = '#818CF8';
      chapterSub = '#C7D2FE';
      chapterHeader = '#27235E';
    } else if (chapter === 2) {
      chapterAccent = '#F59E0B';
      chapterSub = '#FFD66B';
      chapterHeader = '#4D3212';
    }

    const activeBorder = chapterAccent;
    const compBorder = chapterSub;

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
        let status: 'COMPLETED' | 'PLAYABLE' | 'ACTIVE' | 'LOCKED' = 'LOCKED';
        let stars = 0;

        const bestStars = profile.levelBestStars ? (profile.levelBestStars[String(levelNum)] || 0) : 0;
        if (globalIdx < profile.levelProgress) {
          stars = bestStars > 0 ? bestStars : 3;
          status = stars === 3 ? 'COMPLETED' : 'PLAYABLE';
        } else if (globalIdx === profile.levelProgress) {
          status = 'ACTIVE';
          stars = bestStars;
        } else {
          status = 'LOCKED';
        }

        const card = this.createNode(`LevelCard_${levelNum}`, new Vec3(colXs[c], rowYs[r], 0), this.gridRoot!);
        this.ensureTransform(card, 340, 196);

        const g = card.addComponent(Graphics);
        if (status === 'LOCKED') {
          // 未解锁卡片：深邃冰原星夜暗基底（高对比度，彻底杜绝廉价灰白塑料蒙层！）
          g.fillColor = this.hex('#081220');
          ((g.fillColor) as any).a = 235;
          g.roundRect(-170, -98, 340, 196, 26);
          g.fill();

          g.strokeColor = this.hex('#182B42');
          ((g.strokeColor) as any).a = 180;
          g.lineWidth = 1.4;
          g.roundRect(-170, -98, 340, 196, 26);
          g.stroke();

          // 绘制精致极简几何锁具 (Geometric Celestic Lock)
          // 1. 锁梁 (Shackle)
          g.strokeColor = this.hex('#94A3B8');
          g.lineWidth = 3.2;
          g.arc(0, 22, 14, 0, Math.PI, false);
          g.stroke();
          g.moveTo(-14, 22); g.lineTo(-14, 10); g.stroke();
          g.moveTo(14, 22); g.lineTo(14, 10); g.stroke();

          // 2. 锁体 (Body)
          g.fillColor = this.hex('#17253B');
          g.roundRect(-22, -20, 44, 32, 8);
          g.fill();
          g.strokeColor = this.hex('#3B5270');
          g.lineWidth = 1.6;
          g.roundRect(-22, -20, 44, 32, 8);
          g.stroke();

          // 3. 锁孔 (Keyhole)
          g.fillColor = this.hex('#081220');
          g.circle(0, -2, 3.8);
          g.fill();
          g.fillRect(-1.5, -8, 3, 6);
        } else if (status === 'ACTIVE') {
          // 当前挑战关卡：章节主色彩高亮脉冲、专属 Header 极光条
          g.fillColor = this.hex('#0D2238');
          ((g.fillColor) as any).a = 250;
          g.roundRect(-170, -98, 340, 196, 26);
          g.fill();
          // Active level inner aura
          const activeAura = this.hex(activeBorder);
          g.fillColor = new Color(activeAura.r, activeAura.g, activeAura.b, 40);
          g.roundRect(-165, -93, 330, 186, 22);
          g.fill();
          // Top Cyber Header Banner for ACTIVE card
          g.fillColor = this.hex(activeBorder);
          g.roundRect(-170, 68, 340, 30, 14);
          g.fill();

          g.strokeColor = this.hex(activeBorder);
          g.lineWidth = 3.6;
          g.roundRect(-170, -98, 340, 196, 26);
          g.stroke();

          if (!ProfileManager.isPowerSaveMode()) {
            tween(card)
              .to(1.4, { scale: new Vec3(1.036, 1.036, 1) }, { easing: 'sineInOut' })
              .to(1.4, { scale: new Vec3(1.0, 1.0, 1) }, { easing: 'sineInOut' })
              .union()
              .repeatForever()
              .start();
          }
        } else if (status === 'PLAYABLE') {
          // 可挑战/可重玩冲满星：柔和晶石边框与待满星提示
          g.fillColor = this.hex('#0E253E');
          ((g.fillColor) as any).a = 220;
          g.roundRect(-170, -98, 340, 196, 26);
          g.fill();

          g.strokeColor = this.hex(chapterSub);
          ((g.strokeColor) as any).a = 180;
          g.lineWidth = 1.8;
          g.roundRect(-170, -98, 340, 196, 26);
          g.stroke();
        } else {
          // 已通关满星：静谧深海通透微光，去除冗余“已点亮”标题栏，以三星纯净展示为准
          g.fillColor = this.hex('#0B1C30');
          ((g.fillColor) as any).a = 205;
          g.roundRect(-170, -98, 340, 196, 26);
          g.fill();
          // 晶体冰原纯净高光微边
          g.strokeColor = new Color(255, 255, 255, 32);
          g.lineWidth = 1.0;
          g.moveTo(-140, 88);
          g.lineTo(140, 88);
          g.stroke();

          g.strokeColor = this.hex('#1C3D5E');
          ((g.strokeColor) as any).a = 160;
          g.lineWidth = 1.4;
          g.roundRect(-170, -98, 340, 196, 26);
          g.stroke();
        }

        const numStr = levelNum < 10 ? `0${levelNum}` : `${levelNum}`;
        const numColor = status === 'LOCKED' ? '#334155' : (status === 'ACTIVE' ? activeBorder : '#FFFFFF');
        this.createLabel(card, 'Num', new Vec3(-126, 48, 0), numStr, 34, numColor, 76, 46);

        if (status === 'LOCKED') {
          this.createLabel(card, 'StatusText', new Vec3(0, -58, 0), '🔒 通关前置关卡解锁', 16, '#64748B', 220, 32);
        } else {
          let topCol = status === 'ACTIVE' ? this.hex(activeBorder) : (levelNum % 2 === 0 ? this.hex('#153A60') : this.hex('#1C4978'));
          let leftCol = status === 'ACTIVE' ? this.hex('#0D4B66') : this.hex('#0D2642');
          let rightCol = status === 'ACTIVE' ? this.hex('#093345') : this.hex('#091C30');

          if (chapter === 1) {
            topCol = status === 'ACTIVE' ? this.hex('#818CF8') : (levelNum % 2 === 0 ? this.hex('#2E2B6B') : this.hex('#3B3785'));
            leftCol = status === 'ACTIVE' ? this.hex('#1E1B4B') : this.hex('#17153B');
            rightCol = status === 'ACTIVE' ? this.hex('#131131') : this.hex('#0F0E24');
          } else if (chapter === 2) {
            topCol = status === 'ACTIVE' ? this.hex('#F59E0B') : (levelNum % 2 === 0 ? this.hex('#5A3E1B') : this.hex('#6E4C21'));
            leftCol = status === 'ACTIVE' ? this.hex('#3B2810') : this.hex('#2B1E0C');
            rightCol = status === 'ACTIVE' ? this.hex('#261A0B') : this.hex('#1C1307');
          }

          this.drawIsometricBlock(g, topCol, leftCol, rightCol, this.hex(status === 'ACTIVE' ? '#FFFFFF' : compBorder), 1.6, 16, 74, 42, 6, 0);

          const crystalIcon = status === 'ACTIVE' ? '★' : '◆';
          this.createLabel(card, 'Crystal', new Vec3(0, 14, 0), crystalIcon, 26, status === 'ACTIVE' ? '#FFFFFF' : compBorder, 52, 52);

          if (status === 'COMPLETED') {
            this.createLabel(card, 'Stars', new Vec3(0, -56, 0), '★ ★ ★', 22, '#FFD66B', 170, 34);
          } else if (status === 'PLAYABLE') {
            const starStr = stars === 2 ? '★ ★ ☆' : '★ ☆ ☆';
            this.createLabel(card, 'Stars', new Vec3(0, -56, 0), starStr, 20, '#FFD66B', 170, 34);
            this.createLabel(card, 'BannerText', new Vec3(0, 82, 0), '可挑战 · 冲满星', 14, chapterSub, 200, 24);
          } else {
            this.createLabel(card, 'ActiveText', new Vec3(0, -56, 0), '★ 正在挑战中 ★', 20, activeBorder, 170, 34);
            this.createLabel(card, 'BannerText', new Vec3(0, 82, 0), '当前挑战 · 接上这束光', 16, '#07172D', 300, 24);
          }
        }

        this.addClick(card, () => {
          if (status === 'LOCKED') {
            WeChatService.showToast('先通关前面的光路，再解锁这里！', 'none');
            return;
          }
          console.log(`[LevelSelect] Selected Level ${levelNum} (Index: ${globalIdx})`);
          if (this.onSelectLevelCallback) {
            this.onSelectLevelCallback(globalIdx);
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

    const palette = getUiPalette(this.currentTheme);
    const borderCol = this.currentTheme === 2 ? palette.gold : palette.cyan;

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

    const chapterTitles = ['关卡选择 · 冰原章节', '关卡选择 · 星港章节', '关卡选择 · 晨光章节'];
    const title = chapterTitles[this.currentChapter] || chapterTitles[0];
    this.createLabel(navRoot, 'Title', new Vec3(-80, 1, 0), title, 22, '#FFFFFF', 210, 42);

    const starPill = this.createNode('StarPill', new Vec3(95, 0, 0), navRoot);
    this.ensureTransform(starPill, 136, 50);
    const sg = starPill.addComponent(Graphics);
    sg.fillColor = this.hex('#1E1B4B');
    sg.roundRect(-68, -25, 136, 50, 25);
    sg.fill();
    sg.strokeColor = this.hex('#FDE047');
    sg.lineWidth = 2.4;
    sg.stroke();
    const profile = ProfileManager.getProfile();
    const chapterStart = this.currentChapter * 10;
    const completed = Math.max(0, Math.min(10, profile.levelProgress - chapterStart));
    this.createLabel(starPill, 'Text', new Vec3(0, 1, 0), `★ ${completed * 3}/30`, 19, '#FDE047', 126, 38);
  }

  private createFooter(halfH: number): void {
    // 优化：去掉底部的“继续旅途”大按钮（因为上方列表里的09关本来就高亮且直接点击可入），腾出空间转为单行精简进度显示条！
    const footerRoot = this.createNode('Footer', new Vec3(0, -halfH + 48, 0), this.node);
    this.ensureTransform(footerRoot, 700, 54);
    const g = footerRoot.addComponent(Graphics);

    const palette = getUiPalette(this.currentTheme);
    const borderCol = this.currentTheme === 2 ? palette.gold : palette.cyan;

    g.fillColor = this.hex('#0D162C');
    ((g.fillColor) as any).a = 230;
    g.roundRect(-350, -27, 700, 54, 22);
    g.fill();
    g.strokeColor = this.hex(borderCol);
    g.lineWidth = 2.2;
    g.stroke();

    const profile = ProfileManager.getProfile();
    const chapterStart = this.currentChapter * 10;
    const completed = Math.max(0, Math.min(10, profile.levelProgress - chapterStart));
    const progress = completed / 10;
    const nextHint = completed >= 10
      ? (this.currentChapter < 2 ? '下一章节已开启，继续解锁爆点机制！' : '30关已全通，去无尽模式冲榜！')
      : `再通 ${10 - completed} 关解锁本章满星奖励`;
    this.createLabel(footerRoot, 'ProgText', new Vec3(0, 10, 0), `章节进度 ${completed}/10 · 星徽 ${completed * 3}/30 ★ · ${nextHint}`, 19, borderCol, 660, 28);

    const barBg = this.createNode('ProgressBarBg', new Vec3(0, -16, 0), footerRoot);
    this.ensureTransform(barBg, 560, 10);
    const bg = barBg.addComponent(Graphics);
    bg.fillColor = this.hex('#111827');
    bg.roundRect(-280, -5, 560, 10, 5);
    bg.fill();
    bg.fillColor = this.hex(borderCol);
    bg.roundRect(-280, -5, 560 * progress, 10, 5);
    bg.fill();
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
