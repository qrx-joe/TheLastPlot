import {
  ArrowHelper, BufferGeometry, CanvasTexture, Group, LineBasicMaterial,
  LineSegments, Mesh, MeshBasicMaterial, PlaneGeometry, Sprite, SpriteMaterial, Vector3,
} from 'three';
import type { Scene } from 'three';
import { GAME_CONFIG } from '../data/gameConfig';
import { pollutionCells } from '../domain/economy';
import type { BuildingInstance } from '../domain/types';
import { cellToWorld, GROUND_Y } from './coordinates';

/** 仅显示纯函数返回的污染格和世界方向；不在渲染层复写污染公式。 */
export class SpatialOverlay {
  private readonly root = new Group();
  private readonly cells = new Group();
  private readonly plane = new PlaneGeometry(GAME_CONFIG.cellSize - 0.06, GAME_CONFIG.cellSize - 0.06);
  private readonly cross = new BufferGeometry().setFromPoints([
    new Vector3(-0.4, 0, -0.4), new Vector3(0.4, 0, 0.4),
    new Vector3(-0.4, 0, 0.4), new Vector3(0.4, 0, -0.4),
  ]);
  private readonly fill = new MeshBasicMaterial({ color: '#d58a40', transparent: true, opacity: 0.3, depthWrite: false });
  private readonly stripe = new LineBasicMaterial({ color: '#a8692e', transparent: true, opacity: 0.7, depthTest: false });
  private readonly arrows: ArrowHelper[] = [];
  private readonly labels: SpriteMaterial[] = [];
  private factoryKey: string | null | undefined = undefined;

  constructor(private readonly scene: Scene) {
    for (let i = 0; i < GAME_CONFIG.gridSize ** 2; i += 1) {
      const cell = new Group();
      const square = new Mesh(this.plane, this.fill);
      square.rotation.x = -Math.PI / 2;
      square.renderOrder = 1;
      const stripes = new LineSegments(this.cross, this.stripe);
      stripes.renderOrder = 2;
      cell.add(square, stripes);
      cell.visible = false;
      this.cells.add(cell);
    }
    const edge = GAME_CONFIG.gridSize * GAME_CONFIG.cellSize / 2;
    const north = new ArrowHelper(new Vector3(0, 0, -1), new Vector3(-edge - 0.5, GROUND_Y + 0.1, edge - 0.4), 1.2, '#52718a', 0.22, 0.14);
    const wind = new ArrowHelper(new Vector3(1, 0, 0), new Vector3(-edge + 0.25, GROUND_Y + 0.1, edge + 0.5), 1.4, '#b87835', 0.22, 0.14);
    this.arrows.push(north, wind);
    this.root.add(this.cells, north, wind);
    this.label('北 N', new Vector3(-edge - 0.9, 0.12, edge + 0.4), 1.1, '#486378');
    this.label('西 → 东', new Vector3(-edge + 1, 0.16, edge + 1.1), 1.5, '#91612e');
    scene.add(this.root);
  }

  public showFactory(factory: BuildingInstance | undefined): void {
    const key = factory ? `${factory.origin.x},${factory.origin.y}` : null;
    if (this.factoryKey === key) return;
    this.factoryKey = key;
    const affected = factory ? pollutionCells(factory, GAME_CONFIG.gridSize) : [];
    this.cells.children.forEach((mesh, index) => {
      const cell = affected[index];
      mesh.visible = cell !== undefined;
      if (cell) {
        const world = cellToWorld(cell);
        mesh.position.set(world.x, GROUND_Y + 0.015, world.z);
      }
    });
  }

  public dispose(): void {
    this.scene.remove(this.root);
    this.plane.dispose();
    this.cross.dispose();
    this.fill.dispose();
    this.stripe.dispose();
    for (const arrow of this.arrows) arrow.dispose();
    for (const material of this.labels) {
      material.map?.dispose();
      material.dispose();
    }
    this.root.clear();
  }

  private label(text: string, position: Vector3, width: number, color: string): void {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.font = '600 64px "Microsoft YaHei", sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = color;
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    const material = new SpriteMaterial({ map: new CanvasTexture(canvas), depthTest: false });
    this.labels.push(material);
    const sprite = new Sprite(material);
    sprite.position.copy(position);
    sprite.scale.set(width, width / 4, 1);
    this.root.add(sprite);
  }
}
