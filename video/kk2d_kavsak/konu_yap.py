"""Kara Kutu: yeni konu sahnesi üretici. Şablon (sinema.html=F13, diorama.html=F5, kk3d.html=KK2D) + konu tanımı -> k3_<konu>.html
python3 konu_yap.py   (tüm konular)"""
import os,re
D=os.path.dirname(os.path.abspath(__file__))

def rep(s,a,b,zorunlu=True):
    if a not in s:
        if zorunlu: raise SystemExit(f"bulunamadı: {a[:80]}")
        return s
    return s.replace(a,b)

# ---- ortak parçalar ----
DUZ_YOL=[  # kuzey-güney yolunu kaldır, köşe kaldırımlarını birleştir (düz yol)
 ("koy(kutu(5,0.33,30,'#59606a'),0,0.17,0,0.45);       // kuzey-güney yol","koy(kutu(6.5,0.5,11.5,'#d8d2c4'),0,0.25,-9,0.6);koy(kutu(6.5,0.5,11.5,'#d8d2c4'),0,0.25,9,0.6);"),
 ("koy(kutu(0.14,0.34,1.2,'#f4f1e6'),0,0.17,i,0.55+Math.abs(i)*0.01)}","}"),
 ("koy(kutu(0.18,0.35,2.3,'#ffffff'),-2.9,0.17,1.25,0.7);   // DUR çizgisi",""),
]
LEVHA_YOK=("koy(levha,-3.4,0.5,3.4,1.6);","")
ARABA=lambda renk:f"""van.clear();{{const a=kutu(2.6,0.7,1.3,'{renk}');a.position.set(0,0.75,0);van.add(a);const b=kutu(1.4,0.6,1.2,'#eef2f4');b.position.set(-0.2,1.35,0);van.add(b);
 const c=kutu(0.06,0.45,1.05,'#86c4dc');c.position.set(0.52,1.35,0);van.add(c);
 for(const [x,z] of [[-0.85,0.62],[-0.85,-0.62],[0.85,0.62],[0.85,-0.62]]){{const w=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.3,0.22,14),M('#26282b'));w.rotation.x=Math.PI/2;w.position.set(x,0.3,z);van.add(w)}}
 van.traverse(o=>{{if(o.isMesh)o.castShadow=true}})}}
"""
YOLCU="""{const ri2=kutu(0.3,0.5,0.3,'#7a3fa0');ri2.position.set(-0.5,0.95,0);moto.add(ri2);const k2=new THREE.Mesh(new THREE.SphereGeometry(0.18,14,10),M('#f2d23a',0.4));k2.position.set(-0.5,1.35,0);moto.add(k2);moto.traverse(o=>{if(o.isMesh)o.castShadow=true})}
"""
GECE=[("sc.background=new THREE.Color('#cfe3ee');","sc.background=new THREE.Color('#2a3550');"),
      ("new THREE.HemisphereLight('#ffffff','#b9a98f',1.6)","new THREE.HemisphereLight('#9fb4e0','#3a3a48',0.9)"),
      ("new THREE.DirectionalLight('#fff4e0',2.6)","new THREE.DirectionalLight('#c8d6ff',1.1)")]
KIS=[("sc.background=new THREE.Color('#cfe3ee');","sc.background=new THREE.Color('#dfe6ec');"),
     ("koy(kutu(30,0.3,30,'#9fc26a'),0,0.15,0,0.15);","koy(kutu(30,0.3,30,'#f4f7fa'),0,0.15,0,0.15);"),
     ("M('#5f9a48',0.9)","M('#3f6e4a',0.9)"),("'#d8d2c4'","'#eef3f6'")]

