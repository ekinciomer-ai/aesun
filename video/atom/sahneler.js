/* Kumdan Elektriğe — güneş paneli yolculuğu. Kaydırma (scroll) ya da kayıt zaman çizelgesiyle sürülen 3D sahneler. */
(function(){
const Q=new URLSearchParams(location.search);const YATAY=Q.get("ar")==="169";if(YATAY)document.body.classList.add("yatay");
const W=innerWidth,H=innerHeight,ASP=W/H;
const R=new THREE.WebGLRenderer({canvas:document.getElementById("c"),antialias:true,preserveDrawingBuffer:true});
R.setPixelRatio(1);R.setSize(W,H,false);R.localClippingEnabled=true;R.toneMapping=THREE.NoToneMapping;R.outputEncoding=THREE.LinearEncoding;
const PM=new THREE.PMREMGenerator(R);const ENV=PM.fromScene(new THREE.RoomEnvironment(),0.04).texture;
const L=h=>new THREE.Color(h).convertSRGBToLinear();
const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
const cl=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));const sm=(a,b,x)=>{const t=cl((x-a)/(b-a));return t*t*(3-2*t)};const lerp=(a,b,t)=>a+(b-a)*t;
const eio=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
let seed=3;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
function std(h,m=0,r=.5,x={}){return new THREE.MeshStandardMaterial(Object.assign({color:L(h),metalness:m,roughness:r,envMap:ENV,envMapIntensity:.55},x))}
function emi(h,i=2,x={}){return new THREE.MeshStandardMaterial(Object.assign({color:L("#000000"),emissive:L(h),emissiveIntensity:i},x))}
function cam(){return new THREE.PerspectiveCamera(YATAY?46:56,ASP,.05,2000)}
function orb(c,t,d,yaw,p){c.position.set(t.x+Math.cos(yaw)*Math.cos(p)*d,t.y+Math.sin(p)*d,t.z+Math.sin(yaw)*Math.cos(p)*d);c.lookAt(t)}
const GT=(()=>{const c=document.createElement("canvas");c.width=c.height=128;const x=c.getContext("2d");const g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,"rgba(255,255,255,1)");g.addColorStop(.2,"rgba(255,255,255,.75)");g.addColorStop(.5,"rgba(255,255,255,.18)");g.addColorStop(1,"rgba(255,255,255,0)");x.fillStyle=g;x.fillRect(0,0,128,128);return new THREE.CanvasTexture(c)})();
function spr(h,s,op=1){const m=new THREE.Sprite(new THREE.SpriteMaterial({map:GT,color:L(h),transparent:true,opacity:op,blending:THREE.AdditiveBlending,depthWrite:false}));m.scale.set(s,s,1);return m}
function pts(n,size,add=true){const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.BufferAttribute(new Float32Array(n*3),3));g.setAttribute("color",new THREE.BufferAttribute(new Float32Array(n*3),3));
  return new THREE.Points(g,new THREE.PointsMaterial({size,map:GT,vertexColors:true,transparent:true,depthWrite:false,blending:add?THREE.AdditiveBlending:THREE.NormalBlending,alphaTest:add?0:.25}))}
function zemin(sc,h="#0b0e15",r=40,ro=.55){const m=new THREE.Mesh(new THREE.CircleGeometry(r,64),std(h,.6,ro,{envMapIntensity:.18}));m.rotation.x=-Math.PI/2;sc.add(m);return m}
function isik(sc,key="#ffffff",ki=2.2,rim="#6FE3FF",ri=1.4){const a=new THREE.DirectionalLight(L(key),ki);a.position.set(3,6,4);sc.add(a);const b=new THREE.DirectionalLight(L(rim),ri);b.position.set(-5,3,-4);sc.add(b);sc.add(new THREE.AmbientLight(L("#203040"),.4));return[a,b]}
function gok(sc,ust,orta,alt){const m=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{u:{value:L(ust)},o:{value:L(orta)},a:{value:L(alt)},sd:{value:V3(0,.1,-1).normalize()},sg:{value:0}},
  vertexShader:"varying vec3 vP;void main(){vP=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
  fragmentShader:"uniform vec3 u,o,a,sd;uniform float sg;varying vec3 vP;void main(){float h=vP.y;vec3 c=h>0.?mix(o,u,pow(clamp(h,0.,1.),.55)):mix(o,a,clamp(-h*4.,0.,1.));float s=max(dot(vP,sd),0.);c+=vec3(1.,.62,.3)*pow(s,90.)*sg*1.2+vec3(1.,.5,.2)*pow(s,8.)*sg*.18;gl_FragColor=vec4(c,1.);}"});
  const s=new THREE.Mesh(new THREE.SphereGeometry(900,48,24),m);sc.add(s);return m}
