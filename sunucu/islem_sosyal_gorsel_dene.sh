#!/bin/bash
# Salt okunur deneme: Gemini anahtarıyla görsel üretilebiliyor mu (hangi model, ücretsiz katman izin veriyor mu). Anahtar yazdırılmaz.
G=$(/opt/aesun/kasa_coz.sh gemini_api_key 2>/dev/null) || { echo "NOT: gemini_api_key yok"; exit 0; }
G="$G" python3 - <<'PY'
import json, os, time, urllib.request, urllib.error
k = os.environ["G"]
def iste(url, govde=None):
    r = urllib.request.Request(url, data=json.dumps(govde).encode() if govde else None,
                               headers={"x-goog-api-key": k, "Content-Type": "application/json", "User-Agent": "SosyalStudyo/1.0"})
    try:
        return 200, json.load(urllib.request.urlopen(r, timeout=120))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"{}")
_, m = iste("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200")
adlar = [x["name"].split("/")[-1] for x in m.get("models", [])]
gorsel = [a for a in adlar if "image" in a or "imagen" in a]
print("NOT: görsel modelleri:", gorsel)
istem = "A cute 2D cartoon illustration of a Victorian lady in a big crinoline dress, vivid colors, vertical 9:16, no text, no letters, no logos"
for a in [x for x in gorsel if "imagen" not in x][:6]:
    t = time.time()
    kod, d = iste(f"https://generativelanguage.googleapis.com/v1beta/models/{a}:generateContent",
                  {"contents": [{"parts": [{"text": istem}]}], "generationConfig": {"responseModalities": ["TEXT", "IMAGE"]}})
    resim = any("inlineData" in p for c in d.get("candidates", []) for p in c.get("content", {}).get("parts", []))
    print(f"NOT: {a}: HTTP {kod} · görsel geldi: {resim} · {time.time()-t:.0f} sn · {str(d.get('error', {}).get('message', ''))[:160]}")
for a in [x for x in gorsel if "imagen" in x][:2]:
    kod, d = iste(f"https://generativelanguage.googleapis.com/v1beta/models/{a}:predict",
                  {"instances": [{"prompt": istem}], "parameters": {"sampleCount": 1, "aspectRatio": "9:16"}})
    print(f"NOT: {a}: HTTP {kod} · görsel geldi: {bool(d.get('predictions'))} · {str(d.get('error', {}).get('message', ''))[:160]}")
PY
