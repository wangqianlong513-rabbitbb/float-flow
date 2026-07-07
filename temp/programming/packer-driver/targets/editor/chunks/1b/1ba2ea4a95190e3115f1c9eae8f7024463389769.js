System.register(["cc"], function (_export, _context) {
  "use strict";

  var _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, _decorator, Button, Color, Component, Graphics, Label, Layers, Node, UITransform, Vec3, _dec, _class, _crd, ccclass, LevelSelect;

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
      UITransform = _cc.UITransform;
      Vec3 = _cc.Vec3;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "c2281ugXrdMIrgN0UL/HmnU", "LevelSelect", undefined);

      __checkObsolete__(['_decorator', 'Button', 'Color', 'Component', 'EventTouch', 'Graphics', 'Label', 'Layers', 'Node', 'UITransform', 'Vec3']);

      ({
        ccclass
      } = _decorator);

      _export("LevelSelect", LevelSelect = (_dec = ccclass('LevelSelect'), _dec(_class = class LevelSelect extends Component {
        constructor(...args) {
          super(...args);
          this.onSelectLevelCallback = void 0;
          this.onReturnHomeCallback = void 0;
          this.onStartEndlessCallback = void 0;
          this.currentChapter = 0;
          // 0 = Chapter 1 (1-10), 1 = Chapter 2 (11-20)
          this.gridRoot = null;
          this.tabsRoot = null;
          this.currentTheme = 0;
        }

        // 0: Icefield, 1: Violet Dusk, 2: Sunset Glow
        onLoad() {
          console.log('[FloatFlow] LevelSelect onLoad');
          this.node.layer = Layers.Enum.UI_2D;
          this.ensureTransform(this.node, 1280, 720);
          this.rebuildUI();
        }

        applyTheme(themeIdx) {
          console.log(`[LevelSelect] Apply Theme Index ${themeIdx}`);
          this.currentTheme = themeIdx;
          this.rebuildUI();
        }

        rebuildUI() {
          this.node.destroyAllChildren(); // 1. Top Navigation Bar (Y = 310)

          this.createTopNav(); // 2. Chapter & Mode Tabs (Y = 220)

          this.tabsRoot = this.createNode('TabsRoot', new Vec3(0, 220, 0), this.node);
          this.ensureTransform(this.tabsRoot, 1000, 60);
          this.renderTabs(); // 3. 20-Level Isometric Grid Container (Y = -30)

          this.gridRoot = this.createNode('GridRoot', new Vec3(0, -30, 0), this.node);
          this.ensureTransform(this.gridRoot, 1100, 380);
          this.renderGrid(this.currentChapter); // 4. Bottom Progress Banner & Quick Launch Footer (Y = -275)

          this.createFooter();
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

        renderTabs() {
          if (!this.tabsRoot) return;
          this.tabsRoot.destroyAllChildren();
          const tabs = [{
            name: '❄️ 极光冰原 (1-10)',
            idx: 0,
            isEndless: false
          }, {
            name: '🌌 暮色时空 (11-20)',
            idx: 1,
            isEndless: false
          }, {
            name: '👑 流光无尽模式',
            idx: 2,
            isEndless: true
          }];
          const isRose = this.currentTheme === 1;
          const isGold = this.currentTheme === 2;
          const activeBg = isRose ? '#581C87' : isGold ? '#7C2D12' : '#2563EB';
          const activeBorder = isRose ? '#C4B5FD' : isGold ? '#FBBF24' : '#00F0FF';
          const tabXs = [-320, 0, 320];
          tabs.forEach((tab, i) => {
            const isSelected = !tab.isEndless && this.currentChapter === tab.idx;
            const tabNode = this.createNode(`Tab_${i}`, new Vec3(tabXs[i], 0, 0), this.tabsRoot);
            this.ensureTransform(tabNode, 280, 50);
            const g = tabNode.addComponent(Graphics);

            if (isSelected) {
              g.fillColor = this.hex(activeBg);
              g.fillColor.a = 240;
              g.roundRect(-140, -25, 280, 50, 16);
              g.fill();
              g.strokeColor = this.hex(activeBorder);
              g.lineWidth = 2.5;
              g.stroke();
            } else if (tab.isEndless) {
              g.fillColor = this.hex(isRose ? '#3B0764' : isGold ? '#451A03' : '#4C1D95');
              g.fillColor.a = 200;
              g.roundRect(-140, -25, 280, 50, 16);
              g.fill();
              g.strokeColor = this.hex(isRose ? '#A78BFA' : isGold ? '#FCD34D' : '#A78BFA');
              g.lineWidth = 2;
              g.stroke();
            } else {
              g.fillColor = this.hex('#0F172A');
              g.fillColor.a = 200;
              g.roundRect(-140, -25, 280, 50, 16);
              g.fill();
              g.strokeColor = this.hex('#334155');
              g.lineWidth = 1.5;
              g.stroke();
            }

            const textColor = isSelected ? '#FFFFFF' : tab.isEndless ? isGold ? '#FDE047' : '#F472B6' : '#94A3B8';
            this.createLabel(tabNode, 'Text', new Vec3(0, 1, 0), tab.name, 18, textColor, 260, 30);
            this.addClick(tabNode, () => {
              if (tab.isEndless) {
                console.log('[LevelSelect] Start Endless Mode');
                if (this.onStartEndlessCallback) this.onStartEndlessCallback();
              } else {
                console.log(`[LevelSelect] Switch Chapter to ${tab.idx}`);
                this.currentChapter = tab.idx;
                this.renderTabs();
                this.renderGrid(this.currentChapter);
              }
            });
          });
        }

        renderGrid(chapter) {
          if (!this.gridRoot) return;
          this.gridRoot.destroyAllChildren();
          const isRose = this.currentTheme === 1;
          const isGold = this.currentTheme === 2;
          const activeBorder = isRose ? '#A78BFA' : isGold ? '#FCD34D' : '#FDE047';
          const compBorder = isRose ? '#C4B5FD' : isGold ? '#FBBF24' : '#00F0FF'; // 2 rows x 5 columns = 10 cards per chapter

          const colXs = [-400, -200, 0, 200, 400];
          const rowYs = [80, -100];
          const startIdx = chapter * 10; // 0 or 10

          for (let r = 0; r < 2; r++) {
            for (let c = 0; c < 5; c++) {
              const localIdx = r * 5 + c; // 0 to 9

              const globalIdx = startIdx + localIdx; // 0 to 19 (Level 1 to 20)

              const levelNum = globalIdx + 1;
              let status = 'LOCKED';
              let stars = 0;

              if (chapter === 0) {
                if (levelNum <= 8) {
                  status = 'COMPLETED';
                  stars = levelNum % 3 === 0 ? 3 : levelNum % 2 === 0 ? 2 : 3;
                } else if (levelNum === 9) {
                  status = 'ACTIVE';
                } else {
                  status = 'LOCKED';
                }
              }

              const card = this.createNode(`LevelCard_${levelNum}`, new Vec3(colXs[c], rowYs[r], 0), this.gridRoot);
              this.ensureTransform(card, 160, 150);
              const g = card.addComponent(Graphics);
              g.fillColor = status === 'LOCKED' ? this.hex('#0B0F19') : this.hex('#0D162C');
              g.fillColor.a = status === 'LOCKED' ? 180 : 235;
              g.roundRect(-80, -75, 160, 150, 18);
              g.fill();

              if (status === 'COMPLETED') {
                g.strokeColor = this.hex(compBorder);
                g.lineWidth = 2;
                g.stroke();
              } else if (status === 'ACTIVE') {
                g.strokeColor = this.hex(activeBorder);
                g.lineWidth = 3;
                g.stroke();
              } else {
                g.strokeColor = this.hex('#334155');
                g.lineWidth = 1.5;
                g.stroke();
              }

              const numStr = levelNum < 10 ? `0${levelNum}` : `${levelNum}`;
              const numColor = status === 'LOCKED' ? '#475569' : status === 'ACTIVE' ? activeBorder : '#FFFFFF';
              this.createLabel(card, 'Num', new Vec3(-48, 50, 0), numStr, 22, numColor, 50, 30);

              if (status === 'LOCKED') {
                this.createLabel(card, 'LockIcon', new Vec3(0, 5, 0), '🔒', 32, '#64748B', 50, 50);
                this.createLabel(card, 'StatusText', new Vec3(0, -50, 0), '未解锁', 14, '#475569', 120, 24);
              } else {
                let topCol = status === 'ACTIVE' ? this.hex('#D97706') : levelNum % 2 === 0 ? this.hex('#1E3A8A') : this.hex('#2563EB');
                let leftCol = status === 'ACTIVE' ? this.hex('#92400E') : this.hex('#1E293B');
                let rightCol = status === 'ACTIVE' ? this.hex('#B45309') : this.hex('#0F172A');

                if (isRose) {
                  topCol = status === 'ACTIVE' ? this.hex('#6D28D9') : levelNum % 2 === 0 ? this.hex('#4C1D95') : this.hex('#581C87');
                  leftCol = status === 'ACTIVE' ? this.hex('#4C1D95') : this.hex('#312E81');
                  rightCol = status === 'ACTIVE' ? this.hex('#3B0764') : this.hex('#1E1B4B');
                } else if (isGold) {
                  topCol = status === 'ACTIVE' ? this.hex('#B45309') : levelNum % 2 === 0 ? this.hex('#7C2D12') : this.hex('#9A3412');
                  leftCol = status === 'ACTIVE' ? this.hex('#7C2D12') : this.hex('#451A03');
                  rightCol = status === 'ACTIVE' ? this.hex('#451A03') : this.hex('#260C08');
                }

                this.drawIsometricBlock(g, topCol, leftCol, rightCol, this.hex(compBorder), 1.5, 10, 56, 30, 5, 0);
                const crystalIcon = status === 'ACTIVE' ? '⚡' : '🔷';
                this.createLabel(card, 'Crystal', new Vec3(0, 18, 0), crystalIcon, 20, compBorder, 40, 40);

                if (status === 'COMPLETED') {
                  const starStr = stars === 3 ? '⭐️⭐️⭐️' : stars === 2 ? '⭐️⭐️☆' : '⭐️☆☆';
                  this.createLabel(card, 'Stars', new Vec3(0, -50, 0), starStr, 14, '#FDE047', 120, 24);
                } else {
                  this.createLabel(card, 'ActiveText', new Vec3(0, -50, 0), '⚡ 进行中...', 14, activeBorder, 120, 24);
                }
              }

              this.addClick(card, () => {
                if (status === 'LOCKED') {
                  console.log(`[LevelSelect] Level ${levelNum} is locked.`);
                  return;
                }

                console.log(`[LevelSelect] Selected Level ${levelNum} (Index: ${globalIdx})`);

                if (this.onSelectLevelCallback) {
                  const targetIdx = globalIdx % 10;
                  this.onSelectLevelCallback(targetIdx);
                }
              });
            }
          }
        }

        createTopNav() {
          const navRoot = this.createNode('TopNav', new Vec3(0, 310, 0), this.node);
          this.ensureTransform(navRoot, 1160, 70);
          const g = navRoot.addComponent(Graphics);
          const isRose = this.currentTheme === 1;
          const isGold = this.currentTheme === 2;
          const borderCol = isRose ? '#A78BFA' : isGold ? '#FCD34D' : '#3B82F6';
          g.fillColor = this.hex('#0D162C');
          g.fillColor.a = 220;
          g.roundRect(-580, -35, 1160, 70, 20);
          g.fill();
          g.strokeColor = this.hex(borderCol);
          g.lineWidth = 1.8;
          g.stroke();
          const backBtn = this.createNode('BackBtn', new Vec3(-480, 0, 0), navRoot);
          this.ensureTransform(backBtn, 150, 44);
          const bg = backBtn.addComponent(Graphics);
          bg.fillColor = this.hex('#1E293B');
          bg.roundRect(-75, -22, 150, 44, 12);
          bg.fill();
          bg.strokeColor = this.hex(borderCol);
          bg.lineWidth = 1.5;
          bg.stroke();
          this.createLabel(backBtn, 'Text', new Vec3(0, 1, 0), '⬅️ 返回主页', 16, '#FFFFFF', 140, 30);
          this.addClick(backBtn, () => {
            console.log('[LevelSelect] Clicked Return Home');
            if (this.onReturnHomeCallback) this.onReturnHomeCallback();
          });
          this.createLabel(navRoot, 'Title', new Vec3(0, 1, 0), '模式与关卡选择 · 冰原章节', 24, '#FFFFFF', 400, 40);
          const starPill = this.createNode('StarPill', new Vec3(470, 0, 0), navRoot);
          this.ensureTransform(starPill, 160, 44);
          const sg = starPill.addComponent(Graphics);
          sg.fillColor = this.hex('#1E1B4B');
          sg.roundRect(-80, -22, 160, 44, 22);
          sg.fill();
          sg.strokeColor = this.hex('#FDE047');
          sg.lineWidth = 1.8;
          sg.stroke();
          this.createLabel(starPill, 'Text', new Vec3(0, 1, 0), '⭐️  22 / 30', 17, '#FDE047', 140, 30);
        }

        createFooter() {
          const footerRoot = this.createNode('Footer', new Vec3(0, -275, 0), this.node);
          this.ensureTransform(footerRoot, 1140, 64);
          const g = footerRoot.addComponent(Graphics);
          const isRose = this.currentTheme === 1;
          const isGold = this.currentTheme === 2;
          const borderCol = isRose ? '#A78BFA' : isGold ? '#FCD34D' : '#3B82F6';
          const launchBg = isRose ? '#581C87' : isGold ? '#7C2D12' : '#2563EB';
          const launchBorder = isRose ? '#C4B5FD' : isGold ? '#FBBF24' : '#00F0FF';
          g.fillColor = this.hex('#0D162C');
          g.fillColor.a = 230;
          g.roundRect(-570, -32, 1140, 64, 20);
          g.fill();
          g.strokeColor = this.hex(borderCol);
          g.lineWidth = 2;
          g.stroke();
          this.createLabel(footerRoot, 'ProgText', new Vec3(-220, 1, 0), '当前章节进度: 8 / 10 关卡   |   累积获得星数: 22 / 30 ⭐️', 16, borderCol, 600, 30);
          const launchBtn = this.createNode('QuickLaunchBtn', new Vec3(380, 0, 0), footerRoot);
          this.ensureTransform(launchBtn, 260, 48);
          const lg = launchBtn.addComponent(Graphics);
          lg.fillColor = this.hex(launchBg);
          lg.roundRect(-130, -24, 260, 48, 16);
          lg.fill();
          lg.strokeColor = this.hex(launchBorder);
          lg.lineWidth = 2.5;
          lg.stroke();
          this.createLabel(launchBtn, 'Text', new Vec3(0, 1, 0), '🚀 继续旅途 (第9关)', 18, '#FFFFFF', 240, 32);
          this.addClick(launchBtn, () => {
            console.log('[LevelSelect] Clicked Quick Launch -> Start Level 9 (index 8)');
            if (this.onSelectLevelCallback) this.onSelectLevelCallback(8);
          });
        }

        drawIsometricBlock(g, topFill, sideDark, sideLight, stroke, lineWidth, depth, customW, customH, offsetY, offsetX) {
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

        createNode(name, pos, parent) {
          const node = new Node(name);
          node.layer = Layers.Enum.UI_2D;
          if (parent) node.setParent(parent);
          node.setPosition(pos);
          return node;
        }

        ensureTransform(node, w, h) {
          let t = node.getComponent(UITransform);
          if (!t) t = node.addComponent(UITransform);
          t.setContentSize(w, h);
          return t;
        }

        createLabel(parent, name, pos, text, fontSize, hexColor, w, h) {
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

        hex(hexStr) {
          const clean = hexStr.replace('#', '');
          const r = parseInt(clean.substring(0, 2), 16) || 0;
          const g = parseInt(clean.substring(2, 4), 16) || 0;
          const b = parseInt(clean.substring(4, 6), 16) || 0;
          return new Color(r, g, b, 255);
        }

      }) || _class));

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=1ba2ea4a95190e3115f1c9eae8f7024463389769.js.map