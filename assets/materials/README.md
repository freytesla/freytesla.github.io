# assets/materials — 贴图说明（怎么换）

这套贴图就是普通图片文件。**改贴图 = 换图片**，两种做法：

## 当前用到的贴图

| 文件 | 用在哪里 |
| --- | --- |
| `labradorite/front.jpg` | 拉长石石头**正面**的颜色/石纹 |
| `labradorite/back.jpg` | 拉长石石头**背面**的颜色/石纹 |
| `silver/color.jpg` | 链子 + 椭圆环的颜色 |
| `silver/roughness.jpg` | 链子表面的粗糙/光滑分布 |

> 石头材质是 `color: 0xffffff`（白色 = 不染色），所以 front/back 图片会**原样显示**。
> front.jpg / back.jpg 目前是占位图（正面偏蓝、背面偏青），直接换成你自己的两张图即可。

## 方法一（最简单）：直接替换同名图片

1. 做一张图（jpg / png / webp 都行，建议 512–1024px）
2. **覆盖**到上面对应路径（如 `assets/materials/labradorite/front.jpg`）
3. 浏览器 **Ctrl + F5 强制刷新**

不用改代码。

## 方法二：换文件名 / 新增贴图

打开 `assets/js/necklace-physics.js`，搜 `assets/materials`，改单引号里的路径即可。
链子贴图有 `repeat: [1, 5]`（沿细管重复 5 次），觉得太密/太疏就改这个数。

## 石头正/背是分开的

代码把石头按三角面法线拆成 前/后/侧 三片网格（`splitStoneFaces`）：
- 法线朝 +Z 的三角 → `front.jpg`
- 法线朝 −Z 的三角 → `back.jpg`
- 侧边/圆角 → 沿用 `front.jpg`

## 想省事？
直接把想要的图（或图片链接）发给 Codex，我来替换并调好。
