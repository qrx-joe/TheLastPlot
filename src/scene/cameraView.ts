import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { PerspectiveCamera } from 'three';

/** 复位观察视角；不触碰城市布局。 */
export function resetCameraView(controls: OrbitControls<PerspectiveCamera>): void {
  const damping = controls.enableDamping;
  const viewportZoom = controls.object.zoom;
  // 先用非阻尼更新清空旋转增量，再复位，避免余下帧继续偏离初始位置。
  controls.enableDamping = false;
  controls.update();
  controls.reset();
  // zoom 是当前画布的取景适配；用户滚轮缩放由相机距离负责。
  controls.object.zoom = viewportZoom;
  controls.object.updateProjectionMatrix();
  controls.update();
  controls.enableDamping = damping;
}
