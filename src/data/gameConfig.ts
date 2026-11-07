import type { BuildingDefinition, BuildingType } from '../domain/types';

/** 与 PRD 对齐的唯一配置源；界面、预览和结算均不得另设一套规则。 */
export const GAME_CONFIG = {
  gridSize: 5,
  cellSize: 1,
  initialBudget: 80,
  dragThresholdPixels: 5,
} as const;

export const BUILDING_TYPES: readonly BuildingType[] = ['factory', 'house', 'park', 'shop'];

export const BUILDINGS = {
  factory: { name: '工厂', width: 2, depth: 2, cost: 35, limit: 1, color: '#b58b62', net: 38, satisfactionBonus: 0 },
  house: { name: '住宅', width: 1, depth: 1, cost: 12, limit: 2, color: '#e7d7b5', net: -3, satisfactionBonus: 0 },
  park: { name: '公园', width: 2, depth: 2, cost: 18, limit: 1, color: '#7f9b70', net: -4, satisfactionBonus: 20 },
  shop: { name: '商店', width: 1, depth: 1, cost: 15, limit: 1, color: '#96afaa', net: 10, satisfactionBonus: 5 },
} as const satisfies Record<BuildingType, BuildingDefinition>;

export const ECONOMY = {
  baseSatisfaction: 80,
  satisfactionMin: 0,
  satisfactionMax: 100,
  facilityRange: 2,
  pollution: { minEast: 1, maxEast: 3, lateral: 1, penalty: 35 },
  targets: { satisfaction: 70, net: 25 },
  score: { satisfactionWeight: 0.55, profitWeight: 35, budgetWeight: 10, referenceProfit: 42, maximum: 100 },
  titles: [
    { minimum: 80, name: '配置能手' },
    { minimum: 75, name: '城镇协调员' },
    { minimum: 0, name: '规划达标' },
  ],
} as const;

export function isBuildingType(value: unknown): value is BuildingType {
  return typeof value === 'string' && Object.hasOwn(BUILDINGS, value);
}