// hücre dokusu (mavi + gümüş parmaklar + busbar)
function hucreTex(n=1,parm=true){const c=document.createElement("canvas");c.width=c.height=256;const x=c.getContext("2d");
  const g=x.createLinearGradient(0,0,256,256);g.addColorStop(0,"#1a3a86");g.addColorStop(.5,"#122c6c");g.addColorStop(1,"#1d4296");x.fillStyle=g;x.fillRect(0,0,256,256);
  for(let i=0;i<1800;i++){x.fillStyle=`rgba(120,160,255,${Math.random()*.08})`;x.fillRect(Math.random()*256,Math.random()*256,2,2)}
  if(parm){x.fillStyle="#cfd6e2";for(let i=0;i<64;i++)x.fillRect(0,2+i*4,256,.9);for(let b=0;b<9;b++)x.fillRect(12+b*29,0,2.2,256)}
  const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=8;return t}
function panelTex(){const c=document.createElement("canvas");c.width=384;c.height=640;const x=c.getContext("2d");x.fillStyle="#c9ced6";x.fillRect(0,0,384,640);x.fillStyle="#0d1630";x.fillRect(10,10,364,620);
  const h=hucreTex();for(let i=0;i<6;i++)for(let j=0;j<10;j++){x.drawImage(h.image,14+i*60,14+j*61.5,57,58.5)}const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=8;return t}
const HT=hucreTex(),PT=panelTex();

function dag(sc,renk="#4a4a3e",x0=0,z0=-160){const g=new THREE.PlaneGeometry(700,300,140,60);const p=g.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i);const h=Math.max(0,(Math.sin(x*.018)*.5+.5)*70+Math.sin(x*.05+y*.04)*14+Math.sin(x*.11)*6)*sm(-150,40,y);p.setZ(i,h)}
  g.computeVertexNormals();const m=new THREE.Mesh(g,std(renk,0,.95));m.rotation.x=-Math.PI/2;m.position.set(x0,0,z0);sc.add(m);return m}
function suMat(h="#1d5a7a"){return std(h,.3,.12,{envMapIntensity:1.0,transparent:true,opacity:.92})}
function dalgaPl(sc,w,d,seg,renk){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d,seg,seg),suMat(renk));m.rotation.x=-Math.PI/2;sc.add(m);const P=m.geometry.attributes.position,P0=Float32Array.from(P.array);
  return{m,kur(t,a=.25){for(let i=0;i<P.count;i++){const x=P0[i*3],y=P0[i*3+1];P.setZ(i,Math.sin(x*.12+t*1.3)*a+Math.sin(y*.15+t)*a*.7)}P.needsUpdate=true;m.geometry.computeVertexNormals()}}}
function barajGeo(L=80,H=36){const sh=new THREE.Shape();sh.moveTo(0,0);sh.lineTo(H*.75,0);sh.quadraticCurveTo(H*.18,H*.4,4,H);sh.lineTo(0,H);sh.closePath();const g=new THREE.ExtrudeGeometry(sh,{depth:L,bevelEnabled:false});g.translate(0,0,-L/2);return g}
function akis(sc,n,size){const p=pts(n,size);sc.add(p);return p}
// soğutma kulesi (hiperboloit) ve buhar bulutu
function kule(h=40,r=14){const p=[];for(let i=0;i<=20;i++){const y=i/20;const rr=r*(.62+.38*Math.pow((y-.62)/.62,2)*(y<.62?1:.55))+0;p.push(new THREE.Vector2(rr,y*h))}const m=new THREE.Mesh(new THREE.LatheGeometry(p,64),std("#c9c6be",0,.85,{side:THREE.DoubleSide}));return m}
function buhar(sc,n,x,z,h,r){const p=pts(n,7,true);p.material.opacity=.5;sc.add(p);const D=[];for(let i=0;i<n;i++)D.push([rnd(),rnd()*6.283,rnd()]);
  return{kur(t,op=1){const P=p.geometry.attributes.position.array,C=p.geometry.attributes.color.array;for(let i=0;i<n;i++){const[ph,a,s]=D[i];const k=(t*.06+ph)%1;const rr=r*(.5+k*1.6);P.set([x+Math.cos(a)*rr*s+k*18,h+k*45,z+Math.sin(a)*rr*s],i*3);const o=Math.sin(k*3.14)*(1-k)*op*.45;C.set([.92*o,.93*o,.95*o],i*3)}p.geometry.attributes.position.needsUpdate=p.geometry.attributes.color.needsUpdate=true}}}
