/* Kozmos Lab · Merak — 3D motor yardımcıları (three r128). Sahneler sahneler.js içinde, akış calistir.js içinde. */
(function(){
const W=innerWidth,H=innerHeight,ASP=W/H;
const R=new THREE.WebGLRenderer({canvas:document.getElementById("c"),antialias:true,preserveDrawingBuffer:true});
R.setPixelRatio(1);R.setSize(W,H,false);R.toneMapping=THREE.NoToneMapping;R.outputEncoding=THREE.LinearEncoding;
const PM=new THREE.PMREMGenerator(R);const ENV=PM.fromScene(new THREE.RoomEnvironment(),0.04).texture;
const T={acik:false};
const ACIKR={"#6fe3ff":"#1580bd","#f2c46b":"#de8400","#9fe9ff":"#1580bd","#ff6a4d":"#e0452a","#ff9a3a":"#e06a10","#f3f5fa":"#16213a","#ffe3a0":"#f0a020","#4dffa0":"#13a35a","#3dff9a":"#19c46c","#e9fbff":"#e07a00","#ffffff":"#ffffff"};
const TR=h=>T.acik&&typeof h==="string"&&ACIKR[h.toLowerCase()]?ACIKR[h.toLowerCase()]:h;
const L=h=>new THREE.Color(TR(h)).convertSRGBToLinear();
const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
const cl=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));const sm=(a,b,x)=>{const t=cl((x-a)/(b-a));return t*t*(3-2*t)};const lerp=(a,b,t)=>a+(b-a)*t;
const eio=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;const eo=t=>1-Math.pow(1-cl(t),3);const eob=t=>{t=cl(t);const c=1.70158;return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2)};
let seed=3;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
const TL=new THREE.TextureLoader();const tex=(f,srgb=true)=>{const t=TL.load(f);if(srgb)t.encoding=THREE.sRGBEncoding;t.anisotropy=8;return t};
function std(h,m=0,r=.5,x={}){return new THREE.MeshStandardMaterial(Object.assign({color:L(h),metalness:m,roughness:r,envMap:ENV,envMapIntensity:.55},x))}
function emi(h,i=2,x={}){return new THREE.MeshStandardMaterial(Object.assign({color:L("#000000"),emissive:L(h),emissiveIntensity:i},x))}
function bas(h,x={}){return new THREE.MeshBasicMaterial(Object.assign({color:L(h)},x))}
function cam(f=50){return new THREE.PerspectiveCamera(f,ASP,.05,4000)}
function orb(c,t,d,yaw,p){c.position.set(t.x+Math.cos(yaw)*Math.cos(p)*d,t.y+Math.sin(p)*d,t.z+Math.sin(yaw)*Math.cos(p)*d);c.lookAt(t)}
const GT=(()=>{const c=document.createElement("canvas");c.width=c.height=128;const x=c.getContext("2d");const g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,"rgba(255,255,255,1)");g.addColorStop(.2,"rgba(255,255,255,.75)");g.addColorStop(.5,"rgba(255,255,255,.18)");g.addColorStop(1,"rgba(255,255,255,0)");x.fillStyle=g;x.fillRect(0,0,128,128);return new THREE.CanvasTexture(c)})();
function spr(h,s,op=1){const m=new THREE.Sprite(new THREE.SpriteMaterial({map:GT,color:L(h),transparent:true,opacity:op,blending:T.acik?THREE.NormalBlending:THREE.AdditiveBlending,depthWrite:false}));m.scale.set(s,s,1);if(T.acik){m.material.color=L("#f2a52a");const o=m.material;let v=op;Object.defineProperty(o,"opacity",{get(){return v*.55},set(x){v=x}})}return m}
function pts(n,size,add=true){const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.BufferAttribute(new Float32Array(n*3),3));g.setAttribute("color",new THREE.BufferAttribute(new Float32Array(n*3),3));
  const pm=new THREE.PointsMaterial({size,map:GT,vertexColors:true,transparent:true,depthWrite:false,blending:add&&!T.acik?THREE.AdditiveBlending:THREE.NormalBlending});
  if(T.acik)pm.onBeforeCompile=sh=>{sh.fragmentShader=sh.fragmentShader.replace("#include <color_fragment>","#include <color_fragment>\nfloat mx=max(max(diffuseColor.r,diffuseColor.g),diffuseColor.b);diffuseColor.rgb=diffuseColor.rgb/max(mx,1e-3)*.62;diffuseColor.a*=clamp(mx,0.,1.);")};
  const p=new THREE.Points(g,pm);p.frustumCulled=false;return p}
