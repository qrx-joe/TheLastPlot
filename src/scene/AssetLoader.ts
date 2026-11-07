import { Box3, Group, Material, Mesh, Texture, Vector3 } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ASSET_FILES, MODEL_HEIGHT } from '../data/assetConfig';
import { BUILDINGS, BUILDING_TYPES, GAME_CONFIG } from '../data/gameConfig';
import type { BuildingType } from '../domain/types';

export interface AssetStatus {
  readonly type: BuildingType;
  readonly phase: 'unprovided' | 'pending' | 'loading' | 'ready' | 'failed';
}

type ModelReader = (url: string) => Promise<Object3D>;

export function assetUrl(baseUrl: string, file: string): string {
  return `${baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`}models/${file}`;
}

/** 保留长宽高比例，底面归零、水平居中；返回根节点可直接放到逻辑占地中心。 */
export function normalizeModel(source: Object3D, type: BuildingType): Group {
  source.updateMatrixWorld(true);
  const bounds = new Box3().setFromObject(source);
  const size = bounds.getSize(new Vector3());
  if (bounds.isEmpty() || ![size.x, size.y, size.z].every((value) => Number.isFinite(value) && value > 0)) {
    throw new Error('模型没有可用的三维包围盒。');
  }
  const { width, depth } = BUILDINGS[type];
  const scale = Math.min(width * GAME_CONFIG.cellSize * 0.9 / size.x, depth * GAME_CONFIG.cellSize * 0.9 / size.z, MODEL_HEIGHT[type] / size.y);
  const center = bounds.getCenter(new Vector3());
  const content = new Group();
  content.add(source);
  content.scale.setScalar(scale);
  content.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
  const root = new Group();
  root.add(content);
  return root;
}

/** 实例共享缓存中的几何体/材质；仅缓存所有者释放它们，不能在删除单栋时释放。 */
function disposeModel(root: Object3D): void {
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  const textures = new Set<Texture>();
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
  });
  for (const material of materials) {
    for (const value of Object.values(material)) if (value instanceof Texture) textures.add(value);
    material.dispose();
  }
  const images = new Set<unknown>();
  for (const texture of textures) {
    images.add(texture.image);
    texture.dispose();
  }
  for (const image of images) {
    if (image && typeof image === 'object' && 'close' in image && typeof image.close === 'function') image.close();
  }
  for (const geometry of geometries) geometry.dispose();
}

/** 每类资产只读一次；失败保留占位，晚到的加载结果不能恢复已经删除的建筑。 */
export class AssetLoader {
  private readonly cache = new Map<BuildingType, Group>();
  private readonly inflight = new Map<BuildingType, Promise<void>>();
  private readonly phases = new Map<BuildingType, AssetStatus['phase']>();
  private readonly listeners = new Set<() => void>();
  private disposed = false;

  constructor(
    private readonly files: Partial<Record<BuildingType, string>> = ASSET_FILES,
    private readonly readModel: ModelReader = (url) => new GLTFLoader().loadAsync(url).then((gltf) => gltf.scene),
    private readonly baseUrl: string = import.meta.env.BASE_URL,
  ) {
    for (const type of BUILDING_TYPES) this.phases.set(type, files[type] ? 'pending' : 'unprovided');
  }

  public getStatuses(): readonly AssetStatus[] {
    return BUILDING_TYPES.map((type) => ({ type, phase: this.phases.get(type) ?? 'unprovided' }));
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  public instantiate(type: BuildingType): Group | null {
    return this.disposed ? null : this.cache.get(type)?.clone(true) ?? null;
  }

  public async preload(): Promise<void> {
    if (this.disposed) return;
    await Promise.all(BUILDING_TYPES.map((type) => {
      const current = this.inflight.get(type);
      if (current) return current;
      const file = this.files[type];
      if (!file || this.phases.get(type) !== 'pending') return Promise.resolve();
      this.phases.set(type, 'loading');
      // 注册 promise 后才通知，订阅者即便再次 preload 也不会重复发起请求。
      const task = Promise.resolve().then(() => this.loadTemplate(type, file));
      this.inflight.set(type, task);
      this.notify();
      return task;
    }));
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.listeners.clear();
    for (const model of this.cache.values()) disposeModel(model);
    this.cache.clear();
  }

  private async loadTemplate(type: BuildingType, file: string): Promise<void> {
    let source: Object3D | undefined;
    try {
      if (this.disposed) return;
      source = await this.readModel(assetUrl(this.baseUrl, file));
      if (this.disposed) {
        disposeModel(source);
        return;
      }
      this.cache.set(type, normalizeModel(source, type));
      this.phases.set(type, 'ready');
      this.notify();
    } catch (error: unknown) {
      if (source) disposeModel(source);
      if (!this.disposed) {
        this.phases.set(type, 'failed');
        console.warn(`[Lux3D] ${BUILDINGS[type].name}模型加载失败，使用占位模型。`, error);
        this.notify();
      }
    } finally {
      this.inflight.delete(type);
    }
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}