function santral(sc){const g=new THREE.Group();sc.add(g);const k1=kule();k1.position.set(-30,0,-20);g.add(k1);const k2=kule();k2.position.set(5,0,-28);g.add(k2);
  const dom=new THREE.Mesh(new THREE.CylinderGeometry(12,12,22,48),std("#d8d6d0",0,.8));dom.position.set(40,11,10);g.add(dom);const kub=new THREE.Mesh(new THREE.SphereGeometry(12,48,24,0,6.283,0,Math.PI/2),std("#d8d6d0",0,.8));kub.position.set(40,22,10);g.add(kub);
  const tb=new THREE.Mesh(new THREE.BoxGeometry(40,16,18),std("#9aa4ad",.3,.6));tb.position.set(70,8,-12);g.add(tb);return g}
const S={};
// 0) AÇILIŞ / KAPANIŞ: alacakaranlıkta santral, kulelerden buhar
S.hero=(()=>{const sc=new THREE.Scene();const c=cam();const sky=gok(sc,"#101c3e","#d88a5a","#22222a");sky.uniforms.sg.value=1;sky.uniforms.sd.value=V3(-.6,.05,-1).normalize();sc.fog=new THREE.Fog(L("#4a4050"),120,700);
  isik(sc,"#ffc59a",1.5,"#7aa0ff",.9);const yer=new THREE.Mesh(new THREE.PlaneGeometry(1400,1400),std("#2e2c26",0,.95));yer.rotation.x=-Math.PI/2;sc.add(yer);santral(sc);
  const b1=buhar(sc,420,-30,-20,40,10),b2=buhar(sc,420,5,-28,40,10);
  return{sc,c,ex:.75,bl:[.45,.5,.85],kur(u,t,son){b1.kur(t);b2.kur(t+3);orb(c,V3(10,22,0),son?(YATAY?150:190):lerp(130,180,u)*(YATAY?.8:1.05),son?lerp(1.0,1.25,u):lerp(1.6,1.15,eio(u)),son?.18:lerp(.06,.18,u))}}})();
// çekirdek kümesi: proton (kırmızı) + nötron (gri) küreleri
function cekirdek(n=60,r=1.2){const g=new THREE.Group();const pm=std("#d8504a",.1,.35),nm=std("#9aa3ad",.1,.35);const k=[];for(let i=0;i<n;i++){const v=V3(rnd()-.5,rnd()-.5,rnd()-.5).normalize().multiplyScalar(Math.cbrt(rnd())*r);const m=new THREE.Mesh(new THREE.SphereGeometry(.28,16,12),i%2?pm:nm);m.position.copy(v);g.add(m);k.push(v.clone())}g.userData.k=k;return g}
// 1) FİSYON
S.fisyon=(()=>{const sc=new THREE.Scene();sc.background=L("#03040a");const c=cam();isik(sc,"#ffffff",2,"#6FE3FF",1.6);
  const ck=cekirdek(90,1.5);sc.add(ck);const A=new THREE.Group(),B=new THREE.Group();sc.add(A,B);ck.children.forEach((m,i)=>{(m.position.x<0?A:B).add(m.clone())});A.visible=B.visible=false;
  const nt=new THREE.Mesh(new THREE.SphereGeometry(.3,16,12),emi("#9fd8ff",2.5));sc.add(nt);const ys=[0,1,2].map(()=>{const m=new THREE.Mesh(new THREE.SphereGeometry(.3,16,12),emi("#9fd8ff",2.5));sc.add(m);return m});
  const fl=spr("#fff2c8",8,0);sc.add(fl);const isi=pts(600,.12);sc.add(isi);const ID=[];for(let i=0;i<600;i++)ID.push(V3(rnd()-.5,rnd()-.5,rnd()-.5).normalize());
  return{sc,c,ex:.85,bl:[.8,.5,.75],kur(u,t){const hit=.35,k=sm(hit,hit+.35,u);nt.position.set(lerp(-12,0,cl(u/hit)),0,0);nt.visible=u<hit;ck.visible=u<hit;A.visible=B.visible=u>=hit;ck.rotation.y=t*.4;
    A.position.set(-k*5,k*1.2,0);B.position.set(k*5,-k*1.2,0);A.rotation.z=k*.8;B.rotation.z=-k*.8;fl.material.opacity=u>=hit?Math.max(0,1-(u-hit)*5):0;fl.scale.setScalar(6+(u-hit)*30);
    ys.forEach((m,i)=>{m.visible=u>=hit;const d=V3(Math.cos(i*2.1+.5),Math.sin(i*2.1+.5),.3).normalize();m.position.copy(d.multiplyScalar(k*11))});
    const P=isi.geometry.attributes.position.array,C=isi.geometry.attributes.color.array;for(let i=0;i<600;i++){const r=k*9*(.3+(i%7)/7);P.set([ID[i].x*r,ID[i].y*r,ID[i].z*r],i*3);const o=u>=hit?(1-k)*1.2:0;C.set([o,o*.55,o*.15],i*3)}isi.geometry.attributes.position.needsUpdate=isi.geometry.attributes.color.needsUpdate=true;
    orb(c,V3(0,0,0),(YATAY?13:17),lerp(1.3,1.7,u),.25)},veri(u){return u<.35?`U-235 + n<small>NÖTRON ÇARPAR</small>`:`ISI + 2-3 n<small>ÇEKİRDEK BÖLÜNÜR</small>`}}})();
