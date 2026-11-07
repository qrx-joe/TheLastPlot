import { BUILDINGS } from '../data/gameConfig';
import type { BuildingInstance, Cell } from './types';

/** origin 是西南角；占地只由配置与逻辑坐标决定，不读取显示模型。 */
export function footprintCells(building: BuildingInstance): readonly Cell[] {
  const { width, depth } = BUILDINGS[building.type];
  const cells: Cell[] = [];
  for (let dy = 0; dy < depth; dy += 1) {
    for (let dx = 0; dx < width; dx += 1) {
      cells.push({ x: building.origin.x + dx, y: building.origin.y + dy });
    }
  }
  return cells;
}

export function isFootprintInBounds(building: BuildingInstance, gridSize: number): boolean {
  return footprintCells(building).every(({ x, y }) => x >= 0 && y >= 0 && x < gridSize && y < gridSize);
}

export function buildingsOverlap(a: BuildingInstance, b: BuildingInstance): boolean {
  const occupied = new Set(footprintCells(a).map(({ x, y }) => `${x},${y}`));
  return footprintCells(b).some(({ x, y }) => occupied.has(`${x},${y}`));
}

/** 设施范围使用占地格之间的最小距离，不能以模型中心或欧氏距离替代。 */
export function minManhattanDistance(a: BuildingInstance, b: BuildingInstance): number {
  let distance = Number.POSITIVE_INFINITY;
  for (const first of footprintCells(a)) {
    for (const second of footprintCells(b)) {
      distance = Math.min(distance, Math.abs(first.x - second.x) + Math.abs(first.y - second.y));
    }
  }
  return distance;
}
