"""BTA: Sketchfab araç ve insan modellerini web için tek tek GLB olarak dışarı verir.
Araçlar: uzunluk X ekseninde, gerçek boyda (3,4–5,2 m), taban z=0, merkez x=y=0, en çok 40 bin yüz.
İnsanlar: animasyonlu olanlar orta karede pozlanır, armatür uygulanıp sabit ağ yapılır, boy 1,60–1,85 m, en çok 20 bin yüz.
Her çıktı için küçük bir önizleme PNG ve olcu.json yazılır.
Kullanım: blender -b -P arac_insan_disari.py -- <modeller> <çıktı>"""
import bpy, sys, os, glob, json, math
from mathutils import Vector, Matrix
src, out = sys.argv[sys.argv.index('--') + 1:][:2]; os.makedirs(out, exist_ok=True)
rapor = []

def temiz():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def yukle(ad):
    g = glob.glob(os.path.join(src, ad, '**', '*.gltf'), recursive=True) + glob.glob(os.path.join(src, ad, '**', '*.glb'), recursive=True)
    if not g: print('YOK', ad); return False
    bpy.ops.import_scene.gltf(filepath=g[0]); bpy.context.view_layer.update(); return True

def bbox(obs):
    pts = [o.matrix_world @ Vector(c) for o in obs for c in o.bound_box]
    lo = Vector([min(p[i] for p in pts) for i in range(3)]); hi = Vector([max(p[i] for p in pts) for i in range(3)])
    return lo, hi

def tek_ag(obs):
    for o in bpy.context.scene.objects: o.select_set(False)
    for o in obs: o.select_set(True)
    bpy.context.view_layer.objects.active = obs[0]
    for o in obs:
        o.parent and o.matrix_world
    bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if len(obs) > 1: bpy.ops.object.join()
    return bpy.context.view_layer.objects.active

def sadelestir(o, sinir):
    n0 = len(o.data.polygons)
    if n0 > sinir:
        m = o.modifiers.new('d', 'DECIMATE'); m.ratio = sinir / n0
        bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier='d')
    return n0

def yerlestir(o, hedef, eksen):
    """eksen 'boy' = Z yüksekliği hedefe, 'uzun' = en uzun yatay kenar hedef aralığına; uzun kenar X'e döner."""
    lo, hi = bbox([o]); s = hi - lo
    if eksen == 'uzun':
        if s.y > s.x:
            o.data.transform(Matrix.Rotation(math.pi / 2, 4, 'Z')); lo, hi = bbox([o]); s = hi - lo
        L = s.x
        k = 1.0 if hedef[0] <= L <= hedef[1] else (sum(hedef) / 2) / L
    else:
        k = 1.0 if hedef[0] <= s.z <= hedef[1] else (sum(hedef) / 2) / s.z
    o.data.transform(Matrix.Scale(k, 4)); lo, hi = bbox([o])
    o.data.transform(Matrix.Translation(-Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))))
    lo, hi = bbox([o]); return [round(v, 2) for v in (hi - lo)], k

def dokular(px):
    for im in bpy.data.images:
        if im.size[0] > px or im.size[1] > px:
            k = px / max(im.size); im.scale(max(1, int(im.size[0] * k)), max(1, int(im.size[1] * k)))

def onizle(fn):
    sc = bpy.context.scene
    lo, hi = bbox([o for o in sc.objects if o.type == 'MESH']); c = (lo + hi) / 2; r = (hi - lo).length
    cam = bpy.data.objects.new('k', bpy.data.cameras.new('k')); sc.collection.objects.link(cam); sc.camera = cam
    cam.location = c + Vector((r * 0.9, -r * 1.1, r * 0.6)); cam.rotation_euler = (c - cam.location).to_track_quat('-Z', 'Y').to_euler()
    l = bpy.data.objects.new('l', bpy.data.lights.new('l', 'SUN')); l.data.energy = 4; l.rotation_euler = (0.7, 0.2, 0.6); sc.collection.objects.link(l)
    sc.render.engine = 'BLENDER_WORKBENCH'; sc.display.shading.color_type = 'TEXTURE'; sc.display.shading.light = 'STUDIO'
    sc.render.resolution_x, sc.render.resolution_y = 480, 320; sc.render.filepath = fn
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam); bpy.data.objects.remove(l)

