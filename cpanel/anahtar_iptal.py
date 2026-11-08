#!/usr/bin/env python3
"""cPanel ~/ae_veri/anahtarlar.json'dan verilen anahtar adını siler (yalnız SHA-256 özetleri; değer yazdırmaz)."""
import json, os, ssl, sys, urllib.parse, urllib.request
H, U, T = os.environ.get("CP_HOST", "aksarayenerji.net"), os.environ["CP_USER"], os.environ["CP_TOKEN"]
AD = sys.argv[1] if len(sys.argv) > 1 else "n8n"
ctx = ssl._create_unverified_context()
def istek(yol, veri=None):
    r = urllib.request.Request(f"https://{H}:2083/{yol}", data=urllib.parse.urlencode(veri).encode() if veri else None,
                               headers={"Authorization": f"cpanel {U}:{T}"})
    with urllib.request.urlopen(r, context=ctx, timeout=120) as y:
        return json.loads(y.read().decode())
ev = istek("execute/DomainInfo/single_domain_data?" + urllib.parse.urlencode({"domain": "portal.aksarayenerji.net"}))["data"]["homedir"]
KOK = ev + "/ae_veri"
d = json.loads(istek("execute/Fileman/get_file_content?" + urllib.parse.urlencode({"dir": KOK, "file": "anahtarlar.json"}))["data"]["content"])
if AD not in d:
    print(f"::notice::cPanel: '{AD}' zaten yok; kalan: {list(d)}"); sys.exit(0)
d.pop(AD)
s = istek("execute/Fileman/save_file_content", {"dir": KOK, "file": "anahtarlar.json", "content": json.dumps(d)})
if not s.get("status"):
    print("::error::kaydedilemedi: " + str(s.get("errors"))[:200]); sys.exit(1)
print(f"::notice::cPanel: '{AD}' silindi; kalan: {list(d)}")
