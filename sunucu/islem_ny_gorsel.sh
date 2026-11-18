#!/bin/bash
# Nasıl Yapıldı: yemek illüstrasyonları (Google Gemini görsel modeli, kasa: gemini_api_anahtar). Kendi üretimimiz → telif sorunu yok.
# Girdi: ./istek/*.json {"ad":"tantuni","istem":"..."}  Çıktı: ./cikti/<ad>.png
set -u
G=$(/opt/aesun/kasa_coz.sh gemini_api_anahtar 2>/dev/null) || G=$(/opt/aesun/kasa_coz.sh gemini_api_key 2>/dev/null) || G=""
[ -n "$G" ] || { echo "NOT: gemini anahtarı yok"; exit 0; }
mkdir -p cikti
python3 - "$G" <<'PY'
import json, sys, glob, os, base64, time, hashlib, urllib.request, urllib.error
G = sys.argv[1]; U = "https://generativelanguage.googleapis.com/v1beta"
def get(u): return json.load(urllib.request.urlopen(urllib.request.Request(u, headers={"x-goog-api-key": G}), timeout=30))
ml = [m["name"].split("/")[1] for m in get(f"{U}/models?pageSize=200").get("models", []) if "image" in m["name"] and "generateContent" in m.get("supportedGenerationMethods", [])]
print("NOT: görsel modeller " + ",".join(ml[:8]))
ONB = "/opt/tampon/ny_gorsel"; os.makedirs(ONB, exist_ok=True)
STIL = ("Flat vector illustration, top-down view of a single Turkish dish on a round plate, bold clean outlines, warm vibrant colors, "
        "soft shadow, centered, plain solid light cream background, no text, no letters, no logo, no hands, no people. Dish: ")
for jf in sorted(glob.glob("istek/*.json")):
    for it in json.load(open(jf, encoding="utf-8")):
        ad = it["ad"]; istem = STIL + it["istem"]; h = hashlib.md5(istem.encode()).hexdigest()[:10]; onb = f"{ONB}/{ad}_{h}.png"
        if os.path.exists(onb): open(f"cikti/{ad}.png", "wb").write(open(onb, "rb").read()); print(f"NOT: {ad} önbellekten"); continue
        ok = False
        for model in ml:
            g = {"contents": [{"parts": [{"text": istem}]}], "generationConfig": {"responseModalities": ["IMAGE"]}}
            try:
                r = urllib.request.Request(f"{U}/models/{model}:generateContent", data=json.dumps(g).encode(), headers={"x-goog-api-key": G, "Content-Type": "application/json"}, method="POST")
                y = json.load(urllib.request.urlopen(r, timeout=180))
                for p in y["candidates"][0]["content"]["parts"]:
                    if "inlineData" in p:
                        b = base64.b64decode(p["inlineData"]["data"]); open(onb, "wb").write(b); open(f"cikti/{ad}.png", "wb").write(b); ok = True; break
                if ok: print(f"NOT: {ad} tamam ({model})"); break
            except urllib.error.HTTPError as e: print(f"NOT: {ad} {model} HTTP {e.code} {e.read().decode('utf-8','replace')[:120]}")
            except Exception as e: print(f"NOT: {ad} {model} {e}")
        time.sleep(6)
PY
