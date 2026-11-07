import { Raycaster, Vector2 } from 'three';
import { BUILDINGS } from '../data/gameConfig';
import { canPlace } from '../domain/validation';
import type { BuildingInstance, Cell, GameAction } from '../domain/types';
import type { GameStore } from '../state/gameStore';
import { PointerGesture } from './pointerGesture';
import { worldToCell } from './coordinates';
import type { SceneManager } from './SceneManager';
import type { ScenePresenter } from './ScenePresenter';

type Point = Readonly<{ x: number; y: number }>;
type Feedback = (message: string, error?: boolean) => void;

/** 输入只派发动作；预览读同一纯校验函数，不在 Three.js 中复制规则。 */
export class PlacementController {
  private readonly events = new AbortController();
  private readonly raycaster = new Raycaster();
  private readonly pointer = new Vector2();
  private readonly unsubscribe: () => void;
  private readonly unsubscribeCamera: () => void;
  private gesture: PointerGesture | null = null;
  private lastPoint: Point | null = null;
  private previewId = crypto.randomUUID();

  constructor(private readonly manager: SceneManager, private readonly presenter: ScenePresenter, private readonly store: GameStore, private readonly feedback: Feedback) {
    const options = { signal: this.events.signal };
    manager.canvas.addEventListener('pointerdown', this.onDown, options);
    manager.canvas.addEventListener('pointermove', this.onMove, options);
    manager.canvas.addEventListener('pointerup', this.onUp, options);
    manager.canvas.addEventListener('pointercancel', this.onCancel, options);
    manager.canvas.addEventListener('pointerleave', this.onLeave, options);
    window.addEventListener('blur', this.onCancel, options);
    window.addEventListener('keydown', this.onKey, options);
    this.unsubscribe = store.subscribe(() => this.refreshPreview());
    this.unsubscribeCamera = manager.onCameraChange(() => this.refreshPreview());
  }

  public dispose(): void {
    this.events.abort();
    this.unsubscribe();
    this.unsubscribeCamera();
    this.presenter.showPreview(null);
  }

  private readonly onDown = (event: PointerEvent): void => {
    // 第二指或非左键会取消点击候选，避免缩放/多指手势落成建筑。
    this.gesture = event.isPrimary && event.button === 0 ? new PointerGesture(event.pointerId, event.clientX, event.clientY) : null;
  };

  private readonly onMove = (event: PointerEvent): void => {
    this.lastPoint = { x: event.clientX, y: event.clientY };
    this.gesture?.update(event.clientX, event.clientY);
    this.refreshPreview();
  };

  private readonly onUp = (event: PointerEvent): void => {
    const gesture = this.gesture;
    this.gesture = null;
    if (!gesture || gesture.pointerId !== event.pointerId || event.button !== 0) return;
    gesture.update(event.clientX, event.clientY);
    this.lastPoint = { x: event.clientX, y: event.clientY };
    if (!gesture.isClick()) {
      this.refreshPreview();
      return;
    }
    if (!this.prepareRay(this.lastPoint)) return;
    const state = this.store.getState();
    if (state.phase !== 'playing') return;
    if (state.mode !== 'move') {
      const hit = this.raycaster.intersectObjects([...this.presenter.getSelectionProxies()], false)[0];
      const id: unknown = hit?.object.userData['buildingId'];
      if (typeof id === 'string') {
        this.dispatch({ type: 'SELECT_BUILDING', id }, '已选中建筑，可移动或删除。');
        return;
      }
    }
    const cell = this.pickCell();
    if (!cell) {
      if (state.mode === 'move' || state.selectedType) this.feedback('请选择地块内的格子。', true);
      else this.dispatch({ type: 'SELECT_BUILDING', id: null }, '选择建筑后，点击网格放置。');
      return;
    }
    if (state.mode === 'move' && state.selectedBuildingId) {
      this.dispatch({ type: 'MOVE', id: state.selectedBuildingId, origin: cell }, `已移动到 (${cell.x},${cell.y})。`);
    } else if (state.selectedType) {
      const building: BuildingInstance = { id: this.previewId, type: state.selectedType, origin: cell };
      // 在订阅者刷新预览之前换新 ID，避免把下一栋误当成刚放置建筑的 MOVE。
      this.previewId = crypto.randomUUID();
      this.dispatch({ type: 'PLACE', building }, `已放置${BUILDINGS[building.type].name} (${cell.x},${cell.y})。`);
    } else {
      this.dispatch({ type: 'SELECT_BUILDING', id: null }, '请先选择要放置的建筑。');
    }
  };

  private readonly onLeave = (): void => {
    this.lastPoint = null;
    this.presenter.showPreview(null);
  };

  private readonly onCancel = (): void => {
    this.gesture = null;
    this.onLeave();
  };

  private readonly onKey = (event: KeyboardEvent): void => {
    if (this.store.getState().phase !== 'playing') return;
    if (event.key === 'Escape') {
      this.gesture = null;
      this.dispatch({ type: 'CANCEL' }, '已取消当前操作，布局保持不变。');
    }
  };

  private dispatch(action: GameAction, success: string): boolean {
    const result = this.store.dispatch(action);
    this.feedback(result.valid ? success : result.errors.join(' '), !result.valid);
    return result.valid;
  }

  private refreshPreview(): void {
    const state = this.store.getState();
    this.manager.canvas.style.cursor = state.selectedType || state.mode === 'move' ? 'crosshair' : 'grab';
    if (state.phase !== 'playing' || !this.lastPoint || (this.gesture && !this.gesture.isClick()) || !this.prepareRay(this.lastPoint)) {
      this.presenter.showPreview(null);
      return;
    }
    const cell = this.pickCell();
    const moving = state.mode === 'move' ? state.placed.find((building) => building.id === state.selectedBuildingId) : undefined;
    const type = moving?.type ?? state.selectedType;
    const candidate: BuildingInstance | null = cell && type
      ? { id: moving?.id ?? this.previewId, type, origin: cell }
      : null;
    if (!candidate) {
      this.presenter.showPreview(null);
      return;
    }
    const result = canPlace(state, candidate);
    this.presenter.showPreview(candidate, result);
    this.feedback(`${BUILDINGS[candidate.type].name} (${candidate.origin.x},${candidate.origin.y})：${result.valid ? '可放置' : result.errors.join(' ')}`, !result.valid);
  }

  private prepareRay(point: Point): boolean {
    const rect = this.manager.canvas.getBoundingClientRect();
    if (point.x < rect.left || point.y < rect.top || point.x > rect.right || point.y > rect.bottom) return false;
    this.pointer.set((point.x - rect.left) / rect.width * 2 - 1, -(point.y - rect.top) / rect.height * 2 + 1);
    this.manager.camera.updateMatrixWorld();
    this.raycaster.setFromCamera(this.pointer, this.manager.camera);
    return true;
  }

  private pickCell(): Cell | null {
    const hit = this.raycaster.intersectObject(this.manager.ground, false)[0];
    return hit ? worldToCell(hit.point) : null;
  }
}
