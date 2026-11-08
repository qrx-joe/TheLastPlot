import { Vector3 } from 'three';
import type { PerspectiveCamera } from 'three';

export interface ScreenPoint {
  x: number;
  y: number;
}

/** 世界坐标转画布内 CSS 像素坐标；点位于相机后方（投影会翻转）时返回 null。 */
export function worldToScreen(point: Readonly<Vector3>, camera: PerspectiveCamera, width: number, height: number): ScreenPoint | null {
  const forward = camera.getWorldDirection(new Vector3());
  if (forward.dot(new Vector3().subVectors(point, camera.position)) <= 0) return null;
  const ndc = new Vector3().copy(point).project(camera);
  return { x: (ndc.x + 1) / 2 * width, y: (1 - ndc.y) / 2 * height };
}
