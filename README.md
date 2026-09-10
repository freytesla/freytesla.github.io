# FREY — Personal Universe (v2 主站)（v3 重构版见 [`v3/`](v3/)）

Frey 的个人网站。**v2 已作为主站放在仓库根目录**（GitHub Pages 直接发布为 frey.github.io）。
旧版网站整体保留在 [`old-site/`](old-site/) 文件夹里，不影响主站。

**配色**：马尔斯绿 Marrs Green `#01847F`（2017 全球最受欢迎颜色）· 黑 `#050706` · 白 `#F5F6F1`
**字体**：Syne（展示）/ Space Grotesk（正文）/ Space Mono（标签）/ Noto Sans SC（中文）
**风格**：极简矢量 · awwwards 叙事型 · 多动效

## 页面结构

| 文件 | 内容 |
| --- | --- |
| `index.html` | 加载页 → Hero 3D 拉长石项链 → Slogan 滚动 → 照片墙 → 选择页 → 尾页（联系方式） |
| `work.html` | 工程作品（横向滚动画廊）+ 绘画作品（画框画廊） |
| `hobby.html` | F1 车模（可调速度）/ 音乐剧票根 / 唱片机（WebAudio 实时合成音乐）/ 我喜欢的人物 |
| `ask.html` | 提问箱（左侧题目 + 按钮跳转外部提问箱，右侧插图） |
| `404.html` | 故障风「信号丢失」：故障 404 + 终端打字 + 扫描线 + 漂浮钻石粒子 |
| `necklace-physics.html` | **物理项链实验页**：Verlet 重力链 + 拖拽回弹，自动加载 `assets/models/` 里的 Blender GLB（见 [NECKLACE-PHYSICS.md](NECKLACE-PHYSICS.md)） |

**加载页（全站统一）**：黑底细绳垂下、马尔斯绿吊坠落下轻弹 → FREY 字母逐字升起 → 底部进度条 → 幕布上掀退出。
加载页会等**真正就绪**再放行（拉丁字体加载完成 + 页面注册的关键资源），避免 FREY 用 fallback 字体闪现；接入后续 3D / GLB 加载时，在页面代码里 `FreyBoot.add(loadPromise, { weight, progress })` 即可让加载页一并等待（见 `assets/js/ui.js` 顶部说明）。

## 本地预览

> ⚠️ 3D 演示页 `necklace-physics.html` 与**首页 hero 的项链**都是物理版（ES Module）；
> 首页项链直接双击 `index.html` 会退化为静态图。
> ⚠️ 3D 演示页 `necklace-physics.html` 用了 ES Module，**不能直接双击打开**（浏览器会拦截成白屏）。
双击 **`start-hero.bat`** = 打开首页（hero 物理项链）
> **双击 `start-demo.bat`** = 打开物理项链演示页（带重力滑块/粒子）；或手动：

```powershell
cd D:\Desktop\frey.github.io
python -m http.server 8123
# 浏览器打开 http://localhost:8123/necklace-physics.html
```
## 需要你替换的内容（代码里都有注释标记）

1. **提问箱地址** — `assets/js/ask.js` 里的 `ASK_URL`（问卷星/腾讯问卷等）
2. **照片墙中心照片** — `index.html` 里 `.photos__portrait` 内的 SVG 剪影，换成你的照片
3. **联系方式 / 社交链接** — `index.html` 底部 `site-foot__socials`（邮箱/GitHub/Bilibili/Instagram）
4. **work 项目** — `work.html` 里 6 张项目卡和 6 幅画（SVG 占位图，可换图片）
5. **hobby 人物** — `hobby.html` `#people` 里 4 张人物卡（示例人物，替换成你喜欢的）
6. **音乐剧票根** — `hobby.html` `#musical` 里的票根文字（剧名/日期/座位）

## 技术要点

- 3D 项链：Three.js 程序化生成（72 节链环 + 拉长石坠子），`MeshPhysicalMaterial.iridescence` 模拟虹彩，可拖拽旋转、惯性回弹、自动旋转，离屏自动暂停；WebGL 不可用自动降级为静态项链图
- 字体：Syne / Space Grotesk / Space Mono / Bricolage Grotesque 拉丁字集已**自托管**到 `assets/fonts/`（OFL，本地加载不受网络影响）；中文 `Noto Sans SC` 改为**异步**加载（不阻塞首帧，未加载到前用系统 CJK 兜底）
- 唱片机：WebAudio 生成式音乐，4 种风格（Lo-fi / Ambient / Jazz / Electro）实时合成，带频谱可视化
- 平滑滚动：Lenis（带看门狗，失效自动回退原生滚动）；滚动揭示：IntersectionObserver；照片墙：鼠标滑动生成拍立得
- 自定义光标、页面切换过渡、移动端全屏菜单、`prefers-reduced-motion` 降级
- 404 故障字：CSS 多层 `clip-path` glitch（绿/白双色）+ 抖动；加载页进度与吊坠绳子同步（`--lp` 变量）


---

## v3 视觉重构（[`v3/`](v3/)）

Frey 个人网站的 v3 全新视觉重构版，位于 [`v3/`](v3/) 目录，与 v2 主站并存、不覆盖旧版。设计语言：「The First Solo Show」risograph 海报风（纸色 × 墨黑 × 马尔斯绿 × 荧光粉，套版错位 + 票根打孔 + 跑马灯）。预览与替换说明见 [`v3/README.md`](v3/README.md)。


