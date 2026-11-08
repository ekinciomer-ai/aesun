/* ======================= SAHNELER: RÜZGÂR ======================= */
const S={};
// kanat geometrisi: kök yuvarlak, uca doğru incelen ve burulan kanat profili (Y ekseni boyunca)
function kanatGeo(Lb=7.5){const NS=28,NT=24,pos=[],idx=[];
  for(let j=0;j<=NS;j++){const s=j/NS;const ch=s<.18?lerp(.42,1.0,s/.18):lerp(1.0,.14,(s-.18)/.82);const th=s<.18?lerp(.42,.22,s/.18):lerp(.22,.035,(s-.18)/.82);const tw=lerp(.42,0,Math.pow(s,.6));const cs=Math.cos(tw),sn=Math.sin(tw);const rnd_=s<.06;
    for(let i=0;i<NT;i++){const a=i/NT*6.283;let x,z;if(rnd_){x=Math.cos(a)*.21;z=Math.sin(a)*.21}else{const xc=.5+.5*Math.cos(a);x=(xc-.3)*ch*.9;z=Math.sin(a)*th*.5*(1-.55*xc)*(Math.sin(a)>0?1:.55)}
      pos.push(x*cs-z*sn,s*Lb,x*sn+z*cs)}}
  for(let j=0;j<NS;j++)for(let i=0;i<NT;i++){const a=j*NT+i,b=j*NT+(i+1)%NT,c=(j+1)*NT+i,d=(j+1)*NT+(i+1)%NT;idx.push(a,c,b,b,c,d)}
  const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g}
const KG=kanatGeo(),KM=std("#b9bfc6",.05,.4,{envMapIntensity:.35});
function turbin(H=10,koyu=false){const g=new THREE.Group();const m=koyu?std("#15181d",.3,.6):std("#b9bfc6",.1,.45,{envMapIntensity:.35});
  const kule=new THREE.Mesh(new THREE.CylinderGeometry(.22,.42,H,32),m);kule.position.y=H/2;g.add(kule);
  const yaw=new THREE.Group();yaw.position.y=H+.35;g.add(yaw);
  const nas=new THREE.Mesh(new THREE.BoxGeometry(.9,.8,2.4),m);nas.position.z=-.4;yaw.add(nas);const kap=new THREE.Mesh(new THREE.SphereGeometry(.45,24,16),m);kap.scale.set(1,.9,.8);kap.position.z=.85;yaw.add(kap);
  const rot=new THREE.Group();rot.position.z=1.15;yaw.add(rot);const hub=new THREE.Mesh(new THREE.ConeGeometry(.42,.9,24),m);hub.rotation.x=Math.PI/2;hub.position.z=.25;rot.add(hub);
  const kanatlar=[];for(let k=0;k<3;k++){const p=new THREE.Group();p.rotation.z=k*2.094;rot.add(p);const b=new THREE.Mesh(KG,koyu?m:KM);b.position.y=.3;p.add(b);kanatlar.push(b)}
  return{g,yaw,rot,kanatlar,kule}}
function arazi(sc,renk="#3d4a2f",tepe=true){const gr=new THREE.Mesh(new THREE.PlaneGeometry(1200,1200,80,80),std(renk,0,.95));const p=gr.geometry.attributes.position;
  if(tepe)for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i);const d=Math.hypot(x,y);p.setZ(i,d>40?(Math.sin(x*.02)*Math.cos(y*.017)*8+Math.sin(x*.05+y*.03)*3)*sm(40,120,d):0)}
  gr.geometry.computeVertexNormals();gr.rotation.x=-Math.PI/2;sc.add(gr);return gr}
function akim(sc,n,renk){const p=pts(n,.12);sc.add(p);const D=[];for(let i=0;i<n;i++)D.push([(rnd()-.5)*60,rnd()*18+1,(rnd()-.5)*40,rnd()]);
  return{p,kur(t,hiz=1,op=1,yon=0){const P=p.geometry.attributes.position.array,C=p.geometry.attributes.color.array;const c=L(renk);for(let i=0;i<n;i++){const[x,y,z,ph]=D[i];const k=((t*.18*hiz+ph)%1);const xx=-30+k*60;P.set([xx,y+Math.sin(xx*.15+ph*6)*.6,z+Math.sin(t+ph*9)*.3],i*3);const o=Math.sin(k*3.14)*op;C.set([c.r*o,c.g*o,c.b*o],i*3)}
    p.geometry.attributes.position.needsUpdate=p.geometry.attributes.color.needsUpdate=true;p.rotation.y=yon}}}
