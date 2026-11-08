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

/* ======================= SAHNELER ======================= */
const S={};
// 0) KUM → PANEL (açılış ve kapanış)
S.hero=(()=>{const sc=new THREE.Scene();sc.background=L("#04060c");sc.fog=new THREE.FogExp2(L("#04060c"),.06);const c=cam();
  zemin(sc,"#0a0d14",30,.4);isik(sc);
  const N=YATAY?18000:16000,p=pts(N,.028,false);p.material.blending=THREE.NormalBlending;p.material.alphaTest=.3;p.material.transparent=false;sc.add(p);
  const A=new Float32Array(N*3),B=new Float32Array(N*3),CA=new Float32Array(N*3),CB=new Float32Array(N*3),D=new Float32Array(N);
  const pw=1.0,ph=1.7,tilt=-.22;
  for(let i=0;i<N;i++){const r=1.1*Math.sqrt(rnd()),a=rnd()*6.283,hh=(1-r/1.1)*.55*rnd();A.set([Math.cos(a)*r,hh+.01,Math.sin(a)*r],i*3);
    const s=new THREE.Color(L(["#d9bd8c","#c9a774","#e8d3a8","#b08d5e"][i%4]));CA.set([s.r,s.g,s.b],i*3);
    let x=(rnd()-.5)*pw,y=(rnd()-.5)*ph,k;const ex=Math.min(Math.abs(Math.abs(x)-pw/2),Math.abs(Math.abs(y)-ph/2));
    const cx=((x+pw/2)/pw*6)%1,cy=((y+ph/2)/ph*10)%1;
    if(i%9===0){const e=rnd()*4|0;x=e<2?(e?1:-1)*pw/2:(rnd()-.5)*pw;y=e>=2?(e===2?1:-1)*ph/2:(rnd()-.5)*ph;k=L("#d8dee8")}
    else if(cx<.035||cx>.965||cy<.03||cy>.97)k=L("#9aa6b8");else k=new THREE.Color(L("#1b3f9a")).lerp(L("#2f63d6"),rnd()*.6);
    const yy=y*Math.cos(tilt),zz=y*Math.sin(tilt);B.set([x,1.05+yy,zz],i*3);CB.set([k.r,k.g,k.b],i*3);D[i]=rnd()}
  const gl=spr("#9fd8ff",.9,0);sc.add(gl);const sun=spr("#ffd28a",4,.0);sun.position.set(2,3,-3);sc.add(sun);
  const P=p.geometry.attributes.position.array,C=p.geometry.attributes.color.array;
  return{sc,c,bl:[0.42,.5,0.87],kur(u,t,son){const q=son?1:u;
    for(let i=0;i<N;i++){const d=D[i]*.4,k=eio(cl((q-.1-d)/.45));const sw=(1-k)*k*4*(2.2+D[i]*2);const ax=A[i*3],az=A[i*3+2],bx=B[i*3],bz=B[i*3+2];
      let x=lerp(ax,bx,k),y=lerp(A[i*3+1],B[i*3+1],k)+Math.sin(k*3.14)*.35*D[i],z=lerp(az,bz,k);const an=sw*.9;const cs=Math.cos(an),sn=Math.sin(an);
      P[i*3]=x*cs-z*sn;P[i*3+1]=y;P[i*3+2]=x*sn+z*cs;const kc=sm(.3,.9,k);for(let j=0;j<3;j++)C[i*3+j]=lerp(CA[i*3+j],CB[i*3+j],kc)}
    p.geometry.attributes.position.needsUpdate=true;p.geometry.attributes.color.needsUpdate=true;
    const g=son?(t*.25)%1:sm(.7,1,u);gl.material.opacity=son?.6:sm(.75,.85,u)*.7;gl.position.set(-.6+1.2*((t*.35)%1),1.05+Math.sin(t)*.4,.15);
    sun.material.opacity=son?.9:sm(.6,1,u)*.6;
    const yaw=son?lerp(1.3,1.75,u):lerp(1.05,1.6,u),d=son?lerp(3.6,3.0,u):lerp(3.8,3.1,eio(u));orb(c,V3(0,son?1.0:lerp(.45,1.0,sm(0,.6,u)),0),d*(YATAY?1.15:1),yaw,lerp(.32,.12,sm(0,.8,u)))}}})();
// 1) KUVARS
S.kuvars=(()=>{const sc=new THREE.Scene();sc.background=L("#05070c");sc.fog=new THREE.FogExp2(L("#05070c"),.05);const c=cam();zemin(sc,"#0b0d12",30,.6);isik(sc,"#fff2dc",2.4,"#6FE3FF",2.2);
  const rg=new THREE.IcosahedronGeometry(1.25,4);const pa=rg.attributes.position;for(let i=0;i<pa.count;i++){const v=V3(pa.getX(i),pa.getY(i),pa.getZ(i));const n=1+.12*Math.sin(v.x*5+v.z*3)+.07*Math.sin(v.y*9+v.x*4);v.multiplyScalar(n);pa.setXYZ(i,v.x,v.y*.45,v.z)}rg.computeVertexNormals();
  const rock=new THREE.Mesh(rg,std("#3b3631",0,.92));rock.position.y=.25;sc.add(rock);
  const qm=new THREE.MeshPhysicalMaterial({color:L("#f3f7ff"),metalness:0,roughness:.05,transmission:.9,transparent:true,envMap:ENV,envMapIntensity:2.2,clearcoat:1,clearcoatRoughness:.05});
  const kg=new THREE.Group();sc.add(kg);
  for(let i=0;i<19;i++){const r=.07+rnd()*.13,h=.5+rnd()*1.3;const g=new THREE.Group();const b=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,6),qm);b.position.y=h/2;const tp=new THREE.Mesh(new THREE.ConeGeometry(r,r*1.9,6),qm);tp.position.y=h+r*.95;g.add(b,tp);
    const a=rnd()*6.283,rr=rnd()*.65;g.position.set(Math.cos(a)*rr,.55,Math.sin(a)*rr);g.rotation.set((rnd()-.5)*1.1,rnd()*6,(rnd()-.5)*1.1);g.userData.h=h;kg.add(g)}
  const du=pts(500,.03);sc.add(du);const DP=du.geometry.attributes.position.array,DC=du.geometry.attributes.color.array;for(let i=0;i<500;i++){DP.set([(rnd()-.5)*8,rnd()*4,(rnd()-.5)*8],i*3);DC.set([.4,.5,.6],i*3)}
  const fl=spr("#bfefff",2.5,.25);fl.position.set(0,1.6,0);sc.add(fl);
  return{sc,c,bl:[0.33,.4,0.92],kur(u,t){kg.children.forEach((g,i)=>{const k=eio(sm(i*.025,.35+i*.025,u));g.scale.setScalar(.001+k)});du.rotation.y=t*.05;
    orb(c,V3(0,.9,0),lerp(4.6,3.2,eio(u))*(YATAY?1.2:1),lerp(.5,1.7,u),lerp(.42,.22,u))}}})();
