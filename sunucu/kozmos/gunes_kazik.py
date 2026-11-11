"""GES tipi paletli kazık çakma makinesi (genel tip, özgün model; marka yok).
Ölçüler sahadaki yaygın makinelere yakın: palet boyu ~2,6 m, genişlik ~1,9 m, direk ~5,8 m, çekiç ~450 kg sınıfı.
build(loc, yaw) -> (gövde nesnesi, çekiç nesnesi, direk_ust_z). Çekiç direğin önünde yerel Y ekseninde iner/çıkar.
"""
import bpy, bmesh, math
from mathutils import Matrix, Vector, Euler

def _m(name, color, rough=0.5, metal=0.0, coat=0.0):
    m = bpy.data.materials.get(name)
    if m: return m
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1); b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal; b.inputs['Coat Weight'].default_value = coat
    return m
def _stripes(name):
    m = bpy.data.materials.get(name)
    if m: return m
    m = bpy.data.materials.new(name); m.use_nodes = True; n = m.node_tree.nodes; l = m.node_tree.links; b = n['Principled BSDF']
    tc = n.new('ShaderNodeTexCoord'); w = n.new('ShaderNodeTexWave'); w.wave_type = 'BANDS'; w.bands_direction = 'DIAGONAL'; w.inputs['Scale'].default_value = 3.0
    l.new(tc.outputs['Object'], w.inputs['Vector'])
    r = n.new('ShaderNodeValToRGB'); r.color_ramp.interpolation = 'CONSTANT'; r.color_ramp.elements[0].color = (0.02, 0.02, 0.02, 1); r.color_ramp.elements[1].position = 0.5; r.color_ramp.elements[1].color = (0.9, 0.62, 0.04, 1)
    l.new(w.outputs['Fac'], r.inputs['Fac']); l.new(r.outputs['Color'], b.inputs['Base Color']); b.inputs['Roughness'].default_value = 0.5
    return m

def _box(bm, c, s, rot=None, mi=0):
    m = Matrix.Translation(c) @ (rot.to_matrix().to_4x4() if rot else Matrix()) @ Matrix.Diagonal((*s, 1))
    r = bmesh.ops.create_cube(bm, size=1.0, matrix=m)
    for f in {f for v in r['verts'] for f in v.link_faces}: f.material_index = mi
def _cyl(bm, c, rad, h, seg=16, mi=0, rot=None, r2=None):
    m = Matrix.Translation(c) @ (rot.to_matrix().to_4x4() if rot else Matrix())
    r = bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=rad, radius2=rad if r2 is None else r2, depth=h, matrix=m)
    for f in {f for v in r['verts'] for f in v.link_faces}: f.material_index = mi
def _rod(bm, a, b, rad, mi=0, seg=10):
    a, b = Vector(a), Vector(b); d = b - a
    rot = d.to_track_quat('Z', 'Y').to_euler(); _cyl(bm, (a + b) / 2, rad, d.length, seg, mi, rot)

def _obj(bm, name, mats, coll, bevel=0.0):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for m in mats: me.materials.append(m)
    o = bpy.data.objects.new(name, me); coll.objects.link(o)
    for p in me.polygons: p.use_smooth = False
    if bevel:
        bv = o.modifiers.new('pah', 'BEVEL'); bv.width = bevel; bv.segments = 2; bv.limit_method = 'ANGLE'; bv.harden_normals = False
    return o

