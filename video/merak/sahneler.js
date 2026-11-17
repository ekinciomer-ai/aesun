/* Kozmos Lab · Merak — sahne kütüphanesi. Her sahne: S.ad = () => ({sc, c, bl:[güç,yarıçap,eşik], exp, kur(o)})
   o: {t, u (blok 0-1), bt, dur, pi (bloktaki parça), pu (parça 0-1), pt, pd, p (parça ayarı), pp, pb, ev (parçadaki ekran olay zamanları)}
   Yeni sahne eklerken: kur() yalnız o'ya bakarak kareyi çizer (geri dönülebilir, kare kare kayıt). */
const S={};
(function(){
const {halka,dyazi,L,V3,cl,sm,lerp,eio,eo,eob,rnd,std,emi,bas,cam,orb,spr,pts,isik,uzay,yazi,cizgi,serit,olcu,gunes,dunya,jupiter,telefon,ekranTex,panel,izgara}=M;
const PI=Math.PI;

/* ---------- GÜNEŞ: açılış (söner) / kapanış (tutulma halkası) ---------- */
S.gunes=()=>{const sc=new THREE.Scene();const c=cam(46);const U=uzay(sc);const g=gunes(3);sc.add(g);
  const hl=halka(3);sc.add(hl);const sok=spr("#ffd9a0",4,0);sc.add(sok);
  const kv=new THREE.Mesh(new THREE.TorusGeometry(1,.012,8,160),bas("#6FE3FF",{transparent:true,opacity:0}));sc.add(kv);
  return{sc,c,bl:[.75,.55,.82],exp:.8,kur(o){const p=o.p,mod=p.mod||"son";
    if(mod==="son"){const an=p.an!==undefined?p.an:.62;const ts=o.pd*an;const k=1-sm(ts,ts+.6,o.pt);g.ayar(o.t,k);hl.ayar(o.t,0);
      const d=o.pt-ts;sok.material.opacity=d>0?Math.max(0,1-d/.45)*1.0:0;sok.scale.setScalar(5+Math.max(0,d)*26);
      kv.material.opacity=d>0?Math.max(0,1-d/1.4)*.9:0;kv.scale.setScalar(3.1+Math.max(0,d)*14);
      U.m.uniforms.k.value=lerp(.55,1.2,1-k);
      orb(c,V3(0,2.4,0),lerp(17,13,eio(o.pu)),lerp(1.35,1.6,o.pu),lerp(.06,.02,o.pu));kv.lookAt(c.position);hl.lookAt(c.position)}
    else{g.ayar(o.t,0);hl.ayar(o.t,sm(0,.25,o.pu));sok.material.opacity=0;kv.material.opacity=0;U.m.uniforms.k.value=1.2;
      orb(c,V3(0,2.6,0),lerp(19,16,eio(o.pu)),1.57,lerp(.02,.06,o.pu));hl.lookAt(c.position)}}}};

/* ---------- IŞIK YOLU: Güneş → Dünya (hız, mesafe, süre, son ışık) ---------- */
S.isik=()=>{const sc=new THREE.Scene();const c=cam(50);const U=uzay(sc);const SY=7.5,EY=-7.5;
  const g=gunes(1.9);g.position.y=SY;sc.add(g);const e=dunya(.75);e.position.y=EY;sc.add(e);
  const dl=new THREE.DirectionalLight(L("#fff3e0"),2.2);dl.position.set(0,SY,1);dl.target=e;sc.add(dl,dl.target);sc.add(new THREE.AmbientLight(L("#1a2440"),.25));
  const yol=cizgi([V3(0,SY-2.1,0),V3(0,EY+.95,0)],"#6FE3FF",.55,.25);sc.add(yol);
  const olc=olcu(V3(1.9,SY,0),V3(1.9,EY,0),"149,6 MİLYON KM","#F2C46B",{boy:.55,yer:V3(-.25,0,0),cent:.3});olc.children[3].center.set(1,.5);sc.add(olc);
  const ft=spr("#e9fbff",1.3,0);sc.add(ft);const iz=[];for(let i=0;i<14;i++){const s=spr("#6FE3FF",1-i*.05,0);sc.add(s);iz.push(s)}
  const sa=dyazi({boy:.75,renk:"#F2C46B",sol:true,gen:6});sc.add(sa);
  const N=900,ps=pts(N,.07);sc.add(ps);const P=ps.geometry.attributes.position.array,C=ps.geometry.attributes.color.array;const D=[];for(let i=0;i<N;i++){const u=rnd()*2-1,a=rnd()*6.283,s=Math.sqrt(1-u*u);D.push([Math.cos(a)*s,u,Math.sin(a)*s,rnd()])}
  const kab=new THREE.Mesh(new THREE.SphereGeometry(1,64,48),new THREE.ShaderMaterial({transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,uniforms:{k:{value:0}},
    vertexShader:"varying vec3 vN,vV;void main(){vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}",
    fragmentShader:"uniform float k;varying vec3 vN,vV;void main(){float f=pow(1.-abs(dot(vN,vV)),3.);gl_FragColor=vec4(vec3(1.,.85,.55)*f*2.2*k,f*k);}"}));kab.position.y=SY;sc.add(kab);
  return{sc,c,bl:[1.0,.55,.6],kur(o){const mod=o.p.mod||"hiz";const t=o.t;e.ayar(t,{rot:2.2});
    let foton=-1,k=1,kabR=0;
    if(mod==="hiz"){foton=eio(sm(.25,1,o.pu))*.18;
      for(let i=0;i<N;i++){const[x,y,z,ph]=D[i];const r=2+((t*1.6+ph*12)%12);P.set([x*r,SY+y*r,z*r],i*3);const f=(1-(r-2)/12)*.8;C.set([f,f*.9,f*.7],i*3)}ps.visible=true;
      orb(c,V3(0,SY-1.5,0),lerp(9,11,o.pu),1.1+o.pu*.3,.05);olc.ilerle(0)}
    else if(mod==="mesafe"){ps.visible=false;foton=.18;olc.ilerle(sm(.05,.75,o.pu));orb(c,V3(0,0.6,0),lerp(17,24,eio(sm(0,.6,o.pu))),1.45,.06)}
    else if(mod==="sure"){ps.visible=false;olc.ilerle(1);foton=lerp(.18,1,eio(sm(.05,.92,o.pu)));const fy=lerp(SY-2.1,EY+.95,foton);
      orb(c,V3(0,fy-2.6,0),lerp(11,13,o.pu),1.25,.08)}
    else{// son: güneş söndü, son ışık kabuğu hâlâ yolda
      ps.visible=false;olc.ilerle(1);k=1-sm(0,.12,o.pu);kabR=lerp(2.2,(SY-EY)+1.5,sm(.08,.9,o.pu));orb(c,V3(0,.6,0),lerp(24,22,o.pu),1.45+o.pu*.1,.06)}
    g.ayar(t,k);kab.scale.setScalar(Math.max(.01,kabR));kab.material.uniforms.k.value=kabR>0?.9:0;
    const gecti=kabR>(SY-EY)-.7;dl.intensity=mod==="son"?(gecti?lerp(2.2,0,sm(0,.06,o.pu-.88)):2.2):2.2;
    if(foton>=0&&mod!=="son"){const fy=lerp(SY-2.1,EY+.95,foton);ft.position.set(0,fy,0);ft.material.opacity=1;ft.scale.setScalar(1.1+Math.sin(t*20)*.15);
      iz.forEach((s,i)=>{s.position.set(0,fy+i*.12,0);s.material.opacity=(1-i/14)*.7});
      sa.visible=mod==="sure";const sn=Math.round(499*sm(.18,1,foton));sa.set(String(Math.floor(sn/60)).padStart(2,"0")+":"+String(sn%60).padStart(2,"0"));sa.position.set(.6,fy,0)}
    else{ft.material.opacity=0;iz.forEach(s=>s.material.opacity=0);sa.visible=false}
    yol.material.opacity=mod==="son"?.25:.55}}};

/* ---------- YÖRÜNGE: kütleçekim ışık hızında, sonra Dünya teğetten fırlar ---------- */
S.yorunge=()=>{const sc=new THREE.Scene();const c=cam(50);uzay(sc);const R=7;
  const g=gunes(1.4);sc.add(g);const e=dunya(.55);sc.add(e);sc.add(new THREE.AmbientLight(L("#3a4a70"),.6));const dl=new THREE.PointLight(L("#9fc4ff"),.8,0,0);dl.position.set(0,6,8);sc.add(dl);
  const yr=[];for(let i=0;i<=200;i++){const a=i/200*6.283;yr.push(V3(Math.cos(a)*R,0,Math.sin(a)*R))}const yol=cizgi(yr,"#6FE3FF",.35,.18);sc.add(yol);
  const iz=izgara(sc,40,40,"#6FE3FF",.07);iz.position.y=-.6;
  const dal=new THREE.Mesh(new THREE.TorusGeometry(1,.035,8,200),bas("#9fe9ff",{transparent:true,opacity:0,blending:THREE.AdditiveBlending}));dal.rotation.x=PI/2;sc.add(dal);
  const dal2=new THREE.Mesh(new THREE.RingGeometry(.97,1,200),bas("#6FE3FF",{transparent:true,opacity:0,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}));dal2.rotation.x=-PI/2;sc.add(dal2);
  const ok=new THREE.Group();const okc=serit(V3(0,0,0),V3(1,0,0),.035,emi("#F2C46B",2.5));const okb=new THREE.Mesh(new THREE.ConeGeometry(.14,.4,16),emi("#F2C46B",2.5));okb.rotation.z=-PI/2;okb.position.x=1.1;ok.add(okc,okb);sc.add(ok);
  const hiz=new THREE.Object3D();hiz.material={opacity:0};
  const izN=60,izp=pts(izN,.18);sc.add(izp);
  const w=.32,a0=-.4;
  return{sc,c,bl:[.9,.5,.62],kur(o){const t=o.t;g.ayar(t,0);e.ayar(t,{rot:1});
    const p0=o.pb[1]!==undefined?o.pb[1]:o.dur; // kaçış başlangıcı (blok zamanı)
    const ang=a0+w*Math.min(o.bt,p0);const P0=V3(Math.cos(ang)*R,0,Math.sin(ang)*R);const T=V3(-Math.sin(ang),0,Math.cos(ang));
    let pos=P0.clone();if(o.bt>p0)pos.addScaledVector(T,(o.bt-p0)*w*R);e.position.copy(pos);
    // kütleçekim dalgası: ilk parça boyunca merkezden Dünya'ya ulaşır
    const dk=o.pi===0?sm(.05,.95,o.pu):1;const dr=Math.max(.01,dk*R);dal.scale.setScalar(dr);dal2.scale.setScalar(dr);
    dal.material.opacity=o.pi===0?.95*(1-sm(.93,1,o.pu)):0;dal2.material.opacity=o.pi===0?.25:0;
    const kac=o.bt>p0;ok.visible=hiz.visible=kac||o.pi===1;ok.position.copy(pos).addScaledVector(V3(0,1,0),.0);ok.rotation.y=-Math.atan2(T.z,T.x);const ol=eo(cl((o.bt-p0)/.6))*1.6;ok.scale.set(Math.max(.01,ol),1,1);
    hiz.position.copy(pos).add(V3(0,1.05,0));hiz.material.opacity=sm(.2,.6,o.bt-p0);
    const IP=izp.geometry.attributes.position.array,IC=izp.geometry.attributes.color.array;for(let i=0;i<izN;i++){const tb=o.bt-i*.12;let q;const aa=a0+w*Math.min(tb,p0);q=V3(Math.cos(aa)*R,0,Math.sin(aa)*R);if(tb>p0)q.addScaledVector(T,(tb-p0)*w*R);IP.set([q.x,q.y,q.z],i*3);const f=(1-i/izN)*.6*(tb>0?1:0);IC.set([f*.5,f*.9,f],i*3)}
    izp.geometry.attributes.position.needsUpdate=izp.geometry.attributes.color.needsUpdate=true;
    const hedef=o.pi===0?V3(0,0,1.2):pos.clone().multiplyScalar(.85);const d=o.pi===0?lerp(21,19,o.pu):lerp(15,17,o.pu);orb(c,hedef,d,1.35+o.bt*.02,lerp(1.0,.85,o.u))}}};

/* ---------- JÜPİTER: son ışığı en geç bırakan (dikey yerleşim: Jüpiter üstte, Güneş ortada, Dünya altta) ---------- */
S.jupiter=()=>{const sc=new THREE.Scene();const c=cam(50);uzay(sc);const g=gunes(1.0);g.position.set(-1.2,0,0);sc.add(g);
  const SJ=V3(1.4,4.6,-3),SE=V3(-.6,-3.4,2.5);const e=dunya(.5);e.position.copy(SE);sc.add(e);const j=jupiter(1.5);j.position.copy(SJ);sc.add(j);
  sc.add(new THREE.AmbientLight(L("#2a3550"),.3));const dl=new THREE.DirectionalLight(L("#fff1d6"),2.6);dl.position.copy(g.position);dl.target=j;sc.add(dl,dl.target);
  const G=g.position;const y1=cizgi([G.clone().lerp(SJ,.12),G.clone().lerp(SJ,.84)],"#F2C46B",.85,.2),y2=cizgi([SJ.clone().lerp(SE,.15),SE.clone().lerp(SJ,.07)],"#6FE3FF",.9,.2);sc.add(y1,y2);
  const f=spr("#ffffff",.7,0);sc.add(f);const fj=spr("#ffe7b0",5.5,0);fj.position.copy(SJ);sc.add(fj);
  const l1=yazi("43 DK",{boy:.62,renk:"#F2C46B"});l1.position.copy(G.clone().lerp(SJ,.5)).add(V3(-1.1,0,0));sc.add(l1);
  const l2=yazi("33+ DK",{boy:.62,renk:"#6FE3FF"});l2.position.copy(SJ.clone().lerp(SE,.55)).add(V3(1.35,0,0));sc.add(l2);
  const ej=yazi("JÜPİTER",{boy:.5});ej.position.copy(SJ).add(V3(0,2.1,0));sc.add(ej);const ed=yazi("DÜNYA",{boy:.42});ed.position.copy(SE).add(V3(0,-1.0,0));sc.add(ed);
  return{sc,c,bl:[.9,.55,.65],kur(o){const t=o.t;g.ayar(t,0);e.ayar(t,{rot:3,atm:.5});j.ayar(t,.05);
    const a=sm(.05,.42,o.pu),b=sm(.42,.82,o.pu);y1.ilerle(a);y2.ilerle(b);l1.material.opacity=sm(.25,.4,o.pu);l2.material.opacity=sm(.65,.8,o.pu);
    const fp=o.pu<.42?G.clone().lerp(SJ,a):SJ.clone().lerp(SE,b);f.position.copy(fp);f.material.opacity=o.pu<.84?1:0;f.scale.setScalar(.6+Math.sin(t*18)*.1);
    fj.material.opacity=.3+.08*Math.sin(t*2);
    orb(c,V3(0,.9,0),lerp(21,18.5,eio(o.pu)),lerp(1.38,1.62,o.pu),lerp(.16,.08,o.pu))}}};

/* ---------- DONMA: Dünya buz tutar ---------- */
S.donma=()=>{const sc=new THREE.Scene();const c=cam(46);uzay(sc);const e=dunya(1.7);sc.add(e);
  const dl=new THREE.DirectionalLight(L("#bcd4ff"),.9);dl.position.set(-5,3,4);sc.add(dl);sc.add(new THREE.AmbientLight(L("#1a2a48"),.45));
  const N=420,ps=pts(N,.05);sc.add(ps);const P=ps.geometry.attributes.position.array,C=ps.geometry.attributes.color.array;const D=[];for(let i=0;i<N;i++){const u=rnd()*2-1,a=rnd()*6.283,s=Math.sqrt(1-u*u);D.push([Math.cos(a)*s,u,Math.sin(a)*s,rnd()])}
  return{sc,c,bl:[.7,.5,.72],exp:.78,kur(o){const k=sm(.05,.9,o.pu);e.ayar(o.t,{rot:1.3,buz:k*.8,atm:1-k*.75});dl.intensity=lerp(1.1,.55,k);dl.color=L("#ffffff").lerp(L("#9cc0ff"),k);
    for(let i=0;i<N;i++){const[x,y,z,ph]=D[i];const r=1.74;const tw=Math.max(0,Math.sin(o.t*3+ph*30))*k;P.set([x*r,y*r,z*r],i*3);C.set([tw*.6,tw*.85,tw],i*3)}ps.rotation.y=o.t*.08+1.3;ps.geometry.attributes.position.needsUpdate=ps.geometry.attributes.color.needsUpdate=true;
    orb(c,V3(0,.9,0),lerp(9.2,8.2,eio(o.pu)),1.5+o.pu*.25,lerp(.2,.1,o.pu))}}};

/* ================= ENERJİ SAHNELERİ (panel, gün, enerji, telefon, ızgara, santral) ================= */
function studyo(sc,ust="#0b1a33",alt="#02040a"){const m=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{u:{value:L(ust)},a:{value:L(alt)}},
  vertexShader:"varying vec3 v;void main(){v=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
  fragmentShader:"uniform vec3 u,a;varying vec3 v;void main(){float h=clamp(v.y*.5+.5,0.,1.);gl_FragColor=vec4(mix(a,u,pow(h,1.6)),1.);}"});sc.add(new THREE.Mesh(new THREE.SphereGeometry(600,32,16),m));
  const z=new THREE.Mesh(new THREE.CircleGeometry(60,64),std("#070b14",.5,.6,{envMapIntensity:.25}));z.rotation.x=-PI/2;sc.add(z);const g=izgara(sc,60,60,"#6FE3FF",.09);g.position.y=.002;sc.fog=new THREE.FogExp2(L(alt),.035);return m}
