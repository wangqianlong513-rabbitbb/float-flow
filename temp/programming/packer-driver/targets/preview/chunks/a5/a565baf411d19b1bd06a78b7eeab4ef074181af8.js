System.register(["__unresolved_0", "cc"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, _crd, DIRECTIONS;

  function directionIndex(direction) {
    return DIRECTIONS.indexOf(direction);
  }

  function rotateDirection(direction, quarterTurns) {
    var index = directionIndex(direction);
    var normalized = ((index + quarterTurns) % 4 + 4) % 4;
    return DIRECTIONS[normalized];
  }

  function oppositeDirection(direction) {
    return rotateDirection(direction, 2);
  }

  function move(pos, direction) {
    switch (direction) {
      case 'up':
        return {
          row: pos.row + 1,
          col: pos.col
        };

      case 'right':
        return {
          row: pos.row,
          col: pos.col + 1
        };

      case 'down':
        return {
          row: pos.row - 1,
          col: pos.col
        };

      case 'left':
        return {
          row: pos.row,
          col: pos.col - 1
        };
    }
  }

  function posKey(pos) {
    return pos.row + ":" + pos.col;
  }

  function _reportPossibleCrUseOfDirection(extras) {
    _reporterNs.report("Direction", "./GameTypes", _context.meta, extras);
  }

  function _reportPossibleCrUseOfGridPos(extras) {
    _reporterNs.report("GridPos", "./GameTypes", _context.meta, extras);
  }

  _export({
    directionIndex: directionIndex,
    rotateDirection: rotateDirection,
    oppositeDirection: oppositeDirection,
    move: move,
    posKey: posKey
  });

  return {
    setters: [function (_unresolved_) {
      _reporterNs = _unresolved_;
    }, function (_cc) {
      _cclegacy = _cc.cclegacy;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "60d230NfplN+6A6z8bbio30", "DirectionUtils", undefined);

      _export("DIRECTIONS", DIRECTIONS = ['up', 'right', 'down', 'left']);

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=a565baf411d19b1bd06a78b7eeab4ef074181af8.js.map