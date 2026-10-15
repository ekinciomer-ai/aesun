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
for ad, yol in [("passenger_list", "execute/PassengerApps/list_applications"),
                ("features", "execute/Features/list_features"),
                ("python_selector", "execute/LangPython/list_versions"),
                ("cl_python", "frontend/jupiter/lveversion/python-selector.live.pl"),
                ("ssh", "execute/SSH/get_port")]:
    v = get(yol)
    if ad == "features" and not v.startswith("HATA"):
        try:
            d = json.loads(v + "") if v.endswith("}") else None
        except Exception:
            d = None
        v = v[:300]
    sonuc.append(f"{ad}: {v[:180]!r}")
for s in sonuc:
    print("::notice::" + s.replace("\n", " "))
