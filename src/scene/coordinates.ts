import { GAME_CONFIG } from '../data/gameConfig';
import type { Cell } from '../domain/types';

/** 地面显示高度；拾取面与占位建筑共用，不参与经济或占地计算。 */
export const GROUND_Y = 0.06;

/** 把格子中心映射到 X/Z 平面；后续输入转换须复用这里的单位与偏移约定。 */
export function cellToWorld(cell: Cell): Readonly<{ x: number; z: number }> {
  const center = (GAME_CONFIG.gridSize - 1) / 2;

  return {
    x: (cell.x - center) * GAME_CONFIG.cellSize,
    z: -(cell.y - center) * GAME_CONFIG.cellSize,
  };
}

/** 与 cellToWorld 共用中心约定；点击落在格子范围内即可映射，不受相机朝向影响。 */
export function worldToCell(world: Readonly<{ x: number; z: number }>): Cell {
  const half = GAME_CONFIG.gridSize / 2;
  return {
    x: Math.floor(world.x / GAME_CONFIG.cellSize + half),
    y: Math.floor(-world.z / GAME_CONFIG.cellSize + half),
  };
}