function isik(sc,key="#ffffff",ki=2.2,rim="#6FE3FF",ri=1.4){const a=new THREE.DirectionalLight(L(key),ki);a.position.set(3,6,4);sc.add(a);const b=new THREE.DirectionalLight(L(rim),ri);b.position.set(-5,3,-4);sc.add(b);const c=new THREE.AmbientLight(L("#203040"),.4);sc.add(c);return[a,b,c]}
// yıldızlı uzay + hafif bulutsu
function uzay(sc,n=5000,r=1500){const p=pts(n,3.2,true);p.material.sizeAttenuation=false;const P=p.geometry.attributes.position.array,C=p.geometry.attributes.color.array;
  for(let i=0;i<n;i++){const u=rnd()*2-1,a=rnd()*6.283,s=Math.sqrt(1-u*u);P.set([Math.cos(a)*s*r,u*r,Math.sin(a)*s*r],i*3);const b=Math.pow(rnd(),3)*.9+.08,w=rnd();C.set([b*(.8+w*.2),b*(.85+.1*w),b],i*3)}sc.add(p);
  const m=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{k:{value:1}},vertexShader:"varying vec3 v;void main(){v=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
  fragmentShader:"uniform float k;varying vec3 v;float h(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453);}float n(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z);}float fb(vec3 p){float a=0.,w=.5;for(int i=0;i<5;i++){a+=w*n(p);p*=2.03;w*=.5;}return a;}void main(){float f=fb(v*2.6);float g=fb(v*5.+3.);vec3 c=vec3(.02,.03,.07)+vec3(.10,.05,.20)*pow(f,3.)*1.6+vec3(.02,.10,.18)*pow(g,4.)*1.4;gl_FragColor=vec4(c*k,1.);}"});
  const s=new THREE.Mesh(new THREE.SphereGeometry(r*1.2,48,24),m);sc.add(s);if(T.acik){s.visible=false;p.material.size=2.4}return{p,m}}
// 3D yazı (sprite)
function yazi(t,o={}){const fs=o.fs||64,font=o.font||`700 ${fs}px "Space Mono"`;const c=document.createElement("canvas");const x=c.getContext("2d");x.font=font;const w=Math.ceil(x.measureText(t).width)+fs*.8,h=Math.ceil(fs*1.5);c.width=w;c.height=h;
  x.font=font;x.textBaseline="middle";if(o.bg){x.fillStyle=o.bg;x.fillRect(0,0,w,h)}x.fillStyle=TR(o.renk||"#F3F5FA");x.shadowColor=T.acik?"rgba(255,255,255,.95)":"rgba(0,0,0,.8)";x.shadowBlur=fs*.25;x.fillText(t,fs*.4,h/2);
  const tx=new THREE.CanvasTexture(c);tx.encoding=THREE.sRGBEncoding;tx.anisotropy=8;const m=new THREE.Sprite(new THREE.SpriteMaterial({map:tx,transparent:true,depthWrite:false,depthTest:o.dt!==undefined?o.dt:false}));
  const s=o.boy||1;m.scale.set(s*w/h,s,1);m.renderOrder=10;if(o.sol)m.center.set(0,.5);return m}
