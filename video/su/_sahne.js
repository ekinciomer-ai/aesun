/* ======================= SAHNELER: SU (hidroelektrik) ======================= */
const S={};
function dag(sc,renk="#4a4a3e",x0=0,z0=-160){const g=new THREE.PlaneGeometry(700,300,140,60);const p=g.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i);const h=Math.max(0,(Math.sin(x*.018)*.5+.5)*70+Math.sin(x*.05+y*.04)*14+Math.sin(x*.11)*6)*sm(-150,40,y);p.setZ(i,h)}
  g.computeVertexNormals();const m=new THREE.Mesh(g,std(renk,0,.95));m.rotation.x=-Math.PI/2;m.position.set(x0,0,z0);sc.add(m);return m}
function suMat(h="#1d5a7a"){return std(h,.3,.12,{envMapIntensity:1.0,transparent:true,opacity:.92})}
function dalgaPl(sc,w,d,seg,renk){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d,seg,seg),suMat(renk));m.rotation.x=-Math.PI/2;sc.add(m);const P=m.geometry.attributes.position,P0=Float32Array.from(P.array);
  return{m,kur(t,a=.25){for(let i=0;i<P.count;i++){const x=P0[i*3],y=P0[i*3+1];P.setZ(i,Math.sin(x*.12+t*1.3)*a+Math.sin(y*.15+t)*a*.7)}P.needsUpdate=true;m.geometry.computeVertexNormals()}}}
function barajGeo(L=80,H=36){const sh=new THREE.Shape();sh.moveTo(0,0);sh.lineTo(H*.75,0);sh.quadraticCurveTo(H*.18,H*.4,4,H);sh.lineTo(0,H);sh.closePath();const g=new THREE.ExtrudeGeometry(sh,{depth:L,bevelEnabled:false});g.translate(0,0,-L/2);return g}
function akis(sc,n,size){const p=pts(n,size);sc.add(p);return p}
// 0) AÇILIŞ / KAPANIŞ: alacakaranlıkta baraj, savaktan akan su
S.hero=(()=>{const sc=new THREE.Scene();const c=cam();const sky=gok(sc,"#13224a","#e0905a","#202838");sky.uniforms.sg.value=1;sky.uniforms.sd.value=V3(.7,.05,-1).normalize();sc.fog=new THREE.Fog(L("#4a4050"),80,600);
  isik(sc,"#ffc59a",1.6,"#7aa0ff",.9);dag(sc,"#3a3a32",0,-120);const bj=new THREE.Mesh(barajGeo(),std("#9a9890",0,.85));bj.rotation.y=Math.PI;bj.position.set(10,0,0);sc.add(bj);
  const gol=dalgaPl(sc,200,120,60,"#16405e");gol.m.position.set(-60,30,0);const nehir=dalgaPl(sc,160,30,60,"#1d5a7a");nehir.m.position.set(90,1,0);
  const sv=akis(sc,2500,.35);const SD=[];for(let i=0;i<2500;i++)SD.push([rnd(),(rnd()-.5)*20,rnd()]);
  return{sc,c,ex:.75,bl:[.45,.5,.85],kur(u,t,son){gol.kur(t,.2);nehir.kur(t*1.6,.35);const P=sv.geometry.attributes.position.array,C=sv.geometry.attributes.color.array;
    for(let i=0;i<2500;i++){const[ph,z,s]=SD[i];const k=(t*.6+ph)%1;const x=10+4+k*k*24+s*2,y=36-k*k*34;P.set([x,Math.max(1,y),z],i*3);const o=.75+s*.25;C.set([.75*o,.88*o,1*o],i*3)}sv.geometry.attributes.position.needsUpdate=sv.geometry.attributes.color.needsUpdate=true;
    orb(c,V3(10,20,0),son?(YATAY?150:190):lerp(150,190,u)*(YATAY?.8:1.05),son?lerp(.7,.95,u):lerp(.35,.75,eio(u)),son?.18:lerp(.05,.2,u))}}})();
