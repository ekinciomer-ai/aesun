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

