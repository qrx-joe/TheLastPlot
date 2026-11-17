import { describe, expect, it } from 'vitest';
import { createGameStore } from '../src/state/gameStore';
import { building, startedStore } from './helpers';

/** 规划第 4 节验收布局：工厂 (0,0)、住宅 (2,1)/(0,3)、设施在 (1,2)。 */
function submittedParkStore() {
  const store = startedStore();
  const placed = [
    building('f', 'factory', 0, 0),
    building('h1', 'house', 2, 1),
    building('h2', 'house', 0, 3),
    building('p', 'park', 1, 2),
  ];
  for (const candidate of placed) expect(store.dispatch({ type: 'PLACE', building: candidate }).valid).toBe(true);
  expect(store.dispatch({ type: 'SUBMIT' }).valid).toBe(true);
  return store;
}

function switchToShop(store: ReturnType<typeof startedStore>) {
  expect(store.dispatch({ type: 'DELETE', id: 'p' }).valid).toBe(true);
  expect(store.dispatch({ type: 'PLACE', building: building('s', 'shop', 1, 2) }).valid).toBe(true);
  expect(store.dispatch({ type: 'SUBMIT' }).valid).toBe(true);
  return store;
}

describe('方案保留与对比', () => {
  it('拒绝非结算阶段的保留请求', () => {
    const intro = createGameStore();
    expect(intro.dispatch({ type: 'KEEP_RESULT' }).valid).toBe(false);
    const playing = startedStore();
    expect(playing.dispatch({ type: 'KEEP_RESULT' }).valid).toBe(false);
    expect(playing.getSavedScheme()).toBeNull();
  });

  it('保留 A 方案：保存设施类型、布局与结算值并回到编辑阶段', () => {
    const store = submittedParkStore();
    const placed = store.getState().placed;
    expect(store.dispatch({ type: 'KEEP_RESULT' }).valid).toBe(true);
    expect(store.getState().phase).toBe('playing');
    expect(store.getState().placed).toBe(placed);
    const saved = store.getSavedScheme();
    expect(saved).not.toBeNull();
    expect(saved!.facilityType).toBe('park');
    expect(saved!.placed.map((b) => `${b.type}@${b.origin.x},${b.origin.y}`).sort()).toEqual([
      'factory@0,0', 'house@0,3', 'house@2,1', 'park@1,2',
    ]);
    expect(saved!.evaluation).toMatchObject({ averageSatisfaction: 82.5, monthlyNet: 28, remainingBudget: 3, won: true });
  });

  it('重复保留被拒绝，首个方案继续有效', () => {
    const store = submittedParkStore();
    store.dispatch({ type: 'KEEP_RESULT' });
    expect(store.dispatch({ type: 'SUBMIT' }).valid).toBe(true);
    const before = store.getState();
    expect(store.dispatch({ type: 'KEEP_RESULT' }).valid).toBe(false);
    expect(store.getState()).toBe(before);
    expect(store.getSavedScheme()!.facilityType).toBe('park');
  });

  it('保留后编辑与撤销不改动快照', () => {
    const store = submittedParkStore();
    store.dispatch({ type: 'KEEP_RESULT' });
    const saved = store.getSavedScheme();
    store.dispatch({ type: 'UNDO' });
    expect(store.getBuildingCount('park')).toBe(0);
    expect(store.getSavedScheme()).toBe(saved);
    store.dispatch({ type: 'PLACE', building: building('s', 'shop', 1, 2) });
    store.dispatch({ type: 'SUBMIT' });
    expect(store.getSavedScheme()).toBe(saved);
    expect(saved!.placed.some((b) => b.type === 'park')).toBe(true);
  });

  it('B 换商店提交：按当前布局求值，保留方案仍为 A', () => {
    const store = submittedParkStore();
    store.dispatch({ type: 'KEEP_RESULT' });
    switchToShop(store);
    expect(store.getState().phase).toBe('result');
    expect(store.getEvaluation()).toMatchObject({
      averageSatisfaction: 67.5, monthlyNet: 42, remainingBudget: 6, won: false, complete: true,
    });
    expect(store.getEvaluation().errors.some((error) => error.includes('2.5'))).toBe(true);
    expect(store.getSavedScheme()!.evaluation).toMatchObject({ averageSatisfaction: 82.5, monthlyNet: 28 });
  });

  it('C 移动住宅后达标，撤销再提交回到 B 指标且 A 不变', () => {
    const store = submittedParkStore();
    store.dispatch({ type: 'KEEP_RESULT' });
    switchToShop(store);
    store.dispatch({ type: 'CONTINUE' });
    expect(store.dispatch({ type: 'MOVE', id: 'h1', origin: { x: 0, y: 2 } }).valid).toBe(true);
    store.dispatch({ type: 'SUBMIT' });
    expect(store.getEvaluation()).toMatchObject({ averageSatisfaction: 85, monthlyNet: 42, remainingBudget: 6, won: true });
    store.dispatch({ type: 'CONTINUE' });
    expect(store.dispatch({ type: 'UNDO' }).valid).toBe(true);
    expect(store.getState().placed.find((b) => b.id === 'h1')?.origin).toEqual({ x: 2, y: 1 });
    store.dispatch({ type: 'SUBMIT' });
    expect(store.getEvaluation()).toMatchObject({ averageSatisfaction: 67.5, monthlyNet: 42, won: false });
    expect(store.getSavedScheme()!.evaluation).toMatchObject({ averageSatisfaction: 82.5, monthlyNet: 28, won: true });
  });

  it('重新开始清空布局、撤销与保留方案，可另存新的首份方案', () => {
    const store = submittedParkStore();
    store.dispatch({ type: 'KEEP_RESULT' });
    store.dispatch({ type: 'RESET' });
    expect(store.getState().phase).toBe('playing');
    expect(store.getSavedScheme()).toBeNull();
    expect(store.canUndo()).toBe(false);
    expect(store.getRemainingBudget()).toBe(80);
    // 商店作为首份方案同样可以保留。
    const placed = [
      building('f', 'factory', 0, 0),
      building('h1', 'house', 2, 1),
      building('h2', 'house', 0, 3),
      building('s', 'shop', 1, 2),
    ];
    for (const candidate of placed) expect(store.dispatch({ type: 'PLACE', building: candidate }).valid).toBe(true);
    store.dispatch({ type: 'SUBMIT' });
    expect(store.dispatch({ type: 'KEEP_RESULT' }).valid).toBe(true);
    expect(store.getSavedScheme()!.facilityType).toBe('shop');
    expect(store.getSavedScheme()!.evaluation).toMatchObject({ averageSatisfaction: 67.5, won: false });
  });

  it('完整但未达标的首份方案也可保留', () => {
    const store = submittedParkStore();
    // 把公园挪远使满意度不达标，布局仍完整。
    expect(store.dispatch({ type: 'CONTINUE' }).valid).toBe(true);
    expect(store.dispatch({ type: 'MOVE', id: 'p', origin: { x: 3, y: 3 } }).valid).toBe(true);
    expect(store.getEvaluation().complete).toBe(true);
    store.dispatch({ type: 'SUBMIT' });
    expect(store.getEvaluation().won).toBe(false);
    expect(store.dispatch({ type: 'KEEP_RESULT' }).valid).toBe(true);
    expect(store.getSavedScheme()!.evaluation.won).toBe(false);
  });

  it('未保留直接继续调整不产生快照', () => {
    const store = submittedParkStore();
    store.dispatch({ type: 'CONTINUE' });
    expect(store.getSavedScheme()).toBeNull();
    store.dispatch({ type: 'SUBMIT' });
    expect(store.getSavedScheme()).toBeNull();
  });
});