// 1) SU DÖNGÜSÜ
S.dongu=(()=>{const sc=new THREE.Scene();const c=cam();const sky=gok(sc,"#2c63b5","#c4ddf2","#5a6a7a");sky.uniforms.sg.value=.5;sky.uniforms.sd.value=V3(-.4,.6,-.6).normalize();sc.fog=new THREE.Fog(L("#b0c4d6"),150,800);
  isik(sc,"#fff2d8",2.0,"#9cc4ff",.8);const deniz=dalgaPl(sc,300,300,80,"#14466e");deniz.m.position.set(-120,0,0);dag(sc,"#55604a",60,-60);
  const bulut=new THREE.Group();sc.add(bulut);for(let i=0;i<40;i++){const b=new THREE.Mesh(new THREE.SphereGeometry(6+rnd()*6,16,12),std("#f4f6f8",0,.9,{transparent:true,opacity:.9}));b.position.set((rnd()-.5)*50,(rnd()-.5)*6,(rnd()-.5)*30);bulut.add(b)}
  const gun=spr("#fff2c0",40,1);gun.position.set(-200,180,-200);sc.add(gun);
  const buh=akis(sc,1200,.8),yag=akis(sc,1600,.5),neh=akis(sc,900,.9);
  const B=[],Y=[],Nh=[];for(let i=0;i<1200;i++)B.push([(rnd()-.5)*120-130,(rnd()-.5)*80,rnd()]);for(let i=0;i<1600;i++)Y.push([(rnd()-.5)*60+40,(rnd()-.5)*40-30,rnd()]);for(let i=0;i<900;i++)Nh.push([rnd(),(rnd()-.5)*4]);
  return{sc,c,ex:.66,bl:[.3,.5,.95],kur(u,t){deniz.kur(t,.4);const bx=lerp(-110,40,sm(.1,.55,u));bulut.position.set(bx,62,-30);
    const set=(p,arr,f)=>{const P=p.geometry.attributes.position.array,C=p.geometry.attributes.color.array;arr.forEach((d,i)=>{const r=f(d,i);P.set(r[0],i*3);C.set(r[1],i*3)});p.geometry.attributes.position.needsUpdate=p.geometry.attributes.color.needsUpdate=true};
    const o1=1-sm(.5,.7,u),o2=sm(.45,.6,u),o3=sm(.65,.8,u);
    set(buh,B,([x,z,ph])=>{const k=(t*.15+ph)%1;const o=Math.sin(k*3.14)*o1*.8;return[[x,2+k*58,z],[o*.7,o*.85,o]]});
    set(yag,Y,([x,z,ph])=>{const k=(t*.9+ph)%1;const o=o2;return[[x+bx-40,58-k*45,z],[.6*o,.75*o,1*o]]});
    set(neh,Nh,([ph,w])=>{const k=(t*.25+ph)%1;const x=lerp(70,-60,k),y=lerp(30,1,k)+Math.sin(k*8)*1.5;return[[x,y,-40+lerp(-10,40,k)+w],[.3*o3,.65*o3,1*o3]]});
    orb(c,V3(-20,25,-20),lerp(190,170,u)*(YATAY?.75:1.0),lerp(1.35,1.6,u),lerp(.12,.2,u))},veri(u){return u<.45?`BUHARLAŞMA<small>GÜNEŞİN ISISI</small>`:u<.7?`YAĞIŞ<small>DAĞLARA</small>`:`NEHİR<small>YOKUŞ AŞAĞI</small>`}}})();