const POZ={soru:{p:[0,1.7,0],r:[.25,0,.0],cam:[8.4,1.55,.14,2.75]},olcu:{p:[0,1.75,0],r:[0,0,0],cam:[7.9,1.57,.04,1.3]},isin:{p:[0,1.3,0],r:[-.75,0,0],cam:[7.4,1.2,.3,.55]},sonuc:{p:[0,1.7,0],r:[.25,0,0],cam:[8.4,1.55,.14,.9]}};
S.panel=()=>{const sc=new THREE.Scene();const c=cam(46);studyo(sc);isik(sc,"#ffffff",2.4,"#6FE3FF",1.6);const pn=panel();sc.add(pn);
  const tel=[];for(let i=0;i<10;i++){const t=telefon();t.scale.setScalar(.42);sc.add(t);t.ekran.ciz(.15+.08*i,"");tel.push(t)}
  const w=yazi("1,13 m",{boy:.32,renk:"#F2C46B"}),hh=yazi("2,28 m",{boy:.32,renk:"#F2C46B"});
  const oW=olcu(V3(-.565,-1.3,0),V3(.565,-1.3,0),"",{},{}),oH=olcu(V3(.8,-1.14,0),V3(.8,1.14,0),"","#F2C46B",{});pn.add(oW,oH,w,hh);w.position.set(0,-1.52,0);hh.position.set(1.12,0,0);
  [oW,oH].forEach(o=>o.children[3].visible=false);
  const sun=spr("#ffe2a8",6,0);sun.position.set(-6,8,4);sc.add(sun);const sun2=spr("#ffffff",1.6,0);sun2.position.copy(sun.position);sc.add(sun2);
  const NI=700,ip=pts(NI,.07);sc.add(ip);const IP=ip.geometry.attributes.position.array,IC=ip.geometry.attributes.color.array;const ID=[];for(let i=0;i<NI;i++)ID.push([rnd(),rnd(),rnd(),rnd()<.21]);
  const kab=cizgi([V3(0,.95,-.06),V3(0,.6,-.4),V3(.2,-.4,-.7),V3(.6,-1.3,-.6)].map(v=>v),"#6FE3FF",.0);
  let onceki=null;
  return{sc,c,bl:[.8,.5,.78],kur(o){const t=o.t,mod0=o.p.mod||"soru",mod=o.p.son?"sonuc":mod0;const P=POZ[mod];const pm=o.pi>0?(o.pp[o.pi-1].mod||"soru"):mod;const Q=POZ[pm];const k=o.pi>0?eio(cl(o.pt/.9)):1;
    const lp=(a,b)=>a.map((x,i)=>lerp(x,b[i],k));const pp=lp(Q.p,P.p),pr=lp(Q.r,P.r),pc=lp(Q.cam,P.cam);
    pn.position.set(pp[0],pp[1]+Math.sin(t*1.2)*.03,pp[2]);pn.rotation.set(pr[0],pr[1]+(mod==="soru"?Math.sin(t*.5)*.5:0),pr[2]);
    // telefon halkası
    const ts=(mod==="soru"||mod==="sonuc")?1:1-k;tel.forEach((ph,i)=>{const a=i/10*6.283+t*.35;ph.position.set(Math.cos(a)*2.3,1.7+Math.sin(a*2+t)*.35,Math.sin(a)*2.3);ph.rotation.set(0,-a+PI/2,Math.sin(t+i)*.15);ph.visible=ts>.02;ph.scale.setScalar(.42*ts)});
    // ölçüler
    const ok=mod==="olcu"?sm(.15,.7,o.pu):mod==="isin"?1-k:0;oW.ilerle(ok);oH.ilerle(ok);w.material.opacity=hh.material.opacity=sm(.6,1,ok);
    // ışınlar
    const ik=mod==="isin"?k:0;sun.material.opacity=.9*ik;sun2.material.opacity=ik;ip.visible=ik>0;
    if(ik>0){const n=V3(0,0,1).applyEuler(pn.rotation);const up=V3(0,1,0).applyEuler(pn.rotation),rt=V3(1,0,0).applyEuler(pn.rotation);
      for(let i=0;i<NI;i++){const[a,b,ph,el]=ID[i];const q=(t*.55+ph)%1;const hit=pn.position.clone().addScaledVector(rt,(a-.5)*1.0).addScaledVector(up,(b-.5)*2.1);let x;
        if(q<.5){x=sun.position.clone().lerp(hit,q/.5);const f=.9*ik;IC.set([f,f*.85,f*.55],i*3)}
        else{const r=(q-.5)/.5;if(el){x=hit.clone().lerp(pn.position.clone().addScaledVector(up,.95).addScaledVector(n,-.08),r);x.addScaledVector(n,-.05);IC.set([.25*ik,.9*ik,1.2*ik],i*3)}
          else{x=hit.clone().addScaledVector(n,r*1.6).add(V3((a-.5)*r,r*1.2,0));const f=(1-r)*ik;IC.set([1.1*f,.42*f,.12*f],i*3)}}
        IP.set([x.x,x.y,x.z],i*3)}ip.geometry.attributes.position.needsUpdate=ip.geometry.attributes.color.needsUpdate=true}
    orb(c,V3(0,pc[3],0),pc[0],pc[1]+(mod==="soru"?Math.sin(t*.2)*.15:0),pc[2])}}};

