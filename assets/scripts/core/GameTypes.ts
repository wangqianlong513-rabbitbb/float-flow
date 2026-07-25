export type Direction = 'up' | 'right' | 'down' | 'left';
export type RunnerColor = 'none' | 'red' | 'blue' | 'yellow';
export type RunnerStateName = 'IDLE' | 'RUNNING' | 'BULLET_TIME' | 'SUCCESS' | 'DEAD';
export type TileType =
  | 'straight'
  | 'curve'
  | 'cross'
  | 'collapse'
  | 'boost'
  | 'mirror'
  | 'vine'
  | 'jump'
  | 'blackhole'
  | 'splitter'
  | 'paint_red'
  | 'paint_blue'
  | 'gate_red'
  | 'gate_blue'
  | 'time_crystal'
  | 'star_crystal'
  | 'refresh_crystal'
  | 'universal';

export interface GridPos {
  row: number;
  col: number;
}

export interface GoalConfig extends GridPos {
  color?: RunnerColor;
  required?: boolean;
  lit?: boolean;
  label?: string;
}

export interface RunnerState extends GridPos {
  direction: Direction;
  color: RunnerColor;
  speed: number;
  state: RunnerStateName;
}

export interface TileConfig {
  id: string;
  type: TileType;
  displayName: string;
  rotatable: boolean;
  routing: Partial<Record<Direction, Direction | 'dead'>>;
  oneTime?: boolean;
  colorFilter?: RunnerColor;
  colorPaint?: RunnerColor;
  speedModifier?: number;
  scoreModifier?: number;
  skill?: 'time' | 'star' | 'refresh' | 'mirror' | 'vine' | 'jump' | 'blackhole' | 'splitter';
  jumpDistance?: number;
  autoGrow?: number;
}

export interface TileInstance {
  type: TileType;
  rotation: number;
}

export interface LevelConfig {
  id: number;
  name: string;
  gridSize: [number, number];
  start: RunnerState;
  goals: GoalConfig[];
  timeLimit?: number;
  handSize: number;
  bulletTimeEnergy?: number;
  bulletTimeSeconds?: number;
  runnerStepSeconds: number;
  autoStart: boolean;
  obstacles: Array<[number, number]>;
  initialTiles?: Array<{ row: number; col: number; tile: TileInstance }>;
  starCores?: GridPos[];
  unstableCells?: Array<GridPos & { collapseAfterSteps: number }>;
  tilePool: TileType[];
  fixedHands?: TileType[];
  recommendedMoves: number;
  tutorialTip?: string;
  routeHints?: {
    safe?: GridPos[];
    reward?: GridPos[];
    risk?: GridPos[];
    headline?: string;
  };
  objective?: 'reach_goal' | 'collect_star' | 'light_all_goals' | 'survive' | 'race_blackhole' | 'sync_goals';
  versionTag?: string;
  eventTag?: string;
}

export type PathNodeResult = 'pass' | 'goal' | 'dead' | 'blocked' | 'loop';

export interface PathNode extends GridPos {
  result: PathNodeResult;
  color: RunnerColor;
}

export interface PreviewResult {
  path: PathNode[];
  success: boolean;
  reason?: string;
}

export interface PlacementCandidate extends GridPos {
  tile: TileInstance;
}
