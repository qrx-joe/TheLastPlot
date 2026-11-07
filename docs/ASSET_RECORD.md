# Lux3D 资产来源记录

记录日期：2026年11月8日。当前只有 factory 使用真实 Lux3D GLB；住宅、公园和商店为原生几何占位模型，界面分别标明状态。

## factory：微缩豆腐工厂

| 项目 | 实际记录 |
|---|---|
| 平台与渠道 | Aholo Lux3D 中国站网页；登录验证由用户完成，后续生成、检查、下载和接入由助手执行 |
| 网站 | https://lux3d.aholo3d.cn/ |
| 最终网站资产 | 名称 result，资产 ID **57868**，来源「工作台生成」，页面创建时间 **2026年11月8日 05:09** |
| 登录后定位 | https://lux3d.aholo3d.cn/workspace?version=simple&assetId=57868 |
| 生成链路 | 卡通参考图 → 极速版网格 → 使用同一参考图对已有网格做材质重绘 |
| 几何参数 | 单参考图、网格模型、目标 100K；不启用四视图增强；网页任务记录标注 Lux3D-G1 |
| 材质处理 | 初次关闭 PBR，得到白模；保留白模原件后执行一次材质重绘，得到最终贴图 GLB |
| 工作文件 | public/models/factory.glb |
| 文件大小 | **7,290,192 bytes**，约 7.29 MB |
| 结构 | glTF 2.0 二进制，1 个网格、1 个材质、**83,958 个三角面** |
| 贴图 | 两张 **2048×2048 PNG**，全部内嵌；不引用外部纹理或缓冲文件 |
| 解码需求 | extensionsRequired / extensionsUsed 均为空；不需要 Draco、KTX2 或 Meshopt 解码器 |
| SHA-256 | `71fc2d854cdcd45034921066ab6e477ba247c9b9a695063f39b247e7e39e1df4` |
| 核心用途 | 作为 factory 类型实际参与放置、选中、移动、删除与撤销，承担 2×2 工厂占地、成本与污染规则；模型尺寸只影响显示 |
| 检查 | 网站三维查看器正/侧/背面检查；结构校验；游戏根路径与非根路径实际加载和操作 |

参考图提示词：

> A single stylized low-poly miniature tofu factory game asset, exterior only. One compact cream-colored industrial building on a square footprint with a warm terracotta gabled roof, one clearly visible tall brick chimney attached to the rear-left corner, two small blue-grey windows and one large front door. Toy-like friendly proportions, clean simple architectural silhouette, matte painted materials, coherent standalone object. Isometric three-quarter front view showing the front and right side, neutral light grey studio background, soft even lighting. Factory only, no ground plane, no pedestal, no trees, no people, no smoke, no detached accessories, no readable text, no logos, no multiple views.

模型为本项目通过用户授权生成的虚构建筑素材。平台原始导出 GLB 的工作副本未改写几何或贴图；显示中的缩放、居中和底部贴地由 AssetLoader 完成，游戏占地与数值仍来自固定配置。

## 原件与证据

- 项目外原件：D:/EdgeDownload/textured.glb；白模为 D:/EdgeDownload/mesh.glb；参考图为 D:/EdgeDownload/55112086c2c94ea28477aec41444946b.jpg。
- 本机归档：output/s3-acceptance/factory-textured-original.glb、factory-white-original.glb、factory-reference.jpg。原始白模为 2,016,632 bytes，SHA-256 为 `56db8ad18c1ef74960899509783d29c0c1e635b9683e8a8cc65de0404b41defa`。
- 本机生成记录：factory-web-attempt.json、factory-provider-source.json；参考图/白模/贴图正侧背面截图均在 output/s3-acceptance。
- 本机集成证据：final-layout.jpg、final-result-confirmed.jpg、final-base-loaded.jpg、html-fallback-success.jpg、browser-checks.json、factory-inspection.json 和 base-http-check.json。
- 网站本轮三项操作记录均为「已完成」，但没有在这些新任务中展示可核实的提供方任务 ID；仅记录实际展示的资产 ID，不拿旧任务编号或资产 ID 代替生成任务 ID。

output 证据保存在本机并被 Git 忽略；仓库提交实际使用的 GLB 与本记录。网页登录、验证码、密钥和私人会话不进入项目提交。

## 消耗与限制

网页显示的三项标价分别为参考图 12、网格 1、材质重绘 19，合计 **32 积分**。页面限免提示随提交减少并最终不再显示，本轮未观察到积分余额扣减；未取得逐项结算单，不把标价当作实际扣费。私人账户与授权细节仅保存在本机验收目录。

两张贴图为 2K，高于技术规范优先 1K 的目标；文件小于 15 MB 的目标已满足。FPS、GPU 内存和真机性能尚未实测，不能从本地成功加载推断性能达标。后续优化应保留当前原件与来源，并另记派生版本。