/* gün boyu güneş: 1 m²'ye düşen enerji */
S.gun=()=>{const sc=new THREE.Scene();const c=cam(46);const gk=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{h:{value:0}},
   vertexShader:"varying vec3 v;void main(){v=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
   fragmentShader:"uniform float h;varying vec3 v;void main(){float y=clamp(v.y,0.,1.);vec3 gece=vec3(.01,.02,.06),gun=mix(vec3(.30,.55,.95),vec3(.05,.18,.48),pow(y,.6)),saf=mix(vec3(1.,.48,.18),vec3(.12,.12,.35),pow(y,.5));float d=smoothstep(0.,.35,h);vec3 c=mix(saf,gun,d);c=mix(gece,c,smoothstep(-.1,.08,h));gl_FragColor=vec4(c*.75,1.);}"});
  sc.add(new THREE.Mesh(new THREE.SphereGeometry(500,32,16),gk));const z=new THREE.Mesh(new THREE.CircleGeometry(40,64),std("#24301f",0,.95,{envMapIntensity:.1}));z.rotation.x=-PI/2;sc.add(z);
  const ic=new THREE.Mesh(new THREE.BoxGeometry(1,.04,1),std("#0f1830",.3,.35));ic.position.y=.02;sc.add(ic);const cv=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1,.06,1)),new THREE.LineBasicMaterial({color:L("#6FE3FF")}));cv.position.y=.03;sc.add(cv);
  const m2=yazi("1 m²",{boy:.32,renk:"#6FE3FF"});m2.position.set(0,.35,.8);sc.add(m2);
  const sun=spr("#fff0c8",4,1);sc.add(sun);const sc2=spr("#ffffff",.9,1);sc.add(sc2);const dl=new THREE.DirectionalLight(L("#fff1dc"),2);sc.add(dl);sc.add(new THREE.AmbientLight(L("#304060"),.35));
  const bar=new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,1,40),emi("#F2C46B",1.6));sc.add(bar);const cam_=new THREE.Mesh(new THREE.CylinderGeometry(.26,.26,2.6,40,1,true),new THREE.MeshPhysicalMaterial({color:L("#cfe9ff"),roughness:.1,transmission:.9,transparent:true,opacity:.35,envMap:M.ENV,side:THREE.DoubleSide}));cam_.position.set(1.4,1.3,0);sc.add(cam_);
  const sa=M.dyazi({boy:.36,renk:"#F3F5FA",gen:6});sa.position.set(-1.25,1.6,0);sc.add(sa);
  const yay=[];for(let i=0;i<=80;i++){const a=i/80*PI;yay.push(V3(-Math.cos(a)*5.5,Math.sin(a)*4.2,-2.5))}const yc=cizgi(yay,"#F2C46B",.35,.12);sc.add(yc);
  const ray=[];for(let i=0;i<14;i++){const l=cizgi([V3(0,0,0),V3(0,0,0)],"#ffe3a0",.0);sc.add(l);ray.push(l)}
  return{sc,c,bl:[.8,.5,.8],exp:.85,kur(o){const d=sm(.04,.96,o.pu);const a=d*PI;const sp=V3(-Math.cos(a)*5.5,Math.sin(a)*4.2,-2.5);sun.position.copy(sp);sc2.position.copy(sp);
    const hgt=Math.sin(a);gk.uniforms.h.value=hgt*.9-.02;dl.position.copy(sp);dl.intensity=2.4*sm(0,.2,hgt);sun.material.opacity=sm(-.05,.1,hgt);sc2.material.opacity=sun.material.opacity;
    // enerji: sin eğrisi integrali → 4,2
    const e=(1-Math.cos(a))/2;bar.scale.y=Math.max(.001,e*2.4);bar.position.set(1.4,.05+bar.scale.y/2,0);
    const saat=6+d*12;sa.set(String(Math.floor(saat)).padStart(2,"0")+":"+String(Math.floor((saat%1)*60)).padStart(2,"0"));
    ray.forEach((l,i)=>{const q=V3((i%4-1.5)*.25,0.06,(Math.floor(i/4)-1.5)*.25);const fr=(o.t*.9+i*.37)%1;const p0=sp.clone().lerp(q,fr*.85);const p1=sp.clone().lerp(q,Math.min(1,fr*.85+.12));l.geometry.setFromPoints([p0,p1]);l.material.opacity=.8*sm(0,.25,hgt)});
    orb(c,V3(.2,-.3,0),lerp(9.6,8.6,eio(o.pu)),1.3+o.pu*.25,lerp(.34,.28,o.pu))}}};

