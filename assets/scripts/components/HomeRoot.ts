import { _decorator, Button, Color, Component, EventTouch, Graphics, Label, Layers, Node, tween, UITransform, Vec3, view } from 'cc';
import { WeChatService } from '../wx/WeChatService';
import { ProfileManager } from '../core/ProfileManager';

declare const wx: any;

const { ccclass } = _decorator;

@ccclass('HomeRoot')
export class HomeRoot extends Component {
  public onStartJourneyCallback?: () => void;
  public onStartEndlessCallback?: () => void;
  public onOpenSettingsCallback?: () => void;

  private heroIslandNode: Node | null = null;
  private popupRoot: Node | null = null;
  private currentTheme = 0; // 0: 极光冰原, 1: 暮色罗兰, 2: 落日余晖
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

    // 1. Top Resource & Settings Bar (Y = halfH - 125, safely left-aligned to leave X > +150 100% BLANK for WeChat Capsule!)
    this.createTopBar(halfH);

    // 2. Main Title Typography & Glow Aura (Y = halfH * 0.73)
    this.createTitleSection(halfH);

    // 3. Center Hero Floating 3D Isometric Island & Crystal Core (Y = halfH * 0.36)
    this.createHeroIsland(halfH);

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
  }

  private addClick(node: Node, onClick: () => void): void {
    let btn = node.getComponent(Button);
    if (!btn) btn = node.addComponent(Button);
    btn.transition = Button.Transition.SCALE;
    btn.zoomScale = 0.92;
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

    const topBar = this.createNode('TopBar', new Vec3(0, halfH - capsuleYOffset, 0), this.node);
    this.ensureTransform(topBar, 1280, 76);

    const isRose = this.currentTheme === 1;
    const isGold = this.currentTheme === 2;
    const dBorder = isRose ? '#E879F9' : (isGold ? '#FDE047' : '#00D4FF'); // Primary500
    const dBg = isRose ? '#4C1D95' : (isGold ? '#7C2D12' : '#131C39');    // BG200
    const eBorder = isRose ? '#F472B6' : (isGold ? '#EA580C' : '#8B5CF6'); // Accent500
    const eBg = isRose ? '#581C87' : (isGold ? '#9A3412' : '#1E2A4F');    // BG300

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
      if (this.onOpenSettingsCallback) this.onOpenSettingsCallback();
    });

    const profile = ProfileManager.getProfile();
    // 2. 晶核资源胶囊 (X = -102, 宽度 180, 高度 56, 间距 16px)
    this.createResourcePill(topBar, 'DiamondPill', new Vec3(-102, 0, 0), `${profile.diamonds} +`, dBorder, dBg, 180, 'diamond');

    // 3. 能量资源胶囊 (X = 94, 宽度 180, 高度 56, 间距 16px, 最右侧边缘到 +184)
    this.createResourcePill(topBar, 'EnergyPill', new Vec3(94, 0, 0), `${profile.energy}/10 +`, eBorder, eBg, 180, 'energy');
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

  private createResourcePill(parent: Node, name: string, pos: Vec3, text: string, borderHex: string, bgHex: string, width: number, iconType: 'diamond' | 'energy'): void {
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
  }

  private createTitleSection(halfH: number): void {
    // 优化：把主标题下移至 halfH * 0.64 (约 +498)，为顶部导航条与中间浮岛留出完美黄金分割布局
    const titleRoot = this.createNode('TitleRoot', new Vec3(0, halfH * 0.64, 0), this.node);
    this.ensureTransform(titleRoot, 640, 130);

    const isRose = this.currentTheme === 1;
    const isGold = this.currentTheme === 2;
    const auraOuter = isRose ? '#4C1D95' : (isGold ? '#7C2D12' : '#1E3A8A');
    const auraInner = isRose ? '#831843' : (isGold ? '#B45309' : '#00F0FF');
    const subCol = isRose ? '#F472B6' : (isGold ? '#FDE047' : '#38BDF8');

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

    this.createLabel(titleRoot, 'MainTitle', new Vec3(0, 14, 0), '浮 岛 流 光', 60, '#FFFFFF', 540, 72);
    this.createLabel(titleRoot, 'SubTitle', new Vec3(0, -36, 0), '═══  F L O A T   &   F L O W  ═══', 18, subCol, 500, 34);
  }

  private createHeroIsland(halfH: number): void {
    // 优化：把浮岛位置调整到 halfH * 0.22 (约 +171)，并使之成为可点击入口，且修复了 tween 跳动的 Bug
    const islandRoot = this.createNode('HeroIslandRoot', new Vec3(0, halfH * 0.22, 0), this.node);
    this.ensureTransform(islandRoot, 540, 380);
    this.heroIslandNode = islandRoot;

    const g = islandRoot.addComponent(Graphics);

    const tileW = 136;
    const tileH = 78;
    const depth = 30;
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

      this.drawIsometricBlock(g, topCol, leftCol, rightCol, strokeCol, 2.2, depth, tileW, tileH, y, x);
    });

    const coreY = 63;
    const coreGlowHex = isRose ? '#A78BFA' : (isGold ? '#FCD34D' : '#00F0FF');
    const cg = this.hex(coreGlowHex);
    g.fillColor = new Color(cg.r, cg.g, cg.b, 55);
    g.circle(0, coreY, 76);
    g.fill();
    g.fillColor = new Color(255, 255, 255, 110);
    g.circle(0, coreY, 40);
    g.fill();

    const cTop = isRose ? this.hex('#A78BFA') : (isGold ? this.hex('#FCD34D') : this.hex('#00F0FF'));
    const cLeft = isRose ? this.hex('#6D28D9') : (isGold ? this.hex('#B45309') : this.hex('#0099BB'));
    const cRight = isRose ? this.hex('#4C1D95') : (isGold ? this.hex('#7C2D12') : this.hex('#00CCD9'));

    this.drawIsometricBlock(g, cTop, cLeft, cRight, this.hex('#FFFFFF'), 3.2, 36, 86, 50, coreY, 0);

    // 点击浮岛也可以直接触发“闯关旅程”主入口！
    this.addClick(islandRoot, () => {
      console.log('[HomeRoot] Clicked hero island -> start journey');
      if (this.onStartJourneyCallback) this.onStartJourneyCallback();
    });

    // 修复动画抖跃/跳动Bug：初始Y轴坐标为 halfH * 0.22，使动画以此为中值上下平滑漂移
    tween(islandRoot)
      .to(2.2, { position: new Vec3(0, halfH * 0.22 + 10, 0) }, { easing: 'sineInOut' })
      .to(2.2, { position: new Vec3(0, halfH * 0.22 - 10, 0) }, { easing: 'sineInOut' })
      .union()
      .repeatForever()
      .start();
  }

  private createSidebarIcons(halfW: number, halfH: number): void {
    // 优化：侧边栏对齐左侧 32px 边界安全区 (X = -halfW + 74)，按钮尺寸从 84 放大到 96 更加易点
    const sidebar = this.createNode('Sidebar', new Vec3(-halfW + 74, halfH * 0.22, 0), this.node);
    this.ensureTransform(sidebar, 96, 360);

    const spacing = halfH * 0.18;
    const items = [
      { id: 'daily', name: '签 到', symbol: '🎁', y: spacing, border: '#FDE047', bg: '#7C2D12' },
      { id: 'rank', name: '排 行', symbol: '🏆', y: 0, border: '#00F0FF', bg: '#1E3A8A' },
      { id: 'achieve', name: '成 就', symbol: '🎖️', y: -spacing, border: '#C084FC', bg: '#4C1D95' }
    ];

    items.forEach((item) => {
      const btn = this.createNode(`Btn_${item.id}`, new Vec3(0, item.y, 0), sidebar);
      this.ensureTransform(btn, 96, 96); // 放大至 96 x 96
      const g = btn.addComponent(Graphics);

      // Sleek Circular Icon Badge
      g.fillColor = this.hex(item.bg);
      ((g.fillColor) as any).a = 210;
      g.circle(0, 10, 38); // 38 半径，直径 76 符合放大要求
      g.fill();
      const sBorderCol = this.hex(item.border);
      sBorderCol.a = 120; // 降低描边亮度以凸显主界面游戏按钮
      g.strokeColor = sBorderCol;
      g.lineWidth = 1.6;
      g.circle(0, 10, 38);
      g.stroke();

      // Inner subtle glow ring
      g.strokeColor = new Color(255, 255, 255, 60);
      g.lineWidth = 0.8;
      g.circle(0, 10, 31);
      g.stroke();

      // Draw custom graphics on the circular badge instead of Emoji
      const centerY = 10;
      if (item.id === 'daily') {
        g.fillColor = this.hex('#FF4D4D');
        g.strokeColor = Color.WHITE;
        g.lineWidth = 1.6;
        g.roundRect(-15, centerY - 14, 30, 24, 4);
        g.fill();
        g.stroke();
        
        g.fillColor = this.hex('#FFD700');
        g.fillRect(-3, centerY - 14, 6, 24);
        g.fillRect(-15, centerY - 5, 30, 6);
        
        g.strokeColor = this.hex('#FFD700');
        g.circle(-5, centerY + 13, 5);
        g.stroke();
        g.circle(5, centerY + 13, 5);
        g.stroke();
      } else if (item.id === 'rank') {
        g.fillColor = this.hex('#FFD700');
        g.strokeColor = Color.WHITE;
        g.lineWidth = 1.6;
        
        // Trophy cup
        g.moveTo(-11, centerY + 11);
        g.lineTo(11, centerY + 11);
        g.lineTo(7, centerY - 3);
        g.lineTo(-7, centerY - 3);
        g.close();
        g.fill();
        g.stroke();
        
        // Stem
        g.fillRect(-2, centerY - 8, 4, 5);
        // Base
        g.fillRect(-9, centerY - 11, 18, 3);
      } else if (item.id === 'achieve') {
        g.fillColor = this.hex('#C084FC');
        g.strokeColor = Color.WHITE;
        g.lineWidth = 1.6;
        g.circle(0, centerY + 2, 13);
        g.fill();
        g.stroke();

        g.fillColor = this.hex('#FFD700');
        g.circle(0, centerY + 2, 6);
        g.fill();
      }

      // Clean single-line label below the badge
      this.createLabel(btn, 'Label', new Vec3(0, -38, 0), item.name, 18, item.border, 90, 28); // 字体 18

      this.addClick(btn, () => {
        console.log(`[HomeRoot] Clicked sidebar item: ${item.name}`);
        if (item.id === 'daily') {
          const profile = ProfileManager.getProfile();
          const signedInToday = ProfileManager.isTodaySignedin();
          const claimedDays = profile.claimedSignins || [0];
          const nextDayIndex = claimedDays.length;

          const daysConfig = [
            { day: 1, reward: 50, label: '50 钻石', icon: '💎' },
            { day: 2, reward: 100, label: '100 钻石', icon: '💎' },
            { day: 3, reward: 200, label: '200 钻石', icon: '💎' },
            { day: 4, reward: 0, label: '满管时空能量', icon: '⚡' },
            { day: 7, reward: 500, label: '500 钻石大礼包', icon: '🎁' },
          ];

          const lines = daysConfig.map((d, idx) => {
            const isClaimed = claimedDays.includes(idx);
            let status = '待解锁 🔒';
            if (isClaimed) {
              status = '已领取 ✔';
            } else if (idx === nextDayIndex) {
              status = signedInToday ? '明日解锁 🔒' : '今日可领 ⭐';
            }
            return `${d.icon}  第 ${d.day} 天:  ${d.label}  ——  [ ${status} ]`;
          });

          const currentTodayReward = daysConfig[nextDayIndex % daysConfig.length]?.reward || 100;
          const btnText = signedInToday ? '✨   今 日 已 签 到  (明 日 再 来)' : `✨   立 即 领 取 今 日 ${currentTodayReward} 💎`;
          const btnBgHex = signedInToday ? '#334155' : '#991B1B';
          const borderHex = signedInToday ? '#64748B' : '#FDE047';

          this.showPopup('🎁   每 日 签 到 奖 励', lines, btnText, borderHex, btnBgHex, () => {
            if (ProfileManager.isTodaySignedin()) {
              WeChatService.showToast('今天已经签到过了，明天再来哦！', 'none');
              return;
            }
            ProfileManager.claimDailySignin(nextDayIndex, currentTodayReward);
            this.rebuildUI();
            WeChatService.showToast(`签到成功 +${currentTodayReward} 💎`, 'success');
          });
        } else if (item.id === 'rank') {
          const profile = ProfileManager.getProfile();
          const currentLevel = profile.levelProgress + 1;
          const stars = currentLevel * 3 - 2; // Approximate stars count
          this.showPopup('🏆   微 信 好 友 排 行 榜', [
            '🥇  1. 微信好友·星辰大师 —— 通关 88 关 (260 ⭐)',
            `🥈  2. 你 (流光开拓者) —— 通关 ${currentLevel} 关 (${stars} ⭐)`,
            '🥉  3. 微信好友·阳光微风 —— 通关 42 关 (120 ⭐)',
            '🏅  4. 微信好友·极光旅人 —— 通关 35 关 (98 ⭐)',
            '🏅  5. 微信好友·暗夜流星 —— 通关 19 关 (50 ⭐)'
          ], '💬   邀 请 微 信 好 友 冲 榜', '#60A5FA', '#065F46');
        } else if (item.id === 'achieve') {
          const profile = ProfileManager.getProfile();
          const achievements = [
            { id: 'first_start', name: '[初次启航] 完成第 1 关', reward: 50, isUnlocked: profile.levelProgress >= 1, progressText: profile.levelProgress >= 1 ? '已达成 ✔' : '进度 0/1' },
            { id: 'bullet_master', name: '[子弹时间大师] 触发极限减速 50 次', reward: 100, isUnlocked: false, progressText: '进度 38/50' },
            { id: 'high_star', name: '[高分王者] 累计获得 100 颗星', reward: 200, isUnlocked: profile.levelProgress >= 30, progressText: profile.levelProgress >= 30 ? '已达成 ✔' : `进度 ${Math.min(100, (profile.levelProgress + 1) * 3)}/100` },
            { id: 'endless', name: '[流光无尽] 无尽模式突破 2000m', reward: 150, isUnlocked: true, progressText: '已达成 ✔' },
            { id: 'theme_collector', name: '[全图鉴收藏] 解锁 3 种太空流光主题', reward: 300, isUnlocked: false, progressText: '进度 1/3' },
          ];

          const claimableItems: { id: string; reward: number }[] = [];
          const lines: string[] = [];

          achievements.forEach((ach) => {
            const isClaimed = ProfileManager.isAchievementClaimed(ach.id);
            if (isClaimed) {
              lines.push(`🏅  ${ach.name} —— [ 已领取 ✔ ]`);
            } else if (ach.isUnlocked) {
              claimableItems.push({ id: ach.id, reward: ach.reward });
              lines.push(`🏅  ${ach.name} —— [ 领取 ${ach.reward} 💎 ]`);
            } else {
              lines.push(`🏅  ${ach.name} —— [ ${ach.progressText} ]`);
            }
          });

          const totalUnclaimed = claimableItems.reduce((sum, i) => sum + i.reward, 0);
          const btnText = totalUnclaimed > 0 ? `🏆   一 键 领 取 (${totalUnclaimed} 💎)` : '🏆   所 有 成 就 已 领 取';
          const btnBgHex = totalUnclaimed > 0 ? '#4C1D95' : '#1E293B';
          const borderHex = totalUnclaimed > 0 ? '#C084FC' : '#475569';

          this.showPopup('⭐   荣 誉 勋 章 与 成 就', lines, btnText, borderHex, btnBgHex, () => {
            if (totalUnclaimed <= 0) {
              WeChatService.showToast('暂无未领取的成就奖励！', 'none');
              return;
            }
            const claimedAmount = ProfileManager.claimAchievements(claimableItems);
            this.rebuildUI();
            WeChatService.showToast(`成功领取成就奖励 +${claimedAmount} 💎`, 'success');
          });
        }
      });
    });
  }

  private showPopup(title: string, lines: string[], btnText: string, borderHex: string, btnBgHex: string, onActionClick?: () => void): void {
    if (!this.popupRoot) return;
    this.popupRoot.active = true;
    this.popupRoot.setSiblingIndex(this.node.children.length - 1);
    this.popupRoot.destroyAllChildren();

    const isRose = this.currentTheme === 1;
    const isGold = this.currentTheme === 2;
    const isCheckin = title.indexOf('签到') >= 0;
    const isLeaderboard = title.indexOf('排行') >= 0;
    const isReinforce = title.indexOf('强化') >= 0;
    const isAchievement = title.indexOf('成就') >= 0;

    // 1. Backdrop overlay
    const overlay = this.createNode('Overlay', new Vec3(0, 0, 0), this.popupRoot);
    this.ensureTransform(overlay, 1280, 720);
    const og = overlay.addComponent(Graphics);
    og.fillColor = new Color(5, 10, 25, 185);
    og.rect(-640, -360, 1280, 720);
    og.fill();
    this.addClick(overlay, () => {
      this.popupRoot!.active = false;
      if (this.subContextContainer) {
        WeChatService.hideFriendLeaderboard(this.subContextContainer);
        this.subContextContainer = null;
      }
    });

    const dialogHeight = 500;
    const halfDialogH = dialogHeight / 2;

    // 2. Glassmorphic Dialog Box (宽度 620 符合 86% 规范，圆角 32)
    const dialog = this.createNode('Dialog', new Vec3(0, 15, 0), this.popupRoot);
    this.ensureTransform(dialog, 620, dialogHeight);
    const dg = dialog.addComponent(Graphics);
    dg.fillColor = this.hex('#111827'); // 极暗深灰蓝 (BG100)
    ((dg.fillColor) as any).a = 242;    // 95% 不透明度
    dg.roundRect(-310, -halfDialogH, 620, dialogHeight, 32); // 32px 圆角
    dg.fill();
    dg.strokeColor = this.hex(borderHex);
    dg.lineWidth = 2.4;
    dg.stroke();

    dialog.on(Node.EventType.TOUCH_END, (e: EventTouch) => {
      e.propagationStopped = true;
    });

    // 3. Title & Close Button
    this.createLabel(dialog, 'Title', new Vec3(0, halfDialogH - 45, 0), title, 24, '#FFFFFF', 420, 40); // Size 24
    const closeBtn = this.createNode('CloseBtn', new Vec3(270, halfDialogH - 45, 0), dialog); // 270 使得按钮外侧留距正好 30-40px
    this.ensureTransform(closeBtn, 40, 40);
    const cg = closeBtn.addComponent(Graphics);
    cg.fillColor = this.hex('#1E293B');
    cg.circle(0, 0, 18);
    cg.fill();
    cg.strokeColor = this.hex(borderHex);
    cg.lineWidth = 1.8;
    cg.stroke();
    this.createLabel(closeBtn, 'Icon', new Vec3(0, 1, 0), '✖', 16, '#FFFFFF', 32, 32);
    this.addClick(closeBtn, () => {
      this.popupRoot!.active = false;
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
        let itemBg = '#1E293B';
        let itemBgAlpha = 210;
        let itemBorder = '#334155';
        let borderWidth = 1.2;
        let textColor = '#E2E8F0';
        let rowHeight = 46;
        let yOffset = (halfDialogH - 115) - idx * 60; // 默认垂直排版
        let fontSize = 17;

        if (isCheckin) {
          rowHeight = 48;
          yOffset = (halfDialogH - 110) - idx * 62;
          if (line.indexOf('今日可领') >= 0) {
            itemBg = isRose ? '#4C1D95' : (isGold ? '#7C2D12' : '#1E3A8A');
            itemBgAlpha = 250;
            itemBorder = borderHex; 
            borderWidth = 2.4;
            textColor = '#FFFBEB';
            fontSize = 18;
          } else if (line.indexOf('已领取') >= 0) {
            itemBg = '#0F172A';
            itemBgAlpha = 110;
            textColor = '#64748B';
            itemBorder = '#1E293B';
            borderWidth = 1.0;
          } else {
            itemBg = '#0F172A';
            itemBgAlpha = 140;
            textColor = '#475569';
            itemBorder = '#1E293B';
            borderWidth = 1.0;
          }
        } else if (isLeaderboard) {
          rowHeight = 48;
          yOffset = (halfDialogH - 110) - idx * 62;
          if (idx === 0) {
            itemBg = '#451A03';
            itemBgAlpha = 245;
            itemBorder = '#F59E0B';
            borderWidth = 2.2;
            textColor = '#FDE047';
            fontSize = 18;
          } else if (idx === 1) {
            itemBg = '#1E293B';
            itemBgAlpha = 240;
            itemBorder = '#94A3B8';
            borderWidth = 1.8;
            textColor = '#F8FAFC';
          } else if (idx === 2) {
            itemBg = '#3B2314';
            itemBgAlpha = 220;
            itemBorder = '#B45309';
            borderWidth = 1.4;
            textColor = '#FFF7ED';
          }
        } else if (isReinforce) {
          rowHeight = 50;
          yOffset = (halfDialogH - 110) - idx * 64; 
          if (line.indexOf('激励视频广告') >= 0) {
            itemBg = '#311062';
            itemBgAlpha = 245;
            itemBorder = '#C084FC';
            borderWidth = 2.2;
            textColor = '#FAF5FF';
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

    this.addClick(heroBtn, () => {
      console.log(`[HomeRoot] Popup action clicked: ${btnText}`);
      this.popupRoot!.active = false;
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

    const isRose = this.currentTheme === 1;
    const isGold = this.currentTheme === 2;

    const jBg = isRose ? '#4C1D95' : (isGold ? '#7C2D12' : '#131C39');
    const jBorder = isRose ? '#E879F9' : (isGold ? '#FDE047' : '#00D4FF');

    const eBg = isRose ? '#581C87' : (isGold ? '#9A3412' : '#1E2A4F');
    const eBorder = isRose ? '#C4B5FD' : (isGold ? '#FBBF24' : '#60A5FA');

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
    const currentLevel = profile.levelProgress + 1;
    this.createLabel(journeyCard, 'Title', new Vec3(-45, 2, 0), '继 续 冒 险', 32, '#FFFFFF', 300, 48); // 字体 32
    this.createLabel(journeyCard, 'Sub', new Vec3(195, 2, 0), `第 ${currentLevel} / 120 关`, 19, jBorder, 136, 32);  // 字体 19

    this.addClick(journeyCard, () => {
      console.log('[HomeRoot] Clicked Primary CTA: Journey Mode!');
      if (this.onStartJourneyCallback) this.onStartJourneyCallback();
    });

    // 专属黄金/霓虹主按钮呼吸动效
    tween(journeyCard)
      .to(1.4, { scale: new Vec3(1.03, 1.03, 1) }, { easing: 'sineInOut' })
      .to(1.4, { scale: new Vec3(1.0, 1.0, 1) }, { easing: 'sineInOut' })
      .union()
      .repeatForever()
      .start();

    // 2. 次级入口 (Secondary CTA)：极限排位 / 无尽挑战 (高度从 64 提高到 76, 圆角 38)
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
    this.createLabel(endlessCard, 'Sub', new Vec3(153, 2, 0), '巅峰 2840m', 16, eBorder, 100, 28); // 字体 16

    this.addClick(endlessCard, () => {
      console.log('[HomeRoot] Clicked Secondary CTA: Endless Mode!');
      if (this.onStartEndlessCallback) this.onStartEndlessCallback();
    });
  }

  private createBottomFeatureRow(halfH: number): void {
    // 优化：使用对称的 32px 安全页边距，容器宽度 656px，按钮尺寸提升至 208x88，圆角 26，两端完美贴齐 -328 和 328
    const pillsRoot = this.createNode('FeatureRowRoot', new Vec3(0, -halfH + 146, 0), this.node);
    this.ensureTransform(pillsRoot, 656, 88);

    const isRose = this.currentTheme === 1;
    const isGold = this.currentTheme === 2;

    const items = [
      { id: 'adCard', title: '强 化 手 牌', sub: '永久 +1 卡槽', icon: '📺', x: -224, bg: isRose ? '#3B0764' : (isGold ? '#451A03' : '#131C39'), border: isRose ? '#A78BFA' : (isGold ? '#FCD34D' : '#38BDF8'), col: '#E9D5FF' },
      { id: 'energy', title: '时 空 蓄 能', sub: '满血 (10/10)', icon: '⚡', x: 0, bg: isRose ? '#4C1D95' : (isGold ? '#7C2D12' : '#0B1026'), border: isRose ? '#C4B5FD' : (isGold ? '#FBBF24' : '#00D4FF'), col: '#A5F3FC' },
      { id: 'theme', title: '主 题 定 制', sub: '点击一键换色', icon: '🎨', x: 224, bg: isRose ? '#581C87' : (isGold ? '#9A3412' : '#1E2A4F'), border: isRose ? '#A78BFA' : (isGold ? '#FCD34D' : '#F472B6'), col: '#FBCFE8' }
    ];

    items.forEach((p, idx) => {
      const node = this.createNode(`FeatureMini_${idx}`, new Vec3(p.x, 0, 0), pillsRoot);
      this.ensureTransform(node, 208, 88); // 提升至 208x88
      const g = node.addComponent(Graphics);
      g.fillColor = this.hex(p.bg);
      ((g.fillColor) as any).a = 210;
      g.roundRect(-104, -44, 208, 88, 26); // 88高度，26圆角
      g.fill();
      const bCol = this.hex(p.border);
      bCol.a = 120;
      g.strokeColor = bCol;
      g.lineWidth = 1.6;
      g.stroke();

      // Top specular highlight line
      g.strokeColor = new Color(255, 255, 255, 75);
      g.lineWidth = 1.2;
      g.moveTo(-84, 40);
      g.lineTo(84, 40);
      g.stroke();

      // Custom Vector Icon instead of Emoji Label
      const iconX = -64;
      if (p.id === 'adCard') {
        g.fillColor = this.hex('#38BDF8');
        g.strokeColor = Color.WHITE;
        g.lineWidth = 1.5;
        g.roundRect(iconX - 14, -10, 28, 20, 4);
        g.fill();
        g.stroke();
        
        g.fillColor = Color.WHITE;
        g.moveTo(iconX - 3, -5);
        g.lineTo(iconX - 3, 5);
        g.lineTo(iconX + 5, 0);
        g.close();
        g.fill();

        g.moveTo(iconX - 8, 10);
        g.lineTo(iconX - 14, 16);
        g.moveTo(iconX + 8, 10);
        g.lineTo(iconX + 14, 16);
        g.stroke();
      } else if (p.id === 'energy') {
        g.fillColor = this.hex('#FBBF24');
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
      } else if (p.id === 'theme') {
        g.fillColor = this.hex('#EC4899');
        g.strokeColor = Color.WHITE;
        g.lineWidth = 1.5;
        g.circle(iconX, 0, 13);
        g.fill();
        g.stroke();

        g.fillColor = this.hex('#3B82F6');
        g.circle(iconX - 4, 4, 3);
        g.fill();
        g.fillColor = this.hex('#10B981');
        g.circle(iconX + 4, -4, 3);
        g.fill();
        g.fillColor = this.hex('#F59E0B');
        g.circle(iconX, -2, 3);
        g.fill();
      }

      this.createLabel(node, 'Title', new Vec3(20, 15, 0), p.title, 21, '#FFFFFF', 120, 26); // 字体 21
      this.createLabel(node, 'Sub', new Vec3(20, -15, 0), p.sub, 16, p.col, 120, 22); // 字体 16

      this.addClick(node, () => {
        console.log(`[HomeRoot] Clicked mini feature: ${p.title}`);
        if (idx === 2) {
          if (this.onOpenSettingsCallback) this.onOpenSettingsCallback();
        } else if (idx === 0) {
          this.showPopup('🔯   强 化 手 牌 与 技 能', [
            '🎴  当前手牌容量:  4 张卡槽 —— [ 已达到标准容量 ]',
            '📺  观看激励视频广告:  解锁第 5 张永久手牌槽位！',
            '⚡  开局预置水晶:  每局自动携带 1 颗拐角水晶',
            '🛡  护盾加持:  抵消一次太空浮岛坠落惩罚', // 去除变体选择符
            '💎  使用 300 钻石:  立即兑换 3 次强化道具'
          ], '📺   看 广 告 永久 +1 卡 槽', '#A78BFA', '#312E81', () => {
            WeChatService.showVideoAd(() => {
              ProfileManager.addDiamonds(100);
              this.rebuildUI();
              WeChatService.showToast('广告观看完成，奖励 +100 💎', 'success');
            });
          });
        } else if (idx === 1) {
          this.showPopup('⏱   时 空 蓄 能 池 状 态', [ // 去除变体选择符
            '⚡  当前能量值:  8 / 10  (精力充沛 ⚡)',
            '⏱  恢复速度:  每 10 分钟自动恢复 1 点时空能量', // 去除变体选择符
            '💡  消耗提示:  每次挑战旅途模式关卡消耗 1 点能量',
            '♾  无尽模式:  不消耗任何能量，随时畅快开玩！', // 去除变体选择符
            '💎  能量补给包:  消耗 50 钻石即可瞬间回满 10 点！'
          ], '⚡   消 耗 50 💎 瞬 间 回 满', '#00F0FF', '#004D61', () => {
            const profile = ProfileManager.getProfile();
            if (profile.diamonds >= 50) {
              ProfileManager.addDiamonds(-50);
              ProfileManager.addEnergy(10);
              this.rebuildUI();
              WeChatService.showToast('时空能量已完全恢复满格！', 'success');
            } else {
              WeChatService.showToast('晶核钻石不足 50，无法购买！', 'none');
            }
          });
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
