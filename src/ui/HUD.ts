import { BUILDINGS, BUILDING_TYPES, ECONOMY, GAME_CONFIG, isBuildingType } from '../data/gameConfig';
import type { GameAction } from '../domain/types';
import type { GameStore } from '../state/gameStore';
import type { AssetStatus } from '../scene/AssetLoader';

/** 读取 store 的派生结果；不在界面重算收益、污染、满意度或评分。 */
export class HUD {
  private readonly events = new AbortController();
  private readonly unsubscribe: () => void;
  private ready = false;

  constructor(private readonly container: HTMLElement, private readonly store: GameStore) {
    container.innerHTML = `
      <div class="budget-line"><span>剩余预算</span><strong id="remaining-budget"></strong></div>
      <div class="city-metrics">
        <div><span>当期净收益</span><strong id="city-net"></strong></div>
        <div><span>平均满意度</span><strong id="city-satisfaction"></strong></div>
      </div>
      <p class="hud-hint">目标：满意度 ≥ ${ECONOMY.targets.satisfaction}，净收益 ≥ ${ECONOMY.targets.net}</p>
      <p class="pollution-legend"><span aria-hidden="true">▧</span> 橙色斜线：下风向住宅 −${ECONOMY.pollution.penalty}<br>西风吹向东；工厂预览显示拟放位置。</p>
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
      <p id="selected-house-feedback" class="hud-hint" hidden></p>
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
      <button type="button" data-action="submit" class="submit-planning">提交规划</button>
      <p id="planning-requirements" class="hud-hint"></p>
      <p id="asset-status" class="hud-hint" role="status"></p>`;
    const dialog = document.createElement('dialog');
    dialog.id = 'planning-result';
    dialog.setAttribute('aria-labelledby', 'planning-result-title');
    dialog.innerHTML = `<h2 id="planning-result-title"></h2>
      <p id="planning-result-summary"></p><p id="planning-result-score"></p>
      <ul id="planning-result-errors"></ul><p id="planning-result-explanation"></p>
      <div class="result-actions"><button type="button" data-action="continue" autofocus>继续调整</button>
      <button type="button" data-action="reset">重新开始</button></div>`;
    container.append(dialog);
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      this.dispatch({ type: 'CONTINUE' }, '已返回布局，建筑与撤销记录保持不变。');
    }, { signal: this.events.signal });
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

  public setAssetStatuses(statuses: readonly AssetStatus[]): void {
    this.element('#asset-status').textContent = statuses.map(({ type, phase }) => {
      const label = phase === 'ready' ? 'Lux3D 已加载'
        : phase === 'failed' ? '加载失败，使用占位模型'
          : phase === 'loading' || phase === 'pending' ? '加载中，暂用占位模型' : '使用占位模型';
      return `${BUILDINGS[type].name}：${label}`;
    }).join('；');
  }

  public dispose(): void {
    this.events.abort();
    this.unsubscribe();
    const dialog = this.element<HTMLDialogElement>('#planning-result');
    if (dialog.open) dialog.close();
    this.container.replaceChildren();
  }

  private element<T extends HTMLElement>(selector: string): T {
    const node = this.container.querySelector<T>(selector);
    if (!node) throw new Error(`操作界面缺少节点：${selector}`);
    return node;
  }

  private render(): void {
    const state = this.store.getState();
    const evaluation = this.store.getEvaluation();
    const editing = this.ready && state.phase === 'playing';
    this.element('#remaining-budget').textContent = `${this.store.getRemainingBudget()} / ${GAME_CONFIG.initialBudget}`;
    this.element('#city-net').textContent = String(evaluation.monthlyNet);
    this.element('#city-satisfaction').textContent = evaluation.averageSatisfaction === null ? '—' : evaluation.averageSatisfaction.toFixed(1);
    for (const type of BUILDING_TYPES) {
      const card = this.element<HTMLButtonElement>(`[data-building-type="${type}"]`);
      const reason = this.store.getSelectionError(type);
      card.disabled = !editing || reason !== null;
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
    const house = evaluation.houses.find((item) => item.id === selected?.id);
    const houseFeedback = this.element('#selected-house-feedback');
    houseFeedback.hidden = !house;
    houseFeedback.textContent = house ? `满意度 ${house.satisfaction}：基础 ${ECONOMY.baseSatisfaction} − 下风向 ${house.pollutionPenalty} + 设施 ${house.facilityBonus}` : '';
    this.element<HTMLButtonElement>('[data-action="move"]').disabled = !editing || !selected || state.mode === 'move';
    this.element<HTMLButtonElement>('[data-action="delete"]').disabled = !editing || !selected || state.mode === 'move';
    this.element<HTMLButtonElement>('[data-action="cancel"]').disabled = !editing || (!selected && !state.selectedType);
    this.element<HTMLButtonElement>('[data-action="undo"]').disabled = !editing || !this.store.canUndo();
    this.element<HTMLButtonElement>('[data-action="reset"]').disabled = !this.ready;
    this.element<HTMLButtonElement>('[data-action="submit"]').disabled = !editing || !evaluation.complete || state.mode === 'move';
    this.element('#planning-requirements').textContent = evaluation.complete
      ? state.mode === 'move' ? '先确认或取消移动，再提交。' : '布局齐全，可以提交评估。'
      : evaluation.errors.join(' ');
    const dialog = this.element<HTMLDialogElement>('#planning-result');
    if (state.phase === 'result') {
      this.element('#planning-result-title').textContent = evaluation.won ? '规划达标' : '还需调整';
      this.element('#planning-result-summary').textContent = `平均满意度 ${evaluation.averageSatisfaction?.toFixed(1)} · 当期净收益 ${evaluation.monthlyNet} · 花费 ${evaluation.spending} · 剩余 ${evaluation.remainingBudget}`;
      this.element('#planning-result-score').textContent = `综合评分 ${evaluation.score} / ${ECONOMY.score.maximum} · ${evaluation.title ?? '待调整'}`;
      this.element('#planning-result-errors').replaceChildren(...evaluation.errors.map((error) => {
        const item = document.createElement('li');
        item.textContent = error;
        return item;
      }));
      this.element('#planning-result-explanation').textContent = evaluation.explanation;
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) dialog.close();
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
      case 'submit': this.dispatch({ type: 'SUBMIT' }, '已按当前布局完成评估。'); break;
      case 'continue': this.dispatch({ type: 'CONTINUE' }, '已返回布局，建筑与撤销记录保持不变。'); break;
    }
  };

  private dispatch(action: GameAction, success: string): void {
    const result = this.store.dispatch(action);
    this.showFeedback(result.valid ? success : result.errors.join(' '), !result.valid);
  }
}
