import { GAME_CONFIG } from './data/gameConfig';
import { SceneManager } from './scene/SceneManager';
import './styles/main.css';

const container = document.querySelector<HTMLElement>('#scene');
const status = document.querySelector<HTMLElement>('#scene-status');
const resetButton = document.querySelector<HTMLButtonElement>('#reset-camera');

if (!container || !status || !resetButton) {
  throw new Error('地块页面缺少必要的挂载节点。');
}

const listeners = new AbortController();
let scene: SceneManager | undefined;

try {
  scene = new SceneManager(container, () => {
    status.textContent = `${GAME_CONFIG.gridSize}×${GAME_CONFIG.gridSize} 地块已就绪`;
    resetButton.disabled = false;
  });
  resetButton.addEventListener('click', () => scene?.resetCamera(), { signal: listeners.signal });
} catch (error: unknown) {
  status.setAttribute('role', 'alert');
  status.textContent = '三维场景无法启动，请使用支持 WebGL2 的 Chrome 或 Edge，并检查浏览器图形加速设置。';
  console.error('无法初始化三维地块：', error);
}

function dispose(): void {
  listeners.abort();
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
