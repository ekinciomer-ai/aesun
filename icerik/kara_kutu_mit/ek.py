import bpy, mathutils, os, math
from mathutils import Vector, Quaternion
rig=[o for o in bpy.data.objects if o.type=='ARMATURE'][0]
# ---- gözler: kahverengi iris dokusu ----
EYE=os.path.join(os.environ.get('MH_ASSETS',''),'eyes/materials/brown_eye.png')
for o in bpy.data.objects:
  if o.type=='MESH' and ('low-poly' in o.name.lower() or 'eye' in o.name.lower() and 'brow' not in o.name.lower() and 'lash' not in o.name.lower()):
    if os.path.exists(EYE):
      m=bpy.data.materials.new('goz');m.use_nodes=True;nt=m.node_tree;b=[n for n in nt.nodes if n.type=='BSDF_PRINCIPLED'][0]
      tx=nt.nodes.new('ShaderNodeTexImage');tx.image=bpy.data.images.load(EYE);nt.links.new(tx.outputs['Color'],b.inputs['Base Color']);b.inputs['Roughness'].default_value=.15
      o.data.materials.clear();o.data.materials.append(m);print('GOZ',o.name)
# ---- poz yardımcıları (dünya yönüne nişan: x=karakterin solu, -y=ön, z=yukarı) ----
R=rig.matrix_world.to_3x3().normalized().inverted()
PB=rig.pose.bones
def P(n):return PB.get('mixamorig:'+n)
for pb in PB: pb.rotation_mode='QUATERNION'
def reset():
  for pb in PB: pb.rotation_quaternion=Quaternion();pb.location=(0,0,0)
  bpy.context.view_layer.update()
ORDER=['Hips','Spine','Spine1','Spine2','Neck','Head','LeftShoulder','LeftArm','LeftForeArm','LeftHand','RightShoulder','RightArm','RightForeArm','RightHand','LeftUpLeg','LeftLeg','LeftFoot','RightUpLeg','RightLeg','RightFoot']
def aim(n,d):
  pb=P(n)
  if pb is None: return
  bpy.context.view_layer.update()
  M=pb.matrix.copy();cur=(M.to_3x3()@Vector((0,1,0))).normalized();tgt=(R@Vector(d)).normalized()
  q=cur.rotation_difference(tgt);loc=M.translation.copy();N=q.to_matrix().to_4x4()@M;N.translation=loc;pb.matrix=N
def mir(d):return (-d[0],d[1],d[2])
def pose(spec):
  reset()
  for n in ORDER:
    if n in spec: aim(n,spec[n])
    elif n.startswith('Right') and ('Left'+n[5:]) in spec and n not in spec and spec.get('_mir',True): aim(n,mir(spec['Left'+n[5:]]))
  bpy.context.view_layer.update()
ARM_D={'LeftArm':(.13,.03,-1),'LeftForeArm':(.06,-.2,-1),'LeftHand':(.05,-.14,-1)}
LEG_D={'LeftUpLeg':(.07,0,-1),'LeftLeg':(.06,.03,-1)}
def merge(*ds):
  o={}
  for d in ds:o.update(d)
  return o
