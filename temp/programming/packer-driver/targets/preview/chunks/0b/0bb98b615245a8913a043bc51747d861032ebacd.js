System.register(["cc"], function (_export, _context) {
  "use strict";

  var _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, _decorator, Color, Component, Graphics, Label, Layers, Node, tween, UITransform, Vec3, _dec, _class, _crd, ccclass, VictoryPoster;

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

      _cclegacy._RF.push({}, "8ff03UQeuxCyq5C0sGBPD3G", "VictoryPoster", undefined);

      __checkObsolete__(['_decorator', 'Color', 'Component', 'EventTouch', 'Graphics', 'Label', 'Layers', 'Node', 'tween', 'UITransform', 'Vec3']);

      ({
        ccclass
      } = _decorator);

      _export("VictoryPoster", VictoryPoster = (_dec = ccclass('VictoryPoster'), _dec(_class = class VictoryPoster extends Component {
        constructor() {
          super(...arguments);
          this.onCloseCallback = void 0;
          this.onNextLevelCallback = void 0;
          this.posterNode = null;
          this.routeGlowNode = null;
        }

        onLoad() {
          console.log('[FloatFlow] VictoryPoster onLoad');
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
            this.closePoster();
          }); // 2. Main Glassmorphic Poster Frame (Size: 480 x 620)

          var poster = this.createNode('PosterBox', new Vec3(0, 0, 0), this.node);
          this.ensureTransform(poster, 480, 620);
          this.posterNode = poster;
          var pg = poster.addComponent(Graphics); // Deep sapphire navy glassmorphic background

          pg.fillColor = this.hex('#0B132B');
          pg.fillColor.a = 248;
          pg.roundRect(-240, -310, 480, 620, 24);
          pg.fill(); // Glowing sky blue border

          pg.strokeColor = this.hex('#3B82F6');
          pg.lineWidth = 3;
          pg.stroke(); // Inner gold trim at top

          pg.strokeColor = this.hex('#FDE047');
          pg.lineWidth = 1.5;
          pg.moveTo(-220, 290);
          pg.lineTo(220, 290);
          pg.stroke(); // Prevent clicks inside poster from closing dialog

          poster.on(Node.EventType.TOUCH_END, e => {
            e.propagationStopped = true;
          }); // 3. Victory Certificate Header (Y = 240 to 170)

          this.createHeader(poster); // 4. Miniature Isometric Light Route Showcase (Y = 30)

          this.createRouteShowcase(poster); // 5. Player Stats & WeChat QR Code Footer (Y = -150)

          this.createStatsAndQR(poster); // 6. WeChat Green Share & Save Image Buttons (Y = -260)

          this.createBottomActions(poster);
        }

        showVictory(levelName, stars, moves) {
          console.log("[VictoryPoster] Show Victory for " + levelName + ": " + stars + " Stars, " + moves + " Moves");
          this.node.active = true;
        }

        closePoster() {
          console.log('[VictoryPoster] Close Poster');
          this.node.active = false;
          if (this.onCloseCallback) this.onCloseCallback();
        }

        createHeader(parent) {
          // Close Button [ ✖ ] at Top Right (X = 200, Y = 265)
          var closeBtn = this.createNode('CloseBtn', new Vec3(200, 265, 0), parent);
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
            this.closePoster();
          }); // Golden & Violet Pulsing Aura behind Title

          var auraRoot = this.createNode('HeaderAura', new Vec3(0, 220, 0), parent);
          this.ensureTransform(auraRoot, 360, 80);
          var ag = auraRoot.addComponent(Graphics);
          ag.fillColor = this.hex('#4C1D95');
          ag.fillColor.a = 150;
          ag.circle(0, 0, 70);
          ag.fill();
          ag.fillColor = this.hex('#D97706');
          ag.fillColor.a = 90;
          ag.circle(0, 0, 45);
          ag.fill(); // Top Certificate Titles

          this.createLabel(parent, 'Title', new Vec3(0, 245, 0), '✨ 恭喜通关！光轨大师达成 ✨', 24, '#FDE047', 420, 36);
          this.createLabel(parent, 'LevelName', new Vec3(0, 205, 0), '旅途模式 · 冰原章节 5-12', 18, '#00F0FF', 360, 28);
          this.createLabel(parent, 'StarBanner', new Vec3(0, 172, 0), '⭐️ ⭐️ ⭐️   完美通关 · 耗时 12 秒', 16, '#FFFFFF', 380, 26);
        }

        createRouteShowcase(parent) {
          var showcaseRoot = this.createNode('RouteShowcase', new Vec3(0, 35, 0), parent);
          this.ensureTransform(showcaseRoot, 360, 220);
          var g = showcaseRoot.addComponent(Graphics); // Draw a mini 3x3 isometric stone tile board

          var tileW = 72;
          var tileH = 40;
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
          }, {
            r: 2,
            c: 2
          }];
          coords.forEach(_ref => {
            var {
              r,
              c
            } = _ref;
            var x = (c - r) * (tileW / 2);
            var y = (c + r) * (tileH / 2) - 50;
            var isGoal = r === 2 && c === 2;

            if (isGoal) {
              // Golden Goal Crystal Tile (#FDE047 / #D97706)
              this.drawIsometricBlock(g, this.hex('#FDE047'), this.hex('#B45309'), this.hex('#D97706'), this.hex('#FFFFFF'), 2, depth, tileW, tileH, y, x);
            } else {
              // Sapphire Blue Tile
              var topCol = (r + c) % 2 === 0 ? this.hex('#1E3A8A') : this.hex('#2563EB');
              var leftCol = (r + c) % 2 === 0 ? this.hex('#1E293B') : this.hex('#1E40AF');
              var rightCol = (r + c) % 2 === 0 ? this.hex('#0F172A') : this.hex('#1D4ED8');
              this.drawIsometricBlock(g, topCol, leftCol, rightCol, this.hex('#60A5FA'), 1.5, depth, tileW, tileH, y, x);
            }
          }); // Draw Continuous Glowing Luminous Route from (0,0) -> (0,1) -> (1,1) -> (1,2) -> (2,2)

          var routeGlow = this.createNode('RouteGlow', new Vec3(0, 0, 0), showcaseRoot);
          this.ensureTransform(routeGlow, 360, 220);
          this.routeGlowNode = routeGlow;
          var rg = routeGlow.addComponent(Graphics);

          var getCoordPos = (r, c) => {
            var x = (c - r) * (tileW / 2);
            var y = (c + r) * (tileH / 2) - 50;
            return {
              x,
              y
            };
          };

          var p0 = getCoordPos(0, 0);
          var p1 = getCoordPos(0, 1);
          var p2 = getCoordPos(1, 1);
          var p3 = getCoordPos(1, 2);
          var p4 = getCoordPos(2, 2); // Magenta outer glow

          rg.strokeColor = new Color(244, 114, 182, 160);
          rg.lineWidth = 10;
          rg.moveTo(p0.x, p0.y);
          rg.lineTo(p1.x, p1.y);
          rg.lineTo(p2.x, p2.y);
          rg.lineTo(p3.x, p3.y);
          rg.lineTo(p4.x, p4.y);
          rg.stroke(); // Electric Cyan core line

          rg.strokeColor = this.hex('#00F0FF');
          rg.lineWidth = 4;
          rg.moveTo(p0.x, p0.y);
          rg.lineTo(p1.x, p1.y);
          rg.lineTo(p2.x, p2.y);
          rg.lineTo(p3.x, p3.y);
          rg.lineTo(p4.x, p4.y);
          rg.stroke(); // Glowing Star Sphere at Goal (p4)

          rg.fillColor = this.hex('#FFFFFF');
          rg.circle(p4.x, p4.y, 12);
          rg.fill();
          rg.strokeColor = this.hex('#FDE047');
          rg.lineWidth = 3;
          rg.circle(p4.x, p4.y, 18);
          rg.stroke(); // Pulse animation on goal sphere

          tween(routeGlow).to(0.8, {
            scale: new Vec3(1.06, 1.06, 1)
          }, {
            easing: 'sineInOut'
          }).to(0.8, {
            scale: new Vec3(0.96, 0.96, 1)
          }, {
            easing: 'sineInOut'
          }).union().repeatForever().start();
        }

        createStatsAndQR(parent) {
          // Left Column: Player Stats & Ranking (X = -90, Y = -150)
          var statsRoot = this.createNode('StatsRoot', new Vec3(-90, -150, 0), parent);
          this.ensureTransform(statsRoot, 260, 110);
          this.createLabel(statsRoot, 'Badge', new Vec3(0, 36, 0), '🧑‍🚀 流光开拓者 (Lv.18)', 16, '#60A5FA', 240, 26);
          this.createLabel(statsRoot, 'Stats1', new Vec3(0, 8, 0), '🔥 连击建桥: 18 次 | ⚡ 救场: 0', 14, '#93C5FD', 250, 24);
          this.createLabel(statsRoot, 'Rank', new Vec3(0, -22, 0), '🌟 击败了微信好友 98.6% 的玩家！', 15, '#FB923C', 260, 26); // Right Column: WeChat Mini-Game QR Code Box (X = 140, Y = -150)

          var qrRoot = this.createNode('QRRoot', new Vec3(140, -150, 0), parent);
          this.ensureTransform(qrRoot, 100, 110);
          var qg = qrRoot.addComponent(Graphics); // Glassmorphic QR box (84 x 84)

          qg.fillColor = this.hex('#1E293B');
          qg.fillColor.a = 230;
          qg.roundRect(-42, -32, 84, 84, 14);
          qg.fill();
          qg.strokeColor = this.hex('#60A5FA');
          qg.lineWidth = 2;
          qg.stroke(); // Simulated WeChat Mini-Game Circular Sun/QR Pattern inside box (0, 10)

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
          this.createLabel(qrRoot, 'QRText', new Vec3(0, -48, 0), '长按/扫码超越我', 13, '#93C5FD', 120, 20);
        }

        createBottomActions(parent) {
          // Left Button: [ 💬 分享好友炫耀 ] at X = -115, Y = -260
          var shareBtn = this.createNode('ShareBtn', new Vec3(-115, -260, 0), parent);
          this.ensureTransform(shareBtn, 210, 48);
          var sg = shareBtn.addComponent(Graphics);
          sg.fillColor = this.hex('#10B981');
          sg.roundRect(-105, -24, 210, 48, 16);
          sg.fill();
          sg.strokeColor = this.hex('#6EE7B7');
          sg.lineWidth = 2;
          sg.stroke();
          this.createLabel(shareBtn, 'Text', new Vec3(0, 1, 0), '💬 分享好友炫耀', 16, '#FFFFFF', 190, 30);
          shareBtn.on(Node.EventType.TOUCH_END, () => {
            console.log('[VictoryPoster] Clicked Share to Friends -> Brag!');
            this.closePoster();
          }); // Right Button: [ 🖼️ 保存高清海报 ] at X = 115, Y = -260

          var saveBtn = this.createNode('SaveBtn', new Vec3(115, -260, 0), parent);
          this.ensureTransform(saveBtn, 210, 48);
          var vg = saveBtn.addComponent(Graphics);
          vg.fillColor = this.hex('#2563EB');
          vg.roundRect(-105, -24, 210, 48, 16);
          vg.fill();
          vg.strokeColor = this.hex('#00F0FF');
          vg.lineWidth = 2;
          vg.stroke();
          this.createLabel(saveBtn, 'Text', new Vec3(0, 1, 0), '🖼️ 保存高清海报', 16, '#FFFFFF', 190, 30);
          saveBtn.on(Node.EventType.TOUCH_END, () => {
            console.log('[VictoryPoster] Clicked Save HD Poster -> Saved to Photos!');

            if (this.onNextLevelCallback) {
              this.onNextLevelCallback();
            } else {
              this.closePoster();
            }
          });
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
//# sourceMappingURL=0bb98b615245a8913a043bc51747d861032ebacd.js.map