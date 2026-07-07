System.register(["__unresolved_0", "cc", "__unresolved_1", "__unresolved_2", "__unresolved_3", "__unresolved_4", "__unresolved_5", "__unresolved_6"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, _decorator, Color, Component, Graphics, Label, Layers, Node, UITransform, Vec3, director, tween, CardSystem, GridManager, move, RouteSimulator, createTile, getTileDisplayName, resolveTileConfig, rotateTile, BUILTIN_LEVELS, _dec, _dec2, _dec3, _dec4, _dec5, _dec6, _dec7, _dec8, _class, _class2, _descriptor, _descriptor2, _descriptor3, _descriptor4, _descriptor5, _descriptor6, _descriptor7, _descriptor8, _descriptor9, _descriptor10, _descriptor11, _crd, ccclass, property, GameRoot;

  function _initializerDefineProperty(target, property, descriptor, context) { if (!descriptor) return; Object.defineProperty(target, property, { enumerable: descriptor.enumerable, configurable: descriptor.configurable, writable: descriptor.writable, value: descriptor.initializer ? descriptor.initializer.call(context) : void 0 }); }

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  function _initializerWarningHelper(descriptor, context) { throw new Error('Decorating class property failed. Please ensure that ' + 'transform-class-properties is enabled and runs after the decorators transform.'); }

  function _reportPossibleCrUseOfCardSystem(extras) {
    _reporterNs.report("CardSystem", "../core/CardSystem", _context.meta, extras);
  }

  function _reportPossibleCrUseOfGridManager(extras) {
    _reporterNs.report("GridManager", "../core/GridManager", _context.meta, extras);
  }

  function _reportPossibleCrUseOfmove(extras) {
    _reporterNs.report("move", "../core/DirectionUtils", _context.meta, extras);
  }

  function _reportPossibleCrUseOfGoalConfig(extras) {
    _reporterNs.report("GoalConfig", "../core/GameTypes", _context.meta, extras);
  }

  function _reportPossibleCrUseOfGridPos(extras) {
    _reporterNs.report("GridPos", "../core/GameTypes", _context.meta, extras);
  }

  function _reportPossibleCrUseOfLevelConfig(extras) {
    _reporterNs.report("LevelConfig", "../core/GameTypes", _context.meta, extras);
  }

  function _reportPossibleCrUseOfRunnerColor(extras) {
    _reporterNs.report("RunnerColor", "../core/GameTypes", _context.meta, extras);
  }

  function _reportPossibleCrUseOfRunnerState(extras) {
    _reporterNs.report("RunnerState", "../core/GameTypes", _context.meta, extras);
  }

  function _reportPossibleCrUseOfTileInstance(extras) {
    _reporterNs.report("TileInstance", "../core/GameTypes", _context.meta, extras);
  }

  function _reportPossibleCrUseOfTileType(extras) {
    _reporterNs.report("TileType", "../core/GameTypes", _context.meta, extras);
  }

  function _reportPossibleCrUseOfRouteSimulator(extras) {
    _reporterNs.report("RouteSimulator", "../core/RouteSimulator", _context.meta, extras);
  }

  function _reportPossibleCrUseOfcreateTile(extras) {
    _reporterNs.report("createTile", "../core/TileDefinitions", _context.meta, extras);
  }

  function _reportPossibleCrUseOfgetTileDisplayName(extras) {
    _reporterNs.report("getTileDisplayName", "../core/TileDefinitions", _context.meta, extras);
  }

  function _reportPossibleCrUseOfresolveTileConfig(extras) {
    _reporterNs.report("resolveTileConfig", "../core/TileDefinitions", _context.meta, extras);
  }

  function _reportPossibleCrUseOfrotateTile(extras) {
    _reporterNs.report("rotateTile", "../core/TileDefinitions", _context.meta, extras);
  }

  function _reportPossibleCrUseOfBUILTIN_LEVELS(extras) {
    _reporterNs.report("BUILTIN_LEVELS", "../level/BuiltinLevels", _context.meta, extras);
  }

  return {
    setters: [function (_unresolved_) {
      _reporterNs = _unresolved_;
    }, function (_cc) {
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
      UITransform = _cc.UITransform;
      Vec3 = _cc.Vec3;
      director = _cc.director;
      tween = _cc.tween;
    }, function (_unresolved_2) {
      CardSystem = _unresolved_2.CardSystem;
    }, function (_unresolved_3) {
      GridManager = _unresolved_3.GridManager;
    }, function (_unresolved_4) {
      move = _unresolved_4.move;
    }, function (_unresolved_5) {
      RouteSimulator = _unresolved_5.RouteSimulator;
    }, function (_unresolved_6) {
      createTile = _unresolved_6.createTile;
      getTileDisplayName = _unresolved_6.getTileDisplayName;
      resolveTileConfig = _unresolved_6.resolveTileConfig;
      rotateTile = _unresolved_6.rotateTile;
    }, function (_unresolved_7) {
      BUILTIN_LEVELS = _unresolved_7.BUILTIN_LEVELS;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "dbb254PQxJIv4EhjYC4YJE9", "GameRoot", undefined);

      __checkObsolete__(['_decorator', 'Color', 'Component', 'EventTouch', 'Graphics', 'Label', 'Layers', 'Node', 'UITransform', 'Vec3', 'director', 'tween']);

      ({
        ccclass,
        property
      } = _decorator);

      _export("GameRoot", GameRoot = (_dec = ccclass('GameRoot'), _dec2 = property(Node), _dec3 = property(Node), _dec4 = property(Node), _dec5 = property(Node), _dec6 = property(Label), _dec7 = property(Label), _dec8 = property(Label), _dec(_class = (_class2 = class GameRoot extends Component {
        constructor(...args) {
          super(...args);

          _initializerDefineProperty(this, "boardRoot", _descriptor, this);

          _initializerDefineProperty(this, "previewRoot", _descriptor2, this);

          _initializerDefineProperty(this, "runnerRoot", _descriptor3, this);

          _initializerDefineProperty(this, "cardRoot", _descriptor4, this);

          _initializerDefineProperty(this, "levelLabel", _descriptor5, this);

          _initializerDefineProperty(this, "tipLabel", _descriptor6, this);

          _initializerDefineProperty(this, "statusLabel", _descriptor7, this);

          this.onShowReviveModalCallback = void 0;
          this.onShowVictoryPosterCallback = void 0;

          _initializerDefineProperty(this, "tileWidth", _descriptor8, this);

          _initializerDefineProperty(this, "tileHeight", _descriptor9, this);

          _initializerDefineProperty(this, "cardWidth", _descriptor10, this);

          _initializerDefineProperty(this, "cardHeight", _descriptor11, this);

          this.levels = _crd && BUILTIN_LEVELS === void 0 ? (_reportPossibleCrUseOfBUILTIN_LEVELS({
            error: Error()
          }), BUILTIN_LEVELS) : BUILTIN_LEVELS;
          this.levelIndex = 0;
          this.level = null;
          this.grid = null;
          this.runner = null;
          this.cardSystem = null;
          this.hand = [];
          this.tileNodes = new Map();
          this.cardNodes = [];
          this.runnerNode = null;
          this.dragTile = null;
          this.dragCardIndex = -1;
          this.dragNode = null;
          this.hoverCell = null;
          this.usedMoves = 0;
          this.flowEnergy = 0;
          this.runnerTimer = 0;
          this.isResolving = false;
          this.currentTheme = 0;
        }

        // 0: Icefield, 1: Violet Dusk, 2: Sunset Glow
        applyTheme(themeIdx) {
          console.log(`[GameRoot] Apply Theme Index ${themeIdx}`);
          this.currentTheme = themeIdx;

          if (this.level) {
            this.renderBoard();
            this.renderAllTiles();
            this.renderCards();
          }
        }

        start() {
          // If this log does not appear in Preview console, the component is not mounted.
          console.log('[FloatFlow] GameRoot started');
          this.ensureRoots();
          this.loadLevel(0);
        }

        update(deltaTime) {
          if (!this.level || !this.grid || !this.runner || this.runner.state !== 'RUNNING' || this.isResolving) {
            return;
          }

          const slowFactor = this.dragTile ? 0.35 : 1;
          this.runnerTimer += deltaTime * slowFactor;

          if (this.runnerTimer >= this.level.runnerStepSeconds / Math.max(0.1, this.runner.speed)) {
            this.runnerTimer = 0;
            this.advanceRunnerOneStep();
          }
        }

        loadNextLevel() {
          const next = (this.levelIndex + 1) % this.levels.length;
          this.loadLevel(next);
        }

        restartLevel() {
          this.loadLevel(this.levelIndex);
        }

        startRunner() {
          if (this.runner && this.runner.state === 'IDLE') {
            this.runner.state = 'RUNNING';
            this.setStatus('流光已启动！观察光路与救场触发。');
          }
        }

        redrawCardsByAdStub() {
          // This button hook is useful before the real WeChat rewarded video service is wired.
          if (!this.cardSystem) {
            return;
          }

          this.hand = this.cardSystem.redrawAll();
          this.renderCards();
          this.setStatus('手牌已刷新');
        }

        clearPlacedTiles() {
          console.log('[FloatFlow] Clear Placed Tiles');
          this.restartLevel();
          this.setStatus('已擦除放置地砖，手牌已重置');
        }

        showRoutePreview() {
          console.log('[FloatFlow] Show Route Preview');

          if (this.previewRoot) {
            this.previewRoot.active = !this.previewRoot.active;
            this.setStatus(this.previewRoot.active ? '光轨预测已开启' : '光轨预测已隐藏');
          }
        }

        reviveRunner() {
          console.log('[FloatFlow] Revive Runner!');

          if (this.runner && (this.runner.state === 'DEAD' || this.runner.state === 'IDLE')) {
            this.runner.state = 'IDLE';

            if (this.cardSystem) {
              this.hand = this.cardSystem.drawInitial();
              this.renderCards();
            }

            this.setStatus('时空导师已降临！救场成功，获得3秒无敌光环，请继续放置手牌！');
          }
        }

        ensureRoots() {
          var _this$boardRoot, _this$previewRoot, _this$runnerRoot, _this$cardRoot;

          this.node.layer = Layers.Enum.UI_2D;
          this.boardRoot = (_this$boardRoot = this.boardRoot) != null ? _this$boardRoot : this.createRoot('BoardRoot', new Vec3(0, -100, 0));
          this.previewRoot = (_this$previewRoot = this.previewRoot) != null ? _this$previewRoot : this.createRoot('PreviewRoot', new Vec3(0, -100, 0));
          this.runnerRoot = (_this$runnerRoot = this.runnerRoot) != null ? _this$runnerRoot : this.createRoot('RunnerRoot', new Vec3(0, -100, 0));
          this.cardRoot = (_this$cardRoot = this.cardRoot) != null ? _this$cardRoot : this.createRoot('CardRoot', new Vec3(0, -225, 0));
        }

        createRoot(name, pos) {
          const root = new Node(name);
          root.layer = Layers.Enum.UI_2D;
          root.setParent(this.node);
          root.setPosition(pos);
          root.addComponent(UITransform).setContentSize(1, 1);
          return root;
        }

        loadLevel(index) {
          var _this$level$fixedHand, _this$level$bulletTim, _this$level$tutorialT;

          this.levelIndex = index;
          this.level = this.levels[index];
          this.grid = (_crd && GridManager === void 0 ? (_reportPossibleCrUseOfGridManager({
            error: Error()
          }), GridManager) : GridManager).fromLevel(this.level);
          this.runner = { ...this.level.start,
            state: this.level.autoStart ? 'RUNNING' : 'IDLE'
          };
          this.cardSystem = new (_crd && CardSystem === void 0 ? (_reportPossibleCrUseOfCardSystem({
            error: Error()
          }), CardSystem) : CardSystem)(this.level.tilePool, this.level.handSize, (_this$level$fixedHand = this.level.fixedHands) != null ? _this$level$fixedHand : []);
          this.hand = this.cardSystem.drawInitial();
          this.usedMoves = 0;
          this.flowEnergy = (_this$level$bulletTim = this.level.bulletTimeEnergy) != null ? _this$level$bulletTim : 3;
          this.runnerTimer = 0;
          this.isResolving = false;
          this.clearNode(this.boardRoot);
          this.clearNode(this.previewRoot);
          this.clearNode(this.runnerRoot);
          this.clearNode(this.cardRoot);

          if (this.dragNode) {
            this.dragNode.destroy();
            this.dragNode = null;
          }

          this.tileNodes.clear();
          this.cardNodes = [];
          const maxDim = Math.max(this.grid.rows, this.grid.cols);
          let scale = 1.0;
          let offsetY = 50;

          if (maxDim <= 4) {
            scale = 1.0;
            offsetY = 50;
          } else if (maxDim <= 6) {
            scale = 0.9;
            offsetY = 45;
          } else if (maxDim <= 7) {
            scale = 0.82;
            offsetY = 45;
          } else {
            // 8x8 or 9x9 or larger grids (like Level 8 and Level 10!)
            scale = 0.72;
            offsetY = 45;
          }

          const scale3f = new Vec3(scale, scale, 1);
          const pos3f = new Vec3(0, offsetY, 0);

          if (this.boardRoot) {
            this.boardRoot.setScale(scale3f);
            this.boardRoot.setPosition(pos3f);
          }

          if (this.previewRoot) {
            this.previewRoot.setScale(scale3f);
            this.previewRoot.setPosition(pos3f);
          }

          if (this.runnerRoot) {
            this.runnerRoot.setScale(scale3f);
            this.runnerRoot.setPosition(pos3f);
          }

          this.renderBoard();
          this.renderAllTiles();
          this.renderRunner();
          this.renderCards();
          this.updateLabels();
          this.setStatus((_this$level$tutorialT = this.level.tutorialTip) != null ? _this$level$tutorialT : '拖拽水晶，接住这束光。');
        }

        renderBoard() {
          if (!this.level || !this.grid || !this.boardRoot) {
            return;
          } // 0. Floating Island Under-Glow & Shadow Aura (浮岛底座悬空极光云与深邃投影)


          const shadowNode = new Node('IslandShadow');
          shadowNode.layer = Layers.Enum.UI_2D;
          shadowNode.setParent(this.boardRoot);
          shadowNode.setPosition(new Vec3(0, -25, -5));
          const shadowG = shadowNode.addComponent(Graphics);
          const isRose = this.currentTheme === 1;
          const isGold = this.currentTheme === 2; // Aurora field under the island

          shadowG.fillColor = this.hex(isRose ? '#4C1D95' : isGold ? '#7C2D12' : '#4C1D95');
          shadowG.fillColor.a = 75;
          shadowG.ellipse(0, 0, 240, 110);
          shadowG.fill(); // Core glow

          shadowG.fillColor = this.hex(isRose ? '#831843' : isGold ? '#B45309' : '#0083B0');
          shadowG.fillColor.a = 90;
          shadowG.ellipse(0, 0, 160, 70);
          shadowG.fill();
          this.grid.forEachCell((pos, _tile, obstacle) => {
            const node = new Node(`Cell_${pos.row}_${pos.col}`);
            node.layer = Layers.Enum.UI_2D;
            node.setParent(this.boardRoot);
            node.setPosition(this.gridToLocal(pos));
            node.addComponent(UITransform).setContentSize(this.tileWidth, this.tileHeight);
            const graphics = node.addComponent(Graphics);

            if (obstacle) {
              this.drawIsometricPlatform(graphics, this.hex('#3B1428'), this.hex('#1E0A14'), this.hex('#2D0F1E'), this.hex('#FF3B30'), 2, 8);
            } else {
              const isEven = (pos.row + pos.col) % 2 === 0;
              let topCol = isEven ? this.hex('#2563EB') : this.hex('#3B82F6');
              let leftCol = isEven ? this.hex('#1E40AF') : this.hex('#1D4ED8');
              let rightCol = isEven ? this.hex('#1E3A8A') : this.hex('#1E40AF');
              let strokeCol = isEven ? this.hex('#60A5FA') : this.hex('#93C5FD');

              if (isRose) {
                topCol = isEven ? this.hex('#6D28D9') : this.hex('#7C3AED');
                leftCol = isEven ? this.hex('#4C1D95') : this.hex('#581C87');
                rightCol = isEven ? this.hex('#3B0764') : this.hex('#4C1D95');
                strokeCol = isEven ? this.hex('#A78BFA') : this.hex('#C4B5FD');
              } else if (isGold) {
                topCol = isEven ? this.hex('#B45309') : this.hex('#C2410C');
                leftCol = isEven ? this.hex('#7C2D12') : this.hex('#9A3412');
                rightCol = isEven ? this.hex('#451A03') : this.hex('#7C2D12');
                strokeCol = isEven ? this.hex('#FBBF24') : this.hex('#FCD34D');
              }

              this.drawIsometricPlatform(graphics, topCol, leftCol, rightCol, strokeCol, 2, 10);
            }
          }); // 3. Start Point Sleek Cyber Emblem (起点平铺极简金青魔法印章，告别杂乱叠块！)

          if (this.level.start) {
            const startNode = new Node('StartAura');
            startNode.layer = Layers.Enum.UI_2D;
            startNode.setParent(this.boardRoot);
            startNode.setPosition(this.gridToLocal(this.level.start).add3f(0, 10, 1));
            const sg = startNode.addComponent(Graphics); // Sleek flat floor ring

            sg.strokeColor = this.hex('#FDE047');
            sg.lineWidth = 2;
            sg.circle(0, 0, 26);
            sg.stroke();
            sg.fillColor = new Color(253, 224, 71, 35);
            sg.circle(0, 0, 26);
            sg.fill(); // Inner cyan energy ring

            sg.strokeColor = this.hex('#00F0FF');
            sg.lineWidth = 1.5;
            sg.circle(0, 0, 16);
            sg.stroke();
          }

          for (const goal of this.level.goals) {
            this.drawGoal(goal);
          }
        }

        renderAllTiles() {
          if (!this.grid) {
            return;
          }

          this.grid.forEachCell((pos, tile) => {
            if (tile) {
              this.renderTile(pos, tile);
            }
          });
        }

        renderTile(pos, tile) {
          var _this$tileNodes$get;

          if (!this.boardRoot) {
            return;
          }

          const key = this.key(pos);
          (_this$tileNodes$get = this.tileNodes.get(key)) == null || _this$tileNodes$get.destroy();
          const node = new Node(`Tile_${pos.row}_${pos.col}_${tile.type}`);
          node.layer = Layers.Enum.UI_2D;
          node.setParent(this.boardRoot);
          node.setPosition(this.gridToLocal(pos).add3f(0, 10, 1));
          node.addComponent(UITransform).setContentSize(this.tileWidth, this.tileHeight);
          const graphics = node.addComponent(Graphics);
          const topCol = this.tileColor(tile.type);
          this.drawDiamond(graphics, topCol, this.hex('#FFFFFF'), 2.2);
          this.drawTileArrow(graphics, tile, 4, 0.86);
          node.on(Node.EventType.TOUCH_END, () => this.onPlacedTileTouch(pos), this);
          this.tileNodes.set(key, node);
        }

        drawGoal(goal) {
          var _goal$color;

          if (!this.boardRoot) {
            return;
          }

          const node = new Node(`Goal_${goal.row}_${goal.col}`);
          node.layer = Layers.Enum.UI_2D;
          node.setParent(this.boardRoot);
          node.setPosition(this.gridToLocal(goal).add3f(0, 12, 2));
          node.addComponent(UITransform).setContentSize(this.tileWidth * 0.8, this.tileHeight * 0.8);
          const graphics = node.addComponent(Graphics);
          const goalCol = this.colorForRunner((_goal$color = goal.color) != null ? _goal$color : 'none'); // 1. Teleport Pad Diamond Base

          this.drawIsometricPlatform(graphics, goalCol, this.darken(goalCol, 0.5), this.darken(goalCol, 0.7), this.hex('#FFFFFF'), 2.5, 8, this.tileWidth * 0.8, this.tileHeight * 0.8); // 2. Towering 2.5D Upright Cyber Portal Door Frame (matching Concept Art Pink/Purple Portals!)

          const portalCol = goal.color === 'red' ? this.hex('#FF2E93') : goal.color === 'blue' ? this.hex('#00F0FF') : this.hex('#E066FF');
          graphics.fillColor = new Color(portalCol.r, portalCol.g, portalCol.b, 80);
          graphics.rect(-24, 0, 48, 56);
          graphics.fill();
          graphics.strokeColor = portalCol;
          graphics.lineWidth = 5;
          graphics.moveTo(-24, 0);
          graphics.lineTo(-24, 56);
          graphics.lineTo(24, 56);
          graphics.lineTo(24, 0);
          graphics.stroke();
          graphics.strokeColor = this.hex('#FFFFFF');
          graphics.lineWidth = 2;
          graphics.moveTo(-24, 0);
          graphics.lineTo(-24, 56);
          graphics.lineTo(24, 56);
          graphics.lineTo(24, 0);
          graphics.stroke(); // Center portal vortex star

          graphics.fillColor = this.hex('#FFFFFF');
          graphics.circle(0, 28, 6);
          graphics.fill();
        }

        renderRunner() {
          if (!this.runner || !this.runnerRoot) {
            return;
          }

          const node = new Node('Runner');
          node.layer = Layers.Enum.UI_2D;
          node.setParent(this.runnerRoot);
          node.setPosition(this.gridToLocal(this.runner).add3f(0, 10, 10));
          node.addComponent(UITransform).setContentSize(52, 52);
          const graphics = node.addComponent(Graphics);
          this.runnerNode = node;
          this.redrawRunnerColor();
        }

        renderCards() {
          if (!this.cardRoot) {
            return;
          }

          this.clearNode(this.cardRoot);
          this.cardNodes = [];
          const spacing = this.cardWidth + 18;
          const totalSlots = this.hand.length + 1; // Include + button slot

          const startX = -((totalSlots - 1) * spacing) / 2;
          this.hand.forEach((type, index) => {
            const card = new Node(`Card_${index}_${type}`);
            card.layer = Layers.Enum.UI_2D;
            card.setParent(this.cardRoot);
            card.setPosition(new Vec3(startX + index * spacing, 0, 0));
            card.addComponent(UITransform).setContentSize(this.cardWidth, this.cardHeight);
            const graphics = card.addComponent(Graphics);
            this.drawCard(graphics, type);
            this.drawTileArrow(graphics, {
              type,
              rotation: 0
            }, 14, 0.9);
            const labelNode = new Node('Name');
            labelNode.layer = Layers.Enum.UI_2D;
            labelNode.setParent(card);
            labelNode.setPosition(new Vec3(0, -28, 1));
            labelNode.addComponent(UITransform).setContentSize(this.cardWidth, 30);
            const label = labelNode.addComponent(Label);
            label.string = (_crd && getTileDisplayName === void 0 ? (_reportPossibleCrUseOfgetTileDisplayName({
              error: Error()
            }), getTileDisplayName) : getTileDisplayName)(type);
            label.fontSize = 17;
            label.color = this.hex('#FFFFFF');
            card.on(Node.EventType.TOUCH_START, event => this.onCardTouchStart(event, index), this);
            card.on(Node.EventType.TOUCH_MOVE, event => this.onCardTouchMove(event), this);
            card.on(Node.EventType.TOUCH_END, event => this.onCardTouchEnd(event), this);
            card.on(Node.EventType.TOUCH_CANCEL, event => this.onCardTouchCancel(event), this);
            this.cardNodes.push(card);
          }); // Plus expansion slot at far right

          const plusSlot = new Node('PlusSlot');
          plusSlot.layer = Layers.Enum.UI_2D;
          plusSlot.setParent(this.cardRoot);
          plusSlot.setPosition(new Vec3(startX + this.hand.length * spacing, 0, 0));
          plusSlot.addComponent(UITransform).setContentSize(this.cardWidth, this.cardHeight);
          const pg = plusSlot.addComponent(Graphics);
          pg.fillColor = new Color(30, 58, 138, 200);
          pg.roundRect(-this.cardWidth / 2, -this.cardHeight / 2, this.cardWidth, this.cardHeight, 18);
          pg.fill();
          pg.strokeColor = new Color(96, 165, 250, 230);
          pg.lineWidth = 2.5;
          pg.stroke();
          pg.strokeColor = this.hex('#FFFFFF');
          pg.lineWidth = 4;
          pg.moveTo(-18, 0);
          pg.lineTo(18, 0);
          pg.moveTo(0, -18);
          pg.lineTo(0, 18);
          pg.stroke();
        }

        onCardTouchStart(event, index) {
          var _this$dragNode;

          const type = this.hand[index];
          this.dragCardIndex = index;
          this.dragTile = (_crd && createTile === void 0 ? (_reportPossibleCrUseOfcreateTile({
            error: Error()
          }), createTile) : createTile)(type);
          this.hoverCell = null;
          director.getScheduler().setTimeScale(0.45);
          this.setStatus('拖到地图上，蓝线能通，红线会掉。');
          (_this$dragNode = this.dragNode) == null || _this$dragNode.destroy();
          const dragNode = new Node('DragGhost');
          dragNode.layer = Layers.Enum.UI_2D;
          dragNode.setParent(this.node);
          const pos = event.getUILocation();
          dragNode.setWorldPosition(new Vec3(pos.x, pos.y, 100));
          dragNode.setScale(new Vec3(1.15, 1.15, 1));
          dragNode.addComponent(UITransform).setContentSize(this.tileWidth, this.tileHeight);
          const graphics = dragNode.addComponent(Graphics);
          this.drawDiamond(graphics, this.tileColor(this.dragTile.type), this.hex('#FFFFFF'), 3);
          this.drawTileArrow(graphics, this.dragTile, 4, 0.86);
          this.dragNode = dragNode;

          if (this.cardNodes[index]) {
            this.cardNodes[index].setScale(new Vec3(0.9, 0.9, 1));
          }
        }

        onCardTouchMove(event) {
          if (!this.dragTile) {
            return;
          }

          const pos = event.getUILocation();

          if (this.dragNode) {
            this.dragNode.setWorldPosition(new Vec3(pos.x, pos.y, 100));
          }

          const cell = this.uiToGrid(pos.x, pos.y);
          this.hoverCell = cell;
          this.renderPreview(cell, this.dragTile);
        }

        onCardTouchEnd(event) {
          this.handleCardDrop(event);
        }

        onCardTouchCancel(event) {
          this.handleCardDrop(event);
        }

        handleCardDrop(event) {
          if (!this.dragTile || !this.grid || !this.level || !this.cardSystem) {
            this.endDrag();
            return;
          }

          const pos = event.getUILocation();
          const cell = this.uiToGrid(pos.x, pos.y);

          if (cell && this.canPlace(cell)) {
            this.grid.setTile(cell, this.dragTile);
            this.renderTile(cell, this.dragTile);
            this.usedMoves++;
            this.hand = this.cardSystem.consume(this.dragCardIndex);
            this.renderCards();
            this.setStatus('放置成功！可继续铺路，或点击底部【启动流光】按钮。');
          } else {
            this.setStatus('这里不能放置');
          }

          this.endDrag();
          this.updateLabels();
        }

        onPlacedTileTouch(pos) {
          if (!this.grid || !this.runner) {
            return;
          }

          if (pos.row === this.runner.row && pos.col === this.runner.col) {
            this.setStatus('Runner 正在这里，不能旋转这块水晶。');
            return;
          }

          const tile = this.grid.getTile(pos);

          if (!tile) {
            return;
          }

          const rotated = (_crd && rotateTile === void 0 ? (_reportPossibleCrUseOfrotateTile({
            error: Error()
          }), rotateTile) : rotateTile)(tile);

          if (rotated.rotation === tile.rotation) {
            this.setStatus(`${(_crd && getTileDisplayName === void 0 ? (_reportPossibleCrUseOfgetTileDisplayName({
              error: Error()
            }), getTileDisplayName) : getTileDisplayName)(tile.type)}不能旋转。`);
            return;
          }

          this.grid.setTile(pos, rotated);
          this.renderTile(pos, rotated);
          this.setStatus('水晶已旋转，继续观察光路。');
        }

        endDrag() {
          director.getScheduler().setTimeScale(1);
          this.dragTile = null;
          this.dragCardIndex = -1;
          this.hoverCell = null;
          this.clearNode(this.previewRoot);

          if (this.dragNode) {
            this.dragNode.destroy();
            this.dragNode = null;
          }

          this.cardNodes.forEach(card => card.setScale(new Vec3(1, 1, 1)));
        }

        renderPreview(cell, tile) {
          this.clearNode(this.previewRoot);

          if (!cell || !this.grid || !this.runner || !this.level || !this.previewRoot || !this.canPlace(cell)) {
            return;
          }

          const preview = (_crd && RouteSimulator === void 0 ? (_reportPossibleCrUseOfRouteSimulator({
            error: Error()
          }), RouteSimulator) : RouteSimulator).simulate(this.grid, this.runner, this.level.goals, { ...cell,
            tile
          });
          const node = new Node('PreviewLine');
          node.layer = Layers.Enum.UI_2D;
          node.setParent(this.previewRoot);
          const graphics = node.addComponent(Graphics);
          graphics.lineWidth = 6;
          graphics.strokeColor = preview.success ? this.hex('#00F0FF') : this.hex('#FF4B3E');
          const start = this.gridToLocal(this.runner).add3f(0, 10, 0);
          const outerCol = preview.success ? this.hex('#00F0FF') : this.hex('#FF3B30');
          outerCol.a = 140;
          graphics.strokeColor = outerCol;
          graphics.lineWidth = 12;
          graphics.moveTo(start.x, start.y);

          for (const pathNode of preview.path) {
            const point = this.gridToLocal(pathNode).add3f(0, 10, 0);
            graphics.lineTo(point.x, point.y);
          }

          graphics.stroke();
          graphics.strokeColor = preview.success ? this.hex('#E0FFFF') : this.hex('#FFD1D1');
          graphics.lineWidth = 4;
          graphics.moveTo(start.x, start.y);

          for (const pathNode of preview.path) {
            const point = this.gridToLocal(pathNode).add3f(0, 10, 0);
            graphics.lineTo(point.x, point.y);
          }

          graphics.stroke(); // Draw cell highlight and snapped tile ghost

          const cellPos = this.gridToLocal(cell).add3f(0, 10, 5);
          const topCol = this.tileColor(tile.type);
          const ghostTop = new Color(topCol.r, topCol.g, topCol.b, 160);
          this.drawIsometricPlatform(graphics, ghostTop, this.darken(ghostTop, 0.55), this.darken(ghostTop, 0.75), this.hex('#FFFFFF'), 2.5, 11, this.tileWidth * 0.82, this.tileHeight * 0.82, cellPos.y + 4, cellPos.x);
          this.drawTileArrow(graphics, tile, cellPos.y + 4, 0.86, cellPos.x);
        }

        advanceRunnerOneStep() {
          if (!this.grid || !this.runner || !this.level || !this.runnerNode) {
            return;
          }

          const next = (_crd && move === void 0 ? (_reportPossibleCrUseOfmove({
            error: Error()
          }), move) : move)(this.runner, this.runner.direction);
          const preview = (_crd && RouteSimulator === void 0 ? (_reportPossibleCrUseOfRouteSimulator({
            error: Error()
          }), RouteSimulator) : RouteSimulator).simulate(this.grid, this.runner, this.level.goals);

          if (preview.path.length > 0 && preview.path[0].result === 'goal') {
            this.moveRunnerVisual(next, () => this.handleSuccess());
            return;
          }

          if (!this.grid.isValid(next) || this.grid.isObstacle(next)) {
            this.handleDead('前方无法通行');
            return;
          }

          const tile = this.grid.getTile(next);

          if (!tile) {
            this.handleNearMissOrDead('前方没有水晶路');
            return;
          }

          const config = (_crd && resolveTileConfig === void 0 ? (_reportPossibleCrUseOfresolveTileConfig({
            error: Error()
          }), resolveTileConfig) : resolveTileConfig)(tile);

          if (config.colorFilter && config.colorFilter !== 'none' && config.colorFilter !== this.runner.color) {
            this.handleDead('颜色不匹配');
            return;
          }

          const out = config.routing[this.runner.direction];

          if (!out || out === 'dead') {
            this.handleDead('水晶方向不连通');
            return;
          }

          this.runner.row = next.row;
          this.runner.col = next.col;
          this.runner.direction = out;

          if (config.colorPaint && config.colorPaint !== 'none') {
            this.runner.color = config.colorPaint;
            this.redrawRunnerColor();
          }

          if (config.speedModifier) {
            this.runner.speed *= config.speedModifier;
          }

          if (config.oneTime) {
            var _this$tileNodes$get2;

            this.grid.setTile(next, null);
            (_this$tileNodes$get2 = this.tileNodes.get(this.key(next))) == null || _this$tileNodes$get2.destroy();
            this.tileNodes.delete(this.key(next));
          }

          this.moveRunnerVisual(this.runner, () => {
            const goal = this.findGoal(this.runner, this.level.goals);

            if (goal && (!goal.color || goal.color === 'none' || goal.color === this.runner.color)) {
              this.handleSuccess();
            }
          });
        }

        moveRunnerVisual(pos, onDone) {
          var _this$runner$color, _this$runner;

          if (!this.runnerNode || !this.runnerRoot) {
            onDone();
            return;
          }

          this.isResolving = true;
          const startPos = this.runnerNode.position.clone();
          const endPos = this.gridToLocal(pos).add3f(0, 10, 10);
          const baseCol = this.colorForRunner((_this$runner$color = (_this$runner = this.runner) == null ? void 0 : _this$runner.color) != null ? _this$runner$color : 'none'); // Spawn 3 high-speed laser afterimage / trail ghosts along the movement path

          for (let i = 1; i <= 3; i++) {
            const ghostPos = startPos.clone().lerp(endPos, i * 0.25);
            this.spawnTrailGhost(ghostPos, baseCol, 0.04 * i);
          }

          tween(this.runnerNode).to(0.14, {
            position: endPos
          }).call(() => {
            this.spawnLandingRipple(endPos, baseCol);
            this.isResolving = false;
            onDone();
          }).start();
        }

        spawnTrailGhost(pos, color, delay) {
          if (!this.runnerRoot) return;
          const ghost = new Node('TrailGhost');
          ghost.layer = Layers.Enum.UI_2D;
          ghost.setParent(this.runnerRoot);
          ghost.setPosition(pos);
          ghost.addComponent(UITransform).setContentSize(40, 40);
          const graphics = ghost.addComponent(Graphics);
          graphics.fillColor = new Color(color.r, color.g, color.b, 140);
          graphics.circle(0, 0, 16);
          graphics.fill();
          graphics.fillColor = new Color(255, 255, 255, 180);
          graphics.circle(0, 0, 8);
          graphics.fill();
          tween(ghost).delay(delay).to(0.18, {
            scale: new Vec3(0.2, 0.2, 1)
          }).call(() => ghost.destroy()).start();
        }

        spawnLandingRipple(pos, color) {
          if (!this.runnerRoot) return;
          const ripple = new Node('LandingRipple');
          ripple.layer = Layers.Enum.UI_2D;
          ripple.setParent(this.runnerRoot);
          ripple.setPosition(pos);
          ripple.addComponent(UITransform).setContentSize(60, 60);
          const graphics = ripple.addComponent(Graphics);
          graphics.strokeColor = new Color(0, 240, 255, 220);
          graphics.lineWidth = 3.5;
          graphics.circle(0, 0, 14);
          graphics.stroke();
          tween(ripple).to(0.25, {
            scale: new Vec3(2.2, 2.2, 1)
          }).call(() => ripple.destroy()).start();
        }

        handleSuccess() {
          if (!this.runner || !this.level) {
            return;
          }

          this.runner.state = 'SUCCESS';
          const stars = this.calculateStars();
          this.setStatus(`通关！${stars} 星，光能 +${stars * 20}`);
          this.updateLabels();

          if (this.onShowVictoryPosterCallback) {
            this.onShowVictoryPosterCallback(this.level.name, stars, this.usedMoves);
          }
        }

        handleNearMissOrDead(reason) {
          if (!this.level || !this.runner || !this.grid) {
            return;
          }

          const preview = (_crd && RouteSimulator === void 0 ? (_reportPossibleCrUseOfRouteSimulator({
            error: Error()
          }), RouteSimulator) : RouteSimulator).simulate(this.grid, this.runner, this.level.goals);
          const last = preview.path[preview.path.length - 1];
          const near = last ? this.distanceToNearestGoal(last, this.level.goals) <= 2 : false;

          if (near && this.flowEnergy > 0) {
            this.flowEnergy--;
            this.setStatus(`Near Miss：${reason}。已消耗 1 点救场能量，可继续补路。`);
            this.updateLabels();
            return;
          }

          this.handleDead(reason);
        }

        handleDead(reason) {
          if (!this.runner) {
            return;
          }

          this.runner.state = 'DEAD';
          this.setStatus(`失败：${reason}。呼叫时空导师救我一命！`);
          this.updateLabels();

          if (this.onShowReviveModalCallback) {
            this.onShowReviveModalCallback();
          }
        }

        calculateStars() {
          if (!this.level) {
            return 1;
          }

          let stars = 1;

          if (this.usedMoves <= this.level.recommendedMoves) {
            stars++;
          }

          if (this.usedMoves <= Math.max(1, this.level.recommendedMoves - 1)) {
            stars++;
          }

          return Math.min(3, stars);
        }

        canPlace(pos) {
          var _this$level$goals, _this$level;

          if (!this.grid || !this.runner) {
            return false;
          }

          if (!this.grid.isValid(pos) || this.grid.isObstacle(pos)) {
            return false;
          }

          if (pos.row === this.runner.row && pos.col === this.runner.col) {
            return false;
          }

          return !this.findGoal(pos, (_this$level$goals = (_this$level = this.level) == null ? void 0 : _this$level.goals) != null ? _this$level$goals : []);
        }

        uiToGrid(uiX, uiY) {
          var _this$grid;

          if (!this.boardRoot) {
            return null;
          }

          const transform = this.boardRoot.getComponent(UITransform);

          if (!transform) {
            return null;
          }

          const local = transform.convertToNodeSpaceAR(new Vec3(uiX, uiY, 0));
          const halfW = this.tileWidth / 2;
          const halfH = this.tileHeight / 2;
          let localY = local.y;

          if (this.grid) {
            const yCenter = (this.grid.cols - 1 + (this.grid.rows - 1)) * (this.tileHeight / 4);
            localY += yCenter;
          }

          const col = Math.round((local.x / halfW + localY / halfH) / 2);
          const row = Math.round((localY / halfH - local.x / halfW) / 2);
          const pos = {
            row,
            col
          };
          return (_this$grid = this.grid) != null && _this$grid.isValid(pos) ? pos : null;
        }

        gridToLocal(pos) {
          const x = (pos.col - pos.row) * (this.tileWidth / 2);
          let y = (pos.col + pos.row) * (this.tileHeight / 2);

          if (this.grid) {
            const yCenter = (this.grid.cols - 1 + (this.grid.rows - 1)) * (this.tileHeight / 4);
            y -= yCenter;
          }

          return new Vec3(x, y, 0);
        }

        key(pos) {
          return `${pos.row}:${pos.col}`;
        }

        findGoal(pos, goals) {
          var _goals$find;

          return (_goals$find = goals.find(goal => goal.row === pos.row && goal.col === pos.col)) != null ? _goals$find : null;
        }

        distanceToNearestGoal(pos, goals) {
          return Math.min(...goals.map(goal => Math.abs(goal.row - pos.row) + Math.abs(goal.col - pos.col)));
        }

        redrawRunnerColor() {
          if (!this.runnerNode || !this.runner) {
            return;
          }

          const graphics = this.runnerNode.getComponent(Graphics);

          if (!graphics) {
            return;
          }

          graphics.clear();
          const baseCol = this.colorForRunner(this.runner.color); // 1. Soft cyber halo

          graphics.fillColor = new Color(baseCol.r, baseCol.g, baseCol.b, 65);
          graphics.circle(0, 0, 24);
          graphics.fill(); // 2. Vibrant crystalline sphere body

          graphics.fillColor = new Color(baseCol.r, baseCol.g, baseCol.b, 210);
          graphics.circle(0, 0, 16);
          graphics.fill();
          graphics.strokeColor = this.hex('#FFFFFF');
          graphics.lineWidth = 1.8;
          graphics.stroke(); // 3. Bright white photon core

          graphics.fillColor = this.hex('#FFFFFF');
          graphics.circle(0, 0, 8);
          graphics.fill(); // 4. Crystalline specular reflection highlight

          graphics.fillColor = new Color(255, 255, 255, 220);
          graphics.circle(-4, 4, 3);
          graphics.fill();
        }

        drawDiamond(graphics, fill, stroke, lineWidth) {
          // 1. Dark cyber socket base plate (offsetY = -4, size = 90% of cell)
          const socketCol = new Color(16, 26, 52, 255);
          this.drawIsometricPlatform(graphics, socketCol, this.darken(socketCol, 0.6), this.darken(socketCol, 0.8), new Color(50, 90, 160, 200), 1.5, 4, this.tileWidth * 0.9, this.tileHeight * 0.9, -4); // 2. Elevated floating crystal module with breathing room (offsetY = +4, size = 82% of cell, depth = 11)

          this.drawIsometricPlatform(graphics, fill, this.darken(fill, 0.55), this.darken(fill, 0.75), stroke, lineWidth, 11, this.tileWidth * 0.82, this.tileHeight * 0.82, 4);
        }

        drawIsometricPlatform(graphics, topFill, sideDark, sideLight, stroke, lineWidth, depth = 16, customW = this.tileWidth, customH = this.tileHeight, offsetY = 0, offsetX = 0) {
          const halfW = customW / 2;
          const halfH = customH / 2; // Left side vertical wall

          graphics.fillColor = sideDark;
          graphics.moveTo(offsetX - halfW, offsetY);
          graphics.lineTo(offsetX - halfW, offsetY - depth);
          graphics.lineTo(offsetX, offsetY - halfH - depth);
          graphics.lineTo(offsetX, offsetY - halfH);
          graphics.close();
          graphics.fill(); // Right side vertical wall

          graphics.fillColor = sideLight;
          graphics.moveTo(offsetX, offsetY - halfH);
          graphics.lineTo(offsetX, offsetY - halfH - depth);
          graphics.lineTo(offsetX + halfW, offsetY - depth);
          graphics.lineTo(offsetX + halfW, offsetY);
          graphics.close();
          graphics.fill(); // Bottom edge highlight / structure line

          graphics.strokeColor = stroke;
          graphics.lineWidth = 1.5;
          graphics.moveTo(offsetX - halfW, offsetY - depth);
          graphics.lineTo(offsetX, offsetY - halfH - depth);
          graphics.lineTo(offsetX + halfW, offsetY - depth);
          graphics.stroke();
          graphics.moveTo(offsetX, offsetY - halfH);
          graphics.lineTo(offsetX, offsetY - halfH - depth);
          graphics.stroke(); // Top diamond surface

          graphics.fillColor = topFill;
          graphics.strokeColor = stroke;
          graphics.lineWidth = lineWidth;
          graphics.moveTo(offsetX, offsetY + halfH);
          graphics.lineTo(offsetX + halfW, offsetY);
          graphics.lineTo(offsetX, offsetY - halfH);
          graphics.lineTo(offsetX - halfW, offsetY);
          graphics.close();
          graphics.fill();
          graphics.stroke();
        }

        drawTileArrow(graphics, tile, offsetY = 0, scale = 1, offsetX = 0) {
          const config = (_crd && resolveTileConfig === void 0 ? (_reportPossibleCrUseOfresolveTileConfig({
            error: Error()
          }), resolveTileConfig) : resolveTileConfig)(tile);

          for (const [input, output] of Object.entries(config.routing)) {
            if (!output || output === 'dead') {
              continue;
            }

            const start = this.directionPoint(input, -26 * scale).add3f(offsetX, offsetY, 0);
            const end = this.directionPoint(output, 26 * scale).add3f(offsetX, offsetY, 0); // Outer cyan neon glow (route through center point!)

            graphics.strokeColor = this.hex('#00F0FF');
            graphics.lineWidth = 7 * scale;
            graphics.moveTo(start.x, start.y);
            graphics.lineTo(offsetX, offsetY);
            graphics.lineTo(end.x, end.y);
            graphics.stroke(); // Inner white core (route through center point!)

            graphics.strokeColor = this.hex('#FFFFFF');
            graphics.lineWidth = 3 * scale;
            graphics.moveTo(start.x, start.y);
            graphics.lineTo(offsetX, offsetY);
            graphics.lineTo(end.x, end.y);
            graphics.stroke();
          } // Center glowing crystal gem


          graphics.fillColor = this.hex('#FFFFFF');
          graphics.circle(offsetX, offsetY, 5 * scale);
          graphics.fill();
        }

        directionPoint(direction, length) {
          // Convert logical grid directions into 2.5D Isometric screen vectors
          // Grid right (col+1) is diagonally Up-Right, left is Down-Left, up (row+1) is Up-Left, down is Down-Right
          const dx = length * 0.89;
          const dy = length * 0.46;

          switch (direction) {
            case 'up':
              return new Vec3(-dx, dy, 0);

            case 'right':
              return new Vec3(dx, dy, 0);

            case 'down':
              return new Vec3(dx, -dy, 0);

            case 'left':
              return new Vec3(-dx, -dy, 0);

            default:
              return new Vec3(0, 0, 0);
          }
        }

        drawCard(graphics, type) {
          graphics.clear(); // Glassmorphic card base plate (vibrant royal blue / sapphire plate, NO GREY!)

          graphics.fillColor = new Color(37, 99, 235, 235);
          graphics.roundRect(-this.cardWidth / 2, -this.cardHeight / 2, this.cardWidth, this.cardHeight, 18);
          graphics.fill();
          graphics.strokeColor = this.hex('#00F0FF');
          graphics.lineWidth = 2.5;
          graphics.stroke(); // Royal indigo label pill strip at bottom (NO GREY!)

          graphics.fillColor = this.hex('#1E3A8A');
          graphics.roundRect(-this.cardWidth / 2 + 6, -this.cardHeight / 2 + 6, this.cardWidth - 12, 26, 8);
          graphics.fill(); // Bottom right count badge pill (vibrant violet)

          graphics.fillColor = this.hex('#4C1D95');
          graphics.roundRect(this.cardWidth / 2 - 36, -this.cardHeight / 2 + 36, 30, 20, 10);
          graphics.fill();
          graphics.strokeColor = this.hex('#A78BFA');
          graphics.lineWidth = 1.5;
          graphics.stroke(); // Top cyber accent line

          graphics.strokeColor = this.hex('#00E5FF');
          graphics.lineWidth = 3;
          graphics.moveTo(-this.cardWidth / 2 + 15, this.cardHeight / 2 - 2);
          graphics.lineTo(this.cardWidth / 2 - 15, this.cardHeight / 2 - 2);
          graphics.stroke(); // Glowing backdrop aura behind the crystal inside the card

          const topCol = this.tileColor(type);
          graphics.fillColor = new Color(topCol.r, topCol.g, topCol.b, 110);
          graphics.circle(0, 14, 34);
          graphics.fill();
          graphics.fillColor = new Color(255, 255, 255, 75);
          graphics.circle(0, 14, 20);
          graphics.fill(); // Big bright 3D isometric crystal in upper area (offsetY = 14, brighter side walls)

          this.drawIsometricPlatform(graphics, topCol, this.darken(topCol, 0.75), this.darken(topCol, 0.9), this.hex('#FFFFFF'), 3, 14, 76, 44, 14);
        }

        darken(color, factor) {
          return new Color(Math.round(color.r * factor), Math.round(color.g * factor), Math.round(color.b * factor), color.a);
        }

        tileColor(type) {
          switch (type) {
            case 'curve':
              return this.hex('#10B981');

            case 'cross':
              return this.hex('#60A5FA');

            case 'collapse':
              return this.hex('#F59E0B');

            case 'boost':
              return this.hex('#F472B6');

            case 'paint_red':
            case 'gate_red':
              return this.hex('#EF4444');

            case 'paint_blue':
            case 'gate_blue':
              return this.hex('#3B82F6');

            case 'universal':
              return this.hex('#FDE68A');

            case 'straight':
            default:
              return this.hex('#06B6D4');
          }
        }

        colorForRunner(color) {
          switch (color) {
            case 'red':
              return this.hex('#FF5A6A');

            case 'blue':
              return this.hex('#4AA3FF');

            case 'yellow':
              return this.hex('#FDE047');

            case 'none':
            default:
              return this.hex('#F8FEFF');
          }
        }

        hex(value) {
          const color = new Color();
          Color.fromHEX(color, value);
          return color;
        }

        updateLabels() {
          if (this.levelLabel && this.level) {
            this.levelLabel.string = `第 ${this.level.id} 关  ${this.level.name}`;
          }

          if (this.tipLabel && this.level) {
            this.tipLabel.string = `手数 ${this.usedMoves}/${this.level.recommendedMoves}   救场能量 ${this.flowEnergy}`;
          }
        }

        setStatus(text) {
          if (this.statusLabel) {
            this.statusLabel.string = text;
          }
        }

        clearNode(node) {
          if (!node) {
            return;
          }

          node.destroyAllChildren();
        }

      }, (_descriptor = _applyDecoratedDescriptor(_class2.prototype, "boardRoot", [_dec2], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return null;
        }
      }), _descriptor2 = _applyDecoratedDescriptor(_class2.prototype, "previewRoot", [_dec3], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return null;
        }
      }), _descriptor3 = _applyDecoratedDescriptor(_class2.prototype, "runnerRoot", [_dec4], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return null;
        }
      }), _descriptor4 = _applyDecoratedDescriptor(_class2.prototype, "cardRoot", [_dec5], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return null;
        }
      }), _descriptor5 = _applyDecoratedDescriptor(_class2.prototype, "levelLabel", [_dec6], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return null;
        }
      }), _descriptor6 = _applyDecoratedDescriptor(_class2.prototype, "tipLabel", [_dec7], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return null;
        }
      }), _descriptor7 = _applyDecoratedDescriptor(_class2.prototype, "statusLabel", [_dec8], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return null;
        }
      }), _descriptor8 = _applyDecoratedDescriptor(_class2.prototype, "tileWidth", [property], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return 96;
        }
      }), _descriptor9 = _applyDecoratedDescriptor(_class2.prototype, "tileHeight", [property], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return 56;
        }
      }), _descriptor10 = _applyDecoratedDescriptor(_class2.prototype, "cardWidth", [property], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return 120;
        }
      }), _descriptor11 = _applyDecoratedDescriptor(_class2.prototype, "cardHeight", [property], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return 96;
        }
      })), _class2)) || _class));

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=a1a6e6bf47ea07c249d97b76577260e5b1e78c4f.js.map