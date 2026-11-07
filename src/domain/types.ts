/** 逻辑坐标独立于 Three.js：x 向东、y 向北。 */
export type Cell = Readonly<{ x: number; y: number }>;

export type BuildingType = 'factory' | 'house' | 'park' | 'shop';

export interface BuildingDefinition {
  readonly name: string;
  readonly width: number;
  readonly depth: number;
  readonly cost: number;
  readonly limit: number;
  readonly color: string;
}

export interface BuildingInstance {
  readonly id: string;
  readonly type: BuildingType;
  readonly origin: Cell;
}

export interface GameState {
  readonly gridSize: 5;
  readonly initialBudget: 80;
  readonly placed: readonly BuildingInstance[];
  readonly selectedType: BuildingType | null;
  readonly selectedBuildingId: string | null;
  readonly mode: 'place' | 'select' | 'move';
  readonly phase: 'intro' | 'playing' | 'result';
}

export type ValidationResult =
  | { readonly valid: true }
  | { readonly valid: false; readonly errors: readonly string[] };

/** S1 仅接入编辑动作；开始页与提交/结果动作在后续阶段添加。 */
export type GameAction =
  | { readonly type: 'SELECT_TYPE'; readonly buildingType: BuildingType | null }
  | { readonly type: 'SELECT_BUILDING'; readonly id: string | null }
  | { readonly type: 'BEGIN_MOVE'; readonly id: string }
  | { readonly type: 'PLACE'; readonly building: BuildingInstance }
  | { readonly type: 'MOVE'; readonly id: string; readonly origin: Cell }
  | { readonly type: 'DELETE'; readonly id: string }
  | { readonly type: 'CANCEL' }
  | { readonly type: 'UNDO' }
  | { readonly type: 'RESET' };
