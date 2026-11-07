import { describe, expect, it } from 'vitest';
import { createGameStore } from '../src/state/gameStore';
import type { GameAction } from '../src/domain/types';
import { building } from './helpers';

function completeStore(losing = false) {
  const store = createGameStore();
  const placed = losing
    ? [building('f', 'factory', 0, 0), building('h1', 'house', 2, 0), building('h2', 'house', 3, 0), building('p', 'park', 3, 3)]
    : [building('f', 'factory', 0, 0), building('h1', 'house', 0, 4), building('h2', 'house', 4, 4), building('p', 'park', 1, 2)];
  for (const candidate of placed) expect(store.dispatch({ type: 'PLACE', building: candidate }).valid).toBe(true);
  return store;
}

describe('结算与编辑状态流转', () => {
  it('拒绝不完整提交，保持原状态与撤销记录', () => {
    const store = createGameStore();
    store.dispatch({ type: 'PLACE', building: building('h', 'house', 0, 0) });
    const before = store.getState();
    expect(store.dispatch({ type: 'SUBMIT' }).valid).toBe(false);
    expect(store.getState()).toBe(before);
    expect(store.canUndo()).toBe(true);
    expect(store.dispatch({ type: 'UNDO' }).valid).toBe(true);
    expect(store.getState().placed).toEqual([]);
  });

  it.each([false, true])('成功/失败完整布局都进入 result，继续调整保留布局和快照（失败=%s）', (losing) => {
    const store = completeStore(losing);
    const placed = store.getState().placed;
    expect(store.dispatch({ type: 'SUBMIT' }).valid).toBe(true);
    expect(store.getState().phase).toBe('result');
    expect(store.getEvaluation().won).toBe(!losing);
    expect(store.getState().placed).toBe(placed);
    expect(store.canUndo()).toBe(true);
    expect(store.dispatch({ type: 'CONTINUE' }).valid).toBe(true);
    expect(store.getState().phase).toBe('playing');
    expect(store.getState().placed).toBe(placed);
    store.dispatch({ type: 'UNDO' });
    expect(store.getBuildingCount('park')).toBe(0);
    expect(store.getRemainingBudget()).toBe(21);
  });

  it('结果状态拒绝所有编辑动作且不消耗撤销', () => {
    const store = completeStore();
    store.dispatch({ type: 'SUBMIT' });
    const before = store.getState();
    const actions: GameAction[] = [
      { type: 'DELETE', id: 'p' }, { type: 'MOVE', id: 'h1', origin: { x: 0, y: 3 } },
      { type: 'SELECT_BUILDING', id: 'h1' }, { type: 'SELECT_TYPE', buildingType: 'shop' },
      { type: 'BEGIN_MOVE', id: 'h1' }, { type: 'CANCEL' }, { type: 'UNDO' }, { type: 'SUBMIT' },
      { type: 'PLACE', building: building('x', 'house', 0, 3) },
    ];
    for (const action of actions) {
      expect(store.dispatch(action).valid).toBe(false);
      expect(store.getState()).toBe(before);
      expect(store.canUndo()).toBe(true);
    }
  });

  it('移动、删除和撤销重算当前指标，不累加历史收益或费用', () => {
    const store = completeStore();
    store.dispatch({ type: 'MOVE', id: 'h2', origin: { x: 3, y: 0 } });
    expect(store.getEvaluation()).toMatchObject({ averageSatisfaction: 72.5, spending: 77, monthlyNet: 28 });
    store.dispatch({ type: 'UNDO' });
    expect(store.getEvaluation()).toMatchObject({ averageSatisfaction: 90, spending: 77, monthlyNet: 28, score: 73 });
    store.dispatch({ type: 'DELETE', id: 'f' });
    expect(store.getEvaluation()).toMatchObject({ monthlyNet: -10, spending: 42, score: 0, complete: false });
    store.dispatch({ type: 'UNDO' });
    expect(store.getEvaluation()).toMatchObject({ monthlyNet: 28, spending: 77, score: 73 });
  });

  it('结果页重新开始清空派生指标与历史', () => {
    const store = completeStore();
    store.dispatch({ type: 'SUBMIT' });
    store.dispatch({ type: 'RESET' });
    expect(store.getState().phase).toBe('playing');
    expect(store.getEvaluation()).toMatchObject({ averageSatisfaction: null, monthlyNet: 0, score: 0, complete: false, remainingBudget: 80 });
    expect(store.canUndo()).toBe(false);
  });

  it('非结果状态的继续调整不改变状态', () => {
    const store = completeStore();
    const before = store.getState();
    expect(store.dispatch({ type: 'CONTINUE' }).valid).toBe(false);
    expect(store.getState()).toBe(before);
  });
});
