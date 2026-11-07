import { describe, expect, it } from 'vitest';
import { createGameStore } from '../src/state/gameStore';
import type { GameAction } from '../src/domain/types';
import { building } from './helpers';

describe('任务开始边界', () => {
  it('初始说明阶段拒绝编辑及提交，不产生历史', () => {
    const store = createGameStore();
    const before = store.getState();
    expect(before).toMatchObject({ phase: 'intro', placed: [], mode: 'select', selectedType: null, selectedBuildingId: null });
    const actions: GameAction[] = [
      { type: 'PLACE', building: building('h', 'house', 0, 0) },
      { type: 'SELECT_TYPE', buildingType: 'house' }, { type: 'SELECT_BUILDING', id: null },
      { type: 'BEGIN_MOVE', id: 'h' }, { type: 'MOVE', id: 'h', origin: { x: 1, y: 1 } },
      { type: 'DELETE', id: 'h' }, { type: 'CANCEL' }, { type: 'UNDO' },
      { type: 'SUBMIT' }, { type: 'CONTINUE' },
    ];
    for (const action of actions) {
      expect(store.dispatch(action).valid).toBe(false);
      expect(store.getState()).toBe(before);
    }
    expect(store.getRemainingBudget()).toBe(80);
    expect(store.canUndo()).toBe(false);
  });

  it('开始一次进入编辑，重复开始不清空已有布局或历史', () => {
    const store = createGameStore();
    expect(store.dispatch({ type: 'START' }).valid).toBe(true);
    expect(store.getState().phase).toBe('playing');
    expect(store.dispatch({ type: 'PLACE', building: building('h', 'house', 0, 0) }).valid).toBe(true);
    const before = store.getState();
    expect(store.dispatch({ type: 'START' }).valid).toBe(false);
    expect(store.getState()).toBe(before);
    expect(store.canUndo()).toBe(true);
  });

  it('重置统一回到空的 playing，不重新展示说明阶段', () => {
    const store = createGameStore();
    expect(store.dispatch({ type: 'RESET' }).valid).toBe(true);
    expect(store.getState()).toMatchObject({ phase: 'playing', placed: [], mode: 'select' });
    expect(store.canUndo()).toBe(false);
  });
});
