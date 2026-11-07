import {
  BoxGeometry, ConeGeometry, CylinderGeometry, EdgesGeometry, Group,
  LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial, MeshStandardMaterial,
  PlaneGeometry, SphereGeometry,
} from 'three';
import { BUILDINGS, BUILDING_TYPES, GAME_CONFIG } from '../data/gameConfig';
import { footprintCells } from '../domain/grid';
import type { BuildingInstance, BuildingType, ValidationResult } from '../domain/types';
import type { GameStore } from '../state/gameStore';
import { cellToWorld, GROUND_Y } from './coordinates';
import type { SceneManager } from './SceneManager';

const MODEL_HEIGHT: Record<BuildingType, number> = { factory: 1.5, house: 1, park: 0.8, shop: 0.8 };

/** 只呈现 store 数据；几何模型、选择代理、预览各自独立，不反推游戏占地。 */
export class ScenePresenter {
  private readonly models = new Group();
  private readonly proxies = new Group();
  private readonly preview = new Group();
  private readonly box = new BoxGeometry(1, 1, 1);
  private readonly cone = new ConeGeometry(1, 1, 4);
  private readonly cylinder = new CylinderGeometry(0.5, 0.5, 1, 8);
  private readonly sphere = new SphereGeometry(1, 10, 8);
  private readonly previewGeometry = new PlaneGeometry(GAME_CONFIG.cellSize - 0.04, GAME_CONFIG.cellSize - 0.04);
  private readonly outlineGeometry = new EdgesGeometry(this.box);
  private readonly previewMaterial = new MeshBasicMaterial({ color: '#509569', transparent: true, opacity: 0.5, depthTest: false, depthWrite: false });
  private readonly proxyMaterial = new MeshBasicMaterial({ colorWrite: false, depthWrite: false });
  private readonly outlineMaterial = new LineBasicMaterial({ color: '#456b94', depthTest: false });
  private readonly outline = new LineSegments(this.outlineGeometry, this.outlineMaterial);
  private readonly buildingMaterials = Object.fromEntries(BUILDING_TYPES.map((type) => [type, new MeshStandardMaterial({ color: BUILDINGS[type].color, roughness: 1 })])) as Record<BuildingType, MeshStandardMaterial>;
  private readonly roofMaterial = new MeshStandardMaterial({ color: '#b7694f', roughness: 1 });
  private readonly treeMaterial = new MeshStandardMaterial({ color: '#4f7551', roughness: 1 });
  private readonly darkMaterial = new MeshStandardMaterial({ color: '#6e685a', roughness: 1 });
  private readonly unsubscribe: () => void;
  private lastPlaced: readonly BuildingInstance[] | null = null;

  constructor(private readonly manager: SceneManager, private readonly store: GameStore) {
    const capacity = Math.max(...BUILDING_TYPES.map((type) => BUILDINGS[type].width * BUILDINGS[type].depth));
    for (let i = 0; i < capacity; i += 1) {
      const tile = new Mesh(this.previewGeometry, this.previewMaterial);
      tile.rotation.x = -Math.PI / 2;
      tile.renderOrder = 3;
      this.preview.add(tile);
    }
    this.preview.visible = false;
    this.outline.visible = false;
    this.outline.renderOrder = 4;
    manager.scene.add(this.models, this.proxies, this.preview, this.outline);
    this.unsubscribe = store.subscribe(() => this.render());
    this.render();
  }

  public getSelectionProxies(): readonly Mesh[] {
    return this.proxies.children.filter((object): object is Mesh => object instanceof Mesh);
  }

  public showPreview(candidate: BuildingInstance | null, validation?: ValidationResult): void {
    this.preview.visible = candidate !== null;
    if (!candidate) return;
    this.previewMaterial.color.set(validation?.valid ? '#509569' : '#c15245');
    const cells = footprintCells(candidate);
    this.preview.children.forEach((object, index) => {
      const cell = cells[index];
      object.visible = cell !== undefined;
      if (cell) {
        const world = cellToWorld(cell);
        object.position.set(world.x, GROUND_Y + 0.02, world.z);
      }
    });
  }

