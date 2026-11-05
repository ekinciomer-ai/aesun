#!/bin/bash
# Salt okunur: Kasa'daki Gemini anahtarını Google'a sorar (değer yazdırılmaz): geçerli mi, hangi modeller açık.
G=$(/opt/aesun/kasa_coz.sh gemini_api_key 2>/dev/null) || { echo "NOT: Kasa'da gemini_api_key yok"; exit 0; }
G="$G" python3 - <<'PY'
import os,json,urllib.request,urllib.error,re
k=os.environ["G"].strip()
print(f"NOT: biçim: ilk 4 karakter türü={'AIza' if k.startswith('AIza') else ('AQ.' if k.startswith('AQ.') else 'başka')} uzunluk={len(k)} boşluk={' ' in k}")
def iste(url,veri=None):
    r=urllib.request.Request(url,data=json.dumps(veri).encode() if veri else None,headers={"x-goog-api-key":k,"Content-Type":"application/json"})
    try: return 200,json.load(urllib.request.urlopen(r,timeout=30))
    except urllib.error.HTTPError as e: return e.code,re.sub(r'AIza[0-9A-Za-z_-]+','***',e.read().decode()[:400])
c,d=iste("https://generativelanguage.googleapis.com/v1beta/models?pageSize=100")
print("NOT: modeller:",c, (", ".join(m["name"].split("/")[1] for m in d.get("models",[]) if "flash" in m["name"])[:400]) if c==200 else d)
c,d=iste("https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent",{"contents":[{"parts":[{"text":"Di 'hola' en una palabra."}]}]})
print("NOT: deneme flash-latest:",c, (d["candidates"][0]["content"]["parts"][0]["text"][:60] if c==200 else d))
PY
