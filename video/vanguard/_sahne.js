/* ======================= SAHNELER: VANGUARD 1 (magazin) ======================= */
const S={};
function dunyaTex(){const c=document.createElement("canvas");c.width=2048;c.height=1024;const x=c.getContext("2d");const g=x.createLinearGradient(0,0,0,1024);g.addColorStop(0,"#0a2450");g.addColorStop(.5,"#0d3470");g.addColorStop(1,"#0a2450");x.fillStyle=g;x.fillRect(0,0,2048,1024);
  let sd=11;const r=()=>(sd=(sd*16807)%2147483647)/2147483647;
  const kit=[[300,330,1.2],[520,640,.9],[1050,300,1.5],[1100,600,1.0],[1550,380,1.3],[1700,720,.7],[820,180,.6]];
  kit.forEach(([cx,cy,s])=>{for(let k=0;k<70;k++){const a=r()*6.283,d=Math.pow(r(),.7)*160*s;const px=cx+Math.cos(a)*d*1.5,py=cy+Math.sin(a)*d*.8;x.fillStyle=["#3a5a30","#45623a","#6b6444","#7a6a4c","#2d4a2a"][k%5];x.beginPath();x.arc(px,py,(18+r()*38)*s,0,6.3);x.fill()}});
  x.fillStyle="#eef3f8";x.fillRect(0,0,2048,46);x.fillRect(0,978,2048,46);const bl=document.createElement("canvas");bl.width=2048;bl.height=1024;const y=bl.getContext("2d");y.filter="blur(3px)";y.drawImage(c,0,0);x.clearRect(0,0,2048,1024);x.drawImage(bl,0,0);
  for(let k=0;k<900;k++){x.fillStyle=`rgba(255,255,255,${.05+r()*.18})`;const cx=r()*2048,cy=80+r()*864;x.beginPath();x.ellipse(cx,cy,8+r()*40,2+r()*7,(r()-.5)*.6,0,6.3);x.fill()}
  const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=8;return t}
const DT=dunyaTex();
function yildiz(sc,n=4000){const p=pts(n,1.6);p.material.sizeAttenuation=false;sc.add(p);const P=p.geometry.attributes.position.array,C=p.geometry.attributes.color.array;for(let i=0;i<n;i++){const v=V3(rnd()-.5,rnd()-.5,rnd()-.5).normalize().multiplyScalar(800);P.set([v.x,v.y,v.z],i*3);const b=.3+rnd()*.7;C.set([b,b,b*1.1],i*3)}return p}
function dunya(sc,R=10){const g=new THREE.Group();sc.add(g);const m=new THREE.Mesh(new THREE.SphereGeometry(R,96,64),std("#ffffff",0,.75,{map:DT,envMapIntensity:.12}));g.add(m);
  const atm=new THREE.Mesh(new THREE.SphereGeometry(R*1.03,64,48),new THREE.ShaderMaterial({transparent:true,side:THREE.BackSide,blending:THREE.AdditiveBlending,depthWrite:false,
    vertexShader:"varying vec3 n;void main(){n=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",fragmentShader:"varying vec3 n;void main(){float i=pow(.72-dot(n,vec3(0,0,1.)),3.);gl_FragColor=vec4(.35,.62,1.,1.)*i*1.6;}"}));g.add(atm);return{g,m}}
function uydu(){const g=new THREE.Group();const k=new THREE.Mesh(new THREE.SphereGeometry(.5,48,32),std("#d8dde3",1,.18,{envMapIntensity:1.4}));g.add(k);
  const hm=std("#1d3a8a",.3,.3,{envMapIntensity:.8});for(let i=0;i<6;i++){const p=new THREE.Mesh(new THREE.BoxGeometry(.16,.16,.04),hm);const v=V3(Math.cos(i),Math.sin(i*1.7),Math.sin(i*2.3)).normalize();p.position.copy(v.clone().multiplyScalar(.5));p.lookAt(v.clone().multiplyScalar(2));g.add(p)}
  const am=std("#c8ccd2",1,.25);for(let i=0;i<6;i++){const a=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,1.6,6),am);const v=V3(i<3?1:-1,(i%3-1)*.6,(i%3===1?.4:-.3)).normalize();a.position.copy(v.clone().multiplyScalar(.5+.8));a.quaternion.setFromUnitVectors(V3(0,1,0),v);g.add(a)}return g}
