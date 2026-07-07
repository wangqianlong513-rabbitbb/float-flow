System.register(["__unresolved_0", "cc"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, CardSystem, _crd;

  function _reportPossibleCrUseOfTileType(extras) {
    _reporterNs.report("TileType", "./GameTypes", _context.meta, extras);
  }

  _export("CardSystem", void 0);

  return {
    setters: [function (_unresolved_) {
      _reporterNs = _unresolved_;
    }, function (_cc) {
      _cclegacy = _cc.cclegacy;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "2acc2t7CfVEyZ3t2p7Y/PX6", "CardSystem", undefined);

      _export("CardSystem", CardSystem = class CardSystem {
        constructor(pool, handSize, fixedHands) {
          if (fixedHands === void 0) {
            fixedHands = [];
          }

          this.hand = [];
          this.cursor = 0;
          this.pool = pool;
          this.handSize = handSize;
          this.fixedHands = fixedHands;
        }

        drawInitial() {
          this.hand = [];

          for (var i = 0; i < this.handSize; i++) {
            this.hand.push(this.drawOne());
          }

          return this.getHand();
        }

        getHand() {
          return [...this.hand];
        }

        consume(index) {
          if (index < 0 || index >= this.hand.length) {
            return this.getHand();
          }

          this.hand[index] = this.drawOne();
          return this.getHand();
        }

        redrawAll() {
          for (var i = 0; i < this.hand.length; i++) {
            this.hand[i] = this.drawOne();
          }

          return this.getHand();
        }

        drawOne() {
          if (this.cursor < this.fixedHands.length) {
            return this.fixedHands[this.cursor++];
          }

          if (this.pool.length === 0) {
            return 'straight';
          }

          var randomIndex = Math.floor(Math.random() * this.pool.length);
          return this.pool[randomIndex];
        }

      });

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=27bbfb0dec8b4aff6130f15e9e4df4ce7c5ccf4b.js.map