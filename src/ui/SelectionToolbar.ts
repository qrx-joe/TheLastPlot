import type { GameAction } from '../domain/types';
import type { GameStore } from '../state/gameStore';
import type { ScreenPoint } from '../scene/projection';

type Feedback = (message: string, error?: boolean) => void;

/** 画布内浮动操作条：跟随选中建筑显示移动/删除/取消，视线不必离开画布；派发与侧栏相同的动作。 */
export class SelectionToolbar {
  private readonly events = new AbortController();
  private readonly unsubscribe: () => void;
  private readonly unsubscribeCamera: () => void;
  private readonly root: HTMLDivElement;
  private ready = false;

  constructor(
    container: HTMLElement,
    private readonly store: GameStore,
    private readonly getAnchor: () => ScreenPoint | null,
    subscribeCamera: (listener: () => void) => () => void,
    private readonly feedback: Feedback,
  ) {
    this.root = document.createElement('div');
    this.root.className = 'selection-toolbar';
    this.root.hidden = true;
    this.root.innerHTML = `<button type="button" data-action="move">移动</button>
      <button type="button" data-action="delete">删除</button>
      <button type="button" data-action="cancel">取消</button>`;
    this.root.addEventListener('click', this.onClick, { signal: this.events.signal });
    container.append(this.root);
    this.unsubscribe = store.subscribe(() => this.render());
    this.unsubscribeCamera = subscribeCamera(() => this.render());
    window.addEventListener('resize', () => this.render(), { signal: this.events.signal });
    this.render();
  }

  public setReady(ready: boolean): void {
    this.ready = ready;
    this.render();
  }

  public dispose(): void {
    this.events.abort();
    this.unsubscribe();
    this.unsubscribeCamera();
    this.root.remove();
  }

  private render(): void {
    const state = this.store.getState();
    const visible = this.ready && state.phase === 'playing' && state.mode !== 'move' && state.selectedBuildingId !== null;
    this.root.hidden = !visible;
    if (!visible) return;
    const anchor = this.getAnchor();
    if (!anchor) {
      this.root.hidden = true;
      return;
    }
    this.root.style.left = `${anchor.x}px`;
    this.root.style.top = `${anchor.y}px`;
  }

  private readonly onClick = (event: MouseEvent): void => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>('button');
    if (!button) return;
    const id = this.store.getState().selectedBuildingId;
    if (!id) return;
    switch (button.dataset['action']) {
      case 'move':
        this.dispatch({ type: 'BEGIN_MOVE', id }, '点击新的西南角原点格，或按 Esc 取消移动。');
        break;
      case 'delete':
        this.dispatch({ type: 'DELETE', id }, '已删除建筑并退回预算，可撤销。');
        break;
      case 'cancel':
        this.dispatch({ type: 'CANCEL' }, '已取消当前操作，布局保持不变。');
        break;
    }
  };

  private dispatch(action: GameAction, success: string): void {
    const result = this.store.dispatch(action);
    this.feedback(result.valid ? success : result.errors.join(' '), !result.valid);
  }
}
