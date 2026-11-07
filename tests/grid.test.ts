import { describe, expect, it } from 'vitest';
import { BUILDING_TYPES } from '../src/data/gameConfig';
import { buildingsOverlap, footprintCells, isFootprintInBounds } from '../src/domain/grid';
import { canPlace } from '../src/domain/validation';
import { cellToWorld, worldToCell } from '../src/scene/coordinates';
import { building, stateWith } from './helpers';

describe('占地和坐标约定', () => {
  it.each(['factory', 'park'] as const)('%s 使用原点向东、向北的四格', (type) => {
    expect(footprintCells(building('a', type, 1, 2))).toEqual([
      { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 1, y: 3 }, { x: 2, y: 3 },
    ]);
  });

  it.each(['house', 'shop'] as const)('%s 只占原点一格', (type) => {
    expect(footprintCells(building('a', type, 4, 4))).toEqual([{ x: 4, y: 4 }]);
  });

  it.each(BUILDING_TYPES)('%s 遍历 25 个原点，合法占地数符合尺寸', (type) => {
    let validOrigins = 0;
    for (let x = 0; x < 5; x += 1) {
      for (let y = 0; y < 5; y += 1) validOrigins += Number(isFootprintInBounds(building('a', type, x, y), 5));
    }
    expect(validOrigins).toBe(type === 'factory' || type === 'park' ? 16 : 25);
  });

  it.each([[-1, 0], [0, -1], [4, 0], [0, 4], [5, 5]])('2×2 拒绝越界原点 (%i,%i)', (x, y) => {
    expect(canPlace(stateWith(), building('a', 'factory', x, y)).valid).toBe(false);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, 0.5])('拒绝非法坐标 %s', (x) => {
    expect(canPlace(stateWith(), building('a', 'house', x, 0)).valid).toBe(false);
  });

  it('相邻边界可接触，但共享一格就属于重叠', () => {
    const factory = building('f', 'factory', 0, 0);
    expect(buildingsOverlap(factory, building('h', 'house', 2, 0))).toBe(false);
    expect(buildingsOverlap(factory, building('h', 'house', 1, 1))).toBe(true);
    expect(buildingsOverlap(factory, building('p', 'park', 1, 1))).toBe(true);
  });

  it('逻辑西南/东北格映射到正确的世界坐标，且 25 格均可回转', () => {
    expect(cellToWorld({ x: 0, y: 0 })).toEqual({ x: -2, z: 2 });
    expect(cellToWorld({ x: 4, y: 4 })).toEqual({ x: 2, z: -2 });
    for (let x = 0; x < 5; x += 1) {
      for (let y = 0; y < 5; y += 1) expect(worldToCell(cellToWorld({ x, y }))).toEqual({ x, y });
    }
    expect(worldToCell({ x: -1.5001, z: 2 })).toEqual({ x: 0, y: 0 });
    expect(worldToCell({ x: -1.5, z: 2 })).toEqual({ x: 1, y: 0 });
  });
});

describe('放置校验', () => {
  it('移动排除自身，仍检测其他建筑的占地', () => {
    const factory = building('f', 'factory', 0, 0);
    expect(canPlace(stateWith(factory), building('f', 'factory', 1, 0)).valid).toBe(true);
    expect(canPlace(stateWith(factory, building('h', 'house', 3, 0)), building('f', 'factory', 2, 0)).valid).toBe(false);
  });

  it.each([
    [building('f', 'factory', 0, 0), building('f2', 'factory', 3, 3)],
    [building('p', 'park', 0, 0), building('p2', 'park', 3, 3)],
    [building('s', 'shop', 0, 0), building('s2', 'shop', 4, 4)],
  ])('拒绝超出单栋建筑配额', (first, next) => {
    expect(canPlace(stateWith(first), next).valid).toBe(false);
  });

  it('两栋住宅允许，第三栋拒绝', () => {
    const first = building('h1', 'house', 0, 0);
    const second = building('h2', 'house', 1, 0);
    expect(canPlace(stateWith(first), second).valid).toBe(true);
    expect(canPlace(stateWith(first, second), building('h3', 'house', 2, 0)).valid).toBe(false);
  });

  it.each([['park', 'shop'], ['shop', 'park']] as const)('%s 与 %s 双向互斥', (first, next) => {
    const result = canPlace(stateWith(building('a', first, 0, 0)), building('b', next, 3, 3));
    expect(result).toEqual({ valid: false, errors: ['先删除现有设施，再放置另一种。'] });
  });

  it('满配置剩余预算不足单次价格时，移动仍按替换计算', () => {
    const state = stateWith(building('f', 'factory', 0, 0), building('h1', 'house', 0, 4), building('h2', 'house', 4, 4), building('p', 'park', 1, 2));
    expect(canPlace(state, building('p', 'park', 3, 1)).valid).toBe(true);
  });
});
