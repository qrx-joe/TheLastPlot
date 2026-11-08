# 发布与演示材料记录

本记录保留首次上线时的范围：仅工厂使用真实模型，视频为 160 秒。后续四类真实资产、线上复测和新版演示材料见[追加资产验收](2026-11-08-lux3d-buildings.md)。

日期：2026-11-08。代码基线：`af253ef`。本轮准备 Vercel 部署，并按用户补充的上海站通知制作实际操作视频与项目报告；未发邮件、填表或提交参赛材料。通知中的“11月7日”已由用户确认为笔误，具体截止时间以现场安排为准。

## 已完成的交付物

| 文件（本机 output 目录，不进入 Git） | 实际状态 |
|---|---|
| `demo-video/TheLastPlot-demo-zh.mp4` | 160 秒，1440×810，25 fps，H.264 / yuv420p，无音轨，23 条中文字幕，3,829,927 bytes |
| `pdf/TheLastPlot-project-report.pdf` | 6 页 A4，已逐页渲染并检查；含玩法、实际截图、Lux3D 使用、测试证据和未验证范围 |
| `demo-video/提交邮件草稿.txt` | 本地草稿，队名、队长、官网注册账号须填写；未发送 |
| `demo-video/captions.srt`、`captions.ass` | 可复用字幕；实际 MP4 已烧录，无需单独加载字幕 |

视频来自独立浏览器中的本机生产构建，使用 Playwright 真实鼠标点击和拖动，再用 FFmpeg 添加字幕及画面外的字幕区。未调用 store、未注入游戏布局或改写指标，没有旁白和配乐。原始 WebM、录制脚本、逐步界面断言、编码检查与抽帧检查均保存在 `output/demo-video/`。

## 本轮验证

- 类型检查、8 个文件的 99 项测试和生产构建通过；入口 JS 约 685.04 kB，保留大于 500 kB 的构建体积提示。
- 发布包为 5 个文件，GLB 为 7,290,192 bytes，源文件与本机 HTTP 响应 SHA-256 相同：`71fc2d854cdcd45034921066ab6e477ba247c9b9a695063f39b247e7e39e1df4`。
- 实际录制先完成一套满意度 55、净收益 28 的失败布局；提交提示还差 15，继续调整保留建筑。
- 住宅移出下风向后，平均满意度先变为 72.5，再变为 90；移动前后剩余预算均为 3。公园方案得到 73 分。
- 撤销最后一次移动后回到 72.5；重新移动恢复。删除公园全额退回 18 预算，余额由 3 回到 21。
- 调整两栋住宅并放置商店后，满意度 85、净收益 42、花费 74、余额 6，提交得到 83 分、称号“配置能手”。
- 实录中无浏览器 error；有 4 条 GPU ReadPixels stall warning，来自录制/截图时的驱动提示，不据此宣称性能或 FPS 达标。
- 最终 MP4 已完整解码检查；ffprobe 核对时长、尺寸、编码和无音轨。已检查 16 张时间采样图，以及满意度变化和商店结果的大图，字幕没有遮住游戏主体。

工厂是当前唯一真实 Lux3D 模型；住宅、公园和商店为明确标注的几何占位。视频与 PDF 均保留这一说明。

## Vercel 部署与线上验收

新增 `vercel.json` 固定 Vite、安装/构建命令和 dist 输出；`.vercelignore` 排除本地 output、依赖与文档；`.gitignore` 排除项目关联目录 `.vercel/`。配置 JSON 与本机发布包检查通过。

登录流程最初出现过 Vercel API 的 TLS 连接中断；连通性复查恢复后重试，用户完成账号授权，随后实际部署成功。

- 正式地址：https://the-last-plot.vercel.app/
- 项目：`qrx-joes-projects/the-last-plot`。
- 部署：`dpl_9e54Ni3AMfeYtZ7csJCJjS6HaamB`，生产环境 `READY`。
- 不变的部署地址：https://the-last-plot-q6crr4f1l-qrx-joes-projects.vercel.app/
- `npm run verify:release -- --url https://the-last-plot.vercel.app/` 通过：HTML、JS、CSS、favicon、GLB 均为 HTTP 200，内容哈希与本地发布包一致；工厂 Content-Type 为 `model/gltf-binary`。
- 从正式地址另开独立浏览器，完整复测失败后继续、公园 90/28/73、商店 85/42/83、移动、撤销与删除退款；均通过。模型状态为 Lux3D 就绪，HTTP GLB 哈希匹配源文件，无浏览器 error，截图时有 4 条 ReadPixels 驱动 warning。
- 线上证据：`output/s5-acceptance/vercel-production-http.json`、`rehearsal-evidence.json` 及对应截图；报告中的 origin 是正式域名。视频仍为此前本机生产构建实录，两者不混用。

已在应用内浏览器保留正式试玩入口。本轮上线验证不覆盖真实手机、低配 GPU/FPS、所有网络环境或首次玩家体验。

## 提交清单与未知项

用户提供的通知要求“PDF/PPT 二选一 + Demo 链接/视频二选一 + 官网注册手机号或邮箱”。当前可用附件是项目报告 PDF 和实际视频；本轮没有制作路演 PPT。官网组队、选题提交、成功截图、上海站组队表及注册信息的完成情况未知。飞书 CLI 缺少 user 登录态，本轮未读取或改写组队表。

收件人为通知中的 `nanjia@qunhemail.com`；发送草稿前须填写真实队伍与注册信息。文档和邮箱地址的出现不等同于用户授权对外发送。

结构影响：产品的 domain、state、scene、ui 均未修改；改动仅涉及部署配置、说明文档与被 Git 忽略的本地媒体产物。仓库原有 `package.json` 与 `scripts/` 未提交变更保留。本轮未提交 Git、未推送远程；部署通过 CLI 完成，尚未配置 Git 自动发布。
