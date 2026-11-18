import { Direction, TileConfig, TileInstance, TileType } from './GameTypes';
import { directionIndex, rotateDirection } from './DirectionUtils';

const BASE_TILE_CONFIGS: Record<TileType, TileConfig> = {
  straight: {
    id: 'straight',
    type: 'straight',
    displayName: '直线水晶',
    rotatable: true,
    routing: { right: 'right', left: 'left' },
  },
  curve: {
    id: 'curve',
    type: 'curve',
    displayName: '折角镜',
    rotatable: true,
    routing: { right: 'down', up: 'left' },
  },
  cross: {
    id: 'cross',
    type: 'cross',
    displayName: '十字水晶',
    rotatable: false,
    routing: { up: 'up', right: 'right', down: 'down', left: 'left' },
  },
  collapse: {
    id: 'collapse',
    type: 'collapse',
    displayName: '崩塌晶体',
    rotatable: true,
    routing: { right: 'right', left: 'left' },
    oneTime: true,
  },
  boost: {
    id: 'boost',
    type: 'boost',
    displayName: '加速晶体',
    rotatable: true,
    routing: { right: 'right', left: 'left' },
    speedModifier: 1.25,
    scoreModifier: 1.2,
  },
  mirror: {
    id: 'mirror',
    type: 'mirror',
    displayName: '镜像水晶',
    rotatable: true,
    routing: { right: 'down', up: 'left' },
    skill: 'mirror',
  },
  vine: {
    id: 'vine',
    type: 'vine',
    displayName: '生长水晶',
    rotatable: true,
    routing: { right: 'right', left: 'left' },
    skill: 'vine',
    autoGrow: 2,
  },
  jump: {
    id: 'jump',
    type: 'jump',
    displayName: '跃迁水晶',
    rotatable: true,
    routing: { right: 'right', left: 'left' },
    skill: 'jump',
    jumpDistance: 1,
  },
  blackhole: {
    id: 'blackhole',
    type: 'blackhole',
    displayName: '黑洞水晶',
    rotatable: false,
    routing: { up: 'up', right: 'right', down: 'down', left: 'left' },
    skill: 'blackhole',
  },
  splitter: {
    id: 'splitter',
    type: 'splitter',
    displayName: '分光水晶',
    rotatable: false,
    routing: { up: 'up', right: 'right', down: 'down', left: 'left' },
    skill: 'splitter',
    scoreModifier: 1.4,
  },
  paint_red: {
    id: 'paint_red',
    type: 'paint_red',
    displayName: '红色染晶',
    rotatable: false,
    routing: { up: 'up', right: 'right', down: 'down', left: 'left' },
    colorPaint: 'red',
  },
  paint_blue: {
    id: 'paint_blue',
    type: 'paint_blue',
    displayName: '蓝色染晶',
    rotatable: false,
    routing: { up: 'up', right: 'right', down: 'down', left: 'left' },
    colorPaint: 'blue',
  },
  gate_red: {
    id: 'gate_red',
    type: 'gate_red',
    displayName: '红色能量门',
    rotatable: false,
    routing: { up: 'up', right: 'right', down: 'down', left: 'left' },
    colorFilter: 'red',
  },
  gate_blue: {
    id: 'gate_blue',
    type: 'gate_blue',
    displayName: '蓝色能量门',
    rotatable: false,
    routing: { up: 'up', right: 'right', down: 'down', left: 'left' },
    colorFilter: 'blue',
  },
  time_crystal: {
    id: 'time_crystal',
    type: 'time_crystal',
    displayName: '时间水晶',
    rotatable: true,
    routing: { right: 'right', left: 'left' },
    skill: 'time',
  },
  star_crystal: {
    id: 'star_crystal',
    type: 'star_crystal',
    displayName: '星光水晶',
    rotatable: true,
    routing: { right: 'down', up: 'left' },
    skill: 'star',
    scoreModifier: 1.5,
  },
  refresh_crystal: {
    id: 'refresh_crystal',
    type: 'refresh_crystal',
    displayName: '刷新水晶',
    rotatable: false,
    routing: { up: 'up', right: 'right', down: 'down', left: 'left' },
    skill: 'refresh',
  },
  universal: {
    id: 'universal',
    type: 'universal',
    displayName: '万能水晶',
    rotatable: false,
    routing: { up: 'up', right: 'right', down: 'down', left: 'left' },
  },
};

export function getBaseTileConfig(type: TileType): TileConfig {
  return BASE_TILE_CONFIGS[type];
}

export function getTileDisplayName(type: TileType): string {
  return getBaseTileConfig(type).displayName;
}

export function createTile(type: TileType, rotation = 0): TileInstance {
  return { type, rotation: normalizeRotation(rotation) };
}

export function normalizeRotation(rotation: number): number {
  return ((rotation % 4) + 4) % 4;
}

export function isStraightType(type: TileType): boolean {
  return ['straight', 'boost', 'vine', 'jump', 'collapse', 'time_crystal'].includes(type);
}

export function isCurveType(type: TileType): boolean {
  return ['curve', 'mirror', 'star_crystal'].includes(type);
}

/**
 * 获取折角类水晶在接收 incomingDir 进光时仅有的 2 种有效出射朝向
 * （彻底剔除背对光源直接撞墙的另外 2 种无意义死路朝向）
 */
export function getValidCurveRotations(incomingDir: Direction): [number, number] {
  const idx = directionIndex(incomingDir);
  return [(idx + 3) % 4, idx];
}

/**
 * 智能二态旋转：
 * 1. 直线类：只在 0 (横) 与 1 (竖) 之间二选一切换，彻底消灭第 3、4 次无意义点击。
 * 2. 折角类：已知入射光方向时，只在 2 个有效折光朝向之间二选一瞬切，彻底剔除撞墙死路；未知入射光则顺时针转 90°。
 */
export function smartRotateTile(tile: TileInstance, incomingDir?: Direction | null): TileInstance {
  const config = getBaseTileConfig(tile.type);
  if (!config.rotatable) {
    return tile;
  }

  // 1. 直线类：2 态切换 (横 0 <-> 竖 1)
  if (isStraightType(tile.type)) {
    const currentRot = tile.rotation % 2;
    return { ...tile, rotation: currentRot === 0 ? 1 : 0 };
  }

  // 2. 折角类：若知晓入射光方向，仅在 2 种有效折光朝向间瞬切
  if (isCurveType(tile.type) && incomingDir) {
    const [rotA, rotB] = getValidCurveRotations(incomingDir);
    const newRot = (tile.rotation === rotA) ? rotB : rotA;
    return { ...tile, rotation: newRot };
  }

  // 3. 兜底传统步进
  return { ...tile, rotation: normalizeRotation(tile.rotation + 1) };
}

export function rotateTile(tile: TileInstance, incomingDir?: Direction | null): TileInstance {
  return smartRotateTile(tile, incomingDir);
}

export function resolveTileConfig(tile: TileInstance): TileConfig {
  const base = getBaseTileConfig(tile.type);
  const routing: Partial<Record<Direction, Direction | 'dead'>> = {};

  for (const key of Object.keys(base.routing) as Direction[]) {
    const out = base.routing[key];
    if (!out) {
      continue;
    }
    const rotatedIn = rotateDirection(key, tile.rotation);
    routing[rotatedIn] = out === 'dead' ? 'dead' : rotateDirection(out, tile.rotation);
  }

  return { ...base, routing };
}
