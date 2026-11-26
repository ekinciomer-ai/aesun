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
      orb(c,V3(0,2.6,0),lerp(M.T.acik?24:17,M.T.acik?19:13,eio(o.pu)),lerp(1.35,1.6,o.pu),lerp(.06,.02,o.pu));kv.lookAt(c.position);hl.lookAt(c.position)}
    else{g.ayar(o.t,0);hl.ayar(o.t,sm(0,.25,o.pu));sok.material.opacity=0;kv.material.opacity=0;U.m.uniforms.k.value=1.2;
      orb(c,V3(0,M.T.acik?-1.2:2.6,0),lerp(M.T.acik?26:19,M.T.acik?22:16,eio(o.pu)),1.57,lerp(.02,.06,o.pu));hl.lookAt(c.position)}}}};

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
  const A=M.T.acik;const z=new THREE.Mesh(new THREE.CircleGeometry(60,64),A?new THREE.MeshLambertMaterial({color:L("#efeee9")}):std("#070b14",.5,.6,{envMapIntensity:.25}));z.rotation.x=-PI/2;sc.add(z);z.userData.kabuk=1;const g=izgara(sc,60,60,A?"#9aa3b5":"#6FE3FF",A?.35:.09);g.position.y=.002;if(!A)sc.fog=new THREE.FogExp2(L(alt),.035);return m}
const POZ={soru:{p:[0,1.7,0],r:[.25,0,.0],cam:[8.4,1.55,.14,2.75]},olcu:{p:[0,1.75,0],r:[0,0,0],cam:[9.6,1.57,.04,1.05]},isin:{p:[0,1.3,0],r:[-.75,0,0],cam:[7.4,1.2,.3,.55]},sonuc:{p:[0,1.7,0],r:[.25,0,0],cam:[8.4,1.55,.14,.9]}};
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
    ust.visible=false;ust.position.set(0,H+.8,0);
    for(let i=0;i<N;i++){const[a,ph,r]=D[i];const q=(t*.3+ph)%1;const yy=.15+q*hy;P.set([Math.cos(a+t)*.75*r,yy,Math.sin(a+t)*.75*r],i*3);const f=Math.sin(q*PI)*.9;C.set([f*.4,f*.9,f*1.1],i*3)}ps.geometry.attributes.position.needsUpdate=ps.geometry.attributes.color.needsUpdate=true;
    orb(c,V3(0,1.75,0),lerp(12,11,eio(o.pu)),1.1+o.pu*.5,lerp(.3,.22,o.pu))}}};

/* telefon: 0 → %100 dolum */
S.telefon=()=>{const sc=new THREE.Scene();const c=cam(42);studyo(sc,"#0c1730");isik(sc,"#ffffff",2.2,"#6FE3FF",1.8);const ph=telefon();ph.scale.setScalar(1.12);sc.add(ph);
  const l1=yazi("5.000 mAh",{boy:.34,renk:"#6FE3FF"}),l2=yazi("3,85 V",{boy:.34,renk:"#F2C46B"}),l3=yazi("19 Wh",{boy:.42,renk:"#F3F5FA"});
  const kb=serit(V3(0,-1.6,0),V3(0,-6,0),.03,std("#e8eaee",.1,.5));sc.add(kb);
  const N=160,ps=pts(N,.07);sc.add(ps);const P=ps.geometry.attributes.position.array,C=ps.geometry.attributes.color.array;
  return{sc,c,bl:[.8,.5,.8],kur(o){const t=o.t;const k=eio(sm(.05,.95,o.pu));ph.position.set(0,2.05+Math.sin(t*1.1)*.05,0);ph.rotation.set(-.08,Math.sin(t*.45)*.45,0);ph.ekran.ciz(k);
    kb.scale.y=4.4;kb.position.y=2.05-.86-2.2;
    l3.material.opacity=sm(.35,.45,o.pu);
    for(let i=0;i<N;i++){const q=(t*.8+i/N)%1;P.set([Math.sin(i*7.1)*.03,-2.2+q*3.4,Math.cos(i*3.3)*.03],i*3);const f=Math.sin(q*PI)*1.0*(1-sm(.95,1,o.pu));C.set([f*.3,f,f*.6],i*3)}ps.geometry.attributes.position.needsUpdate=ps.geometry.attributes.color.needsUpdate=true;
    orb(c,V3(0,1.55,0),lerp(8.2,7.6,eio(o.pu)),1.57+Math.sin(o.t*.3)*.12,lerp(.12,.06,o.pu))}}};

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

/* ================= AY'A ARABAYLA (araba, ölçü, takvim, roket, ışık) ================= */
function ayTex(){const c=document.createElement("canvas");c.width=512;c.height=256;const x=c.getContext("2d");x.fillStyle="#c9c7c1";x.fillRect(0,0,512,256);
  for(let i=0;i<9;i++){x.fillStyle="rgba(120,118,112,.45)";x.beginPath();x.ellipse(rnd()*512,40+rnd()*176,30+rnd()*50,20+rnd()*30,0,0,6.283);x.fill()}
  for(let i=0;i<70;i++){const X=rnd()*512,Y=rnd()*256,r=2+rnd()*9;x.strokeStyle="rgba(80,78,74,.55)";x.lineWidth=1.2;x.beginPath();x.arc(X,Y,r,0,6.283);x.stroke();x.fillStyle="rgba(95,93,88,.25)";x.fill()}
  const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return t}
function araba(){const g=new THREE.Group();const gv=new THREE.Mesh(new THREE.BoxGeometry(1.6,.38,.78),std("#e0452a",.2,.45));gv.position.y=.34;g.add(gv);
  const kb=new THREE.Mesh(new THREE.BoxGeometry(.86,.32,.7),std("#f3f5fa",.1,.4));kb.position.set(-.1,.68,0);g.add(kb);
  const cm=new THREE.Mesh(new THREE.BoxGeometry(.06,.24,.62),std("#1580bd",.3,.2));cm.position.set(.34,.68,0);g.add(cm);
  const far=new THREE.Mesh(new THREE.BoxGeometry(.04,.1,.16),bas("#f2c46b"));far.position.set(.81,.38,.24);g.add(far);const far2=far.clone();far2.position.z=-.24;g.add(far2);
  g.teker=[];[[.5,.4],[-.5,.4],[.5,-.4],[-.5,-.4]].forEach(([x,z])=>{const w=new THREE.Mesh(new THREE.CylinderGeometry(.19,.19,.14,20),std("#1b2233",.3,.6));w.rotation.x=PI/2;w.position.set(x,.19,z);g.add(w);g.teker.push(w)});return g}
const AYLAR=["OCAK","ŞUBAT","MART","NİSAN","MAYIS","HAZİRAN","TEMMUZ","AĞUSTOS","EYLÜL","EKİM","KASIM","ARALIK"];const AYG=[31,28,31,30,31,30,31,31,30,31,30,31];
function ayAdi(g){let d=Math.floor(g);for(let i=0;i<12;i++){if(d<AYG[i])return AYLAR[i];d-=AYG[i]}return "OCAK"}
S.ay=()=>{const sc=new THREE.Scene();const c=cam(50);uzay(sc);const EY=-5,AY=5.5,ER=2,MR=.78;
  const e=dunya(ER);e.position.y=EY;sc.add(e);
  const ay=new THREE.Mesh(new THREE.SphereGeometry(MR,64,48),new THREE.MeshStandardMaterial({map:ayTex(),roughness:.95,metalness:0}));ay.position.y=AY;sc.add(ay);
  const dl=new THREE.DirectionalLight(L("#ffffff"),1.6);dl.position.set(4,3,6);sc.add(dl);sc.add(new THREE.AmbientLight(L("#40506a"),.5));
  const Y0=EY+ER+.02,Y1=AY-MR-.02;const yol=cizgi([V3(0,Y0,0),V3(0,Y1,0)],"#1580bd",.6,.22);sc.add(yol);
  const olc=olcu(V3(2.3,EY,0),V3(2.3,AY,0),"384.400 KM","#F2C46B",{boy:1.3,yer:V3(.25,0,0),cent:.3});olc.children[3].center.set(0,.5);sc.add(olc);
  const ar=araba();ar.scale.setScalar(.8);sc.add(ar);
  const sa=dyazi({boy:1.15,renk:"#F2C46B",sol:true,gen:16});sc.add(sa);
  const hz=yazi("100 KM/SA",{boy:.5,renk:"#e0452a"});sc.add(hz);
  const zz=yazi("Z z z",{boy:1.0,renk:"#1580bd"});sc.add(zz);
  const rk=new THREE.Group();const g1=new THREE.Mesh(new THREE.CylinderGeometry(.16,.16,.8,20),std("#f3f5fa",.2,.4));const g2=new THREE.Mesh(new THREE.ConeGeometry(.16,.36,20),std("#e0452a",.2,.4));g2.position.y=.58;
  const g3=new THREE.Mesh(new THREE.ConeGeometry(.26,.3,4),std("#1580bd",.2,.4));g3.position.y=-.32;rk.add(g1,g2,g3);const alev=spr("#ff9a3a",.7,1);alev.position.y=-.7;rk.add(alev);sc.add(rk);
  const rl=yazi("≈ 3 GÜN",{boy:1.2,renk:"#1580bd"});sc.add(rl);
  const ft=spr("#f2c46b",.9,0);sc.add(ft);const iz=[];for(let i=0;i<12;i++){const s=spr("#f2c46b",.6-i*.03,0);sc.add(s);iz.push(s)}
  const fl=yazi("1,3 SANİYE",{boy:1.2,renk:"#de8400"});sc.add(fl);
  const bay=new THREE.Group();const dir=new THREE.Mesh(new THREE.CylinderGeometry(.015,.015,.6,8),std("#1b2233"));dir.position.y=.3;const bz=new THREE.Mesh(new THREE.BoxGeometry(.34,.2,.01),std("#e0452a"));bz.position.set(.17,.5,0);bay.add(dir,bz);sc.add(bay);
  const yer=f=>lerp(Y0+.05,Y1-.05,f);
  return{sc,c,bl:[.8,.5,.75],kur(o){const t=o.t,mod=o.p.mod||"soru";e.ayar(t,{rot:2.4});ay.rotation.y=.6;
    const YC=(EY-ER+AY+MR)/2,DT=40.5,YK=EY+ER+.6,DK=21;let f=0,gor=true,yaz="",kamY=YC,kamD=DT,dur=false,hzv=0,zv=0,rv=false,fv=false;
    if(mod==="soru"){f=0;const k=eio(sm(.15,1,o.pu));kamY=lerp(YK,YC,k);kamD=lerp(DK,DT,k);olc.ilerle(0)}
    else if(mod==="mesafe"){olc.ilerle(sm(.05,.7,o.pu));f=0}
    else if(mod==="hiz"){f=.025*eio(sm(.1,1,o.pu));hzv=sm(.1,.3,o.pu);olc.ilerle(1-sm(0,.3,o.pu));kamY=YK+.5*o.pu;kamD=DK;const h=Math.round(f*3844);yaz=h+" SAAT"}
    else if(mod==="saat"){f=lerp(.025,.35,sm(.05,.95,o.pu));const k=eio(sm(0,.4,o.pu));kamY=lerp(YK+.5,YC,k);kamD=lerp(DK,DT,k);yaz=Math.round(f*3844).toLocaleString("tr-TR")+" SAAT"}
    else if(mod==="takvim"){f=lerp(.35,1,eio(sm(.05,.9,o.pu)));const g=f*160.2;yaz="GÜN "+Math.round(g)+" · "+ayAdi(g)}
    else if(mod==="uyku"){const gs=480.5;const q=sm(.05,.92,o.pu)*gs;const gun=Math.floor(q),fr=q-gun;f=(gun+Math.min(1,fr*3))/gs;dur=fr>1/3;zv=dur?1:0;yaz="GÜN "+Math.round(q)}
    else if(mod==="roket"){gor=false;rv=true;f=0}
    else if(mod==="isik"){gor=false;fv=true}
    else{f=1;const k=eio(sm(0,.6,o.pu));kamY=lerp(YC,AY+.6,k);kamD=lerp(DT,13,k)}
    if(mod!=="soru"&&mod!=="mesafe"&&mod!=="hiz")olc.ilerle(0);
    const y=yer(f);ar.visible=gor;ar.position.set(-.05,y,.0);ar.rotation.set(0,0,PI/2);ar.teker.forEach(w=>w.rotation.y=-(f*900+(mod==="soru"?0:0)));
    if(mod==="son"){ar.position.y=AY+MR-.02;ar.rotation.set(0,-.4,0);ar.position.x=-.25}
    sa.visible=!!yaz&&gor;sa.set(yaz);sa.position.set(.8,y+.25,0);
    hz.visible=false;zz.position.set(-2,y+1.3+Math.sin(t*3)*.08,0);zz.material.opacity=zv*(mod==="uyku"?1:0);
    // roket: Dünya → Ay
    rk.visible=rv;rl.material.opacity=rv?sm(.45,.6,o.pu):0;if(rv){const rf=eio(sm(.1,.75,o.pu));rk.position.set(-.6,yer(rf),0);rl.position.set(-3.6,yer(rf),0);alev.scale.setScalar(.6+Math.sin(t*40)*.15)}
    // ışık: çok hızlı
    if(fv){const ff=sm(.25,.42,o.pu);const fy=yer(ff);ft.position.set(.4,fy,0);ft.material.opacity=ff>0&&ff<1?1:0;iz.forEach((s,i)=>{s.position.set(.4,fy-i*.35,0);s.material.opacity=ff>0&&ff<1?(1-i/12)*.8:0});fl.material.opacity=sm(.4,.5,o.pu);fl.position.set(3.6,0,0)}
    else{ft.material.opacity=0;iz.forEach(s=>s.material.opacity=0);fl.material.opacity=0}
    bay.visible=mod==="son";bay.position.set(.5,AY+MR-.05,0);bay.rotation.z=-.15;
    const of=mod==="soru"?lerp(.06,.1166,eio(sm(.15,1,o.pu))):.1166;orb(c,V3(0,kamY-of*kamD,0),kamD,1.57+Math.sin(t*.2)*.08,mod==="son"?.18:.05)}}};

/* ================= RÜZGÂR TÜRBİNİ (5 MW, 126 m rotor, 12,1 dev/dk) ================= */
S.turbin=()=>{const sc=new THREE.Scene();const c=cam(46);studyo(sc);isik(sc,"#ffffff",2.3,"#6FE3FF",1.4);const HH=9,RR=6.3,W=12.1*2*PI/60;
  const kule=new THREE.Mesh(new THREE.CylinderGeometry(.19,.32,HH,28),std("#f3f5fa",.2,.5));kule.position.y=HH/2;sc.add(kule);
  const nac=new THREE.Mesh(new THREE.BoxGeometry(.5,.5,1.3),std("#e9ecf0",.2,.5));nac.position.set(0,HH+.1,-.2);sc.add(nac);
  const rot=new THREE.Group();rot.position.set(0,HH+.1,.55);sc.add(rot);const gb=new THREE.Mesh(new THREE.SphereGeometry(.3,32,24),std("#f3f5fa",.2,.4));gb.scale.z=1.3;rot.add(gb);
  const kanatlar=[];for(let i=0;i<3;i++){const k=new THREE.Group();const b=new THREE.Mesh(new THREE.CylinderGeometry(.03,.2,RR-.2,10),std("#f6f7f9",.1,.45));b.scale.set(1.5,1,.35);b.position.y=(RR-.2)/2+.2;k.add(b);
    const uc=new THREE.Mesh(new THREE.BoxGeometry(.09,.5,.04),bas("#e0452a"));uc.position.y=RR-.3;k.add(uc);k.rotation.z=i*2.094;rot.add(k);kanatlar.push(k)}
  const yayN=120,yp=[];for(let i=0;i<=yayN;i++){const a=PI/2+i/yayN*6.283;yp.push(V3(Math.cos(a)*RR,Math.sin(a)*RR,0))}const yay=cizgi(yp,"#de8400",1);yay.position.copy(rot.position).add(V3(0,0,.2));sc.add(yay);
  const olc=olcu(V3(-RR,HH+.1,.6),V3(RR,HH+.1,.6),"126 METRE","#F2C46B",{boy:1.5,yer:V3(0,-1.4,0),cent:.4});sc.add(olc);
  const sa=dyazi({boy:1.9,renk:"#de8400",gen:9});sc.add(sa);
  const hzy=yazi("≈ 287 KM/SA",{boy:1.7,renk:"#e0452a"});sc.add(hzy);
  const izN=40,izp=pts(izN,.35);sc.add(izp);
  // batarya
  const H=4.2;const bat=new THREE.Group();bat.position.set(7.4,3.2,1);bat.scale.setScalar(1.25);sc.add(bat);
  const tup=new THREE.Mesh(new THREE.CylinderGeometry(1,1,H,48,1,true),new THREE.MeshStandardMaterial({color:L("#cfe4f2"),transparent:true,opacity:.25,side:THREE.DoubleSide}));tup.position.y=H/2+.1;bat.add(tup);
  const tc=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CylinderGeometry(1,1,H,24)),new THREE.LineBasicMaterial({color:L("#1b2233")}));tc.position.y=H/2+.1;tc.userData.kabuk=1;bat.add(tc);
  const kp=new THREE.Mesh(new THREE.CylinderGeometry(.35,.35,.25,24),std("#b8bec8",.6,.3));kp.position.y=H+.22;bat.add(kp);
  const sv=new THREE.Mesh(new THREE.CylinderGeometry(.94,.94,1,48),std("#19c46c",0,.5));bat.add(sv);
  const by=dyazi({boy:1.5,renk:"#13a35a",gen:8});by.position.set(0,H+1.1,0);bat.add(by);
  // 300 telefon
  const N=300,KOL=30;const gov=new THREE.InstancedMesh(M.yuvarlakKutu(.72,1.5,.06,.1),std("#1d2129",.6,.4),N);const ek=new THREE.InstancedMesh(new THREE.PlaneGeometry(.64,1.38),new THREE.MeshBasicMaterial({color:0xffffff}),N);
  gov.frustumCulled=ek.frustumCulled=false;sc.add(gov,ek);const POS=[];for(let i=0;i<N;i++){const r=Math.floor(i/KOL),cc=i%KOL;POS.push(V3((cc-(KOL-1)/2)*.62,1.2+r*1.45,-4))}
  const m4=new THREE.Matrix4(),qq=new THREE.Quaternion(),col=new THREE.Color();
  const sy=dyazi({boy:1.3,renk:"#13a35a",gen:4});sc.add(sy);
  return{sc,c,bl:[.8,.5,.8],kur(o){const t=o.t,mod=o.p.mod||"soru";let aci=t*W;
    let tY=5.4,tD=54,yw=1.57+Math.sin(t*.15)*.12,pt=.1,ol=0,yk=0,sav="",hz=0,bk=-1,tel=0,say=0;
    if(mod==="soru"){const k=eio(o.pu);tD=lerp(46,54,k);tY=lerp(HH+3,5.4,k);yw=lerp(1.0,1.5,k)}
    else if(mod==="olcu"){ol=sm(.1,.7,o.pu)}
    else if(mod==="tur"){const t0=o.pd*.15,tt=cl((o.pt-t0)/(60/12.1));aci=tt*6.283;yk=tt;sav=(tt*60/12.1).toFixed(2).replace(".",",")+" SN"}
    else if(mod==="uc"){hz=sm(.2,.4,o.pu);tD=lerp(54,46,eio(o.pu));tY=lerp(5.4,6.6,eio(o.pu))}
    else if(mod==="enerji"){const t0=o.pd*.1,tt=cl((o.pt-t0)/(60/12.1));aci=tt*6.283;yk=tt;bk=tt;yw=lerp(1.57,1.35,eio(sm(0,.3,o.pu)));tY=5.4}
    else if(mod==="telefon"||mod==="son"){tel=1;const t0=mod==="son"?-9:(o.ev[1]!==undefined?o.ev[1]:o.pd*.4);say=Math.round(N*eo(cl((o.pt-t0)/2.2)));tD=54;tY=5.4;yw=1.57}
    rot.rotation.z=-aci;olc.ilerle(ol);olc.visible=ol>0;
    yay.ilerle(yk);yay.visible=yk>0;yay.rotation.z=0;
    sa.visible=!!sav;sa.set(sav);sa.position.set(0,HH+RR+1.6,0);
    hzy.material.opacity=hz;hzy.position.set(0,HH+RR+1.6,0);
    const IP=izp.geometry.attributes.position.array,IC=izp.geometry.attributes.color.array;for(let i=0;i<izN;i++){const a=PI/2-aci+i*.035;IP.set([Math.cos(a)*RR,HH+.1+Math.sin(a)*RR,.75],i*3);const f=(1-i/izN)*hz;IC.set([f*.9,f*.3,f*.2],i*3)}izp.geometry.attributes.position.needsUpdate=izp.geometry.attributes.color.needsUpdate=true;izp.visible=hz>0;
    bat.visible=bk>=0;if(bk>=0){const h=Math.max(.001,eio(bk)*(H-.1));sv.scale.y=h;sv.position.y=.1+h/2;by.set((bk*6.9).toFixed(1).replace(".",",")+" kWh")}
    gov.visible=ek.visible=tel>0;sy.visible=false;
    if(tel>0){for(let i=0;i<N;i++){const p=POS[i];const ap=mod==="son"?1:eob(cl((o.pt-.05-i*.004)/.4));const sc_=.72*ap;m4.compose(p.clone().setZ(-4-(1-ap)*2),qq,V3(sc_,sc_,sc_));gov.setMatrixAt(i,m4);m4.compose(p.clone().setZ(-4+.05*sc_-(1-ap)*2),qq,V3(sc_,sc_,sc_));ek.setMatrixAt(i,m4);col.copy(i<say?L("#19c46c"):L("#2a3348"));ek.setColorAt(i,col)}
      gov.instanceMatrix.needsUpdate=ek.instanceMatrix.needsUpdate=true;ek.instanceColor.needsUpdate=true;sy.set(String(say));sy.position.set(0,HH+RR+1.8,0)}
    orb(c,V3(0,tY,0),tD,yw,pt)}}};


/* ================= UZAY İSTASYONU (irtifa, hız, Türkiye geçişi, 90 dk tur, gün doğumları) ================= */
function iss(){const g=new THREE.Group();const kr=new THREE.Mesh(new THREE.BoxGeometry(5.4,.16,.16),std("#b8bec8",.6,.4));g.add(kr);
  [[-.2,0,0],[.5,0,0]].forEach(([x])=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,1.4,20),std("#f3f5fa",.3,.4));m.rotation.x=PI/2;m.position.set(x,-.05,0);g.add(m)});
  const mm=new THREE.Mesh(new THREE.CylinderGeometry(.2,.2,1.1,20),std("#e9ecf0",.3,.4));mm.rotation.z=PI/2;mm.position.set(.15,-.05,.9);g.add(mm);
  [-2.5,-1.6,1.6,2.5].forEach(x=>[1,-1].forEach(sg=>{const k=new THREE.Mesh(new THREE.BoxGeometry(.5,.02,1.9),std("#de8400",.4,.35));k.position.set(x,0,sg*1.1);g.add(k)}));
  const rd=new THREE.Mesh(new THREE.BoxGeometry(.9,.02,.5),std("#f3f5fa",.1,.6));rd.position.set(.4,.35,0);rd.rotation.x=PI/2;g.add(rd);return g}
S.iss=()=>{const sc=new THREE.Scene();const c=cam(46);uzay(sc);const ER=6;const e=dunya(ER);sc.add(e);
  const dl=new THREE.DirectionalLight(L("#ffffff"),1.7);dl.position.set(-6,4,8);sc.add(dl);sc.add(new THREE.AmbientLight(L("#40506a"),.5));
  const st=iss();st.scale.setScalar(.22);sc.add(st);
  const yr=[];for(let i=0;i<=240;i++){const a=i/240*6.283;yr.push(V3(Math.cos(a)*ER*1.063,Math.sin(a)*ER*1.063,0))}const yor=cizgi(yr,"#1580bd",.8,.12);sc.add(yor);
  const olc=olcu(V3(.0,ER,0),V3(0,ER*1.063,0),"",{},{});olc.children[3].visible=false;sc.add(olc);const ol=yazi("400 KM",{boy:.5,renk:"#de8400",sol:true});sc.add(ol);
  const izN=50,izp=pts(izN,.3);sc.add(izp);
  // düz harita şeridi
  const hr=new THREE.Group();sc.add(hr);const zm=new THREE.Mesh(new THREE.BoxGeometry(16,.6,4),std("#e9c98f",0,.9));hr.add(zm);
  const tb=olcu(V3(-8,.3,1.7),V3(8,.3,1.7),"TÜRKİYE ≈ 1.600 KM","#de8400",{boy:1.7,yer:V3(0,-.0,1.2),cent:.5});hr.add(tb);
  const st2=iss();st2.scale.setScalar(.5);hr.add(st2);const sa=dyazi({boy:1.1,renk:"#e0452a",gen:8});hr.add(sa);
  const ucak=new THREE.Group();const uv=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,1,12),std("#f3f5fa"));uv.rotation.z=PI/2;const uk=new THREE.Mesh(new THREE.BoxGeometry(.3,.02,1),std("#1580bd"));ucak.add(uv,uk);ucak.scale.setScalar(.6);sc.add(ucak);
  const sat=dyazi({boy:.32,renk:"#1580bd",gen:18});sc.add(sat);
  const gd=[];for(let i=0;i<16;i++){const s=spr("#f2c46b",.9,0);sc.add(s);gd.push(s)}
  return{sc,c,bl:[.8,.5,.75],kur(o){const t=o.t,mod=o.p.mod||"soru";e.ayar(t,{rot:1.2});
    let A=PI/2+.4-t*.05,hv=false,iz=0,yk=1,ok=0,uv_=false,gdv=0,tY=-5,tD=46,tX=0,yw=1.57,pt=.05,stv=true;
    if(mod==="soru"){const k=eio(o.pu);tD=46;tX=0;tY=lerp(0,-5,k)}
    else if(mod==="irtifa"){A=PI/2;ok=sm(.1,.6,o.pu);tD=lerp(10,9,o.pu);tY=ER-.3;yk=0}
    else if(mod==="hiz"){A=PI/2+.1-o.pu*.35;iz=1;uv_=true;tD=10;tY=ER-.3;yk=0}
    else if(mod==="harita"){hv=true;stv=false}
    else if(mod==="tur"){A=PI/2-eio(sm(.05,.95,o.pu))*6.283;}
    else if(mod==="gun"){gdv=1;A=PI/2-o.pu*6.283*2}
    else{tD=46;tY=-5}
    e.visible=!hv;yor.visible=!hv&&yk>0;st.visible=stv&&!hv;
    const r=ER*1.063;st.position.set(Math.cos(A)*r,Math.sin(A)*r,0);st.rotation.set(.5,0,A-PI/2);
    olc.ilerle(ok);olc.visible=ok>0;ol.material.opacity=sm(.5,.8,ok);ol.position.set(.4,ER*1.03,0);
    const IP=izp.geometry.attributes.position.array,IC=izp.geometry.attributes.color.array;for(let i=0;i<izN;i++){const a=A+i*.004;IP.set([Math.cos(a)*r,Math.sin(a)*r,0],i*3);const f=(1-i/izN)*iz;IC.set([f*.9,f*.3,f*.2],i*3)}izp.geometry.attributes.position.needsUpdate=izp.geometry.attributes.color.needsUpdate=true;izp.visible=iz>0;
    ucak.visible=uv_;sat.visible=uv_;if(uv_){const ua=PI/2+.1-o.pu*.012;ucak.position.set(Math.cos(ua)*(ER+.08),Math.sin(ua)*(ER+.08),.5);sat.set("UÇAK ≈ 900 KM/SA");sat.position.set(ucak.position.x,ucak.position.y-.45,.5)}
    hr.visible=hv;if(hv){hr.position.set(0,-30,0);hr.scale.setScalar(.55);const k=o.p.gec?sm(.08,.92,o.pu):0;sa.visible=!!o.p.gec;st2.position.set(lerp(-7,7,k),3.2,.0);st2.rotation.set(.3,0,0);tb.ilerle(sm(0,.15,o.pu));sa.set(String(Math.round(k*205))+" SN");sa.position.set(st2.position.x,5,0)}
    gd.forEach((s,i)=>{const a=PI/2-(i/16)*6.283*2;const on=gdv&&(i/16)<o.pu;s.material.opacity=on?1:0;const b=PI/2-i/16*6.283;s.position.set(Math.cos(b)*ER*1.28,Math.sin(b)*ER*1.28,0)});
    if(hv)orb(c,V3(0,-31.6,0),20,1.57,.35);else orb(c,V3(tX,tY,0),tD,yw,pt)}}};

/* ================= ELEKTRİKLİ ARABA: 1 kWh kaç km? ================= */
S.ev=()=>{const sc=new THREE.Scene();const c=cam(46);studyo(sc);isik(sc,"#ffffff",2.3,"#6FE3FF",1.4);
  const yol=new THREE.Mesh(new THREE.BoxGeometry(2.6,.02,60),std("#3a4152",0,.9));yol.position.set(0,.01,-24);sc.add(yol);
  const ser=[];for(let i=0;i<30;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(.12,.03,.9),bas("#ffffff"));m.position.set(0,.03,6-i*2.2);sc.add(m);ser.push(m)}
  const ar=araba();ar.rotation.y=PI/2;sc.add(ar);
  const pil=new THREE.Group();pil.scale.setScalar(.7);sc.add(pil);const pk=new THREE.Mesh(new THREE.BoxGeometry(1.4,2.2,1),new THREE.MeshStandardMaterial({color:L("#cfe4f2"),transparent:true,opacity:.25}));pil.add(pk);
  const pkc=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.4,2.2,1)),new THREE.LineBasicMaterial({color:L("#1b2233")}));pkc.userData.kabuk=1;pil.add(pkc);
  const ucb=new THREE.Mesh(new THREE.BoxGeometry(.5,.2,.4),std("#b8bec8",.6,.3));ucb.position.y=1.2;pil.add(ucb);
  const dol=new THREE.Mesh(new THREE.BoxGeometry(1.26,1,.86),std("#19c46c",0,.5));pil.add(dol);const pl=dyazi({boy:.75,renk:"#13a35a",gen:7});pl.position.y=1.9;pil.add(pl);
  const km=[];for(let i=0;i<=5;i++){const g=new THREE.Group();const d=new THREE.Mesh(new THREE.BoxGeometry(.06,1,.06),std("#1b2233"));d.position.y=.5;const lv=yazi(i+" KM",{boy:.9,renk:i===5?"#e0452a":"#16213a"});lv.position.set(0,1.35,0);g.add(d,lv);g.position.set(1.8,0,-i*5);sc.add(g);km.push(g)}
  const yuru=new THREE.Group();yuru.scale.setScalar(1.4);const gv=new THREE.Mesh(new THREE.CylinderGeometry(.12,.14,.7,12),std("#1580bd"));gv.position.y=.95;const bs=new THREE.Mesh(new THREE.SphereGeometry(.16,16,12),std("#f2c46b"));bs.position.y=1.45;
  const b1=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,.6,8),std("#1b2233"));b1.position.set(.08,.3,0);const b2=b1.clone();b2.position.x=-.08;yuru.add(gv,bs,b1,b2);yuru.b=[b1,b2];sc.add(yuru);
  const sat=dyazi({boy:.38,renk:"#1580bd",gen:18});sc.add(sat);
  const kb=[["ELEKTRİK","#19c46c",1],["BENZİN","#e06a10",2.7]].map(([ad,h,v],i)=>{const g=new THREE.Group();const m=new THREE.Mesh(new THREE.BoxGeometry(1.2,1,1.2),std(h,0,.5));g.add(m);const y=yazi(ad,{boy:.5,renk:h});y.position.y=-.5;g.add(y);const n=yazi((""+v).replace(".",",")+" kWh",{boy:.6,renk:"#16213a"});g.add(n);g.m=m;g.n=n;g.v=v;sc.add(g);return g});
  return{sc,c,bl:[.8,.5,.8],kur(o){const t=o.t,mod=o.p.mod||"soru";let z=2,pv=false,pf=1,kmv=false,yv=false,kbv=0,tY=0,tD=9,tZ=2,yw=1.0,pt=.3,sv="";
    if(mod==="soru"){tD=lerp(8,10,eio(o.pu));yw=lerp(.7,1.1,o.pu)}
    else if(mod==="kwh"){pv=true;pf=1;tD=8;tZ=2;tY=.6;yw=1.57;pt=.15}
    else if(mod==="test"){const k=sm(.05,.95,o.pu);z=2-k*30;pv=false;tZ=z-1;tD=10;yw=.9;sv=Math.round(k*100)+" KM · "+(k*19.7).toFixed(1).replace(".",",")+" kWh"}
    else if(mod==="km"||mod==="son"){kmv=true;pv=true;const k=mod==="son"?1:eio(sm(.1,.9,o.pu));z=2-k*25.5;pf=1-k;tZ=-8;tD=40;yw=1.57;pt=1.0;tY=0}
    else if(mod==="yuru"){kmv=true;yv=true;z=-23.5;pf=0;tZ=-8;tD=40;yw=1.57;pt=1.0;tY=0}
    else if(mod==="benzin"){kbv=1;tZ=0;tD=16;yw=1.57;pt=.1;tY=.2;z=8}
    ar.position.set(0,0,z);ar.visible=z<7;ar.teker.forEach(w=>w.rotation.y=z*1.6);
    pil.visible=pv;if(mod==="test")pil.position.set(-2.2,1.4,z);else if(mod==="km"||mod==="son"){pil.position.set(-3.2,1.3,z);pil.scale.setScalar(1.4)}else{pil.position.set(0,1.1+2.3,z);pil.scale.setScalar(.7)}
    const h=Math.max(.001,pf*2);dol.scale.y=h;dol.position.y=-1.08+h/2*1.0+.0;dol.material.color=pf<.25?L("#e0452a"):L("#19c46c");pl.set(mod==="test"?"":(pf*1).toFixed(1).replace(".",",")+" kWh");
    km.forEach(g=>g.visible=kmv);yuru.visible=yv;if(yv){const k=sm(.05,.95,o.pu);yuru.position.set(-1.9,0,2-k*25);yuru.b[0].rotation.x=Math.sin(t*8)*.5;yuru.b[1].rotation.x=-Math.sin(t*8)*.5}
    sat.visible=!!sv;sat.set(sv);sat.position.set(0,2.0,z);
    kb.forEach((g,i)=>{g.visible=kbv>0;const k=eio(sm(.1+i*.25,.5+i*.25,o.pu));const hh=Math.max(.01,g.v*1.3*k);g.m.scale.y=hh;g.m.position.y=hh/2;g.position.set(i?1.3:-1.3,0,0);g.n.position.y=hh+.45;g.n.material.opacity=sm(.8,1,k)});
    yol.visible=ser[0].visible=kbv===0;ser.forEach(m=>m.visible=kbv===0);
    orb(c,V3(0,tY,tZ),tD,yw,pt)}}};


