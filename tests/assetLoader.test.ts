import { afterEach, describe, expect, it, vi } from 'vitest';
import { Box3, BoxGeometry, Group, Mesh, MeshStandardMaterial, Texture, Vector3 } from 'three';
import type { Object3D } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { AssetLoader, assetUrl, normalizeModel } from '../src/scene/AssetLoader';
import { MODEL_HEIGHT } from '../src/data/assetConfig';

function model() {
  const geometry = new BoxGeometry(4, 6, 2);
  const material = new MeshStandardMaterial();
  const mesh = new Mesh(geometry, material);
  mesh.position.set(8, 2, -5);
  const root = new Group();
  root.add(mesh);
  return { root, mesh, geometry, material };
}

function deferredModel() {
  let resolve!: (value: Object3D) => void;
  const promise = new Promise<Object3D>((done) => { resolve = done; });
  return { promise, resolve };
}

afterEach(() => { vi.restoreAllMocks(); });

describe('模型尺寸和路径', () => {
  it.each([['/', '/models/factory.glb'], ['/the-last-plot/', '/the-last-plot/models/factory.glb'], ['/the-last-plot', '/the-last-plot/models/factory.glb']])('base %s 指向实际静态资源', (base, expected) => {
    expect(assetUrl(base, 'factory.glb')).toBe(expected);
  });

  it('保留比例、底面贴地且水平居中，不突破建筑显示尺寸', () => {
    const source = model();
    source.root.rotation.y = Math.PI / 2;
    const normalized = normalizeModel(source.root, 'factory');
    normalized.updateMatrixWorld(true);
    const bounds = new Box3().setFromObject(normalized);
    const size = bounds.getSize(new Vector3());
    const center = bounds.getCenter(new Vector3());
    expect(center.x).toBeCloseTo(0);
    expect(center.z).toBeCloseTo(0);
    expect(bounds.min.y).toBeCloseTo(0);
    expect(size.y).toBeCloseTo(MODEL_HEIGHT.factory);
    expect(size.x).toBeLessThanOrEqual(1.8);
    expect(size.z).toBeLessThanOrEqual(1.8);
    expect(size.z / size.y).toBeCloseTo(4 / 6);
    expect(size.x / size.y).toBeCloseTo(2 / 6);
    // 游戏位置设置在归一化根上，底面偏移仍保存在子节点中。
    normalized.position.set(2, 0.06, -1);
    normalized.updateMatrixWorld(true);
    const placed = new Box3().setFromObject(normalized);
    expect(placed.min.y).toBeCloseTo(0.06);
    expect(placed.getCenter(new Vector3()).x).toBeCloseTo(2);
  });

  it('空模型和零厚度模型不能伪装为已加载', () => {
    expect(() => normalizeModel(new Group(), 'factory')).toThrow('包围盒');
    expect(() => normalizeModel(new Mesh(new BoxGeometry(1, 0, 1)), 'house')).toThrow('包围盒');
  });
});

