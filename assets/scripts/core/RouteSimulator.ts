import { GridManager } from './GridManager';
import { move, posKey } from './DirectionUtils';
import { GoalConfig, GridPos, PathNode, PlacementCandidate, PreviewResult, RunnerState } from './GameTypes';
import { resolveTileConfig } from './TileDefinitions';

export class RouteSimulator {
  static simulate(
    grid: GridManager,
    runner: RunnerState,
    goals: GoalConfig[],
    candidate?: PlacementCandidate,
  ): PreviewResult {
    const tempGrid = grid.clone();
    if (candidate) {
      tempGrid.setTile(candidate, candidate.tile);
    }

    const path: PathNode[] = [];
    const visited = new Set<string>();
    let current: GridPos = { row: runner.row, col: runner.col };
    let direction = runner.direction;
    let color = runner.color;
    const requiredGoals = goals.filter((goal) => goal.required);
    const litGoals = new Set<string>(goals.filter((goal) => goal.lit).map((goal) => posKey(goal)));
    const maxSteps = tempGrid.rows * tempGrid.cols * 2;

    for (let step = 0; step < maxSteps; step++) {
      const next = move(current, direction);
      const stateKey = `${posKey(next)}:${direction}:${color}`;

      if (!tempGrid.isValid(next)) {
        path.push({ ...next, result: 'dead', color });
        return { path, success: false, reason: '前方是虚空' };
      }

      if (tempGrid.isObstacle(next)) {
        path.push({ ...next, result: 'blocked', color });
        return { path, success: false, reason: '前方被障碍阻挡' };
      }

      const goal = this.findGoal(next, goals);
      if (goal && (!goal.color || goal.color === 'none' || goal.color === color)) {
        const goalKey = posKey(goal);
        if (requiredGoals.length === 0) {
          path.push({ ...next, result: 'goal', color });
          return { path, success: true };
        }
        litGoals.add(goalKey);
        const complete = requiredGoals.every((requiredGoal) => litGoals.has(posKey(requiredGoal)));
        path.push({ ...next, result: complete ? 'goal' : 'pass', color });
        if (complete) {
          return { path, success: true };
        }
        current = next;
        continue;
      } else if (goal) {
        path.push({ ...next, result: 'blocked', color });
        return { path, success: false, reason: '光的颜色不匹配' };
      }

      const tile = tempGrid.getTile(next);
      if (!tile) {
        path.push({ ...next, result: 'dead', color });
        return { path, success: false, reason: '前方没有水晶路' };
      }

      if (visited.has(stateKey)) {
        path.push({ ...next, result: 'loop', color });
        return { path, success: false, reason: '路线形成循环' };
      }
      visited.add(stateKey);

      const config = resolveTileConfig(tile);
      if (config.colorFilter && config.colorFilter !== 'none' && config.colorFilter !== color) {
        path.push({ ...next, result: 'blocked', color });
        return { path, success: false, reason: '光的颜色不匹配' };
      }

      if (config.colorPaint && config.colorPaint !== 'none') {
        color = config.colorPaint;
      }

      const out = config.routing[direction];
      if (!out || out === 'dead') {
        path.push({ ...next, result: 'dead', color });
        return { path, success: false, reason: '水晶方向不连通' };
      }

      path.push({ ...next, result: 'pass', color });
      current = next;
      direction = out;

      if (config.jumpDistance && config.jumpDistance > 0) {
        for (let i = 0; i < config.jumpDistance; i++) {
          const landing = move(current, direction);
          if (!tempGrid.isValid(landing)) {
            path.push({ ...landing, result: 'dead', color });
            return { path, success: false, reason: '跃迁落入虚空' };
          }
          if (tempGrid.isObstacle(landing)) {
            path.push({ ...landing, result: 'blocked', color });
            return { path, success: false, reason: '跃迁被障碍阻挡' };
          }
          const jumpGoal = this.findGoal(landing, goals);
          if (jumpGoal && (!jumpGoal.color || jumpGoal.color === 'none' || jumpGoal.color === color)) {
            const goalKey = posKey(jumpGoal);
            if (requiredGoals.length === 0) {
              path.push({ ...landing, result: 'goal', color });
              return { path, success: true };
            }
            litGoals.add(goalKey);
            const complete = requiredGoals.every((requiredGoal) => litGoals.has(posKey(requiredGoal)));
            path.push({ ...landing, result: complete ? 'goal' : 'pass', color });
            if (complete) {
              return { path, success: true };
            }
          } else {
            path.push({ ...landing, result: 'pass', color });
          }
          current = landing;
        }
      }
    }

    return { path, success: false, reason: '路线过长或无法抵达终点' };
  }

  private static findGoal(pos: GridPos, goals: GoalConfig[]): GoalConfig | null {
    return goals.find((goal) => goal.row === pos.row && goal.col === pos.col) ?? null;
  }
}