// 2) ARK FIRINI
S.firin=(()=>{const sc=new THREE.Scene();sc.background=L("#070403");sc.fog=new THREE.FogExp2(L("#120804"),.07);const c=cam();zemin(sc,"#100c0a",30,.7);isik(sc,"#ffd9b0",1.2,"#ff7a2a",1.6);
  const sh=new THREE.Mesh(new THREE.CylinderGeometry(2.1,2.25,1.3,64,1,true),std("#2b2f36",.75,.45,{side:THREE.DoubleSide}));sh.position.y=.65;sc.add(sh);
  const lip=new THREE.Mesh(new THREE.TorusGeometry(2.1,.09,12,80),std("#43484f",.8,.4));lip.rotation.x=Math.PI/2;lip.position.y=1.3;sc.add(lip);
  const mm=emi("#ff6a10",1.8);const melt=new THREE.Mesh(new THREE.CircleGeometry(2.0,64),mm);melt.rotation.x=-Math.PI/2;melt.position.y=1.05;sc.add(melt);
  const pl=new THREE.PointLight(L("#ff8a3a"),8,14,1.6);pl.position.set(0,2,0);sc.add(pl);
  const E=[];for(let i=0;i<3;i++){const a=i/3*6.283+.5;const e=new THREE.Mesh(new THREE.CylinderGeometry(.28,.28,5,32),std("#3e3e42",.35,.55));e.position.set(Math.cos(a)*.85,0,Math.sin(a)*.85);sc.add(e);
    const g=spr("#fff0c8",1.6,1);sc.add(g);E.push({e,g,a})}
  const hood=new THREE.Mesh(new THREE.CylinderGeometry(1.6,2.4,.6,48,1,true),std("#22262c",.8,.5,{side:THREE.DoubleSide}));hood.position.y=4.6;sc.add(hood);
  const NS=900,sp=pts(NS,.06);sc.add(sp);const SP=sp.geometry.attributes.position.array,SC=sp.geometry.attributes.color.array;const SD=[];for(let i=0;i<NS;i++)SD.push([rnd()*6.283,rnd()*1.6,rnd(),.6+rnd()*1.4,rnd()]);
  return{sc,c,bl:[0.66,.55,0.72],kur(u,t){mm.emissiveIntensity=1.8+Math.sin(t*23)*.25+Math.sin(t*7)*.2;pl.intensity=8+Math.sin(t*31)*1.5;
    const ey=lerp(3.9,3.55,eio(sm(0,.5,u)));E.forEach((o,i)=>{o.e.position.y=ey;o.g.position.set(o.e.position.x,ey-2.5,o.e.position.z);o.g.scale.setScalar(1.3+Math.abs(Math.sin(t*40+i*2))*1.4)});
    for(let i=0;i<NS;i++){const[a,r,ph,v,ss]=SD[i];const tau=((t*.7+ph)%1);const x=Math.cos(a)*r*(1+tau*.6),z=Math.sin(a)*r*(1+tau*.6),y=1.1+v*tau*2.4-2.2*tau*tau;SP.set([x,y,z],i*3);const f=(1-tau);SC.set([f*1.5,f*.7*(.6+ss*.4),f*.15],i*3)}
    sp.geometry.attributes.position.needsUpdate=true;sp.geometry.attributes.color.needsUpdate=true;
    orb(c,V3(0,1.5,0),lerp(7.4,5.2,eio(u))*(YATAY?1.15:1),lerp(.3,1.1,u),lerp(.28,.42,u))},veri(u){return`≈${(Math.round(2000*eio(sm(0,.7,u))/10)*10).toLocaleString("tr-TR")} °C<small>ARK FIRINI</small>`}}})();
// 3) SİEMENS ARITMA
S.siemens=(()=>{const sc=new THREE.Scene();sc.background=L("#05070d");sc.fog=new THREE.FogExp2(L("#05070d"),.05);const c=cam();zemin(sc,"#0b0e15",30,.5);isik(sc,"#ffffff",1.6,"#6FE3FF",1.6);
  const base=new THREE.Mesh(new THREE.CylinderGeometry(1.9,1.9,.2,64),std("#5a616c",.9,.3));base.position.y=.1;sc.add(base);
  const jm=new THREE.MeshPhysicalMaterial({color:L("#dfefff"),roughness:.08,transmission:.92,transparent:true,envMap:ENV,envMapIntensity:.7,side:THREE.DoubleSide});
  const jar=new THREE.Mesh(new THREE.CylinderGeometry(1.7,1.7,2.6,64,1,true),jm);jar.position.y=1.5;sc.add(jar);const dome=new THREE.Mesh(new THREE.SphereGeometry(1.7,64,24,0,6.283,0,Math.PI/2),jm);dome.position.y=2.8;sc.add(dome);
  const rm=emi("#ff9a3a",1.6);const rods=[];for(let i=0;i<6;i++){const a=i/6*6.283,b=a+.42,R=1.0;const g=new THREE.Group();
    const v1=new THREE.Mesh(new THREE.CylinderGeometry(1,1,2.2,16),rm),v2=v1.clone();v1.position.set(Math.cos(a)*R,1.3,Math.sin(a)*R);v2.position.set(Math.cos(b)*R,1.3,Math.sin(b)*R);
    const br=new THREE.Mesh(new THREE.CylinderGeometry(1,1,1,16),rm);br.position.set((v1.position.x+v2.position.x)/2,2.4,(v1.position.z+v2.position.z)/2);br.lookAt(v2.position.x,2.4,v2.position.z);br.rotateX(Math.PI/2);br.scale.y=v1.position.distanceTo(v2.position);
    g.add(v1,v2,br);sc.add(g);rods.push([v1,v2,br])}
  const pl=new THREE.PointLight(L("#ffb466"),5,8,1.5);pl.position.set(0,1.4,0);sc.add(pl);
  const NG=1200,gp=pts(NG,.045);sc.add(gp);const GP=gp.geometry.attributes.position.array,GC=gp.geometry.attributes.color.array;const GD=[];for(let i=0;i<NG;i++)GD.push([rnd()*6.283,rnd(),rnd()]);
  return{sc,c,bl:[0.57,.5,0.74],kur(u,t){const r=lerp(.035,.11,eio(u));rods.forEach(([a,b,br])=>{a.scale.x=a.scale.z=r;b.scale.x=b.scale.z=r;br.scale.x=br.scale.z=r});rm.emissiveIntensity=1.6+Math.sin(t*5)*.15;
    for(let i=0;i<NG;i++){const[a,ph,s]=GD[i];const k=(t*.35+ph)%1;const rr=1.4*(1-k)+.9*k;const an=a+k*3;GP.set([Math.cos(an)*rr,.25+k*2.8,Math.sin(an)*rr],i*3);const f=Math.sin(k*3.14);GC.set([.25*f,.65*f,1*f],i*3)}
    gp.geometry.attributes.position.needsUpdate=true;gp.geometry.attributes.color.needsUpdate=true;
    orb(c,V3(0,1.6,0),lerp(6.2,4.4,eio(u))*(YATAY?1.15:1),lerp(-.4,.7,u),lerp(.35,.18,u))},
    veri(u){const s=["98 %","99,9 %","99,99 %","99,999 %","99,9999 %"];return`${s[Math.min(4,Math.floor(sm(0,.85,u)*5))]}<small>SAFLIK · POLİSİLİSYUM</small>`}}})();
