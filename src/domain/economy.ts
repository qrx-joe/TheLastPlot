import { BUILDINGS, ECONOMY, GAME_CONFIG, isBuildingType } from '../data/gameConfig';
import { footprintCells, minManhattanDistance } from './grid';
import { requiredBuildings, validateLayout } from './validation';
import type { BuildingInstance, Cell, Evaluation, GameState, HouseEvaluation } from './types';

/** 固定西风向东的游戏公式；逐工厂占地格判定，允许命中多个但只返回一次布尔值。 */
function cellIsDownwind(cell: Cell, factoryCells: readonly Cell[]): boolean {
  return factoryCells.some((factory) => {
    const east = cell.x - factory.x;
    return east >= ECONOMY.pollution.minEast && east <= ECONOMY.pollution.maxEast && Math.abs(cell.y - factory.y) <= ECONOMY.pollution.lateral;
  });
}

export function isHouseDownwindOfFactory(house: BuildingInstance, factory: BuildingInstance): boolean {
  const factoryCells = footprintCells(factory);
  return footprintCells(house).some((cell) => cellIsDownwind(cell, factoryCells));
}

/** 预览与住宅扣罚共用 cellIsDownwind；只保留地图内且不属于工厂占地的格子。 */
export function pollutionCells(factory: BuildingInstance, gridSize: number): readonly Cell[] {
  const factoryCells = footprintCells(factory);
  const occupied = new Set(factoryCells.map(({ x, y }) => `${x},${y}`));
  const cells: Cell[] = [];
  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      const cell = { x, y };
      if (!occupied.has(`${x},${y}`) && cellIsDownwind(cell, factoryCells)) cells.push(cell);
    }
  }
  return cells;
}

export function cityTitle(score: number, won: boolean): string | null {
  if (!won || !Number.isFinite(score)) return null;
  return ECONOMY.titles.find((title) => score >= title.minimum)?.name ?? null;
}

/**
 * 所有指标从当前布局重新求值；建造费用不扣进经营收益，移动/撤销不累加历史值。
 * 不完整布局可显示已有建筑的指标，但不授分、不授称号；非法布局不计算住宅空间效应。
 */
export function evaluateCity(state: GameState): Evaluation {
  const known = state.placed.filter((building) => isBuildingType(building.type));
  const spending = known.reduce((sum, building) => sum + BUILDINGS[building.type].cost, 0);
  const initialBudget = Number.isFinite(state.initialBudget) ? state.initialBudget : GAME_CONFIG.initialBudget;
  const budget = initialBudget - spending;
  const monthlyNet = known.reduce((sum, building) => sum + BUILDINGS[building.type].net, 0);
  const layout = validateLayout(state);
  if (!layout.valid) {
    return { spending, remainingBudget: budget, monthlyNet, averageSatisfaction: null, score: 0, complete: false, won: false, errors: layout.errors, houses: [], title: null, explanation: '布局无效，请先修正占地或建筑配置。' };
  }
  const factory = state.placed.find((building) => building.type === 'factory');
  const facility = state.placed.find((building) => building.type === 'park' || building.type === 'shop');
  const houses: HouseEvaluation[] = state.placed.filter((building) => building.type === 'house').map((house) => {
    const pollutionPenalty = factory && isHouseDownwindOfFactory(house, factory) ? ECONOMY.pollution.penalty : 0;
    const facilityBonus = facility && minManhattanDistance(house, facility) <= ECONOMY.facilityRange ? BUILDINGS[facility.type].satisfactionBonus : 0;
    const satisfaction = Math.min(ECONOMY.satisfactionMax, Math.max(ECONOMY.satisfactionMin, ECONOMY.baseSatisfaction - pollutionPenalty + facilityBonus));
    return { id: house.id, satisfaction, pollutionPenalty, facilityBonus };
  });
  const averageSatisfaction = houses.length ? Math.round(houses.reduce((sum, house) => sum + house.satisfaction, 0) / houses.length * 10) / 10 : null;
  const requirements = requiredBuildings(state);
  const complete = requirements.valid;
  const won = complete && averageSatisfaction !== null && averageSatisfaction >= ECONOMY.targets.satisfaction && monthlyNet >= ECONOMY.targets.net;
  const errors = requirements.valid ? [] : [...requirements.errors];
  if (complete && averageSatisfaction !== null && averageSatisfaction < ECONOMY.targets.satisfaction) errors.push(`平均满意度还差 ${(ECONOMY.targets.satisfaction - averageSatisfaction).toFixed(1)}，目标为 ${ECONOMY.targets.satisfaction}。`);
  if (complete && monthlyNet < ECONOMY.targets.net) errors.push(`经营期净收益还差 ${ECONOMY.targets.net - monthlyNet}，目标为 ${ECONOMY.targets.net}。`);
  const score = complete && averageSatisfaction !== null
    ? Math.min(ECONOMY.score.maximum, Math.max(0, Math.round(
      averageSatisfaction * ECONOMY.score.satisfactionWeight
      + Math.min(monthlyNet / ECONOMY.score.referenceProfit, 1) * ECONOMY.score.profitWeight
      + budget / state.initialBudget * ECONOMY.score.budgetWeight,
    ))) : 0;
  const affected = houses.filter((house) => house.pollutionPenalty > 0).length;
  const explanation = affected > 0
    ? `${affected}栋住宅处于下风向；移出污染区域可提高满意度，设施加成取决于占地距离。`
    : facility?.type === 'park'
      ? '公园以较低的经营期收益换取邻近住宅的满意度，住宅当前避开了污染。'
      : facility?.type === 'shop'
        ? '商店提高固定经营期收益，并为邻近住宅提供少量满意度加成。'
        : '住宅位置决定是否受污染，设施选择决定收益与邻近加成。';
  return { spending, remainingBudget: budget, monthlyNet, averageSatisfaction, score, complete, won, errors, houses, title: cityTitle(score, won), explanation };
}
