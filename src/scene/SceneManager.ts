import {
  BoxGeometry,
  Color,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GAME_CONFIG } from '../data/gameConfig';
import { cellToWorld } from './coordinates';

/** 仅负责场景、资源和相机；不持有游戏状态，不计算经济规则。 */
export class SceneManager {
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(40, 1, 0.1, 80);
  private readonly renderer: WebGLRenderer;
  private readonly controls: OrbitControls;
  private readonly resizeObserver: ResizeObserver;
  private readonly geometries: BoxGeometry[] = [];
  private readonly materials: MeshStandardMaterial[] = [];
  private disposed = false;

  constructor(private readonly container: HTMLElement, onReady: () => void) {
    // WebGL2 不可用时让入口展示明确错误，不用静态图片冒充三维场景。
    this.renderer = new WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.domElement.setAttribute('role', 'img');
    this.renderer.domElement.setAttribute('aria-label', '5×5 三维地块，拖动旋转，滚轮缩放');
    this.container.append(this.renderer.domElement);
    this.scene.background = new Color('#f4efe6');

    this.camera.position.set(6, 8.5, 6);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.enablePan = false;
    this.controls.minDistance = 7;
    this.controls.maxDistance = 20;
    // 保持俯视 3/4 角度，只环绕地块和缩放，避免转到地板下面。
    this.controls.minPolarAngle = Math.PI / 4;
    this.controls.maxPolarAngle = Math.PI / 4;
    this.controls.update();
    this.controls.saveState();

    this.scene.add(new HemisphereLight('#ffffff', '#bca98c', 2));
    const sunlight = new DirectionalLight('#fff6e7', 2.5);
    sunlight.position.set(-3, 8, 5);
    this.scene.add(sunlight);
    this.createGround();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);
    this.resize();

    let ready = false;
    // 唯一渲染循环；相机复位和窗口缩放不会再创建额外循环。
    this.renderer.setAnimationLoop(() => {
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
      if (!ready) {
        ready = true;
        onReady();
      }
    });
  }

  public resetCamera(): void {
    this.controls.reset();
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    this.resizeObserver.disconnect();
    this.controls.dispose();
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
    this.scene.clear();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private resize(): void {
    const { width, height } = this.container.getBoundingClientRect();
    if (width <= 0 || height <= 0) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private createGround(): void {
    const size = GAME_CONFIG.gridSize * GAME_CONFIG.cellSize;
    const baseGeometry = new BoxGeometry(size + 0.18, 0.28, size + 0.18);
    const baseMaterial = new MeshStandardMaterial({ color: '#c9b797', roughness: 1 });
    const base = new Mesh(baseGeometry, baseMaterial);
    base.position.y = -0.14;
    this.scene.add(base);

    // 25 格共享几何体和两种材质；细缝显示格界，逻辑单位仍为完整的 1 格。
    const tileGeometry = new BoxGeometry(GAME_CONFIG.cellSize - 0.035, 0.06, GAME_CONFIG.cellSize - 0.035);
    const tileMaterials = [
      new MeshStandardMaterial({ color: '#c0c9ac', roughness: 1 }),
      new MeshStandardMaterial({ color: '#b9c3a3', roughness: 1 }),
    ];
    this.geometries.push(baseGeometry, tileGeometry);
    this.materials.push(baseMaterial, ...tileMaterials);

    for (let y = 0; y < GAME_CONFIG.gridSize; y += 1) {
      for (let x = 0; x < GAME_CONFIG.gridSize; x += 1) {
        const world = cellToWorld({ x, y });
        const tile = new Mesh(tileGeometry, tileMaterials[(x + y) % tileMaterials.length]);
        tile.name = `cell-${x}-${y}`;
        tile.position.set(world.x, 0.03, world.z);
        this.scene.add(tile);
      }
    }
  }
}
