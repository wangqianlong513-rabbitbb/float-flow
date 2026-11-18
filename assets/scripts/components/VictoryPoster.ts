import { _decorator, Color, Component, EventTouch, Graphics, Label, Layers, Node, tween, UITransform, Vec3, view } from 'cc';
import { WeChatService } from '../wx/WeChatService';
import { ShareService } from '../wx/ShareService';
import { ProfileManager } from '../core/ProfileManager';
import { AdService } from '../wx/AdService';
import { EngagementService } from '../core/EngagementService';
import { getUiPalette } from '../ui/UiTheme';

const { ccclass } = _decorator;

@ccclass('VictoryPoster')
export class VictoryPoster extends Component {
  public onCloseCallback?: () => void;
  public onNextLevelCallback?: () => void;

  private posterNode: Node | null = null;
  private routeGlowNode: Node | null = null;
  private levelNameLabel: Label | null = null;
  private starsLabel: Label | null = null;
  private starBannerLabel: Label | null = null;
  private rewardLabel: Label | null = null;
  private beatFriendLabel: Label | null = null;
  private doubleRewardBtn: Node | null = null;
  private doubleRewardTextLabel: Label | null = null;
  private hasClaimedDouble = false;
  private currentLevelId = 1;
  private currentLevelName = '';
  private currentStars = 3;
  private currentMoves = 1;

  protected onLoad(): void {
    console.log('[FloatFlow] VictoryPoster onLoad');
    this.node.layer = Layers.Enum.UI_2D;
    this.ensureTransform(this.node, 1280, 720);
    this.node.destroyAllChildren();

    // 1. 纯净暗化深海遮罩（82% 不透明度，阻绝底层杂乱干扰）
    const overlay = this.createNode('Overlay', new Vec3(0, 0, 0), this.node);
    const overlaySize = view.getVisibleSize();
    this.ensureTransform(overlay, overlaySize.width, overlaySize.height);
    const og = overlay.addComponent(Graphics);
    og.fillColor = new Color(3, 8, 20, 215);
    og.rect(-overlaySize.width / 2, -overlaySize.height / 2, overlaySize.width, overlaySize.height);
    og.fill();
    overlay.on(Node.EventType.TOUCH_END, () => {
      this.closePoster();
    });

    // 2. 主通关水晶面板（尺寸 500 x 650，预留充足垂直呼吸空间）
    const poster = this.createNode('PosterBox', new Vec3(0, 0, 0), this.node);
    this.ensureTransform(poster, 500, 650);
    this.posterNode = poster;

    const palette = this.getPalette();
    const pg = poster.addComponent(Graphics);
    // 梦幻水晶面板底板
    pg.fillColor = this.hex(palette.panel);
    ((pg.fillColor) as any).a = 250;
    pg.roundRect(-250, -325, 500, 650, 26);
    pg.fill();

    // 极浅半透明内衬
    pg.fillColor = this.hex(palette.panelSoft);
    ((pg.fillColor) as any).a = 70;
    pg.roundRect(-236, -311, 472, 622, 20);
    pg.fill();

    // 顶部水晶冰晶反光高光微棱
    pg.fillColor = new Color(255, 255, 255, 30);
    pg.roundRect(-220, 302, 440, 6, 3);
    pg.fill();

    // 低调内敛的水晶边框
    pg.strokeColor = this.hex(palette.panelBorder);
    pg.lineWidth = 1.8;
    pg.roundRect(-250, -325, 500, 650, 26);
    pg.stroke();

    // 阻止点击弹窗内容意外关闭
    poster.on(Node.EventType.TOUCH_END, (e: EventTouch) => {
      e.propagationStopped = true;
    });

    // 3. 头部荣誉与星级区域 (Y = 280 ~ 160)
    this.createHeader(poster);

    // 4. 浮岛光轨微缩复盘沙盘 (Y = 50)
    this.createRouteShowcase(poster);

    // 5. 战绩与奖励单卡 (Y = -68)
    this.createStatsCard(poster);

    // 6. 操作按钮区 (Y = -145 到 -220)
    this.createActionButtons(poster);
  }

