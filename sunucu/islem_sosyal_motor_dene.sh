#!/bin/bash
# Her hazır motora kısa bir gerçek çağrı yapar; OpenRouter'daki ücretsiz modelleri listeler. Anahtar yazdırılmaz.
# Deneme çağrıları sayaca girmez (motor doğrudan çağrılır).
docker exec -i sosyal-studyo python - <<'PY'
import json, os, time, urllib.request
from sosyal import motorlar
for ad, m in motorlar.hepsi().items():
    if ad == "deneme" or not m.hazir():
        continue
    t = time.time()
    try:
        c = m.yaz("Kısa cevap ver.", "Yalnız şunu yaz: tamam", 0.0)
        print(f"NOT: {ad} ({m.model}): ÇALIŞIYOR · {time.time()-t:.1f} sn · cevap: {c[:40]!r}")
    except Exception as e:
        print(f"NOT: {ad} ({m.model}): HATA · {str(e)[:220]}")
k = os.getenv("OPENROUTER_API_KEY")
if k:
    r = urllib.request.Request("https://openrouter.ai/api/v1/models", headers={"Authorization": "Bearer " + k})
    ms = json.load(urllib.request.urlopen(r, timeout=30)).get("data", [])
    ucretsiz = [x for x in ms if x["id"].endswith(":free")]
    ucretsiz.sort(key=lambda x: -(x.get("context_length") or 0))
    print("NOT: OpenRouter ücretsiz model sayısı:", len(ucretsiz))
    for x in ucretsiz[:25]:
        print(f"NOT:   {x['id']} · bağlam {x.get('context_length')}")
    r = urllib.request.Request("https://openrouter.ai/api/v1/key", headers={"Authorization": "Bearer " + k})
    try:
        d = json.load(urllib.request.urlopen(r, timeout=30)).get("data", {})
        print("NOT: OpenRouter hesap: ücretsiz katman", d.get("is_free_tier"), "· sınır", d.get("limit"), "· kullanım", d.get("usage"))
    except Exception as e:
        print("NOT: OpenRouter hesap bilgisi alınamadı", str(e)[:100])
PY