/* ---------- ortak: ok (oklu çubuk, +x yönünde, boy ayarlı) ---------- */
function okM(h,r=.07){const g=new THREE.Group();const m=std(h,0,.5);const s=new THREE.Mesh(new THREE.CylinderGeometry(r,r,1,12),m);s.rotation.z=-PI/2;const u=new THREE.Mesh(new THREE.ConeGeometry(r*2.6,r*6,16),m);u.rotation.z=-PI/2;g.add(s,u);
  g.boy=b=>{b=Math.max(.001,b);s.scale.y=b;s.position.x=b/2;u.position.x=b+r*3;u.visible=b>.02;s.visible=b>.02};g.boy(1);return g}
function segAyar(m,a,b){const d=b.clone().sub(a);m.position.copy(a).addScaledVector(d,.5);m.quaternion.setFromUnitVectors(V3(0,1,0),d.clone().normalize());m.scale.y=d.length()}

/* ================= DÜNYA DURSA: dönüş hızı ================= */
S.donus=()=>{const sc=new THREE.Scene();const c=cam(46);uzay(sc);const ER=3;
  const dl=new THREE.DirectionalLight(L("#ffffff"),1.6);dl.position.set(4,3,10);sc.add(dl);const amb=new THREE.AmbientLight(L("#40506a"),.6);sc.add(amb);
  const e=dunya(ER);sc.add(e);e.ayar(0,{rot:0});
  const LAT=41*PI/180,LON=29*PI/180;const yon=(la,lo,r)=>V3(Math.cos(la)*Math.cos(lo)*r,Math.sin(la)*r,-Math.cos(la)*Math.sin(lo)*r);
  const eq=[];for(let i=0;i<=240;i++){const a=PI/2+i/240*2*PI;eq.push(V3(Math.cos(a)*ER*1.03,0,Math.sin(a)*ER*1.03))}const eql=cizgi(eq,"#de8400",1);sc.add(eql);
  const rL=ER*1.03*Math.cos(LAT),yL=ER*1.03*Math.sin(LAT);const en=[];for(let i=0;i<=240;i++){const a=PI/2+i/240*2*PI;en.push(V3(Math.cos(a)*rL,yL,Math.sin(a)*rL))}const enl=cizgi(en,"#e0452a",1);sc.add(enl);
  const ist=new THREE.Mesh(new THREE.SphereGeometry(.13,16,12),bas("#e0452a"));ist.position.copy(yon(LAT,LON,ER*1.01));e.add(ist);
  const ekm=new THREE.Mesh(new THREE.SphereGeometry(.11,16,12),bas("#de8400"));ekm.position.copy(yon(0,LON,ER*1.01));e.add(ekm);
  const isy=yazi("İSTANBUL",{boy:.42,renk:"#e0452a"});sc.add(isy);
  const okE=okM("#de8400"),okI=okM("#e0452a"),okS=okM("#1580bd");sc.add(okE,okI,okS);
  const yE=dyazi({boy:.46,renk:"#de8400",gen:12}),yI=dyazi({boy:.46,renk:"#e0452a",gen:12}),yS=dyazi({boy:.46,renk:"#1580bd",gen:12});sc.add(yE,yI,yS);
  const yc=yazi("≈ 40.075 KM",{boy:.5,renk:"#de8400"});sc.add(yc);
  const ark=[];for(let i=0;i<=40;i++){const la=i/40*LAT;ark.push(V3(0,Math.sin(la)*ER*1.25,Math.cos(la)*ER*1.25))}const arl=cizgi(ark,"#16213a",1);sc.add(arl);const ary=yazi("41°",{boy:.5,renk:"#16213a"});ary.position.set(.15,Math.sin(LAT/2)*ER*1.42,Math.cos(LAT/2)*ER*1.42);sc.add(ary);
  // güneş (gün/gece için)
  const gn=gunes(.9);sc.add(gn);const RS=11;const yor=[];for(let i=0;i<=200;i++){const a=i/200*2*PI;yor.push(V3(Math.cos(a)*RS,0,Math.sin(a)*RS))}const yol=cizgi(yor,"#de8400",.7,.25);sc.add(yol);
  const gy=dyazi({boy:.62,renk:"#16213a",gen:16});sc.add(gy);const dg=dyazi({boy:.55,renk:"#e0452a",gen:16});sc.add(dg);
  const wp=new THREE.Vector3();let hemi=null;
  return{sc,c,bl:[.8,.5,.75],kur(o){const t=o.t,mod=o.p.mod||"soru";if(!hemi)sc.traverse(x=>{if(x.isHemisphereLight)hemi=x});
    const A0=-PI/2-LON;let A=A0,eqk=0,enk=0,ve=0,vi=0,vs=0,ark_=0,cy=0,gv=false,tY=-2.3,tD=22,tX=0,yw=PI/2,pt=.08;
    if(mod==="soru"){A=A0-(1-eo(o.pu*1.15))*PI*3;tD=lerp(28,22,eio(o.pu))}
    else if(mod==="cevre"){eqk=sm(.05,.75,o.pu);cy=sm(.6,.9,o.pu);pt=lerp(.08,.35,eio(o.pu))}
    else if(mod==="hiz"){eqk=1;ve=eo(sm(.1,.5,o.pu));pt=.18}
    else if(mod==="enlem"){eqk=1;enk=sm(.1,.7,o.pu);ve=1;ark_=sm(.05,.5,o.pu);vi=eo(sm(.55,.95,o.pu));pt=.18}
    else if(mod==="sonuc"){enk=1;vi=1;ve=1-sm(0,.4,o.pu);eqk=1-sm(0,.4,o.pu);pt=.18}
    else if(mod==="ses"){enk=1;vi=1;vs=eo(sm(.15,.6,o.pu));tX=lerp(0,.9,eio(sm(0,.6,o.pu)));pt=.12}
    else if(mod==="hisset"){A=A0+eio(o.pu)*2*PI;enk=1;vi=1}
    else if(mod==="gun"){gv=true;tD=34;tY=-2.6;pt=.36}
    else{enk=1;vi=1}
    e.rotation.y=A;e.updateMatrixWorld(true);
    eql.ilerle(eqk);eql.visible=eqk>0;enl.ilerle(enk);enl.visible=enk>0;arl.ilerle(ark_);arl.visible=ark_>0;ary.material.opacity=ark_;ary.visible=ark_>0;
    yc.visible=cy>0;yc.material.opacity=cy;yc.position.set(0,-.75,ER*1.05);
    // oklar: işaretin dünya konumundan doğuya (teğet)
    const yerle=(okk,yy,mesh,boy,v,metin,dy=0,ly=.42)=>{mesh.getWorldPosition(wp);const d=V3(wp.z,0,-wp.x).normalize();okk.position.copy(wp).add(V3(0,dy,0));okk.quaternion.setFromUnitVectors(V3(1,0,0),d);okk.boy(boy*v);okk.visible=v>0&&!gv;
      yy.visible=v>.6&&!gv;yy.set(metin);yy.position.copy(wp).addScaledVector(d,boy*.72).add(V3(0,dy+ly,0));yy.material.opacity=sm(.6,1,v)};
    yerle(okE,yE,ekm,3.0,ve,"1.670 KM/SA");yerle(okI,yI,ist,2.26,vi,"1.260 KM/SA");yerle(okS,yS,ist,2.2,vs,"SES 1.225",-.5,-.42);
    ist.getWorldPosition(wp);isy.position.copy(wp).add(V3(-1.25,.3,.2));isy.visible=!gv&&(mod!=="cevre"&&mod!=="hiz");
    // gün/gece: güneş Dünya'nın çevresinde bir yılda bir tur (Dünya dönmüyor)
    gn.visible=yol.visible=gy.visible=dg.visible=gv;e.position.set(0,0,0);
    if(gv){const k=sm(.05,.95,o.pu);const th=PI/2+k*2*PI;gn.position.set(Math.cos(th)*RS,0,Math.sin(th)*RS);gn.ayar(t,1);dl.position.copy(gn.position);amb.intensity=.12;if(hemi)hemi.intensity=.18;
      gy.set("GÜN "+Math.round(k*365));gy.position.set(0,ER+1.5,0);const acik=Math.cos(th-PI/2)>0;dg.set(acik?"İSTANBUL: GÜNDÜZ":"İSTANBUL: GECE");dg.position.set(0,ER+.8,0)}
    else{dl.position.set(4,3,10);amb.intensity=.6;if(hemi)hemi.intensity=.85}
    orb(c,V3(tX,tY,0),tD,yw,pt)}}};

/* ================= PEDAL → AMPUL ================= */
S.pedal=()=>{const sc=new THREE.Scene();const c=cam(46);studyo(sc);isik(sc,"#ffffff",2.3,"#6FE3FF",1.4);
  const g=new THREE.Group();g.position.x=-.6;sc.add(g);const kad=std("#1580bd",.3,.4),siy=std("#1b2233",.2,.6);
  const RW=V3(-1.3,.52,0),FW=V3(.55,.52,0),CR=V3(-.45,.5,0),SE=V3(-.78,1.32,0),HB=V3(.32,1.38,0);
  [RW,FW].forEach(p=>{const w=new THREE.Mesh(new THREE.TorusGeometry(.48,.045,10,48),siy);w.position.copy(p);g.add(w)});
  const sg=(a,b,r,m)=>{const x=new THREE.Mesh(new THREE.CylinderGeometry(r,r,1,10),m);segAyar(x,a,b);g.add(x);return x};
  sg(RW,CR,.04,kad);sg(CR,SE,.045,kad);sg(SE.clone().add(V3(.05,-.1,0)),HB.clone().add(V3(-.1,-.1,0)),.045,kad);sg(HB.clone().add(V3(-.1,-.1,0)),FW,.04,kad);sg(RW,SE.clone().add(V3(0,-.08,0)),.035,kad);
  const sele=new THREE.Mesh(new THREE.BoxGeometry(.32,.06,.14),siy);sele.position.copy(SE).add(V3(0,.04,0));g.add(sele);
  const gid=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,.5,8),siy);gid.rotation.x=PI/2;gid.position.copy(HB);g.add(gid);
  // sehpa + jeneratör
  sg(RW.clone().add(V3(-.35,-.52,0)),RW,.03,siy);sg(RW.clone().add(V3(.35,-.52,0)),RW,.03,siy);
  const jen=new THREE.Mesh(new THREE.BoxGeometry(.34,.26,.3),std("#e0452a",.2,.5));jen.position.set(-1.3,.1,.28);g.add(jen);
  const zinc=new THREE.Mesh(new THREE.TorusGeometry(.17,.025,8,32),siy);zinc.position.copy(CR).add(V3(0,0,.06));g.add(zinc);
  const kol1=new THREE.Mesh(new THREE.BoxGeometry(.04,.2,.03),siy),kol2=kol1.clone();g.add(kol1,kol2);
  // sürücü
  const ten=std("#f2c46b",0,.6),giy=std("#19c46c",0,.6),pan=std("#3a4152",0,.7);
  const HIP=V3(-.8,1.42,0),OMZ=V3(-.3,2.08,0);const gov=sg(HIP,OMZ,.13,giy);
  const bas_=new THREE.Mesh(new THREE.SphereGeometry(.17,20,14),ten);bas_.position.set(-.16,2.36,0);g.add(bas_);
  sg(OMZ,HB.clone().add(V3(-.02,.04,.12)),.05,ten);
  const bac=[0,1].map(i=>{const z=i?-.1:.1;return{u:sg(HIP,HIP.clone().add(V3(.3,-.5,0)),.07,pan),a:sg(HIP,HIP.clone().add(V3(.3,-.5,0)),.055,pan),z}});
  // kablo
  const kb=cizgi([V3(-1.9,.1,.28),V3(-1.5,.02,.6),V3(.5,.02,.7),V3(2.0,.02,.4),V3(2.5,.05,0)],"#1b2233",1);sc.add(kb);
  // ampul + direk
  const AX=2.1;const dir=new THREE.Mesh(new THREE.CylinderGeometry(.04,.06,1.25,10),siy);dir.position.set(AX,.62,0);sc.add(dir);
  const duy=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.22,16),std("#b8bec8",.7,.3));duy.position.set(AX,1.34,0);sc.add(duy);
  const cam_=new THREE.Mesh(new THREE.SphereGeometry(.36,32,24),new THREE.MeshBasicMaterial({color:L("#e3e6ec")}));cam_.position.set(AX,1.78,0);sc.add(cam_);
  const tel=new THREE.Mesh(new THREE.TorusGeometry(.1,.012,6,24,PI),bas("#1b2233"));tel.position.set(AX,1.72,0);sc.add(tel);
  const ledb=new THREE.Mesh(new THREE.CylinderGeometry(.12,.2,.2,20),std("#f3f5fa",0,.5));ledb.position.set(AX,1.52,0);sc.add(ledb);
  const par=spr("#ffe3a0",2.2,0);par.position.copy(cam_.position);sc.add(par);
  const isn=[];for(let i=0;i<10;i++){const a=i/10*2*PI;const m=new THREE.Mesh(new THREE.BoxGeometry(.24,.05,.05),bas("#f0a020"));m.position.set(AX+Math.cos(a)*.62,1.78+Math.sin(a)*.62,0);m.rotation.z=a;sc.add(m);isn.push(m)}
  const aY=dyazi({boy:.3,renk:"#16213a",gen:17});aY.position.set(AX,-.32,.3);sc.add(aY);
  const wY=dyazi({boy:.55,renk:"#13a35a",gen:8});wY.position.set(-.9,2.95,0);sc.add(wY);
  // saat kadranı (60 dk)
  const SX=AX,SY=3.2,SR=.72;const kad_=new THREE.Mesh(new THREE.CircleGeometry(SR,64),bas("#ffffff"));kad_.position.set(SX,SY,-.02);sc.add(kad_);
  const cer=new THREE.Mesh(new THREE.TorusGeometry(SR,.03,8,64),siy);cer.position.set(SX,SY,0);sc.add(cer);
  for(let i=0;i<12;i++){const a=PI/2-i/12*2*PI;const m=new THREE.Mesh(new THREE.BoxGeometry(i%3?.06:.14,.03,.02),siy);m.position.set(SX+Math.cos(a)*(SR-.08),SY+Math.sin(a)*(SR-.08),.01);m.rotation.z=a;sc.add(m)}
  let dol=null,dolK=-1,dolR="";const dolM={o:bas("#f0a020"),g:bas("#19c46c")};
  const dolAyar=(k,r)=>{k=cl(k);if(Math.abs(k-dolK)<1e-4&&r===dolR)return;dolK=k;dolR=r;if(dol){sc.remove(dol);dol.geometry.dispose()}if(k<.002){dol=null;return}
    dol=new THREE.Mesh(new THREE.RingGeometry(.1,SR-.18,64,1,PI/2-k*2*PI,k*2*PI),dolM[r]);dol.position.set(SX,SY,.0);dol.userData.kabuk=1;sc.add(dol)};
  const iy=new THREE.Mesh(new THREE.BoxGeometry(.05,.3,.02),bas("#e0452a"));sc.add(iy);const iyY=yazi("İLK YARI 45 DK",{boy:.26,renk:"#e0452a"});sc.add(iyY);
  const sY=dyazi({boy:.5,renk:"#16213a",gen:7});sY.position.set(SX-1.75,SY+.3,0);sc.add(sY);
  return{sc,c,bl:[.8,.5,.8],kur(o){const t=o.t,mod=o.p.mod||"soru";const hiz=mod==="son"?3:6;const ac=t*hiz;
    // pedal + bacak
    kol1.position.copy(CR).add(V3(Math.cos(ac)*.1,Math.sin(ac)*.1,.1));kol1.rotation.z=ac+PI/2;kol2.position.copy(CR).add(V3(-Math.cos(ac)*.1,-Math.sin(ac)*.1,-.1));kol2.rotation.z=ac+PI/2;
    bac.forEach((b,i)=>{const aa=ac+i*PI;const F=CR.clone().add(V3(Math.cos(aa)*.19,Math.sin(aa)*.19,b.z));const H=HIP.clone().add(V3(0,0,b.z));const d=F.clone().sub(H);const L2=d.length();const a=.66;const h=Math.sqrt(Math.max(0,a*a-L2*L2/4));const n=V3(-d.y,d.x,0).normalize();if(n.x<0)n.negate();
      const K=H.clone().addScaledVector(d,.5).addScaledVector(n,h);segAyar(b.u,H,K);segAyar(b.a,K,F)});
    let yan=0,led=false,dk=0,dr="o",wv="",av="ESKİ AMPUL · 60 W",iyv=false,sv="",tD=14,tY=.56,tX=.3,yw=PI/2,pt=.12;
    if(mod==="soru"){yan=.5+.5*Math.sin(t*9)*Math.sin(t*2.3);tD=lerp(12,14,eio(o.pu));yw=lerp(1.25,PI/2,eio(o.pu));av=""}
    else if(mod==="guc"){yan=0;const k=eo(sm(.1,.6,o.pu));wv=Math.round(k*60)+" W";av=""}
    else if(mod==="eski"){yan=sm(0,.3,o.pu);wv="60 W"}
    else if(mod==="sure"){yan=1;wv="60 W";dk=sm(.1,.9,o.pu);sv=Math.round(dk*60)+" DK"}
    else if(mod==="mac"){yan=1;wv="";dk=1;sv="60 DK";iyv=true}
    else if(mod==="led"){yan=sm(.2,.5,o.pu);led=true;av="LED · 8,8 W";wv="60 W"}
    else if(mod==="ledsure"){yan=1;led=true;av="LED · 8,8 W";wv="60 W";dr="g";dk=sm(.1,.7,o.pu)*9/60;sv=Math.round(dk*60)+" DK"}
    else if(mod==="sarki"){yan=1;led=true;av="LED · 8,8 W";wv="60 W";dr="g";dk=9/60;sv="9 DK"}
    else{yan=1;led=true;av="";wv="60 W";dr="g";dk=9/60;sv="≈ 9 DK"}
    cam_.scale.setScalar(led?.82:1);ledb.visible=led;tel.visible=!led;cam_.position.y=led?1.82:1.78;
    cam_.material.color=L("#e3e6ec").lerp(L(led?"#ffe066":"#ffc23a"),yan);par.material.opacity=yan*.9;par.position.copy(cam_.position);
    isn.forEach((m,i)=>{m.visible=yan>.4;m.scale.x=.7+.3*yan+Math.sin(t*4+i)*.1});
    aY.visible=!!av;aY.set(av);wY.visible=!!wv;wY.set(wv?"⚡ "+wv:"");
    const sk=dk>0||mod==="sure"||mod==="ledsure";kad_.visible=cer.visible=sk;sc.children.forEach(x=>{});dolAyar(sk?dk:0,dr);if(dol)dol.visible=sk;sY.visible=sk;sY.set(sv);
    iy.visible=iyY.visible=iyv;if(iyv){const a=PI/2-.75*2*PI;iy.position.set(SX+Math.cos(a)*(SR+.12),SY+Math.sin(a)*(SR+.12),.02);iy.rotation.z=a+PI/2;iyY.position.set(SX-1.75,SY-.25,0)}
    orb(c,V3(tX,tY,0),tD,yw,pt)}}};


/* ================= MARS: gün (sol) ve yıl ================= */
function marsTex(){const c=document.createElement("canvas");c.width=1024;c.height=512;const x=c.getContext("2d");x.fillStyle="#c8562a";x.fillRect(0,0,1024,512);
  let s=11;const r=()=>(s=(s*16807)%2147483647)/2147483647;
  for(let i=0;i<260;i++){const px=r()*1024,py=60+r()*392,rr=10+r()*70;x.fillStyle=r()<.55?`rgba(120,40,18,${.18+r()*.3})`:`rgba(232,140,90,${.15+r()*.25})`;x.beginPath();x.ellipse(px,py,rr*1.6,rr*.7,0,0,6.283);x.fill()}
  x.strokeStyle="rgba(95,30,14,.5)";x.lineWidth=7;x.beginPath();x.moveTo(200,262);x.bezierCurveTo(320,250,420,272,600,256);x.stroke();
  x.fillStyle="#f6f1ea";x.fillRect(0,0,1024,34);x.fillRect(0,486,1024,26);for(let i=0;i<40;i++){x.beginPath();x.arc(i*26,34,14,0,PI);x.fill();x.beginPath();x.arc(i*26+13,486,10,PI,2*PI);x.fill()}
  const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=8;return t}
function kaydir(c,s){c.updateMatrixWorld();const up=V3(0,1,0).applyQuaternion(c.quaternion);c.position.addScaledVector(up,-s)}
S.mars=()=>{const sc=new THREE.Scene();const c=cam(46);uzay(sc);
  const dl=new THREE.DirectionalLight(L("#ffffff"),1.6);dl.position.set(4,3,10);sc.add(dl);const amb=new THREE.AmbientLight(L("#40506a"),.6);sc.add(amb);
  const ma=new THREE.Mesh(new THREE.SphereGeometry(1,96,64),new THREE.MeshStandardMaterial({map:marsTex(),roughness:.95,metalness:0}));sc.add(ma);
  const e=dunya(1);sc.add(e);
  const pin=(h)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(.06,16,12),bas(h));return m};const pM=pin("#1580bd"),pE=pin("#e0452a");pM.position.set(0,0,1.02);pE.position.set(0,0,1.02);ma.add(pM);e.add(pE);
  const yE=dyazi({boy:.36,renk:"#1580bd",gen:10}),yM=dyazi({boy:.36,renk:"#e0452a",gen:10}),yU=dyazi({boy:.62,renk:"#16213a",gen:28});sc.add(yE,yM,yU);
  const yE2=dyazi({boy:.36,renk:"#16213a",gen:12}),yM2=dyazi({boy:.36,renk:"#16213a",gen:12});sc.add(yE2,yM2);
  const gn=gunes(.85);sc.add(gn);const RE=3.6,RM=RE*1.52;
  const hl=r=>{const a=[];for(let i=0;i<=200;i++){const q=i/200*2*PI;a.push(V3(Math.cos(q)*r,0,Math.sin(q)*r))}return a};
  const oE=cizgi(hl(RE),"#1580bd",.8,.18),oM=cizgi(hl(RM),"#e0452a",.8,.22);sc.add(oE,oM);
  const lE=olcu(V3(0,0,0),V3(RE,0,0),"1×","#1580bd",{boy:.55,n:V3(0,1,0),yer:V3(0,0,-.45)}),lM=olcu(V3(0,0,0),V3(-RM,0,0),"1,5×","#e0452a",{boy:.55,n:V3(0,1,0),yer:V3(0,0,-.45)});sc.add(lE,lM);
  const izE=cizgi(hl(RE*1.0),"#1580bd",1),izM=cizgi(hl(RM),"#e0452a",1);sc.add(izE,izM);
  return{sc,c,bl:[.8,.5,.75],kur(o){const t=o.t,mod=o.p.mod||"soru";
    pM.visible=pE.visible=(mod==="gun"||mod==="fark");let yakin=true,tY=0,tD=7.5,yw=PI/2,pt=.12,cs=0;let mx=0,ex=0,mr=1.9,er=1.9,ev=false,mv=true;
    yE.visible=yM.visible=yU.visible=yE2.visible=yM2.visible=false;yU.scale.set(.62*yU.material.map.image.width/yU.material.map.image.height,.62,1);lE.visible=lM.visible=false;
    const gunAci=(saat,per)=>saat/per*2*PI;
    if(mod==="soru"){mr=1.35;tD=lerp(11,9.4,eio(o.pu));ma.rotation.y=t*.25}
    else if(mod==="gun"||mod==="fark"){ev=true;mr=er=.88;mx=1.2;ex=-1.2;tD=9.4;
      // Dünya 24 sa'de, Mars 24,62 sa'de bir tur: aynı saatte Mars geride kalır
      const kk=mod==="gun"?sm(.1,.95,o.pu):1;const gun=mod==="fark"?1+Math.floor(sm(.05,.9,o.pu)*6.999):kk;const saat=kk*24;
      e.rotation.y=gunAci(saat,24);ma.rotation.y=gunAci(saat,24.617);
      yE.visible=yM.visible=yE2.visible=yM2.visible=true;yE.set("DÜNYA");yM.set("MARS");yE2.set("24 SA");yM2.set("24 SA 37 DK");yE.position.set(ex,-1.2,0);yM.position.set(mx,-1.2,0);yE2.position.set(ex,-1.6,0);yM2.position.set(mx,-1.6,0);
      if(mod==="fark"){yU.visible=true;const g=1+Math.floor(sm(.05,.9,o.pu)*6.999);const dk=g*37;yU.set("GÜN "+g+" · +"+(dk>=60?Math.floor(dk/60)+" SA "+(dk%60)+" DK":dk+" DK"));yU.position.set(0,1.45,0);ma.rotation.y=-gunAci(g*37/60,24.617)*1.0+t*.0}}
    else if(mod==="yas"){ev=true;mr=er=.88;mx=1.2;ex=-1.2;tD=9.4;e.rotation.y=t*.3;ma.rotation.y=t*.3;
      yE.visible=yM.visible=true;yE.set("DÜNYA");yM.set("MARS");yE.position.set(ex,-1.2,0);yM.position.set(mx,-1.2,0);
      yE2.visible=yM2.visible=true;const k=sm(.1,.5,o.pu);yE2.set(Math.round(10*k)+" YAŞ");yM2.set((5.3*k).toFixed(1).replace(".",",")+" YAŞ");yE2.position.set(ex,-1.6,0);yM2.position.set(mx,-1.6,0)}
    else if(mod==="son"){mr=1.2;tD=9.4;ma.rotation.y=t*.25}
    else{yakin=false}
    gn.visible=oE.visible=oM.visible=!yakin;izE.visible=izM.visible=!yakin;
    if(yakin){ma.position.set(mx,0,0);ma.scale.setScalar(mr);e.visible=ev;e.position.set(ex,0,0);e.scale.setScalar(er);dl.position.set(4,3,10);amb.intensity=.6;
      orb(c,V3(0,tY,0),tD,yw,pt);kaydir(c,tD*.11)}
    else{// yörünge görünümü (üstten eğik)
      e.visible=true;ma.scale.setScalar(.42);e.scale.setScalar(.38);gn.ayar(t,1);dl.position.set(0,6,0);amb.intensity=.75;
      let fm=0;const A0=PI*.5;
      if(mod==="uzak"){lE.visible=lM.visible=true;lE.ilerle(sm(.05,.45,o.pu));lM.ilerle(sm(.4,.85,o.pu));fm=0;izE.ilerle(0);izM.ilerle(0)}
      else{fm=sm(.08,.92,o.pu);}
      const aM=A0-fm*2*PI,aE=A0-fm*2*PI*(687/365.25);
      ma.position.set(Math.cos(aM)*RM,0,Math.sin(aM)*RM);e.position.set(Math.cos(aE)*RE,0,Math.sin(aE)*RE);ma.rotation.y=t*.5;e.rotation.y=t*.5;
      if(mod!=="uzak"){izM.ilerle(fm);izE.ilerle(Math.min(1,fm*(687/365.25)));izM.rotation.y=-A0+A0;izE.rotation.y=0}
      // iz çizgileri başlangıç açısından (A0) saat yönünün tersine çizilir: döndür
      izE.rotation.y=izM.rotation.y=0;izE.scale.set(1,1,-1);izM.scale.set(1,1,-1);izE.rotation.y=izM.rotation.y=PI;
      yU.visible=mod!=="uzak";yU.position.set(0,0,2.1);yU.scale.multiplyScalar(1.15);
      if(mod==="yil")yU.set("GÜN "+Math.round(fm*687));
      else if(mod==="iki")yU.set("TUR: DÜNYA "+(fm*1.881).toFixed(2).replace(".",",")+" · MARS "+fm.toFixed(2).replace(".",","));
      else if(mod==="sol")yU.set("SOL "+Math.round(fm*669));
      orb(c,V3(0,0,0),26,PI/2,1.0);kaydir(c,26*.085)}
  }}};

/* ================= TOZLU PANEL: kirlenme kaybı ================= */
function tozTex(){const c=document.createElement("canvas");c.width=256;c.height=512;const x=c.getContext("2d");x.fillStyle="rgba(170,135,95,.42)";x.fillRect(0,0,256,512);
  let q=7;const r=()=>(q=(q*16807)%2147483647)/2147483647;for(let i=0;i<2600;i++){x.fillStyle=`rgba(${90+r()*60},${60+r()*40},${30+r()*30},${.3+r()*.5})`;const z=1+r()*3;x.fillRect(r()*256,r()*512,z,z)}
  for(let i=0;i<9;i++){x.fillStyle="rgba(250,248,240,.9)";x.beginPath();x.ellipse(r()*256,r()*512,4+r()*6,3+r()*5,r()*3,0,6.283);x.fill()}
  for(let i=0;i<30;i++){x.fillStyle="rgba(230,200,60,.6)";x.beginPath();x.arc(r()*256,r()*512,2,0,6.283);x.fill()}
  const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return t}
