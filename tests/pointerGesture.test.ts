import { describe, expect, it } from 'vitest';
import { PointerGesture } from '../src/scene/pointerGesture';

describe('点击与相机拖动的分界', () => {
  it('静止或最大位移恰好 5 CSS 像素仍为点击', () => {
    const gesture = new PointerGesture(1, 10, 10);
    expect(gesture.isClick()).toBe(true);
    gesture.update(13, 14);
    expect(gesture.isClick()).toBe(true);
  });

  it('超过阈值是拖动，最终抬起点也必须计入', () => {
    const gesture = new PointerGesture(1, 10, 10);
    gesture.update(15.01, 10);
    expect(gesture.isClick()).toBe(false);
  });

  it('拖出后回到起点仍是拖动，不能误放建筑', () => {
    const gesture = new PointerGesture(1, 10, 10);
    gesture.update(30, 10);
    gesture.update(10, 10);
    expect(gesture.isClick()).toBe(false);
  });
});