  public showVictory(levelId: number, levelName: string, stars: number, moves: number): void {
    console.log(`[VictoryPoster] Show Victory for ${levelName}: ${stars} Stars, ${moves} Moves`);
    this.currentLevelId = levelId;
    this.currentLevelName = levelName;
    this.currentStars = Math.max(1, Math.min(3, stars));
    this.currentMoves = moves;
    this.node.active = true;
    WeChatService.vibrateShort('medium');

    this.hasClaimedDouble = false;
    const baseReward = this.getBaseReward();
    const palette = this.getPalette();

    if (this.levelNameLabel) {
      this.levelNameLabel.string = levelName;
    }

    if (this.starsLabel) {
      this.starsLabel.string = '★ '.repeat(this.currentStars).trim() + (this.currentStars < 3 ? ' ☆'.repeat(3 - this.currentStars) : '');
    }

    if (this.starBannerLabel) {
      if (levelName.indexOf('今日光路') !== -1) {
        this.starBannerLabel.string = `今日挑战完成 · ${moves} 步接通`;
      } else if (levelName.indexOf('无尽') !== -1) {
        this.starBannerLabel.string = `突破第 ${stars} 阶 · 得分 ${moves} 分`;
      } else {
        const desc = this.currentStars === 3 ? '完美通关 · 光轨极简通畅' : (this.currentStars === 2 ? '顺利接通 · 仍有更佳步数' : '成功破局 · 步数稍长');
        this.starBannerLabel.string = `${desc} (${moves} 步)`;
      }
    }

    if (this.rewardLabel) {
      this.rewardLabel.string = `💎 晶核奖励 +${baseReward}`;
    }

    if (this.beatFriendLabel) {
      const beatPercent = levelName.indexOf('今日光路') !== -1
        ? Math.min(99, 66 + stars * 9 + Math.max(0, 6 - moves) * 3)
        : (levelName.indexOf('无尽') !== -1 ? Math.min(99, 62 + stars * 5) : Math.min(99, 58 + stars * 11 + Math.max(0, 8 - moves) * 3));
      this.beatFriendLabel.string = `⚡ 击败了 ${beatPercent}% 好友`;
    }

    if (this.doubleRewardTextLabel) {
      this.doubleRewardTextLabel.string = `💎 双倍领 +${baseReward}`;
      this.doubleRewardTextLabel.color = this.hex(palette.gold);
    }

    if (this.doubleRewardBtn) {
      const dg = this.doubleRewardBtn.getComponent(Graphics);
      if (dg) {
        dg.clear();
        dg.fillColor = this.hex(palette.panelSoft);
        dg.roundRect(-103, -23, 206, 46, 16);
        dg.fill();
        dg.strokeColor = this.hex(palette.gold);
        dg.lineWidth = 1.6;
        dg.roundRect(-103, -23, 206, 46, 16);
        dg.stroke();
      }
    }

    if (this.posterNode) {
      this.posterNode.setScale(new Vec3(0.7, 0.7, 1));
      if (ProfileManager.isPowerSaveMode()) {
        this.posterNode.setScale(new Vec3(1, 1, 1));
      } else {
        tween(this.posterNode)
          .to(0.3, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
          .start();
      }
    }
  }

  private closePoster(): void {
    console.log('[VictoryPoster] Close Poster');
    WeChatService.vibrateShort('light');
    if (this.posterNode) {
      tween(this.posterNode)
        .to(0.18, { scale: new Vec3(0.7, 0.7, 1) }, { easing: 'backIn' })
        .call(() => {
          this.node.active = false;
          if (this.onCloseCallback) this.onCloseCallback();
        })
        .start();
    } else {
      this.node.active = false;
      if (this.onCloseCallback) this.onCloseCallback();
    }
  }

  private createHeader(parent: Node): void {
    const palette = this.getPalette();

    // 优雅关闭按钮 (X = 215, Y = 288)
    const closeBtn = this.createNode('CloseBtn', new Vec3(215, 288, 0), parent);
    this.ensureTransform(closeBtn, 42, 42);
    const cg = closeBtn.addComponent(Graphics);
    cg.fillColor = this.hex(palette.panelSoft);
    ((cg.fillColor) as any).a = 230;
    cg.circle(0, 0, 17);
    cg.fill();
    cg.strokeColor = this.hex(palette.panelBorder);
    cg.lineWidth = 1.4;
    cg.stroke();
    this.createLabel(closeBtn, 'Icon', new Vec3(0, 1, 0), '✕', 16, palette.muted, 32, 32);
    closeBtn.on(Node.EventType.TOUCH_END, () => {
      this.closePoster();
    });

    // 1. 主通关大标题 (Y = 276, 28pt 奖励金，去除背后杂乱色块)
    this.createLabel(parent, 'Title', new Vec3(0, 276, 0), '★ 恭 喜 通 关 ★', 28, palette.gold, 380, 36);

    // 2. 关卡名称小标题 (Y = 240, 20pt 冰川蓝)
    this.levelNameLabel = this.createLabel(parent, 'LevelName', new Vec3(0, 240, 0), '第 1 关 · 光信出发', 20, palette.glacier, 380, 28);

    // 3. 醒目金色星级展示 (Y = 196, 36pt 纯金光辉)
    this.starsLabel = this.createLabel(parent, 'Stars', new Vec3(0, 196, 0), '★  ★  ★', 36, palette.gold, 300, 42);

    // 4. 评价与步数信息 (Y = 162, 16pt 静谧灰蓝)
    this.starBannerLabel = this.createLabel(parent, 'StarBanner', new Vec3(0, 162, 0), '完美通关 · 光轨极简通畅 (1 步)', 16, palette.muted, 380, 24);
  }

  private createRouteShowcase(parent: Node): void {
    const showcaseRoot = this.createNode('RouteShowcase', new Vec3(0, 48, 0), parent);
    this.ensureTransform(showcaseRoot, 340, 170);
    const palette = this.getPalette();
    const g = showcaseRoot.addComponent(Graphics);

    // 微缩 3x3 等距浮岛基座
    const tileW = 72;
    const tileH = 40;
    const depth = 13;
    const coords = [
      { r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 },
      { r: 1, c: 0 }, { r: 1, c: 1 }, { r: 1, c: 2 },
      { r: 2, c: 0 }, { r: 2, c: 1 }, { r: 2, c: 2 }
    ];

    coords.forEach(({ r, c }) => {
      const x = (c - r) * (tileW / 2);
      const y = (c + r) * (tileH / 2) - 45;
      const isGoal = r === 2 && c === 2;

      if (isGoal) {
        // 终点圣所金色晶石
        this.drawIsometricBlock(g, this.hex(palette.gold), this.hex('#854D0E'), this.hex('#B45309'), this.hex('#FFFFFF'), 1.8, depth, tileW, tileH, y, x);
      } else {
        // 通透深海晶石底座
        const topCol = (r + c) % 2 === 0 ? this.hex('#0D2238') : this.hex('#14314E');
        const leftCol = this.hex('#091B2E');
        const rightCol = this.hex('#081626');
        this.drawIsometricBlock(g, topCol, leftCol, rightCol, this.hex(palette.panelBorder), 1.2, depth, tileW, tileH, y, x);
      }
    });

    // 连通光轨流光线 (0,0) -> (0,1) -> (1,1) -> (1,2) -> (2,2)
    const routeGlow = this.createNode('RouteGlow', new Vec3(0, 0, 0), showcaseRoot);
    this.ensureTransform(routeGlow, 340, 170);
    this.routeGlowNode = routeGlow;
    const rg = routeGlow.addComponent(Graphics);

    const getCoordPos = (r: number, c: number) => {
      const x = (c - r) * (tileW / 2);
      const y = (c + r) * (tileH / 2) - 45;
      return { x, y };
    };

    const p0 = getCoordPos(0, 0);
    const p1 = getCoordPos(0, 1);
    const p2 = getCoordPos(1, 1);
    const p3 = getCoordPos(1, 2);
    const p4 = getCoordPos(2, 2);

    // 柔和极光光晕
    const routeOuter = this.hex(palette.cyan);
    rg.strokeColor = new Color(routeOuter.r, routeOuter.g, routeOuter.b, 110);
    rg.lineWidth = 8;
    rg.moveTo(p0.x, p0.y);
    rg.lineTo(p1.x, p1.y);
    rg.lineTo(p2.x, p2.y);
    rg.lineTo(p3.x, p3.y);
    rg.lineTo(p4.x, p4.y);
    rg.stroke();

    // 纯白核心光路
    rg.strokeColor = Color.WHITE;
    rg.lineWidth = 3.2;
    rg.moveTo(p0.x, p0.y);
    rg.lineTo(p1.x, p1.y);
    rg.lineTo(p2.x, p2.y);
    rg.lineTo(p3.x, p3.y);
    rg.lineTo(p4.x, p4.y);
    rg.stroke();

    // 终点光核
    rg.fillColor = Color.WHITE;
    rg.circle(p4.x, p4.y, 9);
    rg.fill();
    rg.strokeColor = this.hex(palette.gold);
    rg.lineWidth = 2.4;
    rg.circle(p4.x, p4.y, 14);
    rg.stroke();

    if (!ProfileManager.isPowerSaveMode()) {
      tween(routeGlow)
        .to(1.1, { scale: new Vec3(1.03, 1.03, 1) }, { easing: 'sineInOut' })
        .to(1.1, { scale: new Vec3(0.97, 0.97, 1) }, { easing: 'sineInOut' })
        .union()
        .repeatForever()
        .start();
    }
  }

  private createStatsCard(parent: Node): void {
    // 整合为单块干净通透的战绩胶囊卡片 (Y = -68, 高度 54)
    const card = this.createNode('StatsCard', new Vec3(0, -68, 0), parent);
    this.ensureTransform(card, 430, 54);
    const palette = this.getPalette();
    const g = card.addComponent(Graphics);

    g.fillColor = this.hex(palette.panelSoft);
    ((g.fillColor) as any).a = 210;
    g.roundRect(-215, -27, 430, 54, 16);
    g.fill();

    g.strokeColor = this.hex(palette.panelBorder);
    g.lineWidth = 1.3;
    g.roundRect(-215, -27, 430, 54, 16);
    g.stroke();

    // 中间分割虚线
    g.strokeColor = new Color(255, 255, 255, 30);
    g.lineWidth = 1.0;
    g.moveTo(0, -18);
    g.lineTo(0, 18);
    g.stroke();

    // 左侧：晶核奖励 (字号 18, 奖励金)
    this.rewardLabel = this.createLabel(card, 'RewardText', new Vec3(-108, 0, 0), '💎 晶核奖励 +30', 18, palette.gold, 200, 30);

    // 右侧：击败好友 (字号 17, 成功绿)
    this.beatFriendLabel = this.createLabel(card, 'BeatText', new Vec3(108, 0, 0), '⚡ 击败了 92% 好友', 17, palette.success, 200, 30);
  }

  private createActionButtons(parent: Node): void {
    const palette = this.getPalette();

    // 1. 第一优先级核心 CTA：继续下一关 (Y = -145, 宽度 430, 高度 54, 极光青突出)
    const nextBtn = this.createNode('NextLevelBtn', new Vec3(0, -145, 0), parent);
    this.ensureTransform(nextBtn, 430, 54);
    const ng = nextBtn.addComponent(Graphics);

    ng.fillColor = this.hex(palette.cyan);
    ng.roundRect(-215, -27, 430, 54, 27);
    ng.fill();

    ng.strokeColor = Color.WHITE;
    ng.lineWidth = 1.6;
    ng.roundRect(-215, -27, 430, 54, 27);
    ng.stroke();

    this.createLabel(nextBtn, 'Text', new Vec3(0, 1, 0), '▶   继 续 下 一 关', 22, '#FFFFFF', 390, 36);

    nextBtn.on(Node.EventType.TOUCH_END, () => {
      console.log('[VictoryPoster] Clicked Next Level!');
      WeChatService.vibrateShort('light');
      this.node.active = false;
      if (this.onNextLevelCallback) {
        this.onNextLevelCallback();
      } else if (this.onCloseCallback) {
        this.onCloseCallback();
      }
    });

    if (!ProfileManager.isPowerSaveMode()) {
      tween(nextBtn)
        .to(1.3, { scale: new Vec3(1.025, 1.025, 1) }, { easing: 'sineInOut' })
        .to(1.3, { scale: new Vec3(1.0, 1.0, 1) }, { easing: 'sineInOut' })
        .union()
        .repeatForever()
        .start();
    }

    // 2. 次级操作行 (Y = -218)：双倍领取 + 分享光轨 (并排平衡排列，绝无重叠)
    // 左：双倍领钻石 (宽 206, 高 46)
    const doubleBtn = this.createNode('DoubleRewardBtn', new Vec3(-112, -218, 0), parent);
    this.ensureTransform(doubleBtn, 206, 46);
    const dg = doubleBtn.addComponent(Graphics);
    dg.fillColor = this.hex(palette.panelSoft);
    dg.roundRect(-103, -23, 206, 46, 16);
    dg.fill();
    dg.strokeColor = this.hex(palette.gold);
    dg.lineWidth = 1.6;
    dg.roundRect(-103, -23, 206, 46, 16);
    dg.stroke();
    this.doubleRewardTextLabel = this.createLabel(doubleBtn, 'Text', new Vec3(0, 1, 0), '💎 双倍领 +30', 16, palette.gold, 190, 30);
    this.doubleRewardBtn = doubleBtn;

    doubleBtn.on(Node.EventType.TOUCH_END, () => {
      if (this.hasClaimedDouble) return;
      console.log('[VictoryPoster] Clicked Double Reward');
      WeChatService.vibrateShort('light');
      const baseReward = this.getBaseReward();

      AdService.showRewarded('reward_multiplier').then((res) => {
        if (res.completed) {
          const granted = ProfileManager.grantRewardedAdDiamonds(res.transactionId || '', `victory_${this.currentLevelId}`, baseReward, 8);
          this.hasClaimedDouble = this.hasClaimedDouble || granted;
          WeChatService.showToast(granted ? `双倍领奖成功！晶核 +${baseReward} 💎` : '本次奖励已领取', granted ? 'success' : 'none');
          if (this.doubleRewardTextLabel) {
            this.doubleRewardTextLabel.string = '已领双倍晶核 💎';
            this.doubleRewardTextLabel.color = this.hex(palette.muted);
          }
          if (dg) {
            dg.clear();
            dg.fillColor = this.hex('#1A2536');
            dg.roundRect(-103, -23, 206, 46, 16);
            dg.fill();
            dg.strokeColor = this.hex('#334155');
            dg.lineWidth = 1.2;
            dg.stroke();
          }
        } else {
          WeChatService.showToast('广告观看未完成，无法翻倍！', 'none');
        }
      });
    });

    // 右：分享光轨战绩 (宽 206, 高 46)
    const shareBtn = this.createNode('ShareBtn', new Vec3(112, -218, 0), parent);
    this.ensureTransform(shareBtn, 206, 46);
    const sg = shareBtn.addComponent(Graphics);
    sg.fillColor = this.hex(palette.panelSoft);
    sg.roundRect(-103, -23, 206, 46, 16);
    sg.fill();
    sg.strokeColor = this.hex(palette.success);
    sg.lineWidth = 1.6;
    sg.roundRect(-103, -23, 206, 46, 16);
    sg.stroke();
    this.createLabel(shareBtn, 'Text', new Vec3(0, 1, 0), '✦ 分享光轨战绩', 16, palette.success, 190, 30);

    shareBtn.on(Node.EventType.TOUCH_END, () => {
      console.log('[VictoryPoster] Clicked Share to Friends');
      WeChatService.vibrateShort('light');
      const level = { id: this.currentLevelId, name: this.currentLevelName } as any;
      const beautyScore = EngagementService.scoreBeautifulRoute(this.currentMoves, 0, false, this.currentStars);
      if (this.currentStars >= 3 || beautyScore >= 82) {
        ProfileManager.updateBeautifulRouteBest(beautyScore);
        ShareService.shareBeautifulRoute(level, this.currentMoves, beautyScore);
      } else {
        ShareService.shareFriendChallenge(level, this.currentMoves, this.currentLevelId);
      }
      WeChatService.showToast('正在调起微信分享...', 'success');
    });

    // 3. 底部哈密兔联动推荐 (Y = -272)
    const promoPill = this.createNode('PromoPill', new Vec3(0, -272, 0), parent);
    this.ensureTransform(promoPill, 430, 36);
    const pg = promoPill.addComponent(Graphics);
    pg.fillColor = this.hex('#0B1B2F');
    ((pg.fillColor) as any).a = 180;
    pg.roundRect(-215, -18, 430, 36, 18);
    pg.fill();
    pg.strokeColor = this.hex(palette.cyan);
    ((pg.strokeColor) as any).a = 80;
    pg.lineWidth = 1.0;
    pg.roundRect(-215, -18, 430, 36, 18);
    pg.stroke();
    this.createLabel(promoPill, 'PText', new Vec3(0, 1, 0), '🐰 体验哈密兔快节奏解压力作《穿针引线》➔', 14, palette.glacier, 420, 24);
    promoPill.on(Node.EventType.TOUCH_END, () => {
      WeChatService.vibrateShort('light');
      WeChatService.openMiniProgram('wxa8a598a3c86c1234', '', '正在联动唤起《穿针引线》...');
    });
  }

  private getBaseReward(): number {
    if (this.currentLevelName.indexOf('今日光路') !== -1) {
      return this.currentMoves <= 4 ? 80 : 50;
    }
    if (this.currentLevelName.indexOf('无尽') !== -1) {
      return this.currentStars * 15;
    }
    return this.currentStars * 20;
  }

  private getPalette() {
    return getUiPalette(ProfileManager.getProfile().selectedTheme || 0);
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
    label.lineHeight = Math.round(fontSize * 1.25);
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