// değişebilen 3D yazı: d.set("metin")
function dyazi(o={}){const fs=o.fs||64,cw=o.gen||12;const c=document.createElement("canvas");c.width=Math.ceil(fs*.62*cw+fs*.8);c.height=Math.ceil(fs*1.5);const tx=new THREE.CanvasTexture(c);tx.encoding=THREE.sRGBEncoding;
  const m=new THREE.Sprite(new THREE.SpriteMaterial({map:tx,transparent:true,depthWrite:false,depthTest:false}));const s=o.boy||1;m.scale.set(s*c.width/c.height,s,1);m.renderOrder=11;if(o.sol)m.center.set(0,.5);
  m.set=t=>{if(m._t===t)return;m._t=t;const x=c.getContext("2d");x.clearRect(0,0,c.width,c.height);x.font=o.font||`700 ${fs}px "Space Mono"`;x.textBaseline="middle";x.textAlign=o.sol?"left":"center";x.fillStyle=TR(o.renk||"#F3F5FA");x.shadowColor=T.acik?"rgba(255,255,255,.95)":"rgba(0,0,0,.8)";x.shadowBlur=fs*.25;x.fillText(t,o.sol?fs*.4:c.width/2,c.height/2);tx.needsUpdate=true};m.set(o.t||"");return m}
// çizgi (ilerletilebilir)
function cizgi(noktalar,h="#6FE3FF",op=1,kesik=0){const g=new THREE.BufferGeometry().setFromPoints(noktalar);const m=kesik?new THREE.LineDashedMaterial({color:L(h),dashSize:kesik,gapSize:kesik*.7,transparent:true,opacity:op}):new THREE.LineBasicMaterial({color:L(h),transparent:true,opacity:op});
  const l=new THREE.Line(g,m);if(kesik)l.computeLineDistances();l.frustumCulled=false;l.userData.n=noktalar.length;l.ilerle=k=>{l.geometry.setDrawRange(0,Math.max(0,Math.ceil(l.userData.n*cl(k))))};return l}
// kalın şerit (bloom için ince silindir)
function serit(a,b,r,mat){const d=b.clone().sub(a);const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,1,12,1,true),mat);m.position.copy(a).addScaledVector(d,.5);m.quaternion.setFromUnitVectors(V3(0,1,0),d.clone().normalize());m.scale.y=d.length();return m}
// ölçü çizgisi: a-b arası, uçlarda çentik, ortada etiket
function olcu(a,b,metin,h="#F2C46B",o={}){const g=new THREE.Group();const d=b.clone().sub(a);const n=o.n||V3(0,0,1);const yan=d.clone().cross(n).normalize().multiplyScalar(o.cent||.18);
  const N=60;const ps=[];for(let i=0;i<=N;i++)ps.push(a.clone().addScaledVector(d,i/N));const l=cizgi(ps,h,1);g.add(l);
  const c1=cizgi([a.clone().add(yan),a.clone().sub(yan)],h),c2=cizgi([b.clone().add(yan),b.clone().sub(yan)],h);g.add(c1,c2);
  const y=yazi(metin,{renk:h,boy:o.boy||.5});y.position.copy(a).addScaledVector(d,.5).add(o.yer||V3(0,0,0));g.add(y);
  g.ilerle=k=>{l.ilerle(eio(sm(0,.8,k)));c1.visible=k>.02;c2.visible=k>.78;y.material.opacity=sm(.6,1,k)};return g}