// 2) ZİNCİRLEME TEPKİME + KONTROL ÇUBUKLARI
S.zincir=(()=>{const sc=new THREE.Scene();sc.background=L("#03040a");const c=cam();isik(sc,"#ffffff",1.8,"#6FE3FF",1.4);
  const N=140,cs=new THREE.InstancedMesh(new THREE.SphereGeometry(.45,12,10),std("#a8b0ba",.2,.4),N);sc.add(cs);const P0=[];for(let i=0;i<N;i++)P0.push(V3((rnd()-.5)*30,(rnd()-.5)*18,(rnd()-.5)*12));
  {const M=new THREE.Matrix4();P0.forEach((p,i)=>{M.makeTranslation(p.x,p.y,p.z);cs.setMatrixAt(i,M)})}
  const ft=[];for(let i=0;i<N;i++)ft.push(i*.6%7/7*.9+rnd()*.1);
  const cub=[];for(let i=0;i<5;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(.7,22,.7),std("#2a2d33",.5,.5));m.position.set(-12+i*6,0,0);sc.add(m);cub.push(m)}
  const fl=pts(N,1.6);sc.add(fl);const nn=pts(900,.18);sc.add(nn);
  return{sc,c,ex:.85,bl:[.8,.5,.75],kur(u,t){const ins=sm(.55,.8,u);cub.forEach(m=>m.position.y=lerp(26,2,ins));
    const P=fl.geometry.attributes.position.array,C=fl.geometry.attributes.color.array;for(let i=0;i<N;i++){const p=P0[i];P.set([p.x,p.y,p.z],i*3);const ph=((t*.6+ft[i])%1);const act=u<.55?1:lerp(1,.25,ins);const o=Math.max(0,1-ph*4)*act;C.set([o,o*.6,o*.2],i*3)}fl.geometry.attributes.position.needsUpdate=fl.geometry.attributes.color.needsUpdate=true;
    const Q=nn.geometry.attributes.position.array,QC=nn.geometry.attributes.color.array;for(let i=0;i<900;i++){const a=P0[i%N],b=P0[(i*7+3)%N];const k=((t*.8+(i*.37)%1))%1;const p=a.clone().lerp(b,k);Q.set([p.x,p.y,p.z],i*3);const o=(u<.55?1:lerp(1,.2,ins))*.9;QC.set([.4*o,.8*o,1*o],i*3)}nn.geometry.attributes.position.needsUpdate=nn.geometry.attributes.color.needsUpdate=true;
    orb(c,V3(0,0,0),(YATAY?34:44),lerp(1.35,1.75,u),.18)},veri(u){return u<.55?`ZİNCİRLEME<small>NÖTRON → BÖLÜNME → NÖTRON</small>`:`KONTROL ÇUBUKLARI<small>NÖTRON YUTAR · DENGE</small>`}}})();