S.toz=()=>{const sc=new THREE.Scene();const c=cam(46);studyo(sc);isik(sc,"#ffffff",2.4,"#6FE3FF",1.6);const pn=panel();sc.add(pn);
  const zar=new THREE.Mesh(new THREE.PlaneGeometry(1.1,2.25),new THREE.MeshBasicMaterial({map:tozTex(),transparent:true,opacity:0,depthWrite:false}));zar.position.z=.03;zar.userData.kabuk=1;pn.add(zar);
  const sun=spr("#ffe2a8",6,0);sun.position.set(-6,8,4);sc.add(sun);
  const NI=500,ip=pts(NI,.07);sc.add(ip);const IP=ip.geometry.attributes.position.array,IC=ip.geometry.attributes.color.array;const ID=[];for(let i=0;i<NI;i++)ID.push([rnd(),rnd(),rnd(),rnd()<.12]);
  const tel=[];for(let i=0;i<4;i++){const t=telefon();t.scale.setScalar(.5);sc.add(t);tel.push(t)}
  const tk=new THREE.Group();sc.add(tk);const kare=[];const kG=new THREE.PlaneGeometry(.11,.11);for(let i=0;i<365;i++){const m=new THREE.Mesh(kG,new THREE.MeshBasicMaterial({color:L("#f0a020")}));m.userData.kabuk=1;m.position.set((i%19)*.13-1.17,1.25-Math.floor(i/19)*.13,0);tk.add(m);kare.push(m)}
  const rb=new THREE.Group();const rg=new THREE.Mesh(new THREE.BoxGeometry(1.3,.12,.14),std("#e0452a",.2,.5));const fr=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,1.25,12),std("#1580bd",.1,.6));fr.rotation.z=PI/2;fr.position.set(0,-.1,.06);rb.add(rg,fr);pn.add(rb);
  return{sc,c,bl:[.8,.5,.78],kur(o){const t=o.t,mod=o.p.mod||"soru";
    let tozk=0,ik=0,tv=0,tkv=0,rbv=false,rbk=0,pY=1.75,rx=0,ry=0,cD=8.4,cY=1.0,yaw=1.57,pit=.1;
    if(mod==="soru"){ry=Math.sin(t*.5)*.5;tozk=sm(.3,.9,o.pu)*.6;cD=lerp(9.5,8.4,eio(o.pu))}
    else if(mod==="uret"){tozk=0;ik=1;rx=-.5;tv=sm(.3,.7,o.pu)}
    else if(mod==="toz"){tozk=sm(.05,.85,o.pu);ry=.15;rx=-.15}
    else if(mod==="isin"){tozk=1;ik=1;rx=-.5}
    else if(mod==="takvim"){tozk=1;tkv=1;pY=-5}
    else if(mod==="telefon"){tozk=1;tv=1;rx=0}
    else if(mod==="yil"){tozk=1;tv=1;rx=0}
    else if(mod==="robot"){rbv=true;rbk=sm(.15,.85,o.pu);tozk=1;rx=0}
    else{tozk=0;rx=0;ry=Math.sin(t*.5)*.4}
    pn.position.set(0,pY+Math.sin(t*1.2)*.03,0);pn.rotation.set(rx,ry,0);pn.visible=!tkv;
    // toz örtüsü: robot yukarıdan aşağı temizler (örtü yalnız robotun altında kalır)
    const sY=1.125-rbk*2.25;const hz=rbv?Math.max(.001,sY+1.125):2.25;zar.scale.y=hz/2.25;zar.position.y=rbv?(sY-1.125)/2:0;
    zar.material.map.repeat.set(1,hz/2.25);zar.material.map.offset.set(0,0);zar.material.opacity=tozk*.85;zar.visible=tozk>0.01&&hz>.01;
    rb.visible=rbv;rb.position.set(0,sY,.06);fr.rotation.x=t*12;
    // ışınlar: bir kısmı tozda durur
    sun.material.opacity=.9*ik;ip.visible=ik>0;
    if(ik>0){pn.updateMatrixWorld(true);const n=V3(0,0,1).applyEuler(pn.rotation),up=V3(0,1,0).applyEuler(pn.rotation),rt=V3(1,0,0).applyEuler(pn.rotation);
      for(let i=0;i<NI;i++){const[a,b,ph,dur]=ID[i];const q=(t*.55+ph)%1;const hit=pn.position.clone().addScaledVector(rt,(a-.5)*1.0).addScaledVector(up,(b-.5)*2.1).addScaledVector(n,.06);let x;const durdu=dur&&tozk>.5;
        if(q<.5){x=sun.position.clone().lerp(hit,q/.5);IC.set([.9,.76,.5],i*3)}
        else if(durdu){x=hit.clone().addScaledVector(n,.02);const f=1-(q-.5)*2;IC.set([.7*f,.45*f,.2*f],i*3)}
        else{x=hit.clone().addScaledVector(n,-.06);IC.set([0,0,0],i*3)}
        IP.set([x.x,x.y,x.z],i*3)}ip.geometry.attributes.position.needsUpdate=ip.geometry.attributes.color.needsUpdate=true}
    // telefonlar: panelin iki yanında
    tel.forEach((ph,i)=>{ph.visible=tv>0;const sag=i>=2;const j=i%2;ph.position.set((sag?1.25:-1.25),pY+.55-j*1.1+.06*Math.sin(t*1.5+i),.3);ph.rotation.set(0,sag?-.35:.35,0);ph.scale.setScalar(.42*eo(tv));
      const dolu=mod==="uret";ph.ekran.ciz(dolu?.9:.12,dolu?"":"TOZ")});
    // takvim: 11–18 gün gri
    tk.visible=tkv>0;tk.position.set(0,1.6,0);tk.scale.setScalar(.78);if(tkv){const g=Math.round(lerp(0,18,sm(.2,.8,o.pu)));kare.forEach((m,i)=>{m.material.color=L(i>=365-g?(i>=365-11?"#5a5f6b":"#9aa0ad"):"#f0a020")})}
    if(tkv){cD=7.6;cY=.6;pit=.04}
    orb(c,V3(0,cY,0),cD,yaw,pit);kaydir(c,cD*.0)}}};


/* ================= GÜNEŞ'E UÇAKLA: 150 milyon km ÷ 900 km/sa ≈ 19 yıl; Parker sondası ≈ 9 gün ================= */
function ucakM(){const g=new THREE.Group();const b=std("#eef1f6",.1,.4),m=std("#1580bd",.2,.4);
  const gv=new THREE.Mesh(new THREE.CylinderGeometry(.13,.13,1.3,16),b);g.add(gv);
  const bu=new THREE.Mesh(new THREE.ConeGeometry(.13,.36,16),b);bu.position.y=.83;g.add(bu);
  const kn=new THREE.Mesh(new THREE.BoxGeometry(1.6,.3,.04),m);kn.position.y=.08;g.add(kn);
  const ku=new THREE.Mesh(new THREE.BoxGeometry(.62,.15,.03),m);ku.position.y=-.55;g.add(ku);
  const dk=new THREE.Mesh(new THREE.BoxGeometry(.03,.26,.3),m);dk.position.set(0,-.52,-.15);g.add(dk);return g}
function sondaM(){const g=new THREE.Group();const k=new THREE.Mesh(new THREE.CylinderGeometry(.46,.46,.07,32),std("#eef1f6",.1,.5));k.position.y=.4;g.add(k);
  const gv=new THREE.Mesh(new THREE.BoxGeometry(.34,.5,.34),std("#d9ab30",.6,.35));g.add(gv);
  const pn=new THREE.Mesh(new THREE.BoxGeometry(1.0,.12,.02),std("#16264f",.3,.3));pn.position.y=-.05;g.add(pn);return g}
S.ucak=()=>{const sc=new THREE.Scene();const c=cam(50);uzay(sc);const SY=6.2,EY=-6,GR=1.5,ER=.7;
  const g=gunes(GR);g.position.y=SY;sc.add(g);const e=dunya(ER);e.position.y=EY;sc.add(e);
  const ay=new THREE.Mesh(new THREE.SphereGeometry(.2,32,24),new THREE.MeshStandardMaterial({map:ayTex(),roughness:.95,metalness:0}));ay.position.set(1.2,EY+.3,0);sc.add(ay);
  const dl=new THREE.DirectionalLight(L("#ffffff"),1.5);dl.position.set(2,8,6);sc.add(dl);sc.add(new THREE.AmbientLight(L("#40506a"),.55));
  const Y0=EY+ER+.15,Y1=SY-GR-.25;const yer=f=>lerp(Y0,Y1,f);
  const yol=cizgi([V3(0,Y0,0),V3(0,Y1,0)],"#1580bd",.6,.22);sc.add(yol);
  const olc=olcu(V3(2.1,EY,0),V3(2.1,SY,0),"150 MİLYON KM","#F2C46B",{boy:1.0,yer:V3(.3,0,0),cent:.3});olc.children[3].center.set(0,.5);sc.add(olc);
  const ayY=yazi("≈ 390 × AY YOLU",{boy:.6,renk:"#1580bd"});ayY.position.set(-2.6,.2,0);sc.add(ayY);
  const ayE=yazi("AY",{boy:.42,renk:"#16213a"});ayE.position.set(1.75,EY+.3,0);sc.add(ayE);
  const uc=ucakM();uc.scale.setScalar(1.25);sc.add(uc);
  const sa=dyazi({boy:1.6,renk:"#e0452a",sol:true,gen:14});sc.add(sa);
  const hz=dyazi({boy:.6,renk:"#1580bd",gen:12});sc.add(hz);
  const atm=new THREE.Mesh(new THREE.TorusGeometry(ER*2.2,.03,8,96),bas("#1580bd",{transparent:true,opacity:0}));atm.position.y=EY;sc.add(atm);
  const hy=yazi("HAVA YOK!",{boy:.75,renk:"#e0452a"});sc.add(hy);const at=yazi("ATMOSFER",{boy:.35,renk:"#1580bd"});at.position.set(-1.9,EY+1.25,0);sc.add(at);
  const so=sondaM();so.scale.setScalar(1.1);so.rotation.x=.45;sc.add(so);const SX=-1.1;
  const iz=[];for(let i=0;i<14;i++){const s=spr("#f2c46b",.55-i*.025,0);sc.add(s);iz.push(s)}
  const sy=dyazi({boy:1.4,renk:"#de8400",gen:14});const sp=dyazi({boy:.6,renk:"#de8400",gen:14});sc.add(sp);sc.add(sy);
  const P={tam:{x:0,y:-5.4,d:47,w:1.57,p:.05},bas:{x:0,y:-6.6,d:58,w:1.57,p:.05},yakin:{x:0,y:-7.1,d:13,w:1.57,p:.08},ucak:{x:0,y:-6.4,d:11,w:1.57,p:.06}};
  const poz=m=>m==="soru"?P.tam:(m==="hiz"||m==="hava")?P.yakin:m==="parker"?P.ucak:P.tam;
  return{sc,c,bl:[.8,.5,.75],kur(o){const t=o.t,mod=o.p.mod||"soru";e.ayar(t,{rot:2.4});ay.rotation.y=.6;
    let f=0,yaz="",hzt="",hav=false,sv=false,sf=0,syz="",ok=0,ayv=0;
    if(mod==="soru"){f=0}
    else if(mod==="mesafe"){ok=sm(.05,.6,o.pu);ayv=sm(.55,.75,o.pu)}
    else if(mod==="hiz"){f=.012*eio(sm(.1,1,o.pu));hzt="900 KM/SA"}
    else if(mod==="saat"){f=lerp(.012,.3,sm(.05,.95,o.pu));yaz=Math.round(f*166667).toLocaleString("tr-TR")+" SAAT"}
    else if(mod==="gun"){f=lerp(.3,.6,sm(.05,.95,o.pu));yaz="GÜN "+Math.round(f*6944).toLocaleString("tr-TR")}
    else if(mod==="yil"){f=lerp(.6,.97,eio(sm(.05,.9,o.pu)));yaz="YIL "+(f*19.0).toFixed(1).replace(".",",")}
    else if(mod==="hava"){hav=true}
    else if(mod==="parker"){f=0;sv=true;sf=0;syz="692.000 KM/SA"}
    else if(mod==="hizli"){f=.03;sv=true;sf=eio(sm(.1,.8,o.pu));syz="GÜN "+Math.round(sf*9)}
    else{f=.5;yaz="≈ 19 YIL";sv=true;sf=1;syz="≈ 9 GÜN"}
    olc.ilerle(mod==="mesafe"?ok:(mod==="son"?1:0));olc.visible=mod==="mesafe";ayY.material.opacity=ayv;ayE.material.opacity=mod==="mesafe"?1:0;
    // uçak
    const y=yer(f);uc.position.set(0,y,0);uc.rotation.set(0,0,0);uc.visible=mod!=="parker";
    if(hav){const k=sm(.15,.9,o.pu);uc.position.set(lerp(.2,1.6,k),Y0+lerp(.5,1.0,k),0);uc.rotation.z=-k*3.6;uc.rotation.y=k*1.2;uc.scale.setScalar(.8)}else uc.scale.setScalar(1.25);
    sa.visible=!!yaz;sa.set(yaz);sa.position.set(.9,y+.1,0);
    hz.visible=!!hzt;hz.set(hzt);hz.position.set(0,y+1.45,0);
    atm.material.opacity=hav?.7:0;atm.scale.setScalar(1);at.material.opacity=hav?1:0;hy.material.opacity=hav?sm(.3,.45,o.pu):0;hy.position.set(-.6,Y0+1.2,0);
    // sonda
    so.visible=sv;const sy_=yer(sf);so.position.set(SX,sy_,0);so.rotation.z=mod==="parker"?Math.sin(t*30)*.03:0;
    const iza=mod==="parker"?.8:(mod==="hizli"&&sf>.01&&sf<.99?1:0);iz.forEach((s,i)=>{s.position.set(SX,sy_-.5-i*(mod==="parker"?.12:.35),0);s.material.opacity=iza*(1-i/14)});
    const pk=mod==="parker";sp.visible=false;sp.set(syz);sp.position.set(-.3,Y0+2.05,0);if(pk){so.position.set(-1.5,Y0+.9,0);iz.forEach((s,i)=>s.position.set(-1.5,Y0+.4-i*.1,0))}
    sy.visible=sv&&!pk;sy.set(syz);sy.position.set(mod==="son"?-3.6:SX-3.0,mod==="son"?sy_-1.8:sy_+.2,0);
    // kamera: önceki parçanın pozundan akar
    const on=o.pi>0?(o.pp[o.pi-1].mod||"soru"):"soru";let A=poz(on),B=poz(mod);if(mod==="soru"){A=P.bas;B=P.tam}
    const k=mod==="soru"?eio(sm(.25,1,o.pu)):eio(sm(0,.3,o.pu));const dd=lerp(A.d,B.d,k);
    [sa,sy].forEach(x=>{if(!x.userData.s0)x.userData.s0=x.scale.clone();x.scale.set(x.userData.s0.x*dd/47,x.userData.s0.y*dd/47,1)});
    orb(c,V3(lerp(A.x,B.x,k),lerp(A.y,B.y,k),0),dd,lerp(A.w,B.w,k)+Math.sin(t*.2)*.05,lerp(A.p,B.p,k))}}};

/* ================= TRAFO UĞULTUSU: demir çekirdek her turda 2 kez uzar → 50 Hz × 2 = 100 Hz ================= */
S.trafo=()=>{const sc=new THREE.Scene();const c=cam(46);studyo(sc);isik(sc,"#ffffff",2.3,"#6FE3FF",1.4);
  const W=3.0,H=3.0,T=.45,D=.7,NL=6,CY=1.85;const cek=new THREE.Group();cek.position.y=CY;sc.add(cek);const sac=std("#8a93a3",.6,.45);
  const pe=(w,h,x,y)=>{for(let i=0;i<NL;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,D/NL*.86),sac);m.position.set(x,y,-D/2+(i+.5)*D/NL);cek.add(m)}};
  pe(T,H-2*T,-W/2+T/2,0);pe(T,H-2*T,W/2-T/2,0);pe(W,T,0,H/2-T/2);pe(W,T,0,-H/2+T/2);
  const bak=std("#c8742a",.55,.35,{transparent:true,opacity:1});const bob=[];
  [-1,1].forEach(s=>{const b=new THREE.Group();const cy=new THREE.Mesh(new THREE.CylinderGeometry(.6,.6,1.6,32,1,true),bak);b.add(cy);
    for(let i=0;i<7;i++){const r=new THREE.Mesh(new THREE.TorusGeometry(.61,.018,6,40),bas("#7a3e12",{transparent:true,opacity:1}));r.rotation.x=PI/2;r.position.y=-.7+i*.233;b.add(r)}
    b.position.set(s*(W/2-T/2),CY,0);sc.add(b);bob.push(b)});
  const taban=new THREE.Mesh(new THREE.BoxGeometry(W+.9,.25,D+.8),std("#3a4152",.3,.6));taban.position.y=.125;sc.add(taban);
  const halk=[];for(let i=0;i<4;i++){const r=new THREE.Mesh(new THREE.TorusGeometry(1,.025,8,120),bas("#de8400",{transparent:true,opacity:0}));r.position.set(0,CY,.5);sc.add(r);halk.push(r)}
  const e1=yazi("DEMİR ÇEKİRDEK",{boy:.38,renk:"#16213a"});e1.position.set(0,CY+H/2+.45,0);sc.add(e1);
  const e2=yazi("BOBİN",{boy:.34,renk:"#de8400"});e2.position.set(-W/2-.95,CY+.95,0);sc.add(e2);
  const ab=yazi("abartılı gösterim",{boy:.36,renk:"#5a6170"});ab.position.set(0,CY+H/2+.95,0);sc.add(ab);
  const hzY=dyazi({boy:.75,renk:"#e0452a",gen:9});hzY.position.set(0,CY+H/2+.35,0);sc.add(hzY);
  // yan alan (GX): grafik / saç / piyano
  const GX=14,GY=1.9;
  const gr=new THREE.Group();gr.position.set(GX,GY,0);sc.add(gr);const N=240,X0=-2.3,X1=2.3;
  const ak=[],by=[];for(let i=0;i<=N;i++){const u=i/N;const x=lerp(X0,X1,u);const s=Math.sin(u*2*PI*2);ak.push(V3(x,1.3+.55*s,0));by.push(V3(x,-.5+.9*s*s,0))}
  const akL=cizgi(ak,"#1580bd",1);const byL=cizgi(by,"#e0452a",1);gr.add(akL,byL);
  gr.add(cizgi([V3(X0,1.3,0),V3(X1,1.3,0)],"#9aa0ad",1),cizgi([V3(X0,-.5,0),V3(X1,-.5,0)],"#9aa0ad",1));
  const gA=yazi("AKIM",{boy:.36,renk:"#1580bd"});gA.position.set(X0-.15,2.1,0);gA.center.set(0,.5);gr.add(gA);
  const gB=yazi("ÇEKİRDEĞİN BOYU",{boy:.36,renk:"#e0452a"});gB.position.set(X0-.15,.6,0);gB.center.set(0,.5);gr.add(gB);
  const t1=yazi("1 TUR",{boy:.32,renk:"#16213a"});t1.position.set(lerp(X0,X1,.25),2.1,0);gr.add(t1);
  const tep=[];for(let i=0;i<4;i++){const u=(i*2+1)/8;const s=spr("#e0452a",.5,0);s.position.set(lerp(X0,X1,u),.4,0);gr.add(s);const k=cizgi([V3(lerp(X0,X1,u),1.85,0),V3(lerp(X0,X1,u),.4,0)],"#e0452a",.6,.08);k.material.opacity=0;gr.add(k);tep.push([s,k,u])}
  const m1=spr("#1580bd",.45,0),m2=spr("#e0452a",.45,0);gr.add(m1,m2);
  const sac_=new THREE.Group();sac_.position.set(GX,GY+.35,0);sc.add(sac_);
  const kil=new THREE.Mesh(new THREE.CylinderGeometry(.85,.85,4.2,40),std("#6b4a2b",0,.7));kil.rotation.z=PI/2;kil.position.y=.5;sac_.add(kil);
  const mik=new THREE.Mesh(new THREE.BoxGeometry(4.2,.1,.1),bas("#e0452a"));mik.position.y=-.75;sac_.add(mik);
  const sY1=yazi("SAÇ TELİ ≥ 17 µm",{boy:.38,renk:"#6b4a2b"});sY1.position.set(0,1.75,0);sac_.add(sY1);
  const sY2=yazi("1 µm · DEMİRİN UZAMASI (1 m'de)",{boy:.3,renk:"#e0452a"});sY2.position.set(0,-1.15,0);sac_.add(sY2);
  const pi_=new THREE.Group();pi_.position.set(GX,GY+.3,0);sc.add(pi_);const tus=[];
  for(let i=0;i<8;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(.54,2.2,.3),std(i===4?"#f0a020":"#fbfbf8",0,.5));m.position.set((i-3.5)*.58,0,0);pi_.add(m);tus.push(m)}
  [0,1,3,4,5].forEach(i=>{const m=new THREE.Mesh(new THREE.BoxGeometry(.32,1.3,.36),std("#1b2233",0,.5));m.position.set((i-3.5)*.58+.29,.45,.1);pi_.add(m)});
  const pY=yazi("SOL ≈ 98 Hz",{boy:.45,renk:"#de8400"});pY.position.set(.0,1.65,0);pi_.add(pY);
  const P={cek:{x:0,y:CY-1.45,d:16.5,w:1.3,p:.12},yan:{x:GX,y:GY-.63,d:11.5,w:1.57,p:.04}};
  const YAN={frekans:1,olcu:1,iki:1,nota:1};const poz=m=>YAN[m]?P.yan:P.cek;
  return{sc,c,bl:[.8,.5,.8],kur(o){const t=o.t,mod=o.p.mod||"soru";
    // çekirdek titreşimi (boy ∝ sin²): yavaş modda görünür, uğultu modunda hızlı
    let fv=0,amp=0,ses=0,hz="",bobOp=1,e1v=0,e2v=0,abv=0;
    if(mod==="soru"){fv=9;amp=.012;ses=.7}
    else if(mod==="cekirdek"){bobOp=lerp(1,.18,sm(.1,.5,o.pu));e1v=sm(.3,.5,o.pu);e2v=sm(.05,.25,o.pu)}
    else if(mod==="uzama"){bobOp=.18;fv=.55;amp=.05;e1v=1;abv=sm(.2,.4,o.pu)}
    else if(mod==="hesap"){fv=9;amp=.012;ses=1;hz="100 Hz"}
    else if(mod==="abd"){fv=11;amp=.012;ses=1;hz="120 Hz"}
    else if(mod==="son"){fv=9;amp=.012;ses=1;hz="100 Hz"}
    const s=Math.sin(t*2*PI*fv/2);const uz=1+amp*s*s;cek.scale.set(uz,uz,1);
    bak.opacity=bobOp;bob.forEach(b=>b.children.forEach((x,i)=>{if(i)x.material.opacity=bobOp}));
    e1.material.opacity=e1v;e2.material.opacity=e2v;ab.material.opacity=abv;hzY.visible=!!hz;hzY.set(hz);
    halk.forEach((r,i)=>{const ph=((t*(mod==="abd"?.75:.6))+i/4)%1;r.scale.setScalar(2.3+ph*1.9);r.material.opacity=ses*(1-ph)*.6});
    // yan alan
    gr.visible=mod==="frekans"||mod==="iki";sac_.visible=mod==="olcu";pi_.visible=mod==="nota";
    if(gr.visible){const ik=mod==="iki";const dr=ik?1:sm(.1,.85,o.pu);akL.ilerle(dr);byL.ilerle(ik?sm(.1,.8,o.pu):0);byL.visible=gB.visible=ik;t1.material.opacity=ik?0:sm(.5,.7,o.pu);
      const u=ik?sm(.1,.8,o.pu):dr;const x=lerp(X0,X1,u),sn=Math.sin(u*2*PI*2);m1.position.set(x,1.3+.55*sn,0);m1.material.opacity=1;m2.position.set(x,-.5+.9*sn*sn,0);m2.material.opacity=ik?1:0;
      tep.forEach(([sp,k,uu])=>{const on=ik&&u>=uu;sp.material.opacity=on?1:0;k.material.opacity=on?.6:0})}
    if(sac_.visible){mik.scale.x=sm(.3,.6,o.pu)+.001;sY2.material.opacity=sm(.45,.65,o.pu)}
    if(pi_.visible){tus[4].position.z=-.08*sm(.2,.35,o.pu)}
    const on=o.pi>0?(o.pp[o.pi-1].mod||"soru"):"soru";const A=poz(on),B=poz(mod);const k=A.x!==B.x?1:eio(sm(0,.3,o.pu));
    const yw=lerp(A.w,B.w,k)+(B===P.cek?Math.sin(t*.25)*.08:0);
    orb(c,V3(lerp(A.x,B.x,k),lerp(A.y,B.y,k),0),lerp(A.d,B.d,k),yw,lerp(A.p,B.p,k))}}};


/* ---------- KİLİT: Ay neden hep aynı yüzünü gösterir (kütleçekim kilidi) ---------- */
S.kilit=()=>{const sc=new THREE.Scene();const c=cam(46);uzay(sc);const R=6.2,ER=1.7,MR=.95;
  const e=dunya(ER);sc.add(e);const dl=new THREE.DirectionalLight(L("#ffffff"),1.5);dl.position.set(6,5,9);sc.add(dl);sc.add(new THREE.AmbientLight(L("#5a6a88"),.75));
  const yr=[];for(let i=0;i<=240;i++){const a=i/240*2*PI;yr.push(V3(Math.cos(a)*R,0,Math.sin(a)*R))}const yol=cizgi(yr,"#1580bd",.55,.25);sc.add(yol);
  const yol2=cizgi(yr,"#e0452a",1);sc.add(yol2);
  const aym=new THREE.MeshStandardMaterial({map:ayTex(),roughness:.95,metalness:0});const sg=new THREE.SphereGeometry(MR,64,48);
  const yuzM=bas("#e0452a");const isaretli=()=>{const m=new THREE.Mesh(sg,aym);const y=new THREE.Mesh(new THREE.CylinderGeometry(.34,.34,.08,32),yuzM);y.rotation.z=-PI/2;y.position.x=MR*.97;m.add(y);
    const k=new THREE.Mesh(new THREE.ConeGeometry(.16,.42,16),yuzM);k.rotation.z=-PI/2;k.position.x=MR+.32;m.add(k);return m};
  const ayG=new THREE.Group();sc.add(ayG);const sek=new THREE.Group();ayG.add(sek);const ay=isaretli();sek.add(ay);
  const bak=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,1,8),bas("#e0452a",{transparent:true,opacity:.6}));sc.add(bak);
  const eks=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,3.4,8),bas("#16213a"));ayG.add(eks);
  const don=new THREE.Mesh(new THREE.TorusGeometry(MR*1.45,.045,8,80,PI*1.6),bas("#de8400",{transparent:true,opacity:0}));don.rotation.x=PI/2;ayG.add(don);
  const donU=new THREE.Mesh(new THREE.ConeGeometry(.16,.4,16),bas("#de8400",{transparent:true,opacity:0}));don.add(donU);donU.position.set(Math.cos(PI*1.6)*MR*1.45,Math.sin(PI*1.6)*MR*1.45,0);donU.rotation.z=PI*1.6;
  const hay=[];for(let i=0;i<3;i++){const m=isaretli();m.traverse(x=>{if(x.material){x.material=x.material.clone();x.material.transparent=true;x.material.opacity=0}});m.scale.setScalar(.7);sc.add(m);hay.push(m)}
  const sa=dyazi({boy:.85,renk:"#e0452a",gen:10});sc.add(sa);
  const etk={};const ety=(k,t,r)=>{const y=yazi(t,{boy:.55,renk:r||"#16213a"});y.material.opacity=0;sc.add(y);etk[k]=y};
  ety("eks","KENDİ EKSENİ","#de8400");ety("abr","abartılı gösterim","#5a6170");etk.abr.scale.multiplyScalar(.8);ety("fren","FREN","#e0452a");ety("kilit","KİLİTLİ ✓","#1580bd");ety("tur","1 TUR = 1 DÖNÜŞ","#16213a");ety("dun","DÜNYA","#1580bd");
  // pizza: 10 dilim, 5 mavi + 1 turuncu (yalpalama payı)
  const piz=new THREE.Group();sc.add(piz);const dil=[];for(let i=0;i<10;i++){const m=new THREE.Mesh(new THREE.CircleGeometry(1,24,PI/2-i*PI/5-PI/5*.96,PI/5*.92),bas("#c9ccd3",{transparent:true,opacity:0}));piz.add(m);dil.push(m)}
  
  const DEL={tur:2*PI,eksen:PI*.5};const GEN={soru:1,tur:1,masa:1,kilit:1,son:1};
  const teta=o=>{let s=0;for(let i=0;i<o.pi;i++){const m=o.pp[i].mod;s+=DEL[m]||0}const m=o.p.mod;const f=m==="tur"?eio(sm(.08,.9,o.pu)):m==="eksen"?eio(sm(.15,.85,o.pu)):0;return [-.4+o.bt*.05+s+(DEL[m]||0)*f,-.4+(o.bt-o.pt)*.05+s]};
  const tq=cam(46);const yanY=(mp,yw)=>{const r=V3(-Math.sin(yw),0,Math.cos(yw));const ed=mp.clone().multiplyScalar(-1);return ed.dot(r)>0?-1:1};
  const poz=(mod,mp,th0,ru)=>{let tg,d,yw,pt,ky=.115;
    if(GEN[mod]){tg=V3(0,0,0);d=31;yw=.9+ru*.15;pt=.82;ky=mod==="soru"?.04:.085}
    else if(mod==="yuzde"){d=11.5;yw=Math.atan2(-mp.z,-mp.x)+1.0;pt=.22;const r=V3(-Math.sin(yw),0,Math.cos(yw));tg=mp.clone().addScaledVector(r,1.1*yanY(mp,yw))}
    else if(mod==="eksen"){tg=mp.clone();d=12;yw=th0+1.0;pt=.42}
    else{tg=mp.clone();d=12.5;yw=Math.atan2(mp.z,mp.x)+1.15;pt=.38}
    return{tg,d,yw,pt,ky}};
  return{sc,c,bl:[.7,.5,.8],kur(o){const t=o.t,mod=o.p.mod||"soru";e.ayar(t,{rot:1});
    const [th,th0]=teta(o);const mp=V3(Math.cos(th)*R,0,Math.sin(th)*R);ayG.position.copy(mp);
    let spin=0,sis=1,ofs=0;
    if(mod==="siskin")sis=lerp(1,1.32,eio(sm(.2,.7,o.pu)));
    if(mod==="fren"){sis=1.32;spin=6*PI*(1-Math.pow(1-o.pu,2));ofs=.45*(1-sm(.1,.95,o.pu))}
    if(mod==="kilit")sis=lerp(1.32,1,eio(sm(0,.5,o.pu)));
    if(mod==="yuzde")ofs=.15*Math.sin(t*2.4);
    sek.rotation.y=PI-th+ofs;sek.scale.set(sis,1/Math.sqrt(sis),1/Math.sqrt(sis));ay.rotation.y=spin-ofs*(mod==="fren"?1:0);
    // bakış çizgisi
    const yz=V3(1,0,0).applyQuaternion(ay.getWorldQuaternion(new THREE.Quaternion()));const a0=mp.clone().addScaledVector(yz,MR+.6);const b0=mp.clone().multiplyScalar(ER/R*1.15);
    segAyar(bak,a0,b0);bak.visible=GEN[mod]||mod==="kilit";bak.material.opacity=mod==="soru"?.35+.25*Math.sin(t*3):.6;
    yol.material.opacity=GEN[mod]?.55:.25;yol2.visible=mod==="tur";if(mod==="tur"){const f=eio(sm(.08,.9,o.pu));yol2.ilerle(1);const n=240,st=Math.floor((((th0%(2*PI))+2*PI)%(2*PI))/(2*PI)*n);
      const P=[];for(let i=0;i<=Math.ceil(n*f);i++){const a=th0+i/n*2*PI;P.push(V3(Math.cos(a)*R,.02,Math.sin(a)*R))}yol2.geometry.setFromPoints(P.length>1?P:[mp,mp]);
      sa.visible=true;sa.set("GÜN "+(27.3*f).toFixed(1).replace(".",","));sa.position.copy(mp).add(V3(0,2.0,0))}else sa.visible=false;
    eks.visible=mod==="eksen";const dv=mod==="eksen"?sm(.05,.25,o.pu):0;don.material.opacity=dv;donU.material.opacity=dv;don.rotation.z=th*.5;
    // hayalet konumlar (masa)
    hay.forEach((m,i)=>{const a=th+i*PI/2+PI/2;const v=mod==="masa"?sm(.1+i*.17,.22+i*.17,o.pu):0;m.position.set(Math.cos(a)*R,0,Math.sin(a)*R);m.rotation.y=PI-a;m.traverse(x=>{if(x.material)x.material.opacity=v*.85});m.visible=v>.01});
    const g=(k,v,p)=>{etk[k].material.opacity=v;if(p)etk[k].position.copy(p)};
    g("eks",0);g("abr",mod==="siskin"?sm(.3,.5,o.pu):0,mp.clone().add(V3(0,-1.7,0)));g("fren",0);
    g("kilit",mod==="kilit"?sm(.3,.5,o.pu):0,mp.clone().add(V3(0,2.1,0)));g("tur",mod==="masa"?sm(.75,.9,o.pu):0,V3(0,3.4,0));g("dun",GEN[mod]?.9:0,V3(0,-ER-.9,0));
    // pizza
    const pv=mod==="yuzde";piz.visible=pv;
    // kamera
    const on=o.pi>0?(o.pp[o.pi-1].mod||"soru"):mod;const A=poz(on,mp,th0,0),B=poz(mod,mp,th0,o.pu);const k=eio(sm(0,.3,o.pu));
    let dy=B.yw-A.yw;dy=Math.atan2(Math.sin(dy),Math.cos(dy));const D=lerp(A.d,B.d,k);orb(c,A.tg.clone().lerp(B.tg,k),D,A.yw+dy*k,lerp(A.pt,B.pt,k));kaydir(c,D*lerp(A.ky,B.ky,k));
    if(pv){c.updateMatrixWorld();const r=V3(1,0,0).applyQuaternion(c.quaternion);piz.position.copy(mp).addScaledVector(r,-2.3*yanY(mp,B.yw));piz.quaternion.copy(c.quaternion);
      dil.forEach((m,i)=>{const on=i<5?sm(.15+i*.04,.2+i*.04,o.pu):i===5?sm(.5,.6,o.pu):sm(.1,.2,o.pu);m.material.color=L(i<5?"#1580bd":i===5?"#de8400":"#c9ccd3");m.material.opacity=i<6?on:on*.9})}}}};