/* enerji bataryası: 2.310 Wh → kayıplar → ~2.000 Wh */
S.enerji=()=>{const sc=new THREE.Scene();const c=cam(46);studyo(sc,"#0c1a30");isik(sc,"#ffffff",2,"#6FE3FF",1.4);
  const gm=new THREE.MeshPhysicalMaterial({color:L("#d8f0ff"),roughness:.06,transmission:.92,transparent:true,opacity:.4,envMap:M.ENV,envMapIntensity:1.2,side:THREE.DoubleSide});
  const H=3.2;const tup=new THREE.Mesh(new THREE.CylinderGeometry(.9,.9,H,64,1,true),gm);tup.position.y=H/2+.1;sc.add(tup);
  const kap=new THREE.Mesh(new THREE.CylinderGeometry(.92,.92,.14,64),std("#b9c0ca",.9,.3));kap.position.y=H+.17;sc.add(kap);const tab=new THREE.Mesh(new THREE.CylinderGeometry(.3,.3,.16,32),std("#d8dde4",.9,.25));tab.position.y=H+.32;sc.add(tab);
  const alt=kap.clone();alt.position.y=.05;sc.add(alt);
  const sv=new THREE.Mesh(new THREE.CylinderGeometry(.86,.86,1,64),emi("#2fd3ff",1.25,{transparent:true,opacity:.9}));sc.add(sv);
  const parcalar=[["KABLO","#FF6A4D"],["ISI","#FF9A3A"],["İNVERTER","#F2C46B"]].map(([ad,h],i)=>{const g=new THREE.Group();const m=new THREE.Mesh(new THREE.CylinderGeometry(.86,.86,.14,64,1,false,i*2.094,2.094),emi(h,1.4,{transparent:true}));g.add(m);
    const y=yazi(ad,{boy:.3,renk:h});y.position.set(Math.cos(-(i*2.094+1.047)+PI/2)*1.5,0,Math.sin(-(i*2.094+1.047)+PI/2)*1.5);g.add(y);sc.add(g);g.m=m;g.y=y;return g});
  const ust=M.dyazi({boy:.42,renk:"#F3F5FA",gen:9});sc.add(ust);
  const N=300,ps=pts(N,.06);sc.add(ps);const P=ps.geometry.attributes.position.array,C=ps.geometry.attributes.color.array;const D=[];for(let i=0;i<N;i++)D.push([rnd()*6.283,rnd(),rnd()]);
  return{sc,c,bl:[.85,.5,.75],kur(o){const t=o.t;const f1=eio(sm(.02,.42,o.pu));const kop=sm(.5,.85,o.pu);const sev=2310*f1-310*kop;const hy=(sev/2400)*H;
    sv.scale.y=Math.max(.001,hy);sv.position.y=.12+hy/2;
    parcalar.forEach((g,i)=>{const d=cl((kop*1.25)-i*.12);g.position.set(Math.cos(i*2.094+1)*d*1.2,.12+(2310/2400)*H+.07+d*1.4-d*d*3.5,Math.sin(i*2.094+1)*d*1.2);g.rotation.set(d*1.2,d*2,0);g.visible=o.pu>.42&&d<.98;g.m.material.opacity=1-sm(.6,1,d);g.y.material.opacity=sm(.0,.15,d)*(1-sm(.7,1,d))});
    ust.set(Math.round(sev).toLocaleString("tr-TR")+" Wh");ust.position.set(0,H+.8,0);
    for(let i=0;i<N;i++){const[a,ph,r]=D[i];const q=(t*.3+ph)%1;const yy=.15+q*hy;P.set([Math.cos(a+t)*.75*r,yy,Math.sin(a+t)*.75*r],i*3);const f=Math.sin(q*PI)*.9;C.set([f*.4,f*.9,f*1.1],i*3)}ps.geometry.attributes.position.needsUpdate=ps.geometry.attributes.color.needsUpdate=true;
    orb(c,V3(0,1.25,0),lerp(11,10,eio(o.pu)),1.1+o.pu*.5,lerp(.3,.22,o.pu))}}};