// 3) YAKIT: pelet → çubuk → demet
S.yakit=(()=>{const sc=new THREE.Scene();sc.background=L("#05070c");sc.fog=new THREE.FogExp2(L("#05070c"),.04);const c=cam();zemin(sc,"#0a0d13",40,.5);isik(sc,"#ffffff",2.2,"#6FE3FF",1.6);
  const pg=new THREE.CylinderGeometry(.42,.42,.55,32),pm=std("#3b3d40",.3,.55);const pel=[];for(let i=0;i<14;i++){const m=new THREE.Mesh(pg,pm);sc.add(m);pel.push(m)}
  const tub=new THREE.Mesh(new THREE.CylinderGeometry(.48,.48,8.4,32,1,true),new THREE.MeshPhysicalMaterial({color:L("#c8ccd2"),metalness:.8,roughness:.25,transparent:true,opacity:.35,envMap:ENV,side:THREE.DoubleSide,depthWrite:false}));tub.position.set(0,4.4,0);sc.add(tub);
  const NB=17*17,dem=new THREE.InstancedMesh(new THREE.CylinderGeometry(.08,.08,8,10),std("#b9c0c8",.9,.3),NB);sc.add(dem);
  const M=new THREE.Matrix4();
  return{sc,c,ex:.85,bl:[.4,.5,.85],kur(u,t){const a=sm(0,.4,u),b=sm(.45,.9,u);pel.forEach((m,i)=>{const k=cl(a*16-i);m.position.set(lerp(3+i*.2,0,eio(k)),lerp(.3,.5+i*.58,eio(k)),lerp(2,0,eio(k)));m.visible=b<.2});tub.visible=b<.2;
    for(let i=0;i<NB;i++){const x=(i%17-8)*.25,z=(Math.floor(i/17)-8)*.25;const k=cl(b*1.4-(Math.abs(x)+Math.abs(z))*.2);M.makeTranslation(x+8,4+(1-eio(k))*10,z);if(k<=0)M.makeScale(.001,.001,.001);dem.setMatrixAt(i,M)}dem.instanceMatrix.needsUpdate=true;
    orb(c,V3(lerp(0,8,b),4,0),lerp(9,14,b)*(YATAY?.85:1.15),lerp(.6,1.1,u),lerp(.25,.45,b))},veri(u){return u<.45?`PELET<small>~1 TON KÖMÜR ENERJİSİ</small>`:`YAKIT DEMETİ<small>REAKTÖR KALBİNE</small>`}}})();
// 4) ISI: reaktör kalbi, mavi Çerenkov ışıması, birincil-ikincil devre
S.isi=(()=>{const sc=new THREE.Scene();sc.background=L("#02040a");sc.fog=new THREE.FogExp2(L("#02040a"),.02);const c=cam();isik(sc,"#ffffff",1.2,"#6FE3FF",1.4);
  const kab=new THREE.Mesh(new THREE.CylinderGeometry(4,4,12,48,1,true),new THREE.MeshPhysicalMaterial({color:L("#9aa3ad"),metalness:.8,roughness:.3,transparent:true,opacity:.25,envMap:ENV,side:THREE.DoubleSide,depthWrite:false}));kab.position.y=6;sc.add(kab);
  const kalp=new THREE.Mesh(new THREE.CylinderGeometry(2.6,2.6,5,32),emi("#2f8cff",2.4));kalp.position.y=4;sc.add(kalp);const gl=spr("#4aa8ff",16,.8);gl.position.y=4;sc.add(gl);
  const yolA=new THREE.CatmullRomCurve3([V3(3,9,0),V3(10,12,0),V3(16,9,0),V3(16,3,0),V3(10,1,0),V3(3,2,0)],true);const yolB=new THREE.CatmullRomCurve3([V3(18,8,0),V3(24,14,0),V3(32,14,0),V3(32,4,0),V3(24,2,0),V3(18,4,0)],true);
  [yolA,yolB].forEach((y,i)=>{const m=new THREE.Mesh(new THREE.TubeGeometry(y,80,.35,10,true),std(i?"#5a6676":"#6a5a5a",.6,.4));sc.add(m)});
  const bh=new THREE.Mesh(new THREE.CylinderGeometry(2,2,10,32),std("#c8ccd2",.6,.35));bh.position.set(17,7,0);sc.add(bh);
  const pa=pts(500,1.2),pb=pts(500,1.4);sc.add(pa,pb);
  return{sc,c,ex:.85,bl:[.9,.5,.7],kur(u,t){kalp.material.emissiveIntensity=2.2+Math.sin(t*3)*.2;
    const f=(p,y,n,col,hz)=>{const P=p.geometry.attributes.position.array,C=p.geometry.attributes.color.array;for(let i=0;i<n;i++){const k=(t*hz+i/n)%1;const q=y.getPointAt(k);P.set([q.x,q.y,q.z],i*3);C.set(col(k),i*3)}p.geometry.attributes.position.needsUpdate=p.geometry.attributes.color.needsUpdate=true};
    const on=sm(.35,.55,u);f(pa,yolA,500,k=>[1,.35+.3*k,.2],.25);f(pb,yolB,500,k=>[.85*on,.9*on,1*on],.2);
    orb(c,V3(16,7,0),(YATAY?38:64),lerp(1.4,1.6,u),.12)},veri(u){return u<.4?`BİRİNCİL DEVRE<small>BASINÇLI SICAK SU</small>`:`BUHAR<small>İKİNCİL DEVRE</small>`}}})();