// 2) BARAJ: su yükselir
S.baraj=(()=>{const sc=new THREE.Scene();const c=cam();const sky=gok(sc,"#2f63b0","#cfe0ee","#6a5a46");sky.uniforms.sg.value=.4;sc.fog=new THREE.Fog(L("#bccbd8"),150,700);isik(sc,"#fff2dc",2.0,"#9cc4ff",.8);
  dag(sc,"#5a5a48",0,-130);const yer=new THREE.Mesh(new THREE.PlaneGeometry(700,700),std("#5d5440",0,.95));yer.rotation.x=-Math.PI/2;yer.position.y=-.2;sc.add(yer);
  const bj=new THREE.Mesh(barajGeo(),std("#a8a69e",0,.85));bj.rotation.y=Math.PI;sc.add(bj);
  const gol=dalgaPl(sc,200,90,50,"#16405e");gol.m.position.set(-100,0,0);
  const olc=new THREE.Group();sc.add(olc);for(let i=0;i<8;i++){const l=new THREE.Mesh(new THREE.BoxGeometry(.4,.15,6),emi("#6FE3FF",1.2));l.position.set(-1,i*4.5,-44);olc.add(l)}
  return{sc,c,ex:.66,bl:[.3,.5,.95],kur(u,t){const h=lerp(6,33,eio(sm(0,.8,u)));gol.m.position.y=h;gol.kur(t,.15);
    orb(c,V3(-20,lerp(12,22,u),0),lerp(120,140,u)*(YATAY?.75:1.0),lerp(2.3,2.0,u),lerp(.2,.32,u))},veri(u){return`${Math.round(lerp(6,33,eio(sm(0,.8,u)))*3)} m<small>SU YÜKSEKLİĞİ</small>`}}})();
// 3) CEBRİ BORU: kesit, su hızla iner
S.boru=(()=>{const sc=new THREE.Scene();sc.background=L("#05080d");sc.fog=new THREE.FogExp2(L("#05080d"),.012);const c=cam();isik(sc,"#ffffff",1.6,"#6FE3FF",1.6);
  const yol=new THREE.CatmullRomCurve3([V3(-40,40,0),V3(-20,30,0),V3(0,14,0),V3(20,3,0),V3(34,0,0)]);
  const dis=new THREE.Mesh(new THREE.TubeGeometry(yol,120,3.2,40,false),new THREE.MeshPhysicalMaterial({color:L("#b9c3cf"),metalness:.6,roughness:.3,transparent:true,opacity:.22,side:THREE.DoubleSide,envMap:ENV,depthWrite:false}));sc.add(dis);
  const hat=new THREE.Mesh(new THREE.TubeGeometry(yol,120,3.25,40,false),new THREE.MeshBasicMaterial({color:L("#6FE3FF"),wireframe:true,transparent:true,opacity:.08}));sc.add(hat);
  const N=4000,su=akis(sc,N,.6);const D=[];for(let i=0;i<N;i++)D.push([rnd(),rnd()*6.283,Math.sqrt(rnd())*2.8]);
  const tr=new THREE.Mesh(new THREE.CylinderGeometry(6,6,4,48),std("#3a4250",.7,.4));tr.position.set(38,0,0);tr.rotation.z=Math.PI/2;sc.add(tr);
  return{sc,c,ex:.85,bl:[.6,.5,.8],kur(u,t){const P=su.geometry.attributes.position.array,C=su.geometry.attributes.color.array;const hz=lerp(.15,.45,sm(0,.6,u));
    for(let i=0;i<N;i++){const[ph,a,r]=D[i];const k=(t*hz+ph)%1;const p=yol.getPointAt(k);const tg=yol.getTangentAt(k);const n=V3(0,0,1),b=V3().crossVectors(tg,n).normalize();p.add(n.multiplyScalar(Math.cos(a)*r)).add(b.multiplyScalar(Math.sin(a)*r));P.set([p.x,p.y,p.z],i*3);const o=.4+k*.8;C.set([.3*o,.7*o,1*o],i*3)}
    su.geometry.attributes.position.needsUpdate=su.geometry.attributes.color.needsUpdate=true;
    const k=lerp(.15,.85,eio(u));const ct=yol.getPointAt(k);orb(c,ct,(YATAY?34:44),lerp(1.1,1.4,u),lerp(.35,.25,u))},veri(u){return`HIZLANIR<small>YÜKSEKLİK → HIZ</small>`}}})();
