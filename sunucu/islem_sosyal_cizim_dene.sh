#!/bin/bash
# Cloudflare Workers AI anahtarını tek deneme çizimiyle doğrular, sonra ilk içerik için çizgi film video işini sıraya koyar.
set -uo pipefail
cd /opt/sosyal && python3 - <<'PY'
import base64, sys
sys.path.insert(0, "/opt/sosyal")
import isci
a = isci.kasa("cloudflare_ai_anahtari")
print("NOT: anahtar", "var" if a else "YOK", len(a), "karakter")
h = isci._cf("accounts", anahtar=a)
hesap = (h.get("result") or [{}])[0].get("id")
print("NOT: hesap görünüyor:", bool(hesap), [e.get("message") for e in h.get("errors", [])][:2])
if hesap:
    d = isci._cf(f"accounts/{hesap}/ai/run/{isci.CF_MODEL}", {"prompt": isci.YZ_ETIKET and "2D cartoon illustration of a Victorian lady in a crinoline dress, vivid colors, no text", "steps": 4}, a)
    r = (d.get("result") or {}).get("image")
    print("NOT: deneme çizimi:", f"geldi ({len(base64.b64decode(r))//1024} KB)" if r else "HATA " + str(d.get("errors"))[:200])
PY
docker exec -i sosyal-studyo python - <<'PY'
from sosyal.uretim import Studyo
s = Studyo()
ic = s.h.icerikler(5)
print("NOT: içerikler:", [(x["id"], x["konu"][:50]) for x in ic])
if ic:
    try:
        j = s.arac_isi(ic[0]["id"], "video", stil="cizgi")
        print("NOT: çizgi film işi sırada:", j["id"], "·", len(j["istemler"]), "sahne")
        for x in j["istemler"][:8]:
            print("NOT:   sahne:", x[len("2D cartoon illustration, vivid bright colors, clean bold outlines, expressive friendly characters, historically accurate clothing and setting for the era, vertical composition. "):][:160])
    except Exception as e:
        print("NOT: iş oluşturulamadı:", str(e)[:300])
PY