// 5) TÜRBİN + SOĞUTMA KULESİ
S.turbin=(()=>{const sc=new THREE.Scene();const c=cam();const sky=gok(sc,"#2f63b0","#cfe0ee","#6a5a46");sky.uniforms.sg.value=.4;sc.fog=new THREE.Fog(L("#bccbd8"),150,800);isik(sc,"#fff2dc",2,"#9cc4ff",.8);
  const yer=new THREE.Mesh(new THREE.PlaneGeometry(1400,1400),std("#5d5a46",0,.95));yer.rotation.x=-Math.PI/2;sc.add(yer);santral(sc);const b1=buhar(sc,500,-30,-20,40,10),b2=buhar(sc,500,5,-28,40,10);
  const rot=new THREE.Group();rot.position.set(70,8,8);sc.add(rot);for(let i=0;i<9;i++){const d=new THREE.Mesh(new THREE.CylinderGeometry(1.2+i*.45,1.2+i*.45,.25,40),std("#c9ced6",1,.25));d.rotation.z=Math.PI/2;d.position.x=-10+i*2.4;rot.add(d)}
  const ax=new THREE.Mesh(new THREE.CylinderGeometry(.6,.6,26,16),std("#9aa3ad",1,.3));ax.rotation.z=Math.PI/2;rot.add(ax);
  return{sc,c,ex:.66,bl:[.3,.5,.95],kur(u,t){b1.kur(t);b2.kur(t+3);rot.rotation.x=t*6;const k=sm(.5,.9,u);
    orb(c,u<.5?V3(70,8,8):V3(-10,30,-20),u<.5?(YATAY?30:40):lerp(120,170,k)*(YATAY?.8:1.05),u<.5?lerp(1.2,1.5,u):lerp(1.2,1.45,k),u<.5?.25:.12)},veri(u){return u<.5?`TÜRBİN<small>BUHAR → DÖNÜŞ → ELEKTRİK</small>`:`SU BUHARI<small>DUMAN DEĞİL</small>`}}})();
// 6) GÜVENLİK: koruma binası kesiti
S.guvenlik=(()=>{const sc=new THREE.Scene();sc.background=L("#05070c");sc.fog=new THREE.FogExp2(L("#05070c"),.02);const c=cam();zemin(sc,"#0a0d13",80,.5);isik(sc,"#ffffff",2,"#6FE3FF",1.6);
  const pc=new THREE.Plane(V3(0,0,-1),0);const bet=std("#a8a59c",0,.85,{clippingPlanes:[pc],side:THREE.DoubleSide});
  const dv=new THREE.Mesh(new THREE.CylinderGeometry(12,12,24,64,1,true),bet);dv.position.y=12;sc.add(dv);const kb=new THREE.Mesh(new THREE.SphereGeometry(12,64,24,0,6.283,0,Math.PI/2),bet);kb.position.y=24;sc.add(kb);
  const dv2=new THREE.Mesh(new THREE.CylinderGeometry(10.8,10.8,24,64,1,true),std("#6a6a68",.3,.6,{clippingPlanes:[pc],side:THREE.DoubleSide}));dv2.position.y=12;sc.add(dv2);
  const kap=new THREE.Mesh(new THREE.CylinderGeometry(2.4,2.4,10,32),std("#9aa3ad",.9,.3));kap.position.y=8;sc.add(kap);
  const gl=spr("#4aa8ff",10,.6);gl.position.y=7;sc.add(gl);const kat=[];
  return{sc,c,ex:.8,bl:[.5,.5,.85],kur(u,t){pc.constant=lerp(14,0,eio(sm(0,.5,u)));orb(c,V3(0,12,0),lerp(60,48,u)*(YATAY?.8:1.1),lerp(1.2,1.65,u),lerp(.25,.15,u))},veri(u){return u<.5?`BETON KORUMA BİNASI<small>KALIN DUVAR</small>`:`ÇELİK BASINÇ KABI<small>REAKTÖRÜN KABUĞU</small>`}}})();
