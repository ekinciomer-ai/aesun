/* ======================= SAHNELER: DRONE NASIL ÇALIŞIR (Shorts 1 + 2) ======================= */
const S={};
const SAR=L("#F2C46B"),MAV=L("#6FE3FF");
// ---- metin dokusu (3D etiket ve kartlar için)
const YT=[];function yaziTex(satirlar,w=512,h=256,arka="rgba(5,10,20,.0)",cerceve=null){const c=document.createElement("canvas");c.width=w;c.height=h;const x=c.getContext("2d");const t=new THREE.CanvasTexture(c);
  const ciz=()=>{x.clearRect(0,0,w,h);x.fillStyle=arka;x.fillRect(0,0,w,h);if(cerceve){x.strokeStyle=cerceve;x.lineWidth=6;x.strokeRect(3,3,w-6,h-6)}
  satirlar.forEach(s=>{x.font=s.f;x.fillStyle=s.c;x.textAlign=s.a||"center";x.textBaseline="middle";x.fillText(s.t,s.x??w/2,s.y)});t.needsUpdate=true};ciz();YT.push(ciz);
  t.encoding=THREE.sRGBEncoding;t.anisotropy=8;return t}
function etiket(t,renk="#6FE3FF"){const tex=yaziTex([{t,f:"700 54px 'Space Mono'",c:renk,y:64}],640,128,"rgba(5,10,20,.72)",renk);
  const m=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false,opacity:0}));m.scale.set(1.25,.25,1);m.renderOrder=9;return m}
