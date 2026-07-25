import { Direction, GridPos, LevelConfig, RunnerState, TileType } from './GameTypes';

export interface DifficultyReport {
  score: number;
  label: 'easy' | 'normal' | 'hard' | 'expert';
  reasons: string[];
}

export class SeededRandom {
  constructor(private seed: number) {}

  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 0x100000000;
  }

  pick<T>(items: T[]): T {
    return items[Math.floor(this.next() * items.length)];
  }
}

export class LevelDirector {
  static estimateDifficulty(level: LevelConfig): DifficultyReport {
    let score = level.recommendedMoves * 8 + level.obstacles.length * 3;
    const reasons: string[] = [`${level.recommendedMoves} recommended moves`];
    const uniqueTiles = new Set(level.tilePool);
    score += uniqueTiles.size * 4;
    if (level.goals.filter((goal) => goal.required).length > 1) {
      score += 18;
      reasons.push('multi required goals');
    }
    if (level.unstableCells && level.unstableCells.length > 0) {
      score += level.unstableCells.length * 5;
      reasons.push('future collapse warnings');
    }
    if (uniqueTiles.has('jump') || uniqueTiles.has('vine') || uniqueTiles.has('blackhole') || uniqueTiles.has('splitter')) {
      score += 14;
      reasons.push('advanced crystal set');
    }

    const label = score >= 86 ? 'expert' : score >= 62 ? 'hard' : score >= 36 ? 'normal' : 'easy';
    return { score, label, reasons };
  }

  static generateSeededChallenge(seed: number, stage: number): LevelConfig {
    const rng = new SeededRandom(seed + stage * 9973);
    const size = Math.min(9, 7 + Math.floor(stage / 4));
    const row = Math.floor(size / 2);
    const startLeft = rng.next() > 0.5;
    const direction: Direction = startLeft ? 'right' : 'left';
    const start: RunnerState = {
      row,
      col: startLeft ? 0 : size - 1,
      direction,
      color: 'none',
      speed: 1,
      state: 'IDLE',
    };
    const goalCol = startLeft ? size - 1 : 0;
    const goalRow = Math.max(1, Math.min(size - 2, row + rng.pick([-1, 0, 1])));
    const obstacles: Array<[number, number]> = [];
    const obstacleCount = Math.min(8, 2 + Math.floor(stage / 2));
    for (let i = 0; i < 40 && obstacles.length < obstacleCount; i++) {
      const r = 1 + Math.floor(rng.next() * (size - 2));
      const c = 1 + Math.floor(rng.next() * (size - 2));
      if (Math.abs(r - row) + Math.abs(c - start.col) <= 2) continue;
      if (Math.abs(r - goalRow) + Math.abs(c - goalCol) <= 2) continue;
      if (!obstacles.some(([or, oc]) => or === r && oc === c)) obstacles.push([r, c]);
    }

    const tilePool: TileType[] = ['straight', 'curve', 'cross'];
    if (stage >= 2) tilePool.push('time_crystal', 'refresh_crystal');
    if (stage >= 4) tilePool.push('collapse', 'boost');
    if (stage >= 6) tilePool.push('mirror', 'vine');
    if (stage >= 8) tilePool.push('jump', 'blackhole');
    if (stage >= 10) tilePool.push('splitter');

    const unstableCells: Array<GridPos & { collapseAfterSteps: number }> = [];
    if (stage >= 5) {
      for (let i = 0; i < Math.min(3, Math.floor(stage / 3)); i++) {
        unstableCells.push({
          row: 1 + Math.floor(rng.next() * (size - 2)),
          col: 1 + Math.floor(rng.next() * (size - 2)),
          collapseAfterSteps: 4 + i * 2,
        });
      }
    }

    return {
      id: 900000 + seed + stage,
      name: `星图种子 · ${stage + 1}`,
      gridSize: [size, size],
      start,
      goals: [{ row: goalRow, col: goalCol, color: 'none', required: stage >= 10 }],
      handSize: 3,
      bulletTimeEnergy: 3,
      runnerStepSeconds: Math.max(0.16, 0.27 - stage * 0.008),
      autoStart: false,
      obstacles,
      unstableCells,
      tilePool,
      recommendedMoves: 5 + stage,
      objective: stage >= 10 ? 'light_all_goals' : 'reach_goal',
      versionTag: stage >= 10 ? 'v2.0' : 'v1.7',
      eventTag: 'seeded_challenge',
    };
  }
}
