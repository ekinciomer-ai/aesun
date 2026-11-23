"""Kara Kutu F9 eskiz: eskiz.html şablonundan konu sahneleri -> k9_<konu>.html
python3 konu_eskiz.py"""
import os
D=os.path.dirname(os.path.abspath(__file__))
def js(v):
    if isinstance(v,list): return '['+','.join(js(x) for x in v)+']'
    return "'"+str(v).replace("\\","\\\\").replace("'","\\'")+"'"

ORTAK=r"""
const lerp=(a,b,k)=>a+(b-a)*k;
// ---- düz yol eskizi (üstten) ----
function yolH(p,duz,refuj){let o=cz(130,680,990,680,p)+cz(130,840,990,840,p);
 if(refuj)o+=cz(130,750,990,750,p*1.2-0.2,GRI,5,0)+cz(130,770,990,770,p*1.2-0.2,GRI,5,0);
 else if(duz)o+=cz(130,760,990,760,p*1.2-0.2,KIR,5,0);
 else for(let x=160;x<980;x+=110)o+=cz(x,760,x+50,760,p*1.2-0.2,GRI,4,0);return o}
const vanH=(x,y,p,r=0)=>`<g transform="translate(${x},${y}) rotate(${r})">`+yol('M-55,-24 h110 v48 h-110 Z M25,-24 v48',p,KUR,6)+'</g>';
const otoH=(x,y,p,r=0)=>`<g transform="translate(${x},${y}) rotate(${r})">`+yol('M-50,-24 h100 v48 h-100 Z M-15,-24 v48 M22,-24 v48',p,KUR,6)+'</g>';
const motoH=(x,y,p,r=0)=>`<g transform="translate(${x},${y}) rotate(${r})">`+yol('M-40,-12 v24 h80 v-24 Z',p,KUR,6)+daire(0,0,10,10,p,KUR,5)+'</g>';
const yayaT=(x,y,p,r=0)=>`<g transform="translate(${x},${y}) rotate(${r})">`+daire(0,-16,13,13,p,KUR,6)+yol('M0,-3 L0,26 M-16,8 L16,8',p,KUR,6)+'</g>';
const agacT=(x,y,p)=>daire(x,y,40,40,p,'#5d7d4a',6)+daire(x,y,16,16,p,'#5d7d4a',4);
const buzT=(p)=>{let o=yol('M480,684 L700,684 L700,836 L480,836 Z',p,'#5b9bd5',5);for(let i=0;i<9;i++){const x=490+i*24;o+=cz(x,836,x+60,690,p*1.3-0.3,'#5b9bd5',3,0)}return o};
const isikT=(x,y,p)=>yol(`M${x-18},${y-50} h36 v100 h-36 Z`,p,KUR,6)+daire(x,y-28,9,9,p,KIR,4)+daire(x,y,9,9,p,'#b8860b',4)+daire(x,y+28,9,9,p,'#3a8a4a',5);
const evI=(x,y,s,p)=>`<g transform="translate(${x},${y}) scale(${s})">`+yol('M-70,10 L-70,-50 L0,-100 L70,-50 L70,10 Z M-20,10 v-40 h40 v40',p)+'</g>';
const yayaI=(x,y,s,p)=>`<g transform="translate(${x},${y}) scale(${s})">`+daire(0,-60,22,22,p,KUR,6)+yol('M0,-38 L0,20 M-35,-15 L35,-15 M0,20 L-25,60 M0,20 L25,60',p*1.2-0.2)+'</g>';
const yazilI=(t)=>(x,y,s,p)=>yazi(x,y+20,t,110*s,KIR,ease(p),'middle','Baloo',800);
function patla(x,y,a,b){let d='';for(let i=0;i<=22;i++){const q=i/22*Math.PI*2,r=i%2?50:95;d+=`${i?'L':'M'}${x+Math.cos(q)*r},${y+Math.sin(q)*r*0.8}`}
 return yol(d+'Z',a,KIR,7)+yazi(x,y+20,L.cat,58,KIR,b,'middle','Baloo',800,-8)}
"""

