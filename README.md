# FREY — Personal Universe

Frey 的个人网站：一个以马尔斯绿、黑、白为主色的静态作品集，包含 3D 项链、工程与绘画作品、兴趣档案、提问箱和自定义 404 页面。

- 线上网站：[https://freytesla.github.io/](https://freytesla.github.io/)
- 仓库：[freytesla/freytesla.github.io](https://github.com/freytesla/freytesla.github.io)
- 部署方式：GitHub Pages，直接发布仓库根目录，无需构建

## 视觉与体验

- **配色**：马尔斯绿 `#01847F` · 墨黑 `#050706` · 纸白 `#F5F6F1`
- **字体**：Syne、Space Grotesk、Space Mono、Bricolage Grotesque 自托管；Noto Sans SC 异步加载
- **风格**：粗野主义 × 瑞士极简 × 展览叙事 × 克制的科技细节
- **动效**：统一加载页、页面切换、滚动揭示、自定义光标、文字折叠与跑马灯
- **适配**：响应式布局、触屏交互、`prefers-reduced-motion` 动效降级

## 页面结构

| 文件 | 内容 |
| --- | --- |
| `index.html` | 加载页 → 3D 拉长石项链 Hero → Slogan 跑马灯 → 视觉碎片墙 → 选择页 → 提问箱 → 联系方式 |
| `work.html` | `Things I built` 工程档案 + `Things I drew` 绘画展厅，项目与画作均可打开大图查看器 |
| `hobby.html` | 红牛 F1 3D 车模 / 音乐剧票根 / WebAudio 唱片机 / 人物收藏 |
| `ask.html` | 提问箱说明与外部问卷入口 |
| `404.html` | 故障风「信号丢失」页面：Glitch 404、终端打字、扫描线与漂浮钻石 |
| `necklace-physics.html` | 项链物理实验页：Verlet 重力链、拖拽回弹与 Blender GLB 加载 |

## 重点模块

### 3D 拉长石项链

首页 Hero 使用 Three.js 渲染项链与拉长石吊坠，支持自动旋转、拖拽惯性、离屏暂停；WebGL 不可用时自动回退为静态图。

物理实验页进一步加入基于质点和距离约束的重力链，可拖动、甩动并实时回弹。模型接入和参数说明见 [NECKLACE-PHYSICS.md](NECKLACE-PHYSICS.md)。

### 展览式作品查看器

`assets/css/exhibition.css` 与 `assets/js/exhibition.js` 提供全站复用的作品查看器：

- 工程档案与绘画作品改用展墙式排布
- 点击卡片可打开大图、标题与说明
- 支持鼠标、触屏、左右方向键和关闭按钮
- 使用原生 `<dialog>`，包含焦点恢复与滚动锁定

### 兴趣页交互

- F1 车模由 `assets/models/redbull-f1-car.glb` 驱动，支持旋转、缩放与自动展示
- 唱片机通过 Web Audio API 实时生成 Lo-fi、Ambient、Jazz、Electro 四种音乐
- 音乐剧票根、人物卡片和唱片机均包含响应式布局与滚动动效

## 目录结构

```text
.
├── index.html                  # 首页
├── work.html                   # 作品页
├── hobby.html                  # 兴趣页
├── ask.html                    # 提问箱
├── 404.html                    # 404 页面
├── necklace-physics.html       # 项链物理实验
├── assets/
│   ├── css/                    # 全站样式与展览查看器样式
│   ├── js/                     # 页面逻辑、3D、查看器与生成式音乐
│   ├── fonts/                  # 自托管字体
│   ├── img/                    # 图标、插画与材质
│   ├── materials/              # Three.js 材质贴图
│   ├── models/                 # GLB 模型
│   └── vendor/                 # Three.js、GSAP、Lenis 等本地依赖
├── blender/                    # 项链的 Blender 源文件、脚本与预览
├── backup/                     # 历史版本存档
└── old-site/                   # 旧版网站
```

## 本地预览

不要直接双击 3D 页面。通过本地 HTTP 服务访问，避免 ES Module 和模型加载被浏览器的文件协议拦截。

推荐直接双击：

- `start-hero.bat`：启动首页，并自动打开浏览器
- `start-demo.bat`：启动项链物理演示页

也可以手动运行：

```powershell
python demo_server.py 8123 index.html
```

浏览器打开 `http://localhost:8123/`。服务会自动选择空闲端口，并禁用缓存，方便开发时刷新。

只查看兴趣页也可以双击 `serve.bat`，默认地址为 `http://127.0.0.1:8712/hobby.html`。

## 需要替换的内容

1. **提问箱地址**：修改 `assets/js/ask.js` 中的 `ASK_URL`
2. **联系方式与社交链接**：修改 `index.html` 中的邮箱、GitHub、Bilibili、Instagram
3. **首页视觉碎片**：修改 `assets/js/home.js` 中 `initPhotoWall()` 的 `notes` 数组
4. **工程与绘画作品**：修改 `work.html` 中对应卡片、SVG、标题与说明
5. **兴趣页人物与票根**：修改 `hobby.html` 中 `#people` 和 `#musical`
6. **项链 Blender 模型**：将导出的 `necklace.glb` 或 `pendant.glb` 放入 `assets/models/`
7. **F1 车模**：替换 `assets/models/redbull-f1-car.glb`

> 当前 `ASK_URL` 和部分社交链接仍是占位地址，发布前建议替换。

## 部署到 GitHub Pages

仓库根目录就是发布目录。提交并推送到 `main` 后，GitHub Pages 会自动构建：

```powershell
git add -A
git commit -m "更新个人网站"
git push origin main
```

线上地址：[https://freytesla.github.io/](https://freytesla.github.io/)

## 技术栈

- HTML5 / CSS3 / 原生 JavaScript
- Three.js：3D 项链与 F1 模型
- GSAP + ScrollTrigger：滚动叙事与页面动效
- Lenis：平滑滚动，并带失效回退
- Web Audio API + Canvas：唱片机与频谱可视化
- 原生 `<dialog>`：可访问的作品查看器
- GitHub Pages：静态托管

## 其他

- `old-site/` 保留旧版网站，不影响根目录主站
- `backup/` 保存重要改版前的版本
- `blender/` 提供项链的可编辑源文件与生成脚本
- 字体授权文件位于 `assets/fonts/`
