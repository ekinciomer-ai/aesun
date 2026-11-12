"""Ağaç modellerini web için hafifletir: tüm ağlar birleştirilir, taban z=0, gövde merkezi x=y=0,
hedef boya ölçeklenir, ≤ 6000 yüze seyreltilir (yapraklar korunarak), dokular ≤ 1024 px. Çıktı: <ad>.glb + agaclar.json + önizleme.
Kullanım: blender -b -P agac_disari.py -- <modeller> <çıktı>"""
import bpy, sys, os, glob, json
from mathutils import Vector, Matrix
src, out = sys.argv[sys.argv.index('--') + 1:][:2]; os.makedirs(out, exist_ok=True)
BOY = {'agac_genel': 8.0, 'agac_cam': 10.0, 'agac_kavak': 16.0, 'agac_sari_cam': 11.0}
YUZ = 6000; rapor = []
for d in sorted(glob.glob(os.path.join(src, 'agac_*'))):
    ad = os.path.basename(d); g = glob.glob(os.path.join(d, '**', '*.gltf'), recursive=True) + glob.glob(os.path.join(d, '**', '*.glb'), recursive=True)
    if not g: continue
    bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene
    bpy.ops.import_scene.gltf(filepath=g[0]); bpy.context.view_layer.update()
    ms = [o for o in sc.objects if o.type == 'MESH']
    # set paketlerinde (ör. çam seti) yalnız en büyük ağacı al
    def bb(o):
        P = [o.matrix_world @ Vector(c) for c in o.bound_box]; return Vector([min(p[i] for p in P) for i in range(3)]), Vector([max(p[i] for p in P) for i in range(3)])
    for o in ms:
        mw = o.matrix_world.copy(); o.parent = None; o.data = o.data.copy(); o.data.transform(mw); o.matrix_world = Matrix.Identity(4)
    for o in list(sc.objects):
        if o.type != 'MESH': bpy.data.objects.remove(o, do_unlink=True)
    ms = [o for o in sc.objects if o.type == 'MESH']
    # kümeleme: XY merkezine göre ayrık ağaçlar
    gruplar = []
    for o in ms:
        lo, hi = bb(o); c = (lo + hi) / 2
        for gr in gruplar:
            if (gr['c'].xy - c.xy).length < max(1.5, gr['r']): gr['o'].append(o); break
        else: gruplar.append({'c': c, 'r': max((hi - lo).x, (hi - lo).y) / 2, 'o': [o]})
    hacim = lambda gr: sum((lambda l, h: (h - l).x * (h - l).y * (h - l).z)(*bb(o)) for o in gr['o'])
    sec = max(gruplar, key=hacim)['o']
    for o in ms:
        if o not in sec: bpy.data.objects.remove(o, do_unlink=True)
    bpy.ops.object.select_all(action='DESELECT')
    for o in sec: o.select_set(True)
    bpy.context.view_layer.objects.active = sec[0]
    if len(sec) > 1: bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    lo = Vector([min(v.co[i] for v in o.data.vertices) for i in range(3)]); hi = Vector([max(v.co[i] for v in o.data.vertices) for i in range(3)])
    # gövde merkezi: alt %10'daki noktaların ortalaması
    alt = [v.co for v in o.data.vertices if v.co.z < lo.z + (hi.z - lo.z) * 0.1]
    cx = sum(p.x for p in alt) / len(alt); cy = sum(p.y for p in alt) / len(alt)
    k = BOY.get(ad, 8.0) / (hi.z - lo.z)
    for v in o.data.vertices: v.co = Vector(((v.co.x - cx) * k, (v.co.y - cy) * k, (v.co.z - lo.z) * k))
    y0 = len(o.data.polygons)
    if y0 > YUZ:
        m = o.modifiers.new('d', 'DECIMATE'); m.ratio = YUZ / y0; m.use_collapse_triangulate = True; bpy.ops.object.modifier_apply(modifier='d')
    for im in bpy.data.images:
        if im.size[0] > 1024 or im.size[1] > 1024:
            s = 1024 / max(im.size); im.scale(max(1, int(im.size[0] * s)), max(1, int(im.size[1] * s)))
    fn = os.path.join(out, ad + '.glb')
    bpy.ops.export_scene.gltf(filepath=fn, export_format='GLB', export_image_format='AUTO', export_draco_mesh_compression_enable=False)
    lo = Vector([min(v.co[i] for v in o.data.vertices) for i in range(3)]); hi = Vector([max(v.co[i] for v in o.data.vertices) for i in range(3)])
    # önizleme
    cd = bpy.data.cameras.new('k'); cam = bpy.data.objects.new('k', cd); sc.collection.objects.link(cam); sc.camera = cam
    h = hi.z; cam.location = (h * 1.1, -h * 1.4, h * 0.6); cam.rotation_euler = (Vector((0, 0, h * 0.45)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    sl = bpy.data.lights.new('g', 'SUN'); sl.energy = 3; so = bpy.data.objects.new('g', sl); sc.collection.objects.link(so); so.rotation_euler = (0.8, 0.2, 0.6)
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.8, 0.85, 0.9, 1)
    sc.render.engine = 'CYCLES'; sc.cycles.samples = 16; sc.render.resolution_x = 320; sc.render.resolution_y = 400; sc.view_settings.view_transform = 'AgX'
    sc.render.image_settings.file_format = 'JPEG'; sc.render.filepath = os.path.join(out, ad + '.jpg'); bpy.ops.render.render(write_still=True)
    rapor.append({'ad': ad, 'yuz': len(o.data.polygons), 'yuz_ilk': y0, 'olcu': [round(v, 2) for v in (hi - lo)], 'kb': os.path.getsize(fn) // 1024})
    print('AGAC', rapor[-1])
json.dump(rapor, open(os.path.join(out, 'agaclar.json'), 'w'), ensure_ascii=False, indent=1)
print('AGAC_BITTI', len(rapor))