STAND=merge(ARM_D,LEG_D)
SIT=merge({'Spine':(0,-.06,1),'LeftUpLeg':(.1,-1,-.03),'LeftLeg':(.03,.12,-1),'LeftArm':(.12,-.38,-.92),'LeftForeArm':(-.06,-.97,-.22),'LeftHand':(-.06,-.92,-.38)})
SIT_LEAN=merge(SIT,{'Spine':(0,-.3,.95),'Spine1':(0,-.25,.97),'Neck':(0,-.12,1),'LeftArm':(.14,-.55,-.83),'LeftForeArm':(-.12,-.99,-.05),'LeftHand':(-.1,-.99,-.05)})
OFFER=merge(STAND,{'RightArm':(-.14,-.72,-.68),'RightForeArm':(-.06,-.99,.08),'RightHand':(-.04,-1,.05),'Spine1':(0,-.12,1)})
POINT=merge(STAND,{'RightArm':(-.14,-.97,.0),'RightForeArm':(-.05,-1,.08),'RightHand':(-.05,-1,.06)})
PROTEST=merge(LEG_D,{'LeftArm':(.4,-.45,-.8),'LeftForeArm':(.38,-.9,.18),'LeftHand':(.42,-.88,.12),'Spine':(0,.06,1),'Head':(0,.08,1)})
HOLD=merge(LEG_D,{'LeftArm':(.14,-.25,-.96),'LeftForeArm':(-.38,-.84,.38),'LeftHand':(-.3,-.88,.36),'Neck':(0,-.2,.98),'Head':(0,-.38,.93)})
HANDS_HIP=merge(LEG_D,{'LeftArm':(.55,.1,-.83),'LeftForeArm':(-.45,-.25,-.86),'LeftHand':(-.6,-.1,-.8)})
def W(phase):
  a=math.sin(phase*2*math.pi);c=math.cos(phase*2*math.pi)
  return {'LeftUpLeg':(.07,-.42*a,-.9),'LeftLeg':(.05,-.42*a+.6*max(0,c),-.85),'RightUpLeg':(-.07,.42*a,-.9),'RightLeg':(-.05,.42*a+.6*max(0,-c),-.85),
     'LeftArm':(.13,.32*a,-.95),'LeftForeArm':(.06,.1*a-.25,-1),'RightArm':(-.13,-.32*a,-.95),'RightForeArm':(-.06,-.1*a-.25,-1),'Spine1':(0,-.06,1),'_mir':False}
ACTS={'ayakta':[STAND],'otur':[SIT],'otur_egil':[SIT_LEAN],'uzat':[OFFER],'goster':[POINT],'itiraz':[PROTEST],'tut':[HOLD],'bel':[HANDS_HIP]}
FPS=24
def key_all(f):
  for pb in PB: pb.keyframe_insert('rotation_quaternion',frame=f)
rig.animation_data_create()
made=[]
for name,poses in ACTS.items():
  act=bpy.data.actions.new(name);rig.animation_data.action=act
  pose(poses[0]);key_all(1)
  # nefes: gövde/baş çok hafif
  for f,amp in [(25,1),(49,0)]:
    pose(poses[0]);sp=P('Spine1')
    if sp: sp.rotation_quaternion=sp.rotation_quaternion@Quaternion((1,0,0),.025*amp)
    hd=P('Head')
    if hd: hd.rotation_quaternion=hd.rotation_quaternion@Quaternion((0,0,1),.04*amp)
    key_all(f)
  made.append(act)
PK=[(0,4),(0.1,-16),(0.42,-16),(0.6,-48),(0.72,-34),(0.9,-4),(1.0,4)]
FL=0.14
def pitch(ph):
  for (a0,v0),(a1,v1) in zip(PK,PK[1:]):
    if a0<=ph<=a1:
      t=(ph-a0)/(a1-a0);t=t*t*(3-2*t);return v0+(v1-v0)*t
  return PK[0][1]
