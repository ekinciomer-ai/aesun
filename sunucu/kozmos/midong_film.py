"""Midong GES · 'Nasıl Yapıldı' filmi — Blender Cycles, tamamen prosedürel.
Zaman çizelgesi (saniye, Earth Studio inişi hariç; kurguda 0:05'e eklenir):
  0–5 kanca (bitmiş saha) | 5–20 boş çöl | 20–110 sahada iş | 110–140 timelapse | 140–165 temiz final
Kullanım: blender -b -P ges_film.py -- <çıktı_klasörü>   (FPS, RES, SAMPLES, FRAMES ortam değişkenleri)
"""
import bpy, bmesh, math, random, sys, os
from mathutils import Matrix, Vector, Euler
import numpy as np

OUT = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else '/tmp/film'
os.makedirs(OUT, exist_ok=True)
FPS = int(os.environ.get('FPS', '12')); RES = tuple(int(x) for x in os.environ.get('RES', '854x480').split('x'))
SAMPLES = int(os.environ.get('SAMPLES', '10')); FRAMES = os.environ.get('FRAMES', '')  # örn. "60,300,900" ya da boş = tümü
DUR = 165
MODELLER = os.environ.get('MODELLER', '')
PARCA, PARCA_SAYISI = int(os.environ.get('PARCA', '0')), int(os.environ.get('PARCA_SAYISI', '1'))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gunes_kazik
F = lambda s: int(round(s * FPS)) + 1
random.seed(7)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene; sc.render.fps = FPS; sc.frame_start = 1; sc.frame_end = F(DUR)

# ======================= malzemeler =======================
def panel_tex(path):
    W, H = 512, 940; img = np.zeros((H, W, 3), np.float32); img[:] = (0.72, 0.74, 0.76)
    fx = fy = 9; cw, ch = (W - 2 * fx) / 6, (H - 2 * fy) / 22
    for i in range(6):
        for j in range(22):
            x0, y0 = int(fx + i * cw + 2), int(fy + j * ch + 2); x1, y1 = int(fx + (i + 1) * cw - 2), int(fy + (j + 1) * ch - 2)
            img[y0:y1, x0:x1] = (0.03, 0.045, 0.085)
            for b in range(1, 5): bx = int(x0 + b * (x1 - x0) / 5); img[y0:y1, bx:bx + 1] = (0.22, 0.24, 0.27)
    mid = H // 2; img[mid - 3:mid + 3, fx:W - fx] = (0.8, 0.81, 0.83)
    im = bpy.data.images.new('panel_hucre', W, H, alpha=True)
    rgba = np.ones((H, W, 4), np.float32); rgba[..., :3] = img[::-1]          # Blender görüntüsü alttan başlar; doğrusal renk
    im.pixels.foreach_set(rgba.ravel()); im.filepath_raw = path; im.file_format = 'PNG'; im.save()
ptex = os.path.join(OUT, 'panel_hucre.png'); panel_tex(ptex)
def mat(name, color, rough=0.5, metal=0.0, coat=0.0, spec=0.5):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1); b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal; b.inputs['Coat Weight'].default_value = coat; b.inputs['Specular IOR Level'].default_value = spec
    return m, b