/* ---------- BARAJ: tek türbinden saniyede kaç ton su (Atatürk HES, şematik kesit) ---------- */
S.baraj=()=>{const sc=new THREE.Scene();const c=cam(46);studyo(sc);isik(sc,"#ffffff",2.2,"#6FE3FF",1.2);const ZF=2.7,HW=7.55;
  const su=std("#3d8fd1",.1,.3,{transparent:true,opacity:.6});
  const hz=new THREE.Mesh(new THREE.BoxGeometry(3.2,HW,5),su);hz.position.set(-4.6,HW/2,0);sc.add(hz);
  const sh=new THREE.Shape();sh.moveTo(-3,0);sh.lineTo(3.2,0);sh.lineTo(-1.6,8.1);sh.lineTo(-3,8.1);sh.lineTo(-3,0);
  const gv=new THREE.Mesh(new THREE.ExtrudeGeometry(sh,{depth:5,bevelEnabled:false}),std("#bdb6a8",0,.85));gv.position.z=-2.5;sc.add(gv);
  const ks=new THREE.Mesh(new THREE.ShapeGeometry(sh),bas("#d9d3c6"));ks.position.z=2.52;sc.add(ks);
  const egri=new THREE.CatmullRomCurve3([V3(-3.2,4.4,ZF),V3(-1.4,3.2,ZF),V3(1.4,1.35,ZF),V3(3.6,1.0,ZF)]);
  const boru=new THREE.Mesh(new THREE.TubeGeometry(egri,64,.36,16),std("#8a93a3",.4,.5,{transparent:true,opacity:.45}));sc.add(boru);
  const sant=new THREE.Mesh(new THREE.BoxGeometry(2.6,2.8,5),std("#eef1f6",0,.7));sant.position.set(4.6,1.4,0);sc.add(sant);
  const tr=new THREE.Group();tr.position.set(4.3,1.0,ZF+.05);sc.add(tr);const tm=std("#de8400",.4,.4);
  tr.add(new THREE.Mesh(new THREE.TorusGeometry(.95,.08,8,48),std("#5a6170",.4,.5)));const kanat=new THREE.Group();tr.add(kanat);
  kanat.add(new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,.3,20).rotateX(PI/2),tm));for(let i=0;i<9;i++){const b=new THREE.Mesh(new THREE.BoxGeometry(.66,.13,.12),tm);b.position.set(Math.cos(i/9*2*PI)*.5,Math.sin(i/9*2*PI)*.5,0);b.rotation.z=i/9*2*PI+.5;kanat.add(b)}
  const nehir=new THREE.Mesh(new THREE.BoxGeometry(2.6,.3,5),su);nehir.position.set(7.2,.15,0);sc.add(nehir);
  const N=420,ps=pts(N,.75);sc.add(ps);const PP=ps.geometry.attributes.position.array,PC=ps.geometry.attributes.color.array;const ph=[];for(let i=0;i<N;i++)ph.push([rnd(),rnd()-.5,rnd()-.5]);
  const sv=cizgi([V3(-3,HW,ZF),V3(7.4,HW,ZF)],"#1580bd",.8,.2);sc.add(sv);
  const olc=olcu(V3(7.4,0,ZF),V3(7.4,HW,ZF),"151 M","#e0452a",{boy:.9,yer:V3(.35,0,0),cent:.3});olc.children[3].center.set(0,.5);sc.add(olc);
  const bina=new THREE.Group();sc.add(bina);const bm=std("#9fb4cc",.2,.5);const bb=new THREE.Mesh(new THREE.BoxGeometry(1.4,HW,1.4),bm);bb.position.y=HW/2;bina.add(bb);
  for(let i=1;i<9;i++){const l=new THREE.Mesh(new THREE.BoxGeometry(1.42,.04,1.42),bas("#7d8da3"));l.position.y=i*HW/9;bina.add(l)}bina.position.set(12.2,0,0);
  const bY=yazi("≈ 45 KAT",{boy:.75,renk:"#16213a"});bY.position.set(12.2,HW+.8,0);sc.add(bY);
  const tY=yazi("TÜRBİN",{boy:.6,renk:"#de8400"});tY.position.set(4.3,3.4,ZF);sc.add(tY);
  const aY=yazi("ATATÜRK BARAJI · şematik",{boy:.6,renk:"#5a6170"});aY.position.set(.9,9.4,0);sc.add(aY);
  const dY=dyazi({boy:.9,renk:"#1580bd",gen:12});dY.position.set(-.4,-1.0,ZF);sc.add(dY);
  // yan alan 1: 8 ünite
  const UX=30;const un=[];for(let i=0;i<8;i++){const g=new THREE.Group();g.position.set(UX+(i-3.5)*1.55,0,0);sc.add(g);
    const gen=new THREE.Mesh(new THREE.CylinderGeometry(.55,.55,1.0,28),std("#1580bd",.3,.4));gen.position.y=2.1;g.add(gen);
    const mil=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,1,10),std("#5a6170",.5,.4));mil.position.y=1.15;g.add(mil);
    const sal=new THREE.Mesh(new THREE.TorusGeometry(.5,.16,10,32),std("#8a93a3",.4,.5));sal.rotation.x=PI/2;sal.position.y=.6;g.add(sal);
    const ck=new THREE.Group();ck.position.y=.6;g.add(ck);for(let j=0;j<6;j++){const b=new THREE.Mesh(new THREE.BoxGeometry(.5,.08,.12),tm);b.rotation.y=j/6*PI;ck.add(b)}
    const no=yazi(String(i+1),{boy:.55,renk:"#16213a"});no.position.y=3.0;g.add(no);un.push({g,ck,no,gen})}
  const uY=yazi("8 × 300 MW",{boy:.9,renk:"#1580bd"});uY.position.set(UX,4.0,0);sc.add(uY);
  const sY=dyazi({boy:.85,renk:"#e0452a",gen:14});sY.position.set(UX,-1.0,0);sc.add(sY);
  // yan alan 2: 241 küp
  const KX=54;const kup=[];const kg=new THREE.BoxGeometry(.42,.42,.42),km=std("#3d8fd1",.1,.35);for(let i=0;i<241;i++){const m=new THREE.Mesh(kg,km);const cx=i%16,cy=Math.floor(i/16);m.position.set(KX+(cx-7.5)*.5,.3+cy*.5,0);sc.add(m);kup.push(m)}
  const bk=new THREE.Mesh(new THREE.BoxGeometry(2.4,2.4,2.4),km);bk.position.set(KX,2.2,0);sc.add(bk);
  const kY=yazi("1 m³ SU = 1 TON",{boy:.75,renk:"#16213a"});kY.position.set(KX,4.4,0);sc.add(kY);const kS=dyazi({boy:.9,renk:"#1580bd",gen:10});kS.position.set(KX,8.8,0);sc.add(kS);
  // yan alan 3: olimpik havuz (derinlik abartılı)
  const HX=-34;const hv=new THREE.Group();hv.position.set(HX,0,0);sc.add(hv);const dm=std("#eef1f6",0,.6);
  [[10.4,1.6,.2,0,.8,2.6],[10.4,1.6,.2,0,.8,-2.6],[.2,1.6,5.4,5.2,.8,0],[.2,1.6,5.4,-5.2,.8,0],[10.4,.1,5.4,0,.05,0]].forEach(([a,b,cc,x,y,z])=>{const m=new THREE.Mesh(new THREE.BoxGeometry(a,b,cc),dm);m.position.set(x,y,z);hv.add(m)});
  for(let i=1;i<10;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(10,.02,.06),bas("#e0452a"));m.position.set(0,.12,-2.5+i*.5);hv.add(m)}
  const hsu=new THREE.Mesh(new THREE.BoxGeometry(10,1.4,5),su);hv.add(hsu);
  const hY=yazi("OLİMPİK HAVUZ · 2.500 TON",{boy:.6,renk:"#16213a"});hY.position.set(HX,3.2,0);sc.add(hY);const hS=dyazi({boy:1.0,renk:"#e0452a",gen:10});hS.position.set(HX,-1.6,2.6);sc.add(hS);
  const P={ana:{t:V3(1.8,4,0),d:42,w:1.57,p:.1},yuk:{t:V3(3.4,3.8,0),d:50,w:1.54,p:.12},boru:{t:V3(1.2,2.4,0),d:21,w:1.45,p:.14},
    un:{t:V3(UX,1.8,0),d:27,w:1.5,p:.2},kup:{t:V3(KX,4.7,0),d:29,w:1.57,p:.12},hav:{t:V3(HX,.4,0),d:29,w:1.5,p:.72}};
  const MP={soru:"ana",turbin:"un",yukseklik:"yuk",debi:"boru",ton:"kup",havuz:"hav",sekiz:"un",son:"ana"};
  const tq=cam(46);const poz=(m,u)=>{const A=P[MP[m]||"ana"];orb(tq,A.t,A.d,A.w+(u||0)*.06,A.p);tq.updateMatrixWorld();const up=V3(0,1,0).applyQuaternion(tq.quaternion);tq.position.addScaledVector(up,-A.d*.115);return{p:tq.position.clone(),q:tq.quaternion.clone(),k:MP[m]||"ana"}};
  return{sc,c,bl:[.7,.5,.8],kur(o){const t=o.t,mod=o.p.mod||"soru";
    let hiz=mod==="debi"?1.6:1;kanat.rotation.z=-t*4*hiz;
    for(let i=0;i<N;i++){const[f,a,b]=ph[i];const u=(f+t*.22*hiz)%1;let q;if(u<.6){q=egri.getPointAt(u/.6);q.y+=a*.4;q.z+=b*.3}else{const v=(u-.6)/.4;q=V3(lerp(4.3,8.5,v),lerp(.8,.3,Math.min(1,v*3))+a*.15,ZF+b*.6)}
      PP.set([q.x,q.y,q.z],i*3);const s=mod==="debi"?1:.8;PC.set([.2*s,.5*s,.9*s],i*3)}ps.geometry.attributes.position.needsUpdate=ps.geometry.attributes.color.needsUpdate=true;
    const yk=mod==="yukseklik";olc.visible=sv.visible=yk||mod==="son";olc.ilerle(yk?sm(.05,.4,o.pu):1);sv.ilerle(yk?sm(.0,.3,o.pu):1);
    bina.visible=bY.visible=yk;bina.scale.y=Math.max(.001,yk?eio(sm(.5,.8,o.pu)):0);bY.material.opacity=yk?sm(.75,.85,o.pu):0;
    tY.material.opacity=mod==="soru"||mod==="debi"?1:0;aY.material.opacity=mod==="soru"||mod==="son"?1:0;
    dY.visible=false;if(dY.visible)dY.set("≈ "+Math.round(241*sm(.2,.75,o.pu))+" m³/sn");
    // üniteler
    const sek=mod==="sekiz";un.forEach((u,i)=>{const on=mod==="turbin"?sm(.08+i*.07,.14+i*.07,o.pu):sek?1:.25;u.g.scale.setScalar(.6+.4*on);u.ck.rotation.y=t*(sek?6:mod==="turbin"&&on>.9?3:0);u.no.material.opacity=on});
    uY.material.opacity=mod==="turbin"?sm(.65,.8,o.pu):0;sY.visible=sek;if(sek)sY.set("≈ "+(Math.round(1928*eio(sm(.25,.8,o.pu)))).toLocaleString("tr-TR")+" TON/SN");
    // küpler
    const tn=mod==="ton";const kf=tn?sm(.4,.9,o.pu):0;bk.visible=tn&&o.pu<.42;bk.scale.setScalar(tn?1-sm(.36,.42,o.pu)*.9:1);kY.material.opacity=tn?1-sm(.36,.42,o.pu):0;
    kup.forEach((m,i)=>{m.visible=tn&&i<Math.round(241*kf)});kS.visible=false;kS.set(Math.round(241*kf)+" TON");
    // havuz
    const hb=mod==="havuz";const hk=hb?sm(.35,.95,o.pu):0;hsu.scale.y=Math.max(.01,1-hk);hsu.position.y=.1+.7*(1-hk);hY.material.opacity=hb?1:0;hS.visible=hb;hS.set((10.4*hk).toFixed(1).replace(".",",")+" SN");
    // kamera
    const on=o.pi>0?(o.pp[o.pi-1].mod||"soru"):mod;const A=poz(on,0),B=poz(mod,o.pu);const k=A.k!==B.k&&(P[A.k].t.x!==P[B.k].t.x)?1:eio(sm(0,.3,o.pu));
    c.position.lerpVectors(A.p,B.p,k);c.quaternion.slerpQuaternions(A.q,B.q,k)}}};

/* ---------- BOYUT: Jüpiter'e kaç Dünya sığar (çap 11×, hacim 1.321×, kütle 318×) ---------- */
S.boyut=()=>{const sc=new THREE.Scene();const c=cam(46);uzay(sc);const RJ=4.4,RE=RJ/10.97;
  const dl=new THREE.DirectionalLight(L("#ffffff"),1.4);dl.position.set(6,5,9);sc.add(dl);sc.add(new THREE.AmbientLight(L("#5a6a88"),.8));
  const J=jupiter(RJ);sc.add(J);const jtx=J.children[0].material.map;
  // hayalet Jüpiter (içi görünsün diye): ince dolgu + kamera yönlü çember
  const hay=new THREE.Mesh(new THREE.SphereGeometry(RJ,64,48),new THREE.MeshBasicMaterial({map:jtx,transparent:true,opacity:.22,depthWrite:false}));hay.userData.kabuk=1;sc.add(hay);
  const cp=[];for(let i=0;i<=128;i++){const a=i/128*2*PI;cp.push(V3(Math.cos(a)*RJ*1.01,Math.sin(a)*RJ*1.01,0))}const cem=cizgi(cp,"#16213a",1);cem.userData.bb=1;sc.add(cem);
  const E=dunya(RE);sc.add(E);
  const oJ=olcu(V3(-RJ,0,RJ+.4),V3(RJ,0,RJ+.4),"≈ 11 × ÇAP","#e0452a",{boy:.85,yer:V3(0,.75,0),cent:.35});sc.add(oJ);
  const dY=yazi("DÜNYA",{boy:.55,renk:"#1580bd"});sc.add(dY);const jY=yazi("JÜPİTER",{boy:.8,renk:"#de8400"});jY.position.set(0,-RJ-1.0,0);sc.add(jY);
  // 11 Dünya dizisi
  const dz=[];for(let i=0;i<11;i++){const e=dunya(RE*.97);e.position.set(-RJ+RE+i*2*RE,0,RJ+.55);sc.add(e);dz.push(e)}
  const dS=dyazi({boy:1.0,renk:"#1580bd",gen:8});dS.position.set(0,1.3,RJ+.6);sc.add(dS);
  // iç dolgu: hacim payı (Dünyalar eritilmiş gibi), 1.321 küçük küre
  let s=.7;const ic=[];const icAl=sp=>{const a=[];const n=Math.ceil(RJ/sp);for(let x=-n;x<=n;x++)for(let y=-n;y<=n;y++)for(let z=-n;z<=n;z++){const p=V3(x*sp+(y%2?sp/2:0),y*sp,z*sp);if(p.length()<RJ-.2)a.push(p)}return a};
  for(let k=0;k<30;k++){const a=icAl(s);if(Math.abs(a.length-1321)<25){ic.push(...a);break}s*=Math.pow(a.length/1321,1/3)}if(!ic.length)ic.push(...icAl(s));
  ic.sort((a,b)=>a.y-b.y||a.x-b.x);const icM=new THREE.InstancedMesh(new THREE.SphereGeometry(s*.47,12,8),std("#3d8fd1",.1,.45),ic.length);
  const dm=new THREE.Object3D();ic.forEach((p,i)=>{dm.position.copy(p);dm.updateMatrix();icM.setMatrixAt(i,dm.matrix)});icM.count=0;sc.add(icM);
  const iS=dyazi({boy:1.3,renk:"#e0452a",gen:10});iS.position.set(0,0,RJ+.8);sc.add(iS);const yS=dyazi({boy:1.3,renk:"#e0452a",gen:10});yS.position.set(0,0,RJ+.8);sc.add(yS);
  // yan alan 1: golf topu → 47 cm Jüpiter, 2 basketbol topu (1 birim = 10 cm)
  const TX=60;const golf=new THREE.Mesh(new THREE.SphereGeometry(.213,24,16),std("#ffffff",0,.5));golf.position.set(TX-3.6,2.6,0);sc.add(golf);
  const gY=yazi("DÜNYA",{boy:.4,renk:"#1580bd"});gY.position.set(TX-3.6,3.2,0);sc.add(gY);const gY2=yazi("GOLF TOPU",{boy:.32,renk:"#16213a"});gY2.position.set(TX-3.6,2.0,0);sc.add(gY2);
  const tJ=new THREE.Mesh(new THREE.SphereGeometry(2.34,64,48),new THREE.MeshStandardMaterial({map:jtx,roughness:.9}));tJ.position.set(TX,2.6,0);sc.add(tJ);
  const bk=[];[-1,1].forEach(sg=>{const g=new THREE.Group();g.position.set(TX+sg*1.21,-.55,0);sc.add(g);g.add(new THREE.Mesh(new THREE.SphereGeometry(1.2,48,32),std("#e06a10",0,.7)));
    [[0,0,0],[PI/2,0,0],[0,PI/2,0]].forEach(r=>{const t=new THREE.Mesh(new THREE.TorusGeometry(1.205,.03,6,64),bas("#16213a"));t.rotation.set(...r);g.add(t)});bk.push(g)});
  const o47=olcu(V3(TX-2.34,2.6,2.5),V3(TX+2.34,2.6,2.5),"47 cm","#e0452a",{boy:.6,yer:V3(0,.5,0),cent:.25});sc.add(o47);
  const o48=olcu(V3(TX-2.42,-.55,1.5),V3(TX+2.42,-.55,1.5),"24 + 24 cm","#16213a",{boy:.5,yer:V3(0,-.5,0),cent:.25});sc.add(o48);
  // yan alan 2: 11 × 11 × 11 küp
  const KX=-60,ks=.4;const kup=new THREE.InstancedMesh(new THREE.SphereGeometry(.17,10,8),std("#3d8fd1",.1,.45),1331);let ki=0;
  for(let z=0;z<11;z++)for(let y=0;y<11;y++)for(let x=0;x<11;x++){dm.position.set(KX+(x-5)*ks,.5+y*ks,(z-5)*ks);dm.updateMatrix();kup.setMatrixAt(ki++,dm.matrix)}kup.count=0;sc.add(kup);
  const kS=dyazi({boy:1.1,renk:"#e0452a",gen:10});kS.position.set(KX,5.4,0);sc.add(kS);
  // yan alan 3: terazi (kütle)
  const TZ=120,PY=4.6,KL=3.2;const tm=std("#5a6170",.4,.5);const dir=new THREE.Mesh(new THREE.CylinderGeometry(.12,.2,PY,12),tm);dir.position.set(TZ,PY/2,0);sc.add(dir);
  const kol=new THREE.Mesh(new THREE.BoxGeometry(2*KL+.4,.16,.22),tm);kol.position.set(TZ,PY,0);sc.add(kol);
  const kefe=[0,1].map(()=>{const g=new THREE.Group();sc.add(g);const k=new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.2,.18,32),std("#b8bec8",.6,.35));g.add(k);
    const ip=[0,1].map(()=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,1,6),bas("#16213a"));sc.add(m);return m});return{g,ip}});
  const kJ=new THREE.Mesh(new THREE.SphereGeometry(1.25,48,32),new THREE.MeshStandardMaterial({map:jtx,roughness:.9}));kefe[0].g.add(kJ);kJ.position.y=1.34;
  const yp=[];(()=>{let n=0;for(let l=0;n<318&&l<12;l++){const r=1.2-l*.1;const m=Math.max(1,Math.floor(PI*r*r/(.28*.28)));for(let i=0;i<m&&n<318;i++){const a=i*2.39996,rr=Math.sqrt(i/m)*r;yp.push(V3(Math.cos(a)*rr,.22+l*.24,Math.sin(a)*rr));n++}}})();
  const tY=new THREE.InstancedMesh(new THREE.SphereGeometry(.13,10,8),std("#3d8fd1",.1,.45),yp.length);yp.forEach((p,i)=>{dm.position.copy(p);dm.updateMatrix();tY.setMatrixAt(i,dm.matrix)});tY.count=0;kefe[1].g.add(tY);
  const tS=dyazi({boy:.9,renk:"#1580bd",gen:12});tS.position.set(TZ+KL,-.6,0);sc.add(tS);const tJY=yazi("JÜPİTER",{boy:.6,renk:"#de8400"});tJY.position.set(TZ-KL,-.6,0);sc.add(tJY);
  const P={ana:{t:V3(0,0,0),d:30,w:PI/2+.28,p:.1,ky:.115},yak:{t:V3(0,.2,RJ*.4),d:25,w:PI/2+.08,p:.05,ky:.11},top:{t:V3(TX-.6,2.2,0),d:25,w:PI/2+.12,p:.12,ky:.135},
    kup:{t:V3(KX,2.6,0),d:21,w:PI/2+.55,p:.38,ky:.07},ter:{t:V3(TZ,2.5,0),d:23,w:PI/2+.1,p:.1,ky:.115}};
  const MP={soru:"ana",cap:"ana",dizi:"yak",top:"top",kup:"kup",hesap:"ana",gun:"ana",kutle:"ter",son:"ana"};
  const tq=cam(46);const poz=(m,u)=>{const k=MP[m]||"ana",A=P[k];orb(tq,A.t,A.d,A.w+(u||0)*.05,A.p);kaydir(tq,A.d*A.ky);return{p:tq.position.clone(),q:tq.quaternion.clone(),k}};
  return{sc,c,bl:[.7,.5,.8],kur(o){const t=o.t,mod=o.p.mod||"soru",u=o.pu;J.ayar(t);hay.rotation.y=J.children[0].rotation.y;E.ayar(t);
    const ici=mod==="hesap"||mod==="gun";J.visible=!ici;hay.visible=cem.visible=ici;
    // Dünya: soruda uzakta, çapta yanına gelir
    const ep=mod==="soru"?V3(RJ+1.3,RJ*.8,1.2):V3(RJ+RE+1.0,0,.0);E.position.copy(ep);E.visible=mod==="soru"||mod==="cap"||mod==="son";dY.position.copy(ep).add(V3(0,RE+.6,0));dY.material.opacity=E.visible?1:0;
    jY.material.opacity=mod==="soru"||mod==="cap"?1:0;
    oJ.visible=mod==="cap";if(oJ.visible)oJ.ilerle(sm(.15,.6,u));
    const dk=mod==="dizi";const nd=dk?Math.min(11,Math.floor(sm(.08,.8,u)*11.99)):0;dz.forEach((e,i)=>{e.visible=i<nd;e.ayar(t+i)});dS.visible=dk;dS.set(nd+" DÜNYA");
    // iç dolgu
    let n=0;if(mod==="hesap")n=Math.round(ic.length*eio(sm(.05,.7,u)));if(mod==="gun")n=Math.round(ic.length*sm(.08,.92,u));icM.count=n;
    iS.visible=mod==="hesap";iS.set(Math.round(1321*n/ic.length).toLocaleString("tr-TR"));yS.visible=mod==="gun";yS.set("YIL "+(3.62*n/ic.length).toFixed(1).replace(".",","));
    // golf/basket
    o47.ilerle(mod==="top"?sm(.3,.6,u):0);o48.ilerle(mod==="top"?sm(.65,.9,u):0);bk.forEach((g,i)=>g.scale.setScalar(mod==="top"?.001+eob(sm(.6+i*.06,.72+i*.06,u)):1));tJ.rotation.y=t*.15;
    // küp
    if(mod==="kup"){const a=sm(.08,.3,u),b=sm(.35,.6,u),cc=sm(.65,.92,u);const cnt=cc>0?Math.round(121+1210*cc):b>0?Math.round(11+110*b):Math.round(11*a);
      kup.count=cc>0?Math.round(121*(1+10*cc)):b>0?Math.round(11*(1+10*b)):Math.max(0,Math.round(11*a));kS.set(cnt.toLocaleString("tr-TR"))}else kup.count=0;kS.visible=mod==="kup";
    // terazi
    const tk=mod==="kutle"?sm(.15,.75,u):0;tY.count=Math.round(yp.length*tk);const th=lerp(.32,0,eio(tk))+Math.sin(t*2)*.01*(1-tk);kol.rotation.z=th;
    kefe.forEach((k,i)=>{const sx=i?1:-1;const uc=V3(TZ+sx*KL*Math.cos(th),PY+sx*KL*Math.sin(th),0);k.g.position.copy(uc).add(V3(0,-2.6,0));segAyar(k.ip[0],uc,k.g.position.clone().add(V3(-1.3,.05,0)));segAyar(k.ip[1],uc,k.g.position.clone().add(V3(1.3,.05,0)))});
    tS.set(Math.round(318*tk)+" DÜNYA");
    // kamera
    const on=o.pi>0?(o.pp[o.pi-1].mod||"soru"):mod;const A=poz(on,0),B=poz(mod,u);const k=A.k!==B.k&&(P[A.k].t.x!==P[B.k].t.x)?1:eio(sm(0,.3,u));
    c.position.lerpVectors(A.p,B.p,k);c.quaternion.slerpQuaternions(A.q,B.q,k)}}};

/* ---------- KABLO: akım 2 kat → ısı 4 kat (I²R) ---------- */
S.kablo=()=>{const sc=new THREE.Scene();const c=cam(46);studyo(sc);isik(sc,"#ffffff",2.2,"#6FE3FF",1.2);
  const kabM=std("#d9dce2",0,.6);const yol=new THREE.CatmullRomCurve3([V3(-14,.12,1.6),V3(-6,.12,1.7),V3(-2,.12,1.4),V3(-2.4,.14,.8),V3(-1.9,.16,.45)]);
  const kab=new THREE.Mesh(new THREE.TubeGeometry(yol,96,.12,12),kabM);sc.add(kab);
  // çoklu priz
  const pr=new THREE.Mesh(new THREE.BoxGeometry(2.6,.32,.8),std("#eef1f6",0,.6));pr.position.set(-.4,.16,.45);sc.add(pr);
  for(let i=0;i<3;i++){const d=new THREE.Mesh(new THREE.CylinderGeometry(.24,.24,.04,24),std("#c9ccd3",0,.6));d.position.set(-1.1+i*.7,.34,.45);sc.add(d)}
  const lmb=new THREE.Mesh(new THREE.BoxGeometry(.16,.06,.16),bas("#e0452a"));lmb.position.set(.75,.34,.77);sc.add(lmb);
  // ısıtıcılar
  const isit=[0,1].map(i=>{const g=new THREE.Group();g.position.set(-1.1+i*1.9,0,-1.5);sc.add(g);const gv=new THREE.Mesh(new THREE.BoxGeometry(1.5,1.9,.55),std("#eef1f6",0,.55));gv.position.y=1.05;g.add(gv);
    const iz=new THREE.Mesh(new THREE.PlaneGeometry(1.2,1.2),new THREE.MeshBasicMaterial({color:L("#c9ccd3")}));iz.position.set(0,1.15,.28);g.add(iz);
    for(let j=0;j<6;j++){const b=new THREE.Mesh(new THREE.BoxGeometry(1.2,.05,.03),bas("#5a6170"));b.position.set(0,.65+j*.2,.3);g.add(b)}
    [-.5,.5].forEach(x=>{const a=new THREE.Mesh(new THREE.BoxGeometry(.2,.1,.5),std("#5a6170"));a.position.set(x,.05,0);g.add(a)});
    const hx=-1.1+i*1.9,sx=-1.1+i*.7;const k=cizgi([V3(hx+.55,.25,-1.2),V3(hx+.55,.04,-.6),V3(sx,.04,-.1),V3(sx,.36,.45)],"#16213a",1);sc.add(k);
    const no=yazi(i?"2. ISITICI":"1. ISITICI",{boy:.38,renk:"#16213a"});no.position.set(0,2.3,0);g.add(no);return{g,iz,no,k}});
  // büyütülmüş kesit: kılıf + iki bakır damar
  const KX=0,KY=3.6,KU=4.0;const kes=new THREE.Group();kes.position.set(KX,KY,0);sc.add(kes);
  const klf=new THREE.Mesh(new THREE.CylinderGeometry(.95,.95,KU,40,1,true),new THREE.MeshStandardMaterial({color:L("#c9ccd3"),transparent:true,opacity:.3,side:THREE.DoubleSide,depthWrite:false}));klf.rotation.z=PI/2;kes.add(klf);klf.userData.kabuk=1;
  const kc=[[1,0],[-1,0]].map(([sx])=>{const cc=[];for(let i=0;i<=64;i++){const a=i/64*2*PI;cc.push(V3(sx*KU/2,Math.cos(a)*.95,Math.sin(a)*.95))}const l=cizgi(cc,"#16213a",1);kes.add(l);return l});
  [-1,1].forEach(sy=>{const l=cizgi([V3(-KU/2,sy*.95,0),V3(KU/2,sy*.95,0)],"#16213a",.9);kes.add(l)});
  const bakM=[0,1].map(()=>std("#c8742a",.6,.35));const dam=[.36,-.36].map((y,i)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(.27,.27,KU+.3,24),bakM[i]);m.rotation.z=PI/2;m.position.y=y;kes.add(m);
    const iz=new THREE.Mesh(new THREE.CylinderGeometry(.33,.33,KU+.1,24),std(i?"#1580bd":"#8a5a2a",0,.6,{transparent:true,opacity:.35}));iz.rotation.z=PI/2;iz.position.y=y;kes.add(iz);iz.userData.kabuk=1;return m});
  const N=70,dp=pts(N*2,.32,false);kes.add(dp);const DP=dp.geometry.attributes.position.array,DC=dp.geometry.attributes.color.array;const ph=[];for(let i=0;i<N*2;i++)ph.push([rnd(),rnd()*6.283,rnd()]);
  const yon=[yazi("GİDİŞ →",{boy:.42,renk:"#16213a"}),yazi("← DÖNÜŞ",{boy:.42,renk:"#1580bd"})];yon[0].position.set(0,.36,1.05);yon[1].position.set(0,-.36,1.05);kes.add(...yon);
  const iY=[yazi("I →",{boy:.55,renk:"#e0452a"}),yazi("I →",{boy:.55,renk:"#e0452a"})];iY[0].position.set(-1.0,1.4,0);iY[1].position.set(1.0,1.4,0);kes.add(...iY);
  const xY=yazi("×",{boy:.55,renk:"#16213a"});xY.position.set(0,1.4,0);kes.add(xY);
  const mmY=yazi("1,5 mm² BAKIR",{boy:.4,renk:"#de8400"});mmY.position.set(-KU/2-.2,-1.45,0);kes.add(mmY);const oY=yazi("≈ 0,27 Ω",{boy:.6,renk:"#e0452a"});oY.position.set(.4,-1.5,0);kes.add(oY);
  const lup=cizgi([V3(KX-KU/2,KY-.95,0),V3(-4.6,.2,1.7)],"#5a6170",.6,.12),lup2=cizgi([V3(KX+KU/2,KY-.95,0),V3(-3.6,.2,1.65)],"#5a6170",.7,.12);sc.add(lup,lup2);
  const tel=olcu(V3(KX-KU/2,KY+1.55,0),V3(KX+KU/2,KY+1.55,0),"20 m TEL","#e0452a",{boy:.5,yer:V3(0,.45,0),cent:.2});sc.add(tel);
  const aY=dyazi({boy:.75,renk:"#e0452a",gen:8});aY.position.set(KX,KY+1.55,0);sc.add(aY);
  // ısı dalgaları
  const dal=[];for(let i=0;i<7;i++){const l=cizgi(Array.from({length:30},()=>V3(0,0,0)),"#e0452a",.0);sc.add(l);dal.push(l)}
  // ısı sütunu (W)
  const BX=3.3,BY=2.2,KW=.04;const cer=new THREE.Mesh(new THREE.BoxGeometry(.7,80*KW+.2,.5),new THREE.MeshBasicMaterial({color:L("#ffffff"),transparent:true,opacity:.5,depthWrite:false}));cer.position.set(BX,BY+40*KW,0);sc.add(cer);
  const sut=new THREE.Mesh(new THREE.BoxGeometry(.56,1,.4),std("#e0452a",0,.5));sc.add(sut);const sY=dyazi({boy:.6,renk:"#e0452a",gen:6});sc.add(sY);
  const cz=[20,80].map(w=>{const l=cizgi([V3(BX-.5,BY+w*KW,0),V3(BX+.5,BY+w*KW,0)],"#16213a",1);sc.add(l);return l});
  const hY=yazi("ISI",{boy:.45,renk:"#16213a"});hY.position.set(BX,BY-.4,0);sc.add(hY);
  // akkor ampul (60 W)
  const amp=new THREE.Group();amp.position.set(BX+1.15,BY+60*KW,0);sc.add(amp);const ac=new THREE.Mesh(new THREE.SphereGeometry(.34,24,16),std("#ffd27a",0,.4,{emissive:L("#ffb02a"),emissiveIntensity:.5}));amp.add(ac);
  const ad=new THREE.Mesh(new THREE.CylinderGeometry(.14,.14,.25,16),std("#b8bec8",.6,.3));ad.position.y=-.38;amp.add(ad);const ay=yazi("60 W",{boy:.4,renk:"#de8400"});ay.position.y=.65;amp.add(ay);
  const cz60=cizgi([V3(BX-.5,BY+60*KW,0),V3(BX+.9,BY+60*KW,0)],"#de8400",1,.06);sc.add(cz60);
  
  const P={gen:{t:V3(.3,2.4,0),d:17,w:PI/2-.3,p:.3,ky:.08},tel:{t:V3(0,KY+.2,0),d:12.5,w:PI/2-.12,p:.08,ky:.1},dir:{t:V3(-1.0,KY-.2,0),d:11,w:PI/2-.55,p:.12,ky:.1},
    isi:{t:V3(1.0,3.3,0),d:17,w:PI/2-.08,p:.12,ky:.1},son:{t:V3(.8,2.6,0),d:19,w:PI/2-.22,p:.22,ky:.095}};
  const MP={soru:"gen",tel:"tel",direnc:"dir",akim:"gen",formul:"tel",bir:"isi",iki:"isi",seksen:"isi",son:"son"};
  const tq=cam(46);const poz=(m,u)=>{const k=MP[m]||"gen",A=P[k];orb(tq,A.t,A.d,A.w+(u||0)*.05,A.p);kaydir(tq,A.d*A.ky);return{p:tq.position.clone(),q:tq.quaternion.clone(),k}};
  const SIRA=["soru","tel","direnc","akim","formul","bir","iki","seksen","son"];
  return{sc,c,bl:[.7,.5,.8],kur(o){const t=o.t,mod=o.p.mod||"soru",u=o.pu,si=SIRA.indexOf(mod);
    // durum: ısıtıcı sayısı, akım, ısı (W)
    const i2=mod==="iki"?eio(sm(.05,.3,u)):si>6?1:0;const i1=mod==="akim"?sm(.1,.3,u):si>3?1:mod==="soru"?1:0;const amp_=i1*(1+i2);
    let W=0;if(mod==="bir")W=20*eo(sm(.05,.5,u));else if(mod==="iki")W=20+60*eio(sm(.3,.85,u));else if(si>6)W=80;else if(mod==="formul"||mod==="akim")W=20*i1*.0;const hz=W/80;
    isit[0].iz.material.color=L("#c9ccd3").lerp(L("#ff6a3a"),i1);isit[1].iz.material.color=L("#c9ccd3").lerp(L("#ff6a3a"),i2);
    const v2=mod==="soru"?1:i2;isit[1].g.scale.setScalar(.001+eob(cl(v2)));isit[1].g.visible=isit[1].k.visible=v2>0;const nv=mod==="akim"?1:0;isit[1].no.material.opacity=nv;isit[0].no.material.opacity=nv;
    lmb.material.color=L(i1>.5?"#e0452a":"#5a6170");
    kabM.color=L("#d9dce2").lerp(L("#ff7a4a"),hz*.8);
    const kv=si>0;kes.visible=lup.visible=lup2.visible=kv;kes.scale.setScalar(mod==="tel"?eob(sm(0,.3,u))*.999+.001:1);
    bakM.forEach(m=>{m.color=L("#c8742a").lerp(L("#ff4a1a"),hz);m.emissive=L("#ff3a10");m.emissiveIntensity=hz*.6});klf.material.color=L("#c9ccd3").lerp(L("#ff9a6a"),hz);
    // elektron noktaları
    const hiz=(mod==="tel"||mod==="direnc"?.6:.0)+amp_*.7;const tit=mod==="direnc"?.08:.03+hz*.05;
    for(let i=0;i<N*2;i++){const[f,a,r]=ph[i];const ust=i<N;const s=ust?1:-1;let x=((f+t*.18*hiz*s)%1+1)%1;x=(x-.5)*KU;const rr=r*.22;
      DP.set([x+Math.sin(t*40+i)*tit,(ust?.36:-.36)+Math.cos(a)*rr+Math.sin(t*33+i*2)*tit,Math.sin(a)*rr],i*3);const v=.7;DC.set(ust?[.1,.35,.85]:[.1,.35,.85],i*3)}
    dp.geometry.attributes.position.needsUpdate=dp.geometry.attributes.color.needsUpdate=true;dp.visible=kv;
    yon.forEach(y=>y.material.opacity=mod==="tel"?sm(.4,.6,u):0);tel.visible=mod==="tel";tel.ilerle(sm(.35,.75,u));
    const fm=mod==="formul";iY[0].material.opacity=fm?sm(.35,.5,u):0;iY[1].material.opacity=fm?sm(.5,.65,u):0;xY.material.opacity=fm?sm(.5,.65,u):0;
    mmY.material.opacity=mod==="direnc"?sm(.4,.55,u):0;oY.material.opacity=mod==="direnc"?sm(.7,.85,u):0;
    aY.visible=mod==="akim"||mod==="iki";aY.set(((mod==="iki"?8.7*(1+i2):8.7*i1)).toFixed(1).replace(".",",")+" A");if(mod==="akim")aY.position.set(KX,KY+1.55,0);
    // ısı dalgaları
    dal.forEach((l,j)=>{const x0=KX-KU/2+.4+j*(KU-.8)/6;const ps=[];const yuk=.4+hz*.9;for(let q=0;q<30;q++){const v=q/29;ps.push(V3(x0+Math.sin(v*9-t*3+j)*.12*(.3+hz),KY+1.05+v*yuk,0))}l.geometry.setFromPoints(ps);l.material.opacity=kv?hz*(.6+.3*Math.sin(t*2+j)):0});
    // sütun
    const bv=si>=5;cer.visible=sut.visible=hY.visible=bv;sY.visible=bv;const hh=Math.max(.001,W*KW);sut.scale.y=hh;sut.position.set(BX,BY+hh/2,0);sY.set(Math.round(W)+" W");sY.position.set(BX,BY+hh+.45,0);
    cz[0].visible=bv;cz[1].visible=bv&&si>=6;const av=mod==="seksen"?sm(.45,.6,u):mod==="son"?1:0;amp.visible=cz60.visible=av>0;amp.scale.setScalar(.001+av);
    
    // kamera
    const on=o.pi>0?(o.pp[o.pi-1].mod||"soru"):mod;const A=poz(on,0),B=poz(mod,u);const k=eio(sm(0,.35,u));
    c.position.lerpVectors(A.p,B.p,k);c.quaternion.slerpQuaternions(A.q,B.q,k)}}};

