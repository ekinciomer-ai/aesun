// 3D karton diorama (Three.js r128, ücretsiz). Oluklu/kraft karton dokuları kodla üretilir; yumuşak gölge, minyatür kamera.
// window.D3.ciz(sahneAdi, sahneIciSn, sahneSuresi) kartı 1920x1080 WebGL tuvaline çizer.
(function(){
const T=THREE,W=1920,H=1080;
const R=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});R.setSize(W,H,false);R.setPixelRatio(1);
R.shadowMap.enabled=true;R.shadowMap.type=T.PCFSoftShadowMap;R.outputEncoding=T.sRGBEncoding;R.toneMapping=T.ACESFilmicToneMapping;R.toneMappingExposure=1.05;
const sc=new T.Scene();const cam=new T.PerspectiveCamera(32,W/H,.1,400);
function rng(s){let a=s|0||1;return()=>{a^=a<<13;a^=a>>>17;a^=a<<5;return((a>>>0)%100000)/100000}}
// ---- dokular ----
const DK={};
function doku(renk,tur,seed){const k=renk+tur+(seed||0);if(DK[k])return DK[k];const c=document.createElement('canvas');c.width=c.height=256;const z=c.getContext('2d'),r=rng(7+(seed||0)+renk.length);
 z.fillStyle=renk;z.fillRect(0,0,256,256);const id=z.getImageData(0,0,256,256),d=id.data;for(let i=0;i<d.length;i+=4){const n=(r()-.5)*26;d[i]+=n;d[i+1]+=n;d[i+2]+=n*.85}z.putImageData(id,0,0);
 z.globalAlpha=.22;for(let i=0;i<120;i++){z.strokeStyle=r()<.5?'#5b4126':'#fff6e4';z.lineWidth=.7;z.beginPath();const x=r()*256,y=r()*256;z.moveTo(x,y);z.lineTo(x+(r()-.5)*50,y+(r()-.5)*5);z.stroke()}z.globalAlpha=1;
 if(tur==='oluk'){z.globalAlpha=.35;for(let x=0;x<256;x+=10){z.fillStyle='#3a2814';z.fillRect(x,0,3,256)}z.globalAlpha=1}
 if(tur==='pencere'){z.fillStyle='rgba(60,40,22,.85)';for(let y=40;y<210;y+=70)for(let x=30;x<230;x+=64){z.beginPath();z.rect(x+(r()-.5)*4,y,28,40);z.arc(x+14,y,14,Math.PI,0);z.fill()}
  z.strokeStyle='rgba(60,40,22,.6)';z.lineWidth=3;z.strokeRect(6,6,244,244)}
 if(tur==='kule'){z.fillStyle='rgba(70,50,30,.8)';for(let y=20;y<250;y+=46)for(let x=8;x<256;x+=42){z.beginPath();z.rect(x,y,14,24);z.arc(x+7,y,7,Math.PI,0);z.fill()}
  z.strokeStyle='rgba(90,70,45,.35)';for(let y=0;y<256;y+=12){z.beginPath();z.moveTo(0,y);z.lineTo(256,y);z.stroke()}}
 if(tur==='yuz'){z.fillStyle='#2a1d12';z.beginPath();z.arc(88,120,13,0,6.3);z.arc(168,120,13,0,6.3);z.fill();z.strokeStyle='#2a1d12';z.lineWidth=7;z.beginPath();z.arc(128,160,30,.25,2.9);z.stroke();
  z.fillStyle='rgba(210,90,70,.35)';z.beginPath();z.arc(62,165,18,0,6.3);z.arc(194,165,18,0,6.3);z.fill()}
 if(tur==='sakal'){z.fillStyle='#2a1d12';z.beginPath();z.arc(88,100,13,0,6.3);z.arc(168,100,13,0,6.3);z.fill();z.fillStyle='#5a3a22';z.beginPath();z.ellipse(128,200,70,48,0,0,6.3);z.fill()}
 if(tur==='sayfa'){z.strokeStyle='rgba(60,40,20,.55)';z.lineWidth=4;for(let y=40;y<230;y+=22){z.beginPath();z.moveTo(24,y);z.lineTo(232-(y%44?30:0),y);z.stroke()}}
 const t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;return DK[k]=t}
