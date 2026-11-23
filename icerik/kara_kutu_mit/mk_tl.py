import json,re,subprocess,sys
def dur(f): return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',f]))
DISP={'yüzde yüz':'%100','sıfır virgül elli':'0,50'}
def caps_for(texts,starts,durs):
  C=[]
  for txt,st,du in zip(texts,starts,durs):
    parts=[x.strip() for x in re.split(r'(?<=[.,;:?])\s+',txt) if x.strip()];m=[]
    for x in parts:
      if m and len(m[-1])<16: m[-1]+=' '+x
      else: m.append(x)
    tot=sum(len(x) for x in m);t=st
    for x in m:
      d=du*len(x)/tot;y=x
      for a,b in DISP.items(): y=y.replace(a,b)
      w=y.split()
      if len(y)>24 and len(w)>2:
        best=min(range(1,len(w)),key=lambda h:abs(len(' '.join(w[:h]))-len(' '.join(w[h:]))));y=' '.join(w[:best])+'<br>'+' '.join(w[best:])
      C.append([round(t,2),round(t+d,2),y]);t+=d
  return C
def build(kod,vdir,out,mapf,clues,reasons,nextfrac=.45,extra={}):
  P=json.load(open(f"{__import__('os').environ.get('AESUN','/home/claude/aesun')}/sunucu/tts_kuyruk/tamam/{kod}.json"))['parcalar']
  D=[dur(f'{vdir}/V{i}.wav') for i in range(1,8)];S=[0]*7
  S[0]=.3;kaza=S[0]+D[0]+.5;S[1]=kaza+.2;S[2]=S[1]+D[1]+.25;poll=S[2]+D[2]+.2;S[3]=poll+.2;cd0=S[3]+1.3
  rew=max(S[3]+D[3]+.35,cd0+5.3);slow=rew+1.3;S[4]=slow+.2;karar=S[4]+D[4]+.3;S[5]=karar+.2;ders=S[5]+D[5]+.4;S[6]=ders+.2;end=S[6]+D[6]+1.2
  T={"kaza":kaza,"poll":poll,"cd0":cd0,"rew":rew,"rewDur":1.3,"slow":slow,"karar":karar,"ders":ders,"next":S[6]+D[6]*nextfrac,"end":end,"suc":999,"cut":999}
  T.update(mapf(S,D,T))
  T["clues"]=[[S[4]+o,x] for o,x in clues];T["reasons"]=[[S[5]+o,x] for o,x in reasons[:-2]]
  T["hukum"]=S[5]+reasons[-2];T["onay"]=S[5]+D[5]-reasons[-1]
  T["caps"]=caps_for([p['metin'] for p in P],S,D);T["_starts"]=S;T.update(extra)
  json.dump(T,open(out,'w'),ensure_ascii=False);return T
