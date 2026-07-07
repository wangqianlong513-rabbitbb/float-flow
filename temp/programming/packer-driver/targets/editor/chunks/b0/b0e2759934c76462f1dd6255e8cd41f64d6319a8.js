System.register(["__unresolved_0", "cc", "__unresolved_1"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, rotateDirection, _crd, BASE_TILE_CONFIGS;

  function getBaseTileConfig(type) {
    return BASE_TILE_CONFIGS[type];
  }

  function getTileDisplayName(type) {
    return getBaseTileConfig(type).displayName;
  }

  function createTile(type, rotation = 0) {
    return {
      type,
      rotation: normalizeRotation(rotation)
    };
  }

  function normalizeRotation(rotation) {
    return (rotation % 4 + 4) % 4;
  }

  function rotateTile(tile) {
    const config = getBaseTileConfig(tile.type);

    if (!config.rotatable) {
      return tile;
    }

    return { ...tile,
      rotation: normalizeRotation(tile.rotation + 1)
    };
  }

  function resolveTileConfig(tile) {
    const base = getBaseTileConfig(tile.type);
    const routing = {};

    for (const key of Object.keys(base.routing)) {
      const out = base.routing[key];

      if (!out) {
        continue;
      }

      const rotatedIn = (_crd && rotateDirection === void 0 ? (_reportPossibleCrUseOfrotateDirection({
        error: Error()
      }), rotateDirection) : rotateDirection)(key, tile.rotation);
      routing[rotatedIn] = out === 'dead' ? 'dead' : (_crd && rotateDirection === void 0 ? (_reportPossibleCrUseOfrotateDirection({
        error: Error()
      }), rotateDirection) : rotateDirection)(out, tile.rotation);
    }

    return { ...base,
      routing
    };
  }

  function _reportPossibleCrUseOfDirection(extras) {
    _reporterNs.report("Direction", "./GameTypes", _context.meta, extras);
  }

  function _reportPossibleCrUseOfTileConfig(extras) {
    _reporterNs.report("TileConfig", "./GameTypes", _context.meta, extras);
  }

  function _reportPossibleCrUseOfTileInstance(extras) {
    _reporterNs.report("TileInstance", "./GameTypes", _context.meta, extras);
  }

  function _reportPossibleCrUseOfTileType(extras) {
    _reporterNs.report("TileType", "./GameTypes", _context.meta, extras);
  }

  function _reportPossibleCrUseOfrotateDirection(extras) {
    _reporterNs.report("rotateDirection", "./DirectionUtils", _context.meta, extras);
  }

  _export({
    getBaseTileConfig: getBaseTileConfig,
    getTileDisplayName: getTileDisplayName,
    createTile: createTile,
    normalizeRotation: normalizeRotation,
    rotateTile: rotateTile,
    resolveTileConfig: resolveTileConfig
  });

  return {
    setters: [function (_unresolved_) {
      _reporterNs = _unresolved_;
    }, function (_cc) {
      _cclegacy = _cc.cclegacy;
    }, function (_unresolved_2) {
      rotateDirection = _unresolved_2.rotateDirection;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "95e25PsL5ZP67xukkziMmFR", "TileDefinitions", undefined);

      BASE_TILE_CONFIGS = {
        straight: {
          id: 'straight',
          type: 'straight',
          displayName: '直线水晶',
          rotatable: true,
          routing: {
            right: 'right',
            left: 'left'
          }
        },
        curve: {
          id: 'curve',
          type: 'curve',
          displayName: '折角镜',
          rotatable: true,
          routing: {
            right: 'up',
            down: 'left'
          }
        },
        cross: {
          id: 'cross',
          type: 'cross',
          displayName: '十字水晶',
          rotatable: false,
          routing: {
            up: 'up',
            right: 'right',
            down: 'down',
            left: 'left'
          }
        },
        collapse: {
          id: 'collapse',
          type: 'collapse',
          displayName: '崩塌晶体',
          rotatable: true,
          routing: {
            right: 'right',
            left: 'left'
          },
          oneTime: true
        },
        boost: {
          id: 'boost',
          type: 'boost',
          displayName: '加速晶体',
          rotatable: true,
          routing: {
            right: 'right',
            left: 'left'
          },
          speedModifier: 1.25,
          scoreModifier: 1.2
        },
        paint_red: {
          id: 'paint_red',
          type: 'paint_red',
          displayName: '红色染晶',
          rotatable: false,
          routing: {
            up: 'up',
            right: 'right',
            down: 'down',
            left: 'left'
          },
          colorPaint: 'red'
        },
        paint_blue: {
          id: 'paint_blue',
          type: 'paint_blue',
          displayName: '蓝色染晶',
          rotatable: false,
          routing: {
            up: 'up',
            right: 'right',
            down: 'down',
            left: 'left'
          },
          colorPaint: 'blue'
        },
        gate_red: {
          id: 'gate_red',
          type: 'gate_red',
          displayName: '红色能量门',
          rotatable: false,
          routing: {
            up: 'up',
            right: 'right',
            down: 'down',
            left: 'left'
          },
          colorFilter: 'red'
        },
        gate_blue: {
          id: 'gate_blue',
          type: 'gate_blue',
          displayName: '蓝色能量门',
          rotatable: false,
          routing: {
            up: 'up',
            right: 'right',
            down: 'down',
            left: 'left'
          },
          colorFilter: 'blue'
        },
        universal: {
          id: 'universal',
          type: 'universal',
          displayName: '万能水晶',
          rotatable: false,
          routing: {
            up: 'up',
            right: 'right',
            down: 'down',
            left: 'left'
          }
        }
      };

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=b0e2759934c76462f1dd6255e8cd41f64d6319a8.js.map