const MT={};function mat(renk,tur,seed,tekrar){const k=renk+(tur||'')+(seed||0)+(tekrar||1);if(MT[k])return MT[k];const m=doku(renk,tur||'d',seed).clone();m.needsUpdate=true;if(tekrar)m.repeat.set(tekrar,tekrar);
 return MT[k]=new T.MeshStandardMaterial({map:m,roughness:.96,metalness:0,bumpMap:doku('#808080','d',3),bumpScale:.015})}
function mesh(geo,m,x,y,z,g){const o=new T.Mesh(geo,m);o.position.set(x||0,y||0,z||0);o.castShadow=o.receiveShadow=true;(g||sc).add(o);return o}
const KRAFT='#c99b62',KRAFT2='#b4844f',KRAFT3='#dcb27a';
// ---- yapı taşları ----
function cati(w,d,h){const s=new T.Shape();s.moveTo(-w/2-.08,0);s.lineTo(0,h);s.lineTo(w/2+.08,0);s.closePath();const g=new T.ExtrudeGeometry(s,{depth:d+.16,bevelEnabled:false});g.translate(0,0,-(d+.16)/2);return g}
function ev(g,x,z,w,h,d,renk,ry,cr){const o=new T.Group();o.position.set(x,0,z);o.rotation.y=ry||0;g.add(o);
 mesh(new T.BoxGeometry(w,h,d),[mat(renk,'d'),mat(renk,'d'),mat(renk,'d'),mat(renk,'d'),mat(renk,'pencere'),mat(renk,'pencere')],0,h/2,0,o);
 mesh(cati(w,d,w*.45),mat(cr||'#a8452f','oluk'),0,h,0,o);return o}
function cami(g,x,z,s,renk){renk=renk||'#e6cf9f';const o=new T.Group();o.position.set(x,0,z);o.scale.setScalar(s);g.add(o);
 mesh(new T.BoxGeometry(4,1.6,4),mat(renk,'pencere'),0,.8,0,o);mesh(new T.CylinderGeometry(1.7,1.9,.5,16),mat(renk),0,1.85,0,o);
 mesh(new T.SphereGeometry(1.7,20,12,0,Math.PI*2,0,Math.PI/2),mat('#8fa2b0','oluk'),0,2.1,0,o);
 for(const[a,b]of[[-2.1,-2.1],[2.1,-2.1],[2.1,2.1],[-2.1,2.1]]){mesh(new T.CylinderGeometry(.16,.2,5,8),mat(renk),a,2.5,b,o);mesh(new T.ConeGeometry(.24,1,8),mat('#8fa2b0'),a,5.5,b,o);mesh(new T.CylinderGeometry(.26,.26,.12,8),mat(renk),a,3.9,b,o)}
 for(const a of[-1.4,1.4]){mesh(new T.SphereGeometry(.8,14,8,0,Math.PI*2,0,Math.PI/2),mat('#8fa2b0','oluk'),a,1.6,0,o)}return o}
function galata(g,x,z,s){const o=new T.Group();o.position.set(x,0,z);o.scale.setScalar(s);g.add(o);
 mesh(new T.CylinderGeometry(1,1.08,5,24),mat('#cfb48a','kule'),0,2.5,0,o);mesh(new T.CylinderGeometry(1.22,1.22,.22,24),mat('#bfa57c'),0,5.05,0,o);
 mesh(new T.CylinderGeometry(.95,.95,.5,24),mat('#cfb48a','kule'),0,5.4,0,o);mesh(new T.ConeGeometry(1.15,1.9,24),mat('#62829b','oluk'),0,6.6,0,o);return o}
function kosk(g,x,z,s){const o=new T.Group();o.position.set(x,0,z);o.scale.setScalar(s);g.add(o);mesh(new T.BoxGeometry(4,.4,3),mat('#e6d2a8'),0,.2,0,o);
 for(const a of[-1.7,-.6,.6,1.7])for(const b of[-1.2,1.2])mesh(new T.CylinderGeometry(.12,.12,2,8),mat('#e6d2a8'),a,1.4,b,o);mesh(new T.ConeGeometry(3,1.4,4),mat('#a8452f','oluk'),0,3.1,0,o).rotation.y=Math.PI/4;return o}