KONULAR={
# ======================= KAZADAN SONRA KAÇMAK · F13 =======================
'kacmak':dict(sablon='sinema.html',ek=DUZ_YOL+[LEVHA_YOK],
 ekle="koy(kutu(30,0.345,0.16,'#f4f1e6'),0,0.17,0,0.55);   // devamlı çizgi\n"+YOLCU,
 konum="""const CARP=[0.4,-1.0];
function konumlar(z){
 let vx,vz,mx;
 if(z<1){vx=lerp(-14,-4.5,ease(z));vz=1.25;mx=lerp(14,5,ease(z))}
 else if(z<1.7){const k=(z-1)/0.7;vx=lerp(-4.5,CARP[0]-1.9,k);vz=lerp(1.25,-0.95,ease(k));mx=lerp(5,CARP[0]+1.1,k)}
 else{const k=(z-1.7)/0.6;vz=lerp(-0.95,1.25,cl(k/0.6));vx=CARP[0]-1.9+(k<0.3?0:ease((k-0.3)/0.7)*18);mx=CARP[0]+1.1}
 let m={x:mx,z:-1.25,ry:Math.PI,rz:0};
 if(z>1.7){const k=eout((z-1.7)/0.6);m={x:mx+1.6*k,z:-1.25-0.9*k,ry:Math.PI-0.9*k,rz:1.3*k}}
 return {v:{x:vx,z:vz,ry:z>1&&z<1.7?-0.35*Math.sin(Math.PI*(z-1)/0.7):0},m}}""",
 v3sonra="(k>=1?cl((t-K.carp)/3.5)*0.6:0)",
 kareek="van.visible=van.visible&&va.x<15;",
 etiket3="+etiket(ekran(-7,0.5,0),'DEVAMLI ÇİZGİ',INK,SAR)",
 c1="else if(c===1){cp=[mo.x-8,1.4,mo.z-2.6];ct=[mo.x,0.8,mo.z];fov=42}",
 v3="if(kc0<-1.4){cp=[va.x-7,2.1,va.z+3.2];ct=[va.x+4,0.5,-1];fov=44}else{cp=[CARP[0]-10,2.8,CARP[1]+6];ct=[CARP[0]+2,0.6,CARP[1]];fov=48}",
 ust="if(v==='V3'&&olayZ(t)>1.86&&va.x<14)o+=etiket(ekran(va.x,2.8,va.z),'KAÇIYOR',BEY,KIR);",
 L=dict(baslik='Kazadan sonra kaçmak kurtarır mı?',maket='Yargıtay dosyasından · sinematik canlandırma',van='Kamyonet',moto='Motosiklet + yolcu',
  cat='ÇARPIŞMA',ksoru='Kaçmak ne kazandırdı?',sik=['A  Hiçbir şey olmadı','B  Sadece trafik cezası','C  9 yıl hapis'],
  ip=['Devamlı çizgi','Alkol: 1,96 promil','Eski alkol hükmü'],k1='Kamyonet sürücüsü',asli='ASLİ KUSUR · 9 YIL',ceza='Bilinçli taksir · indirim yok · ehliyet 3 yıl',
  k2='Kaza anındaki alkol (geri hesap)',tali='≈ 2,4 PROMİL',onay='YARGITAY ONADI',dogru='Doğru şık: C',
  kural=['1  Kaza yaptıysan DUR',"2  112'yi ara, yardım et",'3  Alkollüysen direksiyona geçme'],yav='Kaçmak seni KURTARMAZ'),
 anah={"carp":"Çarpışıyorlar","tali":"Temel ceza","onay":"Yargıtay onadı"}),

# ======================= EMNİYET ŞERİDİ / DURAN ARAÇ · F13 =======================
'serit':dict(sablon='sinema.html',ek=DUZ_YOL+[LEVHA_YOK]+GECE,
 ekle=ARABA('#8a8f96')+YOLCU+"{const f=new THREE.Mesh(new THREE.SphereGeometry(0.13,10,8),new THREE.MeshBasicMaterial({color:'#fff6c0'}));f.position.set(0.72,0.62,0);moto.add(f)}\n",
 konum="""const CARP=[0.0,1.75];
function konumlar(z){
 let mx,mz;
 if(z<1){mx=lerp(-14,-5,ease(z));mz=1.25}
 else if(z<1.7){const k=(z-1)/0.7;mx=lerp(-5,CARP[0]-0.6,k);mz=lerp(1.25,1.8,k)}
 else{mx=CARP[0]-0.6;mz=1.8}
 let m={x:mx,z:mz,ry:0,rz:0};
 if(z>1.7){const k=eout((z-1.7)/0.6);m={x:mx-0.6*k,z:mz-1.2*k,ry:0.7*k,rz:1.3*k}}
 return {v:{x:1.5,z:2.05,ry:0},m}}""",
 etiket3="+etiket(ekran(1.5,2.4,2.9),'YOLA TAŞMIŞ',INK,SAR)",
 c1="else if(c===1){cp=[mo.x+8,1.4,mo.z+2.6];ct=[mo.x,0.8,mo.z];fov=42}",
 v3="if(kc0<-1.4){cp=[mo.x-6,1.7,mo.z+1.6];ct=[1.5,0.6,2];fov=44}else{cp=[CARP[0]-6,2.4,CARP[1]-5.5];ct=[CARP[0]+1,0.6,CARP[1]];fov=48}",
 ust="",
 L=dict(baslik='Duran araca çarpan hep tam kusurlu mu?',maket='Yargıtay dosyasından · sinematik canlandırma',van='Arızalı araç',moto='Motosiklet + yolcu',
  cat='ÇARPMA',ksoru='Duran aracın sürücüsüne ne oldu?',sik=['A  Hiçbir şey olmadı','B  Sadece trafik cezası','C  Yaralamadan mahkûm'],
  ip=['Yolu kapatıyordu','Gece, karanlık','Uyarı işareti yok'],k1='Duran aracın sürücüsü',asli='MAHKÛM OLDU',ceza='Taksirle yaralama · hapis adli para cezasına çevrildi',
  k2='Yargıtay notu',tali='ASLİ KUSUR SAYILMALIYDI',onay='YARGITAY ONADI',dogru='Doğru şık: C',
  kural=['1  Dörtlüleri yak','2  Reflektörü geriye koy','3  Aracı yoldan çıkar'],yav='Durmak yetmez, GÖRÜN'),
 anah={"carp":"arkadan çarpıyor","tali":"Hatta","onay":"Yargıtay onadı"}),

# ======================= BUZLU YOL · F5 =======================
'buz':dict(sablon='diorama.html',ek=DUZ_YOL+[LEVHA_YOK]+KIS,
 ekle=ARABA('#c8433a')+"koy(new THREE.Mesh(new THREE.BoxGeometry(7,0.02,4.6),new THREE.MeshStandardMaterial({color:'#bfe6ff',roughness:0.05,metalness:0.2,transparent:true,opacity:0.75})),1,0.35,0,0.8);   // buz\n",
 konum="""const CARP=[5.2,5.0];
function konumlar(z){
 let x,zz,ry=0;
 if(z<1){x=lerp(-14,-2.6,ease(z));zz=1.25}
 else if(z<1.7){const k=(z-1)/0.7;x=lerp(-2.6,4.4,k);zz=lerp(1.25,4.4,k*k);ry=-2.1*k}
 else{const k=eout((z-1.7)/0.6);x=4.4+0.5*k;zz=4.4+0.5*k;ry=-2.1-0.4*k}
 const v={x,z:zz,ry};return {v,m:{x,z:zz,ry:0,rz:0}}}""",
 kareek="moto.visible=false;",
 etiket2="",
 etiket3="+etiket(ekran(1,0.8,0),'BUZ',INK,'#bfe6ff')",
 L=dict(baslik='Yol buzluysa faturayı devlet mi öder?',maket='Danıştay dosyasından · 3D maket',van='Otomobil',moto='',dur='',
  cat='KAYDI!',ksoru='Hasarı kim ödedi?',sik=['A  Devlet ödedi','B  Yarı yarıya','C  İdare hiç ödemedi'],
  ip=['Zemin buz tutmuştu','Kasko idareden istedi','Teknik bilirkişi raporu'],k1='Sürücü',asli='%100 KUSURLU',ceza='20.020 TL talep reddedildi',
  k2='İdare',tali='HİZMET KUSURU YOK',onay='DANIŞTAY ONADI',dogru='Doğru şık: C',
  kural=['1  Kışın hızını düşür','2  Takip mesafesini aç','3  Kış lastiği kullan'],yav='Buz bahane değil: YAVAŞLA',
  not_='Danıştay kararından uyarlanmıştır · Kişi, plaka, yer bilgisi yok · Hukuki danışmanlık değildir'),
 anah={"carp":"yoldan çıkıyor","tali":"İdarenin","onay":"Danıştay"}),

# ======================= GEÇİT DIŞI YAYA · KK2D =======================
'yaya':dict(sablon='kk3d.html',ek=DUZ_YOL+[LEVHA_YOK],
 ekle=ARABA('#3c7fc0')+"""koy(kutu(30,0.45,0.7,'#b9c79a'),0,0.25,0,0.5);   // orta refüj
const isik=new THREE.Group();{const d=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.07,2.6,8),M('#5a5f64',0.4,0.6));d.position.y=1.3;isik.add(d);
 const k=kutu(0.4,1.1,0.4,'#2a2d31');k.position.y=2.8;isik.add(k);
 [['#ff3b2f',3.15],['#ffc21a',2.8],['#2fd05a',2.45]].forEach(([c,y],i)=>{const l=new THREE.Mesh(new THREE.SphereGeometry(0.13,10,8),new THREE.MeshStandardMaterial({color:c,emissive:i===2?c:'#000',emissiveIntensity:1.2}));l.position.set(0,y,0.21);isik.add(l)})}
koy(isik,-6,0.5,3.1,1.4);
const yaya=new THREE.Group();{const g=new THREE.Mesh(new THREE.CylinderGeometry(0.25,0.3,1.0,12),M('#d4574a'));g.position.y=0.8;yaya.add(g);
 const b=new THREE.Mesh(new THREE.SphereGeometry(0.24,14,10),M('#f0c9a0'));b.position.y=1.55;yaya.add(b);
 for(const x of [-0.12,0.12]){const a=kutu(0.14,0.5,0.14,'#2c3a52');a.position.set(x,0.25,0);yaya.add(a)}
 yaya.traverse(o=>{if(o.isMesh)o.castShadow=true})}
sc.add(yaya);
""",
 konum="""const CARP=[4.0,1.2];
function konumlar(z){
 let x;
 if(z<1)x=lerp(-14,-5.5,ease(z));else if(z<1.7)x=lerp(-5.5,CARP[0]-2.2,(z-1)/0.7);else x=CARP[0]-2.2+0.9*eout((z-1.7)/0.5);
 let m={x:4.0,z:0.25,ry:0,rz:0};
 if(z>=1&&z<1.7)m.z=lerp(0.25,1.2,ease((z-1)/0.7));
 if(z>=1.7){const k=eout((z-1.7)/0.6);m={x:4.0+1.6*k,z:1.2+0.9*k,ry:0,rz:-1.45*k}}
 return {v:{x,z:1.25,ry:0},m}}""",
 kareek="moto.visible=false;yaya.position.set(mo.x,0.35,mo.z);yaya.rotation.set(mo.rz,0,0);",
 durnokta="ekran(-6,3.6,3.1)",
 T=dict(mit=['GEÇİT DIŞI YAYAYA','ÇARPAN KUSURSUZ?'],van='OTOMOBİL',moto='YAYA',sag='GEÇİT YOK',dur='IŞIK',
  bilgi='Sabah · tek yönlü cadde · hız sınırı 50',cat='ÇARPMA!',soru='SÜRÜCÜYE NE OLDU?',sik=['Kusursuz, beraat','Tali kusurlu, mahkûm','Tam kusurlu'],
  ipucu=['Geçit olmayan yerden indi','Yolda fren izi yoktu','Avukat: kusur yayada'],
  kv=['SÜRÜCÜ','TALİ KUSURLU','Fren izi yok · dikkatsiz','Taksirle öldürme: mahkûm','Hapis → adli para cezası'],
  km=['YAYA','KURALA AYKIRI GEÇTİ','Geçit olmayan yerden yola indi'],onay='YARGITAY ONADI',dogru='Doğru şık: B',
  ders='YAYA VARSA',dk=['1. Yolu sürekli izle','2. Yayayı görünce yavaşla','3. Geçit dışında da dikkat'],yav='Yaya hata yapsa da SEN DİKKAT ET',
  efsane='"Geçit dışıysa kusursuzum" diye kural YOK'),
 anah={"carp":"yayaya çarpıyor","tali":"Sürücü tali","onay":"Yargıtay onadı"}),
}

