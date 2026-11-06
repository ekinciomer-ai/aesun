#!/bin/bash
# Salt okunur: kasadaki Cloudflare anahtarı geçerli mi, hangi izinleri görüyor (değer yazdırılmaz).
CF=$(/opt/aesun/kasa_coz.sh cloudflare_dns_anahtari 2>/dev/null) || { echo "NOT: kasada cloudflare_dns_anahtari yok"; exit 0; }
CF="$CF" python3 - <<'PY'
import json, os, urllib.request, urllib.error
import re as _re
def _anahtar(ham):
    """Kasaya bütün curl komutu yapıştırıldıysa içinden 'Bearer <anahtar>' kısmı alınır."""
    m = _re.search(r"Bearer\s+([A-Za-z0-9_\-]{30,})", ham)
    return m.group(1) if m else ham.strip().strip('"').strip("'")
ham = os.environ["CF"]; t = _anahtar(ham)
print(f"NOT: kasadaki değer {len(ham)} karakter · komut içinden ayıklandı: {'evet' if t != ham.strip() else 'hayır'} · anahtar {len(t)} karakter")
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
