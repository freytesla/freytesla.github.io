# -*- coding: utf-8 -*-
"""
Frey - 拉长石项链 · Blender 原生重建脚本
=============================================
按网页里那套参数，在 Blender 里生成可编辑的：链子(曲线) / 扣子(竖椭圆环) / 风筝形拉长石 / 展示架

用法
----
1) Blender 里：顶部切到 "Scripting" 工作区 -> Open -> 选这个文件 -> Run Script (Alt+P)
2) 或命令行： blender --background --python frey_necklace.py

改完导出给网页用
----------------
File -> Export -> glTF 2.0 (.glb/.gltf) -> 存成 assets/models/necklace.glb
（网页会自动加载，右上角会显示「模型：Blender 模型」）

所有尺寸/材质参数都在下面的 CFG 里，直接改数字即可。
"""

import bpy
import math
import os

# ============================================================
# 参数（数值与网页 assets/js/necklace-physics.js 一致，单位：米）
# ============================================================
CFG = {
    # ---- 链子 ----
    'anchor_x': 1.55,          # 两端挂点 X（左右）
    'anchor_z': 1.15,          # 两端挂点 Z（高度）
    'chain_radius': 0.017,     # 链绳半径（细绳）
    'chain_count': 64,         # 质点数量（用于算链长）
    'chain_seg': 0.09,         # 每节长度
    'chain_ctrl': 13,          # 曲线控制点数量（越多越贴合，仍可编辑）

    # ---- 扣子（竖椭圆环）----
    'ring_major': 0.10,        # 环主半径
    'ring_minor': 0.030,       # 环管半径（粗一点）
    'ring_stretch_z': 1.3,     # 竖向拉长
    'ring_offset_z': -0.09,    # 相对链子最低点的高度

    # ---- 石头（风筝形：上短下长）----
    'kite_top': 0.20,          # 上尖（短）
    'kite_bottom': 0.52,       # 下尖（长）
    'kite_width': 0.30,        # 半宽
    'kite_thickness': 0.20,    # 总厚度（含倒角）
    'kite_bevel': 0.05,        # 边缘圆角（越大越圆润）
    'kite_bevel_seg': 6,
    'kite_offset_z': -0.36,    # 石头上尖相对链子最低点的高度
    'kite_curve_seg': 40,      # 轮廓平滑度

    # ---- 展示架（横杆 + 两个挂环）----
    'include_rack': True,
    'rod_radius': 0.028,
    'rod_length': 3.30,
    'rod_z': 1.24,
    'hook_major': 0.06,
    'hook_minor': 0.02,

    # ---- 材质 ----
    'silver_roughness': 0.15,
    'stone_roughness': 0.12,
    'stone_color': (0.10, 0.22, 0.48, 1.0),   # 蓝色拉长石底（用贴图时会被覆盖）
    'use_textures': True,                     # 尝试使用 assets/materials 里的贴图
    'iridescence_nm': 350.0,                  # 薄膜厚度(纳米)：拉长石的虹彩闪光
    'iridescence_ior': 1.4,

    # ---- 其它 ----
    'clear_scene': True,       # 清空当前场景（默认立方体/灯/相机）
    'collection': 'FreyNecklace',
}

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


# ============================================================
# 小工具
# ============================================================
def clean_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for block in (bpy.data.meshes, bpy.data.curves, bpy.data.materials):
        for item in list(block):
            if item.users == 0:
                block.remove(item)


def get_collection(name):
    col = bpy.data.collections.get(name)
    if col is None:
        col = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(col)
    return col


def move_to_collection(obj, col):
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    col.objects.link(obj)


def set_principled(bsdf, key, value):
    """兼容不同 Blender 版本：输入名不存在就跳过"""
    if key in bsdf.inputs:
        try:
            bsdf.inputs[key].default_value = value
            return True
        except Exception:
            pass
    return False


def make_texture_node(nt, path, label, non_color=False):
    if not os.path.exists(path):
        return None
    node = nt.nodes.new('ShaderNodeTexImage')
    node.label = label
    node.image = bpy.data.images.load(path, check_existing=True)
    if non_color:
        node.image.colorspace_settings.name = 'Non-Color'
    return node


# ============================================================
# 材质
# ============================================================
def make_silver_material():
    mat = bpy.data.materials.new('Frey_Silver')
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes.get('Principled BSDF')
    set_principled(bsdf, 'Base Color', (0.85, 0.88, 0.87, 1.0))
    set_principled(bsdf, 'Metallic', 1.0)
    set_principled(bsdf, 'Roughness', CFG['silver_roughness'])
    set_principled(bsdf, 'IOR', 1.45)
    if CFG['use_textures']:
        col = make_texture_node(nt, os.path.join(REPO_ROOT, 'assets', 'materials', 'silver', 'color.jpg'), 'SilverColor')
        rough = make_texture_node(nt, os.path.join(REPO_ROOT, 'assets', 'materials', 'silver', 'roughness.jpg'), 'SilverRough', non_color=True)
        if col:
            nt.links.new(col.outputs['Color'], bsdf.inputs['Base Color'])
        if rough:
            set_principled(bsdf, 'Roughness', CFG['silver_roughness'])
            nt.links.new(rough.outputs['Color'], bsdf.inputs['Roughness'])
    return mat