// 4) TÜRBİN + JENERATÖR
S.turbin=(()=>{const sc=new THREE.Scene();sc.background=L("#05070c");sc.fog=new THREE.FogExp2(L("#05070c"),.03);const c=cam();zemin(sc,"#0a0d13",40,.5);isik(sc,"#ffffff",2,"#6FE3FF",1.6);
  const run=new THREE.Group();run.position.y=2;sc.add(run);const gob=new THREE.Mesh(new THREE.CylinderGeometry(1.1,.7,1.6,48),std("#9aa3ad",1,.25));run.add(gob);
  for(let i=0;i<13;i++){const sh=new THREE.Shape();sh.moveTo(0,0);sh.quadraticCurveTo(1.2,.4,2.2,-.2);sh.lineTo(2.1,-.5);sh.quadraticCurveTo(1.1,.0,0,-.3);sh.closePath();const g=new THREE.ExtrudeGeometry(sh,{depth:.06,bevelEnabled:false});
    const b=new THREE.Mesh(g,std("#c9ced6",1,.2,{envMapIntensity:1.2,side:THREE.DoubleSide}));b.rotation.set(0,i/13*6.283,.5);b.position.y=-.3;const p=new THREE.Group();p.add(b);p.rotation.y=i/13*6.283;run.add(p)}
  const mil=new THREE.Mesh(new THREE.CylinderGeometry(.35,.35,6,24),std("#9aa3ad",1,.3));mil.position.y=5.5;sc.add(mil);
  const jen=new THREE.Group();jen.position.y=8.5;sc.add(jen);const st=new THREE.Mesh(new THREE.CylinderGeometry(3,3,2,64,1,true),std("#2d3440",.7,.4,{side:THREE.DoubleSide}));jen.add(st);
  const rt=new THREE.Mesh(new THREE.CylinderGeometry(2.4,2.4,1.8,48),std("#c7792e",1,.35));jen.add(rt);const bob=new THREE.Mesh(new THREE.TorusGeometry(2.7,.18,12,64),emi("#ff8a3a",1.4));bob.rotation.x=Math.PI/2;jen.add(bob);
  const sp=new THREE.Mesh(new THREE.TorusGeometry(3.6,1.1,16,64),new THREE.MeshPhysicalMaterial({color:L("#6a7380"),transparent:true,opacity:.07,roughness:.3,envMap:ENV,envMapIntensity:.3,depthWrite:false}));sp.rotation.x=Math.PI/2;sp.position.y=2;sc.add(sp);
  const N=2200,su=akis(sc,N,.12);const D=[];for(let i=0;i<N;i++)D.push([rnd(),rnd()]);const el=akis(sc,500,.12);
  return{sc,c,ex:.85,bl:[.6,.5,.8],kur(u,t){const w=lerp(.5,3,sm(0,.4,u));run.rotation.y=t*w;mil.rotation.y=t*w;rt.rotation.y=t*w;bob.material.emissiveIntensity=1+sm(.3,.6,u)*1.2+Math.sin(t*14)*.2;
    const P=su.geometry.attributes.position.array,C=su.geometry.attributes.color.array;for(let i=0;i<N;i++){const[ph,r]=D[i];const k=(t*.5+ph)%1;const a=ph*6.283+k*9;const rr=lerp(3.6,.6,k);P.set([Math.cos(a)*rr,2+lerp(.3,-2.5,k*k)+(r-.5)*.8,Math.sin(a)*rr],i*3);const o=.8;C.set([.25*o,.6*o,1*o],i*3)}su.geometry.attributes.position.needsUpdate=su.geometry.attributes.color.needsUpdate=true;
    const E=el.geometry.attributes.position.array,EC=el.geometry.attributes.color.array;const on=sm(.4,.6,u);for(let i=0;i<500;i++){const k=(t*.6+i/500)%1;const a=i*2.4+t;E.set([Math.cos(a)*(3.1+k*6),8.5+Math.sin(i)*.8,Math.sin(a)*(3.1+k*6)],i*3);const o=on*(1-k);EC.set([.2*o,.85*o,1*o],i*3)}el.geometry.attributes.position.needsUpdate=el.geometry.attributes.color.needsUpdate=true;
    orb(c,V3(0,lerp(2.5,7,u),0),lerp(13,17,u)*(YATAY?.85:1.15),lerp(.4,1.2,u),lerp(.35,.2,u))},veri(u){return u<.5?`TÜRBİN<small>SU → DÖNÜŞ</small>`:`JENERATÖR<small>DÖNÜŞ → ELEKTRİK</small>`}}})();
