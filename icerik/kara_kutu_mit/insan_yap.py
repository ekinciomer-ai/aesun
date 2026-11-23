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
mac.update(gender=1.0,age=0.55,muscle=0.62,weight=0.55,height=0.55,proportions=0.6)
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
# şekil anahtarlarını uygula (dışa aktarımda morph olmasın)
for o in list(bpy.data.objects):
  if o.type=='MESH' and o.data.shape_keys:
    bpy.context.view_layer.objects.active=o; o.select_set(True)
    o.shape_key_add(name='MIX',from_mix=True)
    ks=o.data.shape_keys.key_blocks
    for kb in list(ks)[:-1]: o.shape_key_remove(kb)
    o.shape_key_remove(o.data.shape_keys.key_blocks[0]); o.select_set(False)
  if o.type=='MESH':
    for m in list(o.modifiers):
      if m.type in('SUBSURF',): o.modifiers.remove(m)
bpy.ops.export_scene.gltf(filepath=OUT,export_format='GLB',export_apply=True,export_animations=False,export_yup=True)
print('YAZILDI',OUT,os.path.getsize(OUT)//1024,'KB')
