/* Kozmos Lab · Merak — zaman çizelgesi, HUD, altyazı. Kayıt arayüzü: window.HAZIR, kurgu(K), kare(t). */
(function(){
const {cl,sm,lerp,eo,eob,ciz}=M;const $=id=>document.getElementById(id);
let K=null,B=[],CH=[];const ORN={};
function sahneAl(ad){if(!ORN[ad]){if(!S[ad])throw new Error("sahne yok: "+ad);ORN[ad]=S[ad]();M.murekkep(ORN[ad].sc)}return ORN[ad]}
function hazirla(k){K=k;B=[];M.T.acik=(K.tema||"acik")==="acik";document.body.classList.toggle("acik",M.T.acik);
  // ardışık aynı sahneli parçalar tek blok
  K.parcalar.forEach((p,i)=>{const son=B[B.length-1];if(son&&son.sahne===p.sahne&&!p.yeni){son.parcalar.push(p);son.son=p.son}else B.push({sahne:p.sahne,bas:p.bas,son:p.son,parcalar:[p]})});
  B.forEach((b,i)=>{b.i=i;const sonb=B[i+1];if(sonb)b.son=sonb.bas});B[B.length-1].son=K.toplam;
  // altyazı parçaları
  CH=[];K.parcalar.forEach(p=>{let cur=[];const ws=p.kelimeler||[];ws.forEach((w,j)=>{cur.push(w);const nok=/[.,!?;:…]$/.test(w.w);const len=cur.map(x=>x.w).join(" ").length;
    if(cur.length>=3||nok||len>16||j===ws.length-1){CH.push({k:cur,bas:cur[0].b,son:0,p});cur=[]}})});
  CH.forEach((c,i)=>{const n=CH[i+1];c.son=n&&n.p===c.p?n.bas:c.k[c.k.length-1].s+.25});
  $("no").textContent=K.no||"";$("soru").querySelector(".s").textContent=K.soru.ust||"";$("soru").querySelector(".t").innerHTML=K.soru.t;
  $("yol").innerHTML=K.parcalar.map(()=>"<i><s></s></i>").join("");
  Object.keys(S).forEach(a=>{if(K.parcalar.some(p=>p.sahne===a))sahneAl(a)});}
function fmt(v,dec){return v.toLocaleString("tr-TR",{minimumFractionDigits:dec||0,maximumFractionDigits:dec||0})}
function kartCiz(p,t){const el=$("kart");const y=(p.p&&p.p.kart!==undefined)?p.p.kart:(K.kartY||57);el.style.top=y+"%";
  const it=(p.ekran||[]);let h="";it.forEach(e=>{const t0=e.t;const a=cl((t-t0)/.35);if(t<t0-.01)return;const st=`opacity:${a};transform:translateY(${(1-eo(a))*2}vmin) scale(${lerp(.92,1,eob(a))})`;
    if(e.tip==="sayi"){let v=e.y;if(e.say!==undefined){const k=eo(cl((t-t0)/(e.sure||1.1)));const den=e.den||0;v=fmt(lerp(den,e.say,k),e.dec)}
      h+=`<div class="sat" style="${st}">${e.ust?`<div class="ust">${e.ust}</div>`:""}<div class="sayi${e.soguk?" soguk":""}">${e.on||""}${v}${e.ek?`<small>${e.ek}</small>`:""}</div></div>`}
    else if(e.tip==="formul")h+=`<div class="sat formul" style="${st}">${e.y}</div>`;
    else h+=`<div class="sat etiket" style="${st}">${e.y}</div>`});
  if(el._h!==h){el.innerHTML=h;el._h=h}
  // parça sonunda kart söner
  el.style.opacity=1-sm(p.son-.25,p.son+.05,t)}
function altCiz(t){const c=CH.find(x=>t>=x.bas&&t<x.son);const el=$("alt");if(!c){el.innerHTML="";return}
  const a=cl((t-c.bas)/.12);el.style.opacity=a;el.style.transform=`translateY(${(1-a)*1.2}vmin)`;
  el.innerHTML=c.k.map(w=>`<b class="${t>=w.b&&t<w.s+.08?"on":t>=w.s?"son":""}">${w.w.toLocaleUpperCase("tr-TR")}</b>`).join(" ")}
let tsTane=-1;function tane(fr){if(fr===tsTane)return;tsTane=fr;const c=$("tane"),x=c.getContext("2d"),d=x.createImageData(256,256);let s=fr*9301+49297;for(let i=0;i<d.data.length;i+=4){s=(s*16807)%2147483647;const v=s%255;d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=255}x.putImageData(d,0,0)}
function kare(t){let bi=B.findIndex(b=>t>=b.bas&&t<b.son);if(bi<0)bi=t<B[0].bas?0:B.length-1;const b=B[bi];
  let pi=0;b.parcalar.forEach((q,j)=>{if(t>=q.bas)pi=j});const p=b.parcalar[pi];
  const pEnd=pi<b.parcalar.length-1?b.parcalar[pi+1].bas:b.son;const o={t,u:cl((t-b.bas)/(b.son-b.bas)),bt:t-b.bas,dur:b.son-b.bas,pi,pu:cl((t-p.bas)/(pEnd-p.bas)),pt:t-p.bas,pd:pEnd-p.bas,p:p.p||{},pp:b.parcalar.map(x=>x.p||{}),
    pb:b.parcalar.map(x=>x.bas-b.bas),ev:(p.ekran||[]).map(e=>e.t-p.bas),son:bi===B.length-1,ilk:bi===0};
  const sn=sahneAl(b.sahne);sn.kur(o);if(M.T.acik)sn.sc.traverse(x=>{if(x.userData.bb)x.quaternion.copy(sn.c.quaternion)});ciz(sn);
  // geçiş: flaş + zoom vuruşu
  const dt=t-b.bas;$("flas").style.opacity=M.T.acik?0:(bi>0&&dt<.16?(1-dt/.16)*.5:0);const z=bi>0?1+.07*(1-eo(cl(dt/.45))):1;$("c").style.transform=`scale(${z})`;
  const kalan=K.toplam-t;$("kara").style.opacity=Math.max(cl(1-t/.4),cl(1-kalan/.5));
  // soru başlığı: açılışta ortada büyük, sonra yukarı küçülür
  const ilkSon=K.parcalar[0].son,g=eo(cl((t-ilkSon+.15)/.6)),gir=eob(cl(t/.55));const s=$("soru");
  s.style.transform=`translateY(${lerp(K.soruY||27,10.2,g)}vh) scale(${lerp(1.08,.56,g)*lerp(.85,1,gir)})`;s.style.opacity=cl(t/.3)*(1-.0*g);
  kartCiz(p,t);altCiz(t);$("alt").style.top=(K.altY||73.5)+"%";$("yol").style.top="9.2%";
  [...$("yol").children].forEach((i,j)=>{const q=K.parcalar[j];i.firstChild.style.transform=`scaleX(${cl((t-q.bas)/(q.son-q.bas))})`});
  tane(Math.floor(t*30));$("tane").style.transform=`translate(${(t*137%50)-25}px,${(t*91%50)-25}px)`}
window.kurgu=k=>{hazirla(k)};window.kare=kare;window.HAZIR=true;
// tarayıcıda açılınca önizleme: ?onizle=kurgu.json
const Q=new URLSearchParams(location.search);if(Q.get("onizle")){fetch(Q.get("onizle")).then(r=>r.json()).then(k=>{hazirla(k);const t0=performance.now();const f=()=>{kare(((performance.now()-t0)/1000)%K.toplam);requestAnimationFrame(f)};f()})}
})();
