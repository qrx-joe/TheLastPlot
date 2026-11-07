# The Last Plot 项目规则

## 入口与工具链

- 采用 Vite + TypeScript strict + Three.js + 原生 HTML/CSS；包管理器为 npm，提交 package-lock.json。
- 安装：npm ci；开发：npm run dev；检查：npm run typecheck；测试：npm test；生产构建：npm run build；生产预览：npm run preview。
- Node 版本要求以 package.json engines 为准，当前同时满足 Vite/Vitest；Vitest 最多运行两个 worker，类型检查包含 src 和 tests。
- 浏览器首测为 Windows Chrome/Edge，需 WebGL2。阶段范围与规则依据见 docs/PRD.md、docs/TECH_SPEC.md、docs/COLLABORATION_RUNBOOK.md。

## 层与边界

- src/main.ts 只组合各层；src/data/gameConfig.ts 是规则配置源。
- src/domain 只处理逻辑数据与纯函数，不导入 Three.js 或 DOM；src/state 管理状态与撤销。
- src/scene 负责渲染、坐标转换和拾取；src/ui 通过 store 更新界面。
- 逻辑 x 向东、y 向北，对应世界 X、-Z；单位和中心偏移统一在 scene/coordinates.ts。
- 整个场景只有一个渲染循环；卸载和 HMR 必须释放相机控制、监听器、几何体、材质和 renderer。
- src/data/assetConfig.ts 只登记已经提供的模型；AssetLoader 是 GLB 共享几何体、材质和纹理的所有者，删除单栋建筑不释放缓存资源。来源与哈希见 docs/ASSET_RECORD.md。

## 验收记录

- 按用户当前指定阶段实现，先验证类型、构建和相关浏览器交互，再提交；不要跳阶段宣称游戏完成。
- 将阶段结果记入 docs/reports，保留此前文档修订验收记录的历史范围；不要把纯规则脚本结果当作应用测试。
- output 为本地交付及验证产物，不进入版本提交。真实 Lux3D 资产接入在 S3 验收，S0 不需要虚构模型记录。

## 测试地图

- tests/grid.test.ts：占地、边界、坐标转换、放置冲突、配额与设施互斥。
- tests/gameStore.test.ts：预算、动作、移动排除自身、失败不变、单步撤销和重置。
- tests/pointerGesture.test.ts：5 CSS 像素阈值及拖出再拖回不误建造；真实拾取与相机冲突还需浏览器验收。
- tests/economy.test.ts：逐占地格污染、预览一致性、设施距离、满意度、净收益、完整性、评分与称号；非法布局不能获胜。
- tests/submission.test.ts：提交/继续/重置状态边界、结果期间禁止编辑、撤销快照保留及移动/删除后的派生指标重算。
- tests/intro.test.ts：初始 intro 禁止编辑、START 只接受一次、重置统一回到空 playing；说明弹窗的键盘与焦点另做浏览器验收。
- tests/assetLoader.test.ts：根路径/非根路径、模型比例与贴地、并发缓存与克隆、缺失/失败状态、HTML 误返回、退订及晚到资源释放；真实 GLB 和贴图显示仍需浏览器验收。