// 0) AÇILIŞ / KAPANIŞ
S.hero=(()=>{const sc=new THREE.Scene();const c=cam();const sky=gok(sc,"#16234a","#e89a5e","#2a2030");sky.uniforms.sg.value=1;sky.uniforms.sd.value=V3(-.8,.06,-1).normalize();sc.fog=new THREE.Fog(L("#5a4450"),40,500);
  isik(sc,"#ffc59a",1.6,"#7aa0ff",.8);arazi(sc,"#2a2a26");const T=turbin(12,true);sc.add(T.g);
  const uz=[];for(let i=0;i<7;i++){const t=turbin(12,true);t.g.position.set(-90+i*32,0,-90-rnd()*40);t.g.scale.setScalar(.9);sc.add(t.g);uz.push(t)}
  const ak=akim(sc,700,"#ffe2c0");
  return{sc,c,bl:[.45,.5,.88],kur(u,t,son){T.rot.rotation.z=-t*1.1;uz.forEach((x,i)=>x.rot.rotation.z=-t*1.0-i);ak.kur(t,1.2,.7);
    const yaw=son?lerp(1.9,2.3,u):lerp(2.4,1.9,eio(u));orb(c,V3(0,son?9:lerp(5,10,u),0),son?(YATAY?30:34):lerp(22,30,u)*(YATAY?1:1.2),yaw,son?.1:lerp(-.02,.12,u))}}})();
// 1) RÜZGÂR NASIL OLUŞUR: kara ısınır, hava yükselir, denizden serin hava akar
S.ruzgar=(()=>{const sc=new THREE.Scene();const c=cam();const sky=gok(sc,"#2c63b5","#bcd8f0","#5a6a7a");sky.uniforms.sg.value=.6;sky.uniforms.sd.value=V3(.2,.8,-.4).normalize();
  isik(sc,"#fff2d8",2.2,"#9cc4ff",.8);const kara=new THREE.Mesh(new THREE.BoxGeometry(60,2,30),std("#7a6440",0,.95));kara.position.set(-30,-1,0);sc.add(kara);
  const deniz=new THREE.Mesh(new THREE.BoxGeometry(60,2,30),std("#123a5c",.4,.2,{envMapIntensity:.9}));deniz.position.set(30,-1.1,0);sc.add(deniz);
  const gun=spr("#fff0c0",18,1);gun.position.set(-20,40,-30);sc.add(gun);
  const N=1600,p=pts(N,1.1);sc.add(p);const D=[];for(let i=0;i<N;i++)D.push([rnd(),(rnd()-.5)*14,rnd()]);
  const isi=pts(500,.5);sc.add(isi);const ID=[];for(let i=0;i<500;i++)ID.push([(rnd()-.5)*50-30,(rnd()-.5)*40,rnd()]);
  return{sc,c,ex:.62,bl:[.3,.5,.95],kur(u,t){const P=p.geometry.attributes.position.array,C=p.geometry.attributes.color.array;const on=sm(0,.25,u);
    for(let i=0;i<N;i++){const[ph,z,s]=D[i];const k=(t*.09+ph)%1;let x,y,col;// döngü: kara üstünde yüksel → yukarıda denize → denizde alçal → yerden karaya
      if(k<.25){const q=k/.25;x=-28+s*6;y=1+q*22;col=[1,.55,.2]}else if(k<.5){const q=(k-.25)/.25;x=lerp(-28,28,q);y=23+Math.sin(q*3.14)*2;col=[lerp(1,.4,q),lerp(.55,.7,q),lerp(.2,1,q)]}
      else if(k<.75){const q=(k-.5)/.25;x=28-s*6;y=23-q*21;col=[.4,.7,1]}else{const q=(k-.75)/.25;x=lerp(28,-28,q);y=1.5+s*1.5;col=[lerp(.4,1,q),lerp(.7,.6,q),lerp(1,.3,q)]}
      P.set([x,y,z],i*3);C.set([col[0]*on,col[1]*on,col[2]*on],i*3)}p.geometry.attributes.position.needsUpdate=p.geometry.attributes.color.needsUpdate=true;
    const IP=isi.geometry.attributes.position.array,IC=isi.geometry.attributes.color.array;for(let i=0;i<500;i++){const[x,z,ph]=ID[i];const k=(t*.4+ph)%1;IP.set([x,.2+k*5,z],i*3);const o=Math.sin(k*3.14)*.5;IC.set([o,o*.4,0],i*3)}isi.geometry.attributes.position.needsUpdate=isi.geometry.attributes.color.needsUpdate=true;
    orb(c,V3(0,11,0),lerp(105,92,u)*(YATAY?.75:1.0),lerp(1.5,1.68,u),lerp(.08,.16,u))},veri(u){return u<.5?`SICAK HAVA ↑<small>KARA ÇABUK ISINIR</small>`:`SERİN HAVA →<small>RÜZGÂR = HAVA AKIMI</small>`}}})();