// Güneş (yüzey shader + korona)
function gunes(r=3){const g=new THREE.Group();const U={t:{value:0},k:{value:1}};
  const m=new THREE.ShaderMaterial({uniforms:U,vertexShader:"varying vec3 vN,vP;varying vec3 vV;void main(){vN=normalize(normalMatrix*normal);vP=position;vec4 mv=modelViewMatrix*vec4(position,1.);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}",
  fragmentShader:"uniform float t,k;varying vec3 vN,vP,vV;float h(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453);}float n(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z);}float fb(vec3 p){float a=0.,w=.5;for(int i=0;i<5;i++){a+=w*n(p);p*=2.1;w*=.5;}return a;}"+
  "void main(){vec3 p=normalize(vP);float g=fb(p*7.+vec3(0.,t*.15,t*.1));float c=fb(p*22.-vec3(t*.3));float mu=clamp(dot(vN,vV),0.,1.);float limb=pow(mu,.45);vec3 hot=vec3(1.,.93,.75),mid=vec3(1.,.55,.12),cool=vec3(.75,.18,.02);vec3 col=mix(cool,mid,smoothstep(.25,.6,g));col=mix(col,hot,smoothstep(.55,.85,g*.7+c*.4));col*=limb*1.25+.15;"+
  "vec3 off=vec3(.16,.025,.006)*smoothstep(.45,.85,g)*(.25+.75*pow(1.-mu,2.));gl_FragColor=vec4(mix(off,col*1.7,k),1.);}"});
  const s=new THREE.Mesh(new THREE.SphereGeometry(r,96,64),m);g.add(s);
  const c1=spr("#ffb04a",r*3.4,.5),c2=spr("#ff7a20",r*7,.28),c3=spr("#fff2c8",r*2.4,.18);g.add(c1,c2,c3);
  const pl=new THREE.PointLight(L("#fff1d8"),3,0,0);g.add(pl);
  g.ayar=(t,k)=>{if(T.acik){if(!g._ac){g._ac=1;s.material=new THREE.MeshToonMaterial({color:L("#ffc23a"),gradientMap:GRAD});const h=new THREE.Mesh(s.geometry,new THREE.MeshBasicMaterial({color:MUR,side:THREE.BackSide}));h.scale.setScalar(1.02);s.add(h);g.isinlar=[];const ig=new THREE.Group();ig.userData.bb=1;g.add(ig);for(let i=0;i<16;i++){const a=i/16*6.283;const l=new THREE.Mesh(new THREE.BoxGeometry(r*.06,r*.42,r*.02),new THREE.MeshBasicMaterial({color:L("#f0a020")}));l.position.set(Math.cos(a)*r*1.38,Math.sin(a)*r*1.38,0);l.rotation.z=a-Math.PI/2;ig.add(l);g.isinlar.push(l)}}
    s.material.color=L("#ffc23a").lerp(L("#9aa0ad"),1-k);g.isinlar.forEach((l,i)=>{l.visible=k>.05;l.scale.setScalar(.7+.3*k+Math.sin(t*3+i)*.08)});[c1,c2,c3].forEach(x=>x.visible=false);pl.intensity=3*k;if(g.parent&&g.isinlar[0]){const cm=g.parent.userData.cam;if(cm)g.isinlar.forEach(l=>{})}return}
    U.k.value=k;U.t.value=t;c1.material.opacity=.5*k;c2.material.opacity=.28*k;c3.material.opacity=.18*k;const pu=1+Math.sin(t*1.7)*.03;c1.scale.setScalar(r*3.4*pu*(0.6+.4*k));c2.scale.setScalar(r*7*(0.5+.5*k));pl.intensity=3*k};g.ayar(0,1);g.R=r;g.isik=pl;return g}
// tutulma halkası: kamera yönlü düzlem, diskin hemen dışından başlayan ışıma
function halka(r=3,h="#fff1d0"){const m=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{k:{value:1},c:{value:L(h)},t:{value:0}},
  vertexShader:"varying vec2 vU;void main(){vU=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
  fragmentShader:"uniform float k,t;uniform vec3 c;varying vec2 vU;void main(){float d=length(vU)*4.;float a=atan(vU.y,vU.x);float st=.75+.25*sin(a*9.+t*.6)*sin(a*5.-t*.4);float g=smoothstep(.985,1.0,d)*(exp(-(d-1.)*7.)*1.6+exp(-(d-1.)*1.6)*.35*st);gl_FragColor=vec4(c*g*k,g*k);}"});
  const p=new THREE.Mesh(new THREE.PlaneGeometry(r*8,r*8),m);p.ayar=(t,k)=>{m.uniforms.t.value=t;m.uniforms.k.value=k};return p}