  public dispose(): void {
    this.unsubscribe();
    this.manager.scene.remove(this.models, this.proxies, this.preview, this.outline);
    this.models.clear();
    this.proxies.clear();
    for (const geometry of [this.box, this.cone, this.cylinder, this.sphere, this.previewGeometry, this.outlineGeometry]) geometry.dispose();
    for (const material of [...Object.values(this.buildingMaterials), this.roofMaterial, this.treeMaterial, this.darkMaterial, this.previewMaterial, this.proxyMaterial, this.outlineMaterial]) material.dispose();
  }

  private render(): void {
    const state = this.store.getState();
    if (state.placed !== this.lastPlaced) {
      this.models.clear();
      this.proxies.clear();
      for (const building of state.placed) {
        const { width, depth } = BUILDINGS[building.type];
        const center = cellToWorld({ x: building.origin.x + (width - 1) / 2, y: building.origin.y + (depth - 1) / 2 });
        const model = this.createModel(building.type);
        model.position.set(center.x, GROUND_Y, center.z);
        this.models.add(model);
        // 选择代理由逻辑占地生成；模型更换后仍可点击整块占地。
        const proxy = new Mesh(this.box, this.proxyMaterial);
        proxy.scale.set(width * GAME_CONFIG.cellSize, MODEL_HEIGHT[building.type], depth * GAME_CONFIG.cellSize);
        proxy.position.set(center.x, GROUND_Y + MODEL_HEIGHT[building.type] / 2, center.z);
        proxy.userData = { buildingId: building.id };
        this.proxies.add(proxy);
      }
      this.proxies.updateMatrixWorld(true);
      this.lastPlaced = state.placed;
    }
    const selected = state.placed.find((building) => building.id === state.selectedBuildingId);
    this.outline.visible = selected !== undefined;
    if (selected) {
      const { width, depth } = BUILDINGS[selected.type];
      const center = cellToWorld({ x: selected.origin.x + (width - 1) / 2, y: selected.origin.y + (depth - 1) / 2 });
      this.outline.position.set(center.x, GROUND_Y + MODEL_HEIGHT[selected.type] / 2, center.z);
      this.outline.scale.set(width * GAME_CONFIG.cellSize + 0.02, MODEL_HEIGHT[selected.type] + 0.02, depth * GAME_CONFIG.cellSize + 0.02);
      this.outlineMaterial.color.set(state.mode === 'move' ? '#b57936' : '#456b94');
    }
  }

  private createModel(type: BuildingType): Group {
    const group = new Group();
    const material = this.buildingMaterials[type];
    const addBox = (x: number, y: number, z: number, width: number, height: number, depth: number, paint = material): void => {
      const mesh = new Mesh(this.box, paint);
      mesh.position.set(x, y, z);
      mesh.scale.set(width, height, depth);
      group.add(mesh);
    };
    switch (type) {
      case 'factory': {
        addBox(0, 0.35, 0, 1.65, 0.7, 1.5);
        addBox(0, 0.74, 0, 1.75, 0.12, 1.6, this.roofMaterial);
        const chimney = new Mesh(this.cylinder, this.darkMaterial);
        chimney.scale.set(0.25, 0.8, 0.25);
        chimney.position.set(-0.5, 1.1, -0.4);
        group.add(chimney);
        break;
      }
      case 'house': {
        addBox(0, 0.3, 0, 0.68, 0.6, 0.68);
        const roof = new Mesh(this.cone, this.roofMaterial);
        roof.scale.set(0.57, 0.35, 0.57);
        roof.rotation.y = Math.PI / 4;
        roof.position.y = 0.775;
        group.add(roof);
        break;
      }
      case 'park': {
        addBox(0, 0.06, 0, 1.8, 0.12, 1.8);
        for (const x of [-0.45, 0.45]) {
          addBox(x, 0.3, 0, 0.1, 0.4, 0.1, this.darkMaterial);
          const crown = new Mesh(this.sphere, this.treeMaterial);
          crown.scale.setScalar(0.28);
          crown.position.set(x, 0.52, 0);
          group.add(crown);
        }
        break;
      }
      case 'shop':
        addBox(0, 0.28, 0, 0.75, 0.56, 0.7);
        addBox(0, 0.63, 0.04, 0.86, 0.14, 0.84, this.roofMaterial);
        break;
    }
    return group;
  }
}