// 2) KANAT ÜRETİMİ
S.kanat=(()=>{const sc=new THREE.Scene();sc.background=L("#0d1117");sc.fog=new THREE.FogExp2(L("#0d1117"),.02);const c=cam();zemin(sc,"#1a1d22",120,.6);isik(sc,"#ffffff",1.8,"#6FE3FF",1.2);
  for(let i=0;i<6;i++){const l=new THREE.Mesh(new THREE.BoxGeometry(.4,.1,30),emi("#dfefff",2));l.position.set(-8+i*3.2,14,0);sc.add(l)}
  const kal=new THREE.Mesh(new THREE.BoxGeometry(3.4,1.2,40),std("#3a4048",.6,.5));kal.position.set(0,.6,0);sc.add(kal);const ic=new THREE.Mesh(new THREE.BoxGeometry(2.8,.4,39),std("#20242a",.5,.6));ic.position.set(0,1.05,0);sc.add(ic);
  const pk=new THREE.Plane(V3(0,0,-1),0);const kat=[["#e8dcc0",0],["#2a2c30",.008],["#f3f5f7",.016]].map(([h,o])=>{const m=new THREE.Mesh(KG,std(h,h==="#2a2c30"?.4:0,.4,{clippingPlanes:[pk.clone()]}));m.scale.setScalar(5+o*6);m.rotation.set(Math.PI/2,0,0);m.position.set(0,1.6,-19);sc.add(m);return m});
  const vinc=new THREE.Mesh(new THREE.BoxGeometry(6,.5,.6),std("#e2a32b",.4,.5));sc.add(vinc);
  return{sc,c,bl:[.35,.4,.9],kur(u,t){const s=u<.75?sm(0,.7,u):1;kat.forEach((m,i)=>{const kk=cl(s*1.25-i*.12);m.material.clippingPlanes[0].normal.set(0,0,-1);m.material.clippingPlanes[0].constant=lerp(-19.5,21,kk);m.visible=kk>0});
    const up=sm(.78,1,u);kat.forEach(m=>m.position.y=1.6+up*3.5);vinc.position.set(0,lerp(9,5.6,sm(.72,.8,u))+up*3.5,0);vinc.visible=u>.7;
    orb(c,V3(0,1.5,lerp(-6,2,u)),lerp(16,24,u)*(YATAY?.85:1.1),lerp(.5,.95,u),lerp(.32,.42,u))},veri(u){return u<.25?`CAM ELYAF<small>KATMAN KATMAN</small>`:u<.5?`KARBON<small>GÜÇLENDİRME</small>`:u<.75?`REÇİNE<small>TEK PARÇA</small>`:`100+ m<small>EN UZUN KANATLAR</small>`}}})();
