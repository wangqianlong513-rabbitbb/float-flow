import { _decorator, Button, Color, Component, EventTouch, Graphics, Label, Layers, Node, tween, UITransform, Vec3, view } from 'cc';

const { ccclass } = _decorator;

@ccclass('HomeRoot')
export class HomeRoot extends Component {
  public onStartJourneyCallback?: () => void;
  public onStartEndlessCallback?: () => void;
  public onOpenSettingsCallback?: () => void;

  private heroIslandNode: Node | null = null;
  private popupRoot: Node | null = null;
  private currentTheme = 0; // 0: 极光冰原, 1: 暮色罗兰, 2: 落日余晖

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

    // 1. Top Resource & Settings Bar (Y = halfH - 60)
    this.createTopBar(halfH);

    // 2. Main Title Typography & Glow Aura (Y = halfH * 0.74)
    this.createTitleSection(halfH);

    // 3. Center Hero Floating 3D Isometric Island & Crystal Core (Y = halfH * 0.38)
    this.createHeroIsland(halfH);

    // 4. Left Sidebar Action Icons (X = -halfW + 45)
    this.createSidebarIcons(halfW, halfH);

    // 5. Center/Bottom Dual Mode Hero Cards (Y = -halfH * 0.05)
    this.createModeCards(halfH);

    // 6. Bottom Feature Banner Pills (Y = -halfH + 180)
    this.createBottomFeaturePills(halfH);

