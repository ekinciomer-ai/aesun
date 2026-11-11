"""Her glTF modelini içe aktarır, ölçüsünü yazar ve küçük bir önizleme karesi üretir (Blender arka planda)."""
import bpy, sys, os, json, glob, math
from mathutils import Vector
src, out = sys.argv[sys.argv.index('--') + 1:][:2]
os.makedirs(out, exist_ok=True); rapor = {}
for d in sorted(glob.glob(os.path.join(src, '*'))):
    if not os.path.isdir(d): continue
    ad = os.path.basename(d); g = glob.glob(os.path.join(d, '**', '*.gltf'), recursive=True) + glob.glob(os.path.join(d, '**', '*.glb'), recursive=True)
    if not g: rapor[ad] = 'gltf yok'; continue
    bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene
    try: bpy.ops.import_scene.gltf(filepath=g[0])
    except Exception as e: rapor[ad] = 'içe aktarma hatası ' + str(e)[:80]; continue
    ms = [o for o in sc.objects if o.type == 'MESH']
    lo, hi = Vector((1e9,) * 3), Vector((-1e9,) * 3)
    for o in ms:
        for c in o.bound_box:
            w = o.matrix_world @ Vector(c); lo = Vector(map(min, lo, w)); hi = Vector(map(max, hi, w))
    size = hi - lo; ctr = (hi + lo) / 2
    rapor[ad] = {'dosya': os.path.relpath(g[0], d), 'olcu_m': [round(v, 3) for v in size], 'merkez': [round(v, 3) for v in ctr],
                 'yuz': sum(len(o.data.polygons) for o in ms), 'nesne': len(ms)}
    r = max(size) * 1.6 + 0.01
    cd = bpy.data.cameras.new('k'); cam = bpy.data.objects.new('k', cd); sc.collection.objects.link(cam); sc.camera = cam
    cam.location = ctr + Vector((r * 0.8, -r, r * 0.55)); cam.rotation_euler = (ctr - cam.location).to_track_quat('-Z', 'Y').to_euler()
    sl = bpy.data.lights.new('g', 'SUN'); sl.energy = 3; so = bpy.data.objects.new('g', sl); sc.collection.objects.link(so); so.rotation_euler = (0.8, 0.2, 0.6)
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.8, 0.85, 0.9, 1); w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.6
    sc.render.engine = 'CYCLES'; sc.cycles.samples = 16; sc.cycles.use_denoising = True; sc.render.resolution_x = 480; sc.render.resolution_y = 320
    sc.view_settings.view_transform = 'AgX'; sc.render.image_settings.file_format = 'JPEG'; sc.render.filepath = os.path.join(out, ad + '.jpg')
    bpy.ops.render.render(write_still=True)
json.dump(rapor, open(os.path.join(out, 'olcu.json'), 'w'), ensure_ascii=False, indent=1)
print('ONIZLEME_BITTI')