// 3) NASEL KESİTİ
S.nasel=(()=>{const sc=new THREE.Scene();sc.background=L("#05070c");sc.fog=new THREE.FogExp2(L("#05070c"),.04);const c=cam();zemin(sc,"#0a0d13",40,.5);isik(sc,"#ffffff",2,"#6FE3FF",1.6);
  const kab=new THREE.Mesh(new THREE.BoxGeometry(3.4,3,8,1,1,1),new THREE.MeshPhysicalMaterial({color:L("#dfe8f2"),transparent:true,opacity:.14,roughness:.2,envMap:ENV,side:THREE.DoubleSide,depthWrite:false}));kab.position.y=3;sc.add(kab);
  const ken=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(3.4,3,8)),new THREE.LineBasicMaterial({color:L("#6FE3FF"),transparent:true,opacity:.6}));ken.position.y=3;sc.add(ken);
  const mil=new THREE.Mesh(new THREE.CylinderGeometry(.35,.35,3.2,32),std("#9aa3ad",1,.3));mil.rotation.x=Math.PI/2;mil.position.set(0,3,2.3);sc.add(mil);
  const hub=new THREE.Mesh(new THREE.SphereGeometry(1.1,32,24),std("#8d949c",.2,.45,{envMapIntensity:.3}));hub.position.set(0,3,4.6);sc.add(hub);
  const dk=new THREE.Group();dk.position.set(0,3,.2);sc.add(dk);const dkk=new THREE.Mesh(new THREE.CylinderGeometry(1.15,1.15,1.4,40),std("#4a5260",.8,.35));dkk.rotation.x=Math.PI/2;dk.add(dkk);
  const disler=[];for(let i=0;i<3;i++){const d=new THREE.Mesh(new THREE.TorusGeometry(.55,.12,8,24),std("#c9a24a",1,.25));d.position.set(Math.cos(i*2.09)*.5,Math.sin(i*2.09)*.5,.75);dk.add(d);disler.push(d)}
  const jen=new THREE.Group();jen.position.set(0,3,-2.4);sc.add(jen);const jg=new THREE.Mesh(new THREE.CylinderGeometry(1,1,2.2,40),std("#2d3440",.7,.4));jg.rotation.x=Math.PI/2;jen.add(jg);
  const bob=new THREE.Mesh(new THREE.TorusGeometry(.75,.16,12,48),emi("#ff8a3a",1.4));bob.position.z=0;jen.add(bob);const ic=new THREE.Mesh(new THREE.CylinderGeometry(.5,.5,2.3,24),std("#c7792e",1,.3));ic.rotation.x=Math.PI/2;jen.add(ic);
  const ksp=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,2.4,12),std("#9aa3ad",1,.3));ksp.rotation.x=Math.PI/2;ksp.position.set(0,3,-.9);sc.add(ksp);
  const el=pts(400,.12);sc.add(el);
  return{sc,c,bl:[.6,.45,.8],kur(u,t){mil.rotation.y=t*.8;hub.rotation.z=-t*.8;dk.rotation.z=t*.8;disler.forEach((d,i)=>d.rotation.z=t*(i%2?-3:3));jen.rotation.z=t*6;ksp.rotation.y=t*6;bob.material.emissiveIntensity=1.2+Math.sin(t*12)*.3;
    const P=el.geometry.attributes.position.array,C=el.geometry.attributes.color.array;for(let i=0;i<400;i++){const k=(t*.5+i/400)%1;P.set([Math.cos(i)*.3,3-1.6+(1-k)*0-(k*2.5),-2.4-Math.sin(i)*.3],i*3);const o=sm(.35,.5,u)*Math.sin(k*3.14);C.set([.2*o,.8*o,1*o],i*3)}el.geometry.attributes.position.needsUpdate=el.geometry.attributes.color.needsUpdate=true;
    orb(c,V3(0,3,lerp(1.5,-1.5,u)),lerp(11,9,u)*(YATAY?.9:1.15),lerp(.6,1.9,u),lerp(.35,.25,u))},veri(u){return u<.33?`ANA MİL<small>YAVAŞ DÖNÜŞ</small>`:u<.66?`DİŞLİ KUTUSU<small>DEVİR ARTIRIR</small>`:`JENERATÖR<small>HAREKET → ELEKTRİK</small>`}}})();