M_mod, b = mat('panel', (0.04, 0.05, 0.09), 0.08, 0, 0.2, 0.3)
it = M_mod.node_tree.nodes.new('ShaderNodeTexImage'); it.image = bpy.data.images.get('panel_hucre') or bpy.data.images.load(ptex); M_mod.node_tree.links.new(it.outputs['Color'], b.inputs['Base Color'])
M_back, _ = mat('panel_arka', (0.8, 0.81, 0.83), 0.35)
M_steel, _ = mat('celik', (0.62, 0.64, 0.66), 0.38, 1.0)
M_pile, _ = mat('kazik', (0.52, 0.54, 0.55), 0.45, 1.0)
M_stake, sb = mat('aplikasyon', (0.95, 0.3, 0.05), 0.6); sb.inputs['Emission Color'].default_value = (1, .3, .05, 1); sb.inputs['Emission Strength'].default_value = 0.3
M_yel, _ = mat('sari', (0.85, 0.55, 0.05), 0.45, 0, 0.3)
M_dark, _ = mat('siyah', (0.03, 0.03, 0.035), 0.6)
M_glass, gb = mat('cam', (0.1, 0.12, 0.14), 0.05); gb.inputs['Transmission Weight'].default_value = 0.6
M_card, _ = mat('karton', (0.55, 0.42, 0.27), 0.9)
M_wood, _ = mat('palet', (0.6, 0.48, 0.32), 0.85)
M_vest, _ = mat('yelek', (0.95, 0.35, 0.05), 0.7)
M_cloth, _ = mat('tulum', (0.13, 0.17, 0.25), 0.9)
M_helm, _ = mat('baret', (0.95, 0.95, 0.93), 0.35)
M_skin, _ = mat('ten', (0.55, 0.38, 0.28), 0.6)
M_white, _ = mat('beyaz', (0.85, 0.85, 0.83), 0.5)
M_trafo, _ = mat('trafo', (0.32, 0.38, 0.34), 0.5, 0.3)
M_conc, _ = mat('beton', (0.6, 0.58, 0.54), 0.9)
M_trench, _ = mat('kanal', (0.42, 0.34, 0.24), 1.0)
M_truck, _ = mat('tir', (0.75, 0.12, 0.1), 0.4, 0, 0.4)
M_tower, _ = mat('direk', (0.55, 0.57, 0.6), 0.5, 1.0)
# kum
M_sand = bpy.data.materials.new('kum'); M_sand.use_nodes = True; n = M_sand.node_tree.nodes; l = M_sand.node_tree.links
bs = n['Principled BSDF']; bs.inputs['Roughness'].default_value = 0.95
tc = n.new('ShaderNodeTexCoord')
noise = n.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value = 0.06; noise.inputs['Detail'].default_value = 8; l.new(tc.outputs['Object'], noise.inputs['Vector'])
ramp = n.new('ShaderNodeValToRGB'); ramp.color_ramp.elements[0].color = (0.5, 0.4, 0.28, 1); ramp.color_ramp.elements[1].color = (0.7, 0.58, 0.42, 1); l.new(noise.outputs['Fac'], ramp.inputs['Fac'])
vor = n.new('ShaderNodeTexVoronoi'); vor.inputs['Scale'].default_value = 60; l.new(tc.outputs['Object'], vor.inputs['Vector'])
n2 = n.new('ShaderNodeTexNoise'); n2.inputs['Scale'].default_value = 3; n2.inputs['Detail'].default_value = 10; l.new(tc.outputs['Object'], n2.inputs['Vector'])
ad = n.new('ShaderNodeMath'); ad.operation = 'ADD'; l.new(vor.outputs['Distance'], ad.inputs[0]); l.new(n2.outputs['Fac'], ad.inputs[1])
bump = n.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.35; bump.inputs['Distance'].default_value = 0.02; l.new(ad.outputs['Value'], bump.inputs['Height']); l.new(bump.outputs['Normal'], bs.inputs['Normal'])
cd_ = n.new('ShaderNodeCameraData'); mr = n.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = 200; mr.inputs['From Max'].default_value = 4000; l.new(cd_.outputs['View Distance'], mr.inputs['Value'])
hz = n.new('ShaderNodeMix'); hz.data_type = 'RGBA'; hz.inputs['B'].default_value = (0.74, 0.66, 0.58, 1); l.new(mr.outputs['Result'], hz.inputs['Factor']); l.new(ramp.outputs['Color'], hz.inputs['A']); l.new(hz.outputs['Result'], bs.inputs['Base Color'])
# toz (hacim)
M_dust = bpy.data.materials.new('toz'); M_dust.use_nodes = True; dn = M_dust.node_tree.nodes; dn.remove(dn['Principled BSDF'])
vp = dn.new('ShaderNodeVolumePrincipled'); vp.inputs['Color'].default_value = (0.78, 0.66, 0.5, 1); vp.inputs['Density'].default_value = 0.3
M_dust.node_tree.links.new(vp.outputs['Volume'], dn['Material Output'].inputs['Volume'])

# ======================= geometri yardımcıları =======================
def add_box(bm, c, s, rot=None, mi=0):
    m = Matrix.Translation(c) @ (rot.to_matrix().to_4x4() if rot else Matrix()) @ Matrix.Diagonal((*s, 1))
    r = bmesh.ops.create_cube(bm, size=1.0, matrix=m)
    for f in {f for v in r['verts'] for f in v.link_faces}: f.material_index = mi
def add_cyl(bm, c, r_, h, seg=10, mi=0, rot=None, r2=None):
    m = Matrix.Translation(c) @ (rot.to_matrix().to_4x4() if rot else Matrix())
    r = bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r_, radius2=r_ if r2 is None else r2, depth=h, matrix=m)
    for f in {f for v in r['verts'] for f in v.link_faces}: f.material_index = mi
def obj_from(bm, name, mats, loc=(0, 0, 0), link=True):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for m_ in mats: me.materials.append(m_)
    o = bpy.data.objects.new(name, me); o.location = loc
    if link: sc.collection.objects.link(o)
    return o
def key(obj, path, pairs, interp='BEZIER', idx=-1):
    for t, v in pairs:
        if idx >= 0: getattr(obj, path)[idx] = v
        else: setattr(obj, path, v)
        obj.keyframe_insert(path, index=idx, frame=F(t))
    if obj.animation_data and obj.animation_data.action:
        for fc in obj.animation_data.action.fcurves:
            if fc.data_path == path:
                for kp in fc.keyframe_points: kp.interpolation = interp

# ======================= masa parçaları (temsili 2P × 28, 30°) =======================
ML, MW, TILT = 2.384, 1.303, math.radians(30)
NC = 28; TL = NC * MW + (NC - 1) * 0.02; SL = 2 * ML + 0.03
DEP, RISE = SL * math.cos(TILT), SL * math.sin(TILT); LOW = 0.6; PITCH = 9.5; GAPX = 1.5
PX = [-TL / 2 + 1.0 + k * (TL - 2.0) / 6 for k in range(7)]
ROWS2 = ((0.12, -DEP * 0.38), (0.82, DEP * 0.32))
lib = bpy.data.collections.new('kutuphane')  # sahneye bağlanmaz; yalnız örnekleme kaynağı
def part(name, build, mats):
    bm = bmesh.new(); build(bm); o = obj_from(bm, name, mats, link=False); lib.objects.link(o); return o
def b_piles(bm):
    for x in PX:
        for fr, y in ROWS2: top = LOW + RISE * fr; add_box(bm, Vector((x, y, top / 2)), (0.1, 0.14, top), mi=0)