# her konu: sahne(z,p,lab) -> svg ; isaret(i,a) -> V5 ipucu işareti ; IK1/IK2 karar simgeleri
K9={
'kacmak':dict(js=r"""
const CRP=[600,740];
function poz(z){let vx,vy,mx;
 if(z<1){vx=lerp(170,430,eout(z));vy=800;mx=lerp(960,760,eout(z))}
 else if(z<1.7){const k=(z-1)/0.7;vx=lerp(430,535,k);vy=lerp(800,728,ease(k));mx=lerp(760,650,k)}
 else{const k=(z-1.7)/0.6;vy=lerp(728,800,cl(k*2));vx=535+(k<0.3?0:ease((k-0.3)/0.7)*480);mx=650}
 return {vx,vy,mx,my:720}}
function sahne(z,p,lab){const q=poz(z);let o=yolH(p,true);
 o+=vanH(q.vx,q.vy,p,z>1&&z<1.7?-14:0);
 o+=z>1.7?motoH(q.mx+30,q.my-40,p,70):motoH(q.mx,q.my,p);
 if(lab){o+=yazi(q.vx,q.vy+70,L.van,40,KUR,lab)+yazi(q.mx,q.my-50,L.moto,38,KUR,lab)+yazi(300,640,L.dur,38,KIR,lab)}
 return o}
function isaret(i,a){return [daire(470,760,90,60,a),yazi(820,1040,'1,96‰',90,KIR,ease(a),'middle','Baloo',800),yazi(820,1170,'sicil',70,KIR,ease(a),'middle','Kalam',700)][i]}
const IK1=kamyonetI,IK2=yazilI('2,4‰');
function kacti(tv,cr){return tv>cr+1.4?ok(600,880,900,880,cl((tv-cr-1.4)/0.6))+yazi(930,900,'kaçtı',52,KIR,ease((tv-cr-1.6)/0.4),'start','Baloo',800):''}
""",kacti=True,
 L=dict(etiket='Gece · iki yönlü yol · Yargıtay dosyası',baslik=['Kazadan sonra kaçmak','kurtarır mı?'],van='kamyonet',moto='motosiklet + yolcu',dur='devamlı çizgi',
  bilgi='gece · iki yönlü yol · devamlı çizgi',cat='ÇAT!',kirik='sürücü öldü · yolcu ağır yaralı',soru='Kaçmak ne kazandırdı?',
  sik=['A) Hiçbir şey olmadı','B) Sadece trafik cezası','C) 9 yıl hapis'],ip=['devamlı çizgiyi geçti','3 saat sonra: 1,96 promil','eski alkol hükmü'],
  kv=['Kamyonet sürücüsü','ASLİ KUSUR','9 yıl hapis · indirim yok','ehliyet 3 yıl geri alındı'],km=['Kaza anı alkol','≈ 2,4 PROMİL',['geri hesapla bulundu','kaçmak işe yaramadı']],
  dogru='Doğru şık: C',efsane='"Kaçarsam kurtulurum"',kural=['1. Kaza yaptıysan DUR',"2. 112'yi ara, yardım et",'3. Alkollüysen direksiyona geçme'],yav='Kaçmak seni KURTARMAZ!')),

'serit':dict(js=r"""
const CRP=[545,815];
function poz(z){let mx,my;
 if(z<1){mx=lerp(160,420,eout(z));my=800}else if(z<1.7){const k=(z-1)/0.7;mx=lerp(420,520,k);my=lerp(800,812,k)}else{mx=520;my=812}
 return {mx,my}}
function sahne(z,p,lab){const q=poz(z);let o=yolH(p,false);
 o+=otoH(640,830,p)+yazi(640,830,'',1,KUR,0);
 o+=z>1.7?motoH(q.mx-20,q.my-40,p,-60):motoH(q.mx,q.my,p);
 if(lab){o+=yazi(640,905,L.van,40,KUR,lab)+yazi(q.mx,q.my-50,L.moto,38,KUR,lab)+yazi(760,640,L.dur,40,KIR,lab)+ok(760,660,700,800,lab)}
 return o}
function isaret(i,a){return [daire(640,830,90,60,a),yazi(820,1040,'gece',80,KIR,ease(a),'middle','Kalam',700),yol('M760,1180 L820,1080 L880,1180 Z',a,KIR,7)+cz(740,1190,900,1070,a*1.3-0.3,KIR,8)][i]}
const IK1=kamyonetI,IK2=yazilI('§');
""",
 L=dict(etiket='Gece · ışıksız yol · Yargıtay dosyası',baslik=['Duran araca çarpan','hep tam kusurlu mu?'],van='arızalı araç',moto='motosiklet + yolcu',dur='yola taşmış',
  bilgi='gece · şehir dışı · aydınlatma yok',cat='ÇAT!',kirik='sürücü ve yolcu yaralandı',soru='Duran araca ne oldu?',
  sik=['A) Hiçbir şey olmadı','B) Sadece trafik cezası','C) Yaralamadan mahkûm'],ip=['yolu kısmen kapattı','gece, karanlık','uyarı işareti yok'],
  kv=['Duran aracın sürücüsü','MAHKÛM','taksirle yaralama','hapis → adli para cezası'],km=['Yargıtay notu','ASLİ KUSUR',['tali sayılmıştı,','asli olmalıydı']],
  dogru='Doğru şık: C',efsane='"Duruyordum, suçum yok"',kural=['1. Dörtlüleri yak','2. Reflektörü geriye koy','3. Aracı yoldan çıkar'],yav='Durmak yetmez, GÖRÜN!')),

'buz':dict(js=r"""
const CRP=[740,960];
function poz(z){let x,y,r=0;
 if(z<1){x=lerp(160,450,eout(z));y=800}else if(z<1.7){const k=(z-1)/0.7;x=lerp(450,700,k);y=lerp(800,930,k*k);r=70*k}else{x=700;y=930;r=70}
 return {x,y,r}}
function sahne(z,p,lab){const q=poz(z);let o=yolH(p,false)+buzT(p)+agacT(800,1010,p);
 o+=otoH(q.x,q.y,p,q.r);
 if(lab){o+=yazi(q.x,q.y-50,L.van,40,KUR,lab)+yazi(590,650,L.dur,48,'#5b9bd5',lab,'middle','Baloo',800)}
 return o}
function isaret(i,a){return [daire(590,760,140,90,a,'#5b9bd5'),yazi(820,1060,'kasko',70,KIR,ease(a),'middle','Kalam',700),yazi(820,1180,'bilirkişi',64,KIR,ease(a),'middle','Kalam',700)][i]}
const IK1=kamyonetI,IK2=evI;
""",
 L=dict(etiket='Kış · karlı yol · Danıştay dosyası',baslik=['Yol buzluysa','devlet mi öder?'],van='otomobil',moto='',dur='BUZ',
  bilgi='kış · zemin buz · tuzlama yok',cat='KAYDI!',kirik='araç ağır hasar gördü',soru='Hasarı kim ödedi?',
  sik=['A) Devlet ödedi','B) Yarı yarıya','C) İdare hiç ödemedi'],ip=['zemin buz tutmuştu','kasko idareden istedi','teknik bilirkişi raporu'],
  kv=['Sürücü','%100 KUSURLU','20.020 TL talep','reddedildi'],km=['İdare','KUSUR YOK',['hizmet kusuru','bulunmadı']],onay='DANIŞTAY ONADI',
  dogru='Doğru şık: C',efsane='"Yol buzluydu, devlet öder"',kural=['1. Kışın hızını düşür','2. Takip mesafesini aç','3. Kış lastiği kullan'],yav='Buz bahane değil: YAVAŞLA!',
  not_='Danıştay kararından uyarlanmıştır · Kişi, plaka ve yer bilgisi yok · Hukuki danışmanlık değildir')),

'yaya':dict(js=r"""
const CRP=[690,800];
function poz(z){let x,py=760,pr=0;
 if(z<1)x=lerp(160,420,eout(z));else if(z<1.7){const k=(z-1)/0.7;x=lerp(420,630,k);py=lerp(760,800,ease(k))}else{x=630+30*eout((z-1.7)/0.5);py=820;pr=80}
 return {x,py,pr}}
function sahne(z,p,lab){const q=poz(z);let o=yolH(p,false,true)+isikT(330,620,p);
 o+=otoH(q.x,800,p)+yayaT(700,q.py,p,q.pr);
 if(lab){o+=yazi(q.x,880,L.van,40,KUR,lab)+yazi(790,700,L.moto,40,KUR,lab,'start')+yazi(330,540,L.dur,38,KIR,lab)+yazi(700,1000,'geçit yok',40,KIR,lab)}
 return o}
function isaret(i,a){return [daire(700,780,70,70,a),cz(420,820,620,820,a,KIR,5,0)+yazi(520,880,'fren izi yok',38,KIR,ease(a)),yazi(820,1150,'avukat',64,KIR,ease(a),'middle','Kalam',700)][i]}
const IK1=kamyonetI,IK2=yayaI;
""",
 L=dict(etiket='Sabah · tek yönlü cadde · Yargıtay dosyası',baslik=['Geçit dışı yayaya','çarpan kusursuz mu?'],van='otomobil',moto='yaya',dur='ışık',
  bilgi='sabah · tek yönlü · sınır 50',cat='ÇAT!',kirik='yaya hayatını kaybetti',soru='Sürücüye ne oldu?',
  sik=['A) Kusursuz, beraat','B) Tali kusurlu, mahkûm','C) Tam kusurlu'],ip=['geçit olmayan yerden indi','yolda fren izi yok','avukat: kusur yayada'],
  kv=['Sürücü','TALİ KUSUR','taksirle öldürme: mahkûm','hapis → adli para cezası'],km=['Yaya','KURAL DIŞI',['geçit olmayan','yerden geçti']],
  dogru='Doğru şık: B',efsane='"Geçit dışıysa kusursuzum"',kural=['1. Yolu sürekli izle','2. Yayayı görünce yavaşla','3. Geçit dışında da dikkat'],yav='Yaya hata yapsa da DİKKAT ET!')),
}