def walk_pose(p):
  reset()
  hp=P('Hips');bpy.context.view_layer.update()
  dz=-0.03+0.018*(1-math.cos(4*math.pi*p))/2
  M=hp.matrix.copy();M.translation=M.translation+(R@Vector((0,0,dz)));hp.matrix=M
  rx=0.04*math.sin(2*math.pi*p)  # kalça yana hafif dönüş
  bpy.context.view_layer.update()
  S=0.22;LIFT=0.10;ANK=0.075;L1=P('LeftUpLeg').bone.length;L2=P('LeftLeg').bone.length
  for side,ph,sx in (('Left',p,1),('Right',(p+.5)%1,-1)):
    if ph<0.6: q=ph/0.6;fy=-S+2*S*q;bump=0
    else: q=(ph-0.6)/0.4;fy=S-2*S*(q*q*(3-2*q));bump=LIFT*math.sin(math.pi*q)
    th=pitch(ph);fz=ANK+max(0.0,FL*(math.sin(math.radians(-th))-math.sin(math.radians(16))))+bump
    ft=(0,-math.cos(math.radians(th)),math.sin(math.radians(th)))
    bpy.context.view_layer.update()
    hip=rig.matrix_world@P(side+'UpLeg').head
    tgt=Vector((hip.x+sx*0.02,hip.y+fy,fz));d=tgt-hip;dist=min(d.length,L1+L2-0.005);dn=d.normalized()
    a=math.acos(max(-1,min(1,(L1*L1+dist*dist-L2*L2)/(2*L1*dist))))
    ax=Vector((1,0,0));thigh=(mathutils.Matrix.Rotation(a,3,ax)@dn)  # öne doğru büküm (-y)
    if thigh.y>dn.y: thigh=(mathutils.Matrix.Rotation(-a,3,ax)@dn)
    knee=hip+thigh*L1;shin=(hip+dn*dist-knee).normalized()
    aim(side+'UpLeg',tuple(thigh));aim(side+'Leg',tuple(shin));aim(side+'Foot',ft)
  sw=0.22*math.cos(2*math.pi*p)
  aim('LeftArm',(.13,sw,-.98));aim('LeftForeArm',(.06,sw-.18,-.98));aim('LeftHand',(.05,sw-.15,-.98))
  aim('RightArm',(-.13,-sw,-.98));aim('RightForeArm',(-.06,-sw-.18,-.98));aim('RightHand',(-.05,-sw-.15,-.98))
  bpy.context.view_layer.update()
def key_hips(f):
  P('Hips').keyframe_insert('location',frame=f)
act=bpy.data.actions.new('yuru');rig.animation_data.action=act
for i in range(0,31):
  walk_pose((i%30)/30);key_all(1+i);key_hips(1+i)
made.append(act)
# NLA'ya it (dışa aktarımda her eylem ayrı animasyon olsun)
for a in made:
  tr=rig.animation_data.nla_tracks.new();tr.name=a.name;st=tr.strips.new(a.name,1,a);st.name=a.name
rig.animation_data.action=None;reset()
print('EYLEMLER',[a.name for a in made])
# ---- kontrol karesi ----
if os.environ.get('KONTROL'):
  sc=bpy.context.scene;sc.render.engine='BLENDER_WORKBENCH';sc.display.shading.light='STUDIO';sc.display.shading.color_type='TEXTURE'
  sc.render.resolution_x=300;sc.render.resolution_y=450
  cam=bpy.data.objects.new('kam',bpy.data.cameras.new('kam'));sc.collection.objects.link(cam);sc.camera=cam
  import mathutils as mu
  mn=Vector((1e9,)*3);mx=Vector((-1e9,)*3)
  for o in bpy.data.objects:
    if o.type=='MESH':
      for c in o.bound_box:
        w=o.matrix_world@Vector(c);mn=Vector(map(min,mn,w));mx=Vector(map(max,mx,w))
  h=mx.z-mn.z;ctr=(mn+mx)/2
  cam.location=ctr+Vector((h*.9,-h*1.6,h*.05));d=ctr-cam.location;cam.rotation_euler=d.to_track_quat('-Z','Y').to_euler();cam.data.lens=50
  out=os.environ['KONTROL'];os.makedirs(out,exist_ok=True);rig.animation_data.use_nla=False
  for name,poses in list(ACTS.items())+[('yuru%02d'%k,[k]) for k in (0,12,25,37,50,62,75,87)]:
    if name.startswith('yuru'):
      cam.location=ctr+Vector((h*1.7,0,0));dd=ctr-cam.location;cam.rotation_euler=dd.to_track_quat('-Z','Y').to_euler()
    (walk_pose(poses[0]/100) if isinstance(poses[0],int) else pose(poses[0]));sc.render.filepath=f'{out}/{name}.png';bpy.ops.render.render(write_still=True)
  reset();rig.animation_data.use_nla=True
  if os.environ.get('SADECE_KONTROL'): raise SystemExit