/* ---------- YILDIZ: ışık hızıyla Proxima Centauri'ye (4,2 ışık yılı) ---------- */
S.yildiz=()=>{const sc=new THREE.Scene();const c=cam(46);uzay(sc);const SY=-5.2,PY=5.6,GR=1.0,PR=.55;
  const g=gunes(GR);g.position.y=SY;sc.add(g);const gY=yazi("GÜNEŞ",{boy:.7,renk:"#de8400"});gY.position.set(2.4,SY,0);sc.add(gY);
  const px=new THREE.Mesh(new THREE.SphereGeometry(PR,48,32),std("#e0452a",0,.6,{emissive:L("#e0452a"),emissiveIntensity:.25}));px.position.y=PY;sc.add(px);const pg=spr("#ff6a4d",3,.5);pg.position.y=PY;sc.add(pg);
  const pY=yazi("PROXIMA CENTAURI",{boy:.7,renk:"#e0452a"});pY.position.set(0,PY+1.15,0);sc.add(pY);
  sc.add(new THREE.AmbientLight(L("#5a6a88"),.8));const dl=new THREE.DirectionalLight(L("#ffffff"),1.2);dl.position.set(3,4,8);sc.add(dl);
  const Y0=SY+GR+.3,Y1=PY-PR-.3;const yer=f=>lerp(Y0,Y1,f);
  const yol=cizgi([V3(0,Y0,0),V3(0,Y1,0)],"#1580bd",.6,.25);sc.add(yol);
  // ışık yılı çentikleri (4,24 ly)
  const LY=4.24;const cen=[];const sinif=["9. SINIF","10. SINIF","11. SINIF","12. SINIF"];for(let i=1;i<=4;i++){const y=yer(i/LY);const l=cizgi([V3(-.5,y,0),V3(.5,y,0)],"#16213a",1);sc.add(l);
    const t=yazi(i+" IŞIK YILI",{boy:.75,renk:"#16213a",sol:true});t.position.set(.75,y,0);sc.add(t);const s_=yazi(sinif[i-1],{boy:.75,renk:"#1580bd",sol:true});s_.position.set(-5.4,y-(yer(1/LY)-Y0)/2,0);sc.add(s_);cen.push({l,t,s:s_})}
  const olc=olcu(V3(-1.3,Y0,0),V3(-1.3,Y1,0),"4,2 IŞIK YILI","#e0452a",{boy:.85,yer:V3(-.4,0,0),cent:.3});olc.children[3].center.set(1,.5);sc.add(olc);
  // ışık atımı
  const at=new THREE.Mesh(new THREE.SphereGeometry(.28,24,16),bas("#f0a020"));sc.add(at);const iz=[];for(let i=0;i<10;i++){const s_=spr("#f2c46b",.9-i*.06,0);sc.add(s_);iz.push(s_)}
  const aS=dyazi({boy:1.25,renk:"#de8400",sol:true,gen:12});sc.add(aS);
  // sonda
  const so=sondaM();so.scale.setScalar(1.2);sc.add(so);const sS=dyazi({boy:1.25,renk:"#1580bd",sol:true,gen:14});sc.add(sS);const vS=dyazi({boy:.8,renk:"#1580bd",gen:10});sc.add(vS);
  // yan alan 1: Dünya çevresinde ışık (7,5 tur)
  const HX=40;const e=dunya(2.2);e.position.set(HX,0,0);sc.add(e);const cv=[];for(let i=0;i<=160;i++){const a=i/160*2*PI;cv.push(V3(HX+Math.cos(a)*2.5,0,Math.sin(a)*2.5))}const ek=cizgi(cv,"#de8400",.7);sc.add(ek);
  const hn=new THREE.Mesh(new THREE.SphereGeometry(.16,16,12),bas("#f0a020"));sc.add(hn);const hz=[];for(let i=0;i<12;i++){const s_=spr("#f2c46b",.5-i*.03,0);sc.add(s_);hz.push(s_)}
  const tS=dyazi({boy:1.1,renk:"#de8400",gen:10});tS.position.set(HX,2.9,0);sc.add(tS);
  // yan alan 2: Göbeklitepe vs yolculuk (yıl sütunları, 1 birim = 10.000 yıl)
  const GX=-40,BK=1.0;const gs=new THREE.Mesh(new THREE.BoxGeometry(1.4,1,1),std("#bdb6a8",0,.85));sc.add(gs);const ys=new THREE.Mesh(new THREE.BoxGeometry(1.4,1,1),std("#1580bd",.1,.5));sc.add(ys);
  const tp=new THREE.Group();const tm=std("#d9cdb4",0,.9);const t1=new THREE.Mesh(new THREE.BoxGeometry(.3,1.1,.25),tm);t1.position.y=.55;const t2=new THREE.Mesh(new THREE.BoxGeometry(.9,.3,.3),tm);t2.position.y=1.2;tp.add(t1,t2);sc.add(tp);
  const gL=yazi("GÖBEKLİTEPE",{boy:.5,renk:"#16213a"});sc.add(gL);const yL=yazi("YOLCULUK",{boy:.5,renk:"#1580bd"});sc.add(yL);
  const gS=dyazi({boy:.75,renk:"#16213a",gen:10});sc.add(gS);const yS2=dyazi({boy:.75,renk:"#1580bd",gen:10});sc.add(yS2);
  const P={tam:{t:V3(0,.25,0),d:50,w:PI/2,p:.04,ky:.12},gun:{t:V3(-.8,SY+2.6,0),d:22,w:PI/2+.1,p:.06,ky:.1},
    dun:{t:V3(HX,.4,0),d:21,w:PI/2,p:.42,ky:.1},gob:{t:V3(GX,3.6,0),d:25,w:PI/2+.12,p:.08,ky:.1}};
  const MP={soru:"tam",hiz:"dun",yil:"tam",mesafe:"tam",lise:"tam",voyager:"gun",sure:"tam",gobekli:"gob",son:"tam"};
  const tq=cam(46);const poz=(m,u)=>{const k=MP[m]||"tam",A=P[k];orb(tq,A.t,A.d,A.w+(u||0)*.04,A.p);kaydir(tq,A.d*A.ky);return{p:tq.position.clone(),q:tq.quaternion.clone(),k}};
  return{sc,c,bl:[.8,.5,.75],kur(o){const t=o.t,mod=o.p.mod||"soru",u=o.pu;g.ayar(t,1);e.ayar(t);pg.material.opacity=.45+.1*Math.sin(t*3);
    // ışık atımı konumu (oran 0..1)
    let f=-1,yaz="";
    if(mod==="yil"){f=eio(sm(.1,.85,u))/LY;yaz="YIL "+(f*LY).toFixed(1).replace(".",",")}
    else if(mod==="lise"){f=sm(.05,.95,u);yaz="YIL "+(f*LY).toFixed(1).replace(".",",")}
    else if(mod==="son"){f=1;yaz="≈ 4,2 YIL"}
    at.visible=f>=0;aS.visible=f>=0&&!!yaz;if(f>=0){const y=yer(f);at.position.set(0,y,0);aS.set(yaz);aS.position.set(.9,y+.9,0);iz.forEach((s_,i)=>{s_.position.set(0,y-.35-i*.32,0);s_.material.opacity=(f>0&&f<1?1:0)*(1-i/10)})}else iz.forEach(s_=>s_.material.opacity=0);
    // çentikler
    cen.forEach((c_,i)=>{const v=mod==="yil"?(i===0?sm(.8,.95,u):0):(mod==="mesafe"?sm(.1+i*.15,.2+i*.15,u):(mod==="lise"?1:mod==="son"?1:0));c_.l.visible=v>.01;c_.t.material.opacity=mod==="lise"?.35:v;c_.s.material.opacity=mod==="lise"?sm(.05+i*.22,.12+i*.22,u):0});
    olc.visible=mod==="mesafe"||mod==="son";olc.ilerle(mod==="mesafe"?sm(.55,.95,u):1);
    // sonda
    let sf=-1,sy="";if(mod==="voyager"){sf=.004+.004*u;sy="17 KM/SN"}else if(mod==="sure"){sf=eio(sm(.05,.95,u));sy=Math.round(73000*sf).toLocaleString("tr-TR")+" YIL"}else if(mod==="son"){sf=.06;sy="> 73.000 YIL"}
    const vg=mod==="voyager";so.visible=sf>=0;sS.visible=sf>=0&&!vg;vS.visible=vg;if(sf>=0){const y=yer(sf)+(vg?1.2*u+.3:0);so.position.set(vg?-2.0:-.9,y,0);so.rotation.set(.4,t*.3,0);sS.set(sy);sS.position.set(-.9+(mod==="son"?-6.6:-6.8),y,0);vS.set(sy);vS.position.set(-2.0,y+1.5,0)}
    // Dünya turu
    const hv=mod==="hiz";hn.visible=ek.visible=hv;tS.visible=hv;if(hv){const k=eio(sm(.1,.9,u))*7.5;const a=k*2*PI;hn.position.set(HX+Math.cos(a)*2.5,0,Math.sin(a)*2.5);hz.forEach((s_,i)=>{const b=a-(i+1)*.12;s_.position.set(HX+Math.cos(b)*2.5,0,Math.sin(b)*2.5);s_.material.opacity=(k>0&&k<7.5?1:0)*(1-i/12)});tS.set("TUR "+k.toFixed(1).replace(".",","))}else hz.forEach(s_=>s_.material.opacity=0);
    // sütunlar
    const gb=mod==="gobekli";const gh=Math.max(.001,.945*sm(.05,.3,u)),yh=Math.max(.001,6.0*eio(sm(.55,.95,u)));
    gs.scale.y=gh;gs.position.set(GX-1.3,gh/2,0);ys.scale.y=yh;ys.position.set(GX+1.3,yh/2,0);tp.position.set(GX-1.3,gh,0);tp.scale.setScalar(gb?sm(.2,.35,u)+.001:1);
    gL.position.set(GX-1.3,gh+2.55,0);yL.position.set(GX+1.3,yh+1.25,0);gS.set(Math.round(11500*sm(.05,.3,u)).toLocaleString("tr-TR"));gS.position.set(GX-1.3,gh+1.9,0);yS2.set(Math.round(73000*eio(sm(.55,.95,u))).toLocaleString("tr-TR"));yS2.position.set(GX+1.3,yh+.6,0);
    [gs,ys,tp,gL,yL,gS,yS2].forEach(x=>x.visible=gb);
    // kamera
    const on=o.pi>0?(o.pp[o.pi-1].mod||"soru"):mod;const A=poz(on,0),B=poz(mod,u);const k=A.k!==B.k&&Math.abs(P[A.k].t.x-P[B.k].t.x)>5?1:eio(sm(0,.35,u));
    c.position.lerpVectors(A.p,B.p,k);c.quaternion.slerpQuaternions(A.q,B.q,k)}}};

/* ---------- SICAK: panel sıcakta mı soğukta mı çok üretir (−%0,29/°C) ---------- */
S.sicak=()=>{const sc=new THREE.Scene();const c=cam(46);studyo(sc);isik(sc,"#ffffff",2.3,"#6FE3FF",1.4);
  const pn=panel();pn.position.set(0,1.75,0);pn.rotation.x=-.45;sc.add(pn);
  const ayak=[-.4,.4].map(x=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,1.2,8),std("#5a6170",.4,.5));m.position.set(x,.6,-.35);sc.add(m);return m});
  const ort=new THREE.Mesh(new THREE.PlaneGeometry(1.12,2.27),new THREE.MeshBasicMaterial({color:L("#ff6a3a"),transparent:true,opacity:0,depthWrite:false}));ort.position.z=.025;ort.userData.kabuk=1;pn.add(ort);
  // termometre
  const TX=1.45,TB=.6,TH=2.3;const cam_=new THREE.Mesh(new THREE.CylinderGeometry(.1,.1,TH,20),new THREE.MeshBasicMaterial({color:L("#ffffff"),transparent:true,opacity:.6,depthWrite:false}));cam_.position.set(TX,TB+TH/2,.4);sc.add(cam_);
  const tk=new THREE.Mesh(new THREE.SphereGeometry(.2,20,14),bas("#e0452a"));tk.position.set(TX,TB,.4);sc.add(tk);
  const sv=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,1,12),bas("#e0452a"));sc.add(sv);const tS=dyazi({boy:.42,renk:"#e0452a",gen:7});sc.add(tS);
  const T2Y=T=>TB+.25+(T+10)/80*(TH-.4);[0,25,65].forEach(T=>{const l=cizgi([V3(TX-.17,T2Y(T),.4),V3(TX-.1,T2Y(T),.4)],"#16213a",1);sc.add(l);const y=yazi(T+"°",{boy:.22,renk:"#16213a"});y.position.set(TX-.38,T2Y(T),.4);sc.add(y)});
  // güç sütunu
  const GX=-1.45,GB=.3,G100=2.2;const gc=new THREE.Mesh(new THREE.BoxGeometry(.42,G100*1.12,.3),new THREE.MeshBasicMaterial({color:L("#ffffff"),transparent:true,opacity:.55,depthWrite:false}));gc.position.set(GX,GB+G100*.56,.4);sc.add(gc);
  const gf=new THREE.Mesh(new THREE.BoxGeometry(.34,1,.24),std("#19c46c",0,.5));sc.add(gf);const gS=dyazi({boy:.42,renk:"#16213a",gen:7});sc.add(gS);const gL=dyazi({boy:.26,renk:"#16213a",gen:8});gL.position.set(GX,GB-.2,.4);sc.add(gL);
  const c100=cizgi([V3(GX-.3,GB+G100,.4),V3(GX+.3,GB+G100,.4)],"#16213a",1,.04);sc.add(c100);const y100=yazi("%100",{boy:.2,renk:"#16213a"});y100.position.set(GX-.48,GB+G100,.4);sc.add(y100);
  // güneş + yaylar
  const gun=spr("#ffe2a8",1.4,0);sc.add(gun);const gk=new THREE.Mesh(new THREE.SphereGeometry(.2,20,14),bas("#f0a020"));sc.add(gk);
  const yay=(h,a0,a1,r)=>{const p=[];for(let i=0;i<=60;i++){const a=lerp(a0,a1,i/60);p.push(V3(Math.cos(a)*r,1.2+Math.sin(a)*h,-1.2))}const l=cizgi(p,"#de8400",.8,.08);sc.add(l);return{l,p}};
  const yz=yay(2.6,PI*.95,PI*.05,2.6),ks=yay(1.4,PI*.8,PI*.2,2.6);const yzY=yazi("YAZ",{boy:.3,renk:"#de8400"});yzY.position.set(0,4.1,-1.2);sc.add(yzY);const ksY=yazi("KIŞ",{boy:.3,renk:"#1580bd"});ksY.position.set(0,2.95,-1.2);sc.add(ksY);
  const gY=yazi("",{boy:.1});
  // ısı dalgaları + kar
  const dal=[];for(let i=0;i<5;i++){const l=cizgi(Array.from({length:24},()=>V3(0,0,0)),"#e0452a",0);sc.add(l);dal.push(l)}
  const NK=160,kar=pts(NK,.15,false);sc.add(kar);const KP=kar.geometry.attributes.position.array,KC=kar.geometry.attributes.color.array;const kd=[];for(let i=0;i<NK;i++)kd.push([rnd()*5-2.5,rnd(),rnd()*3-1.5]);
  // elektron/voltaj ok
  const vY=yazi("VOLTAJ ↓",{boy:.38,renk:"#e0452a"});vY.position.set(0,1.9,.7);sc.add(vY);
  const SC={soru:[25,100],stc:[25,100],katsayi:[35,97.1],yaz:[65,88.4],kayip:[65,88.4],kis:[0,107.3],neden:[65,88.4],gun:[25,100],son:[0,107.3]};
  const P={ana:{t:V3(0,1.8,0),d:11.5,w:PI/2,p:.12,ky:.1},yak:{t:V3(0,1.9,0),d:10,w:PI/2-.2,p:.18,ky:.1},gun:{t:V3(0,2.2,0),d:13,w:PI/2+.15,p:.16,ky:.1}};
  const MP={soru:"ana",stc:"ana",katsayi:"ana",yaz:"yak",kayip:"ana",kis:"yak",neden:"yak",gun:"gun",son:"ana"};
  const tq=cam(46);const poz=(m,u)=>{const k=MP[m]||"ana",A=P[k];orb(tq,A.t,A.d,A.w+(u||0)*.06,A.p);kaydir(tq,A.d*A.ky);return{p:tq.position.clone(),q:tq.quaternion.clone(),k}};
  return{sc,c,bl:[.8,.5,.78],kur(o){const t=o.t,mod=o.p.mod||"soru",u=o.pu;
    const on=o.pi>0?(o.pp[o.pi-1].mod||"soru"):mod;const a=SC[on],b=SC[mod];const kk=mod==="soru"?0:eio(sm(.15,.75,u));
    let T=lerp(a[0],b[0],kk),G=lerp(a[1],b[1],kk);if(mod==="soru"){T=25+40*Math.max(0,Math.sin(t*.9))*0;G=100}
    // termometre
    const ty=T2Y(T);sv.scale.y=ty-TB;sv.position.set(TX,TB+(ty-TB)/2,.4);sv.material.color=L(T<10?"#1580bd":T>45?"#e0452a":"#de8400");tk.material.color=sv.material.color;tS.set(Math.round(T)+" °C");tS.position.set(TX,TB+TH+.3,.4);
    // güç
    const gh=G/100*G100;gf.scale.y=gh;gf.position.set(GX,GB+gh/2,.4);gf.material.color=L(G>100.5?"#1580bd":G<99.5?"#e0452a":"#19c46c");gS.set("%"+G.toFixed(G%1&&Math.abs(G-Math.round(G))>.05?1:0).replace(".",","));gS.position.set(GX,GB+G100*1.12+.3,.4);gL.set(mod==="neden"?"VOLTAJ":"GÜÇ");
    // sıcak / soğuk
    const hz=cl((T-30)/35);ort.material.opacity=hz*.35;const kz=cl((10-T)/10);
    dal.forEach((l,j)=>{const x0=-.45+j*.22;const ps=[];for(let q=0;q<24;q++){const v=q/23;ps.push(V3(x0+Math.sin(v*8-t*3+j)*.06,2.75+v*(.4+hz*.5),.3))}l.geometry.setFromPoints(ps);l.material.opacity=hz*(.6+.3*Math.sin(t*2+j))});
    for(let i=0;i<NK;i++){const[x,f,z]=kd[i];const y=4.6-((f+t*.12)%1)*4.6;KP.set([x+Math.sin(t+i)*.1,y,z],i*3);KC.set([.08,.35,.75],i*3)}kar.geometry.attributes.position.needsUpdate=kar.geometry.attributes.color.needsUpdate=true;kar.visible=kz>.05;kar.material.opacity=kz;kar.material.transparent=true;
    vY.material.opacity=mod==="neden"?sm(.4,.55,u)*(.7+.3*Math.sin(t*5)):0;
    // güneş
    const gv=mod==="gun";yz.l.visible=ks.l.visible=gv;yzY.material.opacity=ksY.material.opacity=gv?1:0;
    let sp=V3(-1.7,3.3,-1.0);if(gv){const ph=(u*2)%1;const arc=u<.5?yz:ks;const n=Math.floor(ph*60);sp=arc.p[n].clone();yz.l.ilerle(u<.5?ph:1);ks.l.ilerle(u<.5?0:ph)}
    gun.position.copy(sp);gk.position.copy(sp);gun.material.opacity=gv?.7:0;gk.visible=gv;
    // kamera
    const A=poz(on,0),B=poz(mod,u);const k=eio(sm(0,.35,u));c.position.lerpVectors(A.p,B.p,k);c.quaternion.slerpQuaternions(A.q,B.q,k)}}};

/* ---------- SATURN: Satürn suda yüzer mi (0,69 g/cm³) ---------- */
function saturnTex(){const c=document.createElement("canvas");c.width=512;c.height=256;const x=c.getContext("2d");const r=["#e8d3a6","#d9bb85","#efdcb4","#cfa86e","#e3c995","#f0e0bd","#c99d62","#e6cf9f"];
  for(let i=0;i<32;i++){x.fillStyle=r[i%r.length];x.fillRect(0,i*8,512,8+((i*37)%5))}const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return t}
function halkaTex(){const c=document.createElement("canvas");c.width=256;c.height=8;const x=c.getContext("2d");for(let i=0;i<256;i++){const a=(i<20||i>236)?.15:(i>150&&i<165)?.05:.55+.35*Math.sin(i*.31)*Math.sin(i*.07);x.fillStyle=`rgba(${200+i%40},${170+i%30},${120+i%25},${Math.max(0,a)})`;x.fillRect(i,0,1,8)}const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return t}
S.saturn=()=>{const sc=new THREE.Scene();const c=cam(46);uzay(sc);const R=3;
  sc.add(new THREE.AmbientLight(L("#5a6a88"),.85));const dl=new THREE.DirectionalLight(L("#ffffff"),1.3);dl.position.set(5,7,9);sc.add(dl);
  const sat=new THREE.Group();sc.add(sat);const gov=new THREE.Mesh(new THREE.SphereGeometry(R,64,48),new THREE.MeshStandardMaterial({map:saturnTex(),roughness:.85}));sat.add(gov);
  const hg=new THREE.RingGeometry(R*1.25,R*2.2,128,1);const uv=hg.attributes.uv,ps=hg.attributes.position;for(let i=0;i<uv.count;i++){const r=Math.hypot(ps.getX(i),ps.getY(i));uv.setXY(i,(r-R*1.25)/(R*.95),.5)}
  const hl=new THREE.Mesh(hg,new THREE.MeshBasicMaterial({map:halkaTex(),transparent:true,side:THREE.DoubleSide,depthWrite:false}));hl.userData.kabuk=1;hl.rotation.x=PI/2-.42;sat.add(hl);sat.rotation.z=.18;
  const hay=new THREE.Mesh(new THREE.SphereGeometry(R,48,32),new THREE.MeshBasicMaterial({map:gov.material.map,transparent:true,opacity:.2,depthWrite:false}));hay.userData.kabuk=1;sat.add(hay);
  const cp=[];for(let i=0;i<=128;i++){const a=i/128*2*PI;cp.push(V3(Math.cos(a)*R*1.01,Math.sin(a)*R*1.01,0))}const cem=cizgi(cp,"#16213a",1);cem.userData.bb=1;sat.add(cem);
  // iç dolgu: 766 küçük Dünya (hacim)
  let sp=.55;const ic=[];const al=s_=>{const a=[];const n=Math.ceil(R/s_);for(let x=-n;x<=n;x++)for(let y=-n;y<=n;y++)for(let z=-n;z<=n;z++){const p=V3(x*s_+(y%2?s_/2:0),y*s_,z*s_);if(p.length()<R-.15)a.push(p)}return a};
  for(let k=0;k<30;k++){const a=al(sp);if(Math.abs(a.length-766)<15){ic.push(...a);break}sp*=Math.pow(a.length/766,1/3)}if(!ic.length)ic.push(...al(sp));ic.sort((a,b)=>a.y-b.y||a.x-b.x);
  const icM=new THREE.InstancedMesh(new THREE.SphereGeometry(sp*.46,10,8),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.5}),ic.length);const dm=new THREE.Object3D();
  const cB=L("#3d8fd1"),cT=L("#c9ccd3"),cK=L("#de8400");ic.forEach((p,i)=>{dm.position.copy(p);dm.updateMatrix();icM.setMatrixAt(i,dm.matrix);icM.setColorAt(i,cB)});icM.count=0;sat.add(icM);
  const agir=new Set();for(let i=0;i<95;i++)agir.add(Math.floor(i*ic.length/95));
  const iS=dyazi({boy:1.1,renk:"#e0452a",gen:10});sc.add(iS);
  // okyanus
  const OW=70,OD=14;const yuz=new THREE.Mesh(new THREE.PlaneGeometry(600,300),new THREE.MeshBasicMaterial({color:L("#6fb6e8"),transparent:true,opacity:.45,depthWrite:false,side:THREE.DoubleSide}));yuz.rotation.x=-PI/2;yuz.userData.kabuk=1;sc.add(yuz);
  const kes=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({color:L("#3d8fd1"),transparent:true,opacity:.42,depthWrite:false}));kes.position.set(0,-OD/2,12);kes.userData.kabuk=1;sc.add(kes);
  const dal=cizgi(Array.from({length:200},(_,i)=>V3(-OW/2+i*OW/199,0,12)),"#1580bd",1);sc.add(dal);
  const okY=yazi("DEV OKYANUS",{boy:.9,renk:"#1580bd"});okY.position.set(-9,-2.4,12.2);sc.add(okY);
  // buzdağı
  const bd=new THREE.Mesh(new THREE.IcosahedronGeometry(1.4,0),std("#eaf6ff",0,.4));bd.scale.set(1,1.5,1);sc.add(bd);const bdY=yazi("BUZDAĞI %90",{boy:.7,renk:"#1580bd"});sc.add(bdY);const stY=yazi("SATÜRN %70",{boy:.9,renk:"#de8400"});sc.add(stY);
  const gzY=yazi("H₂ + He",{boy:1.3,renk:"#1580bd"});sc.add(gzY);const okk=yazi("yüzer ✓",{boy:1.1,renk:"#13a35a"});sc.add(okk);
  // yan alan: su tankı + 1 cm³ küpler
  const TX=50;const tank=new THREE.Mesh(new THREE.BoxGeometry(4.4,2.4,2),new THREE.MeshBasicMaterial({color:L("#ffffff"),transparent:true,opacity:.25,depthWrite:false}));tank.position.set(TX,1.2,0);sc.add(tank);
  const tsu=new THREE.Mesh(new THREE.BoxGeometry(4.3,1.6,1.9),new THREE.MeshBasicMaterial({color:L("#6fb6e8"),transparent:true,opacity:.5,depthWrite:false}));tsu.userData.kabuk=1;sc.add(tsu);
  const mas=new THREE.Mesh(new THREE.BoxGeometry(7,.2,3),std("#c9ccd3",0,.7));mas.position.set(TX,-.1,0);sc.add(mas);
  const kS=new THREE.Mesh(new THREE.BoxGeometry(.8,.8,.8),new THREE.MeshStandardMaterial({map:saturnTex(),roughness:.8}));sc.add(kS);const kB=new THREE.Mesh(new THREE.BoxGeometry(.8,.8,.8),std("#d9f0ff",0,.25,{transparent:true,opacity:.85}));sc.add(kB);
  const kSY=yazi("SATÜRN 0,69 g",{boy:.32,renk:"#de8400"});sc.add(kSY);const kBY=yazi("BUZ",{boy:.32,renk:"#1580bd"});sc.add(kBY);const sY=yazi("SU · 1 g/cm³",{boy:.36,renk:"#1580bd"});sY.position.set(TX-1.0,2.15,1.1);sc.add(sY);
  const P={ana:{t:V3(0,3.8,0),d:36,w:PI/2+.18,p:.16,ky:.1},bat:{t:V3(-.8,1.2,0),d:37,w:PI/2+.1,p:.1,ky:.1},tank:{t:V3(TX,1.6,0),d:13,w:PI/2+.1,p:.2,ky:.12}};
  const MP={soru:"ana",hacim:"ana",kutle:"ana",yogun:"tank",su:"tank",buz:"tank",bat:"bat",gaz:"bat",son:"ana"};
  const tq=cam(46);const poz=(m,u)=>{const k=MP[m]||"ana",A=P[k];orb(tq,A.t,A.d,A.w+(u||0)*.05,A.p);kaydir(tq,A.d*A.ky);return{p:tq.position.clone(),q:tq.quaternion.clone(),k}};
  const FY=-.27*R;
  return{sc,c,bl:[.8,.5,.75],kur(o){const t=o.t,mod=o.p.mod||"soru",u=o.pu;gov.rotation.y=t*.12;
    // konum
    let y=6.2;if(mod==="bat"){const k=sm(.08,.6,u);y=lerp(6.2,FY,eio(k))+(k>=1?Math.sin(t*2)*.08:0)+(k>.95?Math.sin((u-.6)*30)*.25*Math.max(0,1-(u-.6)*4):0)}else if(mod==="gaz"||mod==="son")y=FY+Math.sin(t*1.6)*.08;sat.position.set(0,y,0);
    const ici=mod==="hacim"||mod==="kutle";hay.visible=cem.visible=ici;gov.visible=!ici;hl.visible=true;
    icM.count=mod==="hacim"?Math.round(ic.length*eio(sm(.05,.6,u))):mod==="kutle"?ic.length:0;
    if(mod==="kutle"){const k=sm(.15,.5,u);ic.forEach((p,i)=>icM.setColorAt(i,agir.has(i)?cK:cB.clone().lerp(cT,k)));icM.instanceColor.needsUpdate=true}else if(mod==="hacim"&&!icM._s){ic.forEach((p,i)=>icM.setColorAt(i,cB));icM.instanceColor.needsUpdate=true}
    iS.visible=ici;iS.set(mod==="hacim"?Math.round(766*icM.count/ic.length)+" DÜNYA":"95 / 766");iS.position.set(0,y,R+.6);
    // okyanus
    const okv=mod!=="yogun"&&mod!=="su"&&mod!=="buz";yuz.visible=dal.visible=okv;kes.visible=false;okY.material.opacity=0;
    dal.geometry.setFromPoints(Array.from({length:200},(_,i)=>{const x=-OW/2+i*OW/199;return V3(x,Math.sin(x*.9+t*2)*.08,12)}));
    bd.visible=bdY.visible=mod==="bat"||mod==="son";bd.position.set(-6.2,.25,6);bd.scale.set(.6,.9,.6);bd.rotation.y=t*.1;bdY.position.set(-6.2,2.2,6);bdY.material.opacity=mod==="bat"?sm(.7,.85,u):1;
    stY.material.opacity=mod==="bat"?sm(.62,.75,u):0;stY.position.set(0,R+1.4+y,0);gzY.material.opacity=mod==="gaz"?sm(.4,.55,u):0;gzY.position.set(0,R+1.8+y,0);okk.material.opacity=mod==="son"?sm(.2,.4,u):0;okk.position.set(0,R+1.6+y,0);
    // tank
    const tv=mod==="yogun"||mod==="su"||mod==="buz";[tank,tsu,mas,kS,kB,kSY,kBY,sY].forEach(x=>x.visible=tv);
    const suV=mod==="yogun"?0:mod==="su"?eio(sm(.1,.6,u)):1;tsu.scale.y=Math.max(.001,suV);tsu.position.set(TX,.05+.8*suV,0);sY.material.opacity=mod==="su"?sm(.5,.7,u):mod==="buz"?1:0;
    const SL=.05+1.6;// su seviyesi
    let sx=TX+1.1,syy=2.6,bx=TX-1.1,by=3.4;if(mod==="yogun"){syy=1.3+.4;by=9}
    if(mod==="su"){syy=lerp(1.7,2.6,eio(sm(.0,.15,u)));by=9}
    if(mod==="buz"){const k1=eio(sm(.05,.35,u)),k2=eio(sm(.5,.8,u));by=lerp(3.4,SL-.8*.9+.4,k1)+(k1>=1?Math.sin(t*2)*.02:0);syy=lerp(2.6,SL-.8*.69+.4,k2)+(k2>=1?Math.sin(t*2.2)*.02:0);kB.visible=true}else kB.visible=false;
    kS.position.set(sx,syy,0);kB.position.set(bx,by,0);kSY.position.set(sx,syy+.8,0);kBY.position.set(bx,by+.8,0);kBY.material.opacity=mod==="buz"?1:0;
    const on=o.pi>0?(o.pp[o.pi-1].mod||"soru"):mod;const A=poz(on,0),B=poz(mod,u);const k=A.k!==B.k&&Math.abs(P[A.k].t.x-P[B.k].t.x)>5?1:eio(sm(0,.35,u));
    c.position.lerpVectors(A.p,B.p,k);c.quaternion.slerpQuaternions(A.q,B.q,k)}}};