// 4) NAKLİYE: uzun dorsede kanat
S.nakliye=(()=>{const sc=new THREE.Scene();const c=cam();const sky=gok(sc,"#3a74c4","#cfe2f2","#8a7a62");sky.uniforms.sg.value=.4;sky.uniforms.sd.value=V3(.5,.3,-1).normalize();sc.fog=new THREE.Fog(L("#b9c9d6"),120,700);isik(sc,"#fff4e2",2.2,"#9fc3ff",.8);
  arazi(sc,"#6d7a4a");const asf=new THREE.Mesh(new THREE.PlaneGeometry(1200,9),std("#2a2c30",.1,.85));asf.rotation.x=-Math.PI/2;asf.position.y=.03;sc.add(asf);
  const dash=new THREE.InstancedMesh(new THREE.PlaneGeometry(4,.25),std("#e8e2c8",0,.6),160);sc.add(dash);{const M=new THREE.Matrix4();for(let i=0;i<160;i++){M.makeRotationX(-Math.PI/2);M.setPosition(-600+i*7.5,.05,0);dash.setMatrixAt(i,M)}}dash.frustumCulled=false;
  const tr=new THREE.Group();sc.add(tr);const cab=new THREE.Mesh(new THREE.BoxGeometry(2.4,3,2.5),std("#f2f2f2",.4,.35));cab.position.set(30,2.2,1.9);tr.add(cab);
  const ch=new THREE.Mesh(new THREE.BoxGeometry(56,.45,2.4),std("#1d1f23",.6,.5));ch.position.set(4,1,1.9);tr.add(ch);
  const kn=new THREE.Mesh(KG,KM);kn.scale.setScalar(7.2);tr.add(kn);kn.rotation.set(0,0,-Math.PI/2);kn.position.set(-38,3.2,1.9);
  const whs=[];for(const x of[-20,-18.6,-17.2,22,24,28.5,31])for(const z of[.75,3.05]){const w=new THREE.Mesh(new THREE.CylinderGeometry(.55,.55,.4,20),std("#151618",.2,.8));w.rotation.x=Math.PI/2;w.position.set(x,.55,z);tr.add(w);whs.push(w)}
  const fl=spr("#ffb020",1.2,1);fl.position.set(31.3,3.9,1.9);tr.add(fl);
  return{sc,c,ex:.6,bl:[.25,.4,.96],kur(u,t){tr.position.x=lerp(-60,50,u);whs.forEach(w=>w.rotation.y=-t*7);fl.material.opacity=(Math.sin(t*10)>0)?1:.2;
    orb(c,V3(tr.position.x-10,3,1.9),lerp(62,46,u)*(YATAY?.7:1.0),lerp(.95,.45,u),lerp(.2,.12,u))},veri(u){return`~100 m<small>TEK KANAT</small>`}}})();
// 5) KURULUM
S.kurulum=(()=>{const sc=new THREE.Scene();const c=cam();const sky=gok(sc,"#2f63b0","#d8e6f2","#8a7a62");sky.uniforms.sg.value=.4;sc.fog=new THREE.Fog(L("#c2d2de"),120,700);isik(sc,"#fff4e2",2.2,"#9fc3ff",.8);arazi(sc,"#6d7a4a");
  const tem=new THREE.Mesh(new THREE.CylinderGeometry(4,4.4,.8,48),std("#9a9a96",0,.9));tem.position.y=.4;sc.add(tem);
  const T=turbin(12,false);sc.add(T.g);T.g.scale.setScalar(2.4);const parca=[];
  // kule 4 parça hâlinde
  T.kule.visible=false;for(let i=0;i<4;i++){const r0=lerp(.42,.22,i/4),r1=lerp(.42,.22,(i+1)/4);const m=new THREE.Mesh(new THREE.CylinderGeometry(r1,r0,3,32),std("#e9ecef",.1,.4));m.position.y=1.5+i*3;T.g.add(m);parca.push(m)}
  const boom=new THREE.Mesh(new THREE.BoxGeometry(1,70,1),std("#e2a32b",.4,.5));boom.position.set(16,34,-18);boom.rotation.z=.22;sc.add(boom);
  const kab=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,1,6),std("#222",.5,.5));sc.add(kab);
  return{sc,c,ex:.6,bl:[.25,.4,.96],kur(u,t){parca.forEach((m,i)=>{const k=cl(u*5.5-i*.9);m.visible=k>0;m.position.y=1.5+i*3+(1-eio(cl(k)))*10});
    const kn=sm(.62,.78,u),kr=sm(.8,.96,u);T.yaw.visible=kn>0;T.yaw.position.y=12.35+(1-eio(kn))*12;T.rot.visible=kr>0;T.rot.position.y=(1-eio(kr))*8;T.rot.rotation.z=-sm(.96,1,u)*t*.5;
    const hook=u<.6?V3(0,(1.5+Math.min(3,Math.floor(u*5.5))*3+4)*2.4,0):u<.8?V3(0,(12.35+(1-eio(kn))*12+2)*2.4,0):V3(0,(14.5+(1-eio(kr))*8)*2.4,2.8);kab.position.set(hook.x,(hook.y+60)/2,hook.z);kab.scale.y=Math.max(1,60-hook.y);
    orb(c,V3(0,lerp(14,22,u),0),lerp(95,105,u)*(YATAY?.7:1.0),lerp(1.2,1.5,u),lerp(.1,.18,u))},veri(u){return u<.15?`BETON TEMEL<small>YÜZLERCE TON</small>`:u<.6?`KULE<small>PARÇA PARÇA</small>`:u<.8?`NASEL<small>VİNÇLE</small>`:`ROTOR<small>3 KANAT</small>`}}})();