def make_stone_material(name, tex_name, color):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes.get('Principled BSDF')
    set_principled(bsdf, 'Base Color', color)
    set_principled(bsdf, 'Metallic', 0.0)
    set_principled(bsdf, 'Roughness', CFG['stone_roughness'])
    set_principled(bsdf, 'IOR', 1.6)
    # 拉长石的虹彩：Blender 4.x 的 Principled 有 Thin Film，导出 glTF 会带 KHR_materials_iridescence
    set_principled(bsdf, 'Thin Film Thickness', CFG['iridescence_nm'] * 1e-9)
    set_principled(bsdf, 'Thin Film IOR', CFG['iridescence_ior'])
    set_principled(bsdf, 'Coat Weight', 1.0)          # Blender 4.x
    set_principled(bsdf, 'Clearcoat', 1.0)            # Blender 3.x
    if CFG['use_textures'] and tex_name:
        tex = make_texture_node(nt, os.path.join(REPO_ROOT, 'assets', 'materials', 'labradorite', tex_name), 'StoneColor')
        if tex:
            nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    return mat


# ============================================================
# 链子：解悬链线 -> 可编辑的 NURBS 曲线（带圆形截面 = 细银绳）
# ============================================================
def solve_catenary_a(span, length, lo=0.05, hi=50.0):
    """求 a 使 2*a*sinh(span/2/a) == length"""
    half = span * 0.5
    for _ in range(200):
        mid = (lo + hi) * 0.5
        arc = 2.0 * mid * math.sinh(half / mid)
        if arc > length:
            lo = mid
        else:
            hi = mid
    return (lo + hi) * 0.5


def catenary_points(span, length, ctrl, z_at_anchor):
    a = solve_catenary_a(span, length)
    c = z_at_anchor - a * math.cosh((span * 0.5) / a)
    pts = []
    for i in range(ctrl):
        t = i / (ctrl - 1.0)
        x = -span * 0.5 + span * t
        z = c + a * math.cosh(x / a)
        pts.append((x, 0.0, z))
    return pts, a, c


def build_chain(col, mat):
    span = CFG['anchor_x'] * 2.0
    length = CFG['chain_count'] * CFG['chain_seg']
    pts, a, c = catenary_points(span, length, CFG['chain_ctrl'], CFG['anchor_z'])

    cu = bpy.data.curves.new('Frey_Chain', 'CURVE')
    cu.dimensions = '3D'
    cu.resolution_u = 12
    cu.bevel_depth = CFG['chain_radius']          # 圆形截面 -> 细银绳（蛇骨链）
    cu.bevel_resolution = 4
    cu.use_fill_caps = True
    sp = cu.splines.new('NURBS')
    sp.points.add(len(pts) - 1)
    for p, (x, y, z) in zip(sp.points, pts):
        p.co = (x, y, z, 1.0)
    sp.use_endpoint_u = True
    sp.order_u = 4

    obj = bpy.data.objects.new('Frey_Chain', cu)
    col.objects.link(obj)
    obj.data.materials.append(mat)
    return obj, a, c


# ============================================================
# 扣子：竖椭圆环（环平面 XZ，链子穿过环心）
# ============================================================
def build_clasp(col, mat, low_z):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=CFG['ring_major'],
        minor_radius=CFG['ring_minor'],
        major_segments=48,
        minor_segments=16,
        location=(0.0, 0.0, low_z + CFG['ring_offset_z']),
        rotation=(math.radians(90.0), 0.0, 0.0),   # 环平面转到 XZ（面朝镜头）
    )
    obj = bpy.context.active_object
    obj.name = 'Frey_Clasp'
    obj.scale = (1.0, CFG['ring_stretch_z'], 1.0)  # 竖向拉长（旋转后 local Y = 世界 Z）
    move_to_collection(obj, col)
    obj.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return obj


# ============================================================
# 风筝形拉长石：轮廓 -> Solidify(厚度) + Bevel(圆角)
# 上短下长，面朝镜头（法线沿 -Y）
# ============================================================
def kite_outline(top, bottom, width, seg):
    """按网页里的二次曲线轮廓采样成点列（返回 XZ 平面上的点）"""
    quads = [
        ((0.0, top), (width * 0.82, top * 0.55), (width, 0.0)),
        ((width, 0.0), (width * 0.78, -bottom * 0.45), (0.0, -bottom)),
        ((0.0, -bottom), (-width * 0.78, -bottom * 0.45), (-width, 0.0)),
        ((-width, 0.0), (-width * 0.82, top * 0.55), (0.0, top)),
    ]
    pts = []
    for (p0, c1, p1) in quads:
        for i in range(seg):
            t = i / float(seg)
            mt = 1.0 - t
            x = mt * mt * p0[0] + 2 * mt * t * c1[0] + t * t * p1[0]
            y = mt * mt * p0[1] + 2 * mt * t * c1[1] + t * t * p1[1]
            pts.append((x, y))
    return pts


