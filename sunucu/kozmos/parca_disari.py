"""Seçilen mobilya gruplarını sahneden ayırıp tek tek hafif .glb dosyası olarak dışarı verir (web için).
Her parça: tabanı z=0, merkezi x=y=0; dokular en çok 1024 px; çok ağır ağlar seyreltilir. Draco yok.
Kullanım: blender -b -P parca_disari.py -- <modeller_klasörü> <çıktı>"""
import bpy, sys, os, glob, json, re
from mathutils import Vector
src, out = sys.argv[sys.argv.index('--') + 1:][:2]; os.makedirs(out, exist_ok=True)
SECIM = {'loft17': {
    'koltuk_u': 'node_0.001', 'berjer_siyah': 'node_0_S-Remesh.002', 'berjer_siyah2': 'node_0_S-Remesh.004',
    'sehpa_buyuk': 'Cylinder', 'sehpa_kucuk': 'Cylinder.001', 'tv_unitesi': 'Cube.004', 'kitaplik': 'Cube.014',
    'vazo_uzun': 'Cube.036', 'vazo_genis': 'Cube.037', 'tablo': 'Plane.005', 'hali_yuvarlak': 'Plane.006', 'dal': 'Plane.017'}}
YUZ_SINIR = 40000
rapor = []
for ad, sec in SECIM.items():
    g = glob.glob(os.path.join(src, ad, '**', '*.gltf'), recursive=True)
    if not g: print('PARCA_YOK', ad); continue
    for cikti, kok in sec.items():
        bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene
        bpy.ops.import_scene.gltf(filepath=g[0]); bpy.context.view_layer.update()
        obs = [o for o in sc.objects if o.type == 'MESH' and re.split(r'_Material', o.name)[0] == kok]
        if not obs: print('GRUP_YOK', kok); continue
        for o in list(sc.objects):
            if o not in obs: bpy.data.objects.remove(o, do_unlink=True)
        bpy.ops.object.select_all(action='DESELECT')
        for o in obs: o.select_set(True)
        bpy.context.view_layer.objects.active = obs[0]
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        if len(obs) > 1: bpy.ops.object.join()
        o = bpy.context.view_layer.objects.active
        yuz0 = len(o.data.polygons)
        if yuz0 > YUZ_SINIR:
            m = o.modifiers.new('d', 'DECIMATE'); m.ratio = YUZ_SINIR / yuz0; bpy.ops.object.modifier_apply(modifier='d')
        lo = Vector([min(v.co[i] for v in o.data.vertices) for i in range(3)]); hi = Vector([max(v.co[i] for v in o.data.vertices) for i in range(3)])
        kay = Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))
        for v in o.data.vertices: v.co -= kay
        for im in bpy.data.images:
            if im.size[0] > 1024 or im.size[1] > 1024:
                k = 1024 / max(im.size); im.scale(max(1, int(im.size[0] * k)), max(1, int(im.size[1] * k)))
        fn = os.path.join(out, cikti + '.glb')
        bpy.ops.export_scene.gltf(filepath=fn, export_format='GLB', use_selection=False, export_image_format=('AUTO' if cikti == 'dal' else 'JPEG'), export_jpeg_quality=82,
                                  export_draco_mesh_compression_enable=False, export_apply=True)
        olcu = [round(v, 2) for v in (hi - lo)]
        rapor.append({'ad': cikti, 'kaynak': ad, 'grup': kok, 'olcu_m': olcu, 'yuz': len(o.data.polygons), 'yuz_ilk': yuz0, 'kb': os.path.getsize(fn) // 1024})
        print('DISARI', cikti, olcu, rapor[-1]['kb'], 'KB')
json.dump(rapor, open(os.path.join(out, 'disari.json'), 'w'), ensure_ascii=False, indent=1)
print('DISARI_BITTI', len(rapor))
