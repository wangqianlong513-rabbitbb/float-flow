System.register(["__unresolved_0", "cc", "__unresolved_1", "__unresolved_2", "__unresolved_3", "__unresolved_4", "__unresolved_5", "__unresolved_6"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, _decorator, Button, Color, Component, Graphics, Label, Layers, Node, UITransform, Vec3, GameRoot, HomeRoot, LevelSelect, ReviveModal, SettingsModal, VictoryPoster, _dec, _class, _crd, ccclass, SceneBootstrap;

  function _reportPossibleCrUseOfGameRoot(extras) {
    _reporterNs.report("GameRoot", "./GameRoot", _context.meta, extras);
  }

  function _reportPossibleCrUseOfHomeRoot(extras) {
    _reporterNs.report("HomeRoot", "./HomeRoot", _context.meta, extras);
  }

  function _reportPossibleCrUseOfLevelSelect(extras) {
    _reporterNs.report("LevelSelect", "./LevelSelect", _context.meta, extras);
  }

  function _reportPossibleCrUseOfReviveModal(extras) {
    _reporterNs.report("ReviveModal", "./ReviveModal", _context.meta, extras);
  }

  function _reportPossibleCrUseOfSettingsModal(extras) {
    _reporterNs.report("SettingsModal", "./SettingsModal", _context.meta, extras);
  }

  function _reportPossibleCrUseOfVictoryPoster(extras) {
    _reporterNs.report("VictoryPoster", "./VictoryPoster", _context.meta, extras);
  }

  return {
    setters: [function (_unresolved_) {
      _reporterNs = _unresolved_;
    }, function (_cc) {
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
      UITransform = _cc.UITransform;
      Vec3 = _cc.Vec3;
    }, function (_unresolved_2) {
      GameRoot = _unresolved_2.GameRoot;
    }, function (_unresolved_3) {
      HomeRoot = _unresolved_3.HomeRoot;
    }, function (_unresolved_4) {
      LevelSelect = _unresolved_4.LevelSelect;
    }, function (_unresolved_5) {
      ReviveModal = _unresolved_5.ReviveModal;
    }, function (_unresolved_6) {
      SettingsModal = _unresolved_6.SettingsModal;
    }, function (_unresolved_7) {
      VictoryPoster = _unresolved_7.VictoryPoster;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "ada09AvlVVLJJIdrTV2ZQ/f", "SceneBootstrap", undefined);

      __checkObsolete__(['_decorator', 'Button', 'Color', 'Component', 'Graphics', 'Label', 'Layers', 'Node', 'UITransform', 'Vec3']);

      ({
        ccclass
      } = _decorator);

      _export("SceneBootstrap", SceneBootstrap = (_dec = ccclass('SceneBootstrap'), _dec(_class = class SceneBootstrap extends Component {
        constructor(...args) {
          super(...args);
          this.homePageRoot = null;
          this.gamePageRoot = null;
          this.levelSelectRootNode = null;
          this.settingsModalRootNode = null;
          this.reviveModalRootNode = null;
          this.victoryPosterRootNode = null;
          this.bgGraphicsNode = null;
          this.currentTheme = 0;
        }

        // 0: Icefield, 1: Violet Dusk, 2: Sunset Glow
        closeAllModals() {
          if (this.settingsModalRootNode) this.settingsModalRootNode.active = false;
          if (this.reviveModalRootNode) this.reviveModalRootNode.active = false;
          if (this.victoryPosterRootNode) this.victoryPosterRootNode.active = false;
        }

        applyTheme(themeIdx) {
          console.log(`[SceneBootstrap] Apply Theme Index ${themeIdx}`);
          this.currentTheme = themeIdx;
          if (!this.bgGraphicsNode) return;
          const g = this.bgGraphicsNode;
          g.clear();

          if (themeIdx === 1) {
            // Theme 1: Violet Dusk (暮色罗兰 - Deep Amethyst Twilight)
            g.fillColor = this.hex('#0E0818');
            g.rect(-1280, -1280, 2560, 2560);
            g.fill();
            g.fillColor = this.hex('#4C1D95');
            g.fillColor.a = 55;
            g.circle(0, 320, 500);
            g.fill();
            g.fillColor = this.hex('#6B21A8');
            g.fillColor.a = 45;
            g.circle(450, 180, 480);
            g.fill();
            g.fillColor = this.hex('#831843');
            g.fillColor.a = 35;
            g.circle(-350, -150, 420);
            g.fill();
          } else if (themeIdx === 2) {
            // Theme 2: Sunset Glow (落日余晖 - Deep Terracotta Dusk)
            g.fillColor = this.hex('#120808');
            g.rect(-1280, -1280, 2560, 2560);
            g.fill();
            g.fillColor = this.hex('#7C2D12');
            g.fillColor.a = 55;
            g.circle(0, 320, 500);
            g.fill();
            g.fillColor = this.hex('#9A3412');
            g.fillColor.a = 45;
            g.circle(450, 180, 480);
            g.fill();
            g.fillColor = this.hex('#B45309');
            g.fillColor.a = 35;
            g.circle(-350, -150, 420);
            g.fill();
          } else {
            // Theme 0: Icefield (极光冰原 - Sapphire/Cyan)
            g.fillColor = this.hex('#101E4A');
            g.rect(-1280, -1280, 2560, 2560);
            g.fill();
            g.fillColor = this.hex('#0083B0');
            g.fillColor.a = 140;
            g.circle(0, 320, 500);
            g.fill();
            g.fillColor = this.hex('#6B21A8');
            g.fillColor.a = 130;
            g.circle(450, 180, 480);
            g.fill();
            g.fillColor = this.hex('#00F0FF');
            g.fillColor.a = 70;
            g.circle(-350, -150, 420);
            g.fill();
          }

          this.drawBackgroundDecorations(g, themeIdx);

          if (this.homePageRoot) {
            const home = this.homePageRoot.getComponent(_crd && HomeRoot === void 0 ? (_reportPossibleCrUseOfHomeRoot({
              error: Error()
            }), HomeRoot) : HomeRoot);
            if (home) home.applyTheme(themeIdx);
          }

          if (this.levelSelectRootNode) {
            const levelSelect = this.levelSelectRootNode.getComponent(_crd && LevelSelect === void 0 ? (_reportPossibleCrUseOfLevelSelect({
              error: Error()
            }), LevelSelect) : LevelSelect);
            if (levelSelect) levelSelect.applyTheme(themeIdx);
          }

          if (this.gamePageRoot) {
            const game = this.gamePageRoot.getComponent(_crd && GameRoot === void 0 ? (_reportPossibleCrUseOfGameRoot({
              error: Error()
            }), GameRoot) : GameRoot);
            if (game) game.applyTheme(themeIdx);
          }

          if (this.settingsModalRootNode) {
            const settings = this.settingsModalRootNode.getComponent(_crd && SettingsModal === void 0 ? (_reportPossibleCrUseOfSettingsModal({
              error: Error()
            }), SettingsModal) : SettingsModal);
            if (settings) settings.applyTheme(themeIdx);
          }
        }

        drawBackgroundDecorations(graphics, themeIdx) {
          // 5. Center Nebula Aura
          graphics.fillColor = themeIdx === 1 ? this.hex('#3B0764') : themeIdx === 2 ? this.hex('#451A03') : this.hex('#312E81');
          graphics.fillColor.a = 80;
          graphics.circle(0, 0, 450);
          graphics.fill(); // 6. Distant Floating Isometric Shards

          const shards = [{
            x: -500,
            y: 240,
            size: 55,
            colTop: '#3B82F6',
            colLeft: '#1D4ED8',
            colRight: '#1E3A8A',
            a: 130,
            h: 26
          }, {
            x: 540,
            y: 200,
            size: 45,
            colTop: '#A855F7',
            colLeft: '#6B21A8',
            colRight: '#4C1D95',
            a: 120,
            h: 22
          }, {
            x: -540,
            y: -40,
            size: 42,
            colTop: '#00F0FF',
            colLeft: '#0083B0',
            colRight: '#004D61',
            a: 140,
            h: 20
          }, {
            x: 560,
            y: -60,
            size: 60,
            colTop: '#EC4899',
            colLeft: '#BE185D',
            colRight: '#831843',
            a: 110,
            h: 28
          }, {
            x: -440,
            y: -250,
            size: 50,
            colTop: '#60A5FA',
            colLeft: '#2563EB',
            colRight: '#1D4ED8',
            a: 125,
            h: 24
          }, {
            x: 490,
            y: -230,
            size: 52,
            colTop: '#C084FC',
            colLeft: '#7E22CE',
            colRight: '#581C87',
            a: 130,
            h: 26
          }, {
            x: -290,
            y: 290,
            size: 36,
            colTop: '#F472B6',
            colLeft: '#DB2777',
            colRight: '#9D174D',
            a: 105,
            h: 16
          }, {
            x: 330,
            y: 270,
            size: 38,
            colTop: '#38BDF8',
            colLeft: '#0284C7',
            colRight: '#0369A1',
            a: 115,
            h: 18
          }, {
            x: -590,
            y: 100,
            size: 32,
            colTop: '#818CF8',
            colLeft: '#4F46E5',
            colRight: '#3730A3',
            a: 100,
            h: 15
          }, {
            x: 590,
            y: 80,
            size: 34,
            colTop: '#34D399',
            colLeft: '#059669',
            colRight: '#047857',
            a: 110,
            h: 16
          }, {
            x: -220,
            y: -280,
            size: 44,
            colTop: '#E879F9',
            colLeft: '#A21CAF',
            colRight: '#701A75',
            a: 120,
            h: 20
          }, {
            x: 240,
            y: -270,
            size: 46,
            colTop: '#60A5FA',
            colLeft: '#3B82F6',
            colRight: '#1D4ED8',
            a: 125,
            h: 22
          }];

          for (const s of shards) {
            const halfW = s.size;
            const halfH = s.size * 0.5;
            let topCol = this.hex(s.colTop);
            let leftCol = this.hex(s.colLeft);
            let rightCol = this.hex(s.colRight);

            if (themeIdx === 1) {
              topCol = this.hex('#7C3AED');
              leftCol = this.hex('#581C87');
              rightCol = this.hex('#3B0764');
            } else if (themeIdx === 2) {
              topCol = this.hex('#C2410C');
              leftCol = this.hex('#9A3412');
              rightCol = this.hex('#7C2D12');
            }

            topCol.a = s.a;
            leftCol.a = s.a;
            rightCol.a = s.a;
            graphics.fillColor = topCol;
            graphics.moveTo(s.x, s.y + halfH);
            graphics.lineTo(s.x + halfW, s.y);
            graphics.lineTo(s.x, s.y - halfH);
            graphics.lineTo(s.x - halfW, s.y);
            graphics.close();
            graphics.fill();
            graphics.fillColor = leftCol;
            graphics.moveTo(s.x - halfW, s.y);
            graphics.lineTo(s.x, s.y - halfH);
            graphics.lineTo(s.x, s.y - halfH - s.h);
            graphics.lineTo(s.x - halfW, s.y - s.h);
            graphics.close();
            graphics.fill();
            graphics.fillColor = rightCol;
            graphics.moveTo(s.x, s.y - halfH);
            graphics.lineTo(s.x + halfW, s.y);
            graphics.lineTo(s.x + halfW, s.y - s.h);
            graphics.lineTo(s.x, s.y - halfH - s.h);
            graphics.close();
            graphics.fill();
            graphics.strokeColor = this.hex('#FFFFFF');
            graphics.strokeColor.a = s.a + 50;
            graphics.lineWidth = 1.5;
            graphics.moveTo(s.x, s.y + halfH);
            graphics.lineTo(s.x + halfW, s.y);
            graphics.lineTo(s.x, s.y - halfH);
            graphics.lineTo(s.x - halfW, s.y);
            graphics.close();
            graphics.stroke();
          } // 7. Starfield particles & cyber sparkles


          for (let i = 0; i < 45; i++) {
            const x = Math.sin(i * 997) * 620;
            const y = Math.cos(i * 631) * 360;
            const radius = 1.2 + i % 3 * 0.8;
            graphics.fillColor = themeIdx === 1 ? i % 2 === 0 ? this.hex('#E879F9') : this.hex('#FFFFFF') : themeIdx === 2 ? i % 2 === 0 ? this.hex('#FDE047') : this.hex('#FFFFFF') : i % 4 === 0 ? this.hex('#00F0FF') : i % 3 === 0 ? this.hex('#F472B6') : this.hex('#FFFFFF');
            graphics.fillColor.a = 160 + i % 5 * 18;
            graphics.circle(x, y, radius);
            graphics.fill();

            if (radius > 2) {
              graphics.strokeColor = graphics.fillColor;
              graphics.lineWidth = 1;
              graphics.moveTo(x - radius * 2.5, y);
              graphics.lineTo(x + radius * 2.5, y);
              graphics.moveTo(x, y - radius * 2.5);
              graphics.lineTo(x, y + radius * 2.5);
              graphics.stroke();
            }
          }
        }

        onLoad() {
          var _gamePage$getComponen;

          console.log('[FloatFlow] SceneBootstrap onLoad');
          const root = this.node;
          root.name = root.name || 'Root';
          root.layer = Layers.Enum.UI_2D;
          root.setPosition(new Vec3(0, 0, 0));
          this.ensureTransform(root, 1280, 720);
          root.destroyAllChildren(); // 0. Shared Cosmic Sapphire Background

          const bgRoot = this.createRoot('BgRoot', new Vec3(0, 0, 0));
          this.createBackground(bgRoot); // 1. Home Page Root (Default Active!)

          const homePage = this.createRoot('HomePage', new Vec3(0, 0, 0));
          this.homePageRoot = homePage;
          const home = homePage.addComponent(_crd && HomeRoot === void 0 ? (_reportPossibleCrUseOfHomeRoot({
            error: Error()
          }), HomeRoot) : HomeRoot); // 2. Game Page Root (Hidden by default until player starts a game!)

          const gamePage = this.createRoot('GamePage', new Vec3(0, 0, 0));
          this.gamePageRoot = gamePage;
          gamePage.active = false;
          const boardRoot = this.createRoot('BoardRoot', new Vec3(0, -75, 0), gamePage);
          const previewRoot = this.createRoot('PreviewRoot', new Vec3(0, -75, 0), gamePage);
          const runnerRoot = this.createRoot('RunnerRoot', new Vec3(0, -75, 0), gamePage);
          const cardRoot = this.createRoot('CardRoot', new Vec3(0, -215, 0), gamePage);
          const uiRoot = this.createRoot('UI', new Vec3(0, 0, 0), gamePage); // 1. Top Navigation Bar (matching Concept Art: Pause ||, Level Title, Progress Dots, Energy Pill)

          this.createTopNav(uiRoot, new Vec3(0, 315, 0)); // 2. Bottom Card Deck Background (compacted and raised to fit 720p widescreen!)

          this.createBottomDeck(uiRoot, new Vec3(0, -215, 0)); // 3. Typography & Prompts matching Concept Art

          const levelLabel = this.createLabel(uiRoot, 'LevelLabel', new Vec3(-50, 316, 0), '旅途模式 · 5-12', 24, '#FFFFFF', 300, 50); // Tip Pill with glassmorphic background

          const tipPill = this.createRoot('TipPill', new Vec3(0, -120, 0), uiRoot);
          this.ensureTransform(tipPill, 340, 32);
          const tg = tipPill.addComponent(Graphics);
          tg.fillColor = this.hex('#080E24');
          tg.fillColor.a = 210;
          tg.roundRect(-170, -16, 340, 32, 16);
          tg.fill();
          tg.strokeColor = this.hex('#3B82F6');
          tg.lineWidth = 1.5;
          tg.stroke();
          const tipLabel = this.createLabel(tipPill, 'TipLabel', new Vec3(0, 1, 0), '长按任意手牌：时空减速 ❓', 15, '#00F0FF', 320, 30);
          const statusLabel = this.createLabel(uiRoot, 'StatusLabel', new Vec3(0, -152, 0), '拖动手牌到地图放置', 17, '#60A5FA', 680, 30);
          const game = (_gamePage$getComponen = gamePage.getComponent(_crd && GameRoot === void 0 ? (_reportPossibleCrUseOfGameRoot({
            error: Error()
          }), GameRoot) : GameRoot)) != null ? _gamePage$getComponen : gamePage.addComponent(_crd && GameRoot === void 0 ? (_reportPossibleCrUseOfGameRoot({
            error: Error()
          }), GameRoot) : GameRoot);
          game.boardRoot = boardRoot;
          game.previewRoot = previewRoot;
          game.runnerRoot = runnerRoot;
          game.cardRoot = cardRoot;
          game.levelLabel = levelLabel;
          game.tipLabel = tipLabel;
          game.statusLabel = statusLabel; // 5. Left Bullet Time Meter & Right Action Buttons

          this.createBulletTimeMeter(uiRoot, new Vec3(-310, 110, 0));
          this.createSideActionButtons(uiRoot, game); // 4. Main Control Deck Buttons at Y = -320 (perfectly visible inside 720p preview!)

          this.createSecondaryButton(uiRoot, 'RestartButton', new Vec3(-230, -320, 0), '🔄 重开', () => game.restartLevel());
          this.createHeroButton(uiRoot, 'StartButton', new Vec3(0, -320, 0), '⚡  启动流光', () => game.startRunner());
          this.createSecondaryButton(uiRoot, 'NextButton', new Vec3(230, -320, 0), '⏭️ 下一关', () => game.loadNextLevel()); // 3. Settings Modal Root (Hidden by default!)

          const settingsModalRoot = this.createRoot('SettingsModalRoot', new Vec3(0, 0, 0));
          settingsModalRoot.active = false;
          this.settingsModalRootNode = settingsModalRoot;
          const settingsModal = settingsModalRoot.addComponent(_crd && SettingsModal === void 0 ? (_reportPossibleCrUseOfSettingsModal({
            error: Error()
          }), SettingsModal) : SettingsModal);

          settingsModal.onThemeChangedCallback = idx => {
            this.applyTheme(idx);
          }; // 6. Revive Modal Root (Hidden by default!)


          const reviveModalRoot = this.createRoot('ReviveModalRoot', new Vec3(0, 0, 0));
          reviveModalRoot.active = false;
          this.reviveModalRootNode = reviveModalRoot;
          const reviveModal = reviveModalRoot.addComponent(_crd && ReviveModal === void 0 ? (_reportPossibleCrUseOfReviveModal({
            error: Error()
          }), ReviveModal) : ReviveModal);

          reviveModal.onReviveCallback = () => {
            console.log('[SceneBootstrap] Revive -> Continue runner!');
            game.reviveRunner();
          };

          reviveModal.onGiveUpCallback = () => {
            console.log('[SceneBootstrap] Give up -> Restart level!');
            game.restartLevel();
          };

          game.onShowReviveModalCallback = () => {
            console.log('[SceneBootstrap] Show Revive Modal!');
            reviveModalRoot.active = true;
          }; // 7. Level Select Root (Hidden by default!)


          const levelSelectRoot = this.createRoot('LevelSelectRoot', new Vec3(0, 0, 0));
          levelSelectRoot.active = false;
          this.levelSelectRootNode = levelSelectRoot;
          const levelSelect = levelSelectRoot.addComponent(_crd && LevelSelect === void 0 ? (_reportPossibleCrUseOfLevelSelect({
            error: Error()
          }), LevelSelect) : LevelSelect);

          levelSelect.onSelectLevelCallback = idx => {
            console.log(`[SceneBootstrap] LevelSelect -> Start Level Index ${idx}!`);
            this.closeAllModals();
            levelSelectRoot.active = false;
            gamePage.active = true;
            game.loadLevel(idx);
          };

          levelSelect.onReturnHomeCallback = () => {
            console.log('[SceneBootstrap] LevelSelect -> Return to HomePage!');
            this.closeAllModals();
            levelSelectRoot.active = false;
            homePage.active = true;
          };

          levelSelect.onStartEndlessCallback = () => {
            console.log('[SceneBootstrap] LevelSelect -> Start Endless Mode!');
            this.closeAllModals();
            levelSelectRoot.active = false;
            gamePage.active = true;
            game.restartLevel();
          }; // 8. Victory Poster Root (Hidden by default!)


          const victoryPosterRoot = this.createRoot('VictoryPosterRoot', new Vec3(0, 0, 0));
          victoryPosterRoot.active = false;
          this.victoryPosterRootNode = victoryPosterRoot;
          const victoryPoster = victoryPosterRoot.addComponent(_crd && VictoryPoster === void 0 ? (_reportPossibleCrUseOfVictoryPoster({
            error: Error()
          }), VictoryPoster) : VictoryPoster);

          victoryPoster.onCloseCallback = () => {
            console.log('[SceneBootstrap] VictoryPoster closed -> Return to LevelSelect!');
            this.closeAllModals();
            gamePage.active = false;
            levelSelectRoot.active = true;
          };

          victoryPoster.onNextLevelCallback = () => {
            console.log('[SceneBootstrap] VictoryPoster Next Level -> Load Next!');
            this.closeAllModals();
            game.loadNextLevel();
          };

          game.onShowVictoryPosterCallback = (levelName, stars, moves) => {
            console.log(`[SceneBootstrap] Show Victory Poster for ${levelName}!`);
            victoryPosterRoot.active = true;
            victoryPoster.showVictory(levelName, stars, moves);
          }; // Connect Home Page to Game Page, Level Select & Settings!


          home.onOpenSettingsCallback = () => {
            console.log('[SceneBootstrap] Open Settings Modal!');
            settingsModalRoot.active = true;
          };

          home.onStartJourneyCallback = () => {
            console.log('[SceneBootstrap] Start Journey Mode -> Open LevelSelect!');
            this.closeAllModals();
            homePage.active = false;
            levelSelectRoot.active = true;
          };

          home.onStartEndlessCallback = () => {
            console.log('[SceneBootstrap] Start Endless Mode -> Switch to GamePage!');
            this.closeAllModals();
            homePage.active = false;
            gamePage.active = true;
            game.restartLevel();
          };
        }

        createRoot(name, position, parent) {
          const node = new Node(name);
          node.layer = Layers.Enum.UI_2D;
          node.setParent(parent || this.node);
          node.setPosition(position);
          this.ensureTransform(node, 1, 1);
          return node;
        }

        createBackground(parent) {
          const node = new Node('Background');
          node.layer = Layers.Enum.UI_2D;
          node.setParent(parent);
          node.setPosition(new Vec3(0, 0, -10));
          this.ensureTransform(node, 2560, 2560);
          const graphics = node.addComponent(Graphics);
          this.bgGraphicsNode = graphics;
          this.applyTheme(0);
        }

        createTopNav(parent, position) {
          const node = new Node('TopNav');
          node.layer = Layers.Enum.UI_2D;
          node.setParent(parent);
          node.setPosition(position);
          this.ensureTransform(node, 710, 76);
          const graphics = node.addComponent(Graphics); // Glassmorphic top navigation panel

          graphics.fillColor = this.hex('#0D162C');
          graphics.fillColor.a = 220;
          graphics.roundRect(-355, -38, 710, 76, 24);
          graphics.fill();
          graphics.strokeColor = this.hex('#00F0FF');
          graphics.lineWidth = 1.8;
          graphics.stroke(); // Left Pause Icon Button [ || ]

          graphics.fillColor = this.hex('#1E293B');
          graphics.roundRect(-335, -22, 44, 44, 12);
          graphics.fill();
          graphics.strokeColor = this.hex('#00F0FF');
          graphics.lineWidth = 2.5;
          graphics.moveTo(-317, -10);
          graphics.lineTo(-317, 10);
          graphics.moveTo(-309, -10);
          graphics.lineTo(-309, 10);
          graphics.stroke(); // Far-Right Energy Pill (⚡ 3/3 +)

          graphics.fillColor = this.hex('#1E1B4B');
          graphics.roundRect(260, -20, 80, 40, 20);
          graphics.fill();
          graphics.strokeColor = this.hex('#A78BFA');
          graphics.lineWidth = 1.5;
          graphics.stroke();
          this.createLabel(node, 'EnergyText', new Vec3(300, 0, 0), '⚡ 3/3 +', 15, '#FDE047', 75, 30); // Level Progress Dots Line (O——●——O——O  到达终点)

          graphics.strokeColor = this.hex('#00F0FF');
          graphics.lineWidth = 2;
          graphics.moveTo(-90, -22);
          graphics.lineTo(90, -22);
          graphics.stroke();
          const dotXs = [-90, -30, 30, 90];
          dotXs.forEach((dx, idx) => {
            if (idx === 0) {
              graphics.fillColor = this.hex('#00F0FF');
              graphics.circle(dx, -22, 6);
              graphics.fill();
            } else if (idx === 1) {
              graphics.fillColor = this.hex('#FFFFFF');
              graphics.circle(dx, -22, 7);
              graphics.fill();
              graphics.strokeColor = this.hex('#00F0FF');
              graphics.lineWidth = 2.5;
              graphics.circle(dx, -22, 7);
              graphics.stroke();
            } else {
              graphics.fillColor = this.hex('#1E3A8A');
              graphics.circle(dx, -22, 6);
              graphics.fill();
              graphics.strokeColor = this.hex('#60A5FA');
              graphics.lineWidth = 1.5;
              graphics.circle(dx, -22, 6);
              graphics.stroke();
            }
          });
          this.createLabel(node, 'ProgressSub', new Vec3(0, -40, 0), '到 达 终 点', 13, '#93C5FD', 100, 20); // Clickable Pause / Return to Home button!

          const homeReturnBtn = new Node('HomeReturnBtn');
          homeReturnBtn.layer = Layers.Enum.UI_2D;
          homeReturnBtn.setParent(node);
          homeReturnBtn.setPosition(new Vec3(-313, 0, 0));
          this.ensureTransform(homeReturnBtn, 50, 50);
          this.addClick(homeReturnBtn, () => {
            console.log('[SceneBootstrap] Clicked Home/Pause -> Return to LevelSelect or HomePage!');
            this.closeAllModals();

            if (this.gamePageRoot) {
              this.gamePageRoot.active = false;
            }

            if (this.levelSelectRootNode) {
              this.levelSelectRootNode.active = true;
            } else if (this.homePageRoot) {
              this.homePageRoot.active = true;
            }
          });
        }

        createBottomDeck(parent, position) {
          const node = new Node('BottomDeck');
          node.layer = Layers.Enum.UI_2D;
          node.setParent(parent);
          node.setPosition(position);
          this.ensureTransform(node, 700, 160);
          const graphics = node.addComponent(Graphics); // Luminous Sapphire Glassmorphic Tray (透亮深蓝宝石毛玻璃底台，告别灰色长方形！)

          graphics.fillColor = this.hex('#1E3A8A');
          graphics.fillColor.a = 150;
          graphics.roundRect(-350, -80, 700, 160, 28);
          graphics.fill(); // Inner violet energy glow

          graphics.fillColor = this.hex('#4C1D95');
          graphics.fillColor.a = 100;
          graphics.roundRect(-340, -70, 680, 140, 22);
          graphics.fill(); // Bright sky blue glowing border

          graphics.strokeColor = this.hex('#60A5FA');
          graphics.lineWidth = 2.5;
          graphics.stroke();
        }

        createBulletTimeMeter(parent, position) {
          const node = new Node('BulletTimeMeter');
          node.layer = Layers.Enum.UI_2D;
          node.setParent(parent);
          node.setPosition(position);
          this.ensureTransform(node, 60, 150);
          const g = node.addComponent(Graphics); // Track

          g.fillColor = this.hex('#0B132B');
          g.roundRect(-4, -40, 8, 80, 4);
          g.fill(); // Active Fill (70%)

          g.fillColor = this.hex('#00F0FF');
          g.roundRect(-4, -40, 8, 56, 4);
          g.fill();
          this.createLabel(node, 'Title', new Vec3(0, 55, 0), '子弹时间', 13, '#93C5FD', 60, 20);
          this.createLabel(node, 'Value', new Vec3(0, 36, 0), '1.8s', 17, '#00F0FF', 60, 22);
        }

        createSideActionButtons(parent, game) {
          const root = new Node('SideActions');
          root.layer = Layers.Enum.UI_2D;
          root.setParent(parent);
          root.setPosition(new Vec3(310, -50, 0));
          this.ensureTransform(root, 70, 180); // 1. Preview Button [ 🔄 ] 预览

          this.createCircularButton(root, 'PreviewBtn', new Vec3(0, 40, 0), '🔄', '预 览', () => {
            game.showRoutePreview();
          }); // 2. Erase Button [ 🗑️ ] 擦除

          const eraseBtn = new Node('EraseBtn');
          eraseBtn.layer = Layers.Enum.UI_2D;
          eraseBtn.setParent(root);
          eraseBtn.setPosition(new Vec3(0, -40, 0));
          this.ensureTransform(eraseBtn, 64, 80);
          const eg = eraseBtn.addComponent(Graphics);
          eg.fillColor = this.hex('#1E3A8A');
          eg.fillColor.a = 220;
          eg.circle(0, 10, 28);
          eg.fill();
          eg.strokeColor = this.hex('#FF4B3E');
          eg.lineWidth = 2;
          eg.stroke();
          this.createLabel(eraseBtn, 'Icon', new Vec3(0, 12, 0), '🗑️', 22, '#FFFFFF', 50, 50);
          this.createLabel(eraseBtn, 'Text', new Vec3(0, -26, 0), '擦 除', 13, '#FF4B3E', 60, 20);
          this.addClick(eraseBtn, () => {
            game.clearPlacedTiles();
          });
        }

        addClick(node, onClick) {
          let btn = node.getComponent(Button);
          if (!btn) btn = node.addComponent(Button);
          btn.transition = Button.Transition.SCALE;
          btn.zoomScale = 0.92;
          node.off(Button.EventType.CLICK);
          node.on(Button.EventType.CLICK, onClick, this);
          node.off(Node.EventType.TOUCH_END);
          node.on(Node.EventType.TOUCH_END, onClick, this);
        }

        createCircularButton(parent, name, position, icon, labelText, onClick) {
          const node = new Node(name);
          node.layer = Layers.Enum.UI_2D;
          node.setParent(parent);
          node.setPosition(position);
          this.ensureTransform(node, 64, 80);
          const graphics = node.addComponent(Graphics);
          graphics.fillColor = this.hex('#0D162C');
          graphics.fillColor.a = 230;
          graphics.circle(0, 10, 30);
          graphics.fill();
          graphics.strokeColor = this.hex('#00F0FF');
          graphics.lineWidth = 2;
          graphics.stroke();
          const iconLabel = this.createLabel(node, 'Icon', new Vec3(0, 10, 1), icon, 24, '#FFFFFF', 50, 50);
          const textLabel = this.createLabel(node, 'Text', new Vec3(0, -28, 1), labelText, 14, '#60A5FA', 64, 24);
          this.addClick(node, onClick);
        }

        createHeroButton(parent, name, position, text, onClick) {
          const node = new Node(name);
          node.layer = Layers.Enum.UI_2D;
          node.setParent(parent);
          node.setPosition(position);
          const width = 240;
          const height = 66;
          this.ensureTransform(node, width, height);
          const graphics = node.addComponent(Graphics); // Vibrant Neon Cyan/Blue Hero Button

          graphics.fillColor = this.hex('#00E5FF');
          graphics.roundRect(-width / 2, -height / 2, width, height, 33);
          graphics.fill();
          graphics.strokeColor = this.hex('#FFFFFF');
          graphics.lineWidth = 3.5;
          graphics.stroke();
          const labelNode = new Node('Label');
          labelNode.layer = Layers.Enum.UI_2D;
          labelNode.setParent(node);
          labelNode.setPosition(new Vec3(0, -2, 1));
          this.ensureTransform(labelNode, width, height - 8);
          const label = labelNode.addComponent(Label);
          label.string = text;
          label.fontSize = 24;
          label.color = this.hex('#080E24');
          this.addClick(node, onClick);
        }

        createSecondaryButton(parent, name, position, text, onClick) {
          const node = new Node(name);
          node.layer = Layers.Enum.UI_2D;
          node.setParent(parent);
          node.setPosition(position);
          const width = 145;
          const height = 54;
          this.ensureTransform(node, width, height);
          const graphics = node.addComponent(Graphics); // Sleek Cyber Violet Secondary Button

          graphics.fillColor = this.hex('#1E1B4B');
          graphics.roundRect(-width / 2, -height / 2, width, height, 18);
          graphics.fill();
          graphics.strokeColor = this.hex('#A78BFA');
          graphics.lineWidth = 2;
          graphics.stroke();
          const labelNode = new Node('Label');
          labelNode.layer = Layers.Enum.UI_2D;
          labelNode.setParent(node);
          labelNode.setPosition(new Vec3(0, -2, 1));
          this.ensureTransform(labelNode, width, height - 8);
          const label = labelNode.addComponent(Label);
          label.string = text;
          label.fontSize = 19;
          label.color = this.hex('#FFFFFF');
          this.addClick(node, onClick);
        }

        createLabel(parent, name, position, text, size, color, width = 520, height = 60) {
          const node = new Node(name);
          node.layer = Layers.Enum.UI_2D;
          node.setParent(parent);
          node.setPosition(position);
          this.ensureTransform(node, width, height);
          const label = node.addComponent(Label);
          label.string = text;
          label.fontSize = size;
          label.color = this.hex(color);
          return label;
        }

        ensureTransform(node, width, height) {
          let transform = node.getComponent(UITransform);

          if (!transform) {
            transform = node.addComponent(UITransform);
          }

          transform.setContentSize(width, height);
          return transform;
        }

        hex(value) {
          const color = new Color();
          Color.fromHEX(color, value);
          return color;
        }

      }) || _class));

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=9c835b0e1381daf4516e2d23b716ef46f90b756f.js.map