def b_rails(bm):
    rot = Euler((TILT, 0, 0))
    for x in PX:
        for fr, y in ROWS2: add_box(bm, Vector((x, y, LOW + RISE * fr)), (0.08, 0.08, 0.12))
        add_box(bm, Vector((x, 0, LOW + RISE / 2)), (0.07, SL * 0.92, 0.1), rot=rot)
    for s in (-SL * 0.3, SL * 0.3): add_box(bm, Vector((0, s * math.cos(TILT), LOW + RISE / 2 + s * math.sin(TILT) + 0.07)), (TL, 0.06, 0.06), rot=rot)
def b_mods(bm):
    rot = Euler((TILT, 0, 0))
    for r in (0, 1):
        s = (r - 0.5) * (ML + 0.03)
        for k in range(NC):
            x = -TL / 2 + MW / 2 + k * (MW + 0.02)
            add_box(bm, Vector((x, s * math.cos(TILT), LOW + RISE / 2 + s * math.sin(TILT) + 0.14)), (MW, ML, 0.035), rot=rot)
def b_stake(bm): add_cyl(bm, Vector((0, 0, 0.4)), 0.04, 0.8, 6, 0); add_box(bm, Vector((0, 0, 0.75)), (0.02, 0.25, 0.12), mi=0)
def b_inv(bm): add_box(bm, Vector((0, 0, 0.45)), (1.0, 0.35, 0.7)); add_box(bm, Vector((0, 0, 0.05)), (1.2, 0.6, 0.1))
P_PILE = part('kazik_seti', b_piles, [M_pile]); P_RAIL = part('konst_seti', b_rails, [M_steel])
P_MOD = part('panel_seti', b_mods, [M_mod]); P_STAKE = part('aplikasyon', b_stake, [M_stake]); P_INV = part('inverter', b_inv, [M_white])
# panel UV
me = P_MOD.data; uvl = me.uv_layers.new(name='UV')
for poly in me.polygons:
    for li in poly.loop_indices:
        v = me.vertices[me.loops[li].vertex_index].co
        u = ((v.x + TL / 2) % (MW + 0.02)) / MW; sy = ((v.y / math.cos(TILT) + SL / 2) % (ML + 0.03)) / (ML + 0.03)
        uvl.data[li].uv = (u, sy)

# ======================= saha: Geometry Nodes ile ilerlemeye bağlı örnekleme =======================
BLOCKS, COLS, ROWS, ROADW = 6, 14, 120, 14
BW = COLS * (TL + GAPX)
FIELD_W = BLOCKS * BW + (BLOCKS - 1) * ROADW; FIELD_D = ROWS * PITCH
def field_points():
    pts = []
    rng = random.Random(3)
    for b_ in range(BLOCKS):
        for r in range(ROWS):
            for c in range(COLS):
                x = b_ * (BW + ROADW) + c * (TL + GAPX) + TL / 2; y = 20 + r * PITCH
                rank = min(0.995, 0.70 * (r / ROWS) + 0.24 * (x / FIELD_W) + rng.random() * 0.05)
                pts.append((x, y, rank))
    return pts
PTS = field_points()
def point_cloud(name, pts):
    me = bpy.data.meshes.new(name); me.from_pydata([(x, y, 0) for x, y, _ in pts], [], [])
    a = me.attributes.new('rank', 'FLOAT', 'POINT'); a.data.foreach_set('value', [r for *_, r in pts])
    o = bpy.data.objects.new(name, me); sc.collection.objects.link(o); return o
def gn_layer(name, src, pts, drop=0.0, hide_after=False):
    """İlerleme P > rank olan noktalara src örneklenir; yeni gelenler 'drop' m yukarıdan iner."""
    o = point_cloud(name, pts)
    ng = bpy.data.node_groups.new(name + '_gn', 'GeometryNodeTree')
    ng.interface.new_socket('Geometry', in_out='INPUT', socket_type='NodeSocketGeometry')
    ng.interface.new_socket('P', in_out='INPUT', socket_type='NodeSocketFloat')
    ng.interface.new_socket('Q', in_out='INPUT', socket_type='NodeSocketFloat')  # 'sonra gizle' ilerlemesi
    ng.interface.new_socket('Geometry', in_out='OUTPUT', socket_type='NodeSocketGeometry')
    N = ng.nodes; L = ng.links
    gi = N.new('NodeGroupInput'); go = N.new('NodeGroupOutput')
    rk = N.new('GeometryNodeInputNamedAttribute'); rk.data_type = 'FLOAT'; rk.inputs['Name'].default_value = 'rank'
    sub = N.new('ShaderNodeMath'); sub.operation = 'SUBTRACT'; L.new(gi.outputs['P'], sub.inputs[0]); L.new(rk.outputs['Attribute'], sub.inputs[1])
    a = N.new('ShaderNodeMath'); a.operation = 'DIVIDE'; a.use_clamp = True; L.new(sub.outputs[0], a.inputs[0]); a.inputs[1].default_value = 0.012
    keep = N.new('FunctionNodeCompare'); keep.data_type = 'FLOAT'; keep.operation = 'GREATER_THAN'; L.new(a.outputs[0], keep.inputs['A']); keep.inputs['B'].default_value = 0.001
    sel = keep.outputs['Result']
    if hide_after:
        sub2 = N.new('ShaderNodeMath'); sub2.operation = 'SUBTRACT'; L.new(gi.outputs['Q'], sub2.inputs[0]); L.new(rk.outputs['Attribute'], sub2.inputs[1])
        gone = N.new('FunctionNodeCompare'); gone.data_type = 'FLOAT'; gone.operation = 'LESS_THAN'; L.new(sub2.outputs[0], gone.inputs['A']); gone.inputs['B'].default_value = 0.0
        both = N.new('FunctionNodeBooleanMath'); both.operation = 'AND'; L.new(sel, both.inputs[0]); L.new(gone.outputs['Result'], both.inputs[1]); sel = both.outputs[0]
    oi = N.new('GeometryNodeObjectInfo'); oi.inputs['Object'].default_value = src; oi.transform_space = 'ORIGINAL'
    ins = N.new('GeometryNodeInstanceOnPoints'); L.new(gi.outputs['Geometry'], ins.inputs['Points']); L.new(oi.outputs['Geometry'], ins.inputs['Instance']); L.new(sel, ins.inputs['Selection'])
    out = ins.outputs['Instances']
    if drop:
        inv = N.new('ShaderNodeMath'); inv.operation = 'SUBTRACT'; inv.inputs[0].default_value = 1.0; L.new(a.outputs[0], inv.inputs[1])
        mul = N.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'; L.new(inv.outputs[0], mul.inputs[0]); mul.inputs[1].default_value = drop
        cv = N.new('ShaderNodeCombineXYZ'); L.new(mul.outputs[0], cv.inputs['Z'])
        tr = N.new('GeometryNodeTranslateInstances'); L.new(out, tr.inputs['Instances']); L.new(cv.outputs[0], tr.inputs['Translation']); out = tr.outputs['Instances']
    L.new(out, go.inputs['Geometry'])
    md = o.modifiers.new('ilerleme', 'NODES'); md.node_group = ng
    ids = {s.name: s.identifier for s in ng.interface.items_tree if s.item_type == 'SOCKET' and s.in_out == 'INPUT'}
    md[ids['Q']] = 0.0
    return o, md, ids['P'], ids['Q']
