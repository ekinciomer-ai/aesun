#!/usr/bin/env python3
"""aksarayenerji.net DNS bölgesi: listele | ekle <ad> <ip>. Yalnız A kaydı ekler; var olanı değiştirmez/silmez."""
import base64, json, os, ssl, sys, urllib.parse, urllib.request
H, U, T = os.environ.get("CP_HOST", "aksarayenerji.net"), os.environ["CP_USER"], os.environ["CP_TOKEN"]
BOLGE = "aksarayenerji.net"
ctx = ssl._create_unverified_context()
def istek(yol):
    with urllib.request.urlopen(urllib.request.Request(f"https://{H}:2083/{yol}", headers={"Authorization": f"cpanel {U}:{T}"}), context=ctx, timeout=60) as r:
        return json.loads(r.read().decode())
z = istek("execute/DNS/parse_zone?" + urllib.parse.urlencode({"zone": BOLGE}))
if not z.get("status"):
    print("::error::bölge okunamadı " + str(z.get("errors"))); sys.exit(1)
kayit = [r for r in z["data"] if r.get("type") == "record"]
ad = lambda r: base64.b64decode(r.get("dname_b64", "")).decode()
veri = lambda r: [base64.b64decode(x).decode() for x in r.get("data_b64", [])]
A = [(ad(r), veri(r)) for r in kayit if r.get("record_type") in ("A", "CNAME")]
print("::notice title=A/CNAME::" + " ¦ ".join(f"{a}→{','.join(v)}" for a, v in A)[:3500])
if len(sys.argv) >= 4 and sys.argv[1] == "ekle":
    yeni, ip = sys.argv[2], sys.argv[3]
    tam = yeni + "." + BOLGE + "."
    if any(a in (yeni, tam, yeni + "." + BOLGE) for a, _ in A):
        print(f"::notice::{yeni} zaten var, dokunulmadı"); sys.exit(0)
    seri = next((r for r in z["data"] if r.get("record_type") == "SOA"), None)
    soa = int(veri(seri)[2]) if seri else None
    q = {"zone": BOLGE, "serial": soa, "add": json.dumps({"dname": yeni, "ttl": 300, "record_type": "A", "data": [ip]})}
    r = istek("execute/DNS/mass_edit_zone?" + urllib.parse.urlencode(q))
    print("::notice::ekleme " + ("tamam" if r.get("status") else "HATA " + str(r.get("errors"))) + f": {yeni}.{BOLGE} A (sunucu IP)")
