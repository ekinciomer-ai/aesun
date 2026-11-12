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
    # read_factory_settings betik içinde Blender'ı çökertiyor; nesneleri silip artıkları temizle
    for ob in list(bpy.data.objects): bpy.data.objects.remove(ob, do_unlink=True)
    try: bpy.data.orphans_purge(do_recursive=True)
    except Exception: pass

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

def vbox(o):
    ws = [o.matrix_world @ v.co for v in o.data.vertices]
    lo = Vector([min(p[i] for p in ws) for i in range(3)]); hi = Vector([max(p[i] for p in ws) for i in range(3)])
    return lo, hi

def yerlestir(o, hedef, eksen):
    """eksen 'boy' = Z yüksekliği hedefe, 'uzun' = en uzun yatay kenar hedef aralığına; uzun kenar X'e döner."""
    lo, hi = vbox(o); s = hi - lo
    if eksen == 'uzun' and s.y > s.x:
        o.data.transform(Matrix.Rotation(math.pi / 2, 4, 'Z')); lo, hi = vbox(o); s = hi - lo
    L = s.x if eksen == 'uzun' else s.z
    k = 1.0 if hedef[0] <= L <= hedef[1] else (sum(hedef) / 2) / L
    o.data.transform(Matrix.Scale(k, 4)); lo, hi = vbox(o)
    o.data.transform(Matrix.Translation(-Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))))
    o.data.update(); lo, hi = vbox(o); return [round(v, 2) for v in (hi - lo)], k

def dokular(px):
    for im in bpy.data.images:
        if im.size[0] > px or im.size[1] > px:
            k = px / max(im.size); im.scale(max(1, int(im.size[0] * k)), max(1, int(im.size[1] * k)))

def onizle(fn):
    sc = bpy.context.scene
    lo, hi = bbox([o for o in sc.objects if o.type == 'MESH' and not o.hide_render]); c = (lo + hi) / 2; r = (hi - lo).length
    cam = bpy.data.objects.new('k', bpy.data.cameras.new('k')); sc.collection.objects.link(cam); sc.camera = cam
    cam.location = c + Vector((r * 0.9, -r * 1.1, r * 0.6)); cam.rotation_euler = (c - cam.location).to_track_quat('-Z', 'Y').to_euler()
    l = bpy.data.objects.new('l', bpy.data.lights.new('l', 'SUN')); l.data.energy = 4; l.rotation_euler = (0.7, 0.2, 0.6); sc.collection.objects.link(l)
    sc.render.engine = 'BLENDER_WORKBENCH'; sc.display.shading.color_type = 'TEXTURE'; sc.display.shading.light = 'STUDIO'
    sc.render.resolution_x, sc.render.resolution_y = 480, 320; sc.render.filepath = fn
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam); bpy.data.objects.remove(l)

def disari(o, ad, kaynak, olcu, n0, k, png=False):
    for x in bpy.context.scene.objects:
        x.select_set(x == o); x.hide_render = x != o
    bpy.context.view_layer.objects.active = o
    fn = os.path.join(out, ad + '.glb')
    bpy.ops.export_scene.gltf(filepath=fn, export_format='GLB', use_selection=True, export_image_format='JPEG', export_jpeg_quality=80,
                              export_draco_mesh_compression_enable=False, export_apply=True, export_animations=False, export_skins=False)
    if png: onizle(os.path.join(out, ad + '.png'))
    rapor.append({'ad': ad, 'kaynak': kaynak, 'olcu_m': olcu, 'olcek': round(k, 4), 'yuz': len(o.data.polygons), 'yuz_ilk': n0, 'kb': os.path.getsize(fn) // 1024})
    print('DISARI', ad, olcu, 'olcek', round(k, 4), rapor[-1]['yuz'], 'yüz', rapor[-1]['kb'], 'KB')

# ---------- araçlar ----------
def kumele(ms):
    """Paket: nesneleri yatay kutuları (0,3 m pay) kesişenler aynı araç olacak şekilde kümeler; yer düzlemlerini atar."""
    kut = []
    for o in ms:
        lo, hi = bbox([o]); s = hi - lo
        if s.z < 0.05 and max(s.x, s.y) > 8: continue
        kut.append([o.name, lo, hi])
    ana = list(range(len(kut)))
    def bul(i):
        while ana[i] != i: ana[i] = ana[ana[i]]; i = ana[i]
        return i
    for i in range(len(kut)):
        for j in range(i + 1, len(kut)):
            a, b = kut[i], kut[j]
            if all(a[1][d] - 0.3 <= b[2][d] and b[1][d] - 0.3 <= a[2][d] for d in (0, 1)): ana[bul(i)] = bul(j)
    gr = {}
    for i, k in enumerate(kut): gr.setdefault(bul(i), []).append(k[0])
    return list(gr.values())

for kay in ('arac_kucuk', 'arac_suv', 'arac_paket'):
    try:
        temiz()
        if not yukle(kay): continue
        ms = [o for o in bpy.context.scene.objects if o.type == 'MESH']
        gruplar = kumele(ms) if kay == 'arac_paket' else [[o.name for o in ms]]
        print('PAKET', kay, len(gruplar), 'grup')
        for gi, adlar in enumerate(gruplar):
            ms = [bpy.data.objects[n] for n in adlar if n in bpy.data.objects]
            if not ms: continue
            o = tek_ag(ms); n0 = sadelestir(o, 40000)
            olcu, k = yerlestir(o, (3.4, 5.2), 'uzun')
            oran = olcu[2] / max(olcu[0], 1e-6)
            if not (0.22 <= oran <= 0.55) or olcu[1] / olcu[0] > 0.6:
                print('ATLA', kay, gi, olcu, 'oran', round(oran, 2)); continue
            dokular(512)
            disari(o, f'{kay}_{gi}' if kay == 'arac_paket' else kay, kay, olcu, n0, k)
            bpy.data.objects.remove(o, do_unlink=True)
    except Exception as e:
        import traceback; print('HATA', kay, ' | '.join(traceback.format_exc().splitlines()[-4:]))

# ---------- insanlar ----------
def insan(kay):
    temiz()
    if not yukle(kay): return
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

for kay in ('insan_nathan', 'insan_sophia', 'insan_eric', 'insan_carla', 'insan_claudia'):
    try:
        print('BASLA', kay); insan(kay)
    except Exception as e:
        import traceback; print('HATA', kay, ' | '.join(traceback.format_exc().splitlines()[-4:]))

json.dump(rapor, open(os.path.join(out, 'olcu.json'), 'w'), ensure_ascii=False, indent=1)
print('DISARI_BITTI', len(rapor))
