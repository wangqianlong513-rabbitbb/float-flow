import { _decorator, Color, Component, EventTouch, Graphics, Label, Layers, Node, tween, UITransform, Vec3 } from 'cc';
import { WeChatService } from '../wx/WeChatService';
import { ShareService } from '../wx/ShareService';

const { ccclass } = _decorator;

@ccclass('VictoryPoster')
export class VictoryPoster extends Component {
  public onCloseCallback?: () => void;
  public onNextLevelCallback?: () => void;

  private posterNode: Node | null = null;
  private routeGlowNode: Node | null = null;
  private levelNameLabel: Label | null = null;
  private starBannerLabel: Label | null = null;

  protected onLoad(): void {
    console.log('[FloatFlow] VictoryPoster onLoad');
    this.node.layer = Layers.Enum.UI_2D;
    this.ensureTransform(this.node, 1280, 720);
    this.node.destroyAllChildren();

    // 1. Semi-transparent Backdrop Overlay
    const overlay = this.createNode('Overlay', new Vec3(0, 0, 0), this.node);
    this.ensureTransform(overlay, 1280, 720);
    const og = overlay.addComponent(Graphics);
    og.fillColor = new Color(5, 10, 25, 190);
    og.rect(-640, -360, 1280, 720);
    og.fill();
    overlay.on(Node.EventType.TOUCH_END, () => {
      this.closePoster();
    });

    // 2. Main Glassmorphic Poster Frame (Size: 480 x 620)
    const poster = this.createNode('PosterBox', new Vec3(0, 0, 0), this.node);
    this.ensureTransform(poster, 480, 620);
    this.posterNode = poster;

    const pg = poster.addComponent(Graphics);
    // Deep sapphire navy glassmorphic background
    pg.fillColor = this.hex('#0B132B');
    ((pg.fillColor) as ((any)) as any).a = 248;
    pg.roundRect(-240, -310, 480, 620, 24);
    pg.fill();
    // Glowing sky blue border
    pg.strokeColor = this.hex('#3B82F6');
    pg.lineWidth = 3;
    pg.stroke();
    // Inner gold trim at top
    pg.strokeColor = this.hex('#FDE047');
    pg.lineWidth = 1.5;
    pg.moveTo(-220, 290);
    pg.lineTo(220, 290);
    pg.stroke();

    // Prevent clicks inside poster from closing dialog
    poster.on(Node.EventType.TOUCH_END, (e: EventTouch) => {
      e.propagationStopped = true;
    });

    // 3. Victory Certificate Header (Y = 240 to 170)
    this.createHeader(poster);

    // 4. Miniature Isometric Light Route Showcase (Y = 30)
    this.createRouteShowcase(poster);

    // 5. Player Stats & WeChat QR Code Footer (Y = -150)
    this.createStatsAndQR(poster);

    // 6. WeChat Green Share & Save Image Buttons (Y = -260)
    this.createBottomActions(poster);
  }

  private currentLevelName = '';
  private currentStars = 3;
  private currentMoves = 10;

