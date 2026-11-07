import type { BuildingDefinition, BuildingType } from '../domain/types';

/** 与 PRD 对齐的唯一配置源；收益与评分在 S2 加入，不在界面重复声明。 */
export const GAME_CONFIG = {
  gridSize: 5,
  cellSize: 1,
  initialBudget: 80,
  dragThresholdPixels: 5,
} as const;

export const BUILDING_TYPES: readonly BuildingType[] = ['factory', 'house', 'park', 'shop'];

export const BUILDINGS = {
  factory: { name: '工厂', width: 2, depth: 2, cost: 35, limit: 1, color: '#b58b62' },
  house: { name: '住宅', width: 1, depth: 1, cost: 12, limit: 2, color: '#e7d7b5' },
  park: { name: '公园', width: 2, depth: 2, cost: 18, limit: 1, color: '#7f9b70' },
  shop: { name: '商店', width: 1, depth: 1, cost: 15, limit: 1, color: '#96afaa' },
} as const satisfies Record<BuildingType, BuildingDefinition>;

export function isBuildingType(value: unknown): value is BuildingType {
  return typeof value === 'string' && Object.hasOwn(BUILDINGS, value);
}