// ---- drone modeli
function dronYap(){const g=new THREE.Group();const govM=std("#20242c",.35,.38,{envMapIntensity:.9}),kabM=std("#8d959f",.1,.72,{envMapIntensity:.3}),kolM=std("#2b3039",.4,.4),motM=std("#9aa3ad",.9,.25,{envMapIntensity:1.3}),
  pM=std("#15181d",.1,.45),cizM=std("#F2C46B",.2,.4);
  const P={};// parçalar (patlatılmış görünüm için başlangıç konumları saklanır)
  const gov=new THREE.Mesh(new THREE.BoxGeometry(.62,.16,.9),govM);g.add(gov);P.gov=gov;
  const kab=new THREE.Mesh(new THREE.SphereGeometry(.42,40,20,0,Math.PI*2,0,Math.PI/2),kabM);kab.scale.set(.78,.32,1.1);kab.position.y=.08;g.add(kab);P.kab=kab;
  // uçuş kartı (yeşil PCB + parlayan işlemci)
  const kart=new THREE.Group();const pcb=new THREE.Mesh(new THREE.BoxGeometry(.36,.02,.36),std("#0f6b3a",.2,.45));kart.add(pcb);
  const cip=new THREE.Mesh(new THREE.BoxGeometry(.11,.025,.11),emi("#6FE3FF",0));cip.position.y=.02;kart.add(cip);
  for(let i=0;i<8;i++){const k=new THREE.Mesh(new THREE.BoxGeometry(.035,.02,.05),std("#111",.3,.5));k.position.set(-.14+i*.04,.015,.13);kart.add(k)}
  kart.position.y=.1;g.add(kart);P.kart=kart;P.cip=cip;
  // GPS
  const gps=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,.04,32),std("#d9dde3",.2,.3));gps.position.set(0,.24,-.18);g.add(gps);P.gps=gps;
  // batarya
  const bat=new THREE.Mesh(new THREE.BoxGeometry(.32,.12,.42),std("#3a3f49",.2,.4));bat.position.set(0,.13,.22);g.add(bat);P.bat=bat;
  const batS=new THREE.Mesh(new THREE.BoxGeometry(.33,.03,.08),cizM);batS.position.set(0,.13,.44);g.add(batS);P.batS=batS;
  // gimbal + kamera
  const gim=new THREE.Group();const gk=new THREE.Mesh(new THREE.BoxGeometry(.16,.12,.14),std("#14171c",.4,.35));gim.add(gk);
  const lens=new THREE.Mesh(new THREE.CylinderGeometry(.045,.05,.04,24),std("#0a0c10",.9,.1,{envMapIntensity:2}));lens.rotation.x=Math.PI/2;lens.position.z=-.08;gim.add(lens);
  gim.position.set(0,-.16,-.42);g.add(gim);P.gim=gim;
  // kollar, motorlar, pervaneler, ESC'ler
  P.kol=[];P.mot=[];P.pv=[];P.disk=[];P.esc=[];P.yon=[];
  const konum=[[1,-1],[-1,-1],[1,1],[-1,1]];// ön sağ, ön sol, arka sağ, arka sol
  konum.forEach(([sx,sz],i)=>{const uc=V3(sx*.78,0,sz*.78);
    const kol=new THREE.Mesh(new THREE.BoxGeometry(.06,.05,1),kolM);kol.position.copy(uc.clone().multiplyScalar(.5));kol.lookAt(uc.x*2,0,uc.z*2);g.add(kol);P.kol.push(kol);
    const esc=new THREE.Mesh(new THREE.BoxGeometry(.09,.02,.13),std("#1b4fa0",.3,.4));esc.position.copy(uc.clone().multiplyScalar(.55));esc.position.y=.04;esc.lookAt(uc.x*2,.04,uc.z*2);g.add(esc);P.esc.push(esc);
    const mot=new THREE.Mesh(new THREE.CylinderGeometry(.075,.08,.1,28),motM);mot.position.set(uc.x,.06,uc.z);g.add(mot);P.mot.push(mot);
    const pv=new THREE.Group();const kanat=new THREE.Mesh(new THREE.BoxGeometry(.62,.008,.06),pM);pv.add(kanat);const k2=kanat.clone();k2.rotation.y=Math.PI;pv.add(k2);
    pv.position.set(uc.x,.13,uc.z);g.add(pv);P.pv.push(pv);
    const disk=new THREE.Mesh(new THREE.CircleGeometry(.32,48),new THREE.MeshBasicMaterial({color:L("#c8d2dc"),transparent:true,opacity:.12,depthWrite:false,side:THREE.DoubleSide}));disk.rotation.x=-Math.PI/2;disk.position.set(uc.x,.135,uc.z);g.add(disk);P.disk.push(disk);
    const yonD=i===0||i===3?1:-1;// çapraz çiftler aynı yönde
    P.yon.push(yonD);
    // ayaklar
    if(sz>0||true){const ay=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.2,8),kolM);ay.position.set(uc.x*.75,-.12,uc.z*.75);g.add(ay)}
  });
  // led ışıkları: önde kırmızı, arkada yeşil
  P.led=[];konum.forEach(([sx,sz])=>{const l=spr(sz<0?"#ff4040":"#40ff7a",.22,.9);l.position.set(sx*.78,-.02,sz*.78);g.add(l);P.led.push(l)});
  g.traverse(o=>{if(o.isMesh)o.userData.ilk=o.position.clone()});[P.kart,P.gim].forEach(o=>o.userData.ilk=o.position.clone());P.pv.forEach(o=>o.userData.ilk=o.position.clone());
  g.userData.P=P;return g}
function pervane(d,t,hiz=1,farkli=null){const P=d.userData.P;P.pv.forEach((p,i)=>{const h=(farkli?farkli[i]:1)*hiz;p.rotation.y=P.yon[i]*t*38*h;P.disk[i].material.opacity=.05+.12*Math.min(1,h)})}
function stud(sc){sc.background=L("#05070c");gok(sc,"#02040a","#08101c","#020306");const z=zemin(sc,"#07090e",30,.8);z.position.y=-1.6;
  const iz=new THREE.GridHelper(40,40,L("#163049"),L("#0e1d2e"));iz.position.y=-1.59;iz.material.transparent=true;iz.material.opacity=.5;sc.add(iz);isik(sc,"#ffffff",2.2,"#6FE3FF",1.0);return z}
function ok(renk){const g=new THREE.Group();const m=new THREE.MeshBasicMaterial({color:L(renk),transparent:true,opacity:0,depthWrite:false});
  const yay=new THREE.Mesh(new THREE.TorusGeometry(.4,.018,8,64,Math.PI*1.4),m);yay.rotation.x=-Math.PI/2;g.add(yay);
  const uc=new THREE.Mesh(new THREE.ConeGeometry(.06,.14,16),m);uc.position.set(.4,0,0);uc.rotation.x=Math.PI/2;g.add(uc);g.userData.m=m;return g}