// 5) ŞEBEKE: santralden çıkan hatlar
S.sebeke=(()=>{const sc=new THREE.Scene();const c=cam();const sky=gok(sc,"#1a2e5a","#d89a6a","#2a2a30");sky.uniforms.sg.value=.9;sky.uniforms.sd.value=V3(-.5,.08,-1).normalize();sc.fog=new THREE.Fog(L("#5a5058"),80,600);isik(sc,"#ffd2a0",1.6,"#7aa0ff",.8);
  const yer=new THREE.Mesh(new THREE.PlaneGeometry(900,900),std("#3e3a2e",0,.95));yer.rotation.x=-Math.PI/2;sc.add(yer);dag(sc,"#2e2e28",0,-200);
  const sant=new THREE.Mesh(new THREE.BoxGeometry(30,12,16),std("#c9c6be",.1,.7));sant.position.set(-60,6,0);sc.add(sant);const tf=new THREE.Mesh(new THREE.BoxGeometry(8,7,6),std("#4b5a4a",.5,.5));tf.position.set(-36,3.5,10);sc.add(tf);
  const D=[];for(let i=0;i<7;i++){const x=-20+i*40;const g=new THREE.Group();g.position.set(x,0,10+i*3);sc.add(g);const k=new THREE.Mesh(new THREE.CylinderGeometry(.4,3,30,4,1,true),new THREE.MeshBasicMaterial({color:L("#9aa3ad"),wireframe:true}));k.position.y=15;g.add(k);const kol=new THREE.Mesh(new THREE.BoxGeometry(14,.4,.4),std("#9aa3ad",.8,.4));kol.position.y=28;g.add(kol);D.push(g)}
  const el=akis(sc,1200,.7);
  return{sc,c,ex:.75,bl:[.6,.5,.82],kur(u,t){const P=el.geometry.attributes.position.array,C=el.geometry.attributes.color.array;const on=sm(.05,.25,u);
    for(let i=0;i<1200;i++){const k=(t*.25+(i*.618)%1)%1;const tel=i%3;const x=lerp(-36,240,k);const seg=Math.min(5,Math.floor((x+20)/40));const y=28-Math.sin(((x+20)/40-seg)*3.14)*4;P.set([x,x<-20?lerp(6,28,(x+36)/16):y,10+(x+20)/40*3+(tel-1)*5],i*3);C.set([.2*on,.85*on,1*on],i*3)}el.geometry.attributes.position.needsUpdate=el.geometry.attributes.color.needsUpdate=true;
    orb(c,V3(lerp(-30,40,u),18,10),lerp(90,120,u)*(YATAY?.75:1.05),lerp(1.1,1.4,u),lerp(.12,.18,u))},veri(u){return`2.400 MW<small>ATATÜRK BARAJI</small>`}}})();