// 6) ELEKTRİK: rüzgâr çiftliği
S.uretim=(()=>{const sc=new THREE.Scene();const c=cam();const sky=gok(sc,"#244e8f","#b8cfe2","#5a6a7a");sky.uniforms.sg.value=.5;sky.uniforms.sd.value=V3(-.4,.25,-1).normalize();sc.fog=new THREE.Fog(L("#a8bccb"),150,800);isik(sc,"#fff2dc",2.0,"#9cc4ff",.9);
  const sea=new THREE.Mesh(new THREE.PlaneGeometry(1400,1400,120,120),std("#123a5c",.35,.18,{envMapIntensity:1.1}));sea.rotation.x=-Math.PI/2;sc.add(sea);const SP=sea.geometry.attributes.position,S0=Float32Array.from(SP.array);
  const TT=[];for(let i=0;i<4;i++)for(let j=0;j<4;j++){const t=turbin(12,false);t.g.scale.setScalar(2.4);t.g.position.set((i-1.5)*55+(j%2)*20,0,(j-1.5)*55);sc.add(t.g);TT.push(t)}
  const tf=new THREE.Mesh(new THREE.BoxGeometry(12,8,10),std("#d9dde2",.3,.5));tf.position.set(-150,4,60);sc.add(tf);const ay=new THREE.Mesh(new THREE.CylinderGeometry(3,3,6,24),std("#f0c419",.3,.5));ay.position.set(-150,-1,60);sc.add(ay);
  const el=pts(900,.9);sc.add(el);const ak=akim(sc,900,"#e8f4ff");ak.p.scale.setScalar(6);
  return{sc,c,ex:.62,bl:[.35,.5,.95],kur(u,t){for(let i=0;i<SP.count;i++){const x=S0[i*3],y=S0[i*3+1];SP.setZ(i,Math.sin(x*.04+t*1.1)*.6+Math.sin(y*.05+t*.8)*.45)}SP.needsUpdate=true;sea.geometry.computeVertexNormals();
    TT.forEach((x,i)=>{x.rot.rotation.z=-t*1.2-i*.7});ak.kur(t,1.4,.55);
    const P=el.geometry.attributes.position.array,C=el.geometry.attributes.color.array;const on=sm(.25,.45,u);for(let i=0;i<900;i++){const tt=TT[i%16];const k=(t*.3+(i*.618)%1)%1;const a=tt.g.position;const p=V3(lerp(a.x,-150,k),1+Math.sin(k*3.14)*4,lerp(a.z,60,k));P.set([p.x,p.y,p.z],i*3);C.set([.15*on,.8*on,1*on],i*3)}el.geometry.attributes.position.needsUpdate=el.geometry.attributes.color.needsUpdate=true;
    orb(c,V3(lerp(0,-40,u),lerp(20,30,u),0),lerp(150,240,eio(u))*(YATAY?.8:1.05),lerp(.7,1.15,u),lerp(.12,.3,u))},veri(u){return u<.4?`KALDIRMA KUVVETİ<small>UÇAK KANADI GİBİ</small>`:u<.7?`JENERATÖR<small>DÖNÜŞ → ELEKTRİK</small>`:`ŞEBEKEYE<small>TRAFO · KABLO</small>`}}})();
