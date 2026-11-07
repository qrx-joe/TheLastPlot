import { GAME_CONFIG } from '../data/gameConfig';
import type { Cell } from '../domain/types';

/** 把格子中心映射到 X/Z 平面；后续输入转换须复用这里的单位与偏移约定。 */
export function cellToWorld(cell: Cell): Readonly<{ x: number; z: number }> {
  const center = (GAME_CONFIG.gridSize - 1) / 2;

  return {
    x: (cell.x - center) * GAME_CONFIG.cellSize,
    z: -(cell.y - center) * GAME_CONFIG.cellSize,
  };
}
