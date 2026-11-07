import { describe, expect, it } from 'vitest';
import { PerspectiveCamera } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { resetCameraView } from '../src/scene/cameraView';

function cameraRig() {
  const camera = new PerspectiveCamera(40, 1, 0.1, 80);
  camera.position.set(6, 8.5, 6);
  const controls = new OrbitControls(camera, null);
  controls.enableDamping = true;
  controls.update();
  controls.saveState();
  return { camera, controls };
}

describe('相机复位', () => {
  it.each([true, false])('清除剩余旋转惯性，后续帧保持初始位置（阻尼=%s）', (damping) => {
    const { camera, controls } = cameraRig();
    controls.enableDamping = damping;
    const initial = camera.position.clone();
    // 自动旋转使用与鼠标拖动相同的旋转增量，结束后留下真实阻尼惯性。
    controls.autoRotate = true;
    for (let frame = 0; frame < 10; frame += 1) controls.update(1 / 60);
    controls.autoRotate = false;
    expect(camera.position.distanceTo(initial)).toBeGreaterThan(0.01);
    resetCameraView(controls);
    expect(camera.position.distanceTo(initial)).toBeLessThan(1e-10);
    for (let frame = 0; frame < 120; frame += 1) controls.update(1 / 60);
    expect(camera.position.distanceTo(initial)).toBeLessThan(1e-10);
    expect(controls.enableDamping).toBe(damping);
  });

  it('保留当前窄画布取景比例，不恢复过期的初始 zoom', () => {
    const { camera, controls } = cameraRig();
    camera.zoom = 0.75;
    camera.updateProjectionMatrix();
    resetCameraView(controls);
    expect(camera.zoom).toBe(0.75);
    controls.update();
    expect(camera.zoom).toBe(0.75);
  });
});
