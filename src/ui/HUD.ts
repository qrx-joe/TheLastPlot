import { BUILDINGS, BUILDING_TYPES, GAME_CONFIG, isBuildingType } from '../data/gameConfig';
import type { GameAction } from '../domain/types';
import type { GameStore } from '../state/gameStore';

/** 编辑所需的最小界面；成本/数量只读取 store 选择器，经济 HUD 在 S2/S4 扩展。 */
export class HUD {
  private readonly events = new AbortController();
  private readonly unsubscribe: () => void;
  private ready = false;

  constructor(private readonly container: HTMLElement, private readonly store: GameStore) {
    container.innerHTML = `
      <div class="budget-line"><span>剩余预算</span><strong id="remaining-budget"></strong></div>
      <h2>选择建筑</h2>
      <p class="hud-hint">${BUILDINGS.factory.limit} 工厂 + ${BUILDINGS.house.limit} 住宅 + 公园或商店</p>
      <div class="building-cards">${BUILDING_TYPES.map((type) => `
        <button type="button" class="building-card" data-building-type="${type}" aria-pressed="false">
          <strong>${BUILDINGS[type].name}</strong>
          <span>${BUILDINGS[type].width}×${BUILDINGS[type].depth} · ${BUILDINGS[type].cost} 预算</span>
          <span class="card-count"></span><span class="card-caption"></span>
        </button>`).join('')}
      </div>
      <p id="selected-building" class="selected-building"></p>
      <div class="edit-actions">
        <button type="button" data-action="move">移动</button>
        <button type="button" data-action="delete">删除</button>
        <button type="button" data-action="cancel">取消</button>
      </div>
      <div class="history-actions">
        <button type="button" data-action="undo">撤销一步</button>
        <button type="button" data-action="reset">重新开始</button>
      </div>
      <p id="placement-feedback" class="placement-feedback" role="status">选择建筑后，点击网格放置。</p>
      <p class="hud-hint">当前建筑使用几何占位模型。</p>`;
    container.addEventListener('click', this.onClick, { signal: this.events.signal });
    this.unsubscribe = store.subscribe(() => this.render());
    this.render();
  }

  public setReady(ready: boolean): void {
    this.ready = ready;
    this.render();
  }

  public showFeedback(message: string, error = false): void {
    const node = this.element<HTMLElement>('#placement-feedback');
    node.textContent = message;
    node.classList.toggle('placement-feedback--error', error);
  }

  public dispose(): void {
    this.events.abort();
    this.unsubscribe();
    this.container.replaceChildren();
  }

  private element<T extends HTMLElement>(selector: string): T {
    const node = this.container.querySelector<T>(selector);
    if (!node) throw new Error(`操作界面缺少节点：${selector}`);
    return node;
  }

  private render(): void {
    const state = this.store.getState();
    this.element('#remaining-budget').textContent = `${this.store.getRemainingBudget()} / ${GAME_CONFIG.initialBudget}`;
    for (const type of BUILDING_TYPES) {
      const card = this.element<HTMLButtonElement>(`[data-building-type="${type}"]`);
      const reason = this.store.getSelectionError(type);
      card.disabled = !this.ready || reason !== null;
      card.setAttribute('aria-pressed', String(state.selectedType === type));
      card.title = reason ?? `选择${BUILDINGS[type].name}`;
      const count = card.querySelector('.card-count');
      const caption = card.querySelector('.card-caption');
      if (count) count.textContent = `${this.store.getBuildingCount(type)} / ${BUILDINGS[type].limit}`;
      if (caption) caption.textContent = reason ?? (state.selectedType === type ? '点击地块放置' : '');
    }
    const selected = state.placed.find((building) => building.id === state.selectedBuildingId);
    this.element('#selected-building').textContent = selected
      ? `${state.mode === 'move' ? '移动中' : '已选中'}：${BUILDINGS[selected.type].name} (${selected.origin.x},${selected.origin.y})`
      : state.selectedType ? `待放置：${BUILDINGS[state.selectedType].name}` : '点击已有建筑可选中';
    this.element<HTMLButtonElement>('[data-action="move"]').disabled = !this.ready || !selected || state.mode === 'move';
    this.element<HTMLButtonElement>('[data-action="delete"]').disabled = !this.ready || !selected || state.mode === 'move';
    this.element<HTMLButtonElement>('[data-action="cancel"]').disabled = !this.ready || (!selected && !state.selectedType);
    this.element<HTMLButtonElement>('[data-action="undo"]').disabled = !this.ready || !this.store.canUndo();
    this.element<HTMLButtonElement>('[data-action="reset"]').disabled = !this.ready;
  }

  private readonly onClick = (event: MouseEvent): void => {
    if (!this.ready || !(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>('button');
    if (!button || button.disabled) return;
    const type = button.dataset['buildingType'];
    if (isBuildingType(type)) {
      this.dispatch({ type: 'SELECT_TYPE', buildingType: type }, `选择了${BUILDINGS[type].name}，点击西南角原点格放置。`);
      return;
    }
    const selectedId = this.store.getState().selectedBuildingId;
    switch (button.dataset['action']) {
      case 'move':
        if (selectedId) this.dispatch({ type: 'BEGIN_MOVE', id: selectedId }, '点击新的西南角原点格，或按 Esc 取消移动。');
        break;
      case 'delete':
        if (selectedId) this.dispatch({ type: 'DELETE', id: selectedId }, '已删除建筑并退回预算，可撤销。');
        break;
      case 'cancel': this.dispatch({ type: 'CANCEL' }, '已取消当前操作，布局保持不变。'); break;
      case 'undo': this.dispatch({ type: 'UNDO' }, '已撤销最近一次布局变更。'); break;
      case 'reset': this.dispatch({ type: 'RESET' }, `已重新开始，预算恢复 ${GAME_CONFIG.initialBudget}，撤销记录已清空。`); break;
    }
  };

  private dispatch(action: GameAction, success: string): void {
    const result = this.store.dispatch(action);
    this.showFeedback(result.valid ? success : result.errors.join(' '), !result.valid);
  }
}
