import * as THREE from 'three';
import { Toon, blinkAt } from '/engine/src/toon.js';

export const NAME = 'kayip-golge';
export const FPS = 30;
export const DUR = 38;
export const CUES = [];
export const LOOK = { yumurta: {headW: 245, headH: 284, height: 1.48, cloth: '#176277', scarf: '#dfaa37', boots: '#28253f', collar: false} };

const V = (x,y,z) => new THREE.Vector3(x,y,z);
const clamp = x => Math.max(0,Math.min(1,x));
const ease = x => { const u=clamp(x); return u*u*(3-2*u); };
const ramp = (t,a,b) => ease((t-a)/(b-a));
const lerp = (a,b,u) => a+(b-a)*u;
const mat = (color, glow=0) => new THREE.MeshStandardMaterial({color,roughness:.78,emissive:color,emissiveIntensity:glow});
const ink = c => new THREE.MeshBasicMaterial({color:c});
let man, cat, tail, paw, ghost, arm, bow, lamp, bulb, beam, flashlight, scarf;
function mesh(group, geo, m, x,y,z) {
  const obj=new THREE.Mesh(geo,m);
  obj.position.set(x,y,z);
  group.add(obj);
  return obj;
}
const box=(g,m,x,y,z,w,h,d)=>mesh(g,new THREE.BoxGeometry(w,h,d),m,x,y,z);
function oval(g,m,x,y,z,w,h,d) {
  const o=mesh(g,new THREE.SphereGeometry(1,18,12),m,x,y,z);
  o.scale.set(w,h,d);
  return o;
}
function pool(scene,x,z,r,color) {
  const canvas=document.createElement('canvas'); canvas.width=canvas.height=128;
  const c=canvas.getContext('2d'), grad=c.createRadialGradient(64,64,4,64,64,63);
  grad.addColorStop(0,color); grad.addColorStop(1,'rgba(255,174,86,0)');
  c.fillStyle=grad;c.fillRect(0,0,128,128);
  const tx=new THREE.CanvasTexture(canvas);tx.colorSpace=THREE.SRGBColorSpace;
  const p=mesh(scene,new THREE.PlaneGeometry(r,r*.8),new THREE.MeshBasicMaterial({map:tx,transparent:true,depthWrite:false}),x,.018,z);
  p.rotation.x=-Math.PI/2;return p;
}
export async function setup({scene}) {
  scene.background=new THREE.Color('#201e3a');
  scene.fog=new THREE.FogExp2('#24223d',.046);
  scene.add(new THREE.HemisphereLight('#c0baff','#947868',2.1));
  const key=new THREE.DirectionalLight('#ffd9ad',1.25);key.position.set(2,5,5);scene.add(key);
  const brick=mat('#4a425d'), paving=mat('#675b77'), wood=mat('#8d514c'), metal=mat('#35354e'), sand=mat('#ecb467',.18);
  box(scene,mat('#353454'),0,-.24,1,33,.28,13);
  box(scene,paving,0,-.075,-.5,32,.15,4.7);
  box(scene,mat('#8a79a0'),0,.01,1.88,32,.16,.18);
  for(let x=-16;x<16;x+=.7)box(scene,mat('#554d69'),x,.004,-.45,.014,.014,4.5);
  for(let j=0;j<17;j++){
    const x=j*2-16,h=3.7+1.5*Math.sin(j*2.3);
    box(scene,brick,x,h/2,-3.65,1.96,h,1.2);
    box(scene,metal,x,h,-3.52,2.03,.17,1.35);
    for(let w=0;w<2;w++){
      const wx=x+(w-.5)*.76;
      box(scene,metal,wx,2.14,-3.01,.50,.86,.15);
      box(scene,j%3===0?sand:mat('#756a8f'),wx,2.14,-2.92,.36,.66,.045);
      box(scene,metal,wx,2.14,-2.895,.035,.66,.04);
      box(scene,metal,wx,2.14,-2.895,.36,.035,.04);
    }
  }
  box(scene,mat('#a27983'),-5,1.25,-2.93,3.45,2.5,.12);
  for(const x of [7,2,-3]){
    const z=-1.36;
    mesh(scene,new THREE.CylinderGeometry(.045,.082,2.65,12),metal,x,1.33,z);
    box(scene,metal,x,2.64,z+.20,.13,.13,.49);
    const b=oval(scene,ink('#ffcd82'),x,2.57,z+.41,.20,.10,.18);
    const p=pool(scene,x,.02,4.9,'rgba(255,184,105,.62)');
    const l=new THREE.PointLight('#ffbb7a',10,6,2);l.position.set(x,2.43,z+.47);scene.add(l);
    if(x===-3){lamp=l;bulb=b;beam=p;box(scene,sand,x+.09,.93,z+.04,.095,.13,.1);}
  }
  for(const x of [-.68,.68])box(scene,metal,x,.25,-.45,.09,.5,.46);
  for(let i=0;i<4;i++)box(scene,wood,0,.48,-.69+i*.13,1.7,.075,.10);
  for(let i=0;i<3;i++)box(scene,wood,0,.68+i*.14,-.78,1.7,.10,.075);
  scarf=box(scene,sand,.63,.52,-.58,.13,.37,.055);
  man=new Toon(LOOK.yumurta,scene);
  cat=new THREE.Group();scene.add(cat);
  const fur=mat('#494459'),white=mat('#f8eee7'),eye=ink('#ffc775');
  oval(cat,fur,0,.18,0,.27,.17,.17);
  oval(cat,fur,.18,.32,.02,.16,.15,.14);
  for(const x of [.08,.25])mesh(cat,new THREE.ConeGeometry(.070,.18,3),fur,x,.48,.03);
  for(const x of [.14,.23])oval(cat,eye,x,.34,.137,.022,.025,.014);
  paw=oval(cat,white,.18,.055,.11,.085,.045,.075);
  tail=new THREE.Group();tail.position.set(-.22,.19,0);cat.add(tail);
  mesh(tail,new THREE.TorusGeometry(.19,.037,8,24,2.95),fur,-.17,.08,.03).rotation.z=.11;
  ghost=new THREE.Group();scene.add(ghost);
  const shade=ink('#292240');
  bow=new THREE.Group();ghost.add(bow);
  oval(bow,shade,0,.87,0,.25,.32,.018);
  oval(bow,shade,0,.45,0,.22,.26,.017);
  for(const x of [-.13,.13])oval(bow,shade,x,.12,0,.084,.16,.017);
  arm=new THREE.Group();bow.add(arm);
  const a=oval(arm,shade,-.26,.47,0,.19,.055,.016);a.rotation.z=.28;
  const b=oval(arm,shade,.26,.53,0,.19,.055,.016);b.rotation.z=.45;
  oval(bow,shade,.24,.66,0,.20,.047,.016).rotation.z=.34;
  const flash=box(scene,metal,-4.42,.075,.24,.21,.12,.13);
  flash.rotation.y=-.36;
  flashlight=new THREE.PointLight('#ffc47e',22,7,2);flashlight.position.set(-4.42,.24,.26);scene.add(flashlight);
}
export function frame(t,{cam}) {
  const x = t<10 ? 2.5+.66*ramp(t,.1,1.5) : t<17 ? lerp(3.16,.38,ramp(t,10,15)) : lerp(.38,-2.75,ramp(t,19,27));
  const run = t>10&&t<15 || t>19&&t<26;
  const jump=.53*Math.sin(Math.PI*clamp((t-13.2)/1.7));
  const g = t<10 ? lerp(2.85,1.21,ramp(t,.55,2.2)) : t<17 ? lerp(1.21,-.88,ramp(t,10,14)) : lerp(-.88,-3.25,ramp(t,18,23));
  const fin=t>=32.1, blackout=t>=28.75;
  const catX=t<16?1.34:lerp(1.34,-4.68,ramp(t,21,32));
  const focus=t<7?lerp(2.55,2.06,ramp(t,.5,3.7)):t<12?lerp(2.06,1.70,ramp(t,7,10)):t<19?lerp(1.7,.10,ramp(t,12,16)):t<28?lerp(.10,-2.85,ramp(t,19,24)):lerp(-2.85,-4.95,ramp(t,29,35));
  cam.position.set(focus+.22*Math.sin(t*.37),1.55+.27*ramp(t,27,34),4.45+.58*ramp(t,30,37)+.18*Math.sin(t*.48));
  cam.fov=46;cam.updateProjectionMatrix();cam.lookAt(focus,.88+.23*ramp(t,30,35),-.46);
  man.show();man.place(x,jump,.54,cam,[1,.98,1]);
  const waving=t>=4&&t<7, pressing=t>27&&t<29;
  man.draw({expr:t<3?'surprised':t<22?'worried':t<28?'proud':'surprised',look:-.68,
    blink:blinkAt(t,4,[2,7,17,29]),bob:run?-Math.abs(Math.sin(t*12))*11:0,lean:run?-7:Math.sin(t*2),
    armL:pressing?[105,22]:waving?[155+19*Math.sin(t*8),30]:[25+18*Math.sin(t*10)*(run?1:0),20],
    armR:[27-17*Math.sin(t*10)*(run?1:0),15],lit:1,shade:'#b7acd0',rim:{color:'#ffc36f',a:.42}});
  man.castFrom(V(.4,-1,.6),true);
  cat.position.set(catX,0,.3);cat.rotation.y=.25;tail.rotation.z=.32*Math.sin(t*4);
  paw.position.x=.18+.14*ramp(t,31.5,32.12);
  scarf.visible=t>14.3&&t<18;
  ghost.visible=!blackout||fin;
  if(fin){
    ghost.position.set(-5.05,.05,-2.81);
    ghost.rotation.x=0;ghost.scale.set(1.85,1.85,1);
    bow.scale.y=1-.35*Math.sin(Math.PI*clamp((t-35.2)/1.55));
    arm.rotation.z=.32*Math.sin(t*5);
  } else {
    ghost.position.set(g,.028,-.23);
    ghost.rotation.x=-Math.PI/2;ghost.scale.set(1,1.26,1);
    bow.scale.y=t>11&&t<15?.55:1;arm.rotation.z=t>22?.65:t>4&&t<8?-.20:.14*Math.sin(t*7);
  }
  lamp.visible=bulb.visible=beam.visible=!blackout;flashlight.visible=fin;
  return {focus:5,coc:2,range:7,sat:1.22,lift:[.07,.06,.1],bloom:.65,vignette:.21,tint:[1,.99,1.02],blur:0};
}
