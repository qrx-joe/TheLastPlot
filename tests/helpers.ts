import type { BuildingInstance, BuildingType, GameState } from '../src/domain/types';
import { createGameStore } from '../src/state/gameStore';

export function building(id: string, type: BuildingType, x: number, y: number): BuildingInstance {
  return { id, type, origin: { x, y } };
}

export function stateWith(...placed: BuildingInstance[]): GameState {
  return { ...startedStore().getState(), placed };
}

export function startedStore() {
  const store = createGameStore();
  store.dispatch({ type: 'START' });
  return store;
}