// 6) POMPAJ DEPOLAMA
S.pompaj=(()=>{const sc=new THREE.Scene();const c=cam();const sky=gok(sc,"#0e1a38","#3a5080","#101820");sc.fog=new THREE.Fog(L("#1a2440"),100,600);isik(sc,"#c8d6ff",1.2,"#6FE3FF",1);
  dag(sc,"#2a3030",0,-90);const ust=dalgaPl(sc,60,40,30,"#16405e");ust.m.position.set(-40,48,-60);const alt=dalgaPl(sc,120,60,40,"#16405e");alt.m.position.set(60,1,10);
  const yol=new THREE.CatmullRomCurve3([V3(-40,48,-60),V3(-10,40,-40),V3(20,18,-15),V3(60,1,10)]);const bor=new THREE.Mesh(new THREE.TubeGeometry(yol,80,1.6,16,false),std("#6a7380",.7,.4));sc.add(bor);
  const N=1500,su=akis(sc,N,.9);
  return{sc,c,ex:.85,bl:[.6,.5,.82],kur(u,t){ust.kur(t,.12);alt.kur(t,.2);const yukari=u<.5;const P=su.geometry.attributes.position.array,C=su.geometry.attributes.color.array;
    for(let i=0;i<N;i++){let k=(t*.3+i/N)%1;if(yukari)k=1-k;const p=yol.getPointAt(k);P.set([p.x+Math.sin(i)*1,p.y+2+Math.cos(i)*1,p.z],i*3);const col=yukari?[1,.6,.2]:[.2,.75,1];C.set(col,i*3)}su.geometry.attributes.position.needsUpdate=su.geometry.attributes.color.needsUpdate=true;
    ust.m.position.y=yukari?lerp(44,50,u*2):lerp(50,44,(u-.5)*2);
    orb(c,V3(10,24,-20),(YATAY?110:150),lerp(1.2,1.5,u),.2)},veri(u){return u<.5?`POMPA ↑<small>ELEKTRİK BOLKEN</small>`:`TÜRBİN ↓<small>İHTİYAÇ ANINDA</small>`}}})();
// 7) DÜNYANIN EN BÜYÜĞÜ: uzun beton duvar, çok sayıda savak
S.dunya=(()=>{const sc=new THREE.Scene();const c=cam();const sky=gok(sc,"#3a6aaa","#d4e2ec","#6a6a5a");sky.uniforms.sg.value=.3;sc.fog=new THREE.Fog(L("#c6d2dc"),200,1400);isik(sc,"#fff2dc",2,"#9cc4ff",.8);
  const yer=new THREE.Mesh(new THREE.PlaneGeometry(3000,3000),std("#4e5a3e",0,.95));yer.rotation.x=-Math.PI/2;sc.add(yer);
  const bj=new THREE.Mesh(barajGeo(900,60),std("#b5b2aa",0,.85));bj.rotation.y=Math.PI;sc.add(bj);const gol=dalgaPl(sc,1200,600,60,"#2a5a6e");gol.m.position.set(-320,55,0);const neh=dalgaPl(sc,800,700,50,"#3a6a72");neh.m.position.set(420,1,0);
  const N=6000,sv=akis(sc,N,1.4);const SD=[];for(let i=0;i<N;i++)SD.push([rnd(),Math.floor(rnd()*22),rnd()]);
  return{sc,c,ex:.66,bl:[.3,.5,.95],kur(u,t){gol.kur(t,.3);neh.kur(t*1.5,.6);const P=sv.geometry.attributes.position.array,C=sv.geometry.attributes.color.array;
    for(let i=0;i<N;i++){const[ph,k_,s]=SD[i];const k=(t*.5+ph)%1;const z=-180+k_*17+(s-.5)*6;P.set([6+k*k*40+s*3,Math.max(2,60-k*k*58),z],i*3);C.set([.8,.9,1],i*3)}sv.geometry.attributes.position.needsUpdate=sv.geometry.attributes.color.needsUpdate=true;
    orb(c,V3(40,30,-40),lerp(420,620,eio(u))*(YATAY?.7:1.0),lerp(.6,.85,u),lerp(.15,.3,u))},veri(u){return`${Math.round(22500*eio(sm(0,.8,u))).toLocaleString("tr-TR")} MW<small>ÜÇ BOĞAZ BARAJI · ÇİN</small>`}}})();
