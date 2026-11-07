import { BUILDINGS, ECONOMY, GAME_CONFIG } from '../data/gameConfig';
import type { GameStore } from '../state/gameStore';

/** 首次委托与随时查阅的说明；只派发 START，不改布局或撤销快照。 */
export class MissionDialog {
  private readonly dialog = document.createElement('dialog');
  private readonly events = new AbortController();
  private readonly unsubscribe: () => void;
  private helpOpen = false;

  constructor(private readonly trigger: HTMLButtonElement, private readonly store: GameStore) {
    this.dialog.id = 'mission-dialog';
    this.dialog.setAttribute('aria-labelledby', 'mission-title');
    this.dialog.innerHTML = `
      <p class="eyebrow">一份小镇委托 · 约 2–4 分钟</p>
      <h2 id="mission-title">把最后一块地，留给怎样的生活？</h2>
      <p class="mission-story">小镇只剩这片 ${GAME_CONFIG.gridSize}×${GAME_CONFIG.gridSize} 的土地。让工厂带来收入，也给居民留一个住得舒心的地方。</p>
      <div class="mission-goals"><div><strong>${GAME_CONFIG.initialBudget}</strong><span>建造预算</span></div>
        <div><strong>≥ ${ECONOMY.targets.satisfaction}</strong><span>平均满意度</span></div>
        <div><strong>≥ ${ECONOMY.targets.net}</strong><span>当期净收益</span></div></div>
      <p><strong>建 ${BUILDINGS.factory.limit} 座工厂、${BUILDINGS.house.limit} 栋住宅，再从公园与商店中选一个。</strong></p>
      <ul class="mission-rules">
        <li><strong>看风向：</strong>风从西吹向东，橙色斜线内的住宅满意度 −${ECONOMY.pollution.penalty}；指北与风向箭头跟随地块。</li>
        <li><strong>选策略：</strong>公园让附近住宅 +${BUILDINGS.park.satisfactionBonus}，商店 +${BUILDINGS.shop.satisfactionBonus} 且贡献收益。附近指占地间最短横竖距离 ≤ ${ECONOMY.facilityRange} 格，不算斜线。</li>
        <li><strong>放心调整：</strong>删除全额退款；移动不收费；可撤销最近一步。更换设施需先删除原设施。</li>
      </ul>
      <p class="mission-controls">先选建筑，再点击地块；多格建筑以西南角为原点。点击已有建筑可移动或删除。拖动旋转，滚轮缩放，Esc 取消。绿色预览可放，红色预览会说明原因。</p>
      <p id="mission-status" class="hud-hint" role="status">正在准备三维地块…</p>
      <button type="button" id="start-planning" class="primary-action" disabled>开始规划</button>
      <button type="button" id="close-mission" hidden>返回规划</button>`;
    document.body.append(this.dialog);
    trigger.addEventListener('click', () => {
      if (store.getState().phase !== 'playing') return;
      this.helpOpen = true;
      this.render();
    }, { signal: this.events.signal });
    this.dialog.querySelector('#start-planning')?.addEventListener('click', () => {
      if (store.dispatch({ type: 'START' }).valid) {
        document.querySelector<HTMLButtonElement>('[data-building-type="factory"]')?.focus({ preventScroll: true });
      }
    }, { signal: this.events.signal });
    this.dialog.querySelector('#close-mission')?.addEventListener('click', () => this.closeHelp(), { signal: this.events.signal });
    // 说明中的 Esc 不应传到场景，误取消用户正在移动的建筑。
    this.dialog.addEventListener('keydown', (event) => {
      event.stopPropagation();
      if (event.key === 'Escape') {
        event.preventDefault();
        if (this.helpOpen) this.closeHelp();
      }
    }, { signal: this.events.signal });
    this.dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      if (this.helpOpen) this.closeHelp();
    }, { signal: this.events.signal });
    this.unsubscribe = store.subscribe(() => this.render());
    this.render();
  }

  public setReady(ready: boolean, error?: string): void {
    this.dialog.querySelector<HTMLButtonElement>('#start-planning')!.disabled = !ready;
    this.dialog.querySelector('#mission-status')!.textContent = error ?? (ready ? '地块已就绪。模型加载期间也可使用占位建筑开始。' : '正在准备三维地块…');
  }

  public dispose(): void {
    this.events.abort();
    this.unsubscribe();
    if (this.dialog.open) this.dialog.close();
    this.dialog.remove();
  }

  private closeHelp(): void {
    this.helpOpen = false;
    this.render();
    this.trigger.focus();
  }

  private render(): void {
    const phase = this.store.getState().phase;
    if (phase !== 'playing') this.helpOpen = false;
    const intro = phase === 'intro';
    this.trigger.disabled = phase !== 'playing';
    this.dialog.querySelector<HTMLElement>('#start-planning')!.hidden = !intro;
    this.dialog.querySelector<HTMLElement>('#close-mission')!.hidden = intro;
    if (intro || this.helpOpen) {
      if (!this.dialog.open) this.dialog.showModal();
    } else if (this.dialog.open) this.dialog.close();
  }
}
