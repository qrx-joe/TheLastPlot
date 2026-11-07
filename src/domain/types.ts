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
  readonly net: number;
  readonly satisfactionBonus: number;
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

export interface HouseEvaluation {
  readonly id: string;
  readonly satisfaction: number;
  readonly pollutionPenalty: number;
  readonly facilityBonus: number;
}

export interface Evaluation {
  readonly spending: number;
  readonly remainingBudget: number;
  readonly monthlyNet: number; // 沿用技术规范字段名，表示游戏经营期，不代表真实月收益。
  readonly averageSatisfaction: number | null;
  readonly score: number;
  readonly complete: boolean;
  readonly won: boolean;
  readonly errors: readonly string[];
  readonly houses: readonly HouseEvaluation[];
  readonly title: string | null;
  readonly explanation: string;
}

/** 玩家阶段由 store 管理，说明弹窗不持有另一份游戏状态。 */
export type GameAction =
  | { readonly type: 'START' }
  | { readonly type: 'SELECT_TYPE'; readonly buildingType: BuildingType | null }
  | { readonly type: 'SELECT_BUILDING'; readonly id: string | null }
  | { readonly type: 'BEGIN_MOVE'; readonly id: string }
  | { readonly type: 'PLACE'; readonly building: BuildingInstance }
  | { readonly type: 'MOVE'; readonly id: string; readonly origin: Cell }
  | { readonly type: 'DELETE'; readonly id: string }
  | { readonly type: 'CANCEL' }
  | { readonly type: 'UNDO' }
  | { readonly type: 'RESET' }
  | { readonly type: 'SUBMIT' }
  | { readonly type: 'CONTINUE' };
