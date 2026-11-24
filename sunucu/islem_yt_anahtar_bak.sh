#!/bin/bash
# Salt okunur: YouTube otomatik tamamlama (keywordtool.io ücretsiz sürümünün kaynağı) — iş hukuku anahtar kelimeleri, TR.
python3 - <<'PY'
import json,urllib.request,urllib.parse,collections,time
T=["kıdem tazminatı","ihbar tazminatı","işten çıkarıldım","işten çıkarılma","istifa eden","fazla mesai","yıllık izin","mobbing","işe iade","arabulucu","sigortasız çalış","asgari ücret","işçi hakları","maaş ödenmedi","patron","işveren","tazminat","deneme süresi","rapor","işsizlik maaşı","evlilik tazminatı","askerlik kıdem","hamile işçi","bordro","elden maaş","haklı fesih","kod 29","çıkış kodu","sgk","işçi"]
H="abcçdefgğhıijklmnoöprsştuüvyz"
say=collections.Counter(); ilk={}
def sor(q):
  u="https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&hl=tr&gl=TR&q="+urllib.parse.quote(q)
  try: return json.loads(urllib.request.urlopen(urllib.request.Request(u,headers={"User-Agent":"Mozilla/5.0"}),timeout=10).read().decode('utf-8','ignore'))[1]
  except Exception as e: return []
for t in T:
  b=sor(t)
  for i,s in enumerate(b): say[s]+=10-i; ilk.setdefault(s,t)
  for h in H:
    for i,s in enumerate(sor(t+" "+h)): say[s]+=max(1,4-i)//2+1
    time.sleep(.05)
  print("NOT: TOHUM",t,"|",", ".join(b[:10]))
print("NOT: ---- EN GÜÇLÜ 120 ----")
for s,c in say.most_common(120): print(f"NOT: {c} | {s}")
PY