  public showVictory(levelName: string, stars: number, moves: number): void {
    console.log(`[VictoryPoster] Show Victory for ${levelName}: ${stars} Stars, ${moves} Moves`);
    this.currentLevelName = levelName;
    this.currentStars = stars;
    this.currentMoves = moves;
    this.node.active = true;
    WeChatService.vibrateShort('medium');

    if (this.levelNameLabel) {
      this.levelNameLabel.string = levelName;
    }
    if (this.starBannerLabel) {
      if (levelName.indexOf('无尽') !== -1) {
        this.starBannerLabel.string = `🏆 突破: ${stars} 阶段  |  总得分: ${moves} 分`;
      } else {
        const starStr = '⭐ '.repeat(stars) + '☆ '.repeat(3 - stars);
        this.starBannerLabel.string = `${starStr}  完美通关 · 步数: ${moves} 步`;
      }
    }

    if (this.posterNode) {
      this.posterNode.setScale(new Vec3(0.6, 0.6, 1));
      tween(this.posterNode)
        .to(0.35, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
        .start();
    }
  }

  private closePoster(): void {
    console.log('[VictoryPoster] Close Poster');
    WeChatService.vibrateShort('light');
    if (this.posterNode) {
      tween(this.posterNode)
        .to(0.2, { scale: new Vec3(0.7, 0.7, 1) }, { easing: 'backIn' })
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
    // Close Button [ ✖ ] at Top Right (X = 200, Y = 265)
    const closeBtn = this.createNode('CloseBtn', new Vec3(200, 265, 0), parent);
    this.ensureTransform(closeBtn, 44, 44);
    const cg = closeBtn.addComponent(Graphics);
    cg.fillColor = this.hex('#1E293B');
    cg.circle(0, 0, 18);
    cg.fill();
    cg.strokeColor = this.hex('#60A5FA');
    cg.lineWidth = 1.8;
    cg.stroke();
    this.createLabel(closeBtn, 'Icon', new Vec3(0, 1, 0), '✖', 18, '#FFFFFF', 36, 36);

    closeBtn.on(Node.EventType.TOUCH_END, () => {
      this.closePoster();
    });

    // Golden & Violet Pulsing Aura behind Title
    const auraRoot = this.createNode('HeaderAura', new Vec3(0, 220, 0), parent);
    this.ensureTransform(auraRoot, 360, 80);
    const ag = auraRoot.addComponent(Graphics);
    ag.fillColor = this.hex('#4C1D95');
    ((ag.fillColor) as ((any)) as any).a = 150;
    ag.circle(0, 0, 70);
    ag.fill();
    ag.fillColor = this.hex('#D97706');
    ((ag.fillColor) as ((any)) as any).a = 90;
    ag.circle(0, 0, 45);
    ag.fill();

    // Top Certificate Titles
    this.createLabel(parent, 'Title', new Vec3(0, 245, 0), '✨ 恭喜通关！光轨大师达成 ✨', 28, '#FDE047', 420, 42);
    this.levelNameLabel = this.createLabel(parent, 'LevelName', new Vec3(0, 205, 0), '旅途模式 · 冰原章节 5-12', 21, '#00F0FF', 360, 32);
    this.starBannerLabel = this.createLabel(parent, 'StarBanner', new Vec3(0, 172, 0), '⭐ ⭐ ⭐   完美通关 · 步数: -- 步', 19, '#FFFFFF', 380, 28);
  }

  private createRouteShowcase(parent: Node): void {
    const showcaseRoot = this.createNode('RouteShowcase', new Vec3(0, 35, 0), parent);
    this.ensureTransform(showcaseRoot, 360, 220);

    const g = showcaseRoot.addComponent(Graphics);

    // Draw a mini 3x3 isometric stone tile board
    const tileW = 72;
    const tileH = 40;
    const depth = 14;
    const coords = [
      { r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 },
      { r: 1, c: 0 }, { r: 1, c: 1 }, { r: 1, c: 2 },
      { r: 2, c: 0 }, { r: 2, c: 1 }, { r: 2, c: 2 }
    ];

    coords.forEach(({ r, c }) => {
      const x = (c - r) * (tileW / 2);
      const y = (c + r) * (tileH / 2) - 50;
      const isGoal = r === 2 && c === 2;

      if (isGoal) {
        // Golden Goal Crystal Tile (#FDE047 / #D97706)
        this.drawIsometricBlock(g, this.hex('#FDE047'), this.hex('#B45309'), this.hex('#D97706'), this.hex('#FFFFFF'), 2, depth, tileW, tileH, y, x);
      } else {
        // Sapphire Blue Tile
        const topCol = (r + c) % 2 === 0 ? this.hex('#1E3A8A') : this.hex('#2563EB');
        const leftCol = (r + c) % 2 === 0 ? this.hex('#1E293B') : this.hex('#1E40AF');
        const rightCol = (r + c) % 2 === 0 ? this.hex('#0F172A') : this.hex('#1D4ED8');
        this.drawIsometricBlock(g, topCol, leftCol, rightCol, this.hex('#60A5FA'), 1.5, depth, tileW, tileH, y, x);
      }
    });

    // Draw Continuous Glowing Luminous Route from (0,0) -> (0,1) -> (1,1) -> (1,2) -> (2,2)
    const routeGlow = this.createNode('RouteGlow', new Vec3(0, 0, 0), showcaseRoot);
    this.ensureTransform(routeGlow, 360, 220);
    this.routeGlowNode = routeGlow;
    const rg = routeGlow.addComponent(Graphics);

    const getCoordPos = (r: number, c: number) => {
      const x = (c - r) * (tileW / 2);
      const y = (c + r) * (tileH / 2) - 50;
      return { x, y };
    };

    const p0 = getCoordPos(0, 0);
    const p1 = getCoordPos(0, 1);
    const p2 = getCoordPos(1, 1);
    const p3 = getCoordPos(1, 2);
    const p4 = getCoordPos(2, 2);

    // Magenta outer glow
    rg.strokeColor = new Color(244, 114, 182, 160);
    rg.lineWidth = 10;
    rg.moveTo(p0.x, p0.y);
    rg.lineTo(p1.x, p1.y);
    rg.lineTo(p2.x, p2.y);
    rg.lineTo(p3.x, p3.y);
    rg.lineTo(p4.x, p4.y);
    rg.stroke();

    // Electric Cyan core line
    rg.strokeColor = this.hex('#00F0FF');
    rg.lineWidth = 4;
    rg.moveTo(p0.x, p0.y);
    rg.lineTo(p1.x, p1.y);
    rg.lineTo(p2.x, p2.y);
    rg.lineTo(p3.x, p3.y);
    rg.lineTo(p4.x, p4.y);
    rg.stroke();

    // Glowing Star Sphere at Goal (p4)
    rg.fillColor = this.hex('#FFFFFF');
    rg.circle(p4.x, p4.y, 12);
    rg.fill();
    rg.strokeColor = this.hex('#FDE047');
    rg.lineWidth = 3;
    rg.circle(p4.x, p4.y, 18);
    rg.stroke();

    // Pulse animation on goal sphere
    tween(routeGlow)
      .to(0.8, { scale: new Vec3(1.06, 1.06, 1) }, { easing: 'sineInOut' })
      .to(0.8, { scale: new Vec3(0.96, 0.96, 1) }, { easing: 'sineInOut' })
      .union()
      .repeatForever()
      .start();
  }

  private createStatsAndQR(parent: Node): void {
    // Left Column: Player Stats & Ranking (X = -90, Y = -150)
    const statsRoot = this.createNode('StatsRoot', new Vec3(-90, -150, 0), parent);
    this.ensureTransform(statsRoot, 260, 110);

    this.createLabel(statsRoot, 'Badge', new Vec3(0, 36, 0), '🧑‍🚀 流光开拓者 (Lv.18)', 19, '#60A5FA', 240, 30);
    this.createLabel(statsRoot, 'Stats1', new Vec3(0, 8, 0), '🔥 连击建桥: 18 次 | ⚡ 救场: 0', 16, '#93C5FD', 250, 26);
    this.createLabel(statsRoot, 'Rank', new Vec3(0, -22, 0), '🌟 击败了微信好友 98.6% 的玩家！', 18, '#FB923C', 260, 28);

    // Right Column: WeChat Mini-Game QR Code Box (X = 140, Y = -150)
    const qrRoot = this.createNode('QRRoot', new Vec3(140, -150, 0), parent);
    this.ensureTransform(qrRoot, 100, 110);

    const qg = qrRoot.addComponent(Graphics);
    // Glassmorphic QR box (84 x 84)
    qg.fillColor = this.hex('#1E293B');
    ((qg.fillColor) as ((any)) as any).a = 230;
    qg.roundRect(-42, -32, 84, 84, 14);
    qg.fill();
    qg.strokeColor = this.hex('#60A5FA');
    qg.lineWidth = 2;
    qg.stroke();

    // Simulated WeChat Mini-Game Circular Sun/QR Pattern inside box (0, 10)
    qg.strokeColor = this.hex('#00F0FF');
    qg.lineWidth = 2.5;
    qg.circle(0, 10, 26);
    qg.stroke();
    qg.strokeColor = this.hex('#A78BFA');
    qg.lineWidth = 1.8;
    qg.circle(0, 10, 18);
    qg.stroke();
    qg.fillColor = this.hex('#FDE047');
    qg.circle(0, 10, 8);
    qg.fill();

    this.createLabel(qrRoot, 'QRText', new Vec3(0, -48, 0), '长按/扫码超越我', 15, '#93C5FD', 120, 22);
  }

  private createBottomActions(parent: Node): void {
    // Left Button: [ 💬 分享好友炫耀 ] at X = -115, Y = -260
    const shareBtn = this.createNode('ShareBtn', new Vec3(-115, -260, 0), parent);
    this.ensureTransform(shareBtn, 220, 56);
    const sg = shareBtn.addComponent(Graphics);
    sg.fillColor = this.hex('#10B981');
    sg.roundRect(-110, -28, 220, 56, 18);
    sg.fill();
    sg.strokeColor = this.hex('#6EE7B7');
    sg.lineWidth = 2;
    sg.stroke();
    this.createLabel(shareBtn, 'Text', new Vec3(0, 1, 0), '💬 分享好友炫耀', 19, '#FFFFFF', 200, 36);

    shareBtn.on(Node.EventType.TOUCH_END, () => {
      console.log('[VictoryPoster] Clicked Share to Friends -> Brag!');
      WeChatService.vibrateShort('light');
      ShareService.sharePoster(
        { id: 1, name: this.currentLevelName } as any,
        `${this.currentStars}星完美光路(${this.currentMoves}步)`
      );
      WeChatService.showToast('正在调起微信分享...', 'success');
    });

    // Right Button: [ ⏭ 继续挑战下一关 ] at X = 115, Y = -260
    const saveBtn = this.createNode('SaveBtn', new Vec3(115, -260, 0), parent);
    this.ensureTransform(saveBtn, 220, 56);
    const vg = saveBtn.addComponent(Graphics);
    vg.fillColor = this.hex('#2563EB');
    vg.roundRect(-110, -28, 220, 56, 18);
    vg.fill();
    vg.strokeColor = this.hex('#00F0FF');
    vg.lineWidth = 2;
    vg.stroke();
    this.createLabel(saveBtn, 'Text', new Vec3(0, 1, 0), '⏭ 继续挑战下一关', 19, '#FFFFFF', 200, 36);

    saveBtn.on(Node.EventType.TOUCH_END, () => {
      console.log('[VictoryPoster] Clicked Next Level!');
      WeChatService.vibrateShort('light');
      this.node.active = false;
      if (this.onNextLevelCallback) {
        this.onNextLevelCallback();
      } else {
        if (this.onCloseCallback) this.onCloseCallback();
      }
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
