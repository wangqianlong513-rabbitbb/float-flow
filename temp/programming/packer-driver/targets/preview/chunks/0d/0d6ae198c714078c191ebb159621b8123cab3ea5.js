System.register(["cc"], function (_export, _context) {
  "use strict";

  var _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, _decorator, Color, Component, Graphics, Label, Layers, Node, tween, UITransform, Vec3, _dec, _class, _crd, ccclass, ReviveModal;

  return {
    setters: [function (_cc) {
      _cclegacy = _cc.cclegacy;
      __checkObsolete__ = _cc.__checkObsolete__;
      __checkObsoleteInNamespace__ = _cc.__checkObsoleteInNamespace__;
      _decorator = _cc._decorator;
      Color = _cc.Color;
      Component = _cc.Component;
      Graphics = _cc.Graphics;
      Label = _cc.Label;
      Layers = _cc.Layers;
      Node = _cc.Node;
      tween = _cc.tween;
      UITransform = _cc.UITransform;
      Vec3 = _cc.Vec3;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "fe2d7xgIfNJeYXRxBsKJ0Tw", "ReviveModal", undefined);

      __checkObsolete__(['_decorator', 'Color', 'Component', 'EventTouch', 'Graphics', 'Label', 'Layers', 'Node', 'tween', 'UITransform', 'Vec3']);

      ({
        ccclass
      } = _decorator);

      _export("ReviveModal", ReviveModal = (_dec = ccclass('ReviveModal'), _dec(_class = class ReviveModal extends Component {
        constructor() {
          super(...arguments);
          this.onReviveCallback = void 0;
          this.onGiveUpCallback = void 0;
          this.dialogNode = null;
          this.shockwaveNode = null;
        }

        onLoad() {
          console.log('[FloatFlow] ReviveModal onLoad');
          this.node.layer = Layers.Enum.UI_2D;
          this.ensureTransform(this.node, 1280, 720);
          this.node.destroyAllChildren(); // 1. Semi-transparent Backdrop Overlay

          var overlay = this.createNode('Overlay', new Vec3(0, 0, 0), this.node);
          this.ensureTransform(overlay, 1280, 720);
          var og = overlay.addComponent(Graphics);
          og.fillColor = new Color(5, 10, 25, 190);
          og.rect(-640, -360, 1280, 720);
          og.fill();
          overlay.on(Node.EventType.TOUCH_END, () => {
            this.giveUpAndClose();
          }); // 2. Main Glassmorphic Dialog Box (Size: 460 x 580)

          var dialog = this.createNode('DialogBox', new Vec3(0, 0, 0), this.node);
          this.ensureTransform(dialog, 460, 580);
          this.dialogNode = dialog;
          var dg = dialog.addComponent(Graphics); // Dark glassmorphic background

          dg.fillColor = this.hex('#0B132B');
          dg.fillColor.a = 245;
          dg.roundRect(-230, -290, 460, 580, 24);
          dg.fill(); // Sky blue glowing border

          dg.strokeColor = this.hex('#3B82F6');
          dg.lineWidth = 2.5;
          dg.stroke(); // Prevent clicks inside dialog from closing modal

          dialog.on(Node.EventType.TOUCH_END, e => {
            e.propagationStopped = true;
          }); // 3. Header & Close Button

          this.createHeader(dialog); // 4. Emergency Alert Title Banner (Y = 200)

          this.createAlertBanner(dialog); // 5. Miniature Crash Site Simulation (Y = 30)

          this.createCrashSitePreview(dialog); // 6. WeChat Green Share Hero Button (Y = -120)

          this.createWeChatShareButton(dialog); // 7. Give Up Button & Footer Tip (Y = -205, -260)

          this.createFooter(dialog);
        }

        giveUpAndClose() {
          console.log('[ReviveModal] Give up and close');
          this.node.active = false;
          if (this.onGiveUpCallback) this.onGiveUpCallback();
        }

        createHeader(parent) {
          // Close Button [ ✖ ] at Top Right (X = 190, Y = 240)
          var closeBtn = this.createNode('CloseBtn', new Vec3(190, 240, 0), parent);
          this.ensureTransform(closeBtn, 44, 44);
          var cg = closeBtn.addComponent(Graphics);
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

        createAlertBanner(parent) {
          var bannerRoot = this.createNode('AlertBanner', new Vec3(0, 195, 0), parent);
          this.ensureTransform(bannerRoot, 400, 100); // Red/Purple Emergency Glow Aura

          var aura = this.createNode('AlertAura', new Vec3(0, 15, 0), bannerRoot);
          this.ensureTransform(aura, 300, 70);
          var ag = aura.addComponent(Graphics);
          ag.fillColor = this.hex('#7F1D1D');
          ag.fillColor.a = 150;
          ag.circle(0, 5, 75);
          ag.fill();
          ag.fillColor = this.hex('#EF4444');
          ag.fillColor.a = 90;
          ag.circle(0, 5, 45);
          ag.fill(); // Title & Subtitle

          this.createLabel(bannerRoot, 'Title', new Vec3(0, 25, 0), '即将坠落！', 32, '#FF4B3E', 360, 44);
          this.createLabel(bannerRoot, 'Sub', new Vec3(0, -16, 0), '呼叫时空导师救我一命吧！', 16, '#A5F3FC', 380, 26);
        }

        createCrashSitePreview(parent) {
          var previewRoot = this.createNode('CrashSiteRoot', new Vec3(0, 30, 0), parent);
          this.ensureTransform(previewRoot, 320, 200);
          var g = previewRoot.addComponent(Graphics); // Draw a mini 3x3 isometric grid

          var tileW = 68;
          var tileH = 38;
          var depth = 14;
          var coords = [{
            r: 0,
            c: 0
          }, {
            r: 0,
            c: 1
          }, {
            r: 0,
            c: 2
          }, {
            r: 1,
            c: 0
          }, {
            r: 1,
            c: 1
          }, {
            r: 1,
            c: 2
          }, {
            r: 2,
            c: 0
          }, {
            r: 2,
            c: 1
          }];
          coords.forEach(_ref => {
            var {
              r,
              c
            } = _ref;
            var x = (c - r) * (tileW / 2);
            var y = (c + r) * (tileH / 2) - 40;
            var isCrash = r === 1 && c === 1;

            if (isCrash) {
              // Red Exploding Crash Tile (#FF3B30)
              this.drawIsometricBlock(g, this.hex('#EF4444'), this.hex('#991B1B'), this.hex('#B91C1C'), this.hex('#FCA5A5'), 2.5, depth, tileW, tileH, y, x);
            } else {
              // Normal sapphire/blue tile
              var topCol = (r + c) % 2 === 0 ? this.hex('#1E3A8A') : this.hex('#2563EB');
              var leftCol = (r + c) % 2 === 0 ? this.hex('#1E293B') : this.hex('#1E40AF');
              var rightCol = (r + c) % 2 === 0 ? this.hex('#0F172A') : this.hex('#1D4ED8');
              this.drawIsometricBlock(g, topCol, leftCol, rightCol, this.hex('#60A5FA'), 1.5, depth, tileW, tileH, y, x);
            }
          }); // Draw Pulsing Red Warning Shockwave & Sphere on top of crash tile (0, 20)

          var shockRoot = this.createNode('Shockwave', new Vec3(0, 22, 0), previewRoot);
          this.ensureTransform(shockRoot, 100, 100);
          this.shockwaveNode = shockRoot;
          var sg = shockRoot.addComponent(Graphics); // Warning halo

          sg.fillColor = new Color(255, 59, 48, 80);
          sg.circle(0, 0, 42);
          sg.fill();
          sg.strokeColor = this.hex('#FF3B30');
          sg.lineWidth = 2.5;
          sg.circle(0, 0, 36);
          sg.stroke(); // Sphere core

          sg.fillColor = this.hex('#FFFFFF');
          sg.circle(0, 0, 14);
          sg.fill();
          sg.strokeColor = this.hex('#00F0FF');
          sg.lineWidth = 2;
          sg.circle(0, 0, 14);
          sg.stroke(); // Pulse animation

          tween(shockRoot).to(0.6, {
            scale: new Vec3(1.2, 1.2, 1)
          }, {
            easing: 'sineInOut'
          }).to(0.6, {
            scale: new Vec3(0.9, 0.9, 1)
          }, {
            easing: 'sineInOut'
          }).union().repeatForever().start();
        }

        createWeChatShareButton(parent) {
          var shareBtn = this.createNode('WeChatShareBtn', new Vec3(0, -120, 0), parent);
          this.ensureTransform(shareBtn, 380, 68);
          var g = shareBtn.addComponent(Graphics); // Vibrant WeChat Green Background (#10B981 / #07C160)

          g.fillColor = this.hex('#10B981');
          g.fillColor.a = 245;
          g.roundRect(-190, -34, 380, 68, 20);
          g.fill(); // Glowing green/white border

          g.strokeColor = this.hex('#6EE7B7');
          g.lineWidth = 2.5;
          g.stroke(); // Icon & Text layout

          this.createLabel(shareBtn, 'Icon', new Vec3(-120, 2, 0), '💬', 28, '#FFFFFF', 50, 50);
          this.createLabel(shareBtn, 'MainText', new Vec3(15, 10, 0), '分享给微信好友', 22, '#FFFFFF', 220, 30);
          this.createLabel(shareBtn, 'SubText', new Vec3(15, -14, 0), '帮我续一卡', 14, '#D1FAE5', 220, 22);
          shareBtn.on(Node.EventType.TOUCH_END, () => {
            console.log('[ReviveModal] Clicked WeChat Share -> Trigger Revive!'); // Simulate WeChat Share success

            this.node.active = false;
            if (this.onReviveCallback) this.onReviveCallback();
          });
        }

        createFooter(parent) {
          // Give Up Secondary Button [ 放弃复活 ] at Y = -205
          var giveUpBtn = this.createNode('GiveUpBtn', new Vec3(0, -205, 0), parent);
          this.ensureTransform(giveUpBtn, 240, 42);
          var g = giveUpBtn.addComponent(Graphics);
          g.fillColor = this.hex('#1E293B');
          g.fillColor.a = 220;
          g.roundRect(-120, -21, 240, 42, 12);
          g.fill();
          g.strokeColor = this.hex('#475569');
          g.lineWidth = 1.8;
          g.stroke();
          this.createLabel(giveUpBtn, 'Text', new Vec3(0, 1, 0), '放弃复活', 16, '#94A3B8', 180, 30);
          giveUpBtn.on(Node.EventType.TOUCH_END, () => {
            this.giveUpAndClose();
          }); // Footer tip text at Y = -260

          this.createLabel(parent, 'FooterTip', new Vec3(0, -260, 0), '好友帮你不按套路出牌后可复活并获得无敌光环3秒', 13, '#64748B', 420, 24);
        }

        drawIsometricBlock(g, topFill, sideDark, sideLight, stroke, lineWidth, depth, customW, customH, offsetY, offsetX) {
          var halfW = customW / 2;
          var halfH = customH / 2;
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

        createNode(name, pos, parent) {
          var node = new Node(name);
          node.layer = Layers.Enum.UI_2D;
          if (parent) node.setParent(parent);
          node.setPosition(pos);
          return node;
        }

        ensureTransform(node, w, h) {
          var t = node.getComponent(UITransform);
          if (!t) t = node.addComponent(UITransform);
          t.setContentSize(w, h);
          return t;
        }

        createLabel(parent, name, pos, text, fontSize, hexColor, w, h) {
          var node = this.createNode(name, pos, parent);
          this.ensureTransform(node, w, h);
          var label = node.addComponent(Label);
          label.string = text;
          label.fontSize = fontSize;
          label.lineHeight = Math.round(fontSize * 1.2);
          label.color = this.hex(hexColor);
          label.horizontalAlign = Label.HorizontalAlign.CENTER;
          label.verticalAlign = Label.VerticalAlign.CENTER;
          label.overflow = Label.Overflow.SHRINK;
          return label;
        }

        hex(hexStr) {
          var clean = hexStr.replace('#', '');
          var r = parseInt(clean.substring(0, 2), 16) || 0;
          var g = parseInt(clean.substring(2, 4), 16) || 0;
          var b = parseInt(clean.substring(4, 6), 16) || 0;
          return new Color(r, g, b, 255);
        }

      }) || _class));

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=0d6ae198c714078c191ebb159621b8123cab3ea5.js.map