// 4) KRİSTAL KÜTÜK (Czochralski)
S.kutuk=(()=>{const sc=new THREE.Scene();sc.background=L("#05060b");sc.fog=new THREE.FogExp2(L("#05060b"),.045);const c=cam();zemin(sc,"#0b0d13",30,.5);isik(sc,"#ffffff",1.8,"#6FE3FF",1.8);
  const sus=new THREE.Mesh(new THREE.CylinderGeometry(1.55,1.35,1.2,64,1,true),std("#26282d",.4,.6,{side:THREE.DoubleSide}));sus.position.y=.6;sc.add(sus);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.7,.12,16,80),emi("#ff5a1a",2.2));ring.rotation.x=Math.PI/2;ring.position.y=.5;sc.add(ring);
  const mm=emi("#ff8a2a",1.5);const melt=new THREE.Mesh(new THREE.CircleGeometry(1.45,64),mm);melt.rotation.x=-Math.PI/2;melt.position.y=1.0;sc.add(melt);
  const pl=new THREE.PointLight(L("#ff9a4a"),6,10,1.6);pl.position.set(0,1.6,0);sc.add(pl);
  const im=std("#a7afb9",1,.16,{envMapIntensity:1.6});let ing=new THREE.Mesh(new THREE.BufferGeometry(),im);sc.add(ing);
  const cab=new THREE.Mesh(new THREE.CylinderGeometry(.015,.015,12,8),std("#c0c6cf",1,.3));sc.add(cab);
  const men=spr("#ffd9a0",2.2,.9);sc.add(men);
  let top=0;function prof(u){const Rb=.72,body=lerp(.0,3.1,sm(.22,1,u)),sh=lerp(0,.55,sm(.08,.25,u)),neck=.45*sm(0,.08,u)+.05;
    const p=[];p.push(new THREE.Vector2(0,0),new THREE.Vector2(Rb*(sh>0?1:.1),0),new THREE.Vector2(Rb*(sh>0?1:.1),body));
    for(let i=1;i<=8;i++){const k=i/8;p.push(new THREE.Vector2(lerp(Rb*(sh>.02?1:.1),.05,Math.pow(k,.7)),body+sh*k))}
    p.push(new THREE.Vector2(.05,body+sh+neck),new THREE.Vector2(.04,body+sh+neck+.25),new THREE.Vector2(0,body+sh+neck+.25));top=body+sh+neck+.25;return p}
  return{sc,c,bl:[0.54,.5,0.77],kur(u,t){ing.geometry.dispose();ing.geometry=new THREE.LatheGeometry(prof(u),72);ing.position.y=1.0;ing.rotation.y=t*.8;
    cab.position.y=1.0+top+6;men.position.y=1.03;men.scale.setScalar(1.6+Math.sin(t*9)*.1);mm.emissiveIntensity=1.5+Math.sin(t*13)*.15;
    const ty=1.0+lerp(.6,top*.55,sm(0,1,u));orb(c,V3(0,ty,0),lerp(4.6,5.6,u)*(YATAY?1.2:1),.8+t*.12,lerp(.12,.05,u))},veri(u){return`1.414 °C<small>SİLİSYUM ERİME NOKTASI</small>`}}})();
// 5) DİLİMLEME
S.dilim=(()=>{const sc=new THREE.Scene();sc.background=L("#05070c");sc.fog=new THREE.FogExp2(L("#05070c"),.05);const c=cam();zemin(sc,"#0b0e15",30,.45);isik(sc,"#ffffff",2.2,"#6FE3FF",2.0);
  const s=.46,ch=.12,sh=new THREE.Shape();sh.moveTo(-s+ch,-s);sh.lineTo(s-ch,-s);sh.lineTo(s,-s+ch);sh.lineTo(s,s-ch);sh.lineTo(s-ch,s);sh.lineTo(-s+ch,s);sh.lineTo(-s,s-ch);sh.lineTo(-s,-s+ch);sh.closePath();
  const bm=std("#5e6672",.95,.25,{envMapIntensity:1.5});const brick=new THREE.Mesh(new THREE.ExtrudeGeometry(sh,{depth:3,bevelEnabled:false}),bm);brick.rotation.y=Math.PI/2;brick.position.set(-1.5,.55,0);sc.add(brick);
  const cyl=new THREE.Mesh(new THREE.CylinderGeometry(.6,.6,3,64,1,true),std("#a7afb9",1,.18,{transparent:true,opacity:1,side:THREE.DoubleSide}));cyl.rotation.z=Math.PI/2;cyl.position.y=.55;sc.add(cyl);
  const NW=56,wm=std("#d9c39a",1,.25);const wires=new THREE.InstancedMesh(new THREE.BoxGeometry(.006,.006,2.4),wm,NW);sc.add(wires);
  const rol=[];for(const z of[-1.05,1.05]){const r=new THREE.Mesh(new THREE.CylinderGeometry(.16,.16,3.4,32),std("#2c3038",.6,.4));r.rotation.z=Math.PI/2;r.position.set(0,1.35,z);sc.add(r);rol.push(r)}
  const NWf=44,wg=new THREE.ExtrudeGeometry(sh,{depth:.012,bevelEnabled:false});const wf=new THREE.InstancedMesh(wg,std("#6d7684",.95,.22,{envMapIntensity:1.6}),NWf);sc.add(wf);
  const M=new THREE.Matrix4(),Qt=new THREE.Quaternion(),E=new THREE.Euler(),Sc=V3(1,1,1);
  return{sc,c,bl:[0.30,.4,0.96],kur(u,t){const a=sm(0,.18,u);cyl.material.opacity=1-a;cyl.visible=a<.99;cyl.scale.set(1,1,1);
    const cut=sm(.18,.58,u),sep=sm(.6,.95,u);brick.visible=sep<.02;
    for(let i=0;i<NW;i++){const x=-1.47+i*(2.94/(NW-1));E.set(0,0,0);M.compose(V3(x,lerp(1.2,-.1,cut),0),Qt.setFromEuler(E),V3(1,(u>.6?0:1),1));wires.setMatrixAt(i,M)}wires.instanceMatrix.needsUpdate=true;
    rol.forEach(r=>r.rotation.x=t*6);wm.emissive=L("#3a2a10");
    wf.visible=sep>=.02;for(let i=0;i<NWf;i++){const k=i/(NWf-1);const x=lerp(-1.5+k*3,(k-.5)*5.2,sep);const fan=sep*(k-.5)*1.3;E.set(fan*.4,Math.PI/2,0);
      const y=.55+sep*Math.sin(k*3.14)*.5;M.compose(V3(x,y,0),Qt.setFromEuler(E),Sc);wf.setMatrixAt(i,M)}wf.instanceMatrix.needsUpdate=true;
    orb(c,V3(0,.6,0),lerp(4.8,4.0,u)*(YATAY?1.25:1),lerp(1.15,.55,u),lerp(.42,.22,u))},veri(u){return u>.55?`0,15 mm<small>WAFER KALINLIĞI</small>`:`ELMAS TEL<small>DİLİMLEME</small>`}}})();
