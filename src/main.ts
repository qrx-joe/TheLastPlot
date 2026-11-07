import { GAME_CONFIG } from './data/gameConfig';
import { SceneManager } from './scene/SceneManager';
import { ScenePresenter } from './scene/ScenePresenter';
import { PlacementController } from './scene/PlacementController';
import { AssetLoader } from './scene/AssetLoader';
import { createGameStore } from './state/gameStore';
import { HUD } from './ui/HUD';
import { MissionDialog } from './ui/MissionDialog';
import './styles/main.css';

const container = document.querySelector<HTMLElement>('#scene');
const status = document.querySelector<HTMLElement>('#scene-status');
const resetButton = document.querySelector<HTMLButtonElement>('#reset-camera');
const hudContainer = document.querySelector<HTMLElement>('#hud');
const missionButton = document.querySelector<HTMLButtonElement>('#show-mission');

if (!container || !status || !resetButton || !hudContainer || !missionButton) {
  throw new Error('地块页面缺少必要的挂载节点。');
}

const listeners = new AbortController();
const store = createGameStore();
const hud = new HUD(hudContainer, store);
const mission = new MissionDialog(missionButton, store);
const assets = new AssetLoader();
const unsubscribeAssets = assets.subscribe(() => hud.setAssetStatuses(assets.getStatuses()));
hud.setAssetStatuses(assets.getStatuses());
let scene: SceneManager | undefined;
let presenter: ScenePresenter | undefined;
let placement: PlacementController | undefined;

try {
  scene = new SceneManager(container, () => {
    status.textContent = `${GAME_CONFIG.gridSize}×${GAME_CONFIG.gridSize} 地块已就绪`;
    resetButton.disabled = false;
    hud.setReady(true);
    mission.setReady(true);
  });
  presenter = new ScenePresenter(scene, store, assets);
  placement = new PlacementController(scene, presenter, store, (message, error) => hud.showFeedback(message, error));
  resetButton.addEventListener('click', () => scene?.resetCamera(), { signal: listeners.signal });
  void assets.preload();
} catch (error: unknown) {
  placement?.dispose();
  presenter?.dispose();
  assets.dispose();
  scene?.dispose();
  hud.setReady(false);
  status.setAttribute('role', 'alert');
  status.textContent = '三维场景无法启动，请使用支持 WebGL2 的 Chrome 或 Edge，并检查浏览器图形加速设置。';
  mission.setReady(false, status.textContent);
  console.error('无法初始化三维地块：', error);
}

function dispose(): void {
  listeners.abort();
  unsubscribeAssets();
  placement?.dispose();
  presenter?.dispose();
  assets.dispose();
  hud.dispose();
  mission.dispose();
  scene?.dispose();
}

function onPageHide(event: PageTransitionEvent): void {
  // 往返缓存恢复时沿用原场景；真正卸载才释放，避免后退后出现空画布。
  if (!event.persisted) dispose();
}

// HMR 和真正卸载都释放原场景，避免累积画布、监听器或 GPU 资源。
window.addEventListener('pagehide', onPageHide);
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    window.removeEventListener('pagehide', onPageHide);
    dispose();
  });
}