// 0) AÇILIŞ: Dünya ve yörüngedeki küçük küre
S.hero=(()=>{const sc=new THREE.Scene();sc.background=L("#010207");const c=cam();yildiz(sc);const D=dunya(sc);const gl=new THREE.DirectionalLight(L("#ffffff"),2.6);gl.position.set(30,10,20);sc.add(gl);sc.add(new THREE.AmbientLight(L("#203050"),.25));
  const u=uydu();u.scale.setScalar(.5);sc.add(u);const iz=new THREE.Mesh(new THREE.TorusGeometry(14,.02,6,240),new THREE.MeshBasicMaterial({color:L("#6FE3FF"),transparent:true,opacity:.5}));iz.rotation.x=1.25;sc.add(iz);
  const gun=spr("#fff2d0",30,1);gun.position.set(300,100,200);sc.add(gun);
  return{sc,c,ex:.8,bl:[.6,.5,.82],kur(q,t,son){D.m.rotation.y=t*.03;const a=t*.25;const p=V3(Math.cos(a)*14,0,Math.sin(a)*14).applyAxisAngle(V3(1,0,0),1.25-Math.PI/2);u.position.copy(p);u.rotation.y=t;
    orb(c,son?V3(0,0,0):p.clone().multiplyScalar(lerp(.6,0,eio(q))),son?lerp(40,46,q)*(YATAY?.8:1.1):lerp(10,36,eio(q))*(YATAY?.8:1.1),lerp(.4,.9,q),lerp(.25,.35,q))}}})();
// 1) YAKIN PLAN: Vanguard 1
S.yakin=(()=>{const sc=new THREE.Scene();sc.background=L("#010207");const c=cam();yildiz(sc);const D=dunya(sc,40);D.g.position.set(0,-48,-20);const gl=new THREE.DirectionalLight(L("#ffffff"),3);gl.position.set(10,6,8);sc.add(gl);sc.add(new THREE.AmbientLight(L("#203050"),.3));
  const u=uydu();sc.add(u);const pn=spr("#9fd8ff",.5,.0);sc.add(pn);
  return{sc,c,ex:.85,bl:[.55,.5,.82],kur(q,t){u.rotation.set(t*.3,t*.45,0);D.g.rotation.y=t*.02;orb(c,V3(0,0,0),lerp(4.2,3.0,eio(q))*(YATAY?.9:1.15),lerp(.3,1.4,q),lerp(.2,.08,q))},veri(q){return`16,5 cm<small>ÇAP · GREYFURT BOYU</small>`}}})();
// 2) SİNYAL: güneşle çalışan verici, 1958 → 1964
S.sinyal=(()=>{const sc=new THREE.Scene();sc.background=L("#010207");const c=cam();yildiz(sc);const gl=new THREE.DirectionalLight(L("#ffffff"),3);gl.position.set(10,6,8);sc.add(gl);sc.add(new THREE.AmbientLight(L("#203050"),.3));
  const u=uydu();sc.add(u);const halka=[];for(let i=0;i<6;i++){const h=new THREE.Mesh(new THREE.TorusGeometry(1,.02,6,96),new THREE.MeshBasicMaterial({color:L("#6FE3FF"),transparent:true,opacity:0,blending:THREE.AdditiveBlending}));sc.add(h);halka.push(h)}
  const gun=spr("#fff2d0",8,1);gun.position.set(18,8,-20);sc.add(gun);const fot=pts(300,.08);sc.add(fot);
  return{sc,c,ex:.85,bl:[.7,.5,.8],kur(q,t){u.rotation.set(t*.2,t*.35,0);halka.forEach((h,i)=>{const k=(t*.45+i/6)%1;h.scale.setScalar(.8+k*7);h.material.opacity=(1-k)*.8*(1-sm(.82,.95,q));h.lookAt(c.position)});
    const P=fot.geometry.attributes.position.array,C=fot.geometry.attributes.color.array;for(let i=0;i<300;i++){const k=(t*.5+i/300)%1;const p=gun.position.clone().lerp(V3(0,0,0),k);P.set([p.x+Math.sin(i)*.3,p.y+Math.cos(i*1.3)*.3,p.z],i*3);const o=Math.sin(k*3.14);C.set([o,o*.85,o*.4],i*3)}fot.geometry.attributes.position.needsUpdate=fot.geometry.attributes.color.needsUpdate=true;
    orb(c,V3(0,0,0),lerp(9,11,q)*(YATAY?.85:1.15),lerp(-.6,-.2,q),.15)},veri(q){const y=Math.round(lerp(1958,1964,sm(.05,.85,q)));return`${y}<small>${q>.85?"SİNYAL SUSTU":"GÜNEŞLE ÇALIŞAN VERİCİ"}</small>`}}})();
