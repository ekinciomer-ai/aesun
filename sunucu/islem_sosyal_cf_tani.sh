#!/bin/bash
# Salt okunur: kasadaki Cloudflare anahtarı geçerli mi, hangi izinleri görüyor (değer yazdırılmaz).
CF=$(/opt/aesun/kasa_coz.sh cloudflare_dns_anahtari 2>/dev/null) || { echo "NOT: kasada cloudflare_dns_anahtari yok"; exit 0; }
CF="$CF" python3 - <<'PY'
import json, os, urllib.request, urllib.error
t = os.environ["CF"]
print(f"NOT: anahtar uzunluğu {len(t)} · boşluk/satır sonu {'VAR' if t != t.strip() or chr(10) in t else 'yok'}")
def iste(yol):
    r = urllib.request.Request("https://api.cloudflare.com/client/v4/" + yol, headers={"Authorization": "Bearer " + t.strip()})
    try:
        return json.load(urllib.request.urlopen(r, timeout=30))
    except urllib.error.HTTPError as e:
        try: return json.loads(e.read())
        except Exception: return {"success": False, "errors": [{"code": e.code}]}
v = iste("user/tokens/verify")
print("NOT: doğrulama:", v.get("success"), (v.get("result") or {}).get("status"), [e.get("code") for e in v.get("errors", [])], [e.get("message", "")[:80] for e in v.get("errors", [])])
z = iste("zones?name=cutkoda.com")
print("NOT: bölge listesi:", z.get("success"), len(z.get("result") or []), [e.get("code") for e in z.get("errors", [])], [e.get("message", "")[:80] for e in z.get("errors", [])])
PY
