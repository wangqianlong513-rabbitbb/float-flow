import { GridPos, LevelConfig, TileInstance } from './GameTypes';
import { posKey } from './DirectionUtils';

export class GridManager {
  readonly rows: number;
  readonly cols: number;
  private tiles = new Map<string, TileInstance>();
  private obstacles = new Set<string>();

  constructor(rows: number, cols: number) {
    this.rows = rows;
    this.cols = cols;
  }

  static fromLevel(level: LevelConfig): GridManager {
    const [rows, cols] = level.gridSize;
    const grid = new GridManager(rows, cols);

    for (const [row, col] of level.obstacles) {
      grid.setObstacle({ row, col }, true);
    }

    for (const item of level.initialTiles ?? []) {
      grid.setTile({ row: item.row, col: item.col }, item.tile);
    }

    return grid;
  }

  clone(): GridManager {
    const cloned = new GridManager(this.rows, this.cols);
    for (const [key, value] of this.tiles) {
      cloned.tiles.set(key, { ...value });
    }
    for (const key of this.obstacles) {
      cloned.obstacles.add(key);
    }
    return cloned;
  }

  isValid(pos: GridPos): boolean {
    return pos.row >= 0 && pos.row < this.rows && pos.col >= 0 && pos.col < this.cols;
  }

  isObstacle(pos: GridPos): boolean {
    return this.obstacles.has(posKey(pos));
  }

  setObstacle(pos: GridPos, enabled: boolean): void {
    const key = posKey(pos);
    if (enabled) {
      this.obstacles.add(key);
      this.tiles.delete(key);
    } else {
      this.obstacles.delete(key);
    }
  }

  getTile(pos: GridPos): TileInstance | null {
    return this.tiles.get(posKey(pos)) ?? null;
  }

  setTile(pos: GridPos, tile: TileInstance | null): boolean {
    if (!this.isValid(pos) || this.isObstacle(pos)) {
      return false;
    }

    const key = posKey(pos);
    if (tile) {
      this.tiles.set(key, { ...tile });
    } else {
      this.tiles.delete(key);
    }
    return true;
  }

  hasTile(pos: GridPos): boolean {
    return this.tiles.has(posKey(pos));
  }

  forEachCell(visitor: (pos: GridPos, tile: TileInstance | null, obstacle: boolean) => void): void {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const pos = { row, col };
        visitor(pos, this.getTile(pos), this.isObstacle(pos));
      }
    }
  }
}
