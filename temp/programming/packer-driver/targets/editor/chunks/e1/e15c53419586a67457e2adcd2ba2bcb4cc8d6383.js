System.register(["__unresolved_0", "cc", "__unresolved_1", "__unresolved_2"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, move, posKey, resolveTileConfig, RouteSimulator, _crd;

  function _reportPossibleCrUseOfGridManager(extras) {
    _reporterNs.report("GridManager", "./GridManager", _context.meta, extras);
  }

  function _reportPossibleCrUseOfmove(extras) {
    _reporterNs.report("move", "./DirectionUtils", _context.meta, extras);
  }

  function _reportPossibleCrUseOfposKey(extras) {
    _reporterNs.report("posKey", "./DirectionUtils", _context.meta, extras);
  }

  function _reportPossibleCrUseOfGoalConfig(extras) {
    _reporterNs.report("GoalConfig", "./GameTypes", _context.meta, extras);
  }

  function _reportPossibleCrUseOfGridPos(extras) {
    _reporterNs.report("GridPos", "./GameTypes", _context.meta, extras);
  }

  function _reportPossibleCrUseOfPathNode(extras) {
    _reporterNs.report("PathNode", "./GameTypes", _context.meta, extras);
  }

  function _reportPossibleCrUseOfPlacementCandidate(extras) {
    _reporterNs.report("PlacementCandidate", "./GameTypes", _context.meta, extras);
  }

  function _reportPossibleCrUseOfPreviewResult(extras) {
    _reporterNs.report("PreviewResult", "./GameTypes", _context.meta, extras);
  }

  function _reportPossibleCrUseOfRunnerState(extras) {
    _reporterNs.report("RunnerState", "./GameTypes", _context.meta, extras);
  }

  function _reportPossibleCrUseOfresolveTileConfig(extras) {
    _reporterNs.report("resolveTileConfig", "./TileDefinitions", _context.meta, extras);
  }

  _export("RouteSimulator", void 0);

  return {
    setters: [function (_unresolved_) {
      _reporterNs = _unresolved_;
    }, function (_cc) {
      _cclegacy = _cc.cclegacy;
    }, function (_unresolved_2) {
      move = _unresolved_2.move;
      posKey = _unresolved_2.posKey;
    }, function (_unresolved_3) {
      resolveTileConfig = _unresolved_3.resolveTileConfig;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "52a57HEoftBRYd3rAtI0YGJ", "RouteSimulator", undefined);

      _export("RouteSimulator", RouteSimulator = class RouteSimulator {
        static simulate(grid, runner, goals, candidate) {
          const tempGrid = grid.clone();

          if (candidate) {
            tempGrid.setTile(candidate, candidate.tile);
          }

          const path = [];
          const visited = new Set();
          let current = {
            row: runner.row,
            col: runner.col
          };
          let direction = runner.direction;
          let color = runner.color;
          const maxSteps = tempGrid.rows * tempGrid.cols * 2;

          for (let step = 0; step < maxSteps; step++) {
            const next = (_crd && move === void 0 ? (_reportPossibleCrUseOfmove({
              error: Error()
            }), move) : move)(current, direction);
            const stateKey = `${(_crd && posKey === void 0 ? (_reportPossibleCrUseOfposKey({
              error: Error()
            }), posKey) : posKey)(next)}:${direction}:${color}`;

            if (!tempGrid.isValid(next)) {
              path.push({ ...next,
                result: 'dead',
                color
              });
              return {
                path,
                success: false,
                reason: '前方是虚空'
              };
            }

            if (tempGrid.isObstacle(next)) {
              path.push({ ...next,
                result: 'blocked',
                color
              });
              return {
                path,
                success: false,
                reason: '前方被障碍阻挡'
              };
            }

            const goal = this.findGoal(next, goals);

            if (goal && (!goal.color || goal.color === 'none' || goal.color === color)) {
              path.push({ ...next,
                result: 'goal',
                color
              });
              return {
                path,
                success: true
              };
            }

            const tile = tempGrid.getTile(next);

            if (!tile) {
              path.push({ ...next,
                result: 'dead',
                color
              });
              return {
                path,
                success: false,
                reason: '前方没有水晶路'
              };
            }

            if (visited.has(stateKey)) {
              path.push({ ...next,
                result: 'loop',
                color
              });
              return {
                path,
                success: false,
                reason: '路线形成循环'
              };
            }

            visited.add(stateKey);
            const config = (_crd && resolveTileConfig === void 0 ? (_reportPossibleCrUseOfresolveTileConfig({
              error: Error()
            }), resolveTileConfig) : resolveTileConfig)(tile);

            if (config.colorFilter && config.colorFilter !== 'none' && config.colorFilter !== color) {
              path.push({ ...next,
                result: 'blocked',
                color
              });
              return {
                path,
                success: false,
                reason: '光的颜色不匹配'
              };
            }

            if (config.colorPaint && config.colorPaint !== 'none') {
              color = config.colorPaint;
            }

            const out = config.routing[direction];

            if (!out || out === 'dead') {
              path.push({ ...next,
                result: 'dead',
                color
              });
              return {
                path,
                success: false,
                reason: '水晶方向不连通'
              };
            }

            path.push({ ...next,
              result: 'pass',
              color
            });
            current = next;
            direction = out;
          }

          return {
            path,
            success: false,
            reason: '路线过长或无法抵达终点'
          };
        }

        static findGoal(pos, goals) {
          var _goals$find;

          return (_goals$find = goals.find(goal => goal.row === pos.row && goal.col === pos.col)) != null ? _goals$find : null;
        }

      });

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=e15c53419586a67457e2adcd2ba2bcb4cc8d6383.js.map