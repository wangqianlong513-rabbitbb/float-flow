System.register(["__unresolved_0", "cc", "__unresolved_1"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, posKey, GridManager, _crd;

  function _reportPossibleCrUseOfGridPos(extras) {
    _reporterNs.report("GridPos", "./GameTypes", _context.meta, extras);
  }

  function _reportPossibleCrUseOfLevelConfig(extras) {
    _reporterNs.report("LevelConfig", "./GameTypes", _context.meta, extras);
  }

  function _reportPossibleCrUseOfTileInstance(extras) {
    _reporterNs.report("TileInstance", "./GameTypes", _context.meta, extras);
  }

  function _reportPossibleCrUseOfposKey(extras) {
    _reporterNs.report("posKey", "./DirectionUtils", _context.meta, extras);
  }

  _export("GridManager", void 0);

  return {
    setters: [function (_unresolved_) {
      _reporterNs = _unresolved_;
    }, function (_cc) {
      _cclegacy = _cc.cclegacy;
    }, function (_unresolved_2) {
      posKey = _unresolved_2.posKey;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "cbc08Vu8F5DloYhiw3HCBaU", "GridManager", undefined);

      _export("GridManager", GridManager = class GridManager {
        constructor(rows, cols) {
          this.rows = void 0;
          this.cols = void 0;
          this.tiles = new Map();
          this.obstacles = new Set();
          this.rows = rows;
          this.cols = cols;
        }

        static fromLevel(level) {
          const [rows, cols] = level.gridSize;
          const grid = new GridManager(rows, cols);

          for (const [row, col] of level.obstacles) {
            grid.setObstacle({
              row,
              col
            }, true);
          }

          for (const item of (_level$initialTiles = level.initialTiles) != null ? _level$initialTiles : []) {
            var _level$initialTiles;

            grid.setTile({
              row: item.row,
              col: item.col
            }, item.tile);
          }

          return grid;
        }

        clone() {
          const cloned = new GridManager(this.rows, this.cols);

          for (const [key, value] of this.tiles) {
            cloned.tiles.set(key, { ...value
            });
          }

          for (const key of this.obstacles) {
            cloned.obstacles.add(key);
          }

          return cloned;
        }

        isValid(pos) {
          return pos.row >= 0 && pos.row < this.rows && pos.col >= 0 && pos.col < this.cols;
        }

        isObstacle(pos) {
          return this.obstacles.has((_crd && posKey === void 0 ? (_reportPossibleCrUseOfposKey({
            error: Error()
          }), posKey) : posKey)(pos));
        }

        setObstacle(pos, enabled) {
          const key = (_crd && posKey === void 0 ? (_reportPossibleCrUseOfposKey({
            error: Error()
          }), posKey) : posKey)(pos);

          if (enabled) {
            this.obstacles.add(key);
            this.tiles.delete(key);
          } else {
            this.obstacles.delete(key);
          }
        }

        getTile(pos) {
          var _this$tiles$get;

          return (_this$tiles$get = this.tiles.get((_crd && posKey === void 0 ? (_reportPossibleCrUseOfposKey({
            error: Error()
          }), posKey) : posKey)(pos))) != null ? _this$tiles$get : null;
        }

        setTile(pos, tile) {
          if (!this.isValid(pos) || this.isObstacle(pos)) {
            return false;
          }

          const key = (_crd && posKey === void 0 ? (_reportPossibleCrUseOfposKey({
            error: Error()
          }), posKey) : posKey)(pos);

          if (tile) {
            this.tiles.set(key, { ...tile
            });
          } else {
            this.tiles.delete(key);
          }

          return true;
        }

        hasTile(pos) {
          return this.tiles.has((_crd && posKey === void 0 ? (_reportPossibleCrUseOfposKey({
            error: Error()
          }), posKey) : posKey)(pos));
        }

        forEachCell(visitor) {
          for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
              const pos = {
                row,
                col
              };
              visitor(pos, this.getTile(pos), this.isObstacle(pos));
            }
          }
        }

      });

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=42ccce7fa0453234d3111ade88e189ca0169dfc8.js.map