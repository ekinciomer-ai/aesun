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