L_STAKE = gn_layer('saha_aplikasyon', P_STAKE, PTS, 0, hide_after=True)
L_PILE = gn_layer('saha_kazik', P_PILE, PTS, drop=2.2)
L_RAIL = gn_layer('saha_konst', P_RAIL, PTS, drop=0.6)
L_MOD = gn_layer('saha_panel', P_MOD, PTS, drop=2.5)
INV_PTS = [(x + TL / 2 + 1.6, y - 2.4, r) for i, (x, y, r) in enumerate(PTS) if i % 7 == 6]
L_INV = gn_layer('saha_inverter', P_INV, INV_PTS, drop=0)
def setP(layer, pairs, which='P', interp='BEZIER'):
    o, md, pid, qid = layer; sid = pid if which == 'P' else qid
    for t, v in pairs:
        md[sid] = v; md.keyframe_insert(f'["{sid}"]', frame=F(t))
    fc = o.animation_data.action.fcurves.find(f'modifiers["ilerleme"]["{sid}"]')
    if fc:
        for kp in fc.keyframe_points: kp.interpolation = interp

# ======================= ilerleme senaryosu (tek girdi: zaman) =======================
C = 'CONSTANT'
for lay in (L_STAKE, L_PILE, L_RAIL, L_MOD, L_INV): setP(lay, [(0, 1.0), (4.99, 1.0)], interp=C)
setP(L_STAKE, [(5, 0), (14, 0), (26, 0.35), (40, 1.0), (109.9, 1.0)]); setP(L_STAKE, [(0, 1.0), (5, 0.0), (22, 0.0), (40, 0.25), (60, 1.0), (109.9, 1.0)], which='Q')
setP(L_PILE, [(5, 0), (20, 0), (44, 0.06), (75, 1.0), (109.9, 1.0)])
setP(L_RAIL, [(5, 0), (44, 0), (60, 0.06), (90, 1.0), (109.9, 1.0)])
setP(L_MOD, [(5, 0), (60, 0), (80, 0.05), (106, 0.9), (109.9, 0.9)])
setP(L_INV, [(5, 0), (80, 0), (100, 1.0), (109.9, 1.0)])
# timelapse: sıfırdan bitişe
setP(L_STAKE, [(110, 0), (114, 1.0), (165, 1.0)]); setP(L_STAKE, [(110, 0), (116, 1.0), (140, 1.0)], which='Q')
setP(L_PILE, [(110, 0), (122, 1.0)]); setP(L_RAIL, [(110, 0), (116, 0), (128, 1.0)])
setP(L_MOD, [(110, 0), (121, 0), (136, 1.0), (165, 1.0)]); setP(L_INV, [(110, 0), (128, 0), (137, 1.0), (165, 1.0)])
# kahraman yakın plan bölgesinde büyük sıçramaları yumuşatmak için kanca/final sabit
for lay in (L_PILE, L_RAIL): setP(lay, [(165, 1.0)])

# ======================= kahraman öğeler (yakın planlar) =======================
HX, HY = TL / 2 + (TL + GAPX), 20  # 2. masa, ilk sıra
DX, DY = HX - TL / 2 + 1.0 + 2 * (TL - 2) / 6, HY - DEP * 0.38 - 1.41
drv, ham, hloc = gunes_kazik.build((DX, DY, 0), 0.0)
PXW, PYW = DX + hloc.x, DY + hloc.y
bm = bmesh.new(); add_box(bm, Vector((0, 0, 1.6)), (0.1, 0.14, 3.2)); hp = obj_from(bm, 'kahraman_kazik', [M_pile], (PXW, PYW, 0))
# çekiç (yerel z): kazık başının 0,55 m üstüne iner, 1,6 m kalkar; kazık 3,2 m → 0,7 m kalana dek çakılır
pairs = []; t = 20.0
while t < 44:
    top = 3.2 - 2.5 * (t - 20) / 24; pairs += [(t, top + 0.48 + 1.6 + 0.58), (t + 0.45, top + 0.48 + 0.58)]; t += 0.9