// Dünya (doku + bulut + atmosfer + buz)
const DOK={};function dok(){if(!DOK.d){DOK.d=tex("doku/dunya.jpg");DOK.s=tex("doku/dunya_parlak.png",false);DOK.b=tex("doku/bulut.png",false);DOK.j=tex("doku/jupiter.jpg");DOK.i=tex("doku/dunya_buz.jpg")}return DOK}
function dunya(r=1){const D=dok();const g=new THREE.Group();
  const m=new THREE.MeshPhongMaterial({map:D.d,specularMap:D.s,specular:L("#2c3e55"),shininess:30});const e=new THREE.Mesh(new THREE.SphereGeometry(r,96,64),m);g.add(e);
  const bm=new THREE.MeshLambertMaterial({color:0xffffff,alphaMap:D.b,transparent:true,depthWrite:false});const b=new THREE.Mesh(new THREE.SphereGeometry(r*1.012,96,64),bm);g.add(b);
  const im=new THREE.MeshPhongMaterial({map:D.i,color:L("#ffffff"),emissive:L("#4c8cff"),emissiveIntensity:0,transparent:true,opacity:0,shininess:12,specular:L("#334a66")});const buz=new THREE.Mesh(new THREE.SphereGeometry(r*1.006,96,64),im);g.add(buz);
  const am=new THREE.ShaderMaterial({uniforms:{k:{value:1},c:{value:L("#5fb4ff")}},side:THREE.BackSide,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,
   vertexShader:"varying vec3 vN,vV;void main(){vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}",
   fragmentShader:"uniform float k;uniform vec3 c;varying vec3 vN,vV;void main(){float f=pow(1.-abs(dot(vN,vV)),2.2);gl_FragColor=vec4(c*f*1.6*k,f*k);}"});
  const a=new THREE.Mesh(new THREE.SphereGeometry(r*1.09,64,48),am);g.add(a);
  g.ayar=(t,o={})=>{e.rotation.y=t*.08+(o.rot||0);b.rotation.y=t*.1+(o.rot||0);buz.rotation.y=e.rotation.y;im.opacity=o.buz||0;im.emissiveIntensity=(o.buz||0)*.12;bm.opacity=1-(o.buz||0)*.6;am.uniforms.k.value=o.atm!==undefined?o.atm:1};g.R=r;return g}
function jupiter(r=2){const D=dok();const g=new THREE.Group();const m=new THREE.MeshStandardMaterial({map:D.j,roughness:.9,metalness:0,emissive:L("#ffffff"),emissiveMap:D.j,emissiveIntensity:0});const s=new THREE.Mesh(new THREE.SphereGeometry(r,96,64),m);g.add(s);
  g.ayar=(t,parla)=>{s.rotation.y=t*.15;m.emissiveIntensity=parla||0};g.R=r;return g}
// basit telefon (yuvarlatılmış gövde + ekran dokusu)
function yuvarlakKutu(w,h,d,r){const s=new THREE.Shape();const x=-w/2,y=-h/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
  const g=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelThickness:d*.25,bevelSize:d*.2,bevelSegments:4,curveSegments:10});g.translate(0,0,-d/2);return g}