YENI_V123=r""" const zA=t=>{if(t<P.V2[0])return 0;if(t<P.V3[0])return cl((t-P.V2[0])/(P.V2[1]-P.V2[0]))*0.98;const ct=K.carp-P.V3[0];const k=cl((t-P.V3[0])/ct);return 1+k*0.7+(k>=1?cl((t-K.carp)/3.0)*0.6:0)};
 if(v==='V1'){
  o+=yolH(A(0,1.6),false);
  o+=yazi(560,330,L.baslik[0],78,KUR,ease(A(0.2,0.5)),'middle','Baloo',800)+yazi(560,420,L.baslik[1],80,KIR,ease(A(0.6,0.5)),'middle','Baloo',800);
  o+=daire(560,1060,120,120,A(1.4,0.8))+yazi(560,1095,'?',140,KIR,ease(A(1.6,0.4)),'middle','Baloo',800);
 }
 if(v==='V2'){
  o+=sahne(zA(t),A(0,0.8),ease(A(1.0,0.5)));
  o+=yazi(560,1230,L.bilgi,46,GRI,ease(A(dv*0.3,0.5)));
 }
 if(v==='V3'){
  const cr=(K.carp-P.V3[0]);o+=sahne(zA(t),1,0);
  if(tv>=cr){o+=daire(CRP[0],CRP[1],110,90,A(cr,0.5))+patla(CRP[0]+150,CRP[1]-170,A(cr,0.4),ease(A(cr+0.2,0.3)));
   o+=yazi(560,1180,L.kirik,52,KUR,ease(A(cr+0.8,0.5)))+cz(330,1200,790,1195,A(cr+1.1,0.6),KIR,6);
   if(typeof kacti==='function')o+=kacti(tv,cr)}
 }
"""
YENI_V5=r""" if(v==='V5'){
  o+=sahne(1.6,1,1);
  o+=yol('M350,1340 l60,-45 v90 Z M440,1340 l60,-45 v90 Z',A(0,0.6),KUR,7)+yazi(560,1360,L.geri,60,KUR,ease(A(0.4,0.4)),'start');
  const ip=K.ip.map(x=>x-P.V5[0]);
  ip.forEach((x,i)=>{if(tv>x){o+=isaret(i,A(x,0.6))+yazi(160,440+i*60,(i+1)+' · '+L.ip[i],46,KIR,ease(A(x+0.3,0.4)),'start')}});
 }
"""