// 7) FIRTINA MODU
S.koruma=(()=>{const sc=new THREE.Scene();const c=cam();const sky=gok(sc,"#10141c","#3a4250","#1a1d22");sc.fog=new THREE.Fog(L("#2a2f38"),40,320);isik(sc,"#c8d2e0",1.0,"#6FE3FF",.6);arazi(sc,"#2e3328");
  const T=turbin(12,false);sc.add(T.g);T.g.scale.setScalar(2.4);
  const yag=pts(2500,.25,true);sc.add(yag);const YD=[];for(let i=0;i<2500;i++)YD.push([(rnd()-.5)*120,rnd()*70,(rnd()-.5)*120,rnd()]);
  const sim=spr("#cfe6ff",160,0);sim.position.set(-60,80,-120);sc.add(sim);let ang=0;
  return{sc,c,ex:.7,bl:[.4,.5,.9],kur(u,t){const yon=sm(0,.35,u);T.yaw.rotation.y=lerp(-.9,0,eio(yon));const pit=sm(.45,.75,u);T.kanatlar.forEach(b=>b.rotation.y=pit*1.45);
    const hz=lerp(1.6,.05,sm(.5,.95,u));ang+=hz*.033;T.rot.rotation.z=-ang;
    const P=yag.geometry.attributes.position.array,C=yag.geometry.attributes.color.array;for(let i=0;i<2500;i++){const[x,y,z,ph]=YD[i];const k=(t*.9+ph)%1;P.set([x+k*14,70-k*70,z],i*3);C.set([.5,.6,.75],i*3)}yag.geometry.attributes.position.needsUpdate=yag.geometry.attributes.color.needsUpdate=true;
    const f=Math.sin(t*7.3)*Math.sin(t*2.1);sim.material.opacity=f>.93?(f-.93)*12:0;
    orb(c,V3(0,26,0),lerp(60,50,u)*(YATAY?.75:1.05),lerp(.4,1.0,u),lerp(.08,.16,u))},veri(u){return u<.4?`YÖN TAKİBİ<small>RÜZGÂRA DÖNER</small>`:u<.75?`KANAT AÇISI<small>RÜZGÂRI BOŞALTIR</small>`:`GÜVENLİ DURUŞ<small>ROTOR YAVAŞLAR</small>`}}})();
S.son={...S.hero,kur:(u,t)=>S.hero.kur(u,t,true)};

/* ======================= HUD ======================= */
const DIL=Q.get("dil")||"tr";
const BAS={hero:["","RÜZGÂR","ENERJİ ÜRETİM KAYNAKLARI · BÖLÜM 2"],ruzgar:["01","RÜZGÂR NASIL OLUŞUR","GÜNEŞ · ISINMA · HAVA AKIMI"],kanat:["02","KANAT","CAM ELYAF · KARBON · REÇİNE"],nasel:["03","NASEL","ANA MİL · DİŞLİ KUTUSU · JENERATÖR"],
  nakliye:["04","NAKLİYE","DEV KANATLAR YOLDA"],kurulum:["05","KURULUM","TEMEL · KULE · VİNÇ"],uretim:["06","ELEKTRİK","ROTOR → JENERATÖR → ŞEBEKE"],koruma:["07","FIRTINA MODU","YÖN · KANAT AÇISI · YAVAŞLAMA"],son:["","RÜZGÂR","SIRADA: SUYUN GÜCÜ"]};
if(DIL==="en")Object.assign(BAS,{hero:["","WIND","ENERGY SOURCES · EPISODE 2"],ruzgar:["01","HOW WIND FORMS","SUN · HEATING · AIRFLOW"],kanat:["02","BLADE","GLASS FIBER · CARBON · RESIN"],nasel:["03","NACELLE","MAIN SHAFT · GEARBOX · GENERATOR"],
  nakliye:["04","TRANSPORT","GIANT BLADES ON THE ROAD"],kurulum:["05","INSTALLATION","FOUNDATION · TOWER · CRANE"],uretim:["06","POWER","ROTOR → GENERATOR → GRID"],koruma:["07","STORM MODE","YAW · BLADE PITCH · SLOWDOWN"],son:["","WIND","NEXT: THE POWER OF WATER"]});