function ekranTex(){const c=document.createElement("canvas");c.width=256;c.height=512;const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;
  t.ciz=(k,yaz)=>{const x=c.getContext("2d");const g=x.createLinearGradient(0,0,0,512);g.addColorStop(0,"#0b1830");g.addColorStop(1,"#05080f");x.fillStyle=g;x.fillRect(0,0,256,512);
    x.strokeStyle="#cfe9ff";x.lineWidth=8;x.strokeRect(78,150,100,190);x.fillStyle="#cfe9ff";x.fillRect(108,134,40,16);
    const col=k<.2?"#ff5a3c":k<.6?"#f2c46b":"#4dffa0";x.fillStyle=col;const hh=174*k;x.fillRect(86,332-hh,84,hh);
    x.fillStyle="#f3f5fa";x.font='700 46px "Space Mono"';x.textAlign="center";x.fillText(yaz!==undefined?yaz:Math.round(k*100)+"%",128,410);t.needsUpdate=true};t.ciz(0);return t}
function telefon(o={}){const g=new THREE.Group();const gov=new THREE.Mesh(yuvarlakKutu(.72,1.5,.06,.1),std("#1d2129",.85,.32,{envMapIntensity:1.1}));g.add(gov);
  const et=o.tex||ekranTex();const ek=new THREE.Mesh(new THREE.PlaneGeometry(.66,1.42),new THREE.MeshBasicMaterial({map:et,toneMapped:false}));ek.position.z=.062;g.add(ek);
  const cam1=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,.02,20),std("#0a0a0c",.5,.2));cam1.rotation.x=Math.PI/2;cam1.position.set(-.2,.58,-.05);g.add(cam1);g.ekran=et;g.ekranMesh=ek;return g}
// güneş paneli (cam, çerçeve, hücre dokusu)
function hucreTex(){const c=document.createElement("canvas");c.width=c.height=256;const x=c.getContext("2d");const g=x.createLinearGradient(0,0,256,256);g.addColorStop(0,"#16264f");g.addColorStop(.5,"#0f1c3e");g.addColorStop(1,"#1a2c5c");x.fillStyle=g;x.fillRect(0,0,256,256);
  for(let i=0;i<1500;i++){x.fillStyle=`rgba(120,160,255,${Math.random()*.07})`;x.fillRect(Math.random()*256,Math.random()*256,2,2)}x.fillStyle="#b9c2d0";for(let i=0;i<40;i++)x.fillRect(0,3+i*6.4,256,.8);for(let b=0;b<10;b++)x.fillRect(10+b*26,0,2,256);return c}
let PTX=null;function panelTex(){if(PTX)return PTX;const c=document.createElement("canvas");c.width=528;c.height=1056;const x=c.getContext("2d");x.fillStyle="#d4d9e0";x.fillRect(0,0,528,1056);x.fillStyle="#0a1226";x.fillRect(6,6,516,1044);
  const h=hucreTex();for(let i=0;i<6;i++)for(let j=0;j<12;j++){const yy=j<6?10+j*85.5:30+j*85.5;x.drawImage(h,10+i*85.5,yy,83,83)}const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=8;PTX=t;return t}
function panel(w=1.13,h=2.28){const g=new THREE.Group();const fr=std("#b8bec8",.9,.3,{envMapIntensity:.9});const d=.035;
  const yuz=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),[fr,fr,fr,fr,new THREE.MeshPhysicalMaterial({map:panelTex(),roughness:.18,metalness:.1,clearcoat:1,clearcoatRoughness:.06,envMap:ENV,envMapIntensity:1.0}),std("#e9ecf0",0,.8)]);g.add(yuz);
  const t=.02;[[0,h/2,w,t],[0,-h/2,w,t],[w/2,0,t,h],[-w/2,0,t,h]].forEach(([x,y,a,b])=>{const m=new THREE.Mesh(new THREE.BoxGeometry(a+t,b+t,d*1.6),fr);m.position.set(x,y,0);g.add(m)});
  const jb=new THREE.Mesh(new THREE.BoxGeometry(.16,.1,.05),std("#15171b",.2,.6));jb.position.set(0,h*.38,-.045);g.add(jb);g.w=w;g.h=h;return g}