// 6) HÜCRE
S.hucre=(()=>{const sc=new THREE.Scene();sc.background=L("#04060b");sc.fog=new THREE.FogExp2(L("#04060b"),.05);const c=cam();zemin(sc,"#090c12",30,.45);isik(sc,"#ffffff",2.4,"#6FE3FF",2.0);
  const g=new THREE.Group();sc.add(g);const s=1,ch=.22,sh=new THREE.Shape();sh.moveTo(-s+ch,-s);sh.lineTo(s-ch,-s);sh.lineTo(s,-s+ch);sh.lineTo(s,s-ch);sh.lineTo(s-ch,s);sh.lineTo(-s+ch,s);sh.lineTo(-s,s-ch);sh.lineTo(-s,-s+ch);sh.closePath();
  const body=new THREE.Mesh(new THREE.ExtrudeGeometry(sh,{depth:.03,bevelEnabled:false}),std("#6d7684",.9,.3));body.rotation.x=-Math.PI/2;g.add(body);
  const pA=new THREE.Plane(V3(-1,0,0),0),pB=new THREE.Plane(V3(1,0,0),0),pC=new THREE.Plane(V3(-1,0,0),0);
  const sg=new THREE.ShapeGeometry(sh);const gray=new THREE.Mesh(sg,std("#8b929c",.85,.38,{clippingPlanes:[pB]}));gray.rotation.x=-Math.PI/2;gray.position.y=.031;g.add(gray);
  const blue=new THREE.Mesh(sg,std("#163376",.25,.22,{clippingPlanes:[pA],envMapIntensity:1.4}));blue.rotation.x=-Math.PI/2;blue.position.y=.0315;g.add(blue);
  const fm=std("#e2e7ef",1,.2);const NF=40,fing=new THREE.InstancedMesh(new THREE.BoxGeometry(2,.006,.012),fm,NF);fing.position.y=.035;g.add(fing);
  const bb=new THREE.InstancedMesh(new THREE.BoxGeometry(.03,.008,2),fm,9);bb.position.y=.036;g.add(bb);
  const sq=new THREE.Mesh(new THREE.BoxGeometry(2.4,.12,.06),std("#c8ccd2",.8,.3));g.add(sq);
  const NP=576,pyr=new THREE.InstancedMesh(new THREE.ConeGeometry(.026,.04,4),std("#9aa2ad",1,.15,{envMapIntensity:2}),NP);g.add(pyr);
  const dp=pts(700,.05);g.add(dp);const DP=dp.geometry.attributes.position.array,DC=dp.geometry.attributes.color.array;const DD=[];for(let i=0;i<700;i++)DD.push([(rnd()-.5)*2,(rnd()-.5)*2,rnd()]);
  const M=new THREE.Matrix4(),Qt=new THREE.Quaternion(),Sc=V3(1,1,1);
  return{sc,c,bl:[0.33,.45,0.94],kur(u,t){const tx=sm(0,.2,u),dop=sm(.2,.42,u),ar=sm(.42,.62,u),pr=sm(.62,.9,u);
    for(let i=0;i<NP;i++){const x=-.5+(i%24)/23,z=-.5+Math.floor(i/24)/23;const sc_=Math.max(.001,tx*(1-sm(.22,.32,u)));M.compose(V3(x*.9+.35,.03+.02*sc_,z*.9+.35),Qt.set(0,0,0,1),V3(sc_,sc_,sc_));pyr.setMatrixAt(i,M)}pyr.instanceMatrix.needsUpdate=true;
    for(let i=0;i<700;i++){const[x,z,ph]=DD[i];const k=(t*.8+ph)%1;const on=dop>0&&dop<1?1:0;DP.set([x*.95,.05+(1-k)*1.4,z*.95],i*3);DC.set([.55*on*(1-k*.5),.3*on,1*on],i*3)}dp.geometry.attributes.position.needsUpdate=true;dp.geometry.attributes.color.needsUpdate=true;
    const xs=lerp(-1.05,1.05,ar);pA.constant=xs;pB.constant=-xs;pA.normal.set(-1,0,0);pB.normal.set(1,0,0);
    // klip düzlemleri dünya koordinatında: g döndüğünde de x ekseni ile hizalı kalsın diye g'yi sadece Y'de çeviriyoruz ve süpürmeyi sahne x'ine göre yapıyoruz
    const zs=lerp(-1.1,1.1,pr);sq.position.set(0,.09,zs);sq.visible=pr>0&&pr<1;
    for(let i=0;i<NF;i++){const z=-.975+i*(1.95/(NF-1));const on=z<zs?1:0.001;M.compose(V3(0,0,z),Qt.set(0,0,0,1),V3(on,1,1));fing.setMatrixAt(i,M)}fing.instanceMatrix.needsUpdate=true;
    for(let i=0;i<9;i++){const x=-.88+i*.22;const k=sm(.8,.95,u);M.compose(V3(x,0,0),Qt.set(0,0,0,1),V3(1,1,Math.max(.001,k)));bb.setMatrixAt(i,M)}bb.instanceMatrix.needsUpdate=true;
    g.rotation.x=lerp(0,-.35,sm(.9,1,u));g.position.y=.3+sm(.9,1,u)*.6;
    const d=u<.2?lerp(1.1,1.7,sm(0,.2,u)):lerp(3.4,2.9,sm(.2,1,u));orb(c,u<.2?V3(.35,0,.35):V3(0,.25,0),d*(YATAY?1.15:1),lerp(.95,1.35,u),u<.2?.6:lerp(.95,.55,sm(.2,1,u)))},
    veri(u){return u<.2?`PİRAMİT DOKU<small>IŞIK TUZAĞI</small>`:u<.42?`P-N EKLEMİ<small>KATKILAMA</small>`:u<.62?`YANSIMA ÖNLEYİCİ<small>MAVİ KAPLAMA</small>`:`GÜMÜŞ ÇİZGİLER<small>AKIM TOPLAYICI</small>`}}})();
