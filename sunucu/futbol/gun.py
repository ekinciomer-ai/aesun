import numpy as np, json, penaltyblog as pb, warnings; warnings.filterwarnings('ignore')
rng=np.random.default_rng(1105)
M=[("20:45","Milan","Ferencváros",1.33,5.75,9.00),("20:45","Anderlecht","Salzburg",2.00,3.90,3.60),("20:45","Sparta Prag","Bournemouth",7.00,5.00,1.47),
("20:45","Crystal Palace","Hoffenheim",1.86,4.00,3.90),("20:45","Levski Sofya","Jagiellonia",2.05,3.50,3.70),("20:45","Lillestrøm","Viktoria Plzeň",2.90,3.90,2.30),
("20:45","Real Sociedad","Lyon",1.66,4.30,5.00),("20:45","NEC Nijmegen","Omonia",1.77,4.10,4.30),("23:00","Torreense","Ararat-Armenia",1.74,3.90,5.00),
("23:00","AZ Alkmaar","Juventus",3.75,3.75,2.00),("23:00","Bayer Leverkusen","Marsilya",1.32,6.00,8.50),("23:00","Benfica","Lech Poznań",1.16,9.00,18.00),
("23:00","Celtic","Beşiktaş",3.00,3.95,2.25),("23:00","Sturm Graz","Celje",1.52,4.60,6.00),("23:00","Celta Vigo","Union Saint-Gilloise",2.35,3.50,3.00),
("23:00","Sunderland","Dinamo Zagreb",1.44,5.00,7.00),("23:00","Hapoel Beer-Sheva","OFI",2.15,3.60,3.30)]
N=20000; T=95
prof=np.ones(T); prof[:15]*=0.85; prof[45:60]*=1.05; prof[75:]*=1.2; prof/=prof.sum()
SC=[('temel','Temel',.40,1,1,0),('ev','Ev sahibi baskısı / deplasman kötü günde',.15,1.15,.80,0),('dep','Deplasman form zirvesi',.15,.90,1.15,1),
    ('hakem','Hakem / VAR: kırmızı kart + penaltı',.15,1,1,2),('deg','Oyuncu değişiklikleri / yorgunluk',.15,1,1,3)]
def sim(lh,la,fh0,fa0,kind):
  H=np.zeros(N,int);A=np.zeros(N,int);mh=np.ones(N);ma=np.ones(N);first=np.zeros(N,int)
  rm=np.where(rng.random((N,2))<0.06,rng.integers(20,90,(N,2)),-1); pm=np.where(rng.random((N,2))<0.14,rng.integers(5,92,(N,2)),-1)
  if kind==2:
    t=rng.integers(0,2,N); rm[np.arange(N),t]=rng.integers(25,81,N); t2=rng.integers(0,2,N); pm[np.arange(N),t2]=rng.integers(10,90,N)
  for m in range(T):
    fh=fh0*mh; fa=fa0*ma
    if kind==3 and m>=60: fh=fh*1.12; fa=fa*0.85
    for t in (0,1):
      r=rm[:,t]==m
      if t==0: mh[r]*=.65; ma[r]*=1.30
      else: ma[r]*=.65; mh[r]*=1.30
      p=(pm[:,t]==m)&(rng.random(N)<.77)
      if t==0: H+=p; first[(first==0)&p]=1
      else: A+=p; first[(first==0)&p]=2
    gh=rng.random(N)<lh*fh*prof[m]; ga=rng.random(N)<la*fa*prof[m]
    H+=gh; A+=ga; first[(first==0)&gh]=1; nf=(first==0)&ga; first[nf]=2
    if kind==1: mh[nf]*=.85; ma[nf]*=1.05
  return H,A
out=[];allsk=[]
for i,(sa,h,a,o1,ox,o2) in enumerate(M):
  p=pb.implied.calculate_implied([o1,ox,o2],method='power').probabilities
  ge=pb.models.goal_expectancy(p[0],p[1],p[2],remove_overround=False)
  lh,la=ge['home_exp']*0.93,ge['away_exp']*0.93
  agg={'1':0,'X':0,'2':0}; sk={}; sens=[]; xg=[0,0]; ou=0; kg=0
  for sid,ad,w,fh,fa,k in SC:
    H,A=sim(lh,la,fh,fa,k)
    r=dict(id=sid,ad=ad,agirlik=w,ev=round((H>A).mean()*100,1),x=round((H==A).mean()*100,1),dep=round((H<A).mean()*100,1),xg_ev=round(H.mean(),2),xg_dep=round(A.mean(),2))
    c={}
    for x,y in zip(np.minimum(H,6),np.minimum(A,6)): c[(x,y)]=c.get((x,y),0)+1
    best=max(c,key=c.get); r['en_olasi']=f'{best[0]}-{best[1]}'; sens.append(r)
    agg['1']+=w*r['ev'];agg['X']+=w*r['x'];agg['2']+=w*r['dep']; xg[0]+=w*H.mean(); xg[1]+=w*A.mean(); ou+=w*((H+A)>2).mean(); kg+=w*((H>0)&(A>0)).mean()
    for kk,v in c.items(): sk[kk]=sk.get(kk,0)+w*v/N
  tah=max(agg,key=agg.get)
  cand={kk:v for kk,v in sk.items() if (kk[0]>kk[1] if tah=='1' else kk[0]==kk[1] if tah=='X' else kk[0]<kk[1])}
  ts=max(cand,key=cand.get)
  topsk=sorted(sk.items(),key=lambda z:-z[1])[:5]
  out.append(dict(no=i+1,saat=sa,ev=h,dep=a,mac=f'{h} – {a}',oran_1=o1,oran_x=ox,oran_2=o2,piyasa_1=round(p[0]*100,1),piyasa_x=round(p[1]*100,1),piyasa_2=round(p[2]*100,1),
    p1=round(agg['1'],1),px=round(agg['X'],1),p2=round(agg['2'],1),tahmin=tah,tahmin_yazi={'1':f'{h} kazanır','X':'Berabere','2':f'{a} kazanır'}[tah],
    guven=round(agg[tah],1),tahmin_skor=f'{ts[0]}-{ts[1]}',xg_ev=round(xg[0],2),xg_dep=round(xg[1],2),ust25=round(ou*100,1),kg_var=round(kg*100,1),
    senaryo_fav=sum(1 for r in sens if max(('1',r['ev']),('X',r['x']),('2',r['dep']),key=lambda z:z[1])[0]==tah),
    skorlar=' · '.join(f'{x}-{y} %{v*100:.1f}' for (x,y),v in topsk),senaryolar=sens,sonuc=None,gercek_skor=None,isabet=None))
  print(sa,h,a,tah,round(agg[tah],1),f'{ts[0]}-{ts[1]}')
json.dump(out,open('gun_2026-11-05.json','w'),ensure_ascii=False,default=float)