def build(loc=(0, 0, 0), yaw=0.0, coll=None):
    coll = coll or bpy.context.scene.collection
    Y = _m('mk_govde', (0.86, 0.5, 0.04), 0.42, 0.0, 0.35)      # turuncu-sarı boya
    G = _m('mk_gri', (0.32, 0.33, 0.34), 0.45, 0.6)              # direk ve şase
    K = _m('mk_kauçuk', (0.025, 0.025, 0.028), 0.75)              # palet, hortum
    S = _m('mk_celik', (0.62, 0.63, 0.64), 0.3, 1.0)              # pistonlar, makaralar
    C = _m('mk_cam', (0.08, 0.1, 0.12), 0.05)
    W = _stripes('mk_ikaz')
    mats = [Y, G, K, S, C, W]
    bm = bmesh.new()
    # --- paletler: şase, avare, zincir dişlisi, makaralar ve pabuçlar
    TL, TW, TR = 2.6, 0.36, 0.28
    for sx in (-0.78, 0.78):
        _box(bm, Vector((sx, 0, 0.36)), (0.22, TL - 0.4, 0.28), mi=1)
        for sy, rr in ((TL / 2 - 0.28, TR), (-TL / 2 + 0.28, TR + 0.02)):
            _cyl(bm, Vector((sx, sy, 0.32)), rr, TW - 0.06, 22, 3, Euler((0, math.pi / 2, 0)))
            _cyl(bm, Vector((sx, sy, 0.32)), rr * 0.45, TW + 0.02, 12, 1, Euler((0, math.pi / 2, 0)))
        for k in range(4): _cyl(bm, Vector((sx, -0.55 + k * 0.37, 0.14)), 0.08, TW - 0.1, 12, 3, Euler((0, math.pi / 2, 0)))
        # pabuçlar oval yol boyunca
        path = []; n = 46; L = TL - 0.56; R = 0.33
        per = 2 * L + 2 * math.pi * R
        for i in range(n):
            s = per * i / n
            if s < L: p, a = Vector((sx, -L / 2 + s, 0.32 - R)), 0.0
            elif s < L + math.pi * R: t = (s - L) / R; p, a = Vector((sx, L / 2 + math.sin(t) * R, 0.32 - math.cos(t) * R)), t
            elif s < 2 * L + math.pi * R: s2 = s - L - math.pi * R; p, a = Vector((sx, L / 2 - s2, 0.32 + R)), math.pi
            else: t = (s - 2 * L - math.pi * R) / R; p, a = Vector((sx, -L / 2 - math.sin(t) * R, 0.32 + math.cos(t) * R)), math.pi + t
            _box(bm, p, (TW, 0.15, 0.045), rot=Euler((a, 0, 0)), mi=2)
            _box(bm, p + Vector((0, 0, 0)), (TW * 0.25, 0.05, 0.08), rot=Euler((a, 0, 0)), mi=2)
    _box(bm, Vector((0, 0, 0.62)), (1.5, 1.6, 0.22), mi=1)                       # döner tabla
    # --- gövde: motor kaputu (panjurlu), karşı ağırlık, yakıt deposu
    _box(bm, Vector((0, -0.45, 1.05)), (1.75, 1.45, 0.68), mi=0)
    for k in range(9): _box(bm, Vector((0.89, -0.95 + k * 0.1, 1.08)), (0.02, 0.05, 0.42), mi=2)  # yan panjur
    _box(bm, Vector((0, -1.24, 0.95)), (1.8, 0.22, 0.6), mi=1)                     # karşı ağırlık
    _box(bm, Vector((-0.55, -0.2, 1.48)), (0.55, 0.7, 0.2), mi=0)                  # kaput üstü
    _cyl(bm, Vector((-0.6, -0.75, 1.75)), 0.05, 0.55, 12, 2)                       # egzoz
    _box(bm, Vector((0.62, 0.42, 0.98)), (0.45, 0.55, 0.5), mi=0)                  # hidrolik tank
    # --- operatör yeri: koltuk, konsol, ROPS kabin
    _box(bm, Vector((0.35, 0.2, 1.48)), (0.5, 0.45, 0.12), mi=2); _box(bm, Vector((0.35, 0.0, 1.78)), (0.5, 0.1, 0.55), mi=2)
    _box(bm, Vector((0.35, 0.55, 1.6)), (0.6, 0.18, 0.35), mi=1)
    for i in range(4): _rod(bm, (0.35 + (-0.28 if i < 2 else 0.28), 0.62 if i % 2 else -0.15, 1.42), (0.35 + (-0.28 if i < 2 else 0.28), 0.62 if i % 2 else -0.15, 2.45), 0.035, 1)
    _box(bm, Vector((0.35, 0.24, 2.47)), (0.72, 0.92, 0.06), mi=0)
    # --- direk bağlantısı ve eğim pistonları
    MX, MY = 0.0, 1.05
    _box(bm, Vector((MX, 0.75, 0.95)), (0.6, 0.5, 0.45), mi=1)
    for sx in (-0.22, 0.22):
        _rod(bm, (sx, 0.55, 1.15), (sx * 0.6, MY - 0.05, 3.2), 0.06, 3)          # piston gövdesi
        _rod(bm, (sx * 0.6, MY - 0.05, 3.2), (sx * 0.5, MY, 3.7), 0.035, 3)       # piston kolu
    # --- direk (5,8 m), ön raylar, tepe makarası
    H = 5.8
    _box(bm, Vector((MX, MY, 0.4 + H / 2)), (0.24, 0.2, H), mi=1)
    for sx in (-0.1, 0.1): _box(bm, Vector((MX + sx, MY + 0.13, 0.4 + H / 2)), (0.04, 0.05, H - 0.2), mi=3)
    for k in range(12): _box(bm, Vector((MX, MY - 0.11, 0.7 + k * 0.45)), (0.2, 0.02, 0.06), mi=1)
    _box(bm, Vector((MX, MY + 0.05, 0.55)), (0.4, 0.34, 0.3), mi=5)                 # ikaz şeritli ayak
    _cyl(bm, Vector((MX, MY + 0.05, 0.4 + H + 0.08)), 0.14, 0.12, 18, 3, Euler((0, math.pi / 2, 0)))
    _box(bm, Vector((MX, MY + 0.05, 0.4 + H)), (0.3, 0.3, 0.12), mi=1)
    # hortumlar (gövdeden direğe)
    for i, sx in enumerate((-0.06, 0.0, 0.06)):
        pts = [Vector((0.45 + sx, 0.6, 1.25)), Vector((0.3 + sx, 0.9, 1.6)), Vector((0.12 + sx, MY - 0.12, 2.4)), Vector((0.12 + sx, MY - 0.12, 4.2))]
        for a, b in zip(pts, pts[1:]): _rod(bm, a, b, 0.022, 2, 8)
    body = _obj(bm, 'gunes_kazik_makinesi', mats, coll, bevel=0.012)
    # --- çekiç arabası (ayrı nesne, animasyon için)
    hb = bmesh.new()
    _box(hb, Vector((0, 0.0, 0)), (0.38, 0.34, 0.95), mi=0)
    for k in range(7): _box(hb, Vector((0, 0.18, -0.4 + k * 0.13)), (0.4, 0.03, 0.05), mi=1)
    _box(hb, Vector((0, -0.17, 0)), (0.3, 0.06, 0.8), mi=1)                         # kızak
    _cyl(hb, Vector((0, 0.0, -0.58)), 0.11, 0.22, 16, 3)                            # vurma başlığı
    _box(hb, Vector((0, 0.0, 0.52)), (0.26, 0.26, 0.1), mi=1)
    ham = _obj(hb, 'gunes_kazik_cekic', [Y, G, K, S], coll, bevel=0.01)
    ham.location = Vector((MX, MY + 0.36, 3.0))
    ham.parent = body
    body.location = loc; body.rotation_euler = (0, 0, yaw)
    return body, ham, Vector((MX, MY + 0.36, 0))   # çekicin yerel x,y'si (kazık bu hizada çakılır)

