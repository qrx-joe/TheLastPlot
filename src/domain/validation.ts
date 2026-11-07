import { BUILDINGS, isBuildingType } from '../data/gameConfig';
import { buildingsOverlap, isFootprintInBounds } from './grid';
import type { BuildingInstance, BuildingType, GameState, ValidationResult } from './types';

export function remainingBudget(state: GameState): number {
  return state.initialBudget - state.placed.reduce((sum, building) => sum + BUILDINGS[building.type].cost, 0);
}

export function selectionError(state: GameState, type: BuildingType): string | null {
  if ((type === 'park' || type === 'shop') && state.placed.some((b) => (b.type === 'park' || b.type === 'shop') && b.type !== type)) {
    return '先删除现有设施，再放置另一种。';
  }
  if (state.placed.filter((building) => building.type === type).length >= BUILDINGS[type].limit) {
    return `${BUILDINGS[type].name}已达到数量上限。`;
  }
  if (BUILDINGS[type].cost > remainingBudget(state)) return '预算不足。';
  return null;
}

/**
 * MOVE 的同 ID 候选表示替换原实例：先排除自身，防止自碰撞和重复收费。
 * PLACE 的 ID 唯一性由 store 单独检查，不能通过此接口覆盖已有建筑。
 */
export function canPlace(state: GameState, candidate: BuildingInstance): ValidationResult {
  if (!isBuildingType(candidate.type)) return { valid: false, errors: ['未知的建筑类型。'] };
  if (!candidate.id.trim()) return { valid: false, errors: ['建筑 ID 不能为空。'] };
  if (!Number.isInteger(candidate.origin.x) || !Number.isInteger(candidate.origin.y)) {
    return { valid: false, errors: ['请选择完整的网格坐标。'] };
  }
  const placed = state.placed.filter((building) => building.id !== candidate.id);
  const withoutSelf = { ...state, placed };
  const errors: string[] = [];
  if (!isFootprintInBounds(candidate, state.gridSize)) errors.push('建筑占地超出地块边界。');
  if (placed.some((building) => buildingsOverlap(building, candidate))) errors.push('建筑占地与现有建筑重叠。');
  const requirementError = selectionError(withoutSelf, candidate.type);
  if (requirementError) errors.push(requirementError);
  return errors.length ? { valid: false, errors } : { valid: true };
}
