"""Bir sahne modelindeki mobilya boyutlu parçaları gruplayıp her biri için küçük önizleme üretir.
Grup: nesne adındaki '_Material' öncesi kök (aynı ağın farklı malzemeli parçaları birlikte). Ölçüt: en büyük kenar < 7 m.
Kullanım: blender -b -P parca_onizle.py -- <modeller_klasörü> <çıktı>"""
import bpy, sys, os, glob, json, re
from mathutils import Vector
src, out = sys.argv[sys.argv.index('--') + 1:][:2]; os.makedirs(out, exist_ok=True)
rapor = {}
for d in sorted(glob.glob(os.path.join(src, '*'))):
    if not os.path.isdir(d): continue
    ad = os.path.basename(d); g = glob.glob(os.path.join(d, '**', '*.gltf'), recursive=True)
    if not g: continue
    bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene
    bpy.ops.import_scene.gltf(filepath=g[0]); bpy.context.view_layer.update()
    ms = [o for o in sc.objects if o.type == 'MESH']
    grup = {}
    for o in ms:
        k = re.split(r'_Material', o.name)[0]; grup.setdefault(k, []).append(o)
    sl = bpy.data.lights.new('g', 'SUN'); sl.energy = 3; so = bpy.data.objects.new('g', sl); sc.collection.objects.link(so); so.rotation_euler = (0.8, 0.2, 0.6)
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.85, 0.87, 0.9, 1); w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.7
    cd = bpy.data.cameras.new('k'); cam = bpy.data.objects.new('k', cd); sc.collection.objects.link(cam); sc.camera = cam
    sc.render.engine = 'CYCLES'; sc.cycles.samples = 12; sc.cycles.use_denoising = True; sc.render.resolution_x = sc.render.resolution_y = 260
    sc.view_settings.view_transform = 'AgX'; sc.render.image_settings.file_format = 'JPEG'
    liste = []
    for k, obs in grup.items():
        lo, hi = Vector((1e9,) * 3), Vector((-1e9,) * 3)
        for o in obs:
            for c in o.bound_box: p = o.matrix_world @ Vector(c); lo = Vector(map(min, lo, p)); hi = Vector(map(max, hi, p))
        size = hi - lo
        if max(size) > 7 or max(size) < 0.15: continue
        for o in ms: o.hide_render = o not in obs
        ctr = (lo + hi) / 2; r = max(size) * 1.5 + 0.2
        cam.location = ctr + Vector((r * 0.75, -r, r * 0.6)); cam.rotation_euler = (ctr - cam.location).to_track_quat('-Z', 'Y').to_euler()
        fn = f'{ad}__{re.sub(r"[^A-Za-z0-9_.-]", "_", k)}.jpg'; sc.render.filepath = os.path.join(out, fn); bpy.ops.render.render(write_still=True)
        liste.append({'grup': k, 'nesneler': [o.name for o in obs], 'olcu': [round(v, 2) for v in size], 'taban_z': round(lo.z, 2), 'dosya': fn})
    rapor[ad] = liste
json.dump(rapor, open(os.path.join(out, 'parcalar.json'), 'w'), ensure_ascii=False, indent=1)
print('PARCA_BITTI', sum(len(v) for v in rapor.values()))