// 0) HAVADA ASILI: yakın plan, pervaneler bulanık, hafif salınım
S.havada=(()=>{const sc=new THREE.Scene();const c=cam();stud(sc);const d=dronYap();sc.add(d);
  return{sc,c,ex:.85,bl:[.5,.45,.85],kur(q,t){d.position.set(0,Math.sin(t*1.3)*.05,0);d.rotation.set(Math.sin(t*.9)*.03,t*.15,Math.sin(t*1.1)*.03);pervane(d,t,1.2);
    orb(c,V3(0,0,0),lerp(2.2,3.2,eio(q))*(YATAY?.9:1.25),lerp(.4,1.2,q),lerp(.08,.3,q))},veri(q){return`4 PERVANE<small>HAVADA ASILI</small>`}}})();
// 1) PERVANE YÖNLERİ: oklar, çapraz çiftler
S.pervane=(()=>{const sc=new THREE.Scene();const c=cam();stud(sc);const d=dronYap();sc.add(d);const P=d.userData.P;
  const oklar=P.pv.map((p,i)=>{const o=ok(P.yon[i]>0?"#F2C46B":"#6FE3FF");o.position.copy(p.position);o.position.y+=.06;if(P.yon[i]<0)o.scale.x=-1;d.add(o);return o});
  const et=[etiket("SAAT YÖNÜ","#F2C46B"),etiket("TERS YÖN","#6FE3FF")];et[0].position.set(.78,.3,-1.25);et[1].position.set(-.78,.3,-1.25);et.forEach(e=>e.scale.set(1,.2,1));
  return{sc,c,ex:.85,bl:[.4,.4,.95],kur(q,t){const yav=lerp(1,.08,sm(0,.25,q));pervane(d,t,yav);d.position.y=Math.sin(t*1.3)*.04;
    oklar.forEach((o,i)=>{o.userData.m.opacity=sm(.15,.3,q)*.9;o.rotation.y=P.yon[i]*t*1.5});
    // son kısım: tek yön dönerse gövde topaç gibi döner (hatırlatma)
    const top=sm(.7,.95,q);d.rotation.y=top*t*2.5;
    orb(c,V3(0,0,0),(YATAY?2.6:3.4),lerp(.6,.9,q),lerp(1.0,.8,q))},veri(q){return q>.7?`DENGE<small>TORK BİRBİRİNİ SİLER</small>`:`2 + 2<small>KARŞI DÖNEN ÇİFTLER</small>`}}})();
// 2a) EĞİL: arka motorlar hızlanır, burun eğilir, ileri kayar
S.egil=(()=>{const sc=new THREE.Scene();const c=cam();const z=stud(sc);const d=dronYap();sc.add(d);const P=d.userData.P;
  const iz=pts(300,.05);sc.add(iz);
  return{sc,c,ex:.85,bl:[.55,.45,.85],kur(q,t){const e=sm(.1,.35,q);const ilerle=sm(.25,1,q);d.rotation.set(-e*.32,0,0);d.position.set(0,Math.sin(t*1.3)*.03,-ilerle*3.5);
    pervane(d,t,1,[1-e*.3,1-e*.3,1+e*.6,1+e*.6]);P.disk.forEach((k,i)=>k.material.color.copy(i>1&&e>.2?SAR:L("#c8d2dc")));
    const A=iz.geometry.attributes.position.array,C=iz.geometry.attributes.color.array;for(let i=0;i<300;i++){const k=(t*.8+i/300)%1;A.set([(i%10-5)*.08,-.1+Math.sin(i)*.05,d.position.z+.5+k*2.2],i*3);const o=(1-k)*ilerle*.8;C.set([o*.4,o*.9,o],i*3)}iz.geometry.attributes.position.needsUpdate=iz.geometry.attributes.color.needsUpdate=true;
    orb(c,V3(0,0,d.position.z),(YATAY?2.8:3.6),lerp(1.57-.9,1.57-1.25,q),.22)},veri(q){return`ARKA ↑<small>BURUN EĞİLİR · İLERİ</small>`}}})();
