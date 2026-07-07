System.register(["cc"], function (_export, _context) {
  "use strict";

  var _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, _decorator, Button, Color, Component, Graphics, Label, Layers, Node, tween, UITransform, Vec3, _dec, _class, _crd, ccclass, HomeRoot;

  return {
    setters: [function (_cc) {
      _cclegacy = _cc.cclegacy;
      __checkObsolete__ = _cc.__checkObsolete__;
      __checkObsoleteInNamespace__ = _cc.__checkObsoleteInNamespace__;
      _decorator = _cc._decorator;
      Button = _cc.Button;
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

      _cclegacy._RF.push({}, "ca09c6uQJ9I4L4C0W5yuipJ", "HomeRoot", undefined);

      __checkObsolete__(['_decorator', 'Button', 'Color', 'Component', 'EventTouch', 'Graphics', 'Label', 'Layers', 'Node', 'tween', 'UITransform', 'Vec3']);

      ({
        ccclass
      } = _decorator);

      _export("HomeRoot", HomeRoot = (_dec = ccclass('HomeRoot'), _dec(_class = class HomeRoot extends Component {
        constructor() {
          super(...arguments);
          this.onStartJourneyCallback = void 0;
          this.onStartEndlessCallback = void 0;
          this.onOpenSettingsCallback = void 0;
          this.heroIslandNode = null;
          this.popupRoot = null;
          this.currentTheme = 0;
        }

        // 0: 极光冰原, 1: 暮色罗兰, 2: 落日余晖
        onLoad() {
          console.log('[FloatFlow] HomeRoot onLoad');
          this.node.layer = Layers.Enum.UI_2D;
          this.ensureTransform(this.node, 1280, 720);
          this.rebuildUI();
        }

        applyTheme(themeIdx) {
          console.log("[HomeRoot] Apply Theme Index " + themeIdx);
          this.currentTheme = themeIdx;
          this.rebuildUI();
        }

        rebuildUI() {
          this.node.destroyAllChildren(); // 1. Top Resource & Settings Bar (Y = 310)

          this.createTopBar(); // 2. Main Title Typography & Glow Aura (Y = 210)

          this.createTitleSection(); // 3. Center Hero Floating 3D Isometric Island & Crystal Core (Y = 30)

          this.createHeroIsland(); // 4. Left Sidebar Action Icons (X = -310)

          this.createSidebarIcons(); // 5. Center/Bottom Dual Mode Hero Cards (Y = -140)

          this.createModeSelectCards(); // 6. Bottom Feature Banner Pills (Y = -285)

          this.createBottomFeaturePills(); // 7. Interactive Sidebar Popup Root (Hidden by default!)

          this.popupRoot = this.createNode('PopupRoot', new Vec3(0, 0, 0), this.node);
          this.ensureTransform(this.popupRoot, 1280, 720);
          this.popupRoot.active = false;
        }

        addClick(node, onClick) {
          var btn = node.getComponent(Button);
          if (!btn) btn = node.addComponent(Button);
          btn.transition = Button.Transition.SCALE;
          btn.zoomScale = 0.92;
          node.off(Button.EventType.CLICK);
          node.on(Button.EventType.CLICK, onClick, this);
          node.off(Node.EventType.TOUCH_END);
          node.on(Node.EventType.TOUCH_END, onClick, this);
        }

        createTopBar() {
          var topBar = this.createNode('TopBar', new Vec3(0, 310, 0), this.node);
          this.ensureTransform(topBar, 1280, 60);
          var isRose = this.currentTheme === 1;
          var isGold = this.currentTheme === 2;
          var dBorder = isRose ? '#E879F9' : isGold ? '#FDE047' : '#00F0FF';
          var dBg = isRose ? '#4C1D95' : isGold ? '#7C2D12' : '#1E3A8A';
          var eBorder = isRose ? '#F472B6' : isGold ? '#EA580C' : '#FDE047';
          var eBg = isRose ? '#581C87' : isGold ? '#9A3412' : '#4C1D95'; // Diamond Resource Pill (💎 1260 +)

          this.createResourcePill(topBar, 'DiamondPill', new Vec3(-100, 0, 0), '💎  1260  +', dBorder, dBg); // Energy Resource Pill (⚡ 8/10 +)

          this.createResourcePill(topBar, 'EnergyPill', new Vec3(80, 0, 0), '⚡  8 / 10  +', eBorder, eBg); // Settings Gear Button (⚙️)

          var settingsBtn = this.createNode('SettingsBtn', new Vec3(250, 0, 0), topBar);
          this.ensureTransform(settingsBtn, 48, 48);
          var sg = settingsBtn.addComponent(Graphics);
          sg.fillColor = this.hex(dBg);
          sg.fillColor.a = 220;
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

        createResourcePill(parent, name, pos, text, borderHex, bgHex) {
          var pill = this.createNode(name, pos, parent);
          this.ensureTransform(pill, 150, 42);
          var g = pill.addComponent(Graphics);
          g.fillColor = this.hex(bgHex);
          g.fillColor.a = 210;
          g.roundRect(-75, -21, 150, 42, 21);
          g.fill();
          g.strokeColor = this.hex(borderHex);
          g.lineWidth = 2;
          g.stroke();
          this.createLabel(pill, 'Text', new Vec3(0, 1, 0), text, 16, '#FFFFFF', 140, 36);
        }

        createTitleSection() {
          var titleRoot = this.createNode('TitleRoot', new Vec3(0, 210, 0), this.node);
          this.ensureTransform(titleRoot, 500, 120);
          var isRose = this.currentTheme === 1;
          var isGold = this.currentTheme === 2;
          var auraOuter = isRose ? '#4C1D95' : isGold ? '#7C2D12' : '#4C1D95';
          var auraInner = isRose ? '#831843' : isGold ? '#B45309' : '#00F0FF';
          var subCol = isRose ? '#C4B5FD' : isGold ? '#FCD34D' : '#60A5FA';
          var aura = this.createNode('TitleAura', new Vec3(0, 0, 0), titleRoot);
          this.ensureTransform(aura, 400, 80);
          var ag = aura.addComponent(Graphics);
          ag.fillColor = this.hex(auraOuter);
          ag.fillColor.a = 140;
          ag.circle(0, 5, 80);
          ag.fill();
          ag.fillColor = this.hex(auraInner);
          ag.fillColor.a = 80;
          ag.circle(0, 5, 45);
          ag.fill();
          this.createLabel(titleRoot, 'MainTitle', new Vec3(0, 15, 0), '浮 岛 浮 光', 56, '#FFFFFF', 450, 70);
          this.createLabel(titleRoot, 'SubTitle', new Vec3(0, -32, 0), 'F L O A T   &   F L O W', 17, subCol, 400, 30);
        }

        createHeroIsland() {
          var islandRoot = this.createNode('HeroIslandRoot', new Vec3(0, 30, 0), this.node);
          this.ensureTransform(islandRoot, 400, 300);
          this.heroIslandNode = islandRoot;
          var g = islandRoot.addComponent(Graphics);
          var tileW = 76;
          var tileH = 44;
          var depth = 16;
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
          var isRose = this.currentTheme === 1;
          var isGold = this.currentTheme === 2;
          coords.forEach(_ref => {
            var {
              r,
              c
            } = _ref;
            var x = (c - r) * (tileW / 2);
            var y = (c + r) * (tileH / 2) - 40;
            var isCenter = r === 1 && c === 1;
            var topCol = isCenter ? this.hex('#4C1D95') : (r + c) % 2 === 0 ? this.hex('#2563EB') : this.hex('#3B82F6');
            var leftCol = isCenter ? this.hex('#312E81') : (r + c) % 2 === 0 ? this.hex('#1E40AF') : this.hex('#1D4ED8');
            var rightCol = isCenter ? this.hex('#1E1B4B') : (r + c) % 2 === 0 ? this.hex('#1E3A8A') : this.hex('#1E40AF');
            var strokeCol = isCenter ? this.hex('#E879F9') : (r + c) % 2 === 0 ? this.hex('#60A5FA') : this.hex('#93C5FD');

            if (isRose) {
              topCol = isCenter ? this.hex('#4C1D95') : (r + c) % 2 === 0 ? this.hex('#6D28D9') : this.hex('#7C3AED');
              leftCol = isCenter ? this.hex('#3B0764') : (r + c) % 2 === 0 ? this.hex('#4C1D95') : this.hex('#581C87');
              rightCol = isCenter ? this.hex('#2E1065') : (r + c) % 2 === 0 ? this.hex('#3B0764') : this.hex('#4C1D95');
              strokeCol = isCenter ? this.hex('#A78BFA') : (r + c) % 2 === 0 ? this.hex('#A78BFA') : this.hex('#C4B5FD');
            } else if (isGold) {
              topCol = isCenter ? this.hex('#7C2D12') : (r + c) % 2 === 0 ? this.hex('#B45309') : this.hex('#C2410C');
              leftCol = isCenter ? this.hex('#451A03') : (r + c) % 2 === 0 ? this.hex('#78350F') : this.hex('#9A3412');
              rightCol = isCenter ? this.hex('#260C08') : (r + c) % 2 === 0 ? this.hex('#451A03') : this.hex('#7C2D12');
              strokeCol = isCenter ? this.hex('#FBBF24') : (r + c) % 2 === 0 ? this.hex('#FCD34D') : this.hex('#FDE047');
            }

            this.drawIsometricBlock(g, topCol, leftCol, rightCol, strokeCol, 2, depth, tileW, tileH, y, x);
          });
          var coreY = 35;
          var coreGlowHex = isRose ? '#A78BFA' : isGold ? '#FCD34D' : '#00F0FF';
          var cg = this.hex(coreGlowHex);
          g.fillColor = new Color(cg.r, cg.g, cg.b, 60);
          g.circle(0, coreY, 45);
          g.fill();
          g.fillColor = new Color(255, 255, 255, 120);
          g.circle(0, coreY, 25);
          g.fill();
          var cTop = isRose ? this.hex('#A78BFA') : isGold ? this.hex('#FCD34D') : this.hex('#00F0FF');
          var cLeft = isRose ? this.hex('#6D28D9') : isGold ? this.hex('#B45309') : this.hex('#0099BB');
          var cRight = isRose ? this.hex('#4C1D95') : isGold ? this.hex('#7C2D12') : this.hex('#00CCD9');
          this.drawIsometricBlock(g, cTop, cLeft, cRight, this.hex('#FFFFFF'), 2.5, 22, 54, 32, coreY, 0);
          tween(islandRoot).to(2.2, {
            position: new Vec3(0, 45, 0)
          }, {
            easing: 'sineInOut'
          }).to(2.2, {
            position: new Vec3(0, 30, 0)
          }, {
            easing: 'sineInOut'
          }).union().repeatForever().start();
        }

        createSidebarIcons() {
          var sidebar = this.createNode('Sidebar', new Vec3(-310, 30, 0), this.node);
          this.ensureTransform(sidebar, 80, 300);
          var items = [{
            id: 'daily',
            name: '每日奖励',
            icon: '🎁',
            y: 100,
            border: '#FDE047',
            color: '#FDE047'
          }, {
            id: 'rank',
            name: '排行榜',
            icon: '🏆',
            y: 0,
            border: '#60A5FA',
            color: '#60A5FA'
          }, {
            id: 'achieve',
            name: '成 就',
            icon: '⭐',
            y: -100,
            border: '#A855F7',
            color: '#C084FC'
          }];
          items.forEach(item => {
            var btn = this.createNode("Btn_" + item.id, new Vec3(0, item.y, 0), sidebar);
            this.ensureTransform(btn, 64, 80);
            var g = btn.addComponent(Graphics);
            g.fillColor = this.hex('#1E3A8A');
            g.fillColor.a = 210;
            g.circle(0, 10, 28);
            g.fill();
            g.strokeColor = this.hex(item.border);
            g.lineWidth = 2;
            g.stroke();
            this.createLabel(btn, 'Icon', new Vec3(0, 12, 0), item.icon, 26, '#FFFFFF', 50, 50);
            this.createLabel(btn, 'Label', new Vec3(0, -26, 0), item.name, 13, item.color, 70, 20);
            this.addClick(btn, () => {
              console.log("[HomeRoot] Clicked sidebar item: " + item.name);

              if (item.id === 'daily') {
                this.showPopup('🎁   每 日 签 到 奖 励', ['💎  第 1 天:  50 钻石  ——  [ 已领取 ✔ ]', '💎  第 2 天:  100 钻石  ——  [ 今日可领 ⭐ ]', '💎  第 3 天:  200 钻石  ——  [ 明日解锁 🔒 ]', '⚡  第 4 天:  满管时空能量  ——  [ 待解锁 🔒 ]', '🎁  第 7 天:  500 钻石大礼包  ——  [ 待解锁 🔒 ]'], '✨   立 即 领 取 今 日 100 💎', '#FDE047', '#991B1B');
              } else if (item.id === 'rank') {
                this.showPopup('🏆   微 信 好 友 排 行 榜', ['🥇  1. 微信好友·星辰大师 —— 通关 88 关 (260 ⭐)', '🥈  2. 你 (流光开拓者) —— 通关 56 关 (168 ⭐)', '🥉  3. 微信好友·阳光微风 —— 通关 42 关 (120 ⭐)', '🏅  4. 微信好友·极光旅人 —— 通关 35 关 (98 ⭐)', '🏅  5. 微信好友·暗夜流星 —— 通关 19 关 (50 ⭐)'], '💬   邀 请 微 信 好 友 冲 榜', '#60A5FA', '#065F46');
              } else if (item.id === 'achieve') {
                this.showPopup('⭐   荣 誉 勋 章 与 成 就', ['🏅  [初次启航] 完成第 1 关 —— [ 已达成 ✔ ]', '🏅  [子弹时间大师] 触发极限减速 50 次 —— [ 进度 38/50 ]', '🏅  [高分王者] 累计获得 100 颗星 —— [ 领取 200 💎 ]', '🏅  [流光无尽] 无尽模式突破 2000m —— [ 已达成 ✔ ]', '🏅  [全图鉴收藏] 解锁 3 种太空流光主题 —— [ 进度 1/3 ]'], '🏆   一 键 领 取 所 有 奖 励', '#C084FC', '#4C1D95');
              }
            });
          });
        }

        showPopup(title, lines, btnText, borderHex, btnBgHex) {
          if (!this.popupRoot) return;
          this.popupRoot.active = true;
          this.popupRoot.setSiblingIndex(this.node.children.length - 1);
          this.popupRoot.destroyAllChildren(); // 1. Backdrop overlay

          var overlay = this.createNode('Overlay', new Vec3(0, 0, 0), this.popupRoot);
          this.ensureTransform(overlay, 1280, 720);
          var og = overlay.addComponent(Graphics);
          og.fillColor = new Color(5, 10, 25, 180);
          og.rect(-640, -360, 1280, 720);
          og.fill();
          this.addClick(overlay, () => {
            this.popupRoot.active = false;
          }); // 2. Glassmorphic Dialog Box

          var dialog = this.createNode('Dialog', new Vec3(0, 20, 0), this.popupRoot);
          this.ensureTransform(dialog, 640, 460);
          var dg = dialog.addComponent(Graphics);
          dg.fillColor = this.hex('#0B132B');
          dg.fillColor.a = 245;
          dg.roundRect(-320, -230, 640, 460, 24);
          dg.fill();
          dg.strokeColor = this.hex(borderHex);
          dg.lineWidth = 2.5;
          dg.stroke();
          dialog.on(Node.EventType.TOUCH_END, e => {
            e.propagationStopped = true;
          }); // 3. Title & Close Button

          this.createLabel(dialog, 'Title', new Vec3(0, 185, 0), title, 24, '#FFFFFF', 450, 36);
          var closeBtn = this.createNode('CloseBtn', new Vec3(280, 185, 0), dialog);
          this.ensureTransform(closeBtn, 40, 40);
          var cg = closeBtn.addComponent(Graphics);
          cg.fillColor = this.hex('#1E293B');
          cg.circle(0, 0, 16);
          cg.fill();
          cg.strokeColor = this.hex(borderHex);
          cg.lineWidth = 1.5;
          cg.stroke();
          this.createLabel(closeBtn, 'Icon', new Vec3(0, 1, 0), '✖', 16, '#FFFFFF', 32, 32);
          this.addClick(closeBtn, () => {
            this.popupRoot.active = false;
          }); // 4. List Items

          lines.forEach((line, idx) => {
            var y = 110 - idx * 52;
            var itemNode = this.createNode("Item_" + idx, new Vec3(0, y, 0), dialog);
            this.ensureTransform(itemNode, 560, 44);
            var ig = itemNode.addComponent(Graphics);
            ig.fillColor = this.hex('#1E293B');
            ig.fillColor.a = 200;
            ig.roundRect(-270, -20, 540, 40, 12);
            ig.fill();
            ig.strokeColor = this.hex('#334155');
            ig.lineWidth = 1;
            ig.stroke();
            this.createLabel(itemNode, 'Text', new Vec3(-10, 0, 0), line, 15, '#E2E8F0', 500, 36);
          }); // 5. Bottom Hero Action Button

          var heroBtn = this.createNode('HeroBtn', new Vec3(0, -170, 0), dialog);
          this.ensureTransform(heroBtn, 360, 54);
          var hg = heroBtn.addComponent(Graphics);
          hg.fillColor = this.hex(btnBgHex);
          hg.roundRect(-180, -27, 360, 54, 27);
          hg.fill();
          hg.strokeColor = this.hex(borderHex);
          hg.lineWidth = 2;
          hg.stroke();
          this.createLabel(heroBtn, 'Text', new Vec3(0, 2, 0), btnText, 18, '#FFFFFF', 320, 36);
          this.addClick(heroBtn, () => {
            console.log("[HomeRoot] Popup action clicked: " + btnText);
            this.popupRoot.active = false;
          });
        }

        createModeSelectCards() {
          var cardsRoot = this.createNode('ModeCardsRoot', new Vec3(0, -140, 0), this.node);
          this.ensureTransform(cardsRoot, 600, 130);
          var isRose = this.currentTheme === 1;
          var isGold = this.currentTheme === 2;
          var jBg = isRose ? '#4C1D95' : isGold ? '#7C2D12' : '#1E3A8A';
          var jBorder = isRose ? '#A78BFA' : isGold ? '#FCD34D' : '#60A5FA';
          var jLine = isRose ? '#C4B5FD' : isGold ? '#FBBF24' : '#00F0FF';
          var eBg = isRose ? '#581C87' : isGold ? '#9A3412' : '#4C1D95';
          var eBorder = isRose ? '#C4B5FD' : isGold ? '#FBBF24' : '#E879F9';
          var eLine = isRose ? '#A78BFA' : isGold ? '#FCD34D' : '#F0ABFC';
          var journeyCard = this.createNode('JourneyCard', new Vec3(-145, 0, 0), cardsRoot);
          this.ensureTransform(journeyCard, 260, 115);
          var jg = journeyCard.addComponent(Graphics);
          jg.fillColor = this.hex(jBg);
          jg.fillColor.a = 235;
          jg.roundRect(-125, -55, 250, 110, 22);
          jg.fill();
          jg.strokeColor = this.hex(jBorder);
          jg.lineWidth = 3;
          jg.stroke();
          jg.strokeColor = this.hex(jLine);
          jg.lineWidth = 1.5;
          jg.moveTo(-100, 48);
          jg.lineTo(100, 48);
          jg.stroke();
          jg.fillColor = this.hex('#080E24');
          jg.roundRect(-50, -42, 100, 28, 14);
          jg.fill();
          this.createLabel(journeyCard, 'Title', new Vec3(0, 12, 0), '🏁   旅 途 模 式', 24, '#FFFFFF', 220, 36);
          this.createLabel(journeyCard, 'Sub', new Vec3(0, -28, 0), '关卡 56', 15, jBorder, 90, 24);
          this.addClick(journeyCard, () => {
            console.log('[HomeRoot] Clicked Journey Mode!');
            if (this.onStartJourneyCallback) this.onStartJourneyCallback();
          });
          var endlessCard = this.createNode('EndlessCard', new Vec3(145, 0, 0), cardsRoot);
          this.ensureTransform(endlessCard, 260, 115);
          var eg = endlessCard.addComponent(Graphics);
          eg.fillColor = this.hex(eBg);
          eg.fillColor.a = 235;
          eg.roundRect(-125, -55, 250, 110, 22);
          eg.fill();
          eg.strokeColor = this.hex(eBorder);
          eg.lineWidth = 3;
          eg.stroke();
          eg.strokeColor = this.hex(eLine);
          eg.lineWidth = 1.5;
          eg.moveTo(-100, 48);
          eg.lineTo(100, 48);
          eg.stroke();
          eg.fillColor = this.hex('#1E1B4B');
          eg.roundRect(-60, -42, 120, 28, 14);
          eg.fill();
          this.createLabel(endlessCard, 'Title', new Vec3(0, 12, 0), '♾️   流 光 无 尽', 24, '#FFFFFF', 220, 36);
          this.createLabel(endlessCard, 'Sub', new Vec3(0, -28, 0), '最高 2840m', 15, eBorder, 110, 24);
          this.addClick(endlessCard, () => {
            console.log('[HomeRoot] Clicked Endless Mode!');
            if (this.onStartEndlessCallback) this.onStartEndlessCallback();
          });
        }

        createBottomFeaturePills() {
          var pillsRoot = this.createNode('FeaturePillsRoot', new Vec3(0, -285, 0), this.node);
          this.ensureTransform(pillsRoot, 700, 50);
          var isRose = this.currentTheme === 1;
          var isGold = this.currentTheme === 2;
          var pills = [{
            text: '🔯  强化手牌  |  看广告 +1槽',
            x: -230,
            bg: isRose ? '#3B0764' : isGold ? '#451A03' : '#312E81',
            border: isRose ? '#A78BFA' : isGold ? '#FCD34D' : '#A78BFA',
            col: '#E9D5FF'
          }, {
            text: '⏱️  时空蓄能  |  能量已满',
            x: 0,
            bg: isRose ? '#4C1D95' : isGold ? '#7C2D12' : '#004D61',
            border: isRose ? '#C4B5FD' : isGold ? '#FBBF24' : '#00F0FF',
            col: '#A5F3FC'
          }, {
            text: '🔺  主题换色  |  暮色罗兰',
            x: 230,
            bg: isRose ? '#581C87' : isGold ? '#9A3412' : '#701A75',
            border: isRose ? '#A78BFA' : isGold ? '#FCD34D' : '#F472B6',
            col: '#FBCFE8'
          }];
          pills.forEach((p, idx) => {
            var node = this.createNode("Pill_" + idx, new Vec3(p.x, 0, 0), pillsRoot);
            this.ensureTransform(node, 210, 40);
            var g = node.addComponent(Graphics);
            g.fillColor = this.hex(p.bg);
            g.fillColor.a = 220;
            g.roundRect(-100, -18, 200, 36, 18);
            g.fill();
            g.strokeColor = this.hex(p.border);
            g.lineWidth = 1.8;
            g.stroke();
            this.createLabel(node, 'Text', new Vec3(0, 1, 0), p.text, 13, p.col, 190, 30);
            this.addClick(node, () => {
              console.log("[HomeRoot] Clicked feature pill: " + p.text);

              if (idx === 2) {
                if (this.onOpenSettingsCallback) this.onOpenSettingsCallback();
              } else if (idx === 0) {
                this.showPopup('🔯   强 化 手 牌 与 技 能', ['🎴  当前手牌容量:  4 张卡槽 —— [ 已达到标准容量 ]', '📺  观看激励视频广告:  解锁第 5 张永久手牌槽位！', '⚡  开局预置水晶:  每局自动携带 1 颗拐角水晶', '🛡️  护盾加持:  抵消一次太空浮岛坠落惩罚', '💎  使用 300 钻石:  立即兑换 3 次强化道具'], '📺   看 广 告 永 久 +1 卡 槽', '#A78BFA', '#312E81');
              } else if (idx === 1) {
                this.showPopup('⏱️   时 空 蓄 能 池 状 态', ['⚡  当前能量值:  8 / 10  (精力充沛 ⚡)', '⏱️  恢复速度:  每 10 分钟自动恢复 1 点时空能量', '💡  消耗提示:  每次挑战旅途模式关卡消耗 1 点能量', '♾️  无尽模式:  不消耗任何能量，随时畅快开玩！', '💎  能量补给包:  消耗 50 钻石即可瞬间回满 10 点！'], '⚡   消 耗 50 💎 瞬 间 回 满', '#00F0FF', '#004D61');
              }
            });
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
//# sourceMappingURL=c5d52930945c8cf12c8fba1192cd62406a470d35.js.map