#!/usr/bin/env python3
"""cPanel yetenek tanısı (Python uygulaması desteği vb.). Sır yazdırmaz."""
import json, os, ssl, urllib.parse, urllib.request
H, U, T = os.environ.get("CP_HOST", "aksarayenerji.net"), os.environ["CP_USER"], os.environ.get("CP_TOKEN", "")
ctx = ssl._create_unverified_context()
def get(yol):
    r = urllib.request.Request(f"https://{H}:2083/{yol}", headers={"Authorization": f"cpanel {U}:{T}"})
    try:
        with urllib.request.urlopen(r, context=ctx, timeout=60) as x:
            return x.read().decode()[:400]
    except Exception as e:
        return f"HATA {getattr(e,'code',e)}"
sonuc = []
v = get("execute/Features/list_features")
try:
    d = json.loads(v if not v.startswith("HATA") else "{}")
except Exception:
    d = {}
r = urllib.request.Request(f"https://{H}:2083/execute/Features/list_features", headers={"Authorization": f"cpanel {U}:{T}"})
with urllib.request.urlopen(r, context=ctx, timeout=60) as x:
    d = json.loads(x.read().decode()).get("data") or {}
ilgili = sorted(k for k, v in d.items() if v and any(t in k.lower() for t in ("python", "node", "ruby", "passenger", "app", "ssh", "cron", "selector", "lve")))
print("::notice::özellikler: " + ", ".join(ilgili))
for u in ("https://epias-ptf-production.up.railway.app/", "https://epias-ptf-production.up.railway.app/giris"):
    try:
        with urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"}), timeout=30) as x:
            b = x.read().decode("utf-8", "ignore")
            import re as _re
            t = _re.search(r"<title>(.*?)</title>", b, _re.S)
            print(f"::notice::{u} → {x.status} {x.geturl()} başlık={t.group(1).strip()[:60] if t else '-'}")
    except Exception as e:
        b = e.read().decode("utf-8", "ignore")[:200] if hasattr(e, "read") else ""
        h = dict(e.headers) if hasattr(e, "headers") and e.headers else {}
        print(f"::notice::{u} → {getattr(e,'code',e)} gövde={b!r} server={h.get('Server')} x-railway={h.get('X-Railway-Fallback') or h.get('x-railway-fallback')}")