S.son={...S.hero,kur:(u,t)=>S.hero.kur(u,t,true)};

/* ======================= HUD ======================= */
const DIL=Q.get("dil")||"tr";
const BAS={hero:["","SU","ENERJİ ÜRETİM KAYNAKLARI · BÖLÜM 3"],dongu:["01","SU DÖNGÜSÜ","GÜNEŞ · BUHAR · YAĞIŞ · NEHİR"],baraj:["02","BARAJ","YÜKSEKTE BİRİKEN ENERJİ"],boru:["03","CEBRİ BORU","SU HIZLA İNER"],turbin:["04","TÜRBİN","TÜRBİN · MİL · JENERATÖR"],
  sebeke:["05","ŞEBEKE","TRAFO · İLETİM HATTI"],pompaj:["06","POMPAJ DEPOLAMA","DEV BİR PİL"],dunya:["07","DÜNYANIN EN BÜYÜĞÜ","ÜÇ BOĞAZ BARAJI"],son:["","SU","SIRADA: ATOMUN GÜCÜ"]};
if(DIL==="en")Object.assign(BAS,{hero:["","WATER","ENERGY SOURCES · EPISODE 3"],dongu:["01","WATER CYCLE","SUN · VAPOR · RAIN · RIVER"],baraj:["02","DAM","ENERGY STORED UP HIGH"],boru:["03","PENSTOCK","WATER RUSHES DOWN"],turbin:["04","TURBINE","TURBINE · SHAFT · GENERATOR"],
  sebeke:["05","GRID","TRANSFORMER · POWER LINE"],pompaj:["06","PUMPED STORAGE","A GIANT BATTERY"],dunya:["07","WORLD'S LARGEST","THREE GORGES DAM"],son:["","WATER","NEXT: THE POWER OF THE ATOM"]});
const SOZ={"BUHARLAŞMA":"EVAPORATION","GÜNEŞİN ISISI":"SUN'S HEAT","YAĞIŞ":"RAIN","DAĞLARA":"ON THE MOUNTAINS","NEHİR":"RIVER","YOKUŞ AŞAĞI":"DOWNHILL","SU YÜKSEKLİĞİ":"WATER HEIGHT","HIZLANIR":"SPEEDS UP","YÜKSEKLİK → HIZ":"HEIGHT → SPEED","TÜRBİN":"TURBINE","SU → DÖNÜŞ":"WATER → ROTATION","JENERATÖR":"GENERATOR","DÖNÜŞ → ELEKTRİK":"ROTATION → POWER",
  "ATATÜRK BARAJI":"ATATÜRK DAM","POMPA ↑":"PUMP ↑","ELEKTRİK BOLKEN":"WHEN POWER IS CHEAP","TÜRBİN ↓":"TURBINE ↓","İHTİYAÇ ANINDA":"WHEN NEEDED","ÜÇ BOĞAZ BARAJI · ÇİN":"THREE GORGES DAM · CHINA"};