def build_stone(col, mat_front, mat_back, low_z):
    pts = kite_outline(CFG['kite_top'], CFG['kite_bottom'], CFG['kite_width'], CFG['kite_curve_seg'])
    mesh = bpy.data.meshes.new('Frey_Stone')
    verts = [(x, 0.0, y) for (x, y) in pts]       # 放在 XZ 平面
    mesh.from_pydata(verts, [], [list(range(len(verts)))])
    mesh.update()

    obj = bpy.data.objects.new('Frey_Stone', mesh)
    col.objects.link(obj)
    obj.location = (0.0, 0.0, low_z + CFG['kite_offset_z'])

    # 厚度（沿 Y 挤出，居中）
    sol = obj.modifiers.new('Solidify', 'SOLIDIFY')
    sol.thickness = CFG['kite_thickness']
    sol.offset = 0.0

    # 边缘圆角（光滑过渡）
    bev = obj.modifiers.new('Bevel', 'BEVEL')
    bev.width = CFG['kite_bevel']
    bev.segments = CFG['kite_bevel_seg']
    bev.limit_method = 'ANGLE'
    bev.angle_limit = math.radians(30.0)

    obj.data.materials.append(mat_front)   # 正面
    obj.data.materials.append(mat_back)    # 背面（需要的话在后侧面上指定第 2 个材质）
    for poly in mesh.polygons:
        poly.use_smooth = True
    return obj


# ============================================================
# 展示架（可选）：横杆 + 两个挂环
# ============================================================
def build_rack(col, mat):
    bpy.ops.mesh.primitive_cylinder_add(
        radius=CFG['rod_radius'], depth=CFG['rod_length'],
        location=(0.0, 0.0, CFG['rod_z']), rotation=(0.0, math.radians(90.0), 0.0))
    rod = bpy.context.active_object
    rod.name = 'Frey_Rod'
    move_to_collection(rod, col)
    rod.data.materials.append(mat)
    bpy.ops.object.shade_smooth()

    hooks = []
    for sx in (-CFG['anchor_x'], CFG['anchor_x']):
        bpy.ops.mesh.primitive_torus_add(
            major_radius=CFG['hook_major'], minor_radius=CFG['hook_minor'],
            major_segments=32, minor_segments=12,
            location=(sx, 0.0, CFG['anchor_z'] - 0.01),
            rotation=(math.radians(90.0), 0.0, 0.0))
        h = bpy.context.active_object
        h.name = 'Frey_Hook_%s' % ('L' if sx < 0 else 'R')
        move_to_collection(h, col)
        h.data.materials.append(mat)
        bpy.ops.object.shade_smooth()
        hooks.append(h)
    return [rod] + hooks


# ============================================================
# 主流程
# ============================================================
def main():
    if CFG['clear_scene']:
        clean_scene()

    sc = bpy.context.scene
    sc.unit_settings.system = 'METRIC'
    sc.unit_settings.scale_length = 1.0

    col = get_collection(CFG['collection'])

    silver = make_silver_material()
    stone_front = make_stone_material('Frey_Labradorite_Front', 'front.jpg', CFG['stone_color'])
    stone_back = make_stone_material('Frey_Labradorite_Back', 'back.jpg', CFG['stone_color'])

    chain, a, c = build_chain(col, silver)
    low_z = c + a          # 悬链线最低点
    clasp = build_clasp(col, silver, low_z)
    stone = build_stone(col, stone_front, stone_back, low_z)

    extra = []
    if CFG['include_rack']:
        extra = build_rack(col, silver)

    # 吊坠整体挂到一个空物体下，方便整体移动/旋转
    pivot = bpy.data.objects.new('Frey_Pendant_Pivot', None)
    col.objects.link(pivot)
    pivot.location = (0.0, 0.0, low_z)
    for ob in (clasp, stone):
        ob.parent = pivot
        ob.matrix_parent_inverse = pivot.matrix_world.inverted()

    bpy.ops.object.select_all(action='DESELECT')
    chain.select_set(True)
    bpy.context.view_layer.objects.active = chain

    print('')
    print('  Frey 项链已生成（集合：%s）' % CFG['collection'])
    print('  链子总长 %.2f m，最低点 z = %.3f，悬链参数 a = %.3f' % (CFG['chain_count'] * CFG['chain_seg'], low_z, a))
    print('  对象：Frey_Chain(曲线) / Frey_Clasp / Frey_Stone / Frey_Pendant_Pivot' + \
          (' / Frey_Rod / Frey_Hook_L,R' if CFG['include_rack'] else ''))
    print('  导出给网页：File → Export → glTF 2.0 (.glb) → assets/models/necklace.glb')
    print('')


if __name__ == '__main__':
    main()