// 2b) DÖN: bir çift hızlanır, öteki yavaşlar → yerinde döner
S.don=(()=>{const sc=new THREE.Scene();const c=cam();stud(sc);const d=dronYap();sc.add(d);const P=d.userData.P;
  return{sc,c,ex:.85,bl:[.4,.4,.95],kur(q,t){const e=sm(.05,.3,q);pervane(d,t,1,P.yon.map(y=>y>0?1+e*.5:1-e*.35));P.disk.forEach((k,i)=>k.material.color.copy(P.yon[i]>0&&e>.2?SAR:L("#c8d2dc")));
    d.rotation.y=-e*(t-0)*1.2;d.position.y=Math.sin(t*1.3)*.03;orb(c,V3(0,0,0),(YATAY?2.8:3.5),.5,1.05)},veri(q){return`ÇİFT ↑ · ÇİFT ↓<small>YERİNDE DÖNÜŞ</small>`}}})();
// 3) BEYİN: patlatılmış görünüm, uçuş kartı parlar, sensör dalgaları
S.beyin=(()=>{const sc=new THREE.Scene();const c=cam();stud(sc);const d=dronYap();sc.add(d);const P=d.userData.P;
  const ayr=[[P.kab,V3(0,1.1,0)],[P.gps,V3(0,1.55,-.2)],[P.bat,V3(0,.55,1.0)],[P.batS,V3(0,.55,1.22)],[P.kart,V3(0,.62,0)],[P.gim,V3(0,-.55,-.65)]];
  P.mot.forEach((m,i)=>ayr.push([m,m.userData.ilk.clone().multiplyScalar(1.45).setY(.22)]));P.pv.forEach((m,i)=>ayr.push([m,m.userData.ilk.clone().multiplyScalar(1.45).setY(.55)]));P.disk.forEach(m=>ayr.push([m,m.userData.ilk.clone().multiplyScalar(1.45).setY(.55)]));
  P.esc.forEach(m=>ayr.push([m,m.userData.ilk.clone().multiplyScalar(1.3).setY(.3)]));
  const et=[["UÇUŞ KARTI",P.kart,V3(.55,.12,0),"#6FE3FF"],["GPS",P.gps,V3(.3,.05,0),"#F2C46B"],["BATARYA",P.bat,V3(.5,0,.1),"#F2C46B"],["MOTOR",P.mot[3],V3(-.3,.12,0),"#F2C46B"],["ESC",P.esc[3],V3(-.35,.1,0),"#6FE3FF"],["GİMBAL KAMERA",P.gim,V3(.55,-.1,0),"#6FE3FF"]].map(([t,o,ofs,r])=>{const e=etiket(t,r);e.scale.set(1,.2,1);sc.add(e);return{e,o,ofs}});
  const halka=[];for(let i=0;i<4;i++){const h=new THREE.Mesh(new THREE.TorusGeometry(1,.01,6,96),new THREE.MeshBasicMaterial({color:MAV,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));h.rotation.x=-Math.PI/2;sc.add(h);halka.push(h)}
  return{sc,c,ex:.85,bl:[.75,.5,.8],kur(q,t){const a=sm(.02,.3,q);d.rotation.set(0,t*.12,0);d.position.y=0;pervane(d,t,.06);
    ayr.forEach(([o,h])=>o.position.lerpVectors(o.userData.ilk,h,a));P.cip.material.emissiveIntensity=sm(.25,.4,q)*(2.5+Math.sin(t*9)*.8);
    halka.forEach((h,i)=>{const k=(t*.6+i/4)%1;h.position.copy(d.localToWorld(P.kart.position.clone()));h.scale.setScalar(.2+k*1.6);h.material.opacity=(1-k)*.8*sm(.3,.45,q)});
    et.forEach(({e,o,ofs},i)=>{e.position.copy(d.localToWorld(o.position.clone())).add(ofs);e.material.opacity=sm(.32+i*.04,.4+i*.04,q)});
    orb(c,V3(0,.3,0),(YATAY?3.4:4.6),lerp(.9,1.2,q),.32)},veri(q){return`SANİYEDE<br>YÜZLERCE<small>ÖLÇÜM · DÜZELTME</small>`}}})();
// 4) SON: parçalar yerine oturur, drone yükselir
S.son=(()=>{const sc=new THREE.Scene();const c=cam();stud(sc);const d=dronYap();sc.add(d);
  return{sc,c,ex:.85,bl:[.55,.45,.85],kur(q,t){pervane(d,t,1.3);const y=eio(sm(.15,.9,q))*1.6;d.position.set(0,y,0);d.rotation.set(Math.sin(t)*.03,t*.2,0);
    orb(c,V3(0,y*.9,0),(YATAY?3:4.2),1.1,lerp(.1,-.12,q))},veri(q){return`?<small>EHLİYET ŞART MI · YARIN</small>`}}})();

// ===== Shorts 2 =====
function kart(ad,alt,renk){const tex=yaziTex([{t:"İHA PİLOT LİSANSI",f:"700 30px 'Space Mono'",c:"#9fb3c8",y:52},{t:ad,f:"800 170px Archivo",c:renk,y:190},{t:alt,f:"700 34px 'Instrument Sans'",c:"#F3F5FA",y:320},{t:"SHGM · 2026",f:"400 26px 'Space Mono'",c:"#6b7c90",y:400}],512,448,"#0c1420",renk);
  const g=new THREE.Group();const m=new THREE.Mesh(new THREE.BoxGeometry(1.6,1.4,.04),[std("#0c1420"),std("#0c1420"),std("#0c1420"),std("#0c1420"),new THREE.MeshStandardMaterial({map:tex,roughness:.35,metalness:.1,envMap:ENV,envMapIntensity:.6,emissive:L("#ffffff"),emissiveMap:tex,emissiveIntensity:.35}),std("#0c1420")]);g.add(m);return g}
// 5) LİSANS: ağırlık terazisi silinir, kart gelir
S.lisans=(()=>{const sc=new THREE.Scene();const c=cam();stud(sc);const d=dronYap();sc.add(d);d.position.set(0,.2,0);
  const kg=etiket("AĞIRLIK","#ff6a6a");kg.scale.set(1.6,.32,1);kg.position.set(0,1.05,0);sc.add(kg);const cz=new THREE.Mesh(new THREE.BoxGeometry(1.7,.05,.02),new THREE.MeshBasicMaterial({color:L("#ff4a4a"),transparent:true,opacity:0}));cz.position.set(0,1.05,.05);sc.add(cz);
  const k=kart("P","EHLİYET","#F2C46B");k.position.set(0,1.0,-.6);sc.add(k);
  return{sc,c,ex:.85,bl:[.6,.45,.85],kur(q,t){pervane(d,t,1.1);d.position.y=.2+Math.sin(t*1.3)*.04;d.rotation.y=t*.2;kg.material.opacity=sm(.05,.15,q)*(1-sm(.5,.6,q));cz.material.opacity=sm(.3,.38,q)*(1-sm(.5,.6,q));cz.scale.x=sm(.3,.38,q);
    const g=sm(.5,.75,q);k.position.set(0,lerp(.4,1.15,g),lerp(-2,.2,g));k.scale.setScalar(g*.9+.001);k.rotation.y=(1-g)*1.2+Math.sin(t*.8)*.08;
    orb(c,V3(0,.7,0),(YATAY?3.4:4.4),1.57,.12)},veri(q){return q>.5?`LİSANS<small>YENİ ÖLÇÜ</small>`:`KİLO?<small>ESKİ ÖLÇÜ</small>`}}})();
// 6) KARTLAR: P0, P1, P2 (vurgu sırayla); kart2 = aynı sahne, vurgu ilerler
function kartSahne(vurgu){const sc=new THREE.Scene();const c=cam();stud(sc);
  const K=[kart("P0","HOBİ · 10+ YAŞ","#6FE3FF"),kart("P1","TİCARİ · 18+","#F2C46B"),kart("P2","GÖZ ÖTESİ · 18+","#ff8a5c")];K.forEach((k,i)=>{k.position.set((i-1)*(YATAY?1.9:1.25),0,0);k.scale.setScalar(YATAY?1:.72);sc.add(k)});
  return{sc,c,ex:.85,bl:[.6,.45,.85],kur(q,t){K.forEach((k,i)=>{const gir=sm(i*.08,i*.08+.2,vurgu?1:q);let one=0;if(vurgu){const a=i/3,b=(i+1)/3;one=sm(a,a+.06,q)*(1-sm(b-.02,b+.04,q))}
      k.position.y=lerp(-2.4,0,gir)+one*.25+Math.sin(t*1.2+i)*.03;k.position.z=one*.9;k.rotation.y=Math.sin(t*.7+i)*.12+(1-gir)*1.5;const s=(YATAY?1:.72)*(1+one*.25);k.scale.setScalar(s)});
    orb(c,V3(0,0,0),(YATAY?4.6:5.6),1.57,.05)},veri(q){if(!vurgu)return`3 LİSANS<small>30 TEMMUZ 2026</small>`;return["P0<small>HOBİ · GÖRÜŞ İÇİNDE</small>","P1<small>TİCARİ · GÖRÜŞ İÇİNDE</small>","P2<small>GÖRÜŞ ÖTESİ</small>"][Math.min(2,Math.floor(q*3))]}}}
S.kartlar=kartSahne(false);S.kartlar2=kartSahne(true);
// 7) YEŞİL BÖLGE: arazi üstünde uçan drone, yeşil daire, çevrede kırmızı yasak bölge
S.yesil=(()=>{const sc=new THREE.Scene();const c=cam();sc.background=L("#9cc4e8");gok(sc,"#5f97d0","#cfe3f2","#6c8a5a");isik(sc,"#fff4e0",2.6,"#9fd8ff",.8);
  const ar=new THREE.Mesh(new THREE.PlaneGeometry(80,80,1,1),std("#5c7a46",0,.95));ar.rotation.x=-Math.PI/2;ar.position.y=-2;sc.add(ar);
  for(let i=0;i<40;i++){const tar=new THREE.Mesh(new THREE.PlaneGeometry(2+rnd()*4,2+rnd()*5),std(["#7a8f4e","#6b8448","#8a8a52","#4f6f3c"][i%4],0,1));tar.rotation.x=-Math.PI/2;tar.position.set((rnd()-.5)*40,-1.99,(rnd()-.5)*40);sc.add(tar)}
  const yb=new THREE.Mesh(new THREE.CircleGeometry(4.5,64),new THREE.MeshBasicMaterial({color:L("#3dff8a"),transparent:true,opacity:0,depthWrite:false}));yb.rotation.x=-Math.PI/2;yb.position.y=-1.97;sc.add(yb);
  const yh=new THREE.Mesh(new THREE.RingGeometry(4.4,4.55,96),new THREE.MeshBasicMaterial({color:L("#3dff8a"),transparent:true,opacity:0}));yh.rotation.x=-Math.PI/2;yh.position.y=-1.96;sc.add(yh);
  const kb=new THREE.Mesh(new THREE.RingGeometry(9,9.15,96),new THREE.MeshBasicMaterial({color:L("#ff4a4a"),transparent:true,opacity:0}));kb.rotation.x=-Math.PI/2;kb.position.set(10,-1.96,-6);sc.add(kb);
  const kbd=new THREE.Mesh(new THREE.CircleGeometry(9,64),new THREE.MeshBasicMaterial({color:L("#ff4a4a"),transparent:true,opacity:0,depthWrite:false}));kbd.rotation.x=-Math.PI/2;kbd.position.set(10,-1.975,-6);sc.add(kbd);
  const d=dronYap();sc.add(d);const et=etiket("AYRI İZİN GEREKMEZ","#3dff8a");et.scale.set(1.9,.38,1);sc.add(et);
  return{sc,c,ex:.85,bl:[.35,.4,.92],kur(q,t){const a=t*.35;d.position.set(Math.cos(a)*2.4,.3+Math.sin(t*1.3)*.05,Math.sin(a)*2.4);d.rotation.set(-.12,-a,0);pervane(d,t,1.2);
    const g=sm(.1,.3,q);yb.material.opacity=g*.28;yh.material.opacity=g*.9;kb.material.opacity=sm(.4,.55,q)*.9;kbd.material.opacity=sm(.4,.55,q)*.18;et.position.set(0,1.7,0);et.material.opacity=sm(.2,.35,q);
    orb(c,V3(0,-.6,0),(YATAY?9:11),.8+t*.05,lerp(.55,.75,q))},veri(q){return`İHATTYS<small>HARİTADA YEŞİL = SERBEST</small>`}}})();
// 8) KİMLİK: uzaktan kimlik halkaları + coğrafi sınır duvarı
S.kimlik=(()=>{const sc=new THREE.Scene();const c=cam();stud(sc);const d=dronYap();sc.add(d);
  const halka=[];for(let i=0;i<5;i++){const h=new THREE.Mesh(new THREE.TorusGeometry(1,.012,6,96),new THREE.MeshBasicMaterial({color:MAV,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));sc.add(h);halka.push(h)}
  const duvar=new THREE.Mesh(new THREE.PlaneGeometry(6,3.2,24,12),new THREE.MeshBasicMaterial({color:L("#ff4a4a"),transparent:true,opacity:0,wireframe:true}));duvar.position.set(0,0,-2.2);sc.add(duvar);
  const id=etiket("UZAKTAN KİMLİK","#6FE3FF");sc.add(id);const sn=etiket("COĞRAFİ SINIR","#ff6a6a");sc.add(sn);
  return{sc,c,ex:.85,bl:[.7,.5,.82],kur(q,t){pervane(d,t,1.1);const z=lerp(0,-1.5,sm(.35,.6,q))+sm(.6,.7,q)*.25;d.position.set(0,Math.sin(t*1.3)*.04,z);d.rotation.y=Math.sin(t*.4)*.2;
    halka.forEach((h,i)=>{const k=(t*.5+i/5)%1;h.position.copy(d.position);h.scale.setScalar(.4+k*3);h.material.opacity=(1-k)*.7*sm(.05,.2,q);h.lookAt(c.position)});
    duvar.material.opacity=sm(.35,.5,q)*(.5+.3*Math.sin(t*6));id.position.set(d.position.x+.4,.75,d.position.z);id.material.opacity=sm(.08,.2,q)*(1-sm(.75,.85,q));sn.position.set(-1.0,1.45,-2.15);sn.material.opacity=sm(.45,.55,q)*(1-sm(.8,.9,q));
    orb(c,V3(0,.2,-.8),(YATAY?4.2:5.2),1.0,.35)},veri(q){return q>.8?`P0 · P1 · P2 ?<small>YORUMLARA YAZ</small>`:`ZORUNLU<small>KİMLİK + SINIRLAMA</small>`}}})();

/* ======================= HUD ======================= */
const DIL=Q.get("dil")||"tr";
const BAS={havada:["","DRONE NASIL HAVADA DURUR?","BİLİYOR MUYDUN?"],pervane:["01","TERS DÖNEN ÇİFTLER","İKİSİ SAAT YÖNÜ · İKİSİ TERS"],egil:["02","EĞİL VE SÜZÜL","ARKA MOTORLAR HIZLANIR"],don:["02","YERİNDE DÖNÜŞ","BİR ÇİFT HIZLI · BİR ÇİFT YAVAŞ"],
  beyin:["03","ASIL BEYİN","UÇUŞ BİLGİSAYARI"],son:["","KUMANDA SENDE","GERİSİ ONDA"],
  lisans:["","DRONE KURALLARI DEĞİŞTİ","TÜRKİYE · 2026"],kartlar:["01","ÜÇ LİSANS","P0 · P1 · P2"],kartlar2:["02","HANGİSİ NE İÇİN?","LİSANS SEVİYELERİ"],yesil:["03","YEŞİL BÖLGE","AYRI İZİN YOK"],kimlik:["04","ARTIK ZORUNLU","UZAKTAN KİMLİK · COĞRAFİ SINIR"]};
const $=s=>document.getElementById(s);let SIRA=[],NS=1;
function siraKur(){SIRA=[...new Set(K.sahneler.map(s=>s.ad))].filter(a=>BAS[a]&&BAS[a][0]);NS=new Set(SIRA.map(a=>BAS[a][0])).size;$("yol").innerHTML=Array.from({length:NS},()=>"<i><s></s></i>").join("");
  $("oku").textContent=K.oku||""}
let sonBas="";function hud(ad,u){const b=BAS[ad];if(sonBas!==ad){sonBas=ad;$("bn").textContent=b[0]?`KOZMOS LAB · ${b[0]}`:"KOZMOS LAB · BİLİYOR MUYDUN?";$("bt").textContent=b[1];$("bs").textContent=b[2]}
  const gi=sm(0,.08,u);$("bas").style.opacity=gi;$("bas").style.transform=`translateY(${(1-gi)*2}vmin)`;
  const no=b[0]?+b[0]:0;[...$("yol").children].forEach((e,i)=>{e.className=(no===0&&sonBas!==K.sahneler[0].ad)||i<no-1?"done":"";e.firstChild.style.transform=i===no-1?`scaleX(${u})`:""});
  $("sayac").textContent=no?`${String(no).padStart(2,"0")}/${String(NS).padStart(2,"0")}`:"";const S_=S[ad];$("veri").innerHTML=S_.veri?S_.veri(u):"";$("veri").style.opacity=S_.veri?sm(.05,.15,u):0}

/* ======================= ZAMAN ÇİZELGESİ ======================= */
let K={sahneler:["havada","pervane","egil","don","beyin","son"].map((a,i)=>({ad:a,bas:i*5,son:i*5+5})),altyazi:[],gecis:"flas"};
const RP=new THREE.RenderPass(new THREE.Scene(),cam());const BL=new THREE.UnrealBloomPass(new THREE.Vector2(W,H),.8,.5,.8);const AC=new THREE.ShaderPass(THREE.ACESFilmicToneMappingShader);AC.uniforms.exposure.value=.78;const GM=new THREE.ShaderPass(THREE.GammaCorrectionShader);
const CP=new THREE.EffectComposer(R);CP.addPass(RP);CP.addPass(BL);CP.addPass(AC);CP.addPass(GM);
function kare(t){let i=K.sahneler.findIndex(s=>t>=s.bas&&t<s.son);if(i<0)i=t<K.sahneler[0].bas?0:K.sahneler.length-1;const s=K.sahneler[i];const u=cl((t-s.bas)/(s.son-s.bas));
  const sn=S[s.ad];sn.kur(u,t);RP.scene=sn.sc;RP.camera=sn.c;BL.strength=sn.bl[0];BL.radius=sn.bl[1];BL.threshold=sn.bl[2];AC.uniforms.exposure.value=sn.ex||.78;CP.render();hud(s.ad,u);
  const a=K.altyazi.find(x=>t>=x.bas&&t<x.son);$("alt").innerHTML=a?`<span>${a.metin}</span>`:"";
  const dt=t-s.bas,rem=s.son-t;if(K.gecis==="flas"){$("flas").style.opacity=i>0&&dt<.12?(1-dt/.12)*.55:0;$("kara").style.opacity=0}else{$("flas").style.opacity=0;$("kara").style.opacity=Math.max(i>0?cl(1-dt/.35):0,i<K.sahneler.length-1?cl(1-rem/.35):0)}}
Object.values(S).forEach(x=>x.sc.traverse(o=>{if(o.isInstancedMesh||o.isPoints||o.isSprite)o.frustumCulled=false}));
siraKur();window.kurgu=k=>{K=k;siraKur()};window.kare=kare;
Promise.all(["800 100px Archivo","700 40px 'Space Mono'","700 40px 'Instrument Sans'"].map(f=>document.fonts.load(f))).then(()=>document.fonts.ready).then(()=>{YT.forEach(f=>f());window.HAZIR=true}).catch(()=>{window.HAZIR=true});
if(!Q.has("kayit")){const top=K.sahneler[K.sahneler.length-1].son;document.body.style.overflow="auto";const sp=document.createElement("div");sp.style.height=(top*45)+"vh";document.body.appendChild(sp);
  let ts=0;const f=()=>{const hedef=scrollY/(document.body.scrollHeight-innerHeight)*top;ts+=(hedef-ts)*.12;kare(ts);requestAnimationFrame(f)};f()}
})();