function bulut(g,x,y,z,s){const o=new T.Group();o.position.set(x,y,z);o.scale.setScalar(s);g.add(o);const sh=new T.Shape();sh.absarc(0,0,1,0,Math.PI*2);
 const parca=[[-1.1,0,.8],[0,.4,1.1],[1.1,0,.75],[0,-.2,.9]];for(const[a,b,r]of parca){const ss=new T.Shape();ss.absarc(0,0,r,0,Math.PI*2);mesh(new T.ExtrudeGeometry(ss,{depth:.18,bevelEnabled:false,curveSegments:24}),mat('#f6f1e6'),a,b,0,o)}
 mesh(new T.CylinderGeometry(.02,.02,8,4),mat('#5a4a3a'),0,4,0,o);return o}
function dalga(g,x,z,w,renk,faz){const s=new T.Shape();s.moveTo(-w/2,0);for(let i=0;i<=40;i++){const xx=-w/2+w*i/40;s.lineTo(xx,.35+Math.sin(i*1.3+faz)*.12)}s.lineTo(w/2,0);s.closePath();
 const m=mesh(new T.ExtrudeGeometry(s,{depth:.12,bevelEnabled:false}),mat(renk,'d'),x,0,z,g);return m}
function kisi(o){o=o||{};const k=new T.Group();const govde=mesh(new T.CylinderGeometry(.24,.36,.8,10),mat(o.renk||'#4f7f68','oluk'),0,.4,0,k);
 const yuzM=mat('#e5c39c',o.sakal?'sakal':'yuz');const bas=mesh(new T.BoxGeometry(.42,.42,.4),[mat('#e5c39c'),mat('#e5c39c'),mat('#e5c39c'),mat('#e5c39c'),yuzM,mat('#e5c39c')],0,1.03,0,k);
 mesh(new T.CylinderGeometry(o.sultan?.3:.25,o.sultan?.3:.24,o.sultan?.42:.26,14),mat('#fbf7ee'),0,1.37+(o.sultan?.06:0),0,k);
 if(o.sultan)mesh(new T.ConeGeometry(.05,.3,6),mat('#c0392b'),.08,1.78,.05,k);
 if(o.kanat){k.kanat=[];for(const yon of[-1,1]){const p=new T.Group();p.position.set(yon*.22,.72,-.1);k.add(p);const s=new T.Shape();s.moveTo(0,0);
  for(let i=0;i<=6;i++){s.lineTo(yon*(.35+i*.28),.55-i*.12);s.lineTo(yon*(.3+i*.28),.38-i*.12)}s.lineTo(0,-.12);s.closePath();
  mesh(new T.ExtrudeGeometry(s,{depth:.04,bevelEnabled:false}),mat('#efe5cf','oluk'),0,0,0,p);p.yon=yon;k.kanat.push(p)}}
 return k}
function kanatla(k,aci,acik){if(!k.kanat)return;for(const p of k.kanat){p.rotation.z=p.yon*(acik?.15:-.9)+p.yon*aci*.35;p.rotation.y=p.yon*(acik?.15:.9)}}
function tepe(g,x,z){const o=new T.Group();o.position.set(x,0,z);g.add(o);const renk=['#8f9e57','#9caa62','#a9b56d','#b6c079','#c3cb86'];
 for(let i=0;i<5;i++){const s=new T.Shape();s.absellipse(0,0,14-i*2.6,9-i*1.7,0,Math.PI*2);const m=mesh(new T.ExtrudeGeometry(s,{depth:.45,bevelEnabled:false,curveSegments:40}),mat(renk[i],'oluk',i,2),0,i*.45+.45,0,o);m.rotation.x=Math.PI/2}
 for(let i=0;i<10;i++){const a=i/10*6.28,r=10+(i%3)*1.5;const t=mesh(new T.SphereGeometry(.6+(i%3)*.2,10,8),mat('#6f8240','oluk'),Math.cos(a)*r,.9,Math.sin(a)*r*.7,o);mesh(new T.CylinderGeometry(.08,.1,.6,6),mat(KRAFT2),Math.cos(a)*r,.3,Math.sin(a)*r*.7,o)}return o}
function gemi(g){const o=new T.Group();g.add(o);const s=new T.Shape();s.moveTo(-3,0);s.lineTo(3.2,0);s.lineTo(2.4,-1);s.lineTo(-2.4,-1);s.closePath();
 const hull=mesh(new T.ExtrudeGeometry(s,{depth:1.4,bevelEnabled:false}),mat('#7a4a28','oluk'),0,1,-.7,o);
 for(const[x,h]of[[-1,4],[1,4.6]]){mesh(new T.CylinderGeometry(.06,.06,h,6),mat('#3a2814'),x,1+h/2,0,o);mesh(new T.BoxGeometry(1.8,h*.55,.05),mat('#f3ead6'),x,1+h*.6,.08,o)}
 mesh(new T.BoxGeometry(.02,.35,.6),mat('#c0392b'),1.05,5.75,.25,o);return o}
