import { _decorator, Color, Component, EventTouch, Graphics, Label, Layers, Node, tween, UITransform, Vec3 } from 'cc';
import { WeChatService } from '../wx/WeChatService';
import { ShareService } from '../wx/ShareService';
import { AdService } from '../wx/AdService';

const { ccclass } = _decorator;

@ccclass('ReviveModal')
export class ReviveModal extends Component {
  public onReviveCallback?: () => void;
  public onGiveUpCallback?: () => void;

  private dialogNode: Node | null = null;
  private shockwaveNode: Node | null = null;

  protected onLoad(): void {
    console.log('[FloatFlow] ReviveModal onLoad');
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
      this.giveUpAndClose();
    });

    // 2. Main Glassmorphic Dialog Box (Size: 460 x 580)
    const dialog = this.createNode('DialogBox', new Vec3(0, 0, 0), this.node);
    this.ensureTransform(dialog, 460, 580);
    this.dialogNode = dialog;

    const dg = dialog.addComponent(Graphics);
    // Dark glassmorphic background
    dg.fillColor = this.hex('#0B132B');
    ((dg.fillColor) as ((any)) as any).a = 245;
    dg.roundRect(-230, -290, 460, 580, 24);
    dg.fill();
    // Sky blue glowing border
    dg.strokeColor = this.hex('#3B82F6');
    dg.lineWidth = 2.5;
    dg.stroke();

    // Prevent clicks inside dialog from closing modal
    dialog.on(Node.EventType.TOUCH_END, (e: EventTouch) => {
      e.propagationStopped = true;
    });

    // 3. Header & Close Button
    this.createHeader(dialog);

    // 4. Emergency Alert Title Banner (Y = 200)
    this.createAlertBanner(dialog);

    // 5. Miniature Crash Site Simulation (Y = 30)
    this.createCrashSitePreview(dialog);

    // 6. Primary & Secondary Revive Action Buttons (Y = -75, -150)
    this.createActionButtons(dialog);

    // 7. Give Up Button & Footer Tip (Y = -205, -260)
    this.createFooter(dialog);
  }

  public show(): void {
    console.log('[ReviveModal] show()');
    this.node.active = true;
    WeChatService.vibrateShort('heavy');
    if (this.dialogNode) {
      this.dialogNode.setScale(new Vec3(0.6, 0.6, 1));
      tween(this.dialogNode)
        .to(0.35, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
        .start();
    }
  }

  private giveUpAndClose(): void {
    console.log('[ReviveModal] Give up and close');
    WeChatService.vibrateShort('light');
    if (this.dialogNode) {
      tween(this.dialogNode)
        .to(0.2, { scale: new Vec3(0.7, 0.7, 1) }, { easing: 'backIn' })
        .call(() => {
          this.node.active = false;
          if (this.onGiveUpCallback) this.onGiveUpCallback();
        })
        .start();
    } else {
      this.node.active = false;
      if (this.onGiveUpCallback) this.onGiveUpCallback();
    }
  }

  private createHeader(parent: Node): void {
    // Close Button [ ✖ ] at Top Right (X = 190, Y = 240)
    const closeBtn = this.createNode('CloseBtn', new Vec3(190, 240, 0), parent);
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
      this.giveUpAndClose();
    });
  }

  private createAlertBanner(parent: Node): void {
    const bannerRoot = this.createNode('AlertBanner', new Vec3(0, 195, 0), parent);
    this.ensureTransform(bannerRoot, 400, 100);

    // Red/Purple Emergency Glow Aura
    const aura = this.createNode('AlertAura', new Vec3(0, 15, 0), bannerRoot);
    this.ensureTransform(aura, 300, 70);
    const ag = aura.addComponent(Graphics);
    ag.fillColor = this.hex('#7F1D1D');
    ((ag.fillColor) as ((any)) as any).a = 150;
    ag.circle(0, 5, 75);
    ag.fill();
    ag.fillColor = this.hex('#EF4444');
    ((ag.fillColor) as ((any)) as any).a = 90;
    ag.circle(0, 5, 45);
    ag.fill();

    // Title & Subtitle
    this.createLabel(bannerRoot, 'Title', new Vec3(0, 25, 0), '即将坠落！', 32, '#FF4B3E', 360, 44);
    this.createLabel(bannerRoot, 'Sub', new Vec3(0, -16, 0), '呼叫时空导师救我一命吧！', 16, '#A5F3FC', 380, 26);
  }

  private createCrashSitePreview(parent: Node): void {
    const previewRoot = this.createNode('CrashSiteRoot', new Vec3(0, 30, 0), parent);
    this.ensureTransform(previewRoot, 320, 200);

    const g = previewRoot.addComponent(Graphics);

    // Draw a mini 3x3 isometric grid
    const tileW = 68;
    const tileH = 38;
    const depth = 14;
    const coords = [
      { r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 },
      { r: 1, c: 0 }, { r: 1, c: 1 }, { r: 1, c: 2 },
      { r: 2, c: 0 }, { r: 2, c: 1 }
    ];

    coords.forEach(({ r, c }) => {
      const x = (c - r) * (tileW / 2);
      const y = (c + r) * (tileH / 2) - 40;
      const isCrash = r === 1 && c === 1;

      if (isCrash) {
        // Red Exploding Crash Tile (#FF3B30)
        this.drawIsometricBlock(g, this.hex('#EF4444'), this.hex('#991B1B'), this.hex('#B91C1C'), this.hex('#FCA5A5'), 2.5, depth, tileW, tileH, y, x);
      } else {
        // Normal sapphire/blue tile
        const topCol = (r + c) % 2 === 0 ? this.hex('#1E3A8A') : this.hex('#2563EB');
        const leftCol = (r + c) % 2 === 0 ? this.hex('#1E293B') : this.hex('#1E40AF');
        const rightCol = (r + c) % 2 === 0 ? this.hex('#0F172A') : this.hex('#1D4ED8');
        this.drawIsometricBlock(g, topCol, leftCol, rightCol, this.hex('#60A5FA'), 1.5, depth, tileW, tileH, y, x);
      }
    });

    // Draw Pulsing Red Warning Shockwave & Sphere on top of crash tile (0, 20)
    const shockRoot = this.createNode('Shockwave', new Vec3(0, 22, 0), previewRoot);
    this.ensureTransform(shockRoot, 100, 100);
    this.shockwaveNode = shockRoot;
    const sg = shockRoot.addComponent(Graphics);

    // Warning halo
    sg.fillColor = new Color(255, 59, 48, 80);
    sg.circle(0, 0, 42);
    sg.fill();
    sg.strokeColor = this.hex('#FF3B30');
    sg.lineWidth = 2.5;
    sg.circle(0, 0, 36);
    sg.stroke();

    // Sphere core
    sg.fillColor = this.hex('#FFFFFF');
    sg.circle(0, 0, 14);
    sg.fill();
    sg.strokeColor = this.hex('#00F0FF');
    sg.lineWidth = 2;
    sg.circle(0, 0, 14);
    sg.stroke();

    // Pulse animation
    tween(shockRoot)
      .to(0.6, { scale: new Vec3(1.2, 1.2, 1) }, { easing: 'sineInOut' })
      .to(0.6, { scale: new Vec3(0.9, 0.9, 1) }, { easing: 'sineInOut' })
      .union()
      .repeatForever()
      .start();
  }

  private createActionButtons(parent: Node): void {
    // 1. Primary Button: [ 🎬 视频广告免费复活 ] at Y = -75
    const adReviveBtn = this.createNode('AdReviveBtn', new Vec3(0, -75, 0), parent);
    this.ensureTransform(adReviveBtn, 380, 64);
    const ag = adReviveBtn.addComponent(Graphics);
    // Vibrant Neon Cyan/Blue Hero Button
    ag.fillColor = this.hex('#00E5FF');
    ((ag.fillColor) as any).a = 245;
    ag.roundRect(-190, -32, 380, 64, 20);
    ag.fill();
    ag.strokeColor = this.hex('#FFFFFF');
    ag.lineWidth = 2.5;
    ag.stroke();

    this.createLabel(adReviveBtn, 'Icon', new Vec3(-120, 2, 0), '🎬', 24, '#131C39', 50, 50);
    this.createLabel(adReviveBtn, 'Text', new Vec3(15, 0, 0), '视频广告免费复活', 20, '#131C39', 240, 36);

    adReviveBtn.on(Node.EventType.TOUCH_END, () => {
      console.log('[ReviveModal] Clicked Ad Revive');
      WeChatService.vibrateShort('light');
      AdService.showRewarded('near_miss_rescue').then((res) => {
        if (res.completed) {
          WeChatService.showToast('复活成功！已重置棋盘', 'success');
          this.triggerReviveTransition();
        } else {
          WeChatService.showToast('观看广告未完成，无法复活！', 'none');
        }
      });
    });

    // 2. Secondary Button: [ 💬 分享给微信好友求助 ] at Y = -150
    const shareBtn = this.createNode('WeChatShareBtn', new Vec3(0, -150, 0), parent);
    this.ensureTransform(shareBtn, 380, 54);
    const sg = shareBtn.addComponent(Graphics);
    sg.fillColor = this.hex('#10B981');
    ((sg.fillColor) as any).a = 230;
    sg.roundRect(-190, -27, 380, 54, 18);
    sg.fill();
    sg.strokeColor = this.hex('#6EE7B7');
    sg.lineWidth = 2;
    sg.stroke();

    this.createLabel(shareBtn, 'Icon', new Vec3(-120, 1, 0), '💬', 22, '#FFFFFF', 40, 40);
    this.createLabel(shareBtn, 'Text', new Vec3(15, 0, 0), '微信群好友求助救场', 18, '#FFFFFF', 240, 30);

    shareBtn.on(Node.EventType.TOUCH_END, () => {
      console.log('[ReviveModal] Clicked WeChat Share -> Trigger Revive!');
      WeChatService.vibrateShort('light');
      ShareService.sharePoster({ id: 1, name: '好友求助续光' } as any, '紧急救场请求接力');
      WeChatService.showToast('正在邀请微信好友续命...', 'success');
      this.triggerReviveTransition();
    });
  }

  private triggerReviveTransition(): void {
    if (this.dialogNode) {
      tween(this.dialogNode)
        .to(0.2, { scale: new Vec3(0.7, 0.7, 1) }, { easing: 'backIn' })
        .call(() => {
          this.node.active = false;
          if (this.onReviveCallback) this.onReviveCallback();
        })
        .start();
    } else {
      this.node.active = false;
      if (this.onReviveCallback) this.onReviveCallback();
    }
  }

  private createFooter(parent: Node): void {
    // Give Up Secondary Button [ 放弃复活 ] at Y = -205
    const giveUpBtn = this.createNode('GiveUpBtn', new Vec3(0, -205, 0), parent);
    this.ensureTransform(giveUpBtn, 240, 42);
    const g = giveUpBtn.addComponent(Graphics);
    g.fillColor = this.hex('#1E293B');
    ((g.fillColor) as ((any)) as any).a = 220;
    g.roundRect(-120, -21, 240, 42, 12);
    g.fill();
    g.strokeColor = this.hex('#475569');
    g.lineWidth = 1.8;
    g.stroke();
    this.createLabel(giveUpBtn, 'Text', new Vec3(0, 1, 0), '放弃复活', 16, '#94A3B8', 180, 30);

    giveUpBtn.on(Node.EventType.TOUCH_END, () => {
      this.giveUpAndClose();
    });

    // Footer tip text at Y = -260
    this.createLabel(parent, 'FooterTip', new Vec3(0, -260, 0), '好友帮你不按套路出牌后可复活并获得无敌光环3秒', 13, '#64748B', 420, 24);
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