const SOZ={"SICAK HAVA ↑":"WARM AIR ↑","KARA ÇABUK ISINIR":"LAND HEATS FASTER","SERİN HAVA →":"COOL AIR →","RÜZGÂR = HAVA AKIMI":"WIND = AIRFLOW","CAM ELYAF":"GLASS FIBER","KATMAN KATMAN":"LAYER BY LAYER","KARBON":"CARBON","GÜÇLENDİRME":"REINFORCEMENT","REÇİNE":"RESIN","TEK PARÇA":"ONE PIECE","EN UZUN KANATLAR":"LONGEST BLADES",
  "ANA MİL":"MAIN SHAFT","YAVAŞ DÖNÜŞ":"SLOW ROTATION","DİŞLİ KUTUSU":"GEARBOX","DEVİR ARTIRIR":"RAISES SPEED","JENERATÖR":"GENERATOR","HAREKET → ELEKTRİK":"MOTION → ELECTRICITY","TEK KANAT":"ONE BLADE","BETON TEMEL":"CONCRETE BASE","YÜZLERCE TON":"HUNDREDS OF TONS","KULE":"TOWER","PARÇA PARÇA":"SECTION BY SECTION","NASEL":"NACELLE","VİNÇLE":"BY CRANE","3 KANAT":"3 BLADES",
  "KALDIRMA KUVVETİ":"LIFT","UÇAK KANADI GİBİ":"LIKE A WING","DÖNÜŞ → ELEKTRİK":"ROTATION → POWER","ŞEBEKEYE":"TO THE GRID","TRAFO · KABLO":"TRANSFORMER · CABLE","YÖN TAKİBİ":"YAW CONTROL","RÜZGÂRA DÖNER":"FACES THE WIND","KANAT AÇISI":"BLADE PITCH","RÜZGÂRI BOŞALTIR":"SPILLS THE WIND","GÜVENLİ DURUŞ":"SAFE STOP","ROTOR YAVAŞLAR":"ROTOR SLOWS"};
const ceviri=h=>{if(DIL==="tr")return h;let o=h;Object.keys(SOZ).sort((a,b)=>b.length-a.length).forEach(k=>{o=o.split(k).join(SOZ[k])});return o.replace(/(\d)([.,])(\d)/g,(m,x,p,y)=>x+(p==="."?",":".")+y)};
const SIRA=["ruzgar","kanat","nasel","nakliye","kurulum","uretim","koruma"],NS=SIRA.length;
const $=s=>document.getElementById(s);$("oku").textContent=DIL==="en"?"SUN → WIND → BLADE → NACELLE → TOWER → GRID":"GÜNEŞ → RÜZGÂR → KANAT → NASEL → KULE → ŞEBEKE";$("yol").innerHTML=SIRA.map(()=>"<i><s></s></i>").join("");
let sonBas="";function hud(ad,u){const b=BAS[ad];if(sonBas!==ad){sonBas=ad;$("bn").textContent=b[0]?`${DIL==="en"?"STEP":"ADIM"} ${b[0]} / ${String(NS).padStart(2,"0")}`:(DIL==="en"?"KOZMOS LAB · ENERGY SOURCES":"KOZMOS LAB · ENERJİ ÜRETİM KAYNAKLARI");$("bt").textContent=b[1];$("bs").textContent=b[2]}
  const gi=sm(0,.08,u);$("bas").style.opacity=gi;$("bas").style.transform=`translateY(${(1-gi)*2}vmin)`;
  const si=SIRA.indexOf(ad);[...$("yol").children].forEach((e,i)=>{e.className=(ad==="son"||i<si)?"done":"";e.firstChild.style.transform=i===si?`scaleX(${u})`:""});
  $("sayac").textContent=si>=0?`${String(si+1).padStart(2,"0")}/${String(NS).padStart(2,"0")}`:"";const S_=S[ad];$("veri").innerHTML=S_.veri?ceviri(S_.veri(u)):"";$("veri").style.opacity=S_.veri?sm(.05,.15,u):0}

/* ======================= ZAMAN ÇİZELGESİ ======================= */
let K={sahneler:["hero","ruzgar","kanat","nasel","nakliye","kurulum","uretim","koruma","son"].map((a,i)=>({ad:a,bas:i*5,son:i*5+5})),altyazi:[],gecis:"flas"};
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