function kese(g){const pts=[];for(let i=0;i<=12;i++){const t=i/12;pts.push(new T.Vector2(Math.sin(t*Math.PI)*1.1*(1-t*.4)+.15,t*2.2))}const o=new T.Group();g.add(o);
 mesh(new T.LatheGeometry(pts,24),new T.MeshStandardMaterial({color:'#d9a520',roughness:.6,metalness:.25}),0,0,0,o);mesh(new T.CylinderGeometry(.35,.35,.2,12),mat('#8a5a12'),0,2.05,0,o);return o}
// ---- dünya ----
const hemi=new T.HemisphereLight('#e8f2fa','#8a6a45',.65);sc.add(hemi);const gun=new T.DirectionalLight('#fff0d4',1.25);gun.castShadow=true;gun.shadow.mapSize.set(2048,2048);
gun.shadow.radius=6;gun.shadow.bias=-.0006;sc.add(gun);sc.add(gun.target);
function golgeAyar(cx,cz,r){gun.position.set(cx-18,30,cz+14);gun.target.position.set(cx,0,cz);const c=gun.shadow.camera;c.left=-r;c.right=r;c.top=r;c.bottom=-r;c.near=1;c.far=90;c.updateProjectionMatrix()}
const gokC=document.createElement('canvas');gokC.width=16;gokC.height=256;{const z=gokC.getContext('2d'),gr=z.createLinearGradient(0,0,0,256);gr.addColorStop(0,'#9cc4dd');gr.addColorStop(.7,'#e6ecdf');gr.addColorStop(1,'#f3e3c2');z.fillStyle=gr;z.fillRect(0,0,16,256)}
const gokT=new T.CanvasTexture(gokC);gokT.encoding=T.sRGBEncoding;sc.background=gokT;sc.fog=new T.Fog('#e9e6d6',38,120);
// A: İstanbul (Galata, Boğaz, Üsküdar, Sarayburnu)
const A=new T.Group();sc.add(A);
mesh(new T.BoxGeometry(18,.6,60),mat(KRAFT,'d',1,3),-17,-.3,0,A);mesh(new T.BoxGeometry(18,.6,60),mat(KRAFT,'d',2,3),24,-.3,0,A);
mesh(new T.BoxGeometry(16,.3,60),mat('#5d93b8','d'),4,-.45,0,A);const dalgalar=[];for(let i=0;i<9;i++)dalgalar.push(dalga(A,4,-24+i*6,15.5,i%2?'#5389b0':'#6aa0c4',i));
galata(A,-12,0,1);const ren=['#d9a066','#c98a5a','#e2c08a','#b97a52','#d8b48a','#a86f4a'],r1=rng(4);
for(let i=0;i<22;i++){const x=-24+r1()*14,z=-26+i*2.5;if(Math.abs(x+12)<2.6&&Math.abs(z)<2.6)continue;ev(A,x,z,1.6+r1()*1.4,1.3+r1()*2.2,1.6+r1(),ren[i%6],r1()*.4-.2,['#a8452f','#8f5a3a','#6d7f8f'][i%3])}
for(let i=0;i<20;i++){const x=16+r1()*14,z=-26+i*2.7;if(Math.abs(x-18)<3&&Math.abs(z-4)<3)continue;ev(A,x,z,1.6+r1()*1.4,1.2+r1()*2,1.6+r1(),ren[(i+2)%6],r1()*.4-.2,['#a8452f','#8f5a3a','#6d7f8f'][i%3])}
cami(A,24,-8,.9);cami(A,-20,-14,.8);cami(A,6,-34,1.3,'#ddc39a');cami(A,-4,-36,1.1,'#ddc39a');mesh(new T.BoxGeometry(8,.6,7),mat(KRAFT3,'d'),2,-.3,16,A);kosk(A,2,16,.9);
const meydan=mesh(new T.CylinderGeometry(3.2,3.2,.1,24),mat('#d8c29a','oluk'),18,.05,4,A);
const bulutlar=[bulut(A,-6,9,-6,1.2),bulut(A,10,10,-10,1),bulut(A,-16,8.5,-4,.8),bulut(A,22,9,-2,.9)];
const hez=kisi({kanat:1,sakal:1,renk:'#4f7f68'});A.add(hez);
const sultan=kisi({sultan:1,sakal:1,renk:'#b0352a'});sultan.position.set(2,.4,16.6);sultan.rotation.y=-.6;A.add(sultan);
const muhafiz=[];for(const a of[-1.2,1.2]){const k=kisi({renk:'#4a5f7a'});k.position.set(2+a,.4,16.8);k.rotation.y=-.6;A.add(k);muhafiz.push(k)}
const kalabalik=[];const r2=rng(9);for(let i=0;i<14;i++){const k=kisi({renk:['#4a5f7a','#7a4a3a','#5a7a4a','#8a6a3a'][i%4]});const a=i/14*6.28;k.position.set(18+Math.cos(a)*2.6,0,4+Math.sin(a)*2.6);k.lookAt(18,0,4);A.add(k);kalabalik.push(k)}
// B: Okmeydanı tepesi
const B=new T.Group();B.position.set(0,0,200);sc.add(B);mesh(new T.BoxGeometry(60,.6,40),mat('#a7b06a','d',5,3),0,-.3,0,B);tepe(B,0,0);bulut(B,-6,9,-8,1);bulut(B,8,10,-6,1.1);
// C: sürgün (meydan + deniz + gemi)
const C=new T.Group();C.position.set(0,0,400);sc.add(C);mesh(new T.BoxGeometry(40,.6,14),mat(KRAFT,'d',6,3),0,-.3,6,C);mesh(new T.BoxGeometry(60,.3,30),mat('#5d93b8','d'),0,-.45,-14,C);
const dalgaC=[];for(let i=0;i<5;i++)dalgaC.push(dalga(C,0,-26+i*5,58,i%2?'#5389b0':'#6aa0c4',i));const ksC=kese(C);const sultanC=kisi({sultan:1,sakal:1,renk:'#b0352a'});sultanC.position.set(-3,0,6);C.add(sultanC);
const gemiC=gemi(C);gemiC.position.set(-14,0,-10);ev(C,10,9,3,2.5,2.5,'#d9a066',0);ev(C,-12,9,3,3,2.5,'#c98a5a',0);cami(C,0,12,.7);
const paralar=[];for(let i=0;i<12;i++){paralar.push(mesh(new T.CylinderGeometry(.22,.22,.06,14),new T.MeshStandardMaterial({color:'#f2c230',roughness:.4,metalness:.4}),0,0,0,C))}
// D: Seyahatname (masa + kitap)
const Dg=new T.Group();Dg.position.set(0,0,600);sc.add(Dg);mesh(new T.BoxGeometry(30,1,20),mat('#9a6a3e','oluk',8,2),0,-.5,0,Dg);
for(const yon of[-1,1]){const pg=new T.PlaneGeometry(4.2,5.4,16,1);const p=pg.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i);p.setZ(i,Math.sin(Math.abs(x+2.1)/4.2*Math.PI*.5)*.6)}pg.computeVertexNormals();
 const m=mesh(pg,new T.MeshStandardMaterial({map:doku('#f3e8cf','sayfa'),roughness:.95,side:T.DoubleSide}),yon*2.15,.15,0,Dg);m.rotation.x=-Math.PI/2+.0;m.rotation.y=yon*.12;if(yon<0)m.scale.x=-1}
