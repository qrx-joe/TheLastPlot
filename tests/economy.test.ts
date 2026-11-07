import { describe, expect, it } from 'vitest';
import { cityTitle, evaluateCity, isHouseDownwindOfFactory, pollutionCells } from '../src/domain/economy';
import { footprintCells, minManhattanDistance } from '../src/domain/grid';
import type { BuildingInstance } from '../src/domain/types';
import { building, stateWith } from './helpers';

const sample = (): BuildingInstance[] => [
  building('f', 'factory', 0, 0), building('h1', 'house', 0, 4),
  building('h2', 'house', 4, 4), building('p', 'park', 1, 2),
];

describe('污染公式与范围预览', () => {
  it.each([[2, 1, true], [4, 1, true], [0, 0, false], [4, 4, false], [1, 0, true], [2, 4, false]] as const)('工厂 (0,1) 对住宅 (%i,%i) 的判定为 %s', (x, y, expected) => {
    expect(isHouseDownwindOfFactory(building('h', 'house', x, y), building('f', 'factory', 0, 1))).toBe(expected);
  });

  it('工厂 (1,1) 的完整集合包含两处上下侧边界，并排除自身占地', () => {
    expect(pollutionCells(building('f', 'factory', 1, 1), 5)).toEqual([
      { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 },
      { x: 3, y: 1 }, { x: 4, y: 1 },
      { x: 3, y: 2 }, { x: 4, y: 2 },
      { x: 2, y: 3 }, { x: 3, y: 3 }, { x: 4, y: 3 },
    ]);
    expect(pollutionCells(building('f', 'factory', 3, 3), 5)).toEqual([{ x: 4, y: 2 }]);
  });

  it('16 个合法工厂原点逐格验证预览与住宅扣罚的一致性', () => {
    for (let fx = 0; fx < 4; fx += 1) {
      for (let fy = 0; fy < 4; fy += 1) {
        const factory = building('f', 'factory', fx, fy);
        const own = new Set(footprintCells(factory).map((cell) => `${cell.x},${cell.y}`));
        const shown = new Set(pollutionCells(factory, 5).map((cell) => `${cell.x},${cell.y}`));
        for (let x = 0; x < 5; x += 1) {
          for (let y = 0; y < 5; y += 1) {
            expect(shown.has(`${x},${y}`)).toBe(!own.has(`${x},${y}`) && isHouseDownwindOfFactory(building('h', 'house', x, y), factory));
          }
        }
      }
    }
  });

  it('同时命中多个工厂占地格只扣一次 35', () => {
    const result = evaluateCity(stateWith(building('f', 'factory', 0, 0), building('h', 'house', 2, 1)));
    expect(result.houses).toEqual([{ id: 'h', satisfaction: 45, pollutionPenalty: 35, facilityBonus: 0 }]);
  });
});