    // 7. Interactive Sidebar Popup Root
    const vs = view.getVisibleSize();
    this.popupRoot = this.createNode('PopupRoot', new Vec3(0, 0, 0), this.node);
    this.ensureTransform(this.popupRoot, vs.width, vs.height);
    this.popupRoot.active = false;
  }

  private addClick(node: Node, onClick: () => void): void {
    let btn = node.getComponent(Button);
    if (!btn) btn = node.addComponent(Button);
    btn.transition = Button.Transition.SCALE;
    btn.zoomScale = 0.92;
    node.off(Button.EventType.CLICK);
    node.on(Button.EventType.CLICK, onClick, this);
    node.off(Node.EventType.TOUCH_END);
    node.on(Node.EventType.TOUCH_END, onClick, this);
  }

  private createTopBar(halfH: number): void {
    const topBar = this.createNode('TopBar', new Vec3(0, halfH - 60, 0), this.node);
    this.ensureTransform(topBar, 1280, 60);

    const isRose = this.currentTheme === 1;
    const isGold = this.currentTheme === 2;
    const dBorder = isRose ? '#E879F9' : (isGold ? '#FDE047' : '#00F0FF');
    const dBg = isRose ? '#4C1D95' : (isGold ? '#7C2D12' : '#1E3A8A');
    const eBorder = isRose ? '#F472B6' : (isGold ? '#EA580C' : '#FDE047');
    const eBg = isRose ? '#581C87' : (isGold ? '#9A3412' : '#4C1D95');

    // Diamond Resource Pill (💎 1260 +)
    this.createResourcePill(topBar, 'DiamondPill', new Vec3(-100, 0, 0), '💎  1260  +', dBorder, dBg);

    // Energy Resource Pill (⚡ 8/10 +)
    this.createResourcePill(topBar, 'EnergyPill', new Vec3(80, 0, 0), '⚡  8 / 10  +', eBorder, eBg);

    // Settings Gear Button (⚙️)
    const settingsBtn = this.createNode('SettingsBtn', new Vec3(250, 0, 0), topBar);
    this.ensureTransform(settingsBtn, 48, 48);
    const sg = settingsBtn.addComponent(Graphics);
    sg.fillColor = this.hex(dBg);
    ((sg.fillColor) as any).a = 220;
    sg.circle(0, 0, 22);
    sg.fill();
    sg.strokeColor = this.hex(dBorder);
    sg.lineWidth = 2;
    sg.stroke();
    this.createLabel(settingsBtn, 'Icon', new Vec3(0, 2, 0), '⚙️', 22, '#FFFFFF', 44, 44);

    this.addClick(settingsBtn, () => {
      console.log('[HomeRoot] Click Settings');
      if (this.onOpenSettingsCallback) this.onOpenSettingsCallback();
    });
  }

  private createResourcePill(parent: Node, name: string, pos: Vec3, text: string, borderHex: string, bgHex: string): void {
    const pill = this.createNode(name, pos, parent);
    this.ensureTransform(pill, 150, 42);
    const g = pill.addComponent(Graphics);
    g.fillColor = this.hex(bgHex);
    ((g.fillColor) as any).a = 210;
    g.roundRect(-75, -21, 150, 42, 21);
    g.fill();
    g.strokeColor = this.hex(borderHex);
    g.lineWidth = 2;
    g.stroke();
    this.createLabel(pill, 'Text', new Vec3(0, 1, 0), text, 16, '#FFFFFF', 140, 36);
  }

  private createTitleSection(halfH: number): void {
    const titleRoot = this.createNode('TitleRoot', new Vec3(0, halfH * 0.74, 0), this.node);
    this.ensureTransform(titleRoot, 600, 140);

    const isRose = this.currentTheme === 1;
    const isGold = this.currentTheme === 2;
    const auraOuter = isRose ? '#4C1D95' : (isGold ? '#7C2D12' : '#4C1D95');
    const auraInner = isRose ? '#831843' : (isGold ? '#B45309' : '#00F0FF');
    const subCol = isRose ? '#C4B5FD' : (isGold ? '#FCD34D' : '#60A5FA');

    const aura = this.createNode('TitleAura', new Vec3(0, 0, 0), titleRoot);
    this.ensureTransform(aura, 400, 80);
    const ag = aura.addComponent(Graphics);
    ag.fillColor = this.hex(auraOuter);
    ((ag.fillColor) as any).a = 140;
    ag.circle(0, 5, 80);
    ag.fill();
    ag.fillColor = this.hex(auraInner);
    ((ag.fillColor) as any).a = 80;
    ag.circle(0, 5, 45);
    ag.fill();

    this.createLabel(titleRoot, 'MainTitle', new Vec3(0, 15, 0), '浮 岛 浮 光', 64, '#FFFFFF', 520, 80);
    this.createLabel(titleRoot, 'SubTitle', new Vec3(0, -38, 0), 'F L O A T   &   F L O W', 19, subCol, 460, 32);
  }

  private createHeroIsland(halfH: number): void {
    const islandRoot = this.createNode('HeroIslandRoot', new Vec3(0, halfH * 0.38, 0), this.node);
    this.ensureTransform(islandRoot, 500, 360);
    this.heroIslandNode = islandRoot;

    const g = islandRoot.addComponent(Graphics);

    const tileW = 120;
    const tileH = 70;
    const depth = 24;
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

      let topCol = isCenter ? this.hex('#4C1D95') : ((r + c) % 2 === 0 ? this.hex('#2563EB') : this.hex('#3B82F6'));
      let leftCol = isCenter ? this.hex('#312E81') : ((r + c) % 2 === 0 ? this.hex('#1E40AF') : this.hex('#1D4ED8'));
      let rightCol = isCenter ? this.hex('#1E1B4B') : ((r + c) % 2 === 0 ? this.hex('#1E3A8A') : this.hex('#1E40AF'));
      let strokeCol = isCenter ? this.hex('#E879F9') : ((r + c) % 2 === 0 ? this.hex('#60A5FA') : this.hex('#93C5FD'));

      if (isRose) {
        topCol = isCenter ? this.hex('#4C1D95') : ((r + c) % 2 === 0 ? this.hex('#6D28D9') : this.hex('#7C3AED'));
        leftCol = isCenter ? this.hex('#3B0764') : ((r + c) % 2 === 0 ? this.hex('#4C1D95') : this.hex('#581C87'));
        rightCol = isCenter ? this.hex('#2E1065') : ((r + c) % 2 === 0 ? this.hex('#3B0764') : this.hex('#4C1D95'));
        strokeCol = isCenter ? this.hex('#A78BFA') : ((r + c) % 2 === 0 ? this.hex('#A78BFA') : this.hex('#C4B5FD'));
      } else if (isGold) {
        topCol = isCenter ? this.hex('#7C2D12') : ((r + c) % 2 === 0 ? this.hex('#B45309') : this.hex('#C2410C'));
        leftCol = isCenter ? this.hex('#451A03') : ((r + c) % 2 === 0 ? this.hex('#78350F') : this.hex('#9A3412'));
        rightCol = isCenter ? this.hex('#260C08') : ((r + c) % 2 === 0 ? this.hex('#451A03') : this.hex('#7C2D12'));
        strokeCol = isCenter ? this.hex('#FBBF24') : ((r + c) % 2 === 0 ? this.hex('#FCD34D') : this.hex('#FDE047'));
      }

      this.drawIsometricBlock(g, topCol, leftCol, rightCol, strokeCol, 2, depth, tileW, tileH, y, x);
    });

    const coreY = 55;
    const coreGlowHex = isRose ? '#A78BFA' : (isGold ? '#FCD34D' : '#00F0FF');
    const cg = this.hex(coreGlowHex);
    g.fillColor = new Color(cg.r, cg.g, cg.b, 60);
    g.circle(0, coreY, 65);
    g.fill();
    g.fillColor = new Color(255, 255, 255, 120);
    g.circle(0, coreY, 36);
    g.fill();

    const cTop = isRose ? this.hex('#A78BFA') : (isGold ? this.hex('#FCD34D') : this.hex('#00F0FF'));
    const cLeft = isRose ? this.hex('#6D28D9') : (isGold ? this.hex('#B45309') : this.hex('#0099BB'));
    const cRight = isRose ? this.hex('#4C1D95') : (isGold ? this.hex('#7C2D12') : this.hex('#00CCD9'));

    this.drawIsometricBlock(g, cTop, cLeft, cRight, this.hex('#FFFFFF'), 3.0, 30, 76, 46, coreY, 0);

    tween(islandRoot)
      .to(2.2, { position: new Vec3(0, 300, 0) }, { easing: 'sineInOut' })
      .to(2.2, { position: new Vec3(0, 280, 0) }, { easing: 'sineInOut' })
      .union()
      .repeatForever()
      .start();
  }

  private createSidebarIcons(halfW: number, halfH: number): void {
    const sidebar = this.createNode('Sidebar', new Vec3(-halfW + 48, halfH * 0.42, 0), this.node);
    this.ensureTransform(sidebar, 70, 380);

    const spacing = halfH * 0.19;
    const items = [
      { id: 'daily', name: '每日奖励', icon: '🎁', y: spacing, border: '#FDE047', color: '#FDE047' },
      { id: 'rank', name: '排行榜', icon: '🏆', y: 0, border: '#60A5FA', color: '#60A5FA' },
      { id: 'achieve', name: '成 就', icon: '⭐', y: -spacing, border: '#A855F7', color: '#C084FC' }
    ];

    items.forEach((item) => {
      const btn = this.createNode(`Btn_${item.id}`, new Vec3(0, item.y, 0), sidebar);
      this.ensureTransform(btn, 64, 80);
      const g = btn.addComponent(Graphics);
      g.fillColor = this.hex('#1E3A8A');
      ((g.fillColor) as ((any)) as any).a = 210;
      g.circle(0, 10, 28);
      g.fill();
      g.strokeColor = this.hex(item.border);
      g.lineWidth = 2;
      g.stroke();

      this.createLabel(btn, 'Icon', new Vec3(0, 12, 0), item.icon, 26, '#FFFFFF', 50, 50);
      this.createLabel(btn, 'Label', new Vec3(0, -26, 0), item.name, 13, item.color, 70, 20);

      this.addClick(btn, () => {
        console.log(`[HomeRoot] Clicked sidebar item: ${item.name}`);
        if (item.id === 'daily') {
          this.showPopup('🎁   每 日 签 到 奖 励', [
            '💎  第 1 天:  50 钻石  ——  [ 已领取 ✔ ]',
            '💎  第 2 天:  100 钻石  ——  [ 今日可领 ⭐ ]',
            '💎  第 3 天:  200 钻石  ——  [ 明日解锁 🔒 ]',
            '⚡  第 4 天:  满管时空能量  ——  [ 待解锁 🔒 ]',
            '🎁  第 7 天:  500 钻石大礼包  ——  [ 待解锁 🔒 ]'
          ], '✨   立 即 领 取 今 日 100 💎', '#FDE047', '#991B1B');
        } else if (item.id === 'rank') {
          this.showPopup('🏆   微 信 好 友 排 行 榜', [
            '🥇  1. 微信好友·星辰大师 —— 通关 88 关 (260 ⭐)',
            '🥈  2. 你 (流光开拓者) —— 通关 56 关 (168 ⭐)',
            '🥉  3. 微信好友·阳光微风 —— 通关 42 关 (120 ⭐)',
            '🏅  4. 微信好友·极光旅人 —— 通关 35 关 (98 ⭐)',
            '🏅  5. 微信好友·暗夜流星 —— 通关 19 关 (50 ⭐)'
          ], '💬   邀 请 微 信 好 友 冲 榜', '#60A5FA', '#065F46');
        } else if (item.id === 'achieve') {
          this.showPopup('⭐   荣 誉 勋 章 与 成 就', [
            '🏅  [初次启航] 完成第 1 关 —— [ 已达成 ✔ ]',
            '🏅  [子弹时间大师] 触发极限减速 50 次 —— [ 进度 38/50 ]',
            '🏅  [高分王者] 累计获得 100 颗星 —— [ 领取 200 💎 ]',
            '🏅  [流光无尽] 无尽模式突破 2000m —— [ 已达成 ✔ ]',
            '🏅  [全图鉴收藏] 解锁 3 种太空流光主题 —— [ 进度 1/3 ]'
          ], '🏆   一 键 领 取 所 有 奖 励', '#C084FC', '#4C1D95');
        }
      });
    });
  }

  private showPopup(title: string, lines: string[], btnText: string, borderHex: string, btnBgHex: string): void {
    if (!this.popupRoot) return;
    this.popupRoot.active = true;
    this.popupRoot.setSiblingIndex(this.node.children.length - 1);
    this.popupRoot.destroyAllChildren();

    // 1. Backdrop overlay
    const overlay = this.createNode('Overlay', new Vec3(0, 0, 0), this.popupRoot);
    this.ensureTransform(overlay, 1280, 720);
    const og = overlay.addComponent(Graphics);
    og.fillColor = new Color(5, 10, 25, 180);
    og.rect(-640, -360, 1280, 720);
    og.fill();
    this.addClick(overlay, () => {
      this.popupRoot!.active = false;
    });

    // 2. Glassmorphic Dialog Box
    const dialog = this.createNode('Dialog', new Vec3(0, 20, 0), this.popupRoot);
    this.ensureTransform(dialog, 640, 460);
    const dg = dialog.addComponent(Graphics);
    dg.fillColor = this.hex('#0B132B');
    ((dg.fillColor) as ((any)) as any).a = 245;
    dg.roundRect(-320, -230, 640, 460, 24);
    dg.fill();
    dg.strokeColor = this.hex(borderHex);
    dg.lineWidth = 2.5;
    dg.stroke();

    dialog.on(Node.EventType.TOUCH_END, (e: EventTouch) => {
      e.propagationStopped = true;
    });

    // 3. Title & Close Button
    this.createLabel(dialog, 'Title', new Vec3(0, 185, 0), title, 24, '#FFFFFF', 450, 36);
    const closeBtn = this.createNode('CloseBtn', new Vec3(280, 185, 0), dialog);
    this.ensureTransform(closeBtn, 40, 40);
    const cg = closeBtn.addComponent(Graphics);
    cg.fillColor = this.hex('#1E293B');
    cg.circle(0, 0, 16);
    cg.fill();
    cg.strokeColor = this.hex(borderHex);
    cg.lineWidth = 1.5;
    cg.stroke();
    this.createLabel(closeBtn, 'Icon', new Vec3(0, 1, 0), '✖', 16, '#FFFFFF', 32, 32);
    this.addClick(closeBtn, () => {
      this.popupRoot!.active = false;
    });

    // 4. List Items
    lines.forEach((line, idx) => {
      const y = 110 - idx * 52;
      const itemNode = this.createNode(`Item_${idx}`, new Vec3(0, y, 0), dialog);
      this.ensureTransform(itemNode, 560, 44);
      const ig = itemNode.addComponent(Graphics);
      ig.fillColor = this.hex('#1E293B');
      ((ig.fillColor) as ((any)) as any).a = 200;
      ig.roundRect(-270, -20, 540, 40, 12);
      ig.fill();
      ig.strokeColor = this.hex('#334155');
      ig.lineWidth = 1;
      ig.stroke();
      this.createLabel(itemNode, 'Text', new Vec3(-10, 0, 0), line, 15, '#E2E8F0', 500, 36);
    });

    // 5. Bottom Hero Action Button
    const heroBtn = this.createNode('HeroBtn', new Vec3(0, -170, 0), dialog);
    this.ensureTransform(heroBtn, 360, 54);
    const hg = heroBtn.addComponent(Graphics);
    hg.fillColor = this.hex(btnBgHex);
    hg.roundRect(-180, -27, 360, 54, 27);
    hg.fill();
    hg.strokeColor = this.hex(borderHex);
    hg.lineWidth = 2;
    hg.stroke();
    this.createLabel(heroBtn, 'Text', new Vec3(0, 2, 0), btnText, 18, '#FFFFFF', 320, 36);

    this.addClick(heroBtn, () => {
      console.log(`[HomeRoot] Popup action clicked: ${btnText}`);
      this.popupRoot!.active = false;
    });
  }

  private createModeCards(halfH: number): void {
    const cardsRoot = this.createNode('ModeCardsRoot', new Vec3(0, -halfH * 0.05, 0), this.node);
    this.ensureTransform(cardsRoot, 700, 280);

    const isRose = this.currentTheme === 1;
    const isGold = this.currentTheme === 2;

    const jBg = isRose ? '#4C1D95' : (isGold ? '#7C2D12' : '#1E3A8A');
    const jBorder = isRose ? '#A78BFA' : (isGold ? '#FCD34D' : '#60A5FA');

    const eBg = isRose ? '#581C87' : (isGold ? '#9A3412' : '#4C1D95');
    const eBorder = isRose ? '#C4B5FD' : (isGold ? '#FBBF24' : '#E879F9');

    // WeChat Mini Game Mainstream Sleek Journey Card (500x108 at Y=60)
    const journeyCard = this.createNode('JourneyCard', new Vec3(0, 60, 0), cardsRoot);
    this.ensureTransform(journeyCard, 500, 108);
    const jg = journeyCard.addComponent(Graphics);
    jg.fillColor = this.hex(jBg);
    ((jg.fillColor) as any).a = 240;
    jg.roundRect(-250, -54, 500, 108, 28);
    jg.fill();
    jg.strokeColor = this.hex(jBorder);
    jg.lineWidth = 3.0;
    jg.stroke();
    // Inner level badge pill
    jg.fillColor = this.hex('#080E24');
    jg.roundRect(105, -18, 110, 36, 18);
    jg.fill();

    this.createLabel(journeyCard, 'Title', new Vec3(-70, 2, 0), '🏁   闯 关 旅 程', 28, '#FFFFFF', 320, 42);
    this.createLabel(journeyCard, 'Sub', new Vec3(160, 2, 0), '关卡 56', 18, jBorder, 100, 32);

    this.addClick(journeyCard, () => {
      console.log('[HomeRoot] Clicked Journey Mode!');
      if (this.onStartJourneyCallback) this.onStartJourneyCallback();
    });

    // WeChat Mini Game Mainstream Sleek Endless Card (500x92 at Y=-70)
    const endlessCard = this.createNode('EndlessCard', new Vec3(0, -70, 0), cardsRoot);
    this.ensureTransform(endlessCard, 500, 92);
    const eg = endlessCard.addComponent(Graphics);
    eg.fillColor = this.hex(eBg);
    ((eg.fillColor) as any).a = 240;
    eg.roundRect(-250, -46, 500, 92, 24);
    eg.fill();
    eg.strokeColor = this.hex(eBorder);
    eg.lineWidth = 3.0;
    eg.stroke();
    // Inner rank badge pill
    eg.fillColor = this.hex('#1E1B4B');
    eg.roundRect(95, -17, 130, 34, 17);
    eg.fill();

    this.createLabel(endlessCard, 'Title', new Vec3(-70, 2, 0), '♾️   极 限 排 位', 26, '#FFFFFF', 320, 40);
    this.createLabel(endlessCard, 'Sub', new Vec3(160, 2, 0), '最高 2840m', 17, eBorder, 120, 30);

    this.addClick(endlessCard, () => {
      console.log('[HomeRoot] Clicked Endless Mode!');
      if (this.onStartEndlessCallback) this.onStartEndlessCallback();
    });
  }

  private createBottomFeaturePills(halfH: number): void {
    const pillsRoot = this.createNode('FeaturePillsRoot', new Vec3(0, -halfH + 185, 0), this.node);
    this.ensureTransform(pillsRoot, 700, 240);

    const isRose = this.currentTheme === 1;
    const isGold = this.currentTheme === 2;

    const pills = [
      { text: '🔯   强化手牌卡槽 · 广告永久 +1', y: 80, bg: isRose ? '#3B0764' : (isGold ? '#451A03' : '#312E81'), border: isRose ? '#A78BFA' : (isGold ? '#FCD34D' : '#A78BFA'), col: '#E9D5FF' },
      { text: '⏱️   蓄能池状态 · 能量已满格 (10/10)', y: 0, bg: isRose ? '#4C1D95' : (isGold ? '#7C2D12' : '#004D61'), border: isRose ? '#C4B5FD' : (isGold ? '#FBBF24' : '#00F0FF'), col: '#A5F3FC' },
      { text: '🎨   主题场景色彩 · 点击定制换色', y: -80, bg: isRose ? '#581C87' : (isGold ? '#9A3412' : '#701A75'), border: isRose ? '#A78BFA' : (isGold ? '#FCD34D' : '#F472B6'), col: '#FBCFE8' }
    ];

    pills.forEach((p, idx) => {
      const node = this.createNode(`Pill_${idx}`, new Vec3(0, p.y, 0), pillsRoot);
      this.ensureTransform(node, 520, 46);
      const g = node.addComponent(Graphics);
      g.fillColor = this.hex(p.bg);
      g.roundRect(-260, -23, 520, 46, 23);
      g.fill();
      g.strokeColor = this.hex(p.border);
      g.lineWidth = 2.0;
      g.stroke();

      this.createLabel(node, 'Text', new Vec3(0, 1, 0), p.text, 17, p.col, 480, 32);

      this.addClick(node, () => {
        console.log(`[HomeRoot] Clicked feature pill: ${p.text}`);
        if (idx === 2) {
          if (this.onOpenSettingsCallback) this.onOpenSettingsCallback();
        } else if (idx === 0) {
          this.showPopup('🔯   强 化 手 牌 与 技 能', [
            '🎴  当前手牌容量:  4 张卡槽 —— [ 已达到标准容量 ]',
            '📺  观看激励视频广告:  解锁第 5 张永久手牌槽位！',
            '⚡  开局预置水晶:  每局自动携带 1 颗拐角水晶',
            '🛡️  护盾加持:  抵消一次太空浮岛坠落惩罚',
            '💎  使用 300 钻石:  立即兑换 3 次强化道具'
          ], '📺   看 广 告 永 久 +1 卡 槽', '#A78BFA', '#312E81');
        } else if (idx === 1) {
          this.showPopup('⏱️   时 空 蓄 能 池 状 态', [
            '⚡  当前能量值:  8 / 10  (精力充沛 ⚡)',
            '⏱️  恢复速度:  每 10 分钟自动恢复 1 点时空能量',
            '💡  消耗提示:  每次挑战旅途模式关卡消耗 1 点能量',
            '♾️  无尽模式:  不消耗任何能量，随时畅快开玩！',
            '💎  能量补给包:  消耗 50 钻石即可瞬间回满 10 点！'
          ], '⚡   消 耗 50 💎 瞬 间 回 满', '#00F0FF', '#004D61');
        }
      });
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