// 7) PANEL
S.panel=(()=>{const sc=new THREE.Scene();sc.background=L("#05070c");sc.fog=new THREE.FogExp2(L("#05070c"),.05);const c=cam();zemin(sc,"#0a0d13",30,.45);const[k1]=isik(sc,"#ffffff",2.2,"#6FE3FF",1.8);
  const g=new THREE.Group();sc.add(g);const cw=.2,gap=.012,NX=6,NY=10,PW=NX*(cw+gap)+.06,PH=NY*(cw+gap)+.06;
  const back=new THREE.Mesh(new THREE.BoxGeometry(PW,.012,PH),std("#e9ecef",0,.6));back.position.y=-.01;g.add(back);
  const cm=std("#ffffff",.3,.28,{map:HT,envMapIntensity:1.2});const cells=new THREE.InstancedMesh(new THREE.BoxGeometry(cw,.006,cw),cm,NX*NY);g.add(cells);
  const rb=new THREE.InstancedMesh(new THREE.BoxGeometry(.012,.004,PH-.08),std("#d7dde6",1,.25),NX*2);g.add(rb);
  const glass=new THREE.Mesh(new THREE.BoxGeometry(PW,.02,PH),new THREE.MeshPhysicalMaterial({color:L("#eaf6ff"),roughness:.03,transmission:.95,transparent:true,envMap:ENV,envMapIntensity:2,clearcoat:1}));g.add(glass);
  const am=std("#b8c0ca",1,.28);const fr=[];[[PW+.06,.06,.05,0,-(PH/2+.02)],[PW+.06,.06,.05,0,(PH/2+.02)],[.05,.06,PH+.06,-(PW/2+.02),0],[.05,.06,PH+.06,(PW/2+.02),0]].forEach(([a,b,cc,x,z])=>{const m=new THREE.Mesh(new THREE.BoxGeometry(a,b,cc),am);m.userData.p=V3(x,.01,z);g.add(m);fr.push(m)});
  const jb=new THREE.Mesh(new THREE.BoxGeometry(.22,.05,.14),std("#15171b",.2,.5));jb.position.set(0,-.04,-PH/2+.25);g.add(jb);
  const flash=new THREE.PointLight(L("#ffffff"),0,8);flash.position.set(0,3,2);sc.add(flash);
  const M=new THREE.Matrix4(),Qt=new THREE.Quaternion(),E=new THREE.Euler();
  return{sc,c,bl:[0.36,.45,0.94],kur(u,t){const lay=sm(0,.32,u),gl=sm(.32,.48,u),lam=sm(.48,.62,u),fram=sm(.62,.78,u),up=eio(sm(.78,.92,u)),tst=sm(.9,.94,u)*(1-sm(.95,1,u));
    for(let i=0;i<NX;i++)for(let j=0;j<NY;j++){const k=cl(lay*(NX+1)-i);const y=(1-eio(cl(k*1.4-j*.04)))*.8;const x=-PW/2+.03+cw/2+i*(cw+gap),z=-PH/2+.03+cw/2+j*(cw+gap);M.compose(V3(x,y,z),Qt.set(0,0,0,1),V3(1,1,1).multiplyScalar(k>0?1:.001));cells.setMatrixAt(i*NY+j,M)}cells.instanceMatrix.needsUpdate=true;
    for(let i=0;i<NX;i++)for(let r=0;r<2;r++){const k=cl(lay*(NX+1)-i-.6);const x=-PW/2+.03+cw/2+i*(cw+gap)+(r?.05:-.05);M.compose(V3(x,.006,0),Qt.set(0,0,0,1),V3(1,1,Math.max(.001,k)));rb.setMatrixAt(i*2+r,M)}rb.instanceMatrix.needsUpdate=true;
    glass.position.y=lerp(1.4,.015,eio(gl));glass.visible=gl>0;cm.emissive=L("#ff6a1a");cm.emissiveIntensity=Math.sin(lam*3.14)*.18;
    fr.forEach((m,i)=>{const o=m.userData.p;const d=(1-eio(fram))*1.2;m.position.set(o.x*(1+d*(o.x?1:0))+(o.x?Math.sign(o.x)*d:0),o.y,o.z+(o.z?Math.sign(o.z)*d:0));m.visible=fram>0});
    g.rotation.x=lerp(0,Math.PI/2-.25,up)*-1+0;g.rotation.x=-lerp(0,1.32,up);g.position.y=lerp(.25,1.35,up);flash.intensity=tst*12;
    const tgt=V3(0,lerp(.2,1.35,up),0);orb(c,tgt,lerp(3.6,3.3,u)*(YATAY?1.2:1),lerp(1.2,1.5,u),lerp(1.0,.12,up))},veri(u){return u>.9?`TEST ✓<small>GÜNEŞ SİMÜLATÖRÜ</small>`:u>.48&&u<.62?`LAMİNASYON<small>ISI + VAKUM</small>`:`6 × 10 HÜCRE<small>SERİ BAĞLANTI</small>`}}})();
