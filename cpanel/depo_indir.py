#!/usr/bin/env python3
"""cPanel ~/ae_veri/depo ve anahtarlar.json'u (yalnız özetler) yerel klasöre indirir — ns1'e taşıma için. Değer yazdırmaz."""
import json, os, ssl, sys, urllib.parse, urllib.request
from pathlib import Path
H, U, T = os.environ.get("CP_HOST", "aksarayenerji.net"), os.environ["CP_USER"], os.environ["CP_TOKEN"]
HEDEF = Path(sys.argv[1] if len(sys.argv) > 1 else "tasi")
ctx = ssl._create_unverified_context()
def istek(yol):
    with urllib.request.urlopen(urllib.request.Request(f"https://{H}:2083/{yol}", headers={"Authorization": f"cpanel {U}:{T}"}), context=ctx, timeout=120) as r:
        return json.loads(r.read().decode())
ev = istek("execute/DomainInfo/single_domain_data?" + urllib.parse.urlencode({"domain": "portal.aksarayenerji.net"}))["data"]["homedir"]
KOK = ev + "/ae_veri"
def oku(d, f):
    return istek("execute/Fileman/get_file_content?" + urllib.parse.urlencode({"dir": d, "file": f}))["data"]["content"]
say, bayt = 0, 0
def gez(d, rel):
    global say, bayt
    ls = istek("execute/Fileman/list_files?" + urllib.parse.urlencode({"dir": d, "types": "file|dir"})).get("data") or []
    for x in ls:
        ad = x.get("file"); tip = x.get("type")
        if tip == "dir":
            gez(d + "/" + ad, rel + ad + "/")
        elif ad.endswith(".json"):
            try:
                c = oku(d, ad)
            except Exception as e:
                print(f"::warning::okunamadı {rel}{ad}: {str(e)[:120]}"); continue
            p = HEDEF / "depo" / (rel + ad); p.parent.mkdir(parents=True, exist_ok=True); p.write_text(c, encoding="utf-8")
            say += 1; bayt += len(c)
try:
    gez(KOK + "/depo", "")
except Exception as e:
    print(f"::error::liste hatası: {str(e)[:300]}"); raise
try:
    (HEDEF / "anahtarlar.json").write_text(oku(KOK, "anahtarlar.json"), encoding="utf-8")
except Exception as e:
    print(f"::error::anahtarlar.json: {str(e)[:300]}"); raise
ad = list(json.loads((HEDEF / "anahtarlar.json").read_text()).keys())
print(f"::notice::depo: {say} dosya, {bayt//1024} KB · toplayıcı anahtar özetleri: {', '.join(ad)}")
