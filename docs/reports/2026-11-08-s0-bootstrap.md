# S0 工程初始化验收

日期：2026年11月8日。结果：S0 完成，可继续 S1 网格与摆放。未实现建筑、经济结算、Lux3D 导入或生产部署。

## 实现与结构影响

- Vite 8.3.6、TypeScript 7.0.2 strict、Three.js 与 @types/three 0.187.0；npm 锁文件固定版本。
- index.html / src/main.ts 为入口；原生 CSS 提供地块预览与复位按钮。
- src/data/gameConfig.ts 提供 5×5、每格 1 世界单位的配置；domain/types.ts 只含纯坐标类型。
- scene/coordinates.ts 统一逻辑 x/y 到世界 X/-Z 的中心偏移；SceneManager 创建平台与 25 格、灯光、相机和唯一渲染循环。
- OrbitControls 固定俯视角，支持环绕、缩放和复位；ResizeObserver 更新画布尺寸；卸载及 HMR 清理资源，往返缓存保留原场景。
- state / ui 只建立职责入口，尚无游戏状态或 HUD；这些层在 S1/S4 实现。本轮未改动产品规则、评分和通关阈值。

## 验证

| 检查 | 真实结果 |
|---|---|
| npm ci | 成功，按锁文件重装 25 个包 |
| npm run build | 成功，包含 tsc --noEmit；TypeScript strict 开启 |
| npm run preview | 成功启动本机生产构建预览，HTTP 200，页面标题和挂载点正确 |
| 1920×1080 画面 | Windows Codex 内置浏览器：25 格三维地块可见，无建筑或模型冒充完成品 |
| 相机交互 | 原生拖动改变朝向、滚轮改变缩放；复位按钮恢复初始视角；已观察并保存截图 |
| 1024×768 与重载 | 地块完整可见，canvas 数量为 1，页面无横向溢出；恢复 1920×1080 后仍正常 |
| 浏览器日志 | 本轮捕获的 warn/error 为空 |
| 生命周期 | 代码核验只有一个 setAnimationLoop；清理方法幂等。未进行 GPU 资源计数或 HMR 压力测试 |

浏览器截图和原始检查记录位于本地 output/s0-acceptance，不进入 Git。预览服务在验收结束后停止；再次查看请运行 npm run dev。未把本地地址当作生产部署。

## 已知限制

- 入口 JavaScript 为 556.51 kB，gzip 137.81 kB，Vite 提示超过 500 kB。构建通过，未隐藏警告或仅为消除警告拆包。
- npm 版本查询曾遇到一次 ECONNRESET；限定超时/重试后安装与 npm ci 均成功，未修改全局 npm 配置。
- 使用 Windows Codex 内置浏览器验收，未独立完成 Chrome/Edge 稳定版兼容矩阵、真实手机、FPS 测量或无 WebGL2 环境模拟。
- 未安装 Vitest，S0 没有可独立测试的摆放/经济规则；S1 加入必要的纯规则与状态回归测试。

## 下一阶段

S1：建筑实例与占地校验、拾取与 Hover 预览、放置/移动/删除、移动取消和单步撤销。验证边界、重叠、数量上限、移动排除自身和相机拖动不误放；经济结算在 S2 验收。