// 8) NAKLİYE: palet → gemi → tır
S.nakliye=(()=>{const sc=new THREE.Scene();const c=cam();const sky=gok(sc,"#0e2a55","#d98a5a","#1a2238");sky.uniforms.sg.value=1;sky.uniforms.sd.value=V3(-.6,.08,-1).normalize();
  sc.fog=new THREE.Fog(L("#5b4a58"),60,420);isik(sc,"#ffd6b0",2.2,"#7aa8ff",1.2);
  // palet
  const pal=new THREE.Group();sc.add(pal);pal.position.set(0,0,200);const fl=new THREE.Mesh(new THREE.BoxGeometry(14,.1,14),std("#2a2d33",.3,.8));pal.add(fl);
  const pb=new THREE.Mesh(new THREE.BoxGeometry(2.3,.15,1.2),std("#a07a4e",0,.85));pb.position.y=.13;pal.add(pb);
  const NP=30,pm=std("#ffffff",.4,.3,{map:PT});const pans=[];for(let i=0;i<NP;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(2.2,.04,1.1),[std("#b8c0ca",1,.3),std("#b8c0ca",1,.3),pm,std("#e9ecef",0,.6),std("#b8c0ca",1,.3),std("#b8c0ca",1,.3)]);pal.add(m);pans.push(m)}
  const wrap=new THREE.Mesh(new THREE.BoxGeometry(2.36,1.5,1.2),new THREE.MeshPhysicalMaterial({color:L("#b28b5c"),roughness:.7,transparent:true,opacity:.0}));wrap.position.y=.95;pal.add(wrap);
  // deniz + gemi
  const sea=new THREE.Mesh(new THREE.PlaneGeometry(900,900,140,140),std("#0c2236",.35,.18,{envMapIntensity:1.2}));sea.rotation.x=-Math.PI/2;sc.add(sea);const SP=sea.geometry.attributes.position;const S0=Float32Array.from(SP.array);
  const ship=new THREE.Group();sc.add(ship);const hs=new THREE.Shape();hs.moveTo(-30,0);hs.lineTo(26,0);hs.quadraticCurveTo(34,0,36,6);hs.lineTo(-31,6);hs.closePath();
  const hull=new THREE.Mesh(new THREE.ExtrudeGeometry(hs,{depth:9,bevelEnabled:false}),[std("#1d2a3c",.4,.5),std("#7a1f22",.3,.6)]);hull.position.set(0,-2.5,-4.5);ship.add(hull);
  const br=new THREE.Mesh(new THREE.BoxGeometry(5,9,8),std("#e9eaec",.1,.5));br.position.set(-26,8,0);ship.add(br);
  const cols=["#c4512b","#1f5fa8","#d9a23a","#3b7a57","#8a8f99","#b33a3a"];const NCt=12*3*3;const ctn=new THREE.InstancedMesh(new THREE.BoxGeometry(4.8,2.5,2.4),std("#ffffff",.5,.55),NCt);ship.add(ctn);
  {const M=new THREE.Matrix4();let k=0;for(let i=0;i<12;i++)for(let j=0;j<3;j++)for(let l=0;l<3;l++){M.makeTranslation(-20+i*4.9,4.8+l*2.55,-2.6+j*2.6);ctn.setMatrixAt(k,M);ctn.setColorAt(k,L(cols[(i*7+j*3+l)%6]));k++}}
  // yol + tır
  const road=new THREE.Group();sc.add(road);road.position.set(0,0,-300);const gr=new THREE.Mesh(new THREE.PlaneGeometry(900,400),std("#8a6e4c",0,.95));gr.rotation.x=-Math.PI/2;gr.position.y=-.02;road.add(gr);
  const asf=new THREE.Mesh(new THREE.PlaneGeometry(900,9),std("#2a2c30",.1,.85));asf.rotation.x=-Math.PI/2;road.add(asf);
  const dash=new THREE.InstancedMesh(new THREE.PlaneGeometry(4,.25),std("#e8e2c8",0,.6),120);road.add(dash);{const M=new THREE.Matrix4();for(let i=0;i<120;i++){M.makeRotationX(-Math.PI/2);M.setPosition(-450+i*7.5,.01,0);dash.setMatrixAt(i,M)}}
  for(let i=0;i<14;i++){const m=new THREE.Mesh(new THREE.ConeGeometry(20+rnd()*30,15+rnd()*25,5),std("#6b5442",0,1));m.position.set(-300+i*50,0,-80-rnd()*60);road.add(m)}
  const tr=new THREE.Group();road.add(tr);const cab=new THREE.Mesh(new THREE.BoxGeometry(2.4,3,2.5),std("#c8302a",.5,.35));cab.position.set(7.4,2.2,1.9);tr.add(cab);
  const wsh=new THREE.Mesh(new THREE.BoxGeometry(.05,1.1,2.2),std("#1b2a3a",.9,.1));wsh.position.set(8.62,2.9,1.9);tr.add(wsh);
  const chs=new THREE.Mesh(new THREE.BoxGeometry(16,.5,2.4),std("#1d1f23",.6,.5));chs.position.set(0,1,1.9);tr.add(chs);
  const box=new THREE.Mesh(new THREE.BoxGeometry(12.2,2.6,2.45),std("#1f5fa8",.5,.5));box.position.set(-1.5,2.55,1.9);tr.add(box);
  const whs=[];for(const x of[-6,-4.6,4,7.6])for(const z of[.75,3.05]){const w=new THREE.Mesh(new THREE.CylinderGeometry(.55,.55,.4,24),std("#151618",.2,.8));w.rotation.x=Math.PI/2;w.position.set(x,.55,z);tr.add(w);whs.push(w)}
  const NM=new THREE.Matrix4();
  return{sc,c,bl:[0.30,.5,0.92],kur(u,t){const a=u<.34,b=u>=.34&&u<.67,cc=u>=.67;pal.visible=a;sea.visible=ship.visible=b;road.visible=cc;
    if(a){const k=u/.34;pans.forEach((m,i)=>{const kk=cl(k*1.25*NP/ NP*1.0*NP/NP*1.0*(1)+0)*0;const d=cl((k*1.15)*NP-i);m.position.set(0,.22+i*.043+(1-eio(cl(d)))*2.5,0);m.visible=d>0});wrap.material.opacity=sm(.85,1,k)*.85;
      orb(c,V3(0,.8,200),(YATAY?6.5:6.2),lerp(.6,1.2,k),lerp(.35,.25,k))}
    if(b){const k=(u-.34)/.33;for(let i=0;i<SP.count;i++){const x=S0[i*3],y=S0[i*3+1];SP.setZ(i,Math.sin(x*.05+t*1.2)*.5+Math.sin(y*.08+t*.9)*.35+Math.sin((x+y)*.2+t*2)*.12)}SP.needsUpdate=true;sea.geometry.computeVertexNormals();
      ship.position.set(lerp(-20,30,k),Math.sin(t*1.1)*.25,0);ship.rotation.z=Math.sin(t*.9)*.015;orb(c,V3(ship.position.x+4,4,0),YATAY?95:110,lerp(1.15,.8,k),lerp(.22,.12,k))}
    if(cc){const k=(u-.67)/.33;tr.position.x=lerp(-60,40,k);whs.forEach(w=>w.rotation.y=-t*8);orb(c,V3(tr.position.x+2,2.2,1.9-300),YATAY?22:26,lerp(.9,.3,k),lerp(.12,.1,k))}},
    veri(u){return u<.34?`PALET<small>KÖŞE KORUMA · SARGI</small>`:u<.67?`600+ PANEL<small>40 FİTLİK KONTEYNER</small>`:`SAHAYA<small>TIR İLE</small>`}}})();