// 3) YÖRÜNGE: yıllar akar, uydu döner
S.yorunge=(()=>{const sc=new THREE.Scene();sc.background=L("#010207");const c=cam();yildiz(sc);const D=dunya(sc);const gl=new THREE.DirectionalLight(L("#ffffff"),2.6);gl.position.set(-20,10,25);sc.add(gl);sc.add(new THREE.AmbientLight(L("#203050"),.25));
  const u=uydu();u.scale.setScalar(.45);sc.add(u);const N=400,iz=pts(N,.18);sc.add(iz);
  return{sc,c,ex:.8,bl:[.6,.5,.82],kur(q,t){D.m.rotation.y=t*.4;const P=iz.geometry.attributes.position.array,C=iz.geometry.attributes.color.array;const a0=t*2.2;
    for(let i=0;i<N;i++){const a=a0-i*.012;const r=13+Math.sin(a*.5)*2.5;const p=V3(Math.cos(a)*r,Math.sin(a)*r*.25,Math.sin(a)*r*.95);P.set([p.x,p.y,p.z],i*3);const o=1-i/N;C.set([.3*o,.85*o,1*o],i*3);if(i===0)u.position.copy(p)}iz.geometry.attributes.position.needsUpdate=iz.geometry.attributes.color.needsUpdate=true;
    orb(c,V3(0,0,0),lerp(38,34,q)*(YATAY?.8:1.1),lerp(.2,.7,q),lerp(.35,.25,q))},veri(q){return`${Math.round(lerp(1964,2026,eio(q)))}<small>HÂLÂ YÖRÜNGEDE</small>`}}})();
// 4) GELECEK: 22. yüzyıl sonu, atmosfere dönüş
S.gelecek=(()=>{const sc=new THREE.Scene();sc.background=L("#010207");const c=cam();yildiz(sc);const D=dunya(sc,40);D.g.position.set(0,-50,-10);D.m.rotation.x=Math.PI/2;const gl=new THREE.DirectionalLight(L("#ffd2a0"),2.6);gl.position.set(-20,4,10);sc.add(gl);sc.add(new THREE.AmbientLight(L("#203050"),.3));
  const u=uydu();u.scale.setScalar(.6);sc.add(u);const iz=pts(400,.2);sc.add(iz);
  return{sc,c,ex:.85,bl:[.8,.5,.75],kur(q,t){const k=sm(.35,1,q);u.position.set(lerp(-8,6,q),lerp(3,-2.5,k),0);u.rotation.set(t*.5,t,0);
    const P=iz.geometry.attributes.position.array,C=iz.geometry.attributes.color.array;for(let i=0;i<400;i++){const f=i/400;P.set([u.position.x-f*3,u.position.y+f*.6*k,(Math.sin(i)*.15)],i*3);const o=(1-f)*k;C.set([1*o,.5*o,.15*o],i*3)}iz.geometry.attributes.position.needsUpdate=iz.geometry.attributes.color.needsUpdate=true;
    orb(c,V3(0,0,0),(YATAY?14:20),1.57,.05)},veri(q){return`~2190'LAR<small>ATMOSFERE DÖNÜŞ</small>`}}})();