/* ---------- MADEN: bitcoin madencilik cihazı günde kaç kWh (3,5 kW × 24 sa) ---------- */
function makineM(){const g=new THREE.Group();const gv=new THREE.Mesh(new THREE.BoxGeometry(2.0,1.45,.98),std("#b8bec8",.6,.35));gv.position.y=.73;g.add(gv);
  const fan=[];[-1,1].forEach(s_=>{const f=new THREE.Group();f.position.set(s_*1.01,.73,0);f.rotation.z=PI/2;g.add(f);const hl=new THREE.Mesh(new THREE.TorusGeometry(.42,.05,8,40),std("#1b2233",.3,.5));hl.rotation.x=PI/2;f.add(hl);
    for(let i=0;i<7;i++){const b=new THREE.Mesh(new THREE.BoxGeometry(.36,.02,.12),std("#1b2233",.2,.6));b.position.set(Math.cos(i/7*2*PI)*.2,0,Math.sin(i/7*2*PI)*.2);b.rotation.y=-i/7*2*PI+.5;f.add(b)}fan.push(f)});
  for(let i=0;i<8;i++){const l=new THREE.Mesh(new THREE.BoxGeometry(1.6,.03,.02),bas("#5a6170"));l.position.set(0,.3+i*.12,.5);g.add(l)}
  const led=new THREE.Mesh(new THREE.BoxGeometry(.08,.08,.02),bas("#19c46c"));led.position.set(.8,1.3,.5);g.add(led);g.fan=fan;g.led=led;return g}
function caydanlik(){const g=new THREE.Group();const m=std("#eef1f6",.3,.4);const b=new THREE.Mesh(new THREE.CylinderGeometry(.32,.4,.8,24),m);b.position.y=.4;g.add(b);
  const k=new THREE.Mesh(new THREE.TorusGeometry(.22,.05,8,20,PI),std("#1b2233"));k.position.set(-.42,.5,0);k.rotation.z=PI/2;g.add(k);const a=new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,.08,24),std("#1b2233"));a.position.y=.02;g.add(a);return g}
S.maden=()=>{const sc=new THREE.Scene();const c=cam(46);studyo(sc);isik(sc,"#ffffff",2.3,"#6FE3FF",1.4);
  const mk=makineM();sc.add(mk);const mY=yazi("MADENCİLİK CİHAZI",{boy:.32,renk:"#16213a"});mY.position.set(0,1.85,0);sc.add(mY);
  const kb=cizgi([V3(1.0,.2,0),V3(1.4,.02,.3),V3(1.9,.02,.3),V3(2.1,.6,0)],"#16213a",1);sc.add(kb);
  const sayac=new THREE.Mesh(new THREE.BoxGeometry(1.0,1.2,.3),std("#eef1f6",0,.6));sayac.position.set(2.3,1.0,0);sc.add(sayac);const ek=new THREE.Mesh(new THREE.PlaneGeometry(.8,.4),bas("#16213a"));ek.position.set(2.3,1.2,.16);sc.add(ek);
  const wS=dyazi({boy:.32,renk:"#19c46c",gen:8});wS.position.set(2.3,1.2,.2);sc.add(wS);
  const cy=[0,1].map(i=>{const k=caydanlik();k.position.set(-1.3-i*.95,0,1.4);sc.add(k);return k});const cyY=yazi("2 × SU ISITICISI",{boy:.3,renk:"#de8400"});cyY.position.set(-1.8,1.25,1.4);sc.add(cyY);
  // ısı dalgaları
  const dal=[];for(let i=0;i<4;i++){const l=cizgi(Array.from({length:20},()=>V3(0,0,0)),"#e0452a",.6);sc.add(l);dal.push(l)}
  // saat kadranı (24 sa)
  const sa=new THREE.Group();sa.position.set(0,3.1,0);sc.add(sa);const kad=new THREE.Mesh(new THREE.CircleGeometry(1.0,64),bas("#ffffff"));sa.add(kad);
  const kc=[];for(let i=0;i<=96;i++){const a=i/96*2*PI;kc.push(V3(Math.cos(a)*1.0,Math.sin(a)*1.0,.01))}sa.add(cizgi(kc,"#16213a",1));
  for(let i=0;i<24;i++){const a=PI/2-i/24*2*PI;const l=cizgi([V3(Math.cos(a)*.86,Math.sin(a)*.86,.02),V3(Math.cos(a)*(i%6?.94:.8),Math.sin(a)*(i%6?.94:.8),.02)],"#16213a",1);sa.add(l)}
  const dol=new THREE.Mesh(new THREE.CircleGeometry(.84,64,PI/2,0.001),bas("#f0a020",{transparent:true,opacity:.7}));dol.position.z=.015;sa.add(dol);
  const ib=new THREE.Mesh(new THREE.BoxGeometry(.05,.8,.02),bas("#e0452a"));ib.geometry.translate(0,.4,0);ib.position.z=.03;sa.add(ib);const saS=dyazi({boy:.45,renk:"#e0452a",gen:8});saS.position.set(0,0,.06);sa.add(saS);
  // enerji sütunu (84 kWh)
  const EX=-2.8,EH=3.2;const ec=new THREE.Mesh(new THREE.BoxGeometry(.8,EH+.1,.6),new THREE.MeshBasicMaterial({color:L("#ffffff"),transparent:true,opacity:.5,depthWrite:false}));ec.position.set(EX,EH/2+.05,0);sc.add(ec);
  const ed=new THREE.Mesh(new THREE.BoxGeometry(.7,1,.5),std("#19c46c",0,.5));sc.add(ed);const eS=dyazi({boy:.42,renk:"#13a35a",gen:9});sc.add(eS);
  // yan alan: yol (İstanbul → Ankara)
  const YX=22;const yol=new THREE.Mesh(new THREE.PlaneGeometry(6.4,.9),bas("#9aa3b5"));yol.rotation.x=-PI/2;yol.position.set(YX,.01,0);sc.add(yol);yol.userData.kabuk=1;
  const syol=cizgi([V3(YX-3.2,.03,0),V3(YX+3.2,.03,0)],"#ffffff",1,.3);sc.add(syol);const ar=araba();ar.scale.setScalar(.55);sc.add(ar);
  const iY=yazi("İSTANBUL",{boy:.32,renk:"#16213a"});iY.position.set(YX-2.5,.9,.6);sc.add(iY);const aY=yazi("ANKARA",{boy:.32,renk:"#16213a"});aY.position.set(YX+2.6,.9,.6);sc.add(aY);
  const kmS=dyazi({boy:.75,renk:"#e0452a",gen:8});kmS.position.set(YX,1.9,0);sc.add(kmS);
  // yan alan: çamaşır makineleri (84)
  const CX=-22;const cm=new THREE.InstancedMesh(new THREE.BoxGeometry(.5,.55,.45),std("#eef1f6",0,.5),84);const cd=new THREE.InstancedMesh(new THREE.CircleGeometry(.16,20),bas("#1580bd"),84);const dm=new THREE.Object3D();
  for(let i=0;i<84;i++){const x=CX+(i%14-6.5)*.6,y=.3+Math.floor(i/14)*.62;dm.position.set(x,y,0);dm.rotation.set(0,0,0);dm.updateMatrix();cm.setMatrixAt(i,dm.matrix);dm.position.set(x,y,.231);dm.updateMatrix();cd.setMatrixAt(i,dm.matrix)}cm.count=cd.count=0;sc.add(cm,cd);
  const cS=dyazi({boy:.75,renk:"#1580bd",gen:8});cS.position.set(CX,4.3,0);sc.add(cS);
  // yan alan: telefonlar (3.650)
  const TX=-44;const tl=new THREE.InstancedMesh(new THREE.BoxGeometry(.06,.12,.02),std("#1d2129",.6,.4),3650);for(let i=0;i<3650;i++){dm.position.set(TX+(i%73-36)*.08,.12+Math.floor(i/73)*.15,0);dm.updateMatrix();tl.setMatrixAt(i,dm.matrix)}tl.count=0;sc.add(tl);
  const tS=dyazi({boy:.9,renk:"#13a35a",gen:8});tS.position.set(TX,13.6,0);sc.add(tS);
  // yan alan: yıl (365 gün × 84)
  const GX=44;const gk=new THREE.InstancedMesh(new THREE.PlaneGeometry(.28,.28),bas("#f0a020"),365);for(let i=0;i<365;i++){dm.position.set(GX+(i%19-9)*.33,.3+(19-Math.floor(i/19))*.33,0);dm.updateMatrix();gk.setMatrixAt(i,dm.matrix)}gk.count=0;sc.add(gk);
  const gS=dyazi({boy:.75,renk:"#13a35a",gen:12});gS.position.set(GX,7.6,0);sc.add(gS);
  const P={ana:{t:V3(.4,1.3,0),d:12,w:PI/2-.3,p:.18,ky:.1},guc:{t:V3(.1,1.0,0),d:16.5,w:PI/2-.1,p:.18,ky:.1},saat:{t:V3(-.6,2.3,0),d:12,w:PI/2-.1,p:.08,ky:.1},
    yol:{t:V3(YX,.6,0),d:14,w:PI/2,p:.3,ky:.1},cam:{t:V3(CX,2.0,0),d:19,w:PI/2,p:.08,ky:.1},tel:{t:V3(TX,3.9,0),d:25,w:PI/2,p:.04,ky:.1},yil:{t:V3(GX,3.6,0),d:22,w:PI/2,p:.04,ky:.1}};
  const MP={soru:"ana",guc:"guc",saat:"saat",gun:"saat",araba:"yol",camasir:"cam",telefon:"tel",yil:"yil",son:"ana"};
  const tq=cam(46);const poz=(m,u)=>{const k=MP[m]||"ana",A=P[k];orb(tq,A.t,A.d,A.w+(u||0)*.05,A.p);kaydir(tq,A.d*A.ky);return{p:tq.position.clone(),q:tq.quaternion.clone(),k}};
  return{sc,c,bl:[.8,.5,.78],kur(o){const t=o.t,mod=o.p.mod||"soru",u=o.pu;mk.fan.forEach(f=>f.rotation.y=t*18);mk.led.visible=Math.sin(t*6)>0;
    dal.forEach((l,j)=>{const x0=-.6+j*.4;const ps=[];for(let q=0;q<20;q++){const v=q/19;ps.push(V3(x0+Math.sin(v*8-t*3+j)*.05,1.55+v*.6,0))}l.geometry.setFromPoints(ps)});
    wS.set(mod==="soru"?"···· W":Math.round(mod==="guc"?3500*eo(sm(.1,.4,u)):3500)+" W");
    const cv=mod==="guc"?sm(.55,.7,u):0;cy.forEach((k,i)=>{k.visible=cv>0;k.scale.setScalar(.001+eob(cl(cv*1.2-i*.2)))});cyY.material.opacity=cv;
    // saat
    const sv=mod==="saat"||mod==="gun";sa.visible=sv;const sk=mod==="saat"?eio(sm(.1,.85,u)):1;ib.rotation.z=-sk*2*PI;dol.geometry.dispose();dol.geometry=new THREE.CircleGeometry(.84,64,PI/2-sk*2*PI,Math.max(.001,sk*2*PI));saS.set(Math.round(24*sk)+" SAAT");
    const evv=mod==="gun";ec.visible=ed.visible=eS.visible=evv;const ek_=evv?eio(sm(.1,.7,u)):0;ed.scale.y=Math.max(.001,EH*ek_);ed.position.set(EX,.05+EH*ek_/2,0);eS.set(Math.round(84*ek_)+" kWh");eS.position.set(EX,EH+.5,0);
    // araba
    const ak=mod==="araba"?eio(sm(.08,.8,u)):0;ar.position.set(YX-2.8+5.6*ak*420/450,0,0);ar.teker.forEach(w=>w.rotation.y=t*8);kmS.set(Math.round(420*ak)+" km");
    // çamaşır
    const cn=mod==="camasir"?Math.round(84*eio(sm(.08,.7,u))):0;cm.count=cd.count=cn;cS.visible=false;
    const tn=mod==="telefon"?Math.round(3650*eio(sm(.1,.85,u))):0;tl.count=tn;tS.visible=false;tS.set(tn.toLocaleString("tr-TR"));
    const gn=mod==="yil"?Math.round(365*eio(sm(.08,.8,u))):0;gk.count=gn;gS.visible=false;gS.set((gn*84).toLocaleString("tr-TR")+" kWh");
    const on=o.pi>0?(o.pp[o.pi-1].mod||"soru"):mod;const A=poz(on,0),B=poz(mod,u);const k=A.k!==B.k&&Math.abs(P[A.k].t.x-P[B.k].t.x)>5?1:eio(sm(0,.35,u));
    c.position.lerpVectors(A.p,B.p,k);c.quaternion.slerpQuaternions(A.q,B.q,k)}}};


/* ================= ZIPLA: Ay'da zıplama (1/6 g) ================= */
function kisiM(o={}){const g=new THREE.Group();const ten=std("#f2c46b",0,.6),giy=std(o.giy||"#1580bd",0,.6),pan=std(o.pan||"#3a4152",0,.7);
  const gv=new THREE.Mesh(new THREE.CylinderGeometry(.17,.15,.62,14),giy);gv.position.y=1.17;g.add(gv);
  const bs=new THREE.Mesh(new THREE.SphereGeometry(.15,20,14),ten);bs.position.y=1.66;g.add(bs);
  const kol=[-1,1].map(s=>{const p=new THREE.Group();p.position.set(s*.22,1.42,0);const k=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,.58,10),ten);k.position.y=-.29;p.add(k);g.add(p);return p});
  const bac=[-1,1].map(s=>{const p=new THREE.Group();p.position.set(s*.09,.86,0);const k=new THREE.Mesh(new THREE.CylinderGeometry(.07,.06,.84,10),pan);k.position.y=-.42;p.add(k);const ay=new THREE.Mesh(new THREE.BoxGeometry(.12,.07,.24),std("#1b2233"));ay.position.set(0,-.84,.05);p.add(ay);g.add(p);return p});
  // astronot ekleri
  const kask=new THREE.Mesh(new THREE.SphereGeometry(.24,24,16),new THREE.MeshLambertMaterial({color:L("#eef1f6")}));kask.position.y=1.68;g.add(kask);
  const vizor=new THREE.Mesh(new THREE.BoxGeometry(.3,.16,.06),std("#de8400",.6,.2));vizor.position.set(0,1.7,.2);g.add(vizor);
  const canta=new THREE.Mesh(new THREE.BoxGeometry(.46,.62,.26),std("#eef1f6",0,.55));canta.position.set(0,1.22,-.28);g.add(canta);
  const kg=yazi("84 KG",{boy:.2,renk:"#e0452a"});kg.position.set(0,1.98,-.3);g.add(kg);
  g.astro=v=>{kask.visible=vizor.visible=canta.visible=kg.visible=v;bs.visible=!v;giy.color=L(v?"#eef1f6":(o.giy||"#1580bd"));pan.color=L(v?"#d9dde5":(o.pan||"#3a4152"))};g.astro(false);
  g.poz=(c,h)=>{// c: çömelme 0-1, h: kol kaldırma 0-1
    gv.position.y=1.17-c*.25;bs.position.y=1.66-c*.25;kask.position.y=1.68-c*.25;vizor.position.y=1.7-c*.25;canta.position.y=1.22-c*.25;kol.forEach((p,i)=>{p.position.y=1.42-c*.25;p.rotation.z=(i?1:-1)*(.15+h*2.6)});
    bac.forEach((p,i)=>{p.position.y=.86-c*.25;p.rotation.x=c*.5;p.scale.y=1-c*.05})};return g}
function potaM(){const g=new THREE.Group();const siy=std("#1b2233",.3,.5);const dir=new THREE.Mesh(new THREE.CylinderGeometry(.07,.09,3.55,12),siy);dir.position.set(0,1.775,-.9);g.add(dir);
  const kol=new THREE.Mesh(new THREE.BoxGeometry(.08,.08,.72),siy);kol.position.set(0,3.3,-.55);g.add(kol);
  const pano=new THREE.Mesh(new THREE.BoxGeometry(1.8,1.05,.04),std("#ffffff",0,.4));pano.position.set(0,3.35,-.2);g.add(pano);
  const ic=new THREE.Mesh(new THREE.BoxGeometry(.59,.45,.045),std("#e0452a",0,.5));ic.position.set(0,3.2,-.2);g.add(ic);const ic2=new THREE.Mesh(new THREE.BoxGeometry(.5,.36,.05),std("#ffffff",0,.4));ic2.position.set(0,3.2,-.2);g.add(ic2);
  const cem=new THREE.Mesh(new THREE.TorusGeometry(.23,.02,8,32),std("#e06a10",.3,.4));cem.rotation.x=PI/2;cem.position.set(0,3.05,.07);g.add(cem);
  const fil=[];for(let i=0;i<10;i++){const a=i/10*2*PI;fil.push(cizgi([V3(Math.cos(a)*.23,3.05,.07+Math.sin(a)*.23),V3(Math.cos(a)*.15,2.65,.07+Math.sin(a)*.15)],"#16213a",.7))}fil.forEach(f=>g.add(f));return g}
S.zipla=()=>{const sc=new THREE.Scene();const c=cam(46);uzay(sc,3000);isik(sc,"#ffffff",2.3,"#6FE3FF",1.2);
  const zem=new THREE.Mesh(new THREE.CircleGeometry(60,64),new THREE.MeshLambertMaterial({color:L("#d3d5db")}));zem.rotation.x=-PI/2;sc.add(zem);zem.userData.kabuk=1;
  let s_=5;const r=()=>(s_=(s_*16807)%2147483647)/2147483647;
  for(let i=0;i<70;i++){const R=.25+r()*1.6;const x=(r()-.5)*40,z=-r()*30+4;if(Math.abs(x)<2.2&&z>-2)continue;const k=new THREE.Mesh(new THREE.RingGeometry(R*.82,R,40),new THREE.MeshBasicMaterial({color:L("#a9adb7")}));k.rotation.x=-PI/2;k.position.set(x,.005,z);k.scale.y=1;sc.add(k);
    const ic=new THREE.Mesh(new THREE.CircleGeometry(R*.82,32),new THREE.MeshBasicMaterial({color:L("#c3c6ce")}));ic.rotation.x=-PI/2;ic.position.set(x,.004,z);sc.add(ic)}
  const dn=dunya(1.1);dn.position.set(-8,5.2,-24);sc.add(dn);
  const ks=kisiM();sc.add(ks);
  // gölge
  const gol=new THREE.Mesh(new THREE.CircleGeometry(.32,24),new THREE.MeshBasicMaterial({color:L("#8d929e"),transparent:true,opacity:.6}));gol.rotation.x=-PI/2;gol.position.y=.008;sc.add(gol);
  // ölçü cetveli (sağda)
  const RX=1.25;const cet=cizgi([V3(RX,0,0),V3(RX,3.6,0)],"#16213a",1);sc.add(cet);const cent=[];for(let i=0;i<=7;i++){const l=cizgi([V3(RX-.08,i*.5,0),V3(RX+(i%2?.08:.2),i*.5,0)],"#16213a",1);sc.add(l);cent.push(l)}
  const cetY=[];for(let i=1;i<=3;i++){const y=yazi(i+" m",{boy:.3,renk:"#16213a",sol:true});y.position.set(RX+.26,i,0);sc.add(y);cetY.push(y)}
  const ib=new THREE.Mesh(new THREE.BoxGeometry(.5,.045,.045),bas("#e0452a"));sc.add(ib);const hS=dyazi({boy:.46,renk:"#e0452a",gen:8,sol:true});sc.add(hS);
  const pota=potaM();pota.position.set(-1.25,0,-.4);sc.add(pota);
  // çekim okları
  const okD=okM("#e0452a",.09),okA=okM("#1580bd",.09);okD.rotation.z=-PI/2;okA.rotation.z=-PI/2;okD.position.set(-1.5,3.1,0);okA.position.set(1.5,3.1,0);sc.add(okD,okA);
  const okDY=yazi("DÜNYA 9,8",{boy:.3,renk:"#e0452a"}),okAY=yazi("AY 1,62",{boy:.3,renk:"#1580bd"});okDY.position.set(-1.5,3.45,0);okAY.position.set(1.5,3.45,0);sc.add(okDY,okAY);
  // tartı + damacana
  const tar=new THREE.Group();sc.add(tar);const tg=new THREE.Mesh(new THREE.BoxGeometry(.8,.08,.7),std("#eef1f6",0,.5));tg.position.y=.04;tar.add(tg);
  const te=new THREE.Mesh(new THREE.PlaneGeometry(.36,.14),bas("#16213a"));te.rotation.x=-PI/2;te.position.set(0,.085,.26);tar.add(te);
  const tS=dyazi({boy:.42,renk:"#13a35a",gen:7});tS.position.set(-1.2,1.5,0);sc.add(tS);
  const dam=new THREE.Group();dam.position.set(-.95,0,.7);sc.add(dam);const dg=new THREE.Mesh(new THREE.CylinderGeometry(.16,.16,.42,20),new THREE.MeshStandardMaterial({color:L("#7ec3ea"),transparent:true,opacity:.7,roughness:.2}));dg.position.y=.21;dam.add(dg);
  const dbo=new THREE.Mesh(new THREE.CylinderGeometry(.06,.14,.12,20),dg.material);dbo.position.y=.48;dam.add(dbo);const dk=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,.04,16),std("#1580bd"));dk.position.y=.56;dam.add(dk);
  const damY=yazi("19 KG",{boy:.2,renk:"#1580bd"});damY.position.set(0,.8,0);dam.add(damY);
  const yerY=dyazi({boy:.34,renk:"#16213a",gen:9});yerY.position.set(-1.7,.35,1.2);sc.add(yerY);
  const zS=dyazi({boy:.45,renk:"#1580bd",gen:8});zS.position.set(-1.7,1.1,.6);sc.add(zS);
  const P={ana:{t:V3(0,1.0,0),d:8.5,w:PI/2-.25,p:.08,ky:.1},cek:{t:V3(0,1.7,0),d:11.5,w:PI/2,p:.04,ky:.1},tar:{t:V3(0,.95,0),d:7.2,w:PI/2-.35,p:.1,ky:.1},yuk:{t:V3(0,2.35,0),d:16.5,w:PI/2-.12,p:.05,ky:.1},
    pota:{t:V3(-.2,2.35,0),d:16.5,w:PI/2+.22,p:.06,ky:.1},giy:{t:V3(0,1.45,0),d:10,w:PI/2-.45,p:.08,ky:.1}};
  const MP={soru:"ana",cekim:"cek",tarti:"tar",dunya:"yuk",hesap:"yuk",pota:"pota",sure:"yuk",giysi:"giy",son:"pota"};
  const tq=cam(46);const poz=(m,u)=>{const k=MP[m]||"ana",A=P[k];orb(tq,A.t,A.d,A.w+(u||0)*.06,A.p);kaydir(tq,A.d*A.ky);return{p:tq.position.clone(),q:tq.quaternion.clone(),k}};
  // zıplama: f (0-1 döngü), H tepe
  const zip=(f,H,ucus)=>{const a=(1-ucus)/2;if(f<a){const c=Math.sin(f/a*PI)*.8;return{y:0,c,h:0}}if(f>1-a){const c=Math.sin((f-1+a)/a*PI)*.6;return{y:0,c,h:0}}const q=(f-a)/ucus;return{y:H*4*q*(1-q),c:0,h:Math.sin(q*PI)}};
  return{sc,c,bl:[.8,.5,.8],kur(o){const t=o.t,mod=o.p.mod||"soru",u=o.pu;dn.ayar(t);dn.visible=mod!=="tarti"&&mod!=="giysi";
    let H=0,f=0,ucus=.75,cetv=false,potav=false,okv=false,tarv=false,astro=false,hv="",yer="",zv="";
    if(mod==="soru"){H=.9;f=(t/1.6)%1}
    else if(mod==="cekim"){okv=true;H=0;f=0}
    else if(mod==="tarti"){tarv=true;H=0}
    else if(mod==="dunya"){cetv=true;H=.5;f=(t/1.0)%1;ucus=.64;yer="DÜNYA'DA"}
    else if(mod==="hesap"){cetv=true;H=3.03;f=sm(.08,.98,u);ucus=.86;yer="AY'DA"}
    else if(mod==="pota"){cetv=true;potav=true;H=3.03;f=sm(.04,.96,u);ucus=.86;yer="AY'DA"}
    else if(mod==="sure"){cetv=true;H=3.03;f=sm(.04,.98,u);ucus=.9;yer="AY'DA"}
    else if(mod==="giysi"){astro=true;H=.8;f=(t/2.4)%1;ucus=.8}
    else{potav=true;cetv=true;H=3.03;f=(t/4.2)%1;ucus=.86}
    const z=zip(f,H,ucus);ks.position.set(0,z.y,0);ks.poz(z.c,z.h);ks.astro(astro);gol.scale.setScalar(1/(1+z.y*.5));
    // cetvel
    [cet,...cent,...cetY].forEach(x=>x.visible=cetv);ib.visible=hS.visible=cetv;
    if(cetv){const top=z.y;ib.position.set(RX-.05,top,0);hS.position.set(RX+.78,top+.02,0);hS.set(top.toFixed(1).replace(".",",")+" m")}
    pota.visible=potav;[okD,okA,okDY,okAY].forEach(x=>x.visible=okv);if(okv){const k=eo(sm(.05,.5,u));okD.boy(2.6*k);okA.boy(2.6*.165*eo(sm(.3,.75,u)));okAY.material.opacity=sm(.3,.6,u)}
    tar.visible=tS.visible=tarv;dam.visible=tarv&&o.pu>.55;if(tarv){const k=eo(sm(.15,.5,u));tS.set(Math.round(lerp(80,13,k))+" kg");ks.position.y=.08;dam.scale.setScalar(.001+eob(sm(.55,.7,u)))}
    yerY.visible=!!yer;yerY.set(yer);
    if(mod==="sure"){const a=(1-ucus)/2;const q=cl((f-a)/ucus);zv=(q*3.9).toFixed(1).replace(".",",")+" sn"}zS.visible=!!zv;zS.set(zv);
    const on=o.pi>0?(o.pp[o.pi-1].mod||"soru"):mod;const A=poz(on,0),B=poz(mod,u);const k=A.k===B.k?1:eio(sm(0,.35,u));
    c.position.lerpVectors(A.p,B.p,k);c.quaternion.slerpQuaternions(A.q,B.q,k)}}};

/* ================= ALAN: Türkiye'nin elektriği için panel alanı ================= */
const TR_SINIR=[[26.6,41.9],[28.0,41.98],[29.1,41.25],[31.2,41.1],[33.3,42.0],[35.1,42.02],[36.2,41.6],[37.5,41.1],[39.7,41.0],[41.5,41.5],[42.8,41.55],[43.5,41.05],[43.7,40.1],[44.8,39.7],[44.4,39.0],[44.2,37.3],[42.4,37.1],[41.0,37.1],[39.0,36.7],[38.0,36.85],[36.6,36.8],[36.1,35.9],[35.9,36.6],[34.6,36.8],[32.8,36.05],[31.0,36.85],[30.4,36.3],[29.2,36.6],[27.4,36.7],[27.2,37.9],[26.4,38.3],[26.8,39.0],[26.1,39.5],[26.4,40.1],[26.8,40.6],[26.0,40.65],[26.5,41.3]];
const trXY=(lo,la)=>[(lo-35)*.777,la-39];
function gesTex(){const c=document.createElement("canvas");c.width=c.height=256;const x=c.getContext("2d");x.fillStyle="#1a2c5c";x.fillRect(0,0,256,256);x.strokeStyle="#b9c2d0";x.lineWidth=2;for(let i=0;i<=16;i++){x.beginPath();x.moveTo(0,i*16);x.lineTo(256,i*16);x.stroke()}for(let i=0;i<=8;i++){x.beginPath();x.moveTo(i*32,0);x.lineTo(i*32,256);x.stroke()}
  const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=8;return t}