/* telefon: 0 → %100 dolum */
S.telefon=()=>{const sc=new THREE.Scene();const c=cam(42);studyo(sc,"#0c1730");isik(sc,"#ffffff",2.2,"#6FE3FF",1.8);const ph=telefon();ph.scale.setScalar(1.12);sc.add(ph);
  const l1=yazi("5.000 mAh",{boy:.34,renk:"#6FE3FF"}),l2=yazi("3,85 V",{boy:.34,renk:"#F2C46B"}),l3=yazi("19 Wh",{boy:.42,renk:"#F3F5FA"});
  const kb=serit(V3(0,-1.6,0),V3(0,-6,0),.03,std("#e8eaee",.1,.5));sc.add(kb);
  const N=160,ps=pts(N,.07);sc.add(ps);const P=ps.geometry.attributes.position.array,C=ps.geometry.attributes.color.array;
  return{sc,c,bl:[.8,.5,.8],kur(o){const t=o.t;const k=eio(sm(.05,.95,o.pu));ph.position.set(0,2.05+Math.sin(t*1.1)*.05,0);ph.rotation.set(-.08,Math.sin(t*.45)*.45,0);ph.ekran.ciz(k);
    kb.scale.y=4.4;kb.position.y=2.05-.86-2.2;
    l3.material.opacity=sm(.35,.45,o.pu);
    for(let i=0;i<N;i++){const q=(t*.8+i/N)%1;P.set([Math.sin(i*7.1)*.03,-2.2+q*3.4,Math.cos(i*3.3)*.03],i*3);const f=Math.sin(q*PI)*1.0*(1-sm(.95,1,o.pu));C.set([f*.3,f,f*.6],i*3)}ps.geometry.attributes.position.needsUpdate=ps.geometry.attributes.color.needsUpdate=true;
    orb(c,V3(0,1.25,0),lerp(7.6,7.0,eio(o.pu)),1.57+Math.sin(o.t*.3)*.12,lerp(.12,.06,o.pu))}}};