describe('距离、费用与结算', () => {
  it('PRD 样例得到 90 / 28 / 77 / 73', () => {
    const result = evaluateCity(stateWith(...sample()));
    expect(result).toMatchObject({ averageSatisfaction: 90, monthlyNet: 28, spending: 77, remainingBudget: 3, score: 73, complete: true, won: true, title: '规划达标', errors: [] });
    expect(result.houses.map((house) => house.satisfaction)).toEqual([100, 80]);
  });

  it('公园使用最近占地格距离：2 格加成，3 格不加成', () => {
    const park = building('p', 'park', 1, 1);
    const close = building('h1', 'house', 0, 0);
    const far = building('h2', 'house', 0, 4);
    expect(minManhattanDistance(close, park)).toBe(2);
    expect(minManhattanDistance(far, park)).toBe(3);
    const result = evaluateCity(stateWith(building('f', 'factory', 3, 3), close, far, park));
    expect(result.houses.map((house) => house.facilityBonus)).toEqual([20, 0]);
    expect(result.averageSatisfaction).toBe(90);
  });

  it('商店的 2 格加成是 5，净收益 42、成本 74', () => {
    const result = evaluateCity(stateWith(building('f', 'factory', 3, 3), building('h1', 'house', 0, 0), building('h2', 'house', 0, 4), building('s', 'shop', 2, 0)));
    expect(result.houses.map((house) => house.facilityBonus)).toEqual([5, 0]);
    expect(result).toMatchObject({ averageSatisfaction: 82.5, monthlyNet: 42, spending: 74, remainingBudget: 6, score: 81 });
  });

  it('空布局平均值为 null；一栋住宅按该栋计算但不授分', () => {
    expect(evaluateCity(stateWith())).toMatchObject({ averageSatisfaction: null, monthlyNet: 0, score: 0, complete: false, won: false, title: null });
    const result = evaluateCity(stateWith(building('h', 'house', 0, 0)));
    expect(result).toMatchObject({ averageSatisfaction: 80, monthlyNet: -3, score: 0, complete: false, won: false, title: null });
    expect(result.errors).toHaveLength(3);
  });

  it('完整但污染严重的布局失败，报告实际满意度差额', () => {
    const result = evaluateCity(stateWith(building('f', 'factory', 0, 0), building('h1', 'house', 2, 0), building('h2', 'house', 3, 0), building('p', 'park', 3, 3)));
    expect(result).toMatchObject({ averageSatisfaction: 45, monthlyNet: 28, score: 48, complete: true, won: false, title: null });
    expect(result.errors).toEqual(['平均满意度还差 25.0，目标为 70。']);
  });

  it('布局不齐全时，即使两项指标达标仍不能成功或授分', () => {
    const result = evaluateCity(stateWith(...sample().filter((item) => item.type !== 'park')));
    expect(result).toMatchObject({ averageSatisfaction: 80, monthlyNet: 32, complete: false, won: false, score: 0 });
    expect(result.errors).toEqual(['还需放置公园或商店。']);
  });

  it.each([['park', 100, 79, '城镇协调员'], ['shop', 85, 83, '配置能手']] as const)('%s 最优样例保持审查时的得分上限', (type, satisfaction, score, title) => {
    const facility = type === 'park' ? building('a', type, 1, 2) : building('a', type, 0, 4);
    const result = evaluateCity(stateWith(building('f', 'factory', 0, 0), building('h1', 'house', 0, 2), building('h2', 'house', 0, 3), facility));
    expect(result).toMatchObject({ averageSatisfaction: satisfaction, score, won: true, title });
    expect(result.houses.every((house) => house.satisfaction >= 0 && house.satisfaction <= 100)).toBe(true);
  });

  it.each([[74, '规划达标'], [75, '城镇协调员'], [79, '城镇协调员'], [80, '配置能手']] as const)('称号边界 %i 正确', (score, title) => {
    expect(cityTitle(score, true)).toBe(title);
    expect(cityTitle(score, false)).toBeNull();
  });

  it('顺序、选中与阶段不改变结算，且求值不修改输入', () => {
    const state = stateWith(...sample());
    const before = JSON.stringify(state);
    const expected = evaluateCity(state);
    const reordered = evaluateCity({ ...state, placed: [...state.placed].reverse(), selectedBuildingId: 'h1', phase: 'result' });
    expect(reordered).toMatchObject({ score: expected.score, averageSatisfaction: expected.averageSatisfaction, monthlyNet: expected.monthlyNet, won: true });
    expect(JSON.stringify(state)).toBe(before);
  });
});

describe('非法完整布局不能获胜', () => {
  it.each([Number.NaN, Number.POSITIVE_INFINITY, 0.5])('非法坐标 %s 不产生 NaN 分数', (x) => {
    const placed = sample();
    placed[1] = building('h1', 'house', x, 4);
    const result = evaluateCity(stateWith(...placed));
    expect(result).toMatchObject({ complete: false, won: false, score: 0, averageSatisfaction: null });
    expect([result.spending, result.remainingBudget, result.monthlyNet, result.score].every(Number.isFinite)).toBe(true);
  });

  it.each(['overlap', 'bounds', 'duplicate', 'extra-house', 'both-facilities'] as const)('拒绝 %s 配置', (kind) => {
    const placed = sample();
    if (kind === 'overlap') placed[1] = building('h1', 'house', 1, 1);
    if (kind === 'bounds') placed[3] = building('p', 'park', 4, 3);
    if (kind === 'duplicate') placed[1] = building('f', 'house', 0, 4);
    if (kind === 'extra-house') placed.push(building('h3', 'house', 3, 0));
    if (kind === 'both-facilities') placed.push(building('s', 'shop', 3, 0));
    const result = evaluateCity(stateWith(...placed));
    expect(result).toMatchObject({ complete: false, won: false, score: 0, title: null });
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
