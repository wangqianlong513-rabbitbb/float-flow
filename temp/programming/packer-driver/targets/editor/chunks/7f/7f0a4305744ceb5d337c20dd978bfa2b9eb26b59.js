System.register(["cc"], function (_export, _context) {
  "use strict";

  var _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, _decorator, Button, Color, Component, Graphics, Label, Layers, Node, UITransform, Vec3, _dec, _class, _crd, ccclass, SettingsModal;

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

      _cclegacy._RF.push({}, "e024faF5XtGb7E5VzkqczWS", "SettingsModal", undefined);

      __checkObsolete__(['_decorator', 'Button', 'Color', 'Component', 'EventTouch', 'Graphics', 'Label', 'Layers', 'Node', 'UITransform', 'Vec3']);

      ({
        ccclass
      } = _decorator);

      _export("SettingsModal", SettingsModal = (_dec = ccclass('SettingsModal'), _dec(_class = class SettingsModal extends Component {
        constructor(...args) {
          super(...args);
          this.onCloseCallback = void 0;
          this.onThemeChangedCallback = void 0;
          this.activeTab = 0;
          // 0: Theme, 1: Gameplay Rules, 2: About
          this.selectedTheme = 0;
          // 0: Icefield, 1: Violet Dusk, 2: Sunset Glow
          this.bulletTimeSpeed = 1;
          // 0: Slow (25%), 1: Normal (50%), 2: Fast (100%)
          this.selectedQuality = 2;
          // 0: Smooth, 1: Balanced, 2: HD
          this.dialogNode = null;
          this.tabsRoot = null;
          this.contentRoot = null;
        }

        onLoad() {
          console.log('[FloatFlow] SettingsModal onLoad');
          this.node.layer = Layers.Enum.UI_2D;
          this.ensureTransform(this.node, 1280, 720);
          this.node.destroyAllChildren(); // 1. Semi-transparent Backdrop Overlay

          const overlay = this.createNode('Overlay', new Vec3(0, 0, 0), this.node);
          this.ensureTransform(overlay, 1280, 720);
          const og = overlay.addComponent(Graphics);
          og.fillColor = new Color(5, 10, 25, 180);
          og.rect(-640, -360, 1280, 720);
          og.fill();
          this.addClick(overlay, () => {
            this.closeModal();
          }); // 2. Main Glassmorphic Dialog Box (Size: 680 x 540)

          const dialog = this.createNode('DialogBox', new Vec3(0, 0, 0), this.node);
          this.ensureTransform(dialog, 680, 540);
          this.dialogNode = dialog;
          dialog.on(Node.EventType.TOUCH_END, e => {
            e.propagationStopped = true;
          });
          this.updateDialogStyle(); // 3. Header & Close Button

          this.createHeader(dialog); // 4. Category Tabs (Y = 175)

          this.tabsRoot = this.createNode('TabsRoot', new Vec3(0, 175, 0), dialog);
          this.ensureTransform(this.tabsRoot, 600, 50);
          this.renderTabs(); // 5. Dynamic Content Area (Y = -30)

          this.contentRoot = this.createNode('ContentRoot', new Vec3(0, -30, 0), dialog);
          this.ensureTransform(this.contentRoot, 620, 360);
          this.renderContent();
        }

        applyTheme(themeIdx) {
          console.log(`[SettingsModal] Apply Theme Index ${themeIdx}`);
          this.selectedTheme = themeIdx;
          this.updateDialogStyle();
          if (this.tabsRoot) this.renderTabs();
          if (this.contentRoot) this.renderContent();
        }

        updateDialogStyle() {
          if (!this.dialogNode) return;
          let dg = this.dialogNode.getComponent(Graphics);
          if (!dg) dg = this.dialogNode.addComponent(Graphics);
          dg.clear();
          const isRose = this.selectedTheme === 1;
          const isGold = this.selectedTheme === 2;
          const borderCol = isRose ? '#A78BFA' : isGold ? '#FCD34D' : '#3B82F6';
          dg.fillColor = this.hex('#0B132B');
          dg.fillColor.a = 245;
          dg.roundRect(-340, -270, 680, 540, 24);
          dg.fill();
          dg.strokeColor = this.hex(borderCol);
          dg.lineWidth = 2.5;
          dg.stroke();
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

        closeModal() {
          console.log('[SettingsModal] Close');
          this.node.active = false;
          if (this.onCloseCallback) this.onCloseCallback();
        }

        createHeader(parent) {
          this.createLabel(parent, 'Title', new Vec3(0, 225, 0), '⚙️   设 置 与 帮 助', 26, '#FFFFFF', 400, 40);
          const closeBtn = this.createNode('CloseBtn', new Vec3(300, 225, 0), parent);
          this.ensureTransform(closeBtn, 44, 44);
          const cg = closeBtn.addComponent(Graphics);
          cg.fillColor = this.hex('#1E293B');
          cg.circle(0, 0, 18);
          cg.fill();
          const isRose = this.selectedTheme === 1;
          const isGold = this.selectedTheme === 2;
          cg.strokeColor = this.hex(isRose ? '#A78BFA' : isGold ? '#FCD34D' : '#60A5FA');
          cg.lineWidth = 1.8;
          cg.stroke();
          this.createLabel(closeBtn, 'Icon', new Vec3(0, 1, 0), '✖', 18, '#FFFFFF', 36, 36);
          this.addClick(closeBtn, () => {
            this.closeModal();
          });
        }

        renderTabs() {
          if (!this.tabsRoot) return;
          this.tabsRoot.destroyAllChildren();
          const tabs = ['🎨 主 题', '🎮 玩 法', 'ℹ️ 关 于'];
          const tabXs = [-200, 0, 200];
          const isRose = this.selectedTheme === 1;
          const isGold = this.selectedTheme === 2;
          const activeBg = isRose ? '#581C87' : isGold ? '#7C2D12' : '#2563EB';
          const activeBorder = isRose ? '#C4B5FD' : isGold ? '#FBBF24' : '#00F0FF';
          tabs.forEach((name, idx) => {
            const isSelected = this.activeTab === idx;
            const tabNode = this.createNode(`Tab_${idx}`, new Vec3(tabXs[idx], 0, 0), this.tabsRoot);
            this.ensureTransform(tabNode, 170, 44);
            const g = tabNode.addComponent(Graphics);

            if (isSelected) {
              g.fillColor = this.hex(activeBg);
              g.roundRect(-85, -22, 170, 44, 14);
              g.fill();
              g.strokeColor = this.hex(activeBorder);
              g.lineWidth = 2;
              g.stroke();
            } else {
              g.fillColor = this.hex('#1E293B');
              g.fillColor.a = 180;
              g.roundRect(-85, -22, 170, 44, 14);
              g.fill();
              g.strokeColor = this.hex('#334155');
              g.lineWidth = 1.5;
              g.stroke();
            }

            this.createLabel(tabNode, 'Text', new Vec3(0, 1, 0), name, 17, isSelected ? '#FFFFFF' : '#94A3B8', 160, 30);
            this.addClick(tabNode, () => {
              if (this.activeTab !== idx) {
                console.log(`[SettingsModal] Switch tab to ${name}`);
                this.activeTab = idx;
                this.renderTabs();
                this.renderContent();
              }
            });
          });
        }

        renderContent() {
          if (!this.contentRoot) return;
          this.contentRoot.destroyAllChildren();

          if (this.activeTab === 0) {
            this.renderThemeTab(this.contentRoot);
          } else if (this.activeTab === 1) {
            this.renderGameplayRulesTab(this.contentRoot);
          } else if (this.activeTab === 2) {
            this.renderAboutTab(this.contentRoot);
          }
        }

        renderThemeTab(parent) {
          this.createLabel(parent, 'SubTitle', new Vec3(-210, 140, 0), '✨ 选择宇宙背景主题与配色：', 16, '#93C5FD', 260, 28);
          const themes = [{
            name: '极光冰原',
            desc: '经典深蓝紫流光',
            top: '#2563EB',
            side: '#1E3A8A',
            border: '#00F0FF'
          }, {
            name: '暮色罗兰',
            desc: '高雅紫魅玫瑰光',
            top: '#7C3AED',
            side: '#581C87',
            border: '#C4B5FD'
          }, {
            name: '落日余晖',
            desc: '暗红日落金橙光',
            top: '#C2410C',
            side: '#7C2D12',
            border: '#FBBF24'
          }];
          const cardXs = [-200, 0, 200];
          themes.forEach((th, idx) => {
            const isSelected = this.selectedTheme === idx;
            const card = this.createNode(`Theme_${idx}`, new Vec3(cardXs[idx], 40, 0), parent);
            this.ensureTransform(card, 170, 140);
            const g = card.addComponent(Graphics);
            g.fillColor = this.hex('#1E293B');
            g.fillColor.a = 230;
            g.roundRect(-85, -70, 170, 140, 16);
            g.fill();
            g.strokeColor = isSelected ? this.hex(th.border) : this.hex('#334155');
            g.lineWidth = isSelected ? 3 : 1.5;
            g.stroke(); // Draw 3D isometric mini cube

            this.drawIsometricBlock(g, this.hex(th.top), this.hex(th.side), this.hex('#0F172A'), this.hex(th.border), 1.5, 12, 48, 28, 15, 0);
            this.createLabel(card, 'Name', new Vec3(0, -25, 0), th.name, 17, isSelected ? '#FFFFFF' : '#CBD5E1', 150, 26);
            this.createLabel(card, 'Desc', new Vec3(0, -48, 0), th.desc, 12, '#64748B', 150, 20);

            if (isSelected) {
              const badge = this.createNode('Badge', new Vec3(65, 50, 0), card);
              this.ensureTransform(badge, 26, 26);
              const bg = badge.addComponent(Graphics);
              bg.fillColor = this.hex(th.border);
              bg.circle(0, 0, 12);
              bg.fill();
              this.createLabel(badge, 'Check', new Vec3(0, 1, 0), '✔', 14, '#000000', 24, 24);
            }

            this.addClick(card, () => {
              if (this.selectedTheme !== idx) {
                console.log(`[SettingsModal] Selected Theme ${th.name}`);
                this.selectedTheme = idx;
                this.updateDialogStyle();
                this.renderTabs();
                this.renderContent();

                if (this.onThemeChangedCallback) {
                  this.onThemeChangedCallback(idx);
                }
              }
            });
          }); // Bullet Time Sensitivity Row Container (Y = -65)

          const btRow = this.createNode('BTRow', new Vec3(0, -65, 0), parent);
          this.ensureTransform(btRow, 580, 50);
          const btG = btRow.addComponent(Graphics);
          btG.fillColor = this.hex('#1E293B');
          btG.fillColor.a = 150;
          btG.roundRect(-290, -25, 580, 50, 14);
          btG.fill();
          btG.strokeColor = this.hex('#334155');
          btG.lineWidth = 1.2;
          btG.stroke();
          this.createLabel(btRow, 'SliderLabel', new Vec3(-195, 0, 0), '⏱️ 子弹时间速率', 15, '#93C5FD', 150, 28);
          const speeds = ['慢速 (25%)', '适中 (50%)', '极速 (100%)'];
          const speedXs = [-50, 80, 210];
          speeds.forEach((sp, i) => {
            const isSel = this.bulletTimeSpeed === i;
            const btn = this.createNode(`Speed_${i}`, new Vec3(speedXs[i], 0, 0), btRow);
            this.ensureTransform(btn, 116, 36);
            const bg = btn.addComponent(Graphics);
            bg.fillColor = isSel ? this.hex('#2563EB') : this.hex('#0F172A');
            bg.roundRect(-58, -18, 116, 36, 10);
            bg.fill();
            bg.strokeColor = isSel ? this.hex('#00F0FF') : this.hex('#334155');
            bg.lineWidth = 1.5;
            bg.stroke();
            this.createLabel(btn, 'Text', new Vec3(0, 1, 0), sp, 13, isSel ? '#FFFFFF' : '#94A3B8', 110, 26);
            this.addClick(btn, () => {
              this.bulletTimeSpeed = i;
              this.renderContent();
            });
          }); // Graphics Quality Selector Row Container (Y = -135)

          const qRow = this.createNode('QRow', new Vec3(0, -135, 0), parent);
          this.ensureTransform(qRow, 580, 50);
          const qG = qRow.addComponent(Graphics);
          qG.fillColor = this.hex('#1E293B');
          qG.fillColor.a = 150;
          qG.roundRect(-290, -25, 580, 50, 14);
          qG.fill();
          qG.strokeColor = this.hex('#334155');
          qG.lineWidth = 1.2;
          qG.stroke();
          this.createLabel(qRow, 'QualityLabel', new Vec3(-195, 0, 0), '✨ 视网膜渲染画质', 15, '#93C5FD', 150, 28);
          const qualities = ['流畅 (60fps)', '均衡 (HD)', '极清 (Retina)'];
          qualities.forEach((q, i) => {
            const isSel = this.selectedQuality === i;
            const btn = this.createNode(`Qual_${i}`, new Vec3(speedXs[i], 0, 0), qRow);
            this.ensureTransform(btn, 116, 36);
            const bg = btn.addComponent(Graphics);
            bg.fillColor = isSel ? this.hex('#4C1D95') : this.hex('#0F172A');
            bg.roundRect(-58, -18, 116, 36, 10);
            bg.fill();
            bg.strokeColor = isSel ? this.hex('#E879F9') : this.hex('#334155');
            bg.lineWidth = 1.5;
            bg.stroke();
            this.createLabel(btn, 'Text', new Vec3(0, 1, 0), q, 13, isSel ? '#FFFFFF' : '#94A3B8', 110, 26);
            this.addClick(btn, () => {
              this.selectedQuality = i;
              this.renderContent();
            });
          });
        }

        renderGameplayRulesTab(parent) {
          const rulesBox = this.createNode('RulesBox', new Vec3(0, 0, 0), parent);
          this.ensureTransform(rulesBox, 600, 320);
          const g = rulesBox.addComponent(Graphics);
          g.fillColor = this.hex('#1E293B');
          g.fillColor.a = 180;
          g.roundRect(-300, -160, 600, 320, 18);
          g.fill();
          g.strokeColor = this.hex('#3B82F6');
          g.lineWidth = 1.5;
          g.stroke();
          this.createLabel(rulesBox, 'Title', new Vec3(0, 125, 0), '⚡ 浮岛浮光 · 玩法与进阶技巧', 20, '#FDE047', 500, 36);
          const rules = ['🔷  放置与接通：拖拽下方卡牌堆的水晶地砖，放置在上方棋盘对应方格，接通从起点至终点的光轨通道。', '⏱️  子弹时间：当小球行进到拐角或通路中断处时，系统自动触发极限减速，为你争取宝贵的反应时间！', '🔄  预测与擦除：点击右侧 [预览] 可预测光轨走向；放置失误或卡死时，可点击 [擦除] 重置当前手牌。', '🎁  救场与无敌：若小球不幸坠落，可通过微信好友助力瞬间复活，并获得 3 秒无敌光环冲过难关！'];
          rules.forEach((r, idx) => {
            const y = 60 - idx * 56;
            const rNode = this.createNode(`Rule_${idx}`, new Vec3(0, y, 0), rulesBox);
            this.ensureTransform(rNode, 550, 48);
            const rg = rNode.addComponent(Graphics);
            rg.fillColor = this.hex('#0F172A');
            rg.fillColor.a = 200;
            rg.roundRect(-270, -22, 540, 44, 12);
            rg.fill();
            this.createLabel(rNode, 'Text', new Vec3(-10, 0, 0), r, 14, '#E2E8F0', 520, 40);
          });
        }

        renderAboutTab(parent) {
          const aboutBox = this.createNode('AboutBox', new Vec3(0, 20, 0), parent);
          this.ensureTransform(aboutBox, 580, 240);
          const g = aboutBox.addComponent(Graphics);
          g.fillColor = this.hex('#1E293B');
          g.fillColor.a = 200;
          g.roundRect(-290, -120, 580, 240, 18);
          g.fill();
          g.strokeColor = this.hex('#60A5FA');
          g.lineWidth = 2;
          g.stroke();
          this.createLabel(aboutBox, 'Emblem', new Vec3(0, 75, 0), '✨  浮 岛 浮 光   (Flow Land Light)  ✨', 24, '#00F0FF', 500, 36);
          this.createLabel(aboutBox, 'Sub', new Vec3(0, 35, 0), 'Cocos Creator 微信小游戏 · 纯代码程序化视网膜渲染引擎', 15, '#93C5FD', 520, 26);
          this.createLabel(aboutBox, 'Ver', new Vec3(0, -10, 0), '当前版本: v1.0.0 (Retina 纯程序化版)  |  引擎: Cocos Creator', 14, '#CBD5E1', 500, 24);
          this.createLabel(aboutBox, 'Team', new Vec3(0, -45, 0), '核心特色: 零外部图片资源依赖 · 视网膜级锐利画质 · 极速加载', 14, '#FDE047', 520, 24);
          this.createLabel(aboutBox, 'Copy', new Vec3(0, -80, 0), '© 2026 Antigravity AI Team. All Rights Reserved.', 13, '#64748B', 400, 20); // Reset Progress Button (Y = -140)

          const resetBtn = this.createNode('ResetBtn', new Vec3(0, -140, 0), parent);
          this.ensureTransform(resetBtn, 260, 46);
          const rg = resetBtn.addComponent(Graphics);
          rg.fillColor = this.hex('#991B1B');
          rg.roundRect(-130, -23, 260, 46, 14);
          rg.fill();
          rg.strokeColor = this.hex('#F87171');
          rg.lineWidth = 1.8;
          rg.stroke();
          this.createLabel(resetBtn, 'Text', new Vec3(0, 1, 0), '🔄  重置所有关卡进度', 16, '#FFFFFF', 220, 30);
          this.addClick(resetBtn, () => {
            console.log('[SettingsModal] Clicked Reset Progress!');
            this.closeModal();
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
//# sourceMappingURL=7f0a4305744ceb5d337c20dd978bfa2b9eb26b59.js.map