for tt, z in pairs: ham.location.z = z; ham.keyframe_insert('location', index=2, frame=F(tt))
key(hp, 'location', [(20, 0), (44, -2.5)], 'LINEAR', idx=2)
for o in (drv, hp): key(o, 'hide_render', [(0, True), (19.9, True), (20, False), (59.9, False), (60, True)], C)
DX, DY = PXW, PYW - 2.05
dusts = []
for i in range(4):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=0.5 + i * 0.2, location=(DX + random.uniform(-.4, .4), DY + 2.05 + random.uniform(-.3, .3), 0.3 + i * 0.12))
    d = bpy.context.object; d.data.materials.append(M_dust); dusts.append(d)
    key(d, 'hide_render', [(0, True), (20, False), (44.5, True)], C)
# kazık demeti, panel paletleri, tır
bm = bmesh.new()
for i in range(9):
    for j in range(3 - (i % 2)): add_box(bm, Vector((i * 0.16, 0, 0.08 + j * 0.15)), (0.1, 3.6, 0.14))
bundle = obj_from(bm, 'kazik_demeti', [M_pile], (DX + 9, DY - 5, 0)); bundle.rotation_euler = (0, 0, 1.45)
def pallet(loc, n_=30, yaw=0):
    bm = bmesh.new(); add_box(bm, Vector((0, 0, 0.07)), (1.15, 2.45, 0.14), mi=1); add_box(bm, Vector((0, 0, 0.14 + n_ * 0.02)), (1.14, 2.4, n_ * 0.04), mi=0)
    for sx in (-0.58, 0.58):
        for sy in (-1.22, 1.22): add_box(bm, Vector((sx, sy, 0.14 + n_ * 0.02)), (0.06, 0.06, n_ * 0.04 + 0.04), mi=2)
    add_box(bm, Vector((0, 0, 0.16 + n_ * 0.04)), (1.16, 2.42, 0.03), mi=2)
    o = obj_from(bm, 'palet', [M_back, M_wood, M_card], loc); o.rotation_euler = (0, 0, yaw); return o
pallets = [pallet((HX - 12 + i * 1.6, HY - 7.5, 0), 30 - 4 * (i % 3), random.uniform(-.06, .06)) for i in range(5)]
for p_ in pallets: key(p_, 'hide_render', [(0, True), (55, False), (109.9, False), (110, True)], C)
def truck(loc, yaw):
    bm = bmesh.new(); add_box(bm, Vector((0, 4.5, 1.6)), (2.5, 2.2, 2.4), mi=0); add_box(bm, Vector((0, 4.5, 2.2)), (2.3, 0.05, 1.0), mi=2)
    add_box(bm, Vector((0, -2.0, 1.45)), (2.5, 10.5, 0.3), mi=1)
    for i in range(6): add_box(bm, Vector((0, -6 + i * 1.9, 1.95)), (1.15, 2.4, 0.7), mi=3)
    for sy in (4.2, -4.5, -6.0):
        for sx in (-1.1, 1.1): add_cyl(bm, Vector((sx, sy, 0.5)), 0.5, 0.35, 16, 1, Euler((0, math.pi / 2, 0)))
    o = obj_from(bm, 'tir', [M_truck, M_dark, M_glass, M_back], loc); o.rotation_euler = (0, 0, yaw); return o
trk = truck((HX - 30, HY - 16, 0), math.pi / 2)
key(trk, 'location', [(55, Vector((HX - 60, HY - 16, 0))), (68, Vector((HX - 24, HY - 16, 0))), (109.9, Vector((HX - 24, HY - 16, 0)))])
key(trk, 'hide_render', [(0, True), (55, False), (110, True)], C)
# ---- hazır modeller (CC-BY, kaynakça açıklamaya yazılır) ----
import glob as _g
_cache = {}
def model(ad, hedef_boy, yer=(0, 0, 0), yaw=0.0, ad2=None):
    """glTF'i bir kez içe aktarır; ölçüyü en uzun yatay kenarı hedef_boy olacak biçimde ayarlar; kopyayı yerleştirir."""
    if not MODELLER: return None
    if ad not in _cache:
        fs = _g.glob(os.path.join(MODELLER, ad, '**', '*.gltf'), recursive=True)
        if not fs: _cache[ad] = None; return None
        before = set(bpy.data.objects); bpy.ops.import_scene.gltf(filepath=fs[0]); new = [o for o in bpy.data.objects if o not in before]
        col = bpy.data.collections.new('m_' + ad)
        for o in new:
            for c in o.users_collection: c.objects.unlink(o)
            col.objects.link(o)
        bpy.context.view_layer.update()
        lo, hi = Vector((1e9,) * 3), Vector((-1e9,) * 3)
        for o in new:
            if o.type == 'MESH':
                for c in o.bound_box: w = o.matrix_world @ Vector(c); lo = Vector(map(min, lo, w)); hi = Vector(map(max, hi, w))
        _cache[ad] = (col, lo, hi)
    if not _cache[ad]: return None
    col, lo, hi = _cache[ad]; size = hi - lo; k = hedef_boy / max(size.x, size.y)
    e = bpy.data.objects.new(ad2 or ad, None); e.instance_type = 'COLLECTION'; e.instance_collection = col
    col.instance_offset = Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))
    e.scale = (k, k, k); e.location = yer; e.rotation_euler = (0, 0, yaw); sc.collection.objects.link(e); return e