if __name__ == '__main__':
    import sys, os
    out = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else '/tmp/gk.png'
    bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene
    body, ham, p = build((0, 0, 0), 0.0)
    bm = bmesh.new(); _box(bm, Vector((0, 0, 1.3)), (0.1, 0.14, 2.6)); pile = _obj(bm, 'kazik', [_m('kz', (0.55, 0.57, 0.58), 0.45, 1.0)], sc.collection); pile.location = (p.x, p.y, 0)
    bpy.ops.mesh.primitive_plane_add(size=60); pl = bpy.context.object; pl.data.materials.append(_m('kum', (0.62, 0.52, 0.38), 0.95))
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; sk = w.node_tree.nodes.new('ShaderNodeTexSky'); sk.sky_type = 'NISHITA'; sk.sun_disc = False; sk.sun_elevation = math.radians(20); sk.sun_rotation = math.radians(230)
    w.node_tree.links.new(sk.outputs['Color'], w.node_tree.nodes['Background'].inputs['Color']); w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.3
    sl = bpy.data.lights.new('s', 'SUN'); sl.energy = 3; sl.angle = 0.02; so = bpy.data.objects.new('s', sl); sc.collection.objects.link(so)
    d = Vector((math.sin(math.radians(230)) * math.cos(math.radians(20)), math.cos(math.radians(230)) * math.cos(math.radians(20)), math.sin(math.radians(20)))); so.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    cd = bpy.data.cameras.new('c'); cd.lens = 40; cam = bpy.data.objects.new('c', cd); sc.collection.objects.link(cam); sc.camera = cam
    cam.location = (5.2, 6.8, 2.6); cam.rotation_euler = (Vector((0, 0.4, 2.0)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    sc.render.engine = 'CYCLES'; sc.cycles.samples = int(os.environ.get('SAMPLES', '32')); sc.cycles.use_denoising = True
    sc.render.resolution_x, sc.render.resolution_y = 960, 640; sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Medium High Contrast'; sc.view_settings.exposure = -1.0
    sc.render.filepath = out; bpy.ops.render.render(write_still=True); print('BITTI')