// zemin ızgarası (blueprint)
function izgara(sc,b=40,n=40,h="#6FE3FF",op=.12){const g=new THREE.GridHelper(b,n,L(h),L(h));g.material.transparent=true;g.material.opacity=op;g.material.depthWrite=false;sc.add(g);return g}
// AÇIK TEMA: sahneyi teknik çizim diline çevirir (düz tonlu malzeme + siyah kontur)
const GRAD=(()=>{const d=new Uint8Array([90,90,90,255,175,175,175,255,255,255,255,255]);const t=new THREE.DataTexture(d,3,1,THREE.RGBAFormat);t.minFilter=t.magFilter=THREE.NearestFilter;t.needsUpdate=true;return t})();
const MUR=L("#1b2233");const KAGIT="#f6f5f1";
function murekkep(sc){if(!T.acik||sc.userData.mur)return;sc.userData.mur=1;sc.background=new THREE.Color(KAGIT);if(sc.fog)sc.fog.color=new THREE.Color(KAGIT);
  sc.add(new THREE.HemisphereLight(L("#ffffff"),L("#c9ccd4"),.85));const ekle=[];
  sc.traverse(o=>{if(o.userData.kabuk)return;
    if(o.isMesh&&!o.isInstancedMesh){const m=o.material;if(Array.isArray(m)){kontur(o,ekle);return}
      if(m.isShaderMaterial){if(m.side===THREE.BackSide){o.visible=false;return}if(m.blending===THREE.AdditiveBlending)m.blending=THREE.NormalBlending;return}
      if(m.blending===THREE.AdditiveBlending){m.blending=THREE.NormalBlending;return}
      if(m.envMapIntensity!==undefined)m.envMapIntensity=Math.min(m.envMapIntensity,.5);
      if(m.alphaMap)return;kontur(o,ekle,(m.transmission>0||(m.transparent&&m.opacity<.5))?.35:1)}
    else if(o.isPoints&&o.material.blending===THREE.AdditiveBlending){o.material.blending=THREE.NormalBlending}
  });ekle.forEach(([p,c])=>p.add(c))}
function kontur(o,ekle,op=1){const g=o.geometry;if(!g)return;const t=g.type;
  if(/Sphere|Icosa|Lathe/.test(t)){const h=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:MUR,side:THREE.BackSide,transparent:op<1,opacity:op}));h.scale.setScalar(1.025);h.userData.kabuk=1;ekle.push([o,h])}
  if(!/Sphere|Icosa|Plane|Circle|Ring/.test(t)){const l=new THREE.LineSegments(new THREE.EdgesGeometry(g,28),new THREE.LineBasicMaterial({color:MUR,transparent:op<1,opacity:op}));ekle.push([o,l])}}
// bloom + ton eşleme zinciri
const RP=new THREE.RenderPass(new THREE.Scene(),cam());const BL=new THREE.UnrealBloomPass(new THREE.Vector2(W,H),.8,.5,.8);const AC=new THREE.ShaderPass(THREE.ACESFilmicToneMappingShader);AC.uniforms.exposure.value=.82;const GM=new THREE.ShaderPass(THREE.GammaCorrectionShader);
const CP=new THREE.EffectComposer(R);CP.addPass(RP);CP.addPass(BL);CP.addPass(AC);CP.addPass(GM);
function ciz(sn){if(T.acik){R.outputEncoding=THREE.sRGBEncoding;R.render(sn.sc,sn.c);return}RP.scene=sn.sc;RP.camera=sn.c;BL.strength=sn.bl[0];BL.radius=sn.bl[1];BL.threshold=sn.bl[2];AC.uniforms.exposure.value=sn.exp||.82;CP.render()}
window.M={T,TR,murekkep,halka,dyazi,R,ENV,L,V3,cl,sm,lerp,eio,eo,eob,rnd,tex,std,emi,bas,cam,orb,GT,spr,pts,isik,uzay,yazi,cizgi,serit,olcu,gunes,dunya,jupiter,telefon,ekranTex,yuvarlakKutu,panel,izgara,ciz,W,H,ASP};
})();
