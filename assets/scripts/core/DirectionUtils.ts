import { Direction, GridPos } from './GameTypes';

export const DIRECTIONS: Direction[] = ['up', 'right', 'down', 'left'];

export function directionIndex(direction: Direction): number {
  return DIRECTIONS.indexOf(direction);
}

export function rotateDirection(direction: Direction, quarterTurns: number): Direction {
  const index = directionIndex(direction);
  const normalized = ((index + quarterTurns) % 4 + 4) % 4;
  return DIRECTIONS[normalized];
}

export function oppositeDirection(direction: Direction): Direction {
  return rotateDirection(direction, 2);
}

export function move(pos: GridPos, direction: Direction): GridPos {
  switch (direction) {
    case 'up':
      return { row: pos.row + 1, col: pos.col };
    case 'right':
      return { row: pos.row, col: pos.col + 1 };
    case 'down':
      return { row: pos.row - 1, col: pos.col };
    case 'left':
      return { row: pos.row, col: pos.col - 1 };
  }
}

export function posKey(pos: GridPos): string {
  return `${pos.row}:${pos.col}`;
}
