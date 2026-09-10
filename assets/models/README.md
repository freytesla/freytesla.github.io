# assets/models — 你的 Blender 模型放这里

`necklace-physics.html`（物理项链演示）会自动按顺序尝试加载：

1. `assets/models/necklace.glb`（推荐：整条项链，含吊坠）
2. `assets/models/pendant.glb`（只有吊坠）

找不到就用内置的**蓝色拉长石（风筝形）**程序化兜底（页面右上角会显示当前用的模型）。

## 命名约定（网页端会自动识别）

| 对象名（Blender 里） | 作用 |
| --- | --- |
| 名字含 `pendant` / `gem` / `stone` / `bezel`（或中文 吊坠/坠/石） | 作为吊坠挂在链中点 |
| 名字含 `link` / `chain`（或中文 环/链） | 作为单个链环的造型（可选；蛇骨链不需要，网页端直接渲染细银绳） |
| 其它网格 | 全部并入吊坠（比如装饰件） |

> 只要把网格命名成上面这些关键字，网页端就会自动找到，不需要改代码。

导出步骤见仓库根目录 `NECKLACE-PHYSICS.md`。

