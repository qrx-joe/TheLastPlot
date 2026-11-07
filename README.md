# 最后一块地 The Last Plot

一款以空间规划与外部性取舍为主题的 3D 益智游戏。当前为 S0 工程骨架：显示可旋转、缩放的 5×5 地块，建筑摆放和经济结算将在后续阶段实现。

## 本地运行

需要 Node.js 20.19 及以上的 20.x，或 22.12+（本次使用 24.13.0），以及 npm。依赖版本由 package-lock.json 固定。

```sh
npm ci
npm run dev
```

终端会显示本机预览地址。拖动旋转相机，滚轮缩放，点击「复位视角」恢复初始视角。浏览器需支持 WebGL2。

```sh
npm run typecheck
npm run build
npm run preview
```

生产构建输出到 dist；preview 仅用于本地验收。当前尚未部署。

## 结构

- index.html 与 src/styles：静态界面及样式。
- src/main.ts：创建场景、绑定入口事件和卸载清理。
- src/data：单一配置源。
- src/domain：逻辑类型及后续纯规则。
- src/scene：相机、灯光、地块、渲染循环与统一坐标转换。
- src/state、src/ui：后续状态与 HUD 的职责边界，S0 未实现游戏逻辑。
- [开发文档](docs/README.md)：产品规则、技术规范和阶段验收。
- [S0 验收记录](docs/reports/2026-11-08-s0-bootstrap.md)：实际构建、浏览器检查和当前限制。

当前无外部模型或素材；真实 Lux3D 核心建筑将在 S3 接入并记录来源。S0 的几何地块不能作为完整游戏或比赛作品交付。