S.alan=()=>{const sc=new THREE.Scene();const c=cam(46);studyo(sc);isik(sc,"#ffffff",2.3,"#6FE3FF",1.3);
  // harita
  const sh=new THREE.Shape();TR_SINIR.forEach(([lo,la],i)=>{const [x,y]=trXY(lo,la);i?sh.lineTo(x,y):sh.moveTo(x,y)});
  const hm=std("#a9d39a",0,.8);const har=new THREE.Mesh(new THREE.ExtrudeGeometry(sh,{depth:.12,bevelEnabled:false}),hm);har.rotation.x=-PI/2;sc.add(har);
  const hY=yazi("TÜRKİYE · 783.562 km²",{boy:.6,renk:"#16213a"});hY.position.set(0,.2,-4.6);sc.add(hY);
  // GES karesi (1.316 km² → kenar 0,327 birim; 1 birim = 111 km)
  const GX=-1.94,GZ=-1.1,GK=Math.sqrt(1316/12321);
  const ges=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:gesTex()}));ges.rotation.x=-PI/2;ges.position.set(GX,.13,GZ);sc.add(ges);ges.userData.kabuk=1;
  const gc=cizgi([V3(-.5,0,-.5),V3(.5,0,-.5),V3(.5,0,.5),V3(-.5,0,.5),V3(-.5,0,-.5)],"#16213a",1);gc.position.set(GX,.135,GZ);sc.add(gc);
  const hal=new THREE.Mesh(new THREE.RingGeometry(.55,.68,48),new THREE.MeshBasicMaterial({color:L("#e0452a"),transparent:true}));hal.rotation.x=-PI/2;hal.position.set(GX,.14,GZ);sc.add(hal);
  const gY=yazi("≈ 1.300 km² PANEL",{boy:.42,renk:"#e0452a"});sc.add(gY);
  // İstanbul karesi (5.712 km² → kenar .681)
  const IK=Math.sqrt(5712/12321);
  const ist=new THREE.Group();ist.position.set(GX+GK/2+.08+IK/2,.14,GZ+GK/2-IK/2);sc.add(ist);
  const ik=new THREE.Mesh(new THREE.PlaneGeometry(IK,IK),new THREE.MeshBasicMaterial({color:L("#9fd0ee"),transparent:true,opacity:.75}));ik.rotation.x=-PI/2;ist.add(ik);ik.userData.kabuk=1;
  const h2=IK/2;const ic_=cizgi([V3(-h2,.01,-h2),V3(h2,.01,-h2),V3(h2,.01,h2),V3(-h2,.01,h2),V3(-h2,.01,-h2)],"#1580bd",1);ic_.position.copy(ik.position);ist.add(ic_);
  const q1=cizgi([V3(0,.012,-h2),V3(0,.012,h2)],"#1580bd",1,.03),q2=cizgi([V3(-h2,.012,0),V3(h2,.012,0)],"#1580bd",1,.03);q1.position.copy(ik.position);q2.position.copy(ik.position);ist.add(q1,q2);
  const iY=yazi("İSTANBUL İLİ",{boy:.11,renk:"#1580bd"});iY.position.set(0,.05,-h2-.08);ist.add(iY);
  // yan alan: takvim (365 gün)
  const KX=30;const dm=new THREE.Object3D();const gk=new THREE.InstancedMesh(new THREE.PlaneGeometry(.28,.28),bas("#f0a020"),365);
  for(let i=0;i<365;i++){dm.position.set(KX+(i%19-9)*.33,.3+(19-Math.floor(i/19))*.33,0);dm.updateMatrix();gk.setMatrixAt(i,dm.matrix)}gk.count=0;sc.add(gk);
  const kY=yazi("1 KARE = 1 GÜN ≈ 1 MİLYAR kWh",{boy:.36,renk:"#16213a"});kY.position.set(KX,7.3,0);sc.add(kY);
  const kS=dyazi({boy:.6,renk:"#de8400",gen:8});kS.position.set(KX,8.1,0);sc.add(kS);
  // yan alan: 1 m² panel + güneş + sütunlar
  const PX=-30;const p1=new THREE.Group();p1.position.set(PX-1.2,.6,0);p1.rotation.x=-.5;sc.add(p1);
  const pm=new THREE.Mesh(new THREE.BoxGeometry(1.2,1.2,.05),[std("#b8bec8"),std("#b8bec8"),std("#b8bec8"),std("#b8bec8"),new THREE.MeshBasicMaterial({map:gesTex()}),std("#e9ecf0")]);p1.add(pm);
  const ay1=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,.7,8),std("#1b2233"));ay1.position.set(PX-1.2,.3,-.2);sc.add(ay1);
  const p1Y=yazi("1 m²",{boy:.3,renk:"#16213a"});p1Y.position.set(PX-1.2,1.55,.3);sc.add(p1Y);
  const gn=gunes(.4);gn.position.set(PX-1.2,2.75,-.5);sc.add(gn);
  const isn=[];for(let i=0;i<5;i++){const l=cizgi([V3(PX-1.7+i*.25,2.2,-.3),V3(PX-1.7+i*.25,1.0,.1)],"#f0a020",1,.08);sc.add(l);isn.push(l)}
  const SH=2.3,SX1=PX+.6,SX2=PX+1.6;
  const s1=new THREE.Mesh(new THREE.BoxGeometry(.7,1,.5),std("#f0a020",0,.5));sc.add(s1);const s1Y=dyazi({boy:.32,renk:"#de8400",gen:10});sc.add(s1Y);
  const s2=new THREE.Mesh(new THREE.BoxGeometry(.7,1,.5),std("#19c46c",0,.5));sc.add(s2);const s2Y=dyazi({boy:.32,renk:"#13a35a",gen:10});sc.add(s2Y);
  const s3=new THREE.Mesh(new THREE.BoxGeometry(.72,1,.52),new THREE.MeshBasicMaterial({color:L("#e0452a"),transparent:true,opacity:.35,depthWrite:false}));sc.add(s3);
  const isiY=yazi("ISI %77",{boy:.26,renk:"#e06a10"});sc.add(isiY);
  // gece: ay + batarya
  const ayS=new THREE.Mesh(new THREE.SphereGeometry(.45,24,16),std("#e3e6ec",0,.8));sc.add(ayS);
  const bat=new THREE.Group();bat.position.set(GX+1.3,.13,GZ+.1);sc.add(bat);const bg=new THREE.Mesh(new THREE.BoxGeometry(.5,.8,.3),new THREE.MeshBasicMaterial({color:L("#ffffff"),transparent:true,opacity:.6,depthWrite:false}));bg.position.y=.4;bat.add(bg);
  const bu=new THREE.Mesh(new THREE.BoxGeometry(.2,.08,.15),std("#1b2233"));bu.position.y=.84;bat.add(bu);const bd=new THREE.Mesh(new THREE.BoxGeometry(.42,1,.24),std("#19c46c",0,.5));bat.add(bd);
  const P={ana:{t:V3(.2,0,-.1),d:29,w:PI/2,p:1.2,ky:.07},yakin:{t:V3(GX+.1,.1,GZ),d:5,w:PI/2,p:1.1,ky:.09},ist:{t:V3(GX+.5,.1,GZ-.12),d:3.3,w:PI/2,p:1.15,ky:.05},
    kat:{t:V3(KX,3.7,0),d:22,w:PI/2,p:.05,ky:.03},pan:{t:V3(PX,1.4,0),d:9.5,w:PI/2-.2,p:.1,ky:.065},gece:{t:V3(GX+.8,.4,GZ-.3),d:8,w:PI/2,p:.85,ky:.1}};
  const MP={soru:"ana",tuketim:"kat",isin:"pan",verim:"pan",kayip:"pan",hesap:"yakin",istanbul:"ist",turkiye:"ana",gece:"gece",son:"ana"};
  const tq=cam(46);const poz=(m,u)=>{const k=MP[m]||"ana",A=P[k];orb(tq,A.t,A.d,A.w+(u||0)*.04,A.p);kaydir(tq,A.d*A.ky);return{p:tq.position.clone(),q:tq.quaternion.clone(),k}};
  return{sc,c,bl:[.8,.5,.8],kur(o){const t=o.t,mod=o.p.mod||"soru",u=o.pu;gn.ayar(t,1);
    // GES karesi
    let gk_=1;if(mod==="soru")gk_=.35+.15*Math.sin(t*3);else if(mod==="hesap")gk_=eob(sm(.1,.6,u));
    ges.scale.set(GK*Math.max(.001,gk_),GK*Math.max(.001,gk_),1);gc.scale.set(GK*gk_,1,GK*gk_);
    const genis=["soru","turkiye","son"].includes(mod);const gir=mod==="soru"||u>.38;hal.visible=(genis&&gir)||mod==="gece";hal.scale.setScalar(genis?1+.15*Math.sin(t*4):.6);hal.material.opacity=.8;
    gY.visible=mod!=="soru"&&mod!=="istanbul"&&(!genis||gir);const gb=genis?.55:mod==="hesap"?.2:.3;gY.scale.set(gY.scale.x/gY.scale.y*gb,gb,1);gY.position.set(GX,genis?.6:mod==="hesap"?.45:.6,GZ+(genis?-1.0:-.35));gY.material.opacity=mod==="hesap"?sm(.45,.65,u):mod==="son"?sm(.4,.6,u):1;hY.visible=genis&&(mod!=="son"||u>.4);
    ist.visible=mod==="istanbul";if(ist.visible){const k=eob(sm(.05,.4,u));ist.scale.set(1,1,1);ik.material.opacity=.75*k;ic_.ilerle(sm(.05,.4,u));q1.visible=q2.visible=u>.45}
    // takvim
    const kv=mod==="tuketim";gk.count=kv?Math.round(365*eio(sm(.08,.85,u))):0;kY.visible=kS.visible=kv;kS.set(gk.count+" GÜN");
    // panel yan alan
    const pv=["isin","verim","kayip"].includes(mod);isn.forEach((l,i)=>{l.visible=pv;l.material.dashOffset=-t*.4});
    const h1=mod==="isin"?SH*eo(sm(.2,.7,u)):SH;s1.visible=s1Y.visible=pv;s1.scale.y=Math.max(.001,h1);s1.position.set(SX1,h1/2,0);s1Y.position.set(SX1,h1+.3,0);s1Y.set(Math.round(1527*h1/SH).toLocaleString("tr-TR")+" kWh");
    const ev=mod==="verim"?eo(sm(.2,.6,u)):mod==="kayip"?1:0;const ef=.227*SH*ev*(mod==="kayip"?lerp(1,.8,eo(sm(.15,.5,u))):1);
    s2.visible=s2Y.visible=pv&&ev>0;s2.scale.y=Math.max(.001,ef);s2.position.set(SX2,ef/2,0);s2Y.position.set(SX2,.227*SH+.3,0);s2Y.set(mod==="kayip"&&u>.5?"277 kWh":Math.round(1527*ef/SH)+" kWh");
    s3.visible=mod==="kayip";const kh=.227*SH*.2*eo(sm(.15,.5,u));s3.scale.y=Math.max(.001,kh);s3.position.set(SX2,ef+kh/2,0);
    isiY.visible=mod==="verim";isiY.position.set(SX1,SH*.5,.5);isiY.material.opacity=sm(.5,.7,u);
    // gece
    const gv=mod==="gece";const gk2=gv?eio(sm(.05,.5,u)):0;ayS.visible=gv;ayS.position.set(GX+2.3,lerp(-1,.9,gk2),GZ-.6);
    bat.visible=gv&&u>.45;const bk=sm(.5,.9,u);bd.scale.y=Math.max(.001,.7*bk);bd.position.y=.06+.35*bk;bat.scale.setScalar(.001+eob(sm(.45,.6,u)));
    const on=o.pi>0?(o.pp[o.pi-1].mod||"soru"):mod;const A=poz(on,0),B=poz(mod,u);const k=A.k===B.k?1:(Math.abs(P[A.k].t.x-P[B.k].t.x)>12?1:eio(sm(0,.4,u)));
    c.position.lerpVectors(A.p,B.p,k);c.quaternion.slerpQuaternions(A.q,B.q,k)}}};

/* ================= NOTRON: nötron yıldızından bir şeker küpü kaç ton (≈ 1 milyar ton) ================= */
function sekerTex(){const c=document.createElement("canvas");c.width=c.height=128;const x=c.getContext("2d");x.fillStyle="#fbfbf8";x.fillRect(0,0,128,128);
  for(let i=0;i<700;i++){const v=200+Math.floor(rnd()*55);x.fillStyle=`rgb(${v},${v},${v-6})`;x.fillRect(rnd()*128,rnd()*128,2+rnd()*3,2+rnd()*3)}const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return t}
S.notron=()=>{const sc=new THREE.Scene();const c=cam(46);uzay(sc);
  sc.add(new THREE.AmbientLight(L("#5a6a88"),.85));const dl=new THREE.DirectionalLight(L("#ffffff"),1.3);dl.position.set(5,7,9);sc.add(dl);
  const NR=2.2;const nMat=()=>std("#9fd0ff",0,.35,{emissive:L("#3d8fd1"),emissiveIntensity:.3});
  // ana nötron yıldızı (dönme ekseni y; ışın ekseni eğik)
  const ns=new THREE.Group();sc.add(ns);const don=new THREE.Group();ns.add(don);don.add(new THREE.Mesh(new THREE.SphereGeometry(NR,64,48),nMat()));
  for(let i=0;i<6;i++){const a=i/6*PI;const ps=[];for(let j=0;j<=72;j++){const b=j/72*2*PI;ps.push(V3(Math.cos(b)*Math.cos(a)*NR*1.006,Math.sin(b)*NR*1.006,Math.cos(b)*Math.sin(a)*NR*1.006))}don.add(cizgi(ps,"#1580bd",.55))}
  const isn=new THREE.Group();isn.rotation.z=.42;don.add(isn);const isM=new THREE.MeshBasicMaterial({color:L("#f0a020"),transparent:true,opacity:.45,depthWrite:false,side:THREE.DoubleSide});
  [-1,1].forEach(s_=>{const k=new THREE.Mesh(new THREE.ConeGeometry(.6,2.6,24,1,true),isM);k.geometry.translate(0,-1.3,0);k.position.y=s_*(NR+.05);k.rotation.z=s_>0?PI:0;k.userData.kabuk=1;isn.add(k)});
  const nsY=yazi("NÖTRON YILDIZI",{boy:.62,renk:"#1580bd"});sc.add(nsY);
  // şeker küpü
  const kup=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({map:sekerTex(),roughness:.8}));sc.add(kup);
  const kY=dyazi({boy:.5,renk:"#e0452a",gen:20});sc.add(kY);
  // ölçü (20 km) + şehir silueti
  const ol=olcu(V3(-NR,-NR-.55,0),V3(NR,-NR-.55,0),"≈ 20 km","#de8400",{boy:.55,yer:V3(0,-.45,0)});sc.add(ol);
  const seh=new THREE.Group();sc.add(seh);for(let i=0;i<16;i++){const h=.35+rnd()*1.1;const b=new THREE.Mesh(new THREE.BoxGeometry(.24,h,.3),std(i%3?"#c9ccd3":"#9aa3b5",0,.6));b.position.set(-NR+.14+i*(2*NR-.28)/15,h/2,0);seh.add(b)}
  const sY=yazi("BİR ŞEHİR KADAR",{boy:.5,renk:"#16213a"});sc.add(sY);
  // Güneş (sıkışma)
  const gn=gunes(1);sc.add(gn);const gY=yazi("GÜNEŞ",{boy:.6,renk:"#de8400"});sc.add(gY);
  // terazi
  const tz=new THREE.Group();tz.position.set(0,-1.2,0);sc.add(tz);const ay_=new THREE.Mesh(new THREE.ConeGeometry(.55,2.0,4),std("#c9ccd3",.2,.6));ay_.position.y=-1.0;tz.add(ay_);
  const kol=new THREE.Group();tz.add(kol);kol.add(new THREE.Mesh(new THREE.BoxGeometry(6.8,.12,.3),std("#1b2233",.3,.5)));
  const tb=[-1,1].map(s_=>{const d=new THREE.Mesh(new THREE.CylinderGeometry(.75,.75,.08,28),std("#9aa3b5",.4,.4));d.position.set(s_*3.1,.1,0);kol.add(d);return d});
  const miniN=new THREE.Mesh(new THREE.SphereGeometry(.32,32,24),nMat());sc.add(miniN);const gn2=gunes(1.15);sc.add(gn2);
  const dag=new THREE.Group();sc.add(dag);const dg=new THREE.Mesh(new THREE.ConeGeometry(1.25,1.9,7),std("#8a7f72",0,.8));dg.position.y=.95;dag.add(dg);const kar=new THREE.Mesh(new THREE.ConeGeometry(.5,.76,7),std("#ffffff",0,.6));kar.position.y=1.52;dag.add(kar);
  const kal=new THREE.Group();sc.add(kal);const kM=std("#1580bd",0,.6);const dm=new THREE.Object3D();const kis=new THREE.InstancedMesh(new THREE.CylinderGeometry(.05,.05,.24,8),kM,64);
  const kb=new THREE.InstancedMesh(new THREE.SphereGeometry(.055,10,8),std("#f2c46b",0,.6),64);for(let i=0;i<64;i++){const x=(i%8-3.5)*.17,z=(Math.floor(i/8)-3.5)*.17,y=Math.floor(i/16)*.0;dm.position.set(x,.13+y,z);dm.updateMatrix();kis.setMatrixAt(i,dm.matrix);dm.position.set(x,.32+y,z);dm.updateMatrix();kb.setMatrixAt(i,dm.matrix)}kal.add(kis,kb);
  const lY=dyazi({boy:.42,renk:"#16213a",gen:14}),rY=dyazi({boy:.42,renk:"#16213a",gen:14});sc.add(lY,rY);
  // atom (içi boş) vs nötron yığını (boşluksuz)
  const atom=new THREE.Group();atom.position.set(-2.25,0,0);sc.add(atom);atom.add(new THREE.Mesh(new THREE.SphereGeometry(.13,16,12),std("#e0452a",0,.5)));
  const el=[];for(let i=0;i<3;i++){const r=new THREE.Group();r.rotation.set(i*1.05,i*.6,0);atom.add(r);const ps=[];for(let j=0;j<=64;j++){const b=j/64*2*PI;ps.push(V3(Math.cos(b)*1.15,Math.sin(b)*.45,0))}r.add(cizgi(ps,"#1580bd",.8));const e=new THREE.Mesh(new THREE.SphereGeometry(.07,10,8),std("#1580bd",0,.5));r.add(e);el.push(e)}
  const aY=yazi("ATOM: İÇİ BOŞ",{boy:.4,renk:"#16213a"});aY.position.set(-2.25,1.75,0);sc.add(aY);
  const yp=[];const sp=.25;for(let x=-5;x<=5;x++)for(let y=-5;y<=5;y++)for(let z=-5;z<=5;z++){const p=V3(x*sp,y*sp,z*sp);if(p.length()<1.15)yp.push(p)}yp.sort((a,b)=>a.y-b.y);
  const yg=new THREE.InstancedMesh(new THREE.SphereGeometry(.13,10,8),std("#9fd0ff",0,.4),yp.length);yp.forEach((p,i)=>{dm.position.copy(p).add(V3(2.25,0,0));dm.updateMatrix();yg.setMatrixAt(i,dm.matrix)});yg.count=0;sc.add(yg);
  const nY=yazi("NÖTRONLAR: BOŞLUK YOK",{boy:.4,renk:"#1580bd"});nY.position.set(2.25,1.75,0);sc.add(nY);
  const P={ana:{t:V3(0,0,0),d:16,w:PI/2,p:.1,ky:.1},cap:{t:V3(0,-.9,0),d:17.5,w:PI/2,p:.08,ky:.1},tz:{t:V3(0,-.4,0),d:19.5,w:PI/2,p:.12,ky:.1},atom:{t:V3(0,.1,0),d:16.5,w:PI/2,p:.1,ky:.1},kup:{t:V3(0,.4,0),d:14.5,w:PI/2,p:.1,ky:.1}};
  const MP={soru:"ana",kutle:"tz",cap:"cap",sikis:"ana",atom:"atom",kup:"kup",dag:"tz",insan:"tz",donus:"ana",son:"kup"};
  const tq=cam(46);const poz=(m,u)=>{const k=MP[m]||"ana",A=P[k];orb(tq,A.t,A.d,A.w+(u||0)*.06,A.p);kaydir(tq,A.d*A.ky);return{p:tq.position.clone(),q:tq.quaternion.clone(),k}};
  const ton=k=>Math.round(1e9*k).toLocaleString("tr-TR")+" TON";
  return{sc,c,bl:[.8,.5,.78],kur(o){const t=o.t,mod=o.p.mod||"soru",u=o.pu;const on=o.pi>0?(o.pp[o.pi-1].mod||"soru"):"";const gir=on===mod?1:eob(sm(0,.3,u));
    // ana yıldız
    const nsv=mod==="soru"||mod==="cap"||mod==="sikis"||mod==="donus"||mod==="kup"||mod==="son";ns.visible=nsv;
    let nsS=1,nsP=V3(0,0,0);if(mod==="sikis")nsS=eob(sm(.55,.85,u));if(mod==="kup"||mod==="son"){nsS=.42;nsP=V3(-2.3,2.5,-2.5)}
    ns.scale.setScalar(Math.max(.001,nsS));ns.position.copy(nsP);don.rotation.y=mod==="donus"?t*lerp(.6,9,sm(.05,.4,u)):t*.35;isn.visible=mod==="donus";isM.opacity=.45*sm(.05,.3,u);
    nsY.visible=nsv&&(mod==="soru"||mod==="cap");nsY.position.set(nsP.x,nsP.y+(NR+.75)*nsS,nsP.z);nsY.scale.set(nsY.scale.x/nsY.scale.y*.62*(mod==="kup"||mod==="son"?.8:1),.62*(mod==="kup"||mod==="son"?.8:1),1);
    // şeker küpü
    const kv=mod==="soru"||mod==="kup"||mod==="son";kup.visible=kY.visible=kv;
    if(mod==="soru"){kup.position.set(2.6,-2.6,1.2);kup.scale.setScalar(.7*eob(sm(.3,.55,u)));kY.set("? TON");kY.position.set(2.6,-1.75,1.2)}
    else if(kv){const k=mod==="kup"?eio(sm(.05,.4,u)):1;kup.position.lerpVectors(nsP,V3(0,-.2,0),k);kup.scale.setScalar(lerp(.2,1.5,k));kY.position.set(.6,1.35,.5);kY.set(mod==="kup"?ton(eo(sm(.35,.9,u))):"≈ 1 MİLYAR TON")}
    kup.rotation.set(.35,t*.4+.6,.12);
    // ölçü + şehir
    const cv=mod==="cap";ol.visible=seh.visible=sY.visible=cv;ol.ilerle(cv?sm(.05,.5,u):0);seh.position.set(0,-NR-3.15,0);seh.scale.y=Math.max(.001,cv?eob(sm(.4,.7,u)):0);sY.position.set(0,-NR-3.65,.4);sY.material.opacity=cv?sm(.6,.75,u):0;
    // Güneş sıkışır
    const gv=mod==="sikis";gn.visible=gY.visible=gv;if(gv){const k=eio(sm(.08,.6,u));gn.scale.setScalar(lerp(2.3,.01,k));gn.ayar(t,1);gY.position.set(0,lerp(2.3*1.55,.2,k),0);gY.material.opacity=1-sm(.3,.5,u)}
    // terazi
    const tv=mod==="kutle"||mod==="dag"||mod==="insan";tz.visible=lY.visible=rY.visible=tv;tz.scale.setScalar(Math.max(.001,on&&MP[on]==="tz"?1:gir));
    const egim=mod==="kutle"?-.16*eio(sm(.3,.7,u)):(mod==="dag"||mod==="insan")?.12*Math.sin(t*3)*Math.max(0,1-sm(.1,.6,u)):0;kol.rotation.z=egim;
    const uc=s_=>{const x=s_*3.1;return V3(x*Math.cos(egim),-1.2+x*Math.sin(egim)+.16,0)};const L_=uc(-1),R_=uc(1);
    gn2.visible=miniN.visible=mod==="kutle";dag.visible=mod==="dag";kal.visible=mod==="insan";kup.visible=kup.visible||mod==="dag"||mod==="insan";
    if(mod==="kutle"){gn2.position.copy(L_).add(V3(0,1.15,0));gn2.ayar(t,1);miniN.position.copy(R_).add(V3(0,.32,0));lY.set("GÜNEŞ");rY.set("NÖTRON Y.");lY.position.copy(L_).add(V3(0,2.85,0));rY.position.copy(R_).add(V3(0,1.1,0))}
    if(mod==="dag"||mod==="insan"){kup.position.copy(L_).add(V3(0,.3,0));kup.scale.setScalar(.55);kY.visible=false;lY.set("ŞEKER KÜPÜ");lY.position.copy(L_).add(V3(0,1.1,0));
      if(mod==="dag"){dag.position.copy(R_);dag.scale.setScalar(Math.max(.001,eob(sm(.1,.35,u))));rY.set("BİR DAĞ")}else{kal.position.copy(R_);kal.scale.setScalar(Math.max(.001,eob(sm(.1,.35,u))));rY.set("TÜM İNSANLAR")}rY.position.copy(R_).add(V3(0,2.4,0))}
    // atom vs yığın
    const av=mod==="atom";atom.visible=aY.visible=nY.visible=av;el.forEach((e,i)=>{const b=t*2.2+i*2.1;e.position.set(Math.cos(b)*1.15,Math.sin(b)*.45,0)});atom.scale.setScalar(Math.max(.001,av?gir:0));
    yg.count=av?Math.round(yp.length*eio(sm(.35,.85,u))):0;nY.material.opacity=av?sm(.35,.5,u):0;
    const A=poz(on||mod,0),B=poz(mod,u);const k=eio(sm(0,.35,u));c.position.lerpVectors(A.p,B.p,k);c.quaternion.slerpQuaternions(A.q,B.q,k)}}};

/* ================= KAYNAT: 1 litre suyu kaynatmak kaç Wh, kaç telefon ================= */
S.kaynat=()=>{const sc=new THREE.Scene();const c=cam(46);studyo(sc);isik(sc,"#ffffff",2.3,"#6FE3FF",1.4);
  // cam su ısıtıcısı
  const ks=new THREE.Group();sc.add(ks);const KR=.62,KH=1.55;
  const tab=new THREE.Mesh(new THREE.CylinderGeometry(KR+.12,KR+.16,.18,32),std("#1b2233",.3,.5));tab.position.y=.09;ks.add(tab);
  const alt_=new THREE.Mesh(new THREE.CylinderGeometry(KR+.02,KR+.05,.16,32),std("#eef1f6",.3,.4));alt_.position.y=.26;ks.add(alt_);
  const cm=new THREE.Mesh(new THREE.CylinderGeometry(KR*.92,KR,KH,32,1,true),new THREE.MeshBasicMaterial({color:L("#ffffff"),transparent:true,opacity:.22,depthWrite:false,side:THREE.DoubleSide}));cm.position.y=.34+KH/2;ks.add(cm);
  const kp=new THREE.Mesh(new THREE.CylinderGeometry(KR*.95,KR*.92,.14,32),std("#eef1f6",.3,.4));kp.position.y=.34+KH+.07;ks.add(kp);const tut=new THREE.Mesh(new THREE.SphereGeometry(.09,12,8),std("#1b2233"));tut.position.y=.34+KH+.18;ks.add(tut);
  const sap=new THREE.Mesh(new THREE.TorusGeometry(.5,.07,10,24,PI),std("#1b2233",.2,.5));sap.position.set(-KR-.05,.34+KH/2+.05,0);sap.rotation.z=PI/2;ks.add(sap);
  const ag=new THREE.Mesh(new THREE.ConeGeometry(.16,.4,16,1,true),std("#eef1f6",.3,.4,{side:THREE.DoubleSide}));ag.position.set(KR+.08,.34+KH-.12,0);ag.rotation.z=-PI/2-.5;ks.add(ag);
  const suM=new THREE.MeshBasicMaterial({color:L("#6fb6e8"),transparent:true,opacity:.62,depthWrite:false});const su=new THREE.Mesh(new THREE.CylinderGeometry(KR*.9,KR*.97,1,32),suM);su.userData.kabuk=1;ks.add(su);
  const sut=cizgi(Array.from({length:49},(_,i)=>{const a=i/48*2*PI;return V3(Math.cos(a)*KR*.93,0,Math.sin(a)*KR*.93)}),"#1580bd",1);ks.add(sut);
  const kab=[];for(let i=0;i<24;i++){const b=new THREE.Mesh(new THREE.SphereGeometry(.035+rnd()*.03,8,6),new THREE.MeshBasicMaterial({color:L("#ffffff"),transparent:true,opacity:.9,depthWrite:false}));b.userData.kabuk=1;b.userData.f=[rnd()*2*PI,rnd()*.45,rnd()];ks.add(b);kab.push(b)}
  const buh=[];for(let i=0;i<10;i++){const b=new THREE.Mesh(new THREE.SphereGeometry(.14,12,8),new THREE.MeshBasicMaterial({color:L("#c9ccd3"),transparent:true,opacity:.5,depthWrite:false}));b.userData.kabuk=1;sc.add(b);buh.push(b)}
  const lY=yazi("1 LİTRE SU",{boy:.3,renk:"#1580bd"});lY.position.set(0,2.3,0);sc.add(lY);
  // termometre
  const TX=-1.45,TH=2.2;const tc=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,TH,16),new THREE.MeshBasicMaterial({color:L("#ffffff"),transparent:true,opacity:.5,depthWrite:false}));tc.position.set(TX,.35+TH/2,0);sc.add(tc);
  const tk=new THREE.Mesh(new THREE.SphereGeometry(.2,16,12),std("#e0452a",0,.5));tk.position.set(TX,.25,0);sc.add(tk);
  const td=new THREE.Mesh(new THREE.CylinderGeometry(.075,.075,1,12),std("#e0452a",0,.5));sc.add(td);const tS=dyazi({boy:.34,renk:"#e0452a",gen:7});tS.position.set(TX,.35+TH+.35,0);sc.add(tS);
  [15,100].forEach(v=>{const y=.35+TH*v/105;const l=cizgi([V3(TX+.14,y,0),V3(TX+.3,y,0)],"#16213a",1);sc.add(l)});
  // enerji sayacı + Wh sütunu
  const jS=dyazi({boy:.36,renk:"#de8400",gen:14});jS.position.set(0,3.05,0);sc.add(jS);
  const WX=1.45,WH=2.2;const wc=new THREE.Mesh(new THREE.BoxGeometry(.55,WH+.06,.4),new THREE.MeshBasicMaterial({color:L("#ffffff"),transparent:true,opacity:.5,depthWrite:false}));wc.position.set(WX,.35+WH/2,0);sc.add(wc);
  const wd=new THREE.Mesh(new THREE.BoxGeometry(.47,1,.32),std("#19c46c",0,.5));sc.add(wd);const wS=dyazi({boy:.34,renk:"#13a35a",gen:7});wS.position.set(WX,.35+WH+.35,0);sc.add(wS);
  // ısı kaybı dalgaları
  const dal=[];for(let i=0;i<6;i++){const l=cizgi(Array.from({length:20},()=>V3(0,0,0)),"#e0452a",.8);sc.add(l);dal.push(l)}
  // yan alan: 5 telefon (x=12)
  const PX=12;const tel=[];for(let i=0;i<5;i++){const et=ekranTex();const p=telefon({tex:et});p.position.set(PX+(i-2)*.95,1.2,0);sc.add(p);tel.push(p)}
  const pY=dyazi({boy:.42,renk:"#13a35a",gen:10});pY.position.set(PX,2.45,0);sc.add(pY);
  // yan alan: kronometre (x=-12)
  const CX=-12;const kr=new THREE.Group();kr.position.set(CX,1.5,0);sc.add(kr);kr.add(new THREE.Mesh(new THREE.CircleGeometry(1.0,64),bas("#ffffff")));
  const kc=[];for(let i=0;i<=96;i++){const a=i/96*2*PI;kc.push(V3(Math.cos(a),Math.sin(a),.01))}kr.add(cizgi(kc,"#16213a",1));
  for(let i=0;i<4;i++){const a=PI/2-i/4*2*PI;kr.add(cizgi([V3(Math.cos(a)*.8,Math.sin(a)*.8,.02),V3(Math.cos(a)*.95,Math.sin(a)*.95,.02)],"#16213a",1))}
  const kdol=new THREE.Mesh(new THREE.CircleGeometry(.84,64,PI/2,.001),bas("#f0a020",{transparent:true,opacity:.7}));kdol.position.z=.015;kr.add(kdol);
  const kib=new THREE.Mesh(new THREE.BoxGeometry(.05,.8,.02),bas("#e0452a"));kib.geometry.translate(0,.4,0);kib.position.z=.03;kr.add(kib);const kbt=new THREE.Mesh(new THREE.BoxGeometry(.24,.18,.1),std("#1b2233"));kbt.position.set(0,1.1,0);kr.add(kbt);
  const krS=dyazi({boy:.42,renk:"#e0452a",gen:8});krS.position.set(CX,.05,.2);sc.add(krS);const krY=yazi("4 DAKİKALIK KADRAN",{boy:.22,renk:"#16213a"});krY.position.set(CX,-.45,.2);sc.add(krY);
  const P={ana:{t:V3(0,1.45,0),d:11,w:PI/2-.08,p:.14,ky:.1},yak:{t:V3(0,1.3,0),d:9.8,w:PI/2-.2,p:.18,ky:.1},tel:{t:V3(PX,1.35,0),d:12,w:PI/2,p:.08,ky:.1},kr:{t:V3(CX,1.2,0),d:8.4,w:PI/2,p:.06,ky:.1}};
  const MP={soru:"ana",isi:"yak",fark:"ana",hesap:"ana",wh:"ana",telefon:"tel",sure:"kr",kayip:"yak",ipucu:"ana",son:"ana"};
  const tq=cam(46);const poz=(m,u)=>{const k=MP[m]||"ana",A=P[k];orb(tq,A.t,A.d,A.w+(u||0)*.05,A.p);kaydir(tq,A.d*A.ky);return{p:tq.position.clone(),q:tq.quaternion.clone(),k}};
  const f0=v=>v.toLocaleString("tr-TR");
  return{sc,c,bl:[.8,.5,.78],kur(o){const t=o.t,mod=o.p.mod||"soru",u=o.pu;
    // sıcaklık (°C)
    let T=15;if(mod==="fark")T=lerp(15,100,eio(sm(.3,.85,u)));else if(["hesap","wh","kayip","son","telefon","sure"].includes(mod))T=100;else if(mod==="ipucu")T=lerp(15,100,eio(sm(.45,.9,u)));
    const kay=T>=99;td.scale.y=Math.max(.001,TH*T/105);td.position.set(TX,.35+TH*T/105/2,0);tS.set(Math.round(T)+" °C");
    // su seviyesi (1 L → ipucunda ½ L)
    const sv=mod==="ipucu"?lerp(1,.5,eio(sm(.05,.4,u))):1;const sh_=KH*.78*sv;su.scale.y=sh_;su.position.y=.36+sh_/2;sut.position.y=.36+sh_+.002;
    suM.color=L("#6fb6e8").lerp(L("#f0a020"),.35*(T-15)/85);lY.material.opacity=mod==="ipucu"?0:1;
    kab.forEach(b=>{const[a,r,f]=b.userData.f;const y=((t*.9+f)%1);b.visible=kay;b.position.set(Math.cos(a)*r,.4+y*sh_,Math.sin(a)*r)});
    buh.forEach((b,i)=>{const q=((t*.35+i/buh.length)%1);b.visible=kay;b.position.set(KR+.3+q*.9+Math.sin(t+i)*.1,.34+KH-.1+q*1.4,0);b.scale.setScalar(.6+q*1.6);b.material.opacity=.5*(1-q)});
    // jul sayacı
    const jv=false;jS.visible=jv;if(mod==="isi")jS.set(f0(Math.round(4184*eo(sm(.15,.5,u))))+" J / °C");if(mod==="hesap")jS.set(f0(Math.round(355640*eo(sm(.2,.75,u))))+" J");
    // Wh sütunu
    const wv=mod==="wh"||mod==="ipucu"||mod==="son";wc.visible=wd.visible=wS.visible=wv;let wk=mod==="wh"?eio(sm(.15,.7,u)):1;let wh=99*wk;if(mod==="ipucu"){wh=lerp(99,49.5,eio(sm(.05,.4,u)));wk=wh/99}
    wd.scale.y=Math.max(.001,WH*wk);wd.position.set(WX,.35+WH*wk/2,0);wS.set(Math.round(wh)+" Wh");
    // kayıp dalgaları
    const dv=mod==="kayip";dal.forEach((l,j)=>{l.visible=dv;if(!dv)return;const s_=j%2?1:-1,y0=.6+Math.floor(j/2)*.45;const ps=[];for(let q=0;q<20;q++){const v=q/19;ps.push(V3(s_*(KR+.15+v*.9),y0+Math.sin(v*9-t*4+j)*.06,0))}l.geometry.setFromPoints(ps);l.material.opacity=.8*sm(.1,.35,u)});
    // telefonlar
    const tk_=mod==="telefon"?eio(sm(.1,.85,u))*5:5;tel.forEach((p,i)=>{p.rotation.y=Math.sin(t*.6+i)*.15;p.ekran.ciz(cl(tk_-i),undefined)});pY.set(Math.min(5,Math.floor(tk_+.001))+" TELEFON");
    // kronometre (178 sn)
    const kk=mod==="sure"?eio(sm(.1,.8,u)):1;const fr=178*kk/240;kib.rotation.z=-fr*2*PI;kdol.geometry.dispose();kdol.geometry=new THREE.CircleGeometry(.84,64,PI/2-fr*2*PI,Math.max(.001,fr*2*PI));krS.set(Math.round(178*kk)+" SN");
    const on=o.pi>0?(o.pp[o.pi-1].mod||"soru"):mod;const A=poz(on,0),B=poz(mod,u);const k=A.k!==B.k&&Math.abs(P[A.k].t.x-P[B.k].t.x)>5?1:eio(sm(0,.35,u));
    c.position.lerpVectors(A.p,B.p,k);c.quaternion.slerpQuaternions(A.q,B.q,k)}}};