/* 85 telefon ızgarası */
S.izgara=()=>{const sc=new THREE.Scene();const c=cam(46);studyo(sc,"#0b1630");isik(sc,"#ffffff",2.2,"#6FE3FF",1.5);
  const N=85,KOL=9;const gov=new THREE.InstancedMesh(M.yuvarlakKutu(.72,1.5,.06,.1),std("#1d2129",.85,.32,{envMapIntensity:1.1}),N);const ek=new THREE.InstancedMesh(new THREE.PlaneGeometry(.66,1.42),new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false}),N);
  sc.add(gov,ek);gov.frustumCulled=ek.frustumCulled=false;const m4=new THREE.Matrix4();const POS=[];
  for(let i=0;i<N;i++){const r=Math.floor(i/KOL),cc=i%KOL;const x=(cc-(KOL-1)/2)*.95,y=0,z=r*1.7;POS.push(V3(x,.02,z-4.5))}
  const pn=panel();pn.scale.setScalar(1.25);sc.add(pn);
  const sayac=M.dyazi({boy:.6,renk:"#4dffa0",gen:4});sc.add(sayac);
  const N2=260,ps=pts(N2,.07);sc.add(ps);const P=ps.geometry.attributes.position.array,C=ps.geometry.attributes.color.array;
  return{sc,c,bl:[.9,.5,.75],kur(o){const t=o.t;const t0=(o.ev[1]!==undefined?o.ev[1]:o.pd*.4);const sure=2.2;const say=Math.round(N*eo(cl((o.pt-t0)/sure)));
    const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(-PI/2,0,0));const col=new THREE.Color();
    for(let i=0;i<N;i++){const p=POS[i];const ap=eob(cl((o.pt-.05-i*.012)/.4));m4.compose(p.clone().setY(.03+(1-ap)*.6),q,V3(ap,ap,ap));gov.setMatrixAt(i,m4);m4.compose(p.clone().setY(.072+(1-ap)*.6),q,V3(ap,ap,ap));ek.setMatrixAt(i,m4);
      const on=i<say;col.copy(on?L("#3dff9a"):L("#0d1a33"));if(on)col.multiplyScalar(1.4);ek.setColorAt(i,col)}
    gov.instanceMatrix.needsUpdate=ek.instanceMatrix.needsUpdate=true;ek.instanceColor.needsUpdate=true;
    pn.position.set(0,2.2,-7.4);pn.rotation.set(-.5,0,0);sayac.set(String(say));sayac.position.set(0,4.3,-7.4);sayac.material.opacity=sm(t0-.2,t0,o.pt);
    for(let i=0;i<N2;i++){const tgt=POS[i%N];const q=(t*.7+i/N2)%1;const a=V3(0,2.2,-7.0),b=tgt;const x=a.clone().lerp(b,q);x.y+=Math.sin(q*PI)*2.2;P.set([x.x,x.y,x.z],i*3);const f=Math.sin(q*PI)*.9*((i%N)<say||o.pt<t0?1:.25);C.set([f*.3,f,f*.6],i*3)}ps.geometry.attributes.position.needsUpdate=ps.geometry.attributes.color.needsUpdate=true;
    orb(c,V3(0,0,lerp(-1,1.6,eio(o.pu))),lerp(10,19,eio(o.pu)),1.57,lerp(.75,1.05,eio(o.pu)))}}};

