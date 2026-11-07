# The Last Plot 项目规则

## 入口与工具链

- 采用 Vite + TypeScript strict + Three.js + 原生 HTML/CSS；包管理器为 npm，提交 package-lock.json。
- 安装：npm ci；开发：npm run dev；检查：npm run typecheck；生产构建：npm run build；生产预览：npm run preview。
- 浏览器首测为 Windows Chrome/Edge，需 WebGL2。阶段范围与规则依据见 docs/PRD.md、docs/TECH_SPEC.md、docs/COLLABORATION_RUNBOOK.md。

## 层与边界

- src/main.ts 只组合各层；src/data/gameConfig.ts 是规则配置源。
- src/domain 只处理逻辑数据与纯函数，不导入 Three.js 或 DOM；src/state 管理状态与撤销。
- src/scene 负责渲染、坐标转换和拾取；src/ui 通过 store 更新界面。
- 逻辑 x 向东、y 向北，对应世界 X、-Z；单位和中心偏移统一在 scene/coordinates.ts。
- 整个场景只有一个渲染循环；卸载和 HMR 必须释放相机控制、监听器、几何体、材质和 renderer。

## 验收记录

- 按用户当前指定阶段实现，先验证类型、构建和相关浏览器交互，再提交；不要跳阶段宣称游戏完成。
- 将阶段结果记入 docs/reports，保留此前文档修订验收记录的历史范围；不要把纯规则脚本结果当作应用测试。
- output 为本地交付及验证产物，不进入版本提交。真实 Lux3D 资产接入在 S3 验收，S0 不需要虚构模型记录。