// 7) TÜRKİYE: Akkuyu, kıyıda 4 ünite
S.turkiye=(()=>{const sc=new THREE.Scene();const c=cam();const sky=gok(sc,"#2f63b0","#d6e4ee","#5a6a7a");sky.uniforms.sg.value=.5;sky.uniforms.sd.value=V3(.6,.3,-1).normalize();sc.fog=new THREE.Fog(L("#c0d0dc"),200,1200);isik(sc,"#fff2dc",2,"#9cc4ff",.8);
  const kara=new THREE.Mesh(new THREE.PlaneGeometry(1400,700),std("#7a6a4a",0,.95));kara.rotation.x=-Math.PI/2;kara.position.z=-300;sc.add(kara);const deniz=dalgaPl(sc,1400,700,80,"#1b5a7e");deniz.m.position.set(0,-.5,350);
  const un=[];for(let i=0;i<4;i++){const g=new THREE.Group();g.position.set(-120+i*80,0,-30);sc.add(g);const d=new THREE.Mesh(new THREE.CylinderGeometry(14,14,26,48),std("#e2e0da",0,.75));d.position.y=13;g.add(d);const k=new THREE.Mesh(new THREE.SphereGeometry(14,48,24,0,6.283,0,Math.PI/2),std("#e2e0da",0,.75));k.position.y=26;g.add(k);
    const tb=new THREE.Mesh(new THREE.BoxGeometry(40,18,22),std("#8f99a3",.3,.6));tb.position.set(10,9,-40);g.add(tb);un.push(g)}
  return{sc,c,ex:.66,bl:[.3,.5,.95],kur(u,t){deniz.kur(t,.5);un.forEach((g,i)=>{const k=sm(i*.15,i*.15+.25,u);g.scale.set(1,Math.max(.001,eio(k)),1)});
    orb(c,V3(0,15,-30),lerp(330,280,u)*(YATAY?.75:1.0),lerp(1.2,1.45,u),lerp(.25,.18,u))},veri(u){return`${Math.round(lerp(1200,4800,sm(0,.65,u))).toLocaleString("tr-TR")} MW<small>AKKUYU · 4 × 1.200 MW</small>`}}})();
S.son={...S.hero,kur:(u,t)=>S.hero.kur(u,t,true)};

/* ======================= HUD ======================= */
const DIL=Q.get("dil")||"tr";
const BAS={hero:["","ATOM","ENERJİ ÜRETİM KAYNAKLARI · BÖLÜM 4"],fisyon:["01","FİSYON","NÖTRON · ÇEKİRDEK · ISI"],zincir:["02","ZİNCİRLEME TEPKİME","KONTROL ÇUBUKLARIYLA DENGE"],yakit:["03","YAKIT","PELET · ÇUBUK · DEMET"],isi:["04","ISIDAN BUHARA","İKİ AYRI SU DEVRESİ"],
  turbin:["05","TÜRBİN","BUHAR · JENERATÖR · SOĞUTMA KULESİ"],guvenlik:["06","GÜVENLİK","ÇELİK KAP · BETON BİNA"],turkiye:["07","AKKUYU","TÜRKİYE'NİN İLK NÜKLEER SANTRALİ"],son:["","ATOM","SIRADA: YERİN ALTINDAKİ ISI"]};