def uret(ad,k):
    s=open(f"{D}/eskiz.html",encoding='utf-8').read()
    i=s.index(" if(v==='V1'){");j=s.index(" if(v==='V4'){");s=s[:i]+YENI_V123+s[j:]
    i=s.index(" if(v==='V5'){");j=s.index(" if(v==='V6'){");s=s[:i]+YENI_V5+s[j:]
    s=s.replace("kamyonetI(320,520,1.1,A(0.4,1.0))","IK1(320,520,1.1,A(0.4,1.0))").replace("motorI(800,530,1.1,A(tl,1.0))","IK2(800,530,1.1,A(tl,1.0))")
    i=s.index("const L={etiket:");j=s.index("};",i)+2
    L=dict(k['L']);L.setdefault('onay','YARGITAY ONADI');L['yorum']='cevabını yoruma yaz';L['geri']='geri saralım';L['karar']='KARAR';L['son']='Sen hangi şıkkı seçtin?';L['kanal']='KARA KUTU'
    L['not']=L.pop('not_','Yargıtay kararından uyarlanmıştır · Kişi, plaka ve yer bilgisi yok · Hukuki danışmanlık değildir')
    L['sag']='';
    an="anahtar:['DUR','kusur','asli','tali','Yargıtay','Danıştay','yavaş','kural','ceza','ehliyet','onadı','hapis','alkol','promil','kaç','buz','yaya','mahkûm']"
    s=s[:i]+ORTAK+k['js']+"const L={"+",".join(f"{a}:{js(b)}" for a,b in L.items())+","+an+"};"+s[j:]
    s=s.replace("yazi(150,120,L.etiket,44,","yazi(150,120,L.etiket,Math.min(44,1480/L.etiket.length),").replace("yazi(250,y+15,s,62,","yazi(250,y+15,s,Math.min(62,1250/s.length),").replace("yazi(200,520+i*120,s,60,","yazi(200,520+i*120,s,Math.min(60,1450/s.length),").replace("yazi(560,960,L.yav,74,","yazi(560,960,L.yav,Math.min(74,1350/L.yav.length),")
    open(f"{D}/k9_{ad}.html",'w',encoding='utf-8').write(s);print('yazıldı k9_'+ad)

if __name__=='__main__':
    import sys
    for ad in (sys.argv[1:] or K9): uret(ad,K9[ad])