def worker(name, carry=False):
    bm = bmesh.new()
    for sx in (-0.11, 0.11): add_box(bm, Vector((sx, 0, 0.45)), (0.15, 0.17, 0.9), mi=1)
    add_box(bm, Vector((0, 0, 1.2)), (0.44, 0.26, 0.62), mi=0)
    for sx in (-0.29, 0.29): add_box(bm, Vector((sx, 0.05, 1.15)), (0.11, 0.12, 0.58), mi=0)
    add_cyl(bm, Vector((0, 0, 1.64)), 0.11, 0.2, 12, 3); add_cyl(bm, Vector((0, 0, 1.79)), 0.15, 0.13, 14, 2)
    if carry: add_box(bm, Vector((0, 0.32, 1.25)), (2.38, 0.04, 1.3), mi=4)
    return obj_from(bm, name, [M_vest, M_cloth, M_helm, M_skin, M_back])
def person(name, i):
    e = model('isci', 0.62 + 0.04 * (i % 3), ad2=name)   # gerçek model (omuz genişliği ölçeği)
    return e if e else worker(name)
crew = []
for i in range(6):  # panel taşıyanlar: çiftler halinde, paletten masaya (modelde taşıma pozu yok; yanlarında panel)
    w = worker(f'isci_{i}', carry=True) if not MODELLER else person(f'isci_{i}', i); crew.append(w)
    x0, x1 = HX - 12 + (i % 5) * 1.6, HX - TL / 2 + 3 + i * 5.5
    tA, tB = 62 + i * 1.6, 70 + i * 1.6
    key(w, 'location', [(55, Vector((x0, HY - 6, 0))), (tA, Vector((x0, HY - 6, 0))), (tB, Vector((x1, HY - DEP * 0.4 - 1.2, 0))), (80, Vector((x1 + 0.8, HY - DEP * 0.4 - 1.2, 0)))])
    w.rotation_euler = (0, 0, -0.3 + 0.1 * i + (math.pi if MODELLER else 0))
    key(w, 'hide_render', [(0, True), (55, False), (85, True)], C)
for i in range(4):  # kazık ekibi
    w = person(f'kazikci_{i}', i); w.location = (DX + 2.5 + i * 1.2, DY + 1.5 - i * 0.7, 0); w.rotation_euler = (0, 0, 2.5 - i * 0.4)
    key(w, 'hide_render', [(0, True), (20, False), (45, True)], C)
if MODELLER:
    for nm, boy, yer, yaw, t0, t1 in [('forklift', 3.6, (HX - 16, HY - 9.5, 0), 0.4, 55, 110), ('pikap', 4.9, (HX + 14, HY - 12, 0), 2.6, 20, 110),
                                      ('kamyon', 5.3, (DX + 7, DY - 6, 0), -0.9, 20, 55), ('pikap', 4.9, (200, -20, 0), 1.2, 80, 110)]:
        e = model(nm, boy, yer, yaw, ad2=f'{nm}_{t0}')
        if e: key(e, 'hide_render', [(0, True), (t0, False), (t1, True)], C)
# ======================= trafo merkezleri, kablo kanalı, iletim hattı =======================
subs = []
for b_ in range(5):
    g = bpy.data.objects.new(f'trafo_merkezi_{b_}', None); sc.collection.objects.link(g)
    cx = (b_ + 0.5) * FIELD_W / 5; g.location = (cx, -40, 0)
    bm = bmesh.new(); add_box(bm, Vector((0, 0, 0.15)), (60, 40, 0.3), mi=0)
    for k in range(2):
        add_box(bm, Vector((-12 + k * 24, 4, 3.3)), (9, 6, 6), mi=1)
        for f_ in range(6): add_box(bm, Vector((-16 + k * 24 + f_ * 1.6, 4, 3)), (0.15, 6.6, 4.5), mi=1)
        for s_ in range(3): add_cyl(bm, Vector((-14.5 + k * 24 + s_ * 2.5, 4, 7.5)), 0.25, 2.4, 10, 2, r2=0.35)
    add_box(bm, Vector((0, -12, 2.15)), (18, 9, 4), mi=2)
    for gx in (-24, 24):
        for gz in (12, -2): add_box(bm, Vector((gx, gz, 9)), (0.6, 0.6, 18), mi=3)
    for gz in (12, -2): add_box(bm, Vector((0, gz, 18)), (48.6, 0.6, 0.6), mi=3)
    for fx_ in (-30, 30): add_box(bm, Vector((fx_, 0, 1.1)), (0.05, 40, 2.2), mi=3)
    for fy_ in (-20, 20): add_box(bm, Vector((0, fy_, 1.1)), (60, 0.05, 2.2), mi=3)
    so = obj_from(bm, f'tm_{b_}', [M_conc, M_trafo, M_white, M_steel]); so.parent = g
    s0 = 95 + b_ * 2; key(g, 'scale', [(0, Vector((1, 1, 1))), (4.99, Vector((1, 1, 1))), (5, Vector((1e-4,) * 3)), (s0, Vector((1e-4,) * 3)), (s0 + 4, Vector((1, 1, 1))), (110, Vector((1e-4,) * 3)), (128 + b_, Vector((1e-4,) * 3)), (131 + b_, Vector((1, 1, 1)))])
    if MODELLER:
        tm = model('yg_trafo', 54, (0, 4, 0.3), 0.0, ad2=f'yg_trafo_{b_}')
        if tm: tm.parent = g; tm.location = (0, 4, 0.3); so.hide_render = False
    subs.append(g)