def js(v):
    if isinstance(v,list): return '['+','.join(js(x) for x in v)+']'
    return "'"+str(v).replace("'","\\'")+"'" if not str(v).startswith("'") else v

def uret(ad,k):
    s=open(f"{D}/{k['sablon']}",encoding='utf-8').read()
    for a,b in k['ek']: s=rep(s,a,b,zorunlu=False)
    # ekstra nesneler: araç tanımlarından sonra
    s=rep(s,"// çarpışma yıldızı",k['ekle']+"// çarpışma yıldızı")
    # konum fonksiyonu
    i=s.index("const CARP=[1.2,1.25];");j=s.index("return {v:{x:vx,z:1.25},m}}",i)+len("return {v:{x:vx,z:1.25},m}}")
    s=s[:i]+k['konum']+s[j:]
    if k.get('v3sonra'): s=rep(s,"(k>=1?cl((t-K.carp)/0.9)*0.6:0)",k['v3sonra'])
    s=rep(s,"van.position.set(va.x,0.32,va.z);moto.position.set(mo.x,0.32,mo.z);moto.rotation.set(mo.rz,mo.ry,0);",
          "van.position.set(va.x,0.32,va.z);van.rotation.set(0,va.ry||0,0);moto.position.set(mo.x,0.32,mo.z);moto.rotation.set(mo.rz,mo.ry,0);"+k.get('kareek',''))
    if k['sablon'] in ('sinema.html','diorama.html'):
        s=rep(s,"+etiket(ekran(-3.4,3.1,3.4),L.dur,BEY,KIR)",k.get('etiket3',''))
        if 'etiket2' in k: s=rep(s,"+etiket(ekran(mo.x,2.4,mo.z),L.moto,BEY,MAV)",k['etiket2'])
        s=rep(s,"T(140,490,L.van,","T(140,490,L.k1,");s=rep(s,"T(140,770,L.moto,","T(140,770,L.k2,")
        L=dict(k['L']);L.setdefault('kanal','KARA KUTU');L.setdefault('dur','');L['not']=L.pop('not_','Yargıtay kararından uyarlanmıştır · Kişi, plaka, yer bilgisi yok · Hukuki danışmanlık değildir')
        s=rep(s,"'Yargıtay dosyasından · sinematik canlandırma'","L.maket",zorunlu=False)
        i=s.index("const L={kanal:");j=s.index("};",i)+2
        s=s[:i]+"const L={"+",".join(f"{a}:{js(b)}" for a,b in L.items())+"};"+s[j:]
        s=rep(s,"T(540,370,L.baslik,58,","T(540,370,L.baslik,Math.min(58,1500/L.baslik.length),",zorunlu=False)
        s=rep(s,"L.baslik,v==='V1'?58:46","L.baslik,Math.min(v==='V1'?58:46,1500/L.baslik.length)",zorunlu=False)
        s=rep(s,"T(540,595,L.ksoru,64,","T(540,595,L.ksoru,Math.min(64,1350/L.ksoru.length),")
        if 'c1' in k: s=rep(s,"else if(c===1){cp=[mo.x+2.4,1.1,mo.z-8];ct=[mo.x,0.8,mo.z];fov=42}",k['c1'])
        if 'v3' in k: s=rep(s,"if(kc0<-1.4){cp=[-0.6,1.3,10.8];ct=[-3.4,1.7,3.4];fov=44}else{cp=[va.x-9.5,2.3,va.z-5.2];ct=[CARP[0]+1.4,0.6,CARP[1]+1.4];fov=46}",k['v3'])
        if k.get('ust'): s=rep(s," o+=altyazi(t);"," "+k['ust']+"\n o+=altyazi(t);")
    else:  # kk3d: T.tr alanlarını güncelle
        i=s.index(" tr:{kanal:");j=s.index("not:'",i);
        blok=s[i:j]
        for a,b in k['T'].items():
            blok=re.sub(rf"(?<=[{{,\s]){a}:(\[[^\]]*\]|'(?:[^'\\]|\\.)*')",lambda m_:f"{a}:{js(b)}",blok,count=1)
        s=s[:i]+blok+s[j:]
        s=rep(s,"dur:ekran(-3.4,3.2,3.4)","dur:"+k.get('durnokta','ekran(-3.4,3.2,3.4)'))
        s=rep(s,"etiket(S3.dur[0],S3.dur[1]-20,'DUR','#fff',KIR,24)","etiket(S3.dur[0],S3.dur[1]-20,L.dur,'#fff',KIR,24)")
        s=rep(s,"etiket(S3.moto[0],S3.moto[1]-60,L.sag,INK,SAR,26)","etiket(S3.moto[0]-20,S3.moto[1]+70,L.sag,INK,SAR,26)")
    out=f"{D}/k3_{ad}.html";open(out,'w',encoding='utf-8').write(s);print("yazıldı",out)

if __name__=='__main__':
    import sys
    for ad in (sys.argv[1:] or KONULAR):uret(ad,KONULAR[ad])