/* ================= KAÇIŞ: kara delikten kaçmak için ne kadar hız ================= */
function roket(){const g=new THREE.Group();const gv=new THREE.Mesh(new THREE.CylinderGeometry(.13,.13,.62,20),std("#eef1f6",.2,.4));g.add(gv);
  const bur=new THREE.Mesh(new THREE.ConeGeometry(.13,.3,20),std("#e0452a",0,.5));bur.position.y=.46;g.add(bur);
  const pen=new THREE.Mesh(new THREE.CircleGeometry(.055,16),bas("#1580bd"));pen.position.set(0,.12,.131);g.add(pen);
  for(let i=0;i<3;i++){const k=new THREE.Mesh(new THREE.BoxGeometry(.02,.2,.16),std("#1b2233",.2,.5));const a=i/3*2*PI;k.position.set(Math.cos(a)*.15,-.24,Math.sin(a)*.15);k.rotation.y=-a;g.add(k)}
  const al=new THREE.Mesh(new THREE.ConeGeometry(.1,.42,16),new THREE.MeshBasicMaterial({color:L("#f0a020"),transparent:true,opacity:.9,depthWrite:false}));al.rotation.z=PI;al.position.y=-.52;al.userData.kabuk=1;g.add(al);g.alev=al;return g}
function diskTex(){const c=document.createElement("canvas");c.width=c.height=256;const x=c.getContext("2d");const g=x.createRadialGradient(128,128,40,128,128,128);
  g.addColorStop(0,"rgba(255,240,180,1)");g.addColorStop(.45,"rgba(255,180,60,1)");g.addColorStop(.75,"rgba(230,110,30,.75)");g.addColorStop(1,"rgba(200,80,20,0)");x.fillStyle=g;x.fillRect(0,0,256,256);
  x.globalCompositeOperation="destination-out";for(let i=0;i<14;i++){x.beginPath();x.arc(128,128,50+i*5.5,i*.9,i*.9+2.2);x.lineWidth=1.4;x.strokeStyle="rgba(0,0,0,.45)";x.stroke()}
  const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return t}
S.kacis=()=>{const sc=new THREE.Scene();const c=cam(46);uzay(sc);
  sc.add(new THREE.AmbientLight(L("#5a6a88"),.9));const dl=new THREE.DirectionalLight(L("#ffffff"),1.4);dl.position.set(5,7,9);sc.add(dl);
  const EX=16,SX=-16,KX=32;
  // kara delik
  const kd=new THREE.Group();sc.add(kd);const KR=1.25;kd.add(new THREE.Mesh(new THREE.SphereGeometry(KR,64,48),new THREE.MeshBasicMaterial({color:L("#0b0d12")})));
  const dg=new THREE.Group();dg.rotation.x=PI/2-.32;kd.add(dg);const dk=new THREE.Mesh(new THREE.RingGeometry(KR*1.35,KR*3.1,128,2),new THREE.MeshBasicMaterial({map:diskTex(),transparent:true,depthWrite:false,side:THREE.DoubleSide}));dg.add(dk);
  const uf=new THREE.Group();uf.userData.bb=1;kd.add(uf);const up=[];for(let i=0;i<=128;i++){const a=i/128*2*PI;up.push(V3(Math.cos(a)*KR*1.12,Math.sin(a)*KR*1.12,0))}const ufc=cizgi(up,"#e0452a",1,.12);uf.add(ufc);
  const ufY=yazi("OLAY UFKU",{boy:.42,renk:"#e0452a"});sc.add(ufY);
  const kdY=yazi("KARA DELİK",{boy:.5,renk:"#16213a"});sc.add(kdY);
  // ışık parçacıkları (ufuk)
  const fo=[];for(let i=0;i<12;i++){const s=new THREE.Mesh(new THREE.SphereGeometry(.07,10,8),bas(i<8?"#de8400":"#13a35a"));s.userData.f=[i/12*2*PI+rnd()*.3,rnd()];sc.add(s);fo.push(s)}
  // roket
  const rk=roket();sc.add(rk);const iz=cizgi(Array.from({length:60},()=>V3(0,0,0)),"#1580bd",.8,.08);sc.add(iz);
  const hS=dyazi({boy:.5,renk:"#e0452a",gen:12});sc.add(hS);
  // Dünya
  const e=dunya(1.2);e.position.set(EX,0,0);sc.add(e);const eY=yazi("DÜNYA",{boy:.45,renk:"#1580bd"});sc.add(eY);
  const mis=new THREE.Group();sc.add(mis);mis.add(new THREE.Mesh(new THREE.SphereGeometry(.3,32,24),new THREE.MeshBasicMaterial({color:L("#9fd8ff"),transparent:true,opacity:.55,depthWrite:false})));
  const mic=new THREE.Mesh(new THREE.TorusGeometry(.13,.05,8,24),bas("#e0452a"));mic.rotation.x=.8;mis.add(mic);const misY=yazi("MİSKET",{boy:.3,renk:"#16213a"});sc.add(misY);
  const kE=new THREE.Mesh(new THREE.SphereGeometry(.3,32,24),new THREE.MeshBasicMaterial({color:L("#0b0d12")}));sc.add(kE);const kEY=dyazi({boy:.3,renk:"#16213a",gen:14});sc.add(kEY);
  // ışık turu
  const tp=[];for(let i=0;i<=128;i++){const a=i/128*2*PI;tp.push(V3(EX+Math.cos(a)*1.55,0,Math.sin(a)*1.55))}const tc=cizgi(tp,"#de8400",.7,.1);sc.add(tc);
  const ft=new THREE.Mesh(new THREE.SphereGeometry(.12,12,8),bas("#f0a020"));sc.add(ft);const fiz=[];for(let i=0;i<10;i++){const s=new THREE.Mesh(new THREE.SphereGeometry(.1-i*.008,8,6),new THREE.MeshBasicMaterial({color:L("#f0a020"),transparent:true,opacity:.6-i*.05,depthWrite:false}));s.userData.kabuk=1;sc.add(s);fiz.push(s)}
  const tS=dyazi({boy:.48,renk:"#de8400",gen:12});sc.add(tS);
  // Güneş
  const gn=gunes(2);gn.position.set(SX,0,0);sc.add(gn);const gY=yazi("GÜNEŞ",{boy:.5,renk:"#de8400"});sc.add(gY);
  const kS=new THREE.Mesh(new THREE.SphereGeometry(.22,32,24),new THREE.MeshBasicMaterial({color:L("#0b0d12")}));kS.position.set(SX,0,0);sc.add(kS);const rS=dyazi({boy:.45,renk:"#16213a",gen:16});sc.add(rS);
  // kat: sütunlar
  const CH=2.4;const s1=new THREE.Mesh(new THREE.BoxGeometry(.7,1,.4),std("#1580bd",0,.5));const s2=new THREE.Mesh(new THREE.BoxGeometry(.7,1,.4),std("#f0a020",0,.5));sc.add(s1,s2);
  const zm=new THREE.Mesh(new THREE.BoxGeometry(3.6,.05,.6),std("#1b2233",.2,.5));zm.position.set(KX,-1.62,0);sc.add(zm);
  const c1=yazi("DÜNYA'DAN KAÇIŞ",{boy:.26,renk:"#1580bd"}),c2=yazi("IŞIK HIZI",{boy:.3,renk:"#de8400"});sc.add(c1,c2);const v1=yazi("11,2 km/s",{boy:.3,renk:"#1580bd"}),v2=dyazi({boy:.36,renk:"#de8400",gen:12});sc.add(v1,v2);
  const P={kd:{t:V3(0,.2,0),d:15,w:PI/2,p:.2,ky:.11},kdy:{t:V3(0,.2,0),d:14,w:PI/2-.1,p:.28,ky:.11},e:{t:V3(EX,.3,0),d:12.5,w:PI/2,p:.1,ky:.1},ey:{t:V3(EX,.2,0),d:6.5,w:PI/2,p:.2,ky:.1},ei:{t:V3(EX,.3,0),d:12.5,w:PI/2,p:.25,ky:.11},
    s:{t:V3(SX,.2,0),d:19,w:PI/2,p:.1,ky:.1},k:{t:V3(KX,-.4,0),d:11.5,w:PI/2,p:.06,ky:.11}};
  const MP={soru:"kd",dunya:"e",gunes:"s",sikis:"s",misket:"ey",isik:"ei",ufuk:"kdy",kat:"k",son:"kd"};
  const tq=cam(46);const poz=(m,u)=>{const k=MP[m]||"kd",A=P[k];orb(tq,A.t,A.d,A.w+(u||0)*.06,A.p);kaydir(tq,A.d*A.ky);return{p:tq.position.clone(),q:tq.quaternion.clone(),k}};
  const izYol=(f,n)=>{const ps=[];for(let i=0;i<60;i++)ps.push(f(i/59*n));iz.geometry.setFromPoints(ps)};
  const rkYon=(p,q)=>{const d=q.clone().sub(p);if(d.lengthSq()<1e-6)return;rk.quaternion.setFromUnitVectors(V3(0,1,0),d.normalize())};
  return{sc,c,bl:[.8,.5,.78],kur(o){const t=o.t,mod=o.p.mod||"soru",u=o.pu;
    const kdv=mod==="soru"||mod==="ufuk"||mod==="son";kd.visible=kdv;dk.rotation.z=-t*.35;kdY.visible=false;kdY.position.set(0,KR*3.05,0);
    uf.visible=ufY.visible=mod==="ufuk"||mod==="son";ufc.material.opacity=mod==="ufuk"?sm(.05,.3,u):.8;ufY.position.set(0,-KR-.75,1.2);ufY.material.opacity=mod==="ufuk"?sm(.15,.35,u):1;
    fo.forEach((s,i)=>{s.visible=mod==="ufuk";if(!s.visible)return;const[a,ph]=s.userData.f;const q=(t*.35+ph)%1;if(i<8){const r=lerp(3.6,KR*.6,q);const b=a+q*2.2;s.position.set(Math.cos(b)*r,Math.sin(b)*r*.8,.6);s.scale.setScalar(r<KR?.001:1)}else{const r=lerp(KR*1.3,4.2,q);s.position.set(Math.cos(a)*r,Math.sin(a)*r*.8,.6);s.scale.setScalar(1-q*.5)}});
    // roket
    rk.visible=iz.visible=hS.visible=mod==="soru"||mod==="dunya"||mod==="gunes"||mod==="son";rk.alev.scale.setScalar(.8+Math.sin(t*40)*.2);
    if(mod==="soru"){const p0=V3(2.2,1.9,.8);rk.position.copy(p0).add(V3(Math.sin(t*1.3)*.05,Math.sin(t*2)*.08,0));rk.quaternion.setFromUnitVectors(V3(0,1,0),V3(.55,.83,0).normalize());rk.scale.setScalar(1.2);iz.visible=false;hS.visible=false}
    else if(mod==="dunya"){const f=q=>{const a=lerp(.0,.95,q);const r=1.25+q*q*2.9;return V3(EX+Math.sin(a)*r,Math.cos(a)*r,0)};const k=eio(sm(.08,.9,u));rk.position.copy(f(k));rkYon(f(Math.max(0,k-.01)),f(k+.01));rk.scale.setScalar(.9);izYol(f,k);
      hS.set((11.2*eo(sm(.08,.75,u))).toLocaleString("tr-TR",{minimumFractionDigits:1,maximumFractionDigits:1})+" km/s");hS.position.set(EX-1.4,2.0,0)}
    else if(mod==="gunes"){const f=q=>{const a=lerp(-.25,.6,q);const r=2.2+q*q*2.0;return V3(SX+Math.sin(a)*r,Math.cos(a)*r,0)};const k=eio(sm(.08,.9,u));rk.position.copy(f(k));rkYon(f(Math.max(0,k-.01)),f(k+.01));rk.scale.setScalar(1.1);izYol(f,k);
      hS.set(Math.round(617*eo(sm(.08,.75,u)))+" km/s");hS.position.set(SX-3.2,3.0,0)}
    else if(mod==="son"){const k=eio(sm(.1,.95,u));const p=V3(lerp(2.4,KR*.8,k),lerp(2.0,.3,k),.8);rk.position.copy(p);rk.quaternion.setFromUnitVectors(V3(0,1,0),V3(.55,.83,0).normalize());rk.scale.setScalar(Math.max(.001,lerp(1.2,.2,sm(.5,1,u))));iz.visible=false;hS.set("> 299.792 km/s");hS.position.set(0,2.0,.5);}
    iz.material.opacity=.8;
    // Dünya
    const ev=mod==="dunya"||mod==="misket"||mod==="isik";e.visible=ev;e.ayar(t,{rot:1.2});let es=1;if(mod==="misket")es=lerp(1,.25,eio(sm(.08,.45,u)));e.scale.setScalar(es);e.visible=ev&&!(mod==="misket"&&u>.45);
    eY.visible=mod==="dunya";eY.position.set(EX-1.9,-.9,0);
    const mv=mod==="misket";mis.visible=misY.visible=kE.visible=kEY.visible=mv;if(mv){const k=sm(.45,.6,u);kE.position.set(EX-.55,0,0);kE.scale.setScalar(Math.max(.001,eob(k)));mis.position.set(EX+.55,0,0);mis.scale.setScalar(Math.max(.001,eob(sm(.55,.75,u))));mic.rotation.y=t*.8;
      misY.position.set(EX+.55,-.65,0);misY.material.opacity=sm(.6,.75,u);kEY.position.set(EX,.85,0);kEY.set(u<.45?"":"DÜNYA: 9 mm");kEY.material.opacity=k}
    const iv=mod==="isik";tc.visible=ft.visible=tS.visible=iv;fiz.forEach(s=>s.visible=iv);if(iv){const tur=7.5*eio(sm(.08,.9,u));const a=tur*2*PI;ft.position.set(EX+Math.cos(a)*1.55,0,Math.sin(a)*1.55);
      fiz.forEach((s,i)=>{const b=a-(i+1)*.12;s.position.set(EX+Math.cos(b)*1.55,0,Math.sin(b)*1.55)});tS.set(tur.toLocaleString("tr-TR",{minimumFractionDigits:1,maximumFractionDigits:1})+" TUR");tS.position.set(EX,1.8,0)}
    // Güneş
    const gv=mod==="gunes"||mod==="sikis";gn.visible=gY.visible=gv;let gs=1;if(mod==="sikis")gs=Math.max(.001,1-eio(sm(.1,.6,u)));gn.scale.setScalar(gs);gn.ayar(t,1);gY.position.set(SX+3.2,2.6,0);gY.material.opacity=mod==="sikis"?1-sm(.4,.55,u):1;
    kS.visible=rS.visible=mod==="sikis";if(mod==="sikis"){kS.scale.setScalar(Math.max(.001,eob(sm(.55,.72,u))));const k=eio(sm(.1,.6,u));const r=Math.exp(lerp(Math.log(695700),Math.log(3),k));rS.set("YARIÇAP: "+Math.round(r).toLocaleString("tr-TR")+" km");rS.position.set(SX,2.4,0)}
    // kat
    const kv=mod==="kat";[s1,s2,zm,c1,c2,v1,v2].forEach(x=>x.visible=kv);if(kv){const k=eio(sm(.1,.7,u));const h2=Math.max(.001,CH*k),h1=.03;s1.scale.y=h1;s1.position.set(KX-1,-1.6+h1/2,0);s2.scale.y=h2;s2.position.set(KX+1,-1.6+h2/2,0);
      c1.position.set(KX-1,-2.05,0);c2.position.set(KX+1,-2.05,0);v1.position.set(KX-1,-1.2,0);v2.set(Math.round(299792*k).toLocaleString("tr-TR")+" km/s");v2.position.set(KX+1,-1.6+h2+.4,0)}
    const on=o.pi>0?(o.pp[o.pi-1].mod||"soru"):mod;const A=poz(on,0),B=poz(mod,u);const k=A.p.distanceTo(B.p)>12?1:eio(sm(0,.35,u));
    c.position.lerpVectors(A.p,B.p,k);c.quaternion.slerpQuaternions(A.q,B.q,k)}}};

/* ================= BUZDOLABI: günde kaç kWh ================= */
function etiketTex(){const c=document.createElement("canvas");c.width=256;c.height=420;const x=c.getContext("2d");x.fillStyle="#ffffff";x.fillRect(0,0,256,420);x.strokeStyle="#16213a";x.lineWidth=6;x.strokeRect(3,3,250,414);
  const R=["#13a35a","#55b848","#b8d23a","#f2e630","#f2b52a","#e8722a","#e0452a"];"ABCDEFG".split("").forEach((h,i)=>{const w=90+i*18,y=30+i*36;x.fillStyle=R[i];x.beginPath();x.moveTo(16,y);x.lineTo(16+w,y);x.lineTo(16+w+14,y+15);x.lineTo(16+w,y+30);x.lineTo(16,y+30);x.fill();x.fillStyle="#ffffff";x.font='700 24px "Space Mono"';x.fillText(h,24,y+24)});
  x.fillStyle="#16213a";x.beginPath();x.moveTo(250,30+3*36);x.lineTo(212,30+3*36);x.lineTo(198,45+3*36);x.lineTo(212,60+3*36);x.lineTo(250,60+3*36);x.fill();
  x.fillStyle="#16213a";x.font='700 38px "Space Mono"';x.textAlign="center";x.fillText("181",128,325);x.font='700 26px "Space Mono"';x.fillText("kWh / yıl",128,362);const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=8;return t}
function ampul(){const g=new THREE.Group();const cm=new THREE.MeshBasicMaterial({color:L("#ffd45a"),transparent:true,opacity:.95});const k=new THREE.Mesh(new THREE.SphereGeometry(.28,24,16),cm);k.position.y=.42;g.add(k);
  const b=new THREE.Mesh(new THREE.CylinderGeometry(.13,.11,.24,16),std("#9aa3b5",.6,.4));b.position.y=.1;g.add(b);g.cam=cm;return g}
S.buzdolabi=()=>{const sc=new THREE.Scene();const c=cam(46);studyo(sc);isik(sc,"#ffffff",2.3,"#6FE3FF",1.4);
  const FW=1.5,FH=3.6,FD=1.3,PX=14,CX=-14;
  const bd=new THREE.Group();sc.add(bd);const gov=new THREE.Mesh(new THREE.BoxGeometry(FW,FH,FD),std("#eef1f6",.2,.45));gov.position.y=FH/2+.05;bd.add(gov);
  const kap1=new THREE.Mesh(new THREE.BoxGeometry(FW-.04,FH*.6,.08),std("#f7f8fa",.2,.4));kap1.position.set(0,FH*.69+.05,FD/2+.05);bd.add(kap1);
  const kap2=new THREE.Mesh(new THREE.BoxGeometry(FW-.04,FH*.37,.08),std("#f7f8fa",.2,.4));kap2.position.set(0,FH*.2+.05,FD/2+.05);bd.add(kap2);
  [[FH*.55,.9],[FH*.33,.55]].forEach(([y,h])=>{const t=new THREE.Mesh(new THREE.BoxGeometry(.07,h,.08),std("#9aa3b5",.7,.3));t.position.set(-FW/2+.18,y+.05,FD/2+.14);bd.add(t)});
  const et=new THREE.Mesh(new THREE.PlaneGeometry(.62,1.02),new THREE.MeshBasicMaterial({map:etiketTex()}));et.position.set(.25,FH*.72+.05,FD/2+.095);bd.add(et);
  const kmp=new THREE.Mesh(new THREE.BoxGeometry(.5,.38,.45),std("#1b2233",.4,.5));kmp.position.set(FW/2+.4,.2,-.1);bd.add(kmp);const kmY=yazi("MOTOR",{boy:.24,renk:"#16213a"});kmY.position.set(FW/2+.4,.7,-.1);sc.add(kmY);
  const bob=new THREE.Group();bd.add(bob);for(let i=0;i<9;i++){const l=cizgi([V3(-.6,.8+i*.27,-FD/2-.08),V3(.6,.8+i*.27,-FD/2-.08)],"#16213a",1);bob.add(l)}
  const tit=[];for(let i=0;i<4;i++){const l=cizgi(Array.from({length:14},()=>V3(0,0,0)),"#e0452a",.8);sc.add(l);tit.push(l)}
  
  // kWh sütunları
  const KH=2.6/477;const k1=new THREE.Mesh(new THREE.BoxGeometry(.6,1,.5),std("#19c46c",0,.5)),k0=new THREE.Mesh(new THREE.BoxGeometry(.6,1,.5),std("#5d6679",0,.6));sc.add(k1,k0);
  const k1S=dyazi({boy:.32,renk:"#13a35a",gen:10}),k0S=dyazi({boy:.32,renk:"#16213a",gen:10});sc.add(k1S,k0S);const y1=yazi("2020",{boy:.3,renk:"#13a35a"}),y0=yazi("1990",{boy:.3,renk:"#16213a"});sc.add(y1,y0);
  const dil=new THREE.Mesh(new THREE.BoxGeometry(.6,1,.5),std("#f0a020",0,.5));sc.add(dil);const dS=dyazi({boy:.32,renk:"#de8400",gen:14});sc.add(dS);
  // LED ampuller
  const am=[0,1,2].map(i=>{const a=ampul();a.position.set(1.7+i*.75,.0,1.2);sc.add(a);return a});const aS=dyazi({boy:.4,renk:"#de8400",gen:10});aS.position.set(2.45,1.35,1.2);sc.add(aS);
  // aç-kapa grafiği
  const gr=cizgi(Array.from({length:200},()=>V3(0,0,0)),"#1580bd",1);sc.add(gr);const gA=yazi("AÇIK",{boy:.24,renk:"#13a35a"}),gK=yazi("KAPALI",{boy:.24,renk:"#16213a"});sc.add(gA,gK);const gE=cizgi([V3(1.9,2.05,.4),V3(4.5,2.05,.4)],"#16213a",.4);sc.add(gE);
  // telefonlar
  const tel=[];for(let i=0;i<26;i++){const p=telefon({tex:ekranTex()});const r=Math.floor(i/9),cI=i%9;p.position.set(PX+(cI-4)*.5,2.2-r*.92,0);p.scale.setScalar(.5);sc.add(p);tel.push(p)}
  const pS=dyazi({boy:.45,renk:"#13a35a",gen:12});pS.position.set(PX,3.2,0);sc.add(pS);
  // su ısıtıcıları
  const cy=[0,1,2,3,4].map(i=>{const k=caydanlik();k.position.set(CX+(i-2)*1.15,0,0);sc.add(k);return k});const cyS=dyazi({boy:.42,renk:"#de8400",gen:12});cyS.position.set(CX,2.0,0);sc.add(cyS);
  const buh=[];for(let i=0;i<15;i++){const b=new THREE.Mesh(new THREE.SphereGeometry(.1,10,8),new THREE.MeshBasicMaterial({color:L("#c9ccd3"),transparent:true,opacity:.5,depthWrite:false}));b.userData.kabuk=1;sc.add(b);buh.push(b)}
  const P={ana:{t:V3(.6,2.1,0),d:14.5,w:PI/2-.35,p:.14,ky:.09},yan:{t:V3(1.5,1.9,0),d:14.5,w:PI/2-.25,p:.12,ky:.09},arka:{t:V3(1.6,1.9,0),d:13.5,w:PI/2-.15,p:.12,ky:.09},tel:{t:V3(PX,1.5,0),d:12.5,w:PI/2,p:.06,ky:.1},cy:{t:V3(CX,.9,0),d:16.5,w:PI/2,p:.16,ky:.1}};
  const MP={soru:"ana",etiket:"ana",yil:"yan",gun:"yan",telefon:"tel",guc:"yan",motor:"arka",eski:"yan",kaynat:"cy",son:"ana"};
  const tq=cam(46);const poz=(m,u)=>{const k=MP[m]||"ana",A=P[k];orb(tq,A.t,A.d,A.w+(u||0)*.05,A.p);kaydir(tq,A.d*A.ky);return{p:tq.position.clone(),q:tq.quaternion.clone(),k}};
  const f1=v=>v.toLocaleString("tr-TR",{minimumFractionDigits:1,maximumFractionDigits:1});
  return{sc,c,bl:[.8,.5,.78],kur(o){const t=o.t,mod=o.p.mod||"soru",u=o.pu;
    et.scale.setScalar(mod==="etiket"?lerp(1,1.35,eob(sm(.1,.4,u))):1);
    // motor: aç/kapa (periyot 2,4 sn, %40 açık)
    const calis=mod==="motor"?((t%2.4)<1.0):(mod==="soru");kmY.visible=mod==="motor";kmp.position.x=calis?Math.sin(t*90)*.012:0;
    tit.forEach((l,j)=>{l.visible=calis;if(!calis)return;const ps=[];for(let q=0;q<14;q++){const v=q/13;ps.push(V3(FW/2+.15+j*.17+Math.sin(v*10-t*8+j)*.04,.45+v*.5,.2))}l.geometry.setFromPoints(ps)});
    const gv=mod==="motor";gr.visible=gA.visible=gK.visible=gE.visible=gv;if(gv){const ps=[];const n=200,sh=sm(.05,.85,u);for(let i=0;i<n;i++){const v=i/(n-1);const tt=v*7.2;const on_=(tt%2.4)<1.0;ps.push(V3(1.9+v*2.6*sh,on_?2.75:2.15,.4))}gr.geometry.setFromPoints(ps);gA.position.set(1.95,3.05,.4);gK.position.set(2.15,1.85,.4)}
    // sütunlar
    const kv=mod==="yil"||mod==="gun"||mod==="eski";k1.visible=k1S.visible=y1.visible=kv;let v1=181;if(mod==="yil")v1=181*eio(sm(.1,.6,u));const h1=Math.max(.001,v1*KH);k1.scale.y=h1;k1.position.set(1.8,h1/2,.2);k1S.set(Math.round(v1)+" kWh");k1S.position.set(1.8,h1+.35,.2);y1.position.set(1.8,-.28,.6);
    const ev=mod==="eski";k0.visible=k0S.visible=y0.visible=ev;if(ev){const v0=477*eio(sm(.1,.6,u));const h0=Math.max(.001,v0*KH);k0.scale.y=h0;k0.position.set(2.8,h0/2,.2);k0S.set(Math.round(v0)+" kWh");k0S.position.set(2.8,h0+.35,.2);y0.position.set(2.8,-.28,.6)}
    const dv=mod==="gun";dil.visible=dS.visible=dv;if(dv){const k=eio(sm(.15,.6,u));const s=lerp(.004,.6,k);dil.scale.set(lerp(1,1,k),s/.6*.6/1,lerp(1,1,k));dil.scale.y=Math.max(.004,s);dil.position.set(lerp(1.8,3.2,k),lerp(h1,1.7,k),lerp(.2,.4,k));dS.set(k>.6?"≈ 0,5 kWh / GÜN":"");dS.position.set(3.2,2.4,.4)}
    // ampuller
    const av=mod==="guc";am.forEach((a,i)=>{a.visible=av;a.scale.setScalar(Math.max(.001,eob(sm(.1+i*.1,.35+i*.1,u))));a.cam.opacity=i<2?.95:.35;a.cam.color=L(i<2?"#ffd45a":"#e8e4d0")});aS.visible=av;aS.set("≈ 21 W");
    // telefonlar
    const tk=mod==="telefon"?eio(sm(.08,.85,u))*26:26;tel.forEach((p,i)=>{p.rotation.y=Math.sin(t*.6+i)*.12;p.ekran.ciz(cl(tk-i),"")});pS.set(Math.min(26,Math.floor(tk+.001))+" TELEFON");
    // ısıtıcılar
    const ck=mod==="kaynat"?eio(sm(.08,.85,u))*5:5;buh.forEach((b,i)=>{const j=i%5;const on_=ck>j+.95;b.visible=on_;const q=((t*.4+i/15)%1);b.position.set(CX+(j-2)*1.15+.3+q*.3,1.0+q*1.0,0);b.scale.setScalar(.6+q*1.4);b.material.opacity=.5*(1-q)});cyS.set(Math.min(5,Math.floor(ck+.05))+" × 1 L SU");
    const on=o.pi>0?(o.pp[o.pi-1].mod||"soru"):mod;const A=poz(on,0),B=poz(mod,u);const k=A.p.distanceTo(B.p)>10?1:eio(sm(0,.35,u));
    c.position.lerpVectors(A.p,B.p,k);c.quaternion.slerpQuaternions(A.q,B.q,k)}}};

})();