if(DIL==="en")Object.assign(BAS,{hero:["","THE ATOM","ENERGY SOURCES · EPISODE 4"],fisyon:["01","FISSION","NEUTRON · NUCLEUS · HEAT"],zincir:["02","CHAIN REACTION","BALANCED BY CONTROL RODS"],yakit:["03","FUEL","PELLET · ROD · BUNDLE"],isi:["04","HEAT TO STEAM","TWO SEPARATE WATER LOOPS"],
  turbin:["05","TURBINE","STEAM · GENERATOR · COOLING TOWER"],guvenlik:["06","SAFETY","STEEL VESSEL · CONCRETE BUILDING"],turkiye:["07","AKKUYU","TURKEY'S FIRST NUCLEAR PLANT"],son:["","THE ATOM","NEXT: THE HEAT BENEATH US"]});
const SOZ={"NÖTRON ÇARPAR":"NEUTRON STRIKES","ÇEKİRDEK BÖLÜNÜR":"NUCLEUS SPLITS","ISI + 2-3 n":"HEAT + 2-3 n","ZİNCİRLEME":"CHAIN REACTION","NÖTRON → BÖLÜNME → NÖTRON":"NEUTRON → SPLIT → NEUTRON","KONTROL ÇUBUKLARI":"CONTROL RODS","NÖTRON YUTAR · DENGE":"ABSORB NEUTRONS · BALANCE",
  "PELET":"PELLET","~1 TON KÖMÜR ENERJİSİ":"≈ ENERGY OF 1 TON OF COAL","YAKIT DEMETİ":"FUEL BUNDLE","REAKTÖR KALBİNE":"INTO THE CORE","BİRİNCİL DEVRE":"PRIMARY LOOP","BASINÇLI SICAK SU":"PRESSURIZED HOT WATER","BUHAR":"STEAM","İKİNCİL DEVRE":"SECONDARY LOOP",
  "TÜRBİN":"TURBINE","BUHAR → DÖNÜŞ → ELEKTRİK":"STEAM → ROTATION → POWER","SU BUHARI":"WATER VAPOR","DUMAN DEĞİL":"NOT SMOKE","BETON KORUMA BİNASI":"CONCRETE CONTAINMENT","KALIN DUVAR":"THICK WALLS","ÇELİK BASINÇ KABI":"STEEL PRESSURE VESSEL","REAKTÖRÜN KABUĞU":"THE REACTOR'S SHELL"};
const ceviri=h=>{if(DIL==="tr")return h;let o=h;Object.keys(SOZ).sort((a,b)=>b.length-a.length).forEach(k=>{o=o.split(k).join(SOZ[k])});return o.replace(/(\d)([.,])(\d)/g,(m,x,p,y)=>x+(p==="."?",":".")+y)};
const SIRA=["fisyon","zincir","yakit","isi","turbin","guvenlik","turkiye"],NS=SIRA.length;
const $=s=>document.getElementById(s);$("oku").textContent=DIL==="en"?"URANIUM → FISSION → HEAT → STEAM → TURBINE → GRID":"URANYUM → FİSYON → ISI → BUHAR → TÜRBİN → ŞEBEKE";$("yol").innerHTML=SIRA.map(()=>"<i><s></s></i>").join("");
let sonBas="";function hud(ad,u){const b=BAS[ad];if(sonBas!==ad){sonBas=ad;$("bn").textContent=b[0]?`${DIL==="en"?"STEP":"ADIM"} ${b[0]} / ${String(NS).padStart(2,"0")}`:(DIL==="en"?"KOZMOS LAB · ENERGY SOURCES":"KOZMOS LAB · ENERJİ ÜRETİM KAYNAKLARI");$("bt").textContent=b[1];$("bs").textContent=b[2]}
  const gi=sm(0,.08,u);$("bas").style.opacity=gi;$("bas").style.transform=`translateY(${(1-gi)*2}vmin)`;
  const si=SIRA.indexOf(ad);[...$("yol").children].forEach((e,i)=>{e.className=(ad==="son"||i<si)?"done":"";e.firstChild.style.transform=i===si?`scaleX(${u})`:""});
  $("sayac").textContent=si>=0?`${String(si+1).padStart(2,"0")}/${String(NS).padStart(2,"0")}`:"";const S_=S[ad];$("veri").innerHTML=S_.veri?ceviri(S_.veri(u)):"";$("veri").style.opacity=S_.veri?sm(.05,.15,u):0}

/* ======================= ZAMAN ÇİZELGESİ ======================= */
let K={sahneler:["hero","fisyon","zincir","yakit","isi","turbin","guvenlik","turkiye","son"].map((a,i)=>({ad:a,bas:i*5,son:i*5+5})),altyazi:[],gecis:"flas"};
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
