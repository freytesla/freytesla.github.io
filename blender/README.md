# blender/ — 项链的 Blender 原生模型（可编辑）

这个文件夹让「网页里那条项链」变成 Blender 里可编辑的模型。

## 文件

| 文件 | 说明 |
| --- | --- |
| `frey_necklace.blend` | **直接双击打开**：已生成好的项链（含相机 + 三盏灯 + 灰背景，可直接渲染） |
| `frey_necklace.py` | 生成脚本：在 Blender 里跑一次就能重建（改参数重新生成） |
| `frey_necklace_preview.png` | 渲染出来的预览图（示意几何） |

## 生成的对象（都在集合 `FreyNecklace` 里）

| 对象 | 类型 | 可编辑方式 |
| --- | --- | --- |
| `Frey_Chain` | **曲线**（NURBS，带圆形截面） | 拖动控制点即可改链子形状；`bevel_depth` 改粗细 |
| `Frey_Clasp` | 网格（Torus） | 缩放/旋转；竖椭圆扣环 |
| `Frey_Stone` | 网格 + Solidify/Bevel 修改器 | 改轮廓顶点，或调修改器参数（厚度/圆角） |
| `Frey_Pendant_Pivot` | 空物体 | 吊坠（扣子+石头）整体移动/旋转 |
| `Frey_Rod` / `Frey_Hook_L,R` | 网格 | 展示架（横杆 + 两个挂环），不需要可删 |

## 改参数重新生成

用任意文本编辑器打开 `frey_necklace.py`，最上面 `CFG = { ... }` 里都是参数：

```python
'anchor_x': 1.55,      # 挂点左右距离（链子跨度）
'chain_radius': 0.017, # 链绳粗细
'ring_major': 0.10,    # 扣环半径
'ring_stretch_z': 1.3, # 扣环竖向拉长
'kite_top': 0.20,      # 石头上尖（短）
'kite_bottom': 0.52,   # 石头下尖（长）
'kite_width': 0.30,    # 石头半宽
'kite_thickness': 0.20,# 石头厚度
'kite_bevel': 0.05,    # 边缘圆角（越大越圆润）
'iridescence_nm': 350, # 拉长石虹彩薄膜厚度（纳米）
```

改完在 Blender 里：Scripting 工作区 → Open → 选 `frey_necklace.py` → Run Script（Alt+P），
或者命令行：

```bash
"D:\Blander\blender.exe" --background --python "D:\Desktop\frey.github.io\blender\frey_necklace.py"
```

## 导出给网页用

1. Blender：`File → Export → glTF 2.0 (.glb/.gltf)`
2. 勾选要导出的对象（项链本体即可，展示架可不要）
3. 存成 `assets/models/necklace.glb`（或 `pendant.glb`）
4. 刷新网页 —— 右上角会显示「模型：Blender 模型」，网页会自动缩放、居中，并套用拉长石虹彩材质

> 皮肤/材质：脚本里已给石头加了 **Thin Film（薄膜）350nm** 模拟拉长石虹彩，
> 导出 glTF 时会带上 `KHR_materials_iridescence`，three.js 支持。