if MODELLER:
    vn = model('mobil_vinc', 11.2, (FIELD_W * 0.1 + 38, -40, 0), 1.2, ad2='vinc')
    if vn: key(vn, 'hide_render', [(0, True), (95, False), (110, True)], C)
def tower(loc):
    bm = bmesh.new(); h = 40; w = 6
    for sx in (-1, 1):
        for sy in (-1, 1):
            rot = Euler((-sy * math.atan2(w, h) * 0.9, sx * math.atan2(w, h) * 0.9, 0)); add_box(bm, Vector((sx * w / 2, sy * w / 2, h / 2)), (0.25, 0.25, h * 1.02), rot=rot)
    for k in range(6):
        z = 4 + k * 6; s_ = w * (1 - z / h * 0.9)
        for a_ in range(4):
            r_ = Euler((0, 0, a_ * math.pi / 2)).to_matrix(); add_box(bm, Vector(r_ @ Vector((0, s_ / 2, z))), (s_, 0.12, 0.12), rot=Euler((0, 0, a_ * math.pi / 2)))
    for z in (30, 36): add_box(bm, Vector((0, 0, z)), (18 if z == 30 else 12, 0.4, 0.4))
    return obj_from(bm, 'direk', [M_tower], loc)
towers = []
for k in range(14):
    t_ = tower((FIELD_W * 0.5 + k * 320, -140 - k * 40, 0)); towers.append(t_)
    a = 100 + k * 0.6; b2 = 128 + k * 0.5
    key(t_, 'scale', [(0, Vector((1, 1, 1))), (4.99, Vector((1, 1, 1))), (5, Vector((1e-4,) * 3)), (a, Vector((1e-4,) * 3)), (a + 2, Vector((1, 1, 1))), (110, Vector((1e-4,) * 3)), (b2, Vector((1e-4,) * 3)), (b2 + 2, Vector((1, 1, 1)))])

# ======================= zemin, dağlar, gök =======================
bpy.ops.mesh.primitive_grid_add(x_subdivisions=240, y_subdivisions=240, size=9000, location=(FIELD_W / 2, 2000, 0))
g = bpy.context.object; g.name = 'zemin'; g.data.materials.append(M_sand)
tex = bpy.data.textures.new('kumul', 'CLOUDS'); tex.noise_scale = 300
dm = g.modifiers.new('kumul', 'DISPLACE'); dm.texture = tex; dm.strength = 8
vg = g.vertex_groups.new(name='uzak')
for v in g.data.vertices:
    p = g.matrix_world @ v.co; dx = max(0, -p.x, p.x - FIELD_W); dy = max(0, -p.y - 200, p.y - FIELD_D - 60)
    vg.add([v.index], min(1, max(0, (math.hypot(dx, dy) - 150) / 900)), 'REPLACE')
dm.vertex_group = 'uzak'; bpy.ops.object.shade_smooth()
M_mtn, _ = mat('dag', (0.34, 0.37, 0.45), 1.0)
bm = bmesh.new(); N = 180; vs_ = []; R = random.Random(11)
for i in range(N + 1):
    a = -1.3 + 2.6 * i / N; r = 7000; x, y = FIELD_W / 2 + math.sin(a) * r, math.cos(a) * r + 600
    h = 380 + 650 * abs(math.sin(i * 0.21)) * (0.6 + 0.4 * math.sin(i * 0.067)) + R.uniform(0, 120)
    vs_.append((bm.verts.new((x, y, -30)), bm.verts.new((x, y, h))))
for i in range(N): bm.faces.new((vs_[i][0], vs_[i + 1][0], vs_[i + 1][1], vs_[i][1]))
obj_from(bm, 'daglar', [M_mtn])
world = bpy.data.worlds.new('dunya'); sc.world = world; world.use_nodes = True
wn = world.node_tree.nodes; sky = wn.new('ShaderNodeTexSky'); sky.sky_type = 'NISHITA'; sky.sun_disc = False
sky.altitude = 700; sky.air_density = 1.3; sky.dust_density = 1.6
world.node_tree.links.new(sky.outputs['Color'], wn['Background'].inputs['Color']); wn['Background'].inputs['Strength'].default_value = 0.3
sun_d = bpy.data.lights.new('gunes', 'SUN'); sun_d.angle = math.radians(0.6); sun = bpy.data.objects.new('gunes', sun_d); sc.collection.objects.link(sun)
def sun_at(t, el_deg, az_deg, interp='BEZIER'):
    el, az = math.radians(el_deg), math.radians(az_deg)
    sky.sun_elevation = el; sky.sun_rotation = az
    sky.keyframe_insert('sun_elevation', frame=F(t)); sky.keyframe_insert('sun_rotation', frame=F(t))
    d = Vector((math.sin(az) * math.cos(el), math.cos(az) * math.cos(el), math.sin(el)))
    sun.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler(); sun.keyframe_insert('rotation_euler', frame=F(t))
    warm = max(0, 1 - el_deg / 25); sun_d.color = (1, 1 - 0.25 * warm, 1 - 0.5 * warm); sun_d.energy = 1.2 + 2.2 * min(1, el_deg / 30)
    sun_d.keyframe_insert('color', frame=F(t)); sun_d.keyframe_insert('energy', frame=F(t))
