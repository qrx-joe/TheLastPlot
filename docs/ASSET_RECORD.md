# Lux3D 资产来源记录

记录日期：2026年11月8日。当前 factory、house、shop、park 均使用真实 Lux3D 贴图 GLB，共四份独立资产；住宅模型复用为两栋。加载失败时保留明确标注的几何回退。

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

## 追加资产：住宅、商店、公园

用户批准住宅、商店、公园各生成一份，按本批网页标价共 96 积分，不含收费重试。每份参考图 12 积分、模型 20 积分；工厂原件保持不变。三张参考图复用工厂的奶油色、陶瓦色及卡通微缩风格，公园补充低饱和绿色。

| 类型 | 工作文件 | 原生 GLB 大小 | 实测三角面 | 网页预览文件名 |
|---|---|---:|---:|---|
| 住宅 | public/models/house.glb | 7,062,044 bytes | 85,534 | lux3d_g1_33246.glb |
| 商店 | public/models/shop.glb | 7,223,552 bytes | 87,920 | lux3d_g1_33267.glb |
| 公园 | public/models/park.glb | 6,956,688 bytes | 87,564 | lux3d_g1_33283.glb |

三份均来自 Lux3D 中国站工作台：卡通参考图、标准版、网格模型、100K 目标面数、PBR 开启、单图、不做四视图增强。任务卡使用“Lux3D-G1 图生 3D 起始流”标签；记录实际网页设置和输出文件名，不据此推断未核实的 API 版本或将文件名数字冒充任务 ID。

每份均为 1 个网格、1 个材质，内嵌两张 2048×2048 PNG（颜色及金属度/粗糙度），无外部缓冲/纹理引用，无必需压缩扩展。住宅两栋共享同一缓存资源，未重复生成。公园的显示高度上限调整为 1.4，保留模型比例并适配 2×2 占地；逻辑占地和游戏规则不变。

| 类型 | SHA-256 |
|---|---|
| 住宅 | `dccc3774724100ab32df35098e32cbd6ebe1020d7262efe37505577b1a5d13f1` |
| 商店 | `6557f34f461f431411a18ec5c0d663537733d79be5337a285ba4ee1581b047e0` |
| 公园 | `6facd091465809943cb5d1a22699118f32183bf812b986f3c962446aa0910e63` |

原生贴图 GLB、参考图、检查结果、计划和逐项执行记录保存在本机 `output/asset-expansion-20261108/`。住宅 ZIP 中的 MODEL.glb 仅带占位贴图，已保留该源包，游戏采用另行原生导出的完整贴图 GLB；公园导出前切换至已有贴图视图。两者均为交付文件选择，没有追加材质生成或收费重试。

本批六次生成各提交一次，按报价累计 96 积分；期间账户余额出现外部变动，未取得逐项结算单，不用余额总差推断实际结算。三份均完成后未再发起生成。整批接入和线上验收见 [追加资产验收](reports/2026-11-08-lux3d-buildings.md)。

四份 GLB 共约 28.53 MB，均使用 2K 贴图。真实手机、低配 GPU/FPS 和慢网性能仍未验收。

## 工厂原件与证据

- 项目外原件：D:/EdgeDownload/textured.glb；白模为 D:/EdgeDownload/mesh.glb；参考图为 D:/EdgeDownload/55112086c2c94ea28477aec41444946b.jpg。
- 本机归档：output/s3-acceptance/factory-textured-original.glb、factory-white-original.glb、factory-reference.jpg。原始白模为 2,016,632 bytes，SHA-256 为 `56db8ad18c1ef74960899509783d29c0c1e635b9683e8a8cc65de0404b41defa`。
- 本机生成记录：factory-web-attempt.json、factory-provider-source.json；参考图/白模/贴图正侧背面截图均在 output/s3-acceptance。
- 本机集成证据：final-layout.jpg、final-result-confirmed.jpg、final-base-loaded.jpg、html-fallback-success.jpg、browser-checks.json、factory-inspection.json 和 base-http-check.json。
- 工厂生成阶段的三项操作记录均为「已完成」，当时未取得可核实的提供方任务 ID；仅记录实际展示的资产 ID，不拿旧任务编号或资产 ID 代替生成任务 ID。

output 证据保存在本机并被 Git 忽略；仓库提交实际使用的 GLB 与本记录。网页登录、验证码、密钥和私人会话不进入项目提交。

## 工厂生成消耗与限制

网页显示的三项标价分别为参考图 12、网格 1、材质重绘 19，合计 **32 积分**。页面限免提示随提交减少并最终不再显示，本轮未观察到积分余额扣减；未取得逐项结算单，不把标价当作实际扣费。私人账户与授权细节仅保存在本机验收目录。

两张贴图为 2K，高于技术规范优先 1K 的目标；文件小于 15 MB 的目标已满足。FPS、GPU 内存和真机性能尚未实测，不能从本地成功加载推断性能达标。后续优化应保留当前原件与来源，并另记派生版本。
