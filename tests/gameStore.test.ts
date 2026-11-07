import { describe, expect, it, vi } from 'vitest';
import { building, startedStore } from './helpers';

describe('编辑状态与预算', () => {
  it.each([['park', 3], ['shop', 6]] as const)('%s 完整配置保留正确预算', (facility, remaining) => {
    const store = startedStore();
    for (const candidate of [building('f', 'factory', 0, 0), building('h1', 'house', 0, 4), building('h2', 'house', 4, 4), building('p', facility, 1, 2)]) {
      expect(store.dispatch({ type: 'PLACE', building: candidate }).valid).toBe(true);
    }
    expect(store.getRemainingBudget()).toBe(remaining);
  });

  it('重叠、越界、重复 ID 都不改状态、预算或已有快照', () => {
    const store = startedStore();
    store.dispatch({ type: 'PLACE', building: building('f', 'factory', 0, 0) });
    const before = store.getState();
    for (const candidate of [building('h', 'house', 1, 1), building('p', 'park', 4, 4), building('f', 'house', 4, 4)]) {
      expect(store.dispatch({ type: 'PLACE', building: candidate }).valid).toBe(false);
      expect(store.getState()).toBe(before);
      expect(store.getRemainingBudget()).toBe(45);
    }
    expect(store.dispatch({ type: 'UNDO' }).valid).toBe(true);
    expect(store.getState().placed).toEqual([]);
  });

  it('移动不重复扣费，保留 ID、类型，撤销恢复原点', () => {
    const store = startedStore();
    store.dispatch({ type: 'PLACE', building: building('f', 'factory', 0, 0) });
    store.dispatch({ type: 'BEGIN_MOVE', id: 'f' });
    expect(store.dispatch({ type: 'MOVE', id: 'f', origin: { x: 1, y: 0 } }).valid).toBe(true);
    expect(store.getState().placed).toEqual([building('f', 'factory', 1, 0)]);
    expect(store.getRemainingBudget()).toBe(45);
    store.dispatch({ type: 'UNDO' });
    expect(store.getState().placed).toEqual([building('f', 'factory', 0, 0)]);
    expect(store.getRemainingBudget()).toBe(45);
  });

  it('非法移动与取消不消耗原撤销记录', () => {
    const store = startedStore();
    store.dispatch({ type: 'PLACE', building: building('f', 'factory', 1, 1) });
    store.dispatch({ type: 'PLACE', building: building('h', 'house', 0, 0) });
    store.dispatch({ type: 'BEGIN_MOVE', id: 'h' });
    const before = store.getState();
    expect(store.dispatch({ type: 'MOVE', id: 'h', origin: { x: 1, y: 1 } }).valid).toBe(false);
    expect(store.getState()).toBe(before);
    store.dispatch({ type: 'CANCEL' });
    expect(store.getState().placed).toEqual(before.placed);
    store.dispatch({ type: 'UNDO' });
    expect(store.getState().placed).toEqual([building('f', 'factory', 1, 1)]);
    expect(store.getRemainingBudget()).toBe(45);
  });

  it('移到原位只退出移动，撤销仍指向前一次实际变更', () => {
    const store = startedStore();
    store.dispatch({ type: 'PLACE', building: building('h', 'house', 1, 1) });
    store.dispatch({ type: 'BEGIN_MOVE', id: 'h' });
    store.dispatch({ type: 'MOVE', id: 'h', origin: { x: 1, y: 1 } });
    expect(store.getState().mode).toBe('select');
    store.dispatch({ type: 'UNDO' });
    expect(store.getState().placed).toEqual([]);
  });

  it('删除退款，撤销按原 ID 与原点恢复建筑和费用', () => {
    const store = startedStore();
    store.dispatch({ type: 'PLACE', building: building('p', 'park', 2, 2) });
    store.dispatch({ type: 'DELETE', id: 'p' });
    expect(store.getRemainingBudget()).toBe(80);
    store.dispatch({ type: 'UNDO' });
    expect(store.getState().placed).toEqual([building('p', 'park', 2, 2)]);
    expect(store.getRemainingBudget()).toBe(62);
  });

  it('设施选择不自动替换，删除后才可切换', () => {
    const store = startedStore();
    store.dispatch({ type: 'PLACE', building: building('p', 'park', 0, 0) });
    const before = store.getState();
    expect(store.dispatch({ type: 'SELECT_TYPE', buildingType: 'shop' }).valid).toBe(false);
    expect(store.getState()).toBe(before);
    expect(store.getRemainingBudget()).toBe(62);
    store.dispatch({ type: 'DELETE', id: 'p' });
    expect(store.dispatch({ type: 'SELECT_TYPE', buildingType: 'shop' }).valid).toBe(true);
    expect(store.dispatch({ type: 'PLACE', building: building('s', 'shop', 0, 0) }).valid).toBe(true);
    expect(store.getRemainingBudget()).toBe(65);
  });

  it('只支持最近一步，没有重做或第二次撤销', () => {
    const store = startedStore();
    store.dispatch({ type: 'PLACE', building: building('h1', 'house', 0, 0) });
    store.dispatch({ type: 'PLACE', building: building('h2', 'house', 1, 0) });
    store.dispatch({ type: 'UNDO' });
    expect(store.getState().placed).toEqual([building('h1', 'house', 0, 0)]);
    expect(store.canUndo()).toBe(false);
    const before = store.getState();
    expect(store.dispatch({ type: 'UNDO' }).valid).toBe(false);
    expect(store.getState()).toBe(before);
  });

  it('重新开始清空选择、移动、建筑和快照', () => {
    const store = startedStore();
    store.dispatch({ type: 'PLACE', building: building('h', 'house', 0, 0) });
    store.dispatch({ type: 'BEGIN_MOVE', id: 'h' });
    store.dispatch({ type: 'RESET' });
    expect(store.getState()).toMatchObject({ placed: [], selectedType: null, selectedBuildingId: null, mode: 'select', phase: 'playing' });
    expect(store.getRemainingBudget()).toBe(80);
    expect(store.canUndo()).toBe(false);
  });

  it('选中、选择类型和取消不改变撤销快照', () => {
    const store = startedStore();
    store.dispatch({ type: 'PLACE', building: building('h', 'house', 0, 0) });
    store.dispatch({ type: 'SELECT_BUILDING', id: 'h' });
    store.dispatch({ type: 'SELECT_TYPE', buildingType: 'factory' });
    store.dispatch({ type: 'CANCEL' });
    store.dispatch({ type: 'UNDO' });
    expect(store.getState().placed).toEqual([]);
  });

  it('外部输入后续修改不会污染当前布局或撤销快照', () => {
    const store = startedStore();
    const input = { id: 'h', type: 'house' as const, origin: { x: 0, y: 0 } };
    store.dispatch({ type: 'PLACE', building: input });
    input.origin.x = 4;
    expect(store.getState().placed[0]?.origin).toEqual({ x: 0, y: 0 });
    store.dispatch({ type: 'DELETE', id: 'h' });
    store.dispatch({ type: 'UNDO' });
    expect(store.getState().placed[0]?.origin).toEqual({ x: 0, y: 0 });
    expect(Object.isFrozen(store.getState().placed[0]?.origin)).toBe(true);
  });

  it('未知建筑操作不通知订阅者，退订后不再接收更新', () => {
    const store = startedStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    expect(store.dispatch({ type: 'DELETE', id: 'missing' }).valid).toBe(false);
    expect(listener).not.toHaveBeenCalled();
    store.dispatch({ type: 'SELECT_TYPE', buildingType: 'house' });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    store.dispatch({ type: 'CANCEL' });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