// 9-10) SAHA: montaj ve üretim aynı sahayı paylaşır
function saha(uretim){const sc=new THREE.Scene();const c=cam();const sky=uretim?gok(sc,"#071433","#2a3b6a","#0d1a2e"):gok(sc,"#2a5fb0","#a9c6e6","#6a5a46");
  sc.fog=new THREE.Fog(uretim?L("#1a2440"):L("#8fa6bd"),160,700);const[k1,k2]=isik(sc,uretim?"#ffb070":"#fff4e2",uretim?.6:1.9,uretim?"#4a6aa8":"#9fc3ff",uretim?.6:.8);
  const gr=new THREE.Mesh(new THREE.PlaneGeometry(900,900),std(uretim?"#2e2a24":"#5d4c37",0,.95));gr.rotation.x=-Math.PI/2;sc.add(gr);
  const NR=6,NT=9,TL=8.2,TW=4.2,RS=11;const tables=[];for(let r=0;r<NR;r++)for(let t=0;t<NT;t++)tables.push({x:(t-(NT-1)/2)*(TL+1.2),z:(r-(NR-1)/2)*RS,r,t});
  const NPl=tables.length*4,piles=new THREE.InstancedMesh(new THREE.CylinderGeometry(.1,.1,2.4,10),std("#9aa3ad",.9,.35),NPl);sc.add(piles);
  const rails=new THREE.InstancedMesh(new THREE.BoxGeometry(TL,.12,.12),std("#b7bec7",.9,.3),tables.length*2);sc.add(rails);
  const pnl=new THREE.InstancedMesh(new THREE.BoxGeometry(1.0,.04,2.0),std("#9aa3ad",.9,.35),tables.length*8);sc.add(pnl);
  const pg=new THREE.PlaneGeometry(.98,1.98);pg.rotateX(-Math.PI/2);pg.translate(0,.021,0);const pnlT=new THREE.InstancedMesh(pg,std("#ffffff",.3,.16,{map:PT,envMapIntensity:1.2}),tables.length*8);sc.add(pnlT);
  const inv=new THREE.Mesh(new THREE.BoxGeometry(2.2,2.2,1.2),std("#e6e8eb",.3,.5));inv.position.set(-(NT/2)*(TL+1.2)-6,1.1,0);sc.add(inv);
  const trf=new THREE.Mesh(new THREE.BoxGeometry(3,3.2,2.6),std("#4b5a4a",.5,.5));trf.position.set(inv.position.x-9,1.6,0);sc.add(trf);
  const drv=new THREE.Group();const dm=new THREE.Mesh(new THREE.BoxGeometry(3,1.4,2),std("#e2a32b",.4,.5));dm.position.y=1;const ms=new THREE.Mesh(new THREE.BoxGeometry(.35,6,.35),std("#2d3036",.6,.5));ms.position.set(1.4,3.6,0);drv.add(dm,ms);sc.add(drv);
  const cabG=[];const cableL=new THREE.Group();sc.add(cableL);for(let r=0;r<NR;r++){const z=(r-(NR-1)/2)*RS-1.9;const p=[V3(-(NT/2)*(TL+1.2),.15,z),V3((NT/2)*(TL+1.2),.15,z)];cabG.push({a:p[0],b:p[1]});
    const m=new THREE.Mesh(new THREE.BoxGeometry(p[1].x-p[0].x,.06,.06),emi(uretim?"#2bd0ff":"#ff9a3a",uretim?1.5:1.2));m.position.set(0,.15,z);cableL.add(m)}
  const trunk=new THREE.Mesh(new THREE.BoxGeometry(.08,.06,RS*(NR-1)+4),emi(uretim?"#2bd0ff":"#ff9a3a",1.3));trunk.position.set(inv.position.x+3,.15,0);cableL.add(trunk);
  let sun,ph,el,city,towers;
  if(uretim){sun=spr("#ffcf8a",40,.9);sc.add(sun);ph=pts(900,.5);sc.add(ph);el=pts(700,.45);sc.add(el);
    city=new THREE.Group();sc.add(city);for(let i=0;i<70;i++){const h=6+rnd()*34,w=4+rnd()*6;const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,w),std("#141a26",.4,.6));b.position.set(-260+i*7.4,h/2,170+rnd()*60);b.userData.e=emi("#ffcf7a",0);const wn=new THREE.Mesh(new THREE.BoxGeometry(w*1.01,h*.9,w*1.01),b.userData.e);wn.position.copy(b.position);wn.scale.set(1,1,1);wn.material.transparent=true;wn.material.opacity=.0;city.add(b,wn)}
    towers=[];for(let i=0;i<6;i++){const tw=new THREE.Mesh(new THREE.CylinderGeometry(.3,2.2,26,4,1,true),new THREE.MeshBasicMaterial({color:L("#9aa3ad"),wireframe:true}));tw.position.set(inv.position.x-20-i*30,13,20+i*25);sc.add(tw);towers.push(tw)}}
  const M=new THREE.Matrix4(),Qt=new THREE.Quaternion(),E=new THREE.Euler();
  function kur(u,t){const pP=uretim?1:sm(0,.22,u),pR=uretim?1:sm(.2,.36,u),pN=uretim?1:sm(.34,.8,u),pC=uretim?1:sm(.8,.97,u);
    tables.forEach((tb,i)=>{const ord=(tb.r*NT+tb.t)/tables.length;
      const kp=cl(pP*1.25-ord);for(let j=0;j<4;j++){const x=tb.x-TL/2+.4+j*((TL-.8)/3);const drop=(1-eio(cl(kp*3)))*4;M.compose(V3(x,1.0+drop,tb.z),Qt.set(0,0,0,1),kp>0?V3(1,1,1):V3(.001,.001,.001));piles.setMatrixAt(i*4+j,M)}
      const kr=cl(pR*1.3-ord);for(let j=0;j<2;j++){M.compose(V3(tb.x,2.25,tb.z+(j?.9:-.9)),Qt.set(0,0,0,1),kr>0?V3(Math.max(.001,eio(cl(kr*3))),1,1):V3(.001,.001,.001));rails.setMatrixAt(i*2+j,M)}
      const kn=cl(pN*1.6-ord*.75);for(let j=0;j<8;j++){const x=tb.x-TL/2+.52+j*1.02;const kk=cl(kn*10-j);E.set(-.38,0,0);const y=2.55+(1-eio(kk))*1.2;M.compose(V3(x,y,tb.z),Qt.setFromEuler(E),kk>0?V3(1,1,1):V3(.001,.001,.001));pnl.setMatrixAt(i*8+j,M);pnlT.setMatrixAt(i*8+j,M)}});
    piles.instanceMatrix.needsUpdate=rails.instanceMatrix.needsUpdate=pnl.instanceMatrix.needsUpdate=pnlT.instanceMatrix.needsUpdate=true;
    cableL.children.forEach((m,i)=>{const k=cl(pC*1.3-i*.05);m.scale.x=Math.max(.001,k);m.visible=pC>0});
    drv.visible=!uretim&&pP<1;if(drv.visible){const i=Math.min(tables.length-1,Math.floor(pP*1.25*tables.length));const tb=tables[i];drv.position.set(tb.x,0,tb.z+2.2)}
    if(!uretim){const k=eio(u);orb(c,V3(lerp(-12,0,k),2,lerp(8,0,k)),lerp(34,72,k)*(YATAY?1.0:1.2),lerp(-.7,-1.15,k),lerp(.42,.66,k))}
    else{const k=u;const sa=lerp(-.08,.32,eio(sm(0,.55,k)));const sd=V3(-.35,Math.sin(sa),-1).normalize();sky.uniforms.sd.value=sd;sky.uniforms.sg.value=sm(0,.2,k);
      const day=sm(.05,.6,k);sky.uniforms.u.value=L("#071433").lerp(L("#2f63b0"),day);sky.uniforms.o.value=L("#2a3b6a").lerp(L("#f0a46c"),day*.9);k1.intensity=lerp(.4,2.4,day);k1.position.copy(sd.clone().multiplyScalar(30));
      sun.position.copy(sd.clone().multiplyScalar(500));sun.scale.setScalar(45+6*Math.sin(t*2));
      const PP=ph.geometry.attributes.position.array,PC=ph.geometry.attributes.color.array;for(let i=0;i<900;i++){const tb=tables[i%tables.length];const f=((t*.5+(i*.618)%1))%1;const tg=V3(tb.x+((i*7)%8-3.5),2.6,tb.z);const s=tg.clone().add(sd.clone().multiplyScalar(60));const p=s.lerp(tg,f);PP.set([p.x,p.y,p.z],i*3);const o=sm(.15,.4,k)*Math.sin(f*3.14);PC.set([1*o,.8*o,.35*o],i*3)}ph.geometry.attributes.position.needsUpdate=ph.geometry.attributes.color.needsUpdate=true;
      const EP=el.geometry.attributes.position.array,EC=el.geometry.attributes.color.array;const on=sm(.35,.55,k);for(let i=0;i<700;i++){const f=((t*.35+(i*.37)%1))%1;let p;if(i<420){const cg=cabG[i%NR];p=cg.b.clone().lerp(cg.a,f);p.y=.3}else{const tw=towers[(i%5)];const a=inv.position.clone();const b=V3(-200,20,150);p=a.lerp(b,f);p.y=2+f*18}EP.set([p.x,p.y,p.z],i*3);EC.set([.15*on,.8*on,1*on],i*3)}el.geometry.attributes.position.needsUpdate=el.geometry.attributes.color.needsUpdate=true;
      const cty=sm(.7,.9,k);city.children.forEach((b,i)=>{if(i%2)b.material.opacity=cty*.0+0;if(i%2===1){b.material.emissiveIntensity=cty*(.5+((i*13)%7)/7);b.material.opacity=cty*.55}});
      orb(c,V3(lerp(-6,-20,k),lerp(3,6,k),lerp(0,40,k)),lerp(24,85,eio(k))*(YATAY?1:1.2),lerp(-1.85,-1.45,k),lerp(.14,.24,k))}}
  return{sc,c,bl:uretim?[.7,.6,.85]:[.25,.4,.95],kur,veri:uretim?(u=>u<.35?`FOTON → ELEKTRON<small>HÜCREDE</small>`:u<.7?`DC → AC<small>İNVERTÖR</small>`:`ŞEBEKEYE<small>TRAFO · İLETİM HATTI</small>`):(u=>u<.3?`KAZIK<small>ÇELİK · ÇAKMA</small>`:u<.48?`KONSTRÜKSİYON<small>RAY · BAĞLANTI</small>`:u<.86?`PANEL MONTAJI<small>TEK TEK</small>`:`KABLOLAMA<small>DİZİ → İNVERTÖR</small>`)}}
