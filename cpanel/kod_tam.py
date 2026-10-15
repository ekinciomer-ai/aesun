#!/usr/bin/env python3
"""cPanel'deki PHP dosyasını sır satırları maskelenmiş olarak yazdırır (yalnız okuma)."""
import json, os, re, ssl, sys, urllib.parse, urllib.request
H, U, T, ALAN = os.environ.get("CP_HOST", "aksarayenerji.net"), os.environ["CP_USER"], os.environ["CP_TOKEN"], os.environ.get("CP_ALAN", "portal.aksarayenerji.net")
ctx = ssl._create_unverified_context()
def istek(yol):
    with urllib.request.urlopen(urllib.request.Request(f"https://{H}:2083/{yol}", headers={"Authorization": f"cpanel {U}:{T}"}), context=ctx, timeout=60) as r:
        return json.loads(r.read().decode())
d = istek("execute/DomainInfo/single_domain_data?" + urllib.parse.urlencode({"domain": ALAN}))["data"]
gizli = re.compile(r"(['\"][A-Za-z0-9+/=_\-]{32,}['\"])")
for alt in sys.argv[1:]:
    yol, ad = (d["documentroot"] + "/" + alt.rsplit("/", 1)[0], alt.rsplit("/", 1)[1]) if "/" in alt else (d["documentroot"], alt)
    if alt.startswith("~/"):
        yol, ad = d["homedir"] + "/" + alt[2:].rsplit("/", 1)[0], alt.rsplit("/", 1)[1]
    try:
        c = istek("execute/Fileman/get_file_content?" + urllib.parse.urlencode({"dir": yol, "file": ad}))["data"]["content"]
    except Exception as e:
        print(f"::notice::{alt} okunamadı {e}"); continue
    satir = [gizli.sub("'***'", s) for s in c.splitlines()]
    for i in range(0, len(satir), 12):
        print(f"::notice title={alt} {i+1}-{i+12}::" + " ⏎ ".join(x.strip()[:200] for x in satir[i:i+12]))
