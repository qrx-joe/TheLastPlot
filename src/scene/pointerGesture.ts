import { GAME_CONFIG } from '../data/gameConfig';

/** 跟踪整段最大位移，不能只比较抬起点，否则拖出再拖回会误建造。 */
export class PointerGesture {
  private maxDistance = 0;

  constructor(readonly pointerId: number, private readonly startX: number, private readonly startY: number) {}

  public update(x: number, y: number): void {
    this.maxDistance = Math.max(this.maxDistance, Math.hypot(x - this.startX, y - this.startY));
  }

  public isClick(): boolean {
    return this.maxDistance <= GAME_CONFIG.dragThresholdPixels;
  }
}