sun_at(0, 10, 255); sun_at(5, 10, 255); sun_at(5.01, 38, 150); sun_at(20, 40, 165); sun_at(110, 30, 230)
# timelapse: 110–140 arası günler hızla geçer (her gün ~2 sn, gece atlanır)
t = 110.0
while t < 139:
    sun_at(t, 6, 95, 'LINEAR'); sun_at(t + 0.9, 58, 180, 'LINEAR'); sun_at(t + 1.8, 6, 265, 'LINEAR'); t += 1.86
sun_at(140, 12, 252); sun_at(165, 5, 258)

# ======================= kameralar ve kurgu işaretleri =======================
def camera(name, keys, lens=32, fstop=11, focus=60):
    cd = bpy.data.cameras.new(name); cd.lens = lens; cd.dof.use_dof = True; cd.dof.aperture_fstop = fstop; cd.dof.focus_distance = focus; cd.clip_end = 20000
    c = bpy.data.objects.new(name, cd); sc.collection.objects.link(c)
    for t_, pos, tgt in keys:
        c.location = pos; c.rotation_euler = (Vector(tgt) - Vector(pos)).to_track_quat('-Z', 'Y').to_euler()
        c.keyframe_insert('location', frame=F(t_)); c.keyframe_insert('rotation_euler', frame=F(t_))
    return c
fx, fd = FIELD_W, FIELD_D
SHOTS = [
 (0, camera('K_kanca', [(0, (-120, -90, 95), (900, 500, 0)), (5, (-60, -40, 85), (950, 520, 0))], 28)),
 (5, camera('C_col', [(5, (200, -60, 2.2), (600, 800, 6)), (20, (260, -45, 2.4), (620, 800, 6))], 24, 16, 200)),
 (20, camera('C_kazik', [(20, (DX - 9, DY - 8, 2.0), (DX, DY + 2, 2.5)), (44, (DX - 4, DY - 9, 2.6), (DX, DY + 2, 2.8))], 30, 4, 11)),
 (44, camera('C_konst', [(44, (HX - 25, HY - 14, 3), (HX + 20, HY + 30, 1)), (60, (HX - 25, HY - 14, 22), (HX + 30, HY + 60, 0))], 28, 8, 40)),
 (60, camera('C_panel', [(60, (HX - 26, HY - 13, 2.4), (HX - 8, HY - 3, 1.2)), (80, (HX - 18, HY - 15, 3.2), (HX + 2, HY, 1.4))], 30, 5.6, 18)),
 (80, camera('C_drone', [(80, (-60, -30, 40), (300, 300, 0)), (95, (600, -60, 110), (1100, 500, 0))], 26)),
 (95, camera('C_trafo', [(95, (fx * 0.3 - 80, -120, 30), (fx * 0.3, -40, 5)), (110, (fx * 0.55, -170, 55), (fx * 0.6, -60, 5))], 30)),
 (110, camera('T_timelapse', [(110, (-260, -260, 230), (fx * 0.42, fd * 0.45, 0)), (140, (-262, -260, 230), (fx * 0.42, fd * 0.45, 0))], 24)),
 (140, camera('F_final', [(140, (fx * 0.35, 10, 6), (fx * 0.45, 300, 0)), (165, (fx * 0.3, -420, 420), (fx * 0.5, fd * 0.55, 0))], 26)),
]
for t_, cam in SHOTS:
    m = sc.timeline_markers.new(cam.name, frame=F(t_)); m.camera = cam
sc.camera = SHOTS[0][1]

# ======================= render =======================
sc.render.engine = 'CYCLES'; sc.cycles.device = os.environ.get('DEVICE', 'CPU'); sc.cycles.samples = SAMPLES
sc.cycles.use_adaptive_sampling = True; sc.cycles.use_denoising = True; sc.cycles.denoiser = 'OPENIMAGEDENOISE'
sc.cycles.max_bounces = 5; sc.cycles.volume_bounces = 1; sc.cycles.caustics_reflective = sc.cycles.caustics_refractive = False
sc.render.use_persistent_data = True
sc.render.resolution_x, sc.render.resolution_y = RES; sc.render.resolution_percentage = 100
sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Medium High Contrast'; sc.view_settings.exposure = -1.0
sc.render.image_settings.file_format = 'JPEG'; sc.render.image_settings.quality = 90
sc.render.filepath = os.path.join(OUT, 'kare_')
if os.environ.get('SAVE_BLEND'): bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'midong_film.blend'))
if FRAMES:
    for fr in [int(x) for x in FRAMES.split(',')]:
        sc.frame_set(fr); sc.render.filepath = os.path.join(OUT, f'kare_{fr:05d}'); bpy.ops.render.render(write_still=True); print('KARE', fr)
else:
    n = sc.frame_end; per = -(-n // PARCA_SAYISI)
    sc.frame_start = 1 + PARCA * per; sc.frame_end = min(n, (PARCA + 1) * per)
    print('ARALIK', sc.frame_start, sc.frame_end); bpy.ops.render.render(animation=True)
print('BITTI')
