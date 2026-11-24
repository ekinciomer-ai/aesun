# Altyazıları en çok 2 satır x ~24 karakter parçalara böler; "840.314 TL" gibi sayı+birim bölünmez. Kullanım: python3 capfix.py tl/mitX_tl.json
import json,re,sys
f=sys.argv[1];T=json.load(open(f))
def lines(words,mx=24):
  L=[];cur=''
  for w in words:
    if cur and len(cur)+1+len(w)>mx: L.append(cur);cur=w
    else: cur=(cur+' '+w).strip()
  if cur:L.append(cur)
  return L
out=[]
for a,b,t in T['caps']:
  txt=re.sub(r'(\d[\d.,]*) (TL|gün|yıl|ay)',lambda m:m.group(1)+' '+m.group(2),t.replace('<br>',' '))
  txt=re.sub(r'(%\d+) ',lambda m:m.group(1)+' ',txt)
  L=lines(txt.split());ch=[L[i:i+2] for i in range(0,len(L),2)];tot=sum(len(' '.join(c)) for c in ch);s=a
  for c in ch:
    d=(b-a)*len(' '.join(c))/tot;out.append([round(s,2),round(s+d,2),'<br>'.join(c)]);s+=d
T['caps']=out;json.dump(T,open(f,'w'),ensure_ascii=False);print(len(out),'altyazı')