/* 1 MW güneş santrali: ~1.818 panel */
S.santral=()=>{const sc=new THREE.Scene();const c=cam(46);const gk=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,vertexShader:"varying vec3 v;void main(){v=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
   fragmentShader:"varying vec3 v;void main(){float y=clamp(v.y,0.,1.);vec3 c=mix(vec3(1.,.62,.32),vec3(.08,.14,.32),pow(y,.45));gl_FragColor=vec4(c*.8,1.);}"});sc.add(new THREE.Mesh(new THREE.SphereGeometry(800,32,16),gk));
  sc.fog=new THREE.Fog(L("#a9b4c6"),90,340);const z=new THREE.Mesh(new THREE.PlaneGeometry(600,600),std("#4a4a34",0,.95,{envMapIntensity:.1}));z.rotation.x=-PI/2;sc.add(z);
  const dl=new THREE.DirectionalLight(L("#ffd7a8"),2.6);dl.position.set(-30,22,-40);sc.add(dl);sc.add(new THREE.HemisphereLight(L("#9fb7e0"),L("#3a3020"),.7));
  const sun=spr("#ffd59a",40,.9);sun.position.set(-160,60,-240);sc.add(sun);
  const SIRA=18,KOL=101,N=SIRA*KOL;const g=new THREE.BoxGeometry(1.13,.035,2.28);const ptx=M.panel().children[0].material[4].map;
  const mats=[std("#b8bec8",.9,.3),std("#b8bec8",.9,.3),new THREE.MeshPhysicalMaterial({map:ptx,roughness:.2,metalness:.15,clearcoat:1,clearcoatRoughness:.08,envMap:M.ENV,envMapIntensity:1.1}),std("#cfd3d8",0,.8),std("#b8bec8",.9,.3),std("#b8bec8",.9,.3)];
  const im=new THREE.InstancedMesh(g,mats,N);im.frustumCulled=false;sc.add(im);const m4=new THREE.Matrix4();const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(.45,0,0));
  for(let r=0;r<SIRA;r++)for(let k=0;k<KOL;k++){const i=r*KOL+k;m4.compose(V3((k-(KOL-1)/2)*1.16,1.25,(r-(SIRA-1)/2)*5.2),q,V3(1,1,1));im.setMatrixAt(i,m4)}
  const ayak=new THREE.InstancedMesh(new THREE.BoxGeometry(.06,1.3,.06),std("#8d939c",.8,.4),SIRA*26);ayak.frustumCulled=false;sc.add(ayak);let ai=0;for(let r=0;r<SIRA;r++)for(let k=0;k<26;k++){m4.compose(V3((k*4-50)*1.16,.62,(r-(SIRA-1)/2)*5.2),new THREE.Quaternion(),V3(1,1,1));ayak.setMatrixAt(ai++,m4)}
  const kosk=new THREE.Mesh(new THREE.BoxGeometry(4,2.6,2.4),std("#e9ecef",.1,.6));kosk.position.set(0,1.3,(SIRA/2)*5.2+6);sc.add(kosk);
  return{sc,c,bl:[.55,.5,.85],exp:.9,kur(o){const k=eio(o.pu);c.position.set(lerp(-26,6,k),lerp(10,58,k),lerp(62,78,k));c.lookAt(lerp(-6,0,k),0,lerp(26,-4,k))}}};
})();