def disari(o, ad, kaynak, olcu, n0, k, png=True):
    for x in list(bpy.context.scene.objects):
        if x != o: bpy.data.objects.remove(x, do_unlink=True)
    fn = os.path.join(out, ad + '.glb')
    bpy.ops.export_scene.gltf(filepath=fn, export_format='GLB', export_image_format='JPEG', export_jpeg_quality=80,
                              export_draco_mesh_compression_enable=False, export_apply=True, export_animations=False, export_skins=False)
    if png: onizle(os.path.join(out, ad + '.png'))
    rapor.append({'ad': ad, 'kaynak': kaynak, 'olcu_m': olcu, 'olcek': round(k, 4), 'yuz': len(o.data.polygons), 'yuz_ilk': n0, 'kb': os.path.getsize(fn) // 1024})
    print('DISARI', ad, olcu, 'olcek', round(k, 4), rapor[-1]['yuz'], 'yüz', rapor[-1]['kb'], 'KB')

# ---------- araçlar ----------
for kay in ('arac_kucuk', 'arac_suv', 'arac_paket'):
    temiz()
    if not yukle(kay): continue
    sc = bpy.context.scene
    # paket: her en üst nesne ağacı ayrı araç; tekli: hepsi bir araç
    kokler = [o for o in sc.objects if o.parent is None]
    def agaclar(r):
        res = [r]; [res.extend(agaclar(c)) for c in r.children]; return res
    gruplar = []
    if kay == 'arac_paket':
        # tek kök altında ise bir alt seviyeye in
        while len(kokler) == 1 and kokler[0].children: kokler = list(kokler[0].children)
        for r in kokler:
            ms = [o for o in agaclar(r) if o.type == 'MESH']
            if ms: gruplar.append(ms)
        print('PAKET', kay, len(gruplar), 'grup', [tuple(round(v, 1) for v in (lambda b: b[1] - b[0])(bbox(g))) for g in gruplar][:20])
    else:
        gruplar = [[o for o in sc.objects if o.type == 'MESH']]
    for gi in range(len(gruplar)):
        temiz(); yukle(kay); sc = bpy.context.scene
        kokler = [o for o in sc.objects if o.parent is None]
        if kay == 'arac_paket':
            while len(kokler) == 1 and kokler[0].children: kokler = list(kokler[0].children)
            ms = [o for o in agaclar(kokler[gi]) if o.type == 'MESH'] if gi < len(kokler) else []
        else:
            ms = [o for o in sc.objects if o.type == 'MESH']
        if not ms: continue
        lo, hi = bbox(ms); s = hi - lo
        if kay == 'arac_paket' and (max(s.x, s.y) < 1e-3): continue
        o = tek_ag(ms); n0 = sadelestir(o, 40000)
        olcu, k = yerlestir(o, (3.4, 5.2), 'uzun')
        if not (1.2 <= olcu[2] / max(olcu[0], 1e-6) * 4.4 <= 2.4):
            print('ATLA', kay, gi, olcu, '(araç oranı değil)'); continue
        dokular(512)
        disari(o, f'{kay}_{gi}' if kay == 'arac_paket' else kay, kay, olcu, n0, k)

# ---------- insanlar ----------
for kay in ('insan_nathan', 'insan_sophia', 'insan_eric', 'insan_carla', 'insan_claudia'):
    temiz()
    if not yukle(kay): continue
    sc = bpy.context.scene
    arm = [o for o in sc.objects if o.type == 'ARMATURE']
    if arm and arm[0].animation_data and arm[0].animation_data.action:
        f0, f1 = arm[0].animation_data.action.frame_range; sc.frame_set(int((f0 + f1) / 2 * 0.6 + f0 * 0.4))
    bpy.context.view_layer.update()
    ms = [o for o in sc.objects if o.type == 'MESH']
    for o in ms:
        bpy.context.view_layer.objects.active = o
        for m in list(o.modifiers):
            try: bpy.ops.object.modifier_apply(modifier=m.name)
            except Exception as e: print('MOD', kay, m.name, str(e)[:60])
    for a in arm: bpy.data.objects.remove(a, do_unlink=True)
    ms = [o for o in sc.objects if o.type == 'MESH']
    o = tek_ag(ms); n0 = sadelestir(o, 20000)
    olcu, k = yerlestir(o, (1.55, 1.9), 'boy')
    dokular(1024)
    disari(o, kay, kay, olcu, n0, k)

json.dump(rapor, open(os.path.join(out, 'olcu.json'), 'w'), ensure_ascii=False, indent=1)
print('DISARI_BITTI', len(rapor))
