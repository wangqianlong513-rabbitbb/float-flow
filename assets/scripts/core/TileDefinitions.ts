import { Direction, TileConfig, TileInstance, TileType } from './GameTypes';
import { rotateDirection } from './DirectionUtils';

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

export function rotateTile(tile: TileInstance): TileInstance {
  const config = getBaseTileConfig(tile.type);
  if (!config.rotatable) {
    return tile;
  }
  return { ...tile, rotation: normalizeRotation(tile.rotation + 1) };
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