mesh(new T.BoxGeometry(8.8,.25,5.8),mat('#7a3a22','oluk'),0,0,0,Dg);const hezD=kisi({kanat:1,sakal:1});hezD.scale.setScalar(1);Dg.add(hezD);
// ---- sahne kurulumları ----
const ez=x=>x<0?0:x>1?1:x,eio=x=>{x=ez(x);return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2};
function gor(g){for(const x of[A,B,C,Dg])x.visible=(x===g)}
function rota(u){const a=new T.Vector3(-12,7.3,0),b=new T.Vector3(18,.4,4);const p=a.clone().lerp(b,u);p.y=a.y+(b.y-a.y)*u+Math.sin(u*Math.PI)*2.4-(u>.85?0:0);return p}
function bak(px,py,pz,tx,ty,tz){cam.position.set(px,py,pz);cam.lookAt(tx,ty,tz)}
function ortak(t){dalgalar.forEach((d,i)=>{d.position.y=Math.sin(t*1.4+i)*.07});dalgaC.forEach((d,i)=>{d.position.y=Math.sin(t*1.4+i)*.07});bulutlar.forEach((b,i)=>{b.position.x+=0;b.position.y=9+Math.sin(t*.6+i)*.25})}
const KUR={
kule(t,d){gor(A);golgeAyar(-12,0,16);const k=eio(t/d);hez.visible=true;hez.scale.setScalar(1.3);hez.position.set(-12+.7,5.3,.9);hez.rotation.set(0,.75,0);kanatla(hez,Math.sin(t*3),true);
 bak(-12+Math.sin(.9-k*.5)*(8+k*4),6.6-k*.8,Math.cos(.9-k*.5)*(8+k*4),-11.6,5.4+k*.2,.4)},
deneme(t,d){gor(B);golgeAyar(0,200,18);const per=d/3.2,k=(t%per)/per;hezB.visible=true;hezB.scale.setScalar(1.6);hezB.position.set(-3+k*6,2.7+Math.sin(k*Math.PI)*2.2,201);
 hezB.rotation.set(0,1.2,-.1+k*.2);kanatla(hezB,Math.sin(t*10),true);bak(hezB.position.x*.4-1,5.6,212.5,hezB.position.x*.6,4.6,201)},
ucus(t,d){gor(A);golgeAyar(0,0,28);const u=.55*eio(t/d);const p=rota(u);hez.visible=true;hez.scale.setScalar(1.2);hez.position.copy(p);hez.rotation.set(-.15,1.45,.15);kanatla(hez,Math.sin(t*2)*.3,true);
 bak(p.x-6,p.y+2.5,p.z+10,p.x+2,p.y-.5,p.z)},
sultan(t,d){gor(A);if(t<d*.5){golgeAyar(2,16,10);const u=.55+.25*(t/(d*.5)),p=rota(u);hez.position.copy(p);hez.rotation.set(-.15,1.45,.15);kanatla(hez,Math.sin(t*2)*.3,true);
  bak(-1.5+t*.15,1.6,21.5,4,2.2,13)}else{golgeAyar(18,4,12);const tt=(t-d*.5)/(d*.5),u=.8+.2*Math.min(1,tt/.75),p=rota(u);hez.position.copy(p);hez.rotation.set(0,1.45,0);kanatla(hez,Math.sin(t*2)*.3,u<.995);
  kalabalik.forEach((k,i)=>{k.position.y=Math.abs(Math.sin(t*6+i))*.18});bak(12,3.2,13,18,1,4)}},
surgun(t,d){gor(C);golgeAyar(0,400,16);const f=t/d;sultanC.rotation.y=.4;
 if(f<.42){const k=ez(t/1);ksC.position.set(1.5,Math.max(0,6*(1-k*k)),6);const yay=ez((t-.9)/.6);paralar.forEach((p,i)=>{const a=i/12*6.28;p.visible=t>.9;p.position.set(1.5+Math.cos(a)*1.8*yay,.05,6+Math.sin(a)*1.2*yay);p.rotation.x=Math.PI/2*(i%2)});
  bak(-4.5,3.4,401.5,1.2,1.2,406.5)}else{paralar.forEach(p=>p.visible=false);ksC.position.set(1.5,0,6);const k=eio((f-.42)/.58);gemiC.position.set(-14+k*26,Math.sin(t*1.5)*.08,-10);gemiC.rotation.z=Math.sin(t*1.3)*.03;
  bak(gemiC.position.x-2,4.5,404,gemiC.position.x+1,2,390)}},
soru(t,d){gor(Dg);golgeAyar(0,600,12);const a=t*.8;hezD.position.set(Math.cos(a)*4.2,2.2+Math.sin(t*1.7)*.3,Math.sin(a)*2.6);hezD.rotation.set(0,-a+Math.PI,-.2);kanatla(hezD,Math.sin(t*2)*.3,true);
 const k=eio(t/d);bak(Math.sin(.4-k*.3)*11,7-k*1.5,600+Math.cos(.4-k*.3)*11,0,.6,600)}};
const hezB=kisi({kanat:1,sakal:1});B.add(hezB);hezB.position.set(0,2.8,1);// B grubuna göre yerel değil; dünya z ile yerleşir
B.remove(hezB);sc.add(hezB);
const eskiGor=gor;gor=function(g){eskiGor(g);hezB.visible=(g===B)};
window.D3={canvas:R.domElement,ciz(ad,t,d){ortak(t);(KUR[ad]||KUR.kule)(t,d);R.render(sc,cam)}};
})();
