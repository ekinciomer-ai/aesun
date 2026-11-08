#!/usr/bin/env python3
"""aksarayenerji.net DNS bölgesi: listele | ekle <ad> <ip> | tasi <ad1,ad2> <eski_ip> <yeni_ip>.
ekle yalnız yeni A kaydı ekler. tasi yalnız verilen adların, değeri eski_ip olan A kayıtlarını yeni_ip yapar (TTL 300)."""
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

if len(sys.argv) >= 5 and sys.argv[1] == "tasi":
    adlar, eski, yeni_ip = sys.argv[2].split(","), sys.argv[3], sys.argv[4]
    seri = next((r for r in z["data"] if r.get("record_type") == "SOA"), None)
    soa = int(veri(seri)[2]) if seri else None
    duzen = []
    for r in kayit:
        a = ad(r).rstrip(".").removesuffix("." + BOLGE)
        if r.get("record_type") == "A" and a in adlar:
            if veri(r) == [eski]:
                duzen.append({"line_index": r["line_index"], "dname": a, "ttl": 300, "record_type": "A", "data": [yeni_ip]})
            else:
                print(f"::notice::{a} eski IP'de değil, dokunulmadı")
    if duzen:
        q = {"zone": BOLGE, "serial": soa, "edit": [json.dumps(d) for d in duzen]}
        r = istek("execute/DNS/mass_edit_zone?" + urllib.parse.urlencode(q, doseq=True))
        print("::notice::taşıma " + ("tamam" if r.get("status") else "HATA " + str(r.get("errors"))) + ": " + ",".join(d["dname"] for d in duzen) + " → " + yeni_ip)
