import { BUILDINGS, GAME_CONFIG, isBuildingType } from '../data/gameConfig';
import { canPlace, remainingBudget, selectionError } from '../domain/validation';
import { evaluateCity } from '../domain/economy';
import type { BuildingInstance, BuildingType, Evaluation, GameAction, GameState, ValidationResult } from '../domain/types';

export interface GameStore {
  getState(): GameState;
  getRemainingBudget(): number;
  getEvaluation(): Evaluation;
  getBuildingCount(type: BuildingType): number;
  getSelectionError(type: BuildingType): string | null;
  canUndo(): boolean;
  subscribe(listener: (state: GameState) => void): () => void;
  dispatch(action: GameAction): ValidationResult;
}

const ok: ValidationResult = { valid: true };
const fail = (error: string): ValidationResult => ({ valid: false, errors: [error] });

function copyBuilding(building: BuildingInstance): BuildingInstance {
  return Object.freeze({ id: building.id, type: building.type, origin: Object.freeze({ ...building.origin }) });
}

function emptyState(phase: GameState['phase']): GameState {
  return Object.freeze({
    gridSize: GAME_CONFIG.gridSize,
    initialBudget: GAME_CONFIG.initialBudget,
    placed: Object.freeze([]),
    selectedType: null,
    selectedBuildingId: null,
    mode: 'select',
    phase,
  });
}

/** 唯一状态与单步快照；不读写 DOM/Three.js，预算从当前布局派生。 */
export function createGameStore(): GameStore {
  let state = emptyState('intro');
  let undoSnapshot: readonly BuildingInstance[] | null = null;
  const listeners = new Set<(state: GameState) => void>();

  function update(patch: Partial<GameState>): void {
    state = Object.freeze({ ...state, ...patch });
    for (const listener of listeners) listener(state);
  }

  function commitLayout(placed: readonly BuildingInstance[], selectedType: BuildingType | null = null): void {
    undoSnapshot = state.placed;
    update({ placed: Object.freeze(placed.map(copyBuilding)), selectedType, selectedBuildingId: null, mode: selectedType ? 'place' : 'select' });
  }

  return {
    getState: () => state,
    getRemainingBudget: () => remainingBudget(state),
    getEvaluation: () => evaluateCity(state),
    getBuildingCount: (type) => state.placed.filter((building) => building.type === type).length,
    getSelectionError: (type) => selectionError(state, type),
    canUndo: () => undoSnapshot !== null,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    dispatch: (action) => {
      if (action.type === 'START') {
        if (state.phase !== 'intro') return fail('规划已经开始。');
        update({ phase: 'playing' });
        return ok;
      }
      if (action.type === 'RESET') {
        undoSnapshot = null;
        update(emptyState('playing'));
        return ok;
      }
      if (action.type === 'CONTINUE') {
        if (state.phase !== 'result') return fail('当前没有待关闭的结果。');
        update({ phase: 'playing' });
        return ok;
      }
      if (state.phase !== 'playing') return fail(state.phase === 'intro' ? '请先开始规划。' : '请先继续调整布局。');

      switch (action.type) {
        case 'SUBMIT': {
          const evaluation = evaluateCity(state);
          if (!evaluation.complete) return { valid: false, errors: evaluation.errors };
          // 完整但未达经济目标的布局也进入结果；提交不写入或清空撤销快照。
          update({ phase: 'result', mode: 'select', selectedType: null, selectedBuildingId: null });
          return ok;
        }
        case 'SELECT_TYPE': {
          if (action.buildingType !== null) {
            if (!isBuildingType(action.buildingType)) return fail('未知的建筑类型。');
            const error = selectionError(state, action.buildingType);
            if (error) return fail(error);
          }
          update({ selectedType: action.buildingType, selectedBuildingId: null, mode: action.buildingType ? 'place' : 'select' });
          return ok;
        }
        case 'SELECT_BUILDING':
        case 'BEGIN_MOVE': {
          if (action.id !== null && !state.placed.some((b) => b.id === action.id)) return fail('找不到该建筑。');
          update({ selectedType: null, selectedBuildingId: action.id, mode: action.type === 'BEGIN_MOVE' ? 'move' : 'select' });
          return ok;
        }
        case 'PLACE': {
          if (state.placed.some((building) => building.id === action.building.id)) return fail('建筑 ID 已存在。');
          const result = canPlace(state, action.building);
          if (!result.valid) return result;
          const placed = [...state.placed, action.building];
          const atLimit = placed.filter((building) => building.type === action.building.type).length >= BUILDINGS[action.building.type].limit;
          commitLayout(placed, atLimit ? null : action.building.type);
          return ok;
        }
        case 'MOVE': {
          const building = state.placed.find((b) => b.id === action.id);
          if (!building) return fail('找不到该建筑。');
          const candidate = { ...building, origin: action.origin };
          const result = canPlace(state, candidate);
          if (!result.valid) return result;
          if (building.origin.x === action.origin.x && building.origin.y === action.origin.y) {
            // 无实际变化只退出移动；保留之前的撤销快照。
            update({ selectedType: null, selectedBuildingId: null, mode: 'select' });
          } else {
            commitLayout(state.placed.map((b) => b.id === action.id ? candidate : b));
          }
          return ok;
        }
        case 'DELETE': {
          if (!state.placed.some((b) => b.id === action.id)) return fail('找不到该建筑。');
          commitLayout(state.placed.filter((b) => b.id !== action.id));
          return ok;
        }
        case 'CANCEL':
          update({ selectedType: null, selectedBuildingId: null, mode: 'select' });
          return ok;
        case 'UNDO': {
          if (!undoSnapshot) return fail('没有可撤销的操作。');
          const placed = undoSnapshot;
          undoSnapshot = null;
          update({ placed, selectedType: null, selectedBuildingId: null, mode: 'select' });
          return ok;
        }
      }
    },
  };
}
