import numpy as np, json
rng=np.random.default_rng(20261105)
N=20000; M=95
LH=(0.7*1.396+0.3*1.55)*0.92; LA=(0.7*1.752+0.3*1.90)*0.92   # piyasa %70 + form %30
prof=np.ones(M); prof[:15]*=0.85; prof[45:60]*=1.05; prof[75:]*=1.2; prof/=prof.sum()
RED_BASE=0.06; PEN_BASE=0.14; PEN_CONV=0.77
SC=[dict(id='temel',ad='Temel senaryo',kisa='Beklenen kadrolar, normal maç akışı',fh=1,fa=1),
    dict(id='celtic',ad='Celtic baskısı',kisa='Celtic Park atmosferi + kazanmak zorunda; Beşiktaş\'ta Vlahovic/Trossard kötü gününde',fh=1.15,fa=0.80),
    dict(id='bjk',ad='Beşiktaş form zirvesi',kisa='Celtic\'in Avrupa\'daki kırılganlığı; Beşiktaş önce atarsa Celtic dağılır',fh=0.90,fa=1.15,collapse=True),
    dict(id='hakem',ad='Hakem / VAR maçı',kisa='Stegemann bir kırmızı kart ve bir VAR penaltısı veriyor (taraf rastgele)',fh=1,fa=1,forced=True),
    dict(id='degisiklik',ad='Oyuncu değişiklikleri',kisa='60\'tan sonra Beşiktaş yorulur, Celtic taze yedeklerle bastırır',fh=1,fa=1,late=True)]
W=dict(temel=.40,celtic=.15,bjk=.15,hakem=.15,degisiklik=.15)
def run(s):
  H=np.zeros(N,int);A=np.zeros(N,int);first=np.zeros(N,int);gm=[];red=np.zeros((N,2),int);pen=np.zeros((N,2),int)
  ex=[]
  for i in range(N):
    h=a=0; mh=ma=1.0; f=0; ev=[]
    rmin=[None,None]; pmin=[None,None]
    for t in range(2):
      if rng.random()<RED_BASE: rmin[t]=int(rng.integers(20,90))
      if rng.random()<PEN_BASE: pmin[t]=int(rng.integers(5,92))
    if s.get('forced'):
      t=int(rng.integers(2)); rmin[t]=int(rng.integers(25,81)); t2=int(rng.integers(2)); pmin[t2]=int(rng.integers(10,90))
    for m in range(M):
      fh=s['fh']*mh; fa=s['fa']*ma
      if s.get('late') and m>=60: fh*=1.12; fa*=0.85
      for t in range(2):
        if rmin[t]==m:
          if t==0: mh*=0.65; ma*=1.30
          else: ma*=0.65; mh*=1.30
          ev.append((m,'kirmizi',t)); red[i,t]=1
        if pmin[t]==m:
          pen[i,t]=1; ok=rng.random()<PEN_CONV; ev.append((m,'penalti_gol' if ok else 'penalti_kacti',t))
          if ok:
            if t==0: h+=1
            else: a+=1
            if not f: f=1 if t==0 else 2
            gm.append(m)
      gh=rng.random()<LH*fh*prof[m]; ga=rng.random()<LA*fa*prof[m]
      if gh: h+=1; ev.append((m,'gol',0)); gm.append(m); f=f or 1
      if ga:
        a+=1; ev.append((m,'gol',1)); gm.append(m)
        if not f:
          f=2
          if s.get('collapse'): mh*=0.85; ma*=1.05
    H[i]=h;A[i]=a;first[i]=f
    if i<400: ex.append(dict(h=h,a=a,ev=ev))
  hw=(H>A).mean();d=(H==A).mean();aw=(H<A).mean()
  sc={}
  for x,y in zip(H,A): sc[f'{min(x,6)}-{min(y,6)}']=sc.get(f'{min(x,6)}-{min(y,6)}',0)+1
  top=sorted(sc.items(),key=lambda z:-z[1])[:8]
  # temsilî maç: en olası skorla biten ilk örnek
  best=top[0][0]; rep=next((e for e in ex if f"{e['h']}-{e['a']}"==best),ex[0])
  hist=np.histogram(gm,bins=range(0,100,15))[0].tolist()
  return dict(id=s['id'],ad=s['ad'],kisa=s['kisa'],agirlik=W[s['id']],celtic=round(hw*100,1),berabere=round(d*100,1),bjk=round(aw*100,1),
    xg_h=round(H.mean(),2),xg_a=round(A.mean(),2),ust25=round(((H+A)>2).mean()*100,1),kg=round(((H>0)&(A>0)).mean()*100,1),
    ilk_gol_bjk=round((first==2).mean()*100,1),ilk_gol_celtic=round((first==1).mean()*100,1),golsuz=round((first==0).mean()*100,1),
    skorlar=[[k,round(v/N*100,1)] for k,v in top],temsil=dict(skor=best,olay=[[int(m),k,int(t)] for m,k,t in sorted(rep['ev'])]),gol_dk=hist,
    kirmizi=[round(red[:,0].mean()*100,1),round(red[:,1].mean()*100,1)],penalti=[round(pen[:,0].mean()*100,1),round(pen[:,1].mean()*100,1)])
R=[run(s) for s in SC]
tot={k:round(sum(r[k]*r['agirlik'] for r in R),1) for k in ['celtic','berabere','bjk','ust25','kg']}
tot['xg_h']=round(sum(r['xg_h']*r['agirlik'] for r in R),2); tot['xg_a']=round(sum(r['xg_a']*r['agirlik'] for r in R),2)
agg={}
for r in R:
  for k,v in r['skorlar']: agg[k]=agg.get(k,0)+v*r['agirlik']
tot['skorlar']=[[k,round(v,1)] for k,v in sorted(agg.items(),key=lambda z:-z[1])[:6]]
out=dict(mac=dict(ev='Celtic',dep='Beşiktaş',tarih='5 Kasım 2026, 23:00 (TSİ)',yer='Celtic Park, Glasgow',lig='UEFA Avrupa Ligi · 4. hafta',hakem='Sascha Stegemann (Almanya) · VAR: Benjamin Brand'),
  girdi=dict(lam_h=round(LH,2),lam_a=round(LA,2),piyasa=dict(oran=[3.15,3.70,2.15],olasilik=[30.0,25.3,44.7],ust25=61.0,exp_h=1.40,exp_a=1.75),
  form=dict(celtic='Son 10 maç: 4G 1B 5M · 1,7 attı / 1,6 yedi · Avrupa\'da 3 maçta 0 puan',bjk='Son 10 maç: 6G 2B 2M · 2,2 attı / 1,4 yedi · Avrupa\'da 3 maçta 7 puan')),
  N=N,senaryolar=R,toplam=tot)
json.dump(out,open('sonuc.json','w'),ensure_ascii=False)
for r in R: print(r['ad'],r['celtic'],r['berabere'],r['bjk'],r['skorlar'][0],r['temsil']['skor'])
print('TOPLAM',tot)