S.son={...S.hero,kur:(u,t)=>S.hero.kur(u,t,true)};

/* ======================= HUD ======================= */
const DIL=Q.get("dil")||"tr";
const BAS={hero:["","1958'DEN BERİ UZAYDA","BİLİYOR MUYDUN? · GÜNEŞ ENERJİSİ"],yakin:["01","VANGUARD 1","İLK GÜNEŞ ENERJİLİ UYDU"],sinyal:["02","GÜNEŞLE KONUŞTU","6 YILI AŞKIN SİNYAL"],yorunge:["03","HÂLÂ ORADA","YÖRÜNGEDEKİ EN ESKİ NESNE"],gelecek:["04","DÖNÜŞ","22. YÜZYILIN SONLARI"],son:["","VANGUARD 1","KÜÇÜK KÜRE · BÜYÜK BAŞLANGIÇ"]};
if(DIL==="en")Object.assign(BAS,{hero:["","IN SPACE SINCE 1958","DID YOU KNOW? · SOLAR ENERGY"],yakin:["01","VANGUARD 1","FIRST SOLAR-POWERED SATELLITE"],sinyal:["02","TALKING ON SUNLIGHT","6+ YEARS OF SIGNALS"],yorunge:["03","STILL UP THERE","OLDEST OBJECT IN ORBIT"],gelecek:["04","RE-ENTRY","LATE 22ND CENTURY"],son:["","VANGUARD 1","TINY SPHERE · BIG START"]});
const SOZ={"ÇAP · GREYFURT BOYU":"DIAMETER · GRAPEFRUIT SIZE","SİNYAL SUSTU":"SIGNAL ENDED","GÜNEŞLE ÇALIŞAN VERİCİ":"SOLAR-POWERED TRANSMITTER","HÂLÂ YÖRÜNGEDE":"STILL IN ORBIT","~2190'LAR":"~2190s","ATMOSFERE DÖNÜŞ":"RE-ENTRY"};
const ceviri=h=>{if(DIL==="tr")return h;let o=h;Object.keys(SOZ).sort((a,b)=>b.length-a.length).forEach(k=>{o=o.split(k).join(SOZ[k])});return o.replace(/(\d),(\d)/g,"$1.$2")};
const SIRA=["yakin","sinyal","yorunge","gelecek"],NS=SIRA.length;
const $=s=>document.getElementById(s);$("oku").textContent=DIL==="en"?"1958 → 1964 → TODAY → ~2190s":"1958 → 1964 → BUGÜN → ~2190'LAR";$("yol").innerHTML=SIRA.map(()=>"<i><s></s></i>").join("");
let sonBas="";function hud(ad,u){const b=BAS[ad];if(sonBas!==ad){sonBas=ad;$("bn").textContent=b[0]?`${DIL==="en"?"DID YOU KNOW":"BİLİYOR MUYDUN"} · ${b[0]}`:(DIL==="en"?"KOZMOS LAB · DID YOU KNOW?":"KOZMOS LAB · BİLİYOR MUYDUN?");$("bt").textContent=b[1];$("bs").textContent=b[2]}
  const gi=sm(0,.08,u);$("bas").style.opacity=gi;$("bas").style.transform=`translateY(${(1-gi)*2}vmin)`;
  const si=SIRA.indexOf(ad);[...$("yol").children].forEach((e,i)=>{e.className=(ad==="son"||i<si)?"done":"";e.firstChild.style.transform=i===si?`scaleX(${u})`:""});
  $("sayac").textContent=si>=0?`${String(si+1).padStart(2,"0")}/${String(NS).padStart(2,"0")}`:"";const S_=S[ad];$("veri").innerHTML=S_.veri?ceviri(S_.veri(u)):"";$("veri").style.opacity=S_.veri?sm(.05,.15,u):0}

/* ======================= ZAMAN ÇİZELGESİ ======================= */
let K={sahneler:["hero","yakin","sinyal","yorunge","gelecek","son"].map((a,i)=>({ad:a,bas:i*5,son:i*5+5})),altyazi:[],gecis:"flas"};
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
