import { BUILDINGS, GAME_CONFIG, isBuildingType } from '../data/gameConfig';
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

/** 检查整个已提交数据，不把“建筑齐全但重叠/超限”误判为可结算。 */
export function validateLayout(state: GameState): ValidationResult {
  const errors = new Set<string>();
  if (state.gridSize !== GAME_CONFIG.gridSize || state.initialBudget !== GAME_CONFIG.initialBudget) errors.add('关卡配置与固定规则不一致。');
  const ids = new Set<string>();
  for (const building of state.placed) {
    if (!isBuildingType(building.type)) errors.add('包含未知建筑类型。');
    if (typeof building.id !== 'string' || !building.id.trim()) errors.add('建筑 ID 不能为空。');
    else if (ids.has(building.id)) errors.add('建筑 ID 重复。');
    else ids.add(building.id);
    if (!building.origin || !Number.isInteger(building.origin.x) || !Number.isInteger(building.origin.y)) errors.add('建筑坐标必须是有限整数。');
  }
  // 先检查结构，再调用占地函数，避免未知类型或非法坐标导致错误计算。
  if (errors.size) return { valid: false, errors: [...errors] };
  for (const building of state.placed) {
    const result = canPlace(state, building);
    if (!result.valid) for (const error of result.errors) errors.add(error);
  }
  return errors.size ? { valid: false, errors: [...errors] } : { valid: true };
}

/** 前置条件：布局合法；缺少项与经济目标失败分别反馈。 */
export function requiredBuildings(state: GameState): ValidationResult {
  const errors: string[] = [];
  for (const type of ['factory', 'house'] as const) {
    const missing = BUILDINGS[type].limit - state.placed.filter((building) => building.type === type).length;
    if (missing > 0) errors.push(`还需放置${missing}栋${BUILDINGS[type].name}。`);
  }
  if (!state.placed.some((building) => building.type === 'park' || building.type === 'shop')) errors.push('还需放置公园或商店。');
  return errors.length ? { valid: false, errors } : { valid: true };
}