describe('资产缓存、回退与生命周期', () => {
  it('未提供的类型直接占位，不请求不存在的可选文件', async () => {
    const read = vi.fn<(url: string) => Promise<Object3D>>();
    const assets = new AssetLoader({}, read, '/');
    await assets.preload();
    expect(read).not.toHaveBeenCalled();
    expect(assets.getStatuses().every((status) => status.phase === 'unprovided')).toBe(true);
    expect(assets.instantiate('factory')).toBeNull();
    assets.dispose();
  });

  it('并发加载合并为一次请求，每个克隆有独立变换但共享资源', async () => {
    const source = model();
    const pending = deferredModel();
    const read = vi.fn(() => pending.promise);
    const assets = new AssetLoader({ house: 'house.glb' }, read, '/play/');
    const first = assets.preload();
    const second = assets.preload();
    expect(assets.instantiate('house')).toBeNull();
    expect(assets.getStatuses().find((item) => item.type === 'house')?.phase).toBe('loading');
    await Promise.resolve();
    expect(read).toHaveBeenCalledExactlyOnceWith('/play/models/house.glb');
    pending.resolve(source.root);
    await Promise.all([first, second]);
    const one = assets.instantiate('house');
    const two = assets.instantiate('house');
    expect(one).not.toBeNull();
    expect(two).not.toBeNull();
    expect(one).not.toBe(two);
    one?.position.set(2, 3, 4);
    expect(two?.position.toArray()).toEqual([0, 0, 0]);
    const firstMesh = one?.getObjectByProperty('isMesh', true) as Mesh;
    const secondMesh = two?.getObjectByProperty('isMesh', true) as Mesh;
    expect(firstMesh).not.toBe(secondMesh);
    expect(firstMesh.geometry).toBe(secondMesh.geometry);
    expect(firstMesh.material).toBe(secondMesh.material);
    await assets.preload();
    expect(read).toHaveBeenCalledTimes(1);
    assets.dispose();
  });

  it('订阅者再次 preload 不重复请求，退订后不再通知', async () => {
    const source = model();
    const read = vi.fn(async () => source.root);
    const assets = new AssetLoader({ factory: 'factory.glb' }, read, '/');
    const phases: string[] = [];
    const unsubscribe = assets.subscribe(() => {
      phases.push(assets.getStatuses()[0]?.phase ?? '');
      void assets.preload();
    });
    await assets.preload();
    unsubscribe();
    expect(phases).toEqual(['loading', 'ready']);
    expect(read).toHaveBeenCalledTimes(1);
    assets.dispose();
    expect(phases).toEqual(['loading', 'ready']);
  });

  it('请求失败后明确标记失败，无自动无限重试', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const read = vi.fn(async () => { throw new Error('network unavailable'); });
    const assets = new AssetLoader({ factory: 'factory.glb' }, read, '/');
    await assets.preload();
    await assets.preload();
    expect(read).toHaveBeenCalledTimes(1);
    expect(assets.instantiate('factory')).toBeNull();
    expect(assets.getStatuses()[0]?.phase).toBe('failed');
    expect(assets.getStatuses()[1]?.phase).toBe('unprovided');
    expect(warn).toHaveBeenCalledTimes(1);
    assets.dispose();
  });

  it('GLTFLoader 拒绝 HTML 内容，不能把静态托管回退页面当成 GLB', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const assets = new AssetLoader({ factory: 'factory.glb' }, async () => {
      const gltf = await new GLTFLoader().parseAsync('<!doctype html><title>fallback</title>', '/');
      return gltf.scene;
    }, '/');
    await assets.preload();
    expect(assets.getStatuses()[0]?.phase).toBe('failed');
    expect(assets.instantiate('factory')).toBeNull();
    assets.dispose();
  });

  it('无效几何体被拒绝且释放已读取的资源', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const geometry = new BoxGeometry(1, 0, 1);
    const material = new MeshStandardMaterial();
    const disposeGeometry = vi.spyOn(geometry, 'dispose');
    const disposeMaterial = vi.spyOn(material, 'dispose');
    const assets = new AssetLoader({ factory: 'factory.glb' }, async () => new Mesh(geometry, material), '/');
    await assets.preload();
    expect(assets.getStatuses()[0]?.phase).toBe('failed');
    expect(disposeGeometry).toHaveBeenCalledTimes(1);
    expect(disposeMaterial).toHaveBeenCalledTimes(1);
    assets.dispose();
    expect(disposeGeometry).toHaveBeenCalledTimes(1);
  });

  it('共享几何体、材质和纹理只释放一次，重复 dispose 安全', async () => {
    const source = model();
    const image = { close: vi.fn() };
    const texture = new Texture(image);
    source.material.map = texture;
    source.root.add(new Mesh(source.geometry, source.material));
    const geometryDispose = vi.spyOn(source.geometry, 'dispose');
    const materialDispose = vi.spyOn(source.material, 'dispose');
    const textureDispose = vi.spyOn(texture, 'dispose');
    const assets = new AssetLoader({ factory: 'factory.glb' }, async () => source.root, '/');
    await assets.preload();
    assets.instantiate('factory');
    assets.instantiate('factory');
    assets.dispose();
    assets.dispose();
    expect(geometryDispose).toHaveBeenCalledTimes(1);
    expect(materialDispose).toHaveBeenCalledTimes(1);
    expect(textureDispose).toHaveBeenCalledTimes(1);
    expect(image.close).toHaveBeenCalledTimes(1);
    expect(assets.instantiate('factory')).toBeNull();
  });

  it('卸载后晚到的成功结果只释放资源，不缓存或通知页面', async () => {
    const source = model();
    const pending = deferredModel();
    const disposeGeometry = vi.spyOn(source.geometry, 'dispose');
    const assets = new AssetLoader({ factory: 'factory.glb' }, () => pending.promise, '/');
    const listener = vi.fn();
    assets.subscribe(listener);
    const loading = assets.preload();
    await Promise.resolve();
    assets.dispose();
    pending.resolve(source.root);
    await loading;
    expect(listener).toHaveBeenCalledTimes(1);
    expect(disposeGeometry).toHaveBeenCalledTimes(1);
    expect(assets.instantiate('factory')).toBeNull();
  });

  it('排队开始前卸载不再发起模型请求', async () => {
    const read = vi.fn(async () => model().root);
    const assets = new AssetLoader({ factory: 'factory.glb' }, read, '/');
    const loading = assets.preload();
    assets.dispose();
    await loading;
    await assets.preload();
    expect(read).not.toHaveBeenCalled();
  });
});