const ceviri=h=>{if(DIL==="tr")return h;let o=h;Object.keys(SOZ).sort((a,b)=>b.length-a.length).forEach(k=>{o=o.split(k).join(SOZ[k])});return o.replace(/(\d)([.,])(\d)/g,(m,x,p,y)=>x+(p==="."?",":".")+y)};
const SIRA=["dongu","baraj","boru","turbin","sebeke","pompaj","dunya"],NS=SIRA.length;
const $=s=>document.getElementById(s);$("oku").textContent=DIL==="en"?"SUN → RAIN → DAM → PENSTOCK → TURBINE → GRID":"GÜNEŞ → YAĞMUR → BARAJ → BORU → TÜRBİN → ŞEBEKE";$("yol").innerHTML=SIRA.map(()=>"<i><s></s></i>").join("");
let sonBas="";function hud(ad,u){const b=BAS[ad];if(sonBas!==ad){sonBas=ad;$("bn").textContent=b[0]?`${DIL==="en"?"STEP":"ADIM"} ${b[0]} / ${String(NS).padStart(2,"0")}`:(DIL==="en"?"KOZMOS LAB · ENERGY SOURCES":"KOZMOS LAB · ENERJİ ÜRETİM KAYNAKLARI");$("bt").textContent=b[1];$("bs").textContent=b[2]}
  const gi=sm(0,.08,u);$("bas").style.opacity=gi;$("bas").style.transform=`translateY(${(1-gi)*2}vmin)`;
  const si=SIRA.indexOf(ad);[...$("yol").children].forEach((e,i)=>{e.className=(ad==="son"||i<si)?"done":"";e.firstChild.style.transform=i===si?`scaleX(${u})`:""});
  $("sayac").textContent=si>=0?`${String(si+1).padStart(2,"0")}/${String(NS).padStart(2,"0")}`:"";const S_=S[ad];$("veri").innerHTML=S_.veri?ceviri(S_.veri(u)):"";$("veri").style.opacity=S_.veri?sm(.05,.15,u):0}

/* ======================= ZAMAN ÇİZELGESİ ======================= */
let K={sahneler:["hero","dongu","baraj","boru","turbin","sebeke","pompaj","dunya","son"].map((a,i)=>({ad:a,bas:i*5,son:i*5+5})),altyazi:[],gecis:"flas"};
const RP=new THREE.RenderPass(new THREE.Scene(),cam());const BL=new THREE.UnrealBloomPass(new THREE.Vector2(W,H),.8,.5,.8);const AC=new THREE.ShaderPass(THREE.ACESFilmicToneMappingShader);AC.uniforms.exposure.value=.78;const GM=new THREE.ShaderPass(THREE.GammaCorrectionShader);
const CP=new THREE.EffectComposer(R);CP.addPass(RP);CP.addPass(BL);CP.addPass(AC);CP.addPass(GM);
function kare(t){let i=K.sahneler.findIndex(s=>t>=s.bas&&t<s.son);if(i<0)i=t<K.sahneler[0].bas?0:K.sahneler.length-1;const s=K.sahneler[i];const u=cl((t-s.bas)/(s.son-s.bas));
  const sn=S[s.ad];sn.kur(u,t);RP.scene=sn.sc;RP.camera=sn.c;BL.strength=sn.bl[0];BL.radius=sn.bl[1];BL.threshold=sn.bl[2];AC.uniforms.exposure.value=sn.ex||.78;CP.render();hud(s.ad,u);
  const a=K.altyazi.find(x=>t>=x.bas&&t<x.son);$("alt").innerHTML=a?`<span>${a.metin}</span>`:"";
  const dt=t-s.bas,rem=s.son-t;if(K.gecis==="flas"){$("flas").style.opacity=i>0&&dt<.12?(1-dt/.12)*.55:0;$("kara").style.opacity=0}else{$("flas").style.opacity=0;$("kara").style.opacity=Math.max(i>0?cl(1-dt/.35):0,i<K.sahneler.length-1?cl(1-rem/.35):0)}}
Object.values(S).forEach(x=>x.sc.traverse(o=>{if(o.isInstancedMesh||o.isPoints)o.frustumCulled=false}));
window.kurgu=k=>{K=k};window.kare=kare;window.HAZIR=true;
if(!Q.has("kayit")){const top=K.sahneler[K.sahneler.length-1].son;document.body.style.overflow="auto";const sp=document.createElement("div");sp.style.height=(top*45)+"vh";document.body.appendChild(sp);
  let ts=0;const f=()=>{const hedef=scrollY/(document.body.scrollHeight-innerHeight)*top;ts+=(hedef-ts)*.12;kare(ts);requestAnimationFrame(f)};f()}
})();
