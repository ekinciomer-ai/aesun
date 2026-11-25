import bpy, sys, os, glob, json
ASSETS=os.environ.get('MH_ASSETS','')   # içinde clothes/ skins/ hair/ ... olan klasör
OUT=os.environ.get('OUT','/home/claude/insan/isci.glb')
bpy.ops.wm.read_factory_settings(use_empty=True)
pkg='bl_ext.user_default.mpfb'
ud=bpy.utils.extension_path_user(pkg,create=True); print('USERDIR',ud)
if ASSETS:
  os.makedirs(ud,exist_ok=True); d=os.path.join(ud,'data')
  if not os.path.exists(d): os.symlink(ASSETS,d)
if pkg not in bpy.context.preferences.addons:
  bpy.ops.extensions.package_install_files(filepath='/home/claude/insan/mpfb.zip',repo='user_default',enable_on_install=True)
import importlib; M=importlib.import_module(pkg)
from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.targetservice import TargetService
mac=TargetService.get_default_macro_info_dict()
mac.update(**json.loads(os.environ.get('MAC','{"gender":1.0,"age":0.55,"muscle":0.62,"weight":0.55,"height":0.55,"proportions":0.6}')))
mac['race']={'asian':0.15,'caucasian':0.75,'african':0.10}
bm=HumanService.create_human(macro_detail_dict=mac,scale=0.1)
rig=HumanService.add_builtin_rig(bm,'mixamo')
print('RIG',rig.name,len(rig.data.bones),[b.name for b in rig.data.bones][:8])
def find(pat):
  r=sorted(glob.glob(os.path.join(ASSETS,'**',pat),recursive=True)) if ASSETS else []
  return r
skins=find('*.mhmat'); print('SKINS',[os.path.relpath(s,ASSETS) for s in skins if 'skins' in s][:40])
sel=json.loads(os.environ.get('SEC','{}'))
if sel.get('skin'): HumanService.set_character_skin(os.path.join(ASSETS,sel['skin']),bm,skin_type='GAMEENGINE')
for typ,key in [('Clothes','clothes'),('Hair','hair'),('Eyebrows','eyebrows'),('Eyes','eyes')]:
  for p in sel.get(key,[]): HumanService.add_mhclo_asset(os.path.join(ASSETS,p),bm,asset_type=typ,subdiv_levels=0,material_type='MAKESKIN')
if os.environ.get('LIST'):
  for k in ['clothes','hair','eyebrows','eyes']: print(k.upper(),[os.path.relpath(s,ASSETS) for s in find('*.mhclo') if f'/{k}/' in s][:80])
# şekil anahtarlarını uygula (dışa aktarımda morph olmasın) — Blender'ın karışımı uygula yöntemi
for o in list(bpy.data.objects):
  if o.type=='MESH' and o.data.shape_keys:
    for x in bpy.context.view_layer.objects: x.select_set(False)
    bpy.context.view_layer.objects.active=o; o.select_set(True)
    bpy.ops.object.shape_key_remove(all=True,apply_mix=True)
for o in list(bpy.data.objects):
  if o.type=='MESH':
    for m in list(o.modifiers):
      if m.type in('SUBSURF',): o.modifiers.remove(m)
for o in bpy.data.objects:
  if o.type=='MESH' and o.name=='Human':
    print('UV',[ (u.name,u.active,u.active_render) for u in o.data.uv_layers])
    for ms in o.material_slots:
      mt=ms.material
      if mt and mt.use_nodes:
        print('MAT',mt.name,[(n.type,n.name,getattr(n,'uv_map',''),getattr(getattr(n,'image',None),'name','')) for n in mt.node_tree.nodes])
# yardımcı geometriyi (dil, diş, saç kalıbı, tayt vb.) gerçekten sil: MASK değiştiricilerini uygula
for o in list(bpy.data.objects):
  if o.type!='MESH': continue
  print('MODS',o.name,[(m.type,m.name,getattr(m,'vertex_group','')) for m in o.modifiers])
  for m in list(o.modifiers):
    if m.type=='MASK':
      for x in bpy.context.view_layer.objects: x.select_set(False)
      bpy.context.view_layer.objects.active=o; o.select_set(True)
      try:
        bpy.ops.object.modifier_move_to_index(modifier=m.name,index=0)
        bpy.ops.object.modifier_apply(modifier=m.name); print('MASK_UYGULANDI',o.name,len(o.data.vertices))
      except Exception as e: print('MASK_HATA',o.name,e)
# tarayıcı (three.js) nokta başına en çok 4 kemik etkisi okur: 4'e sınırla ve yeniden dengele
for o in list(bpy.data.objects):
  if o.type=='MESH' and any(m.type=='ARMATURE' for m in o.modifiers):
    for x in bpy.context.view_layer.objects: x.select_set(False)
    bpy.context.view_layer.objects.active=o; o.select_set(True)
    bpy.ops.object.vertex_group_limit_total(group_select_mode='BONE_DEFORM',limit=4)
    bpy.ops.object.vertex_group_normalize_all(group_select_mode='BONE_DEFORM',lock_active=False)
print('ETKI_4')
# malzeme saydamlığı: ten/kıyafet OPAK, saç/kaş KENAR KESME (glTF BLEND tarayıcıda derinlik bozuyor)
for mt in bpy.data.materials:
  if not mt.use_nodes: continue
  nt=mt.node_tree;bs=[n for n in nt.nodes if n.type=='BSDF_PRINCIPLED']
  if not bs: continue
  a=bs[0].inputs['Alpha'];hairy=any(w in mt.name.lower() for w in ('hair','brow','short0','bob0','lash'))
  for l in list(a.links):
    src=l.from_socket;nt.links.remove(l)
    if hairy:
      m=nt.nodes.new('ShaderNodeMath');m.operation='GREATER_THAN';m.inputs[1].default_value=0.5;nt.links.new(src,m.inputs[0]);nt.links.new(m.outputs[0],a)
  if not hairy: a.default_value=1.0
  try: mt.surface_render_method='DITHERED'
  except Exception: pass
  mt.use_backface_culling=not hairy
print('MALZEME_TAMAM')
exec(open('/home/claude/insan/ek.py').read())
bpy.ops.export_scene.gltf(filepath=OUT,export_format='GLB',export_apply=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_yup=True)
print('YAZILDI',OUT,os.path.getsize(OUT)//1024,'KB')
