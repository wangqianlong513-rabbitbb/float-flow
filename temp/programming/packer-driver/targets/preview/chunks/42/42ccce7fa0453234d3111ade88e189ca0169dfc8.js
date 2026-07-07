System.register(["__unresolved_0", "cc", "__unresolved_1"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, posKey, GridManager, _crd;

  function _extends() { _extends = Object.assign ? Object.assign.bind() : function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

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
          var [rows, cols] = level.gridSize;
          var grid = new GridManager(rows, cols);

          for (var [row, col] of level.obstacles) {
            grid.setObstacle({
              row,
              col
            }, true);
          }

          for (var item of (_level$initialTiles = level.initialTiles) != null ? _level$initialTiles : []) {
            var _level$initialTiles;

            grid.setTile({
              row: item.row,
              col: item.col
            }, item.tile);
          }

          return grid;
        }

        clone() {
          var cloned = new GridManager(this.rows, this.cols);

          for (var [key, value] of this.tiles) {
            cloned.tiles.set(key, _extends({}, value));
          }

          for (var _key of this.obstacles) {
            cloned.obstacles.add(_key);
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
          var key = (_crd && posKey === void 0 ? (_reportPossibleCrUseOfposKey({
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

          var key = (_crd && posKey === void 0 ? (_reportPossibleCrUseOfposKey({
            error: Error()
          }), posKey) : posKey)(pos);

          if (tile) {
            this.tiles.set(key, _extends({}, tile));
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
          for (var row = 0; row < this.rows; row++) {
            for (var col = 0; col < this.cols; col++) {
              var _pos = {
                row,
                col
              };
              visitor(_pos, this.getTile(_pos), this.isObstacle(_pos));
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