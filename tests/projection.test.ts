import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { worldToScreen } from '../src/scene/projection';

function cameraRig(): PerspectiveCamera {
  const camera = new PerspectiveCamera(90, 2, 0.1, 80);
  camera.position.set(0, 0, 0);
  camera.lookAt(0, 0, -1);
  camera.updateMatrixWorld();
  return camera;
}

describe('世界坐标转屏幕坐标', () => {
  it('相机正前方的点落在画布中心', () => {
    const camera = cameraRig();
    const point = worldToScreen(new Vector3(0, 0, -10), camera, 200, 100);
    expect(point?.x).toBeCloseTo(100, 5);
    expect(point?.y).toBeCloseTo(50, 5);
  });

  it('相机后方的点返回 null，避免浮动条悬空翻转', () => {
    const camera = cameraRig();
    expect(worldToScreen(new Vector3(0, 0, 10), camera, 200, 100)).toBeNull();
  });

  it('按 NDC 换算像素：fov 90 时横向半程对应四分之一画布宽', () => {
    const camera = cameraRig();
    // aspect=2、tan(45°)=1：x=-10、z=-10 → NDC.x=-0.5 → 像素 50；y=5、z=-10 → NDC.y=0.5 → 像素 25。
    const point = worldToScreen(new Vector3(-10, 5, -10), camera, 200, 100);
    expect(point?.x).toBeCloseTo(50, 5);
    expect(point?.y).toBeCloseTo(25, 5);
  });

  it('俯视相机沿视线投影，格子中心仍落在画布中心', () => {
    const camera = new PerspectiveCamera(40, 1, 0.1, 80);
    camera.position.set(6, 8.5, 6);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    const point = worldToScreen(new Vector3(0, 0, 0), camera, 300, 300);
    expect(point?.x).toBeCloseTo(150, 5);
    expect(point?.y).toBeCloseTo(150, 5);
  });

  it('宽高为零时坐标无意义，仍只由相机后方规则决定', () => {
    const camera = cameraRig();
    expect(worldToScreen(new Vector3(0, 0, -10), camera, 0, 0)).toEqual({ x: 0, y: 0 });
  });
});