S.montaj=saha(false);S.uretim=saha(true);
S.son={...S.hero,kur:(u,t)=>S.hero.kur(u,t,true),sc:S.hero.sc,c:S.hero.c,bl:S.hero.bl};

/* ======================= HUD ======================= */
const BAS={hero:["","KUMDAN ELEKTRİĞE","BİR GÜNEŞ PANELİNİN YOLCULUĞU"],kuvars:["01","KUVARS","HAMMADDE · SiO₂"],firin:["02","ARK FIRINI","METALURJİK SİLİSYUM"],siemens:["03","ARITMA","SİEMENS YÖNTEMİ · POLİSİLİSYUM"],
  kutuk:["04","KRİSTAL KÜTÜK","CZOCHRALSKİ YÖNTEMİ"],dilim:["05","DİLİMLEME","ELMAS TEL · WAFER"],hucre:["06","HÜCRE","DOKU · EKLEM · KAPLAMA · GÜMÜŞ"],panel:["07","PANEL","LEHİM · CAM · LAMİNASYON · ÇERÇEVE"],
  nakliye:["08","NAKLİYE","PALET · KONTEYNER · TIR"],montaj:["09","MONTAJ","KAZIK · KONSTRÜKSİYON · PANEL · KABLO"],uretim:["10","ELEKTRİK","FOTON → ELEKTRON → ŞEBEKE"],son:["","KUMDAN ELEKTRİĞE","25+ YIL · YAKITSIZ ÜRETİM"]};
const SIRA=["kuvars","firin","siemens","kutuk","dilim","hucre","panel","nakliye","montaj","uretim"];
const $=s=>document.getElementById(s);$("yol").innerHTML=SIRA.map(()=>"<i><s></s></i>").join("");
let sonBas="";function hud(ad,u,fl){const b=BAS[ad];if(sonBas!==ad){sonBas=ad;$("bn").textContent=b[0]?`ADIM ${b[0]} / 10`:"KOZMOS LAB · TEKNOLOJİ";$("bt").textContent=b[1];$("bs").textContent=b[2]}
  const gi=sm(0,.08,u);$("bas").style.opacity=gi;$("bas").style.transform=`translateY(${(1-gi)*2}vmin)`;
  const si=SIRA.indexOf(ad);[...$("yol").children].forEach((e,i)=>{e.className=(ad==="son"||i<si)?"done":"";e.firstChild.style.transform=i===si?`scaleX(${u})`:""});
  $("sayac").textContent=si>=0?`${String(si+1).padStart(2,"0")}/10`:"";const S_=S[ad];$("veri").innerHTML=S_.veri?S_.veri(u):"";$("veri").style.opacity=S_.veri?sm(.05,.15,u):0}

/* ======================= ZAMAN ÇİZELGESİ ======================= */
let K={sahneler:[{ad:"hero",bas:0,son:4},{ad:"kuvars",bas:4,son:8},{ad:"firin",bas:8,son:12},{ad:"siemens",bas:12,son:16},{ad:"kutuk",bas:16,son:20},{ad:"dilim",bas:20,son:24},{ad:"hucre",bas:24,son:28},{ad:"panel",bas:28,son:32},{ad:"nakliye",bas:32,son:38},{ad:"montaj",bas:38,son:42},{ad:"uretim",bas:42,son:47},{ad:"son",bas:47,son:51}],altyazi:[],gecis:"flas"};
const RP=new THREE.RenderPass(new THREE.Scene(),cam());const BL=new THREE.UnrealBloomPass(new THREE.Vector2(W,H),.8,.5,.8);const AC=new THREE.ShaderPass(THREE.ACESFilmicToneMappingShader);AC.uniforms.exposure.value=.78;const GM=new THREE.ShaderPass(THREE.GammaCorrectionShader);
const CP=new THREE.EffectComposer(R);CP.addPass(RP);CP.addPass(BL);CP.addPass(AC);CP.addPass(GM);
function kare(t){let i=K.sahneler.findIndex(s=>t>=s.bas&&t<s.son);if(i<0)i=t<K.sahneler[0].bas?0:K.sahneler.length-1;const s=K.sahneler[i];const u=cl((t-s.bas)/(s.son-s.bas));
  const sn=S[s.ad];sn.kur(u,t);RP.scene=sn.sc;RP.camera=sn.c;BL.strength=sn.bl[0];BL.radius=sn.bl[1];BL.threshold=sn.bl[2];CP.render();hud(s.ad,u);
  const a=K.altyazi.find(x=>t>=x.bas&&t<x.son);$("alt").innerHTML=a?`<span>${a.metin}</span>`:"";
  const dt=t-s.bas,rem=s.son-t;if(K.gecis==="flas"){$("flas").style.opacity=i>0&&dt<.12?(1-dt/.12)*.55:0;$("kara").style.opacity=0}else{$("flas").style.opacity=0;$("kara").style.opacity=Math.max(i>0?cl(1-dt/.35):0,i<K.sahneler.length-1?cl(1-rem/.35):0)}}
R.compile&&0;S.montaj.sc.traverse(o=>{if(o.isInstancedMesh)o.frustumCulled=false});S.uretim.sc.traverse(o=>{if(o.isInstancedMesh)o.frustumCulled=false});[S.panel,S.dilim,S.hucre,S.nakliye].forEach(x=>x.sc.traverse(o=>{if(o.isInstancedMesh)o.frustumCulled=false}));window.kurgu=k=>{K=k};window.kare=kare;window.HAZIR=true;
// kaydırma modu (sayfa olarak açılınca)
if(!Q.has("kayit")){const top=K.sahneler[K.sahneler.length-1].son;document.body.style.overflow="auto";const sp=document.createElement("div");sp.style.height=(top*45)+"vh";document.body.appendChild(sp);document.getElementById("c").style.position=document.getElementById("hud").style.position="fixed";
  let ts=0;const f=()=>{const hedef=scrollY/(document.body.scrollHeight-innerHeight)*top;ts+=(hedef-ts)*.12;kare(ts+(performance.now()/1000%1000)*0);requestAnimationFrame(f)};f()}
})();
