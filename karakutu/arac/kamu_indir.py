"""Kara Kutu: kamu malı (ABD federal kurum) görüntüleri adres listesinden indirir.
python3 kamu_indir.py <istek.json> <çıktı klasörü>
istek.json: {"bolum": "...", "dosyalar": [{"ad": "x.mp4", "url": "https://...", "kaynak": "sayfa", "lisans": "Public Domain", "kredi": "..."}]}
Yalnız izinli alan adlarına gider (usgs.gov, nasa.gov, noaa.gov, ntsb.gov, fema.gov, dvidshub.net, loc.gov, archives.gov)."""
import json, os, re, sys, time, urllib.parse, urllib.request
IST, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
J = json.load(open(IST, encoding="utf-8"))
IZIN = ("usgs.gov", "nasa.gov", "noaa.gov", "ntsb.gov", "fema.gov", "dvidshub.net", "loc.gov", "archives.gov",
        "usgs-ocapsv2-public-input-media.s3.us-west-2.amazonaws.com")
UA = {"User-Agent": "KaraKutu-arsiv/1.0"}
kayit = []
for d in J["dosyalar"]:
    host = urllib.parse.urlparse(d["url"]).hostname or ""
    if not any(host == h or host.endswith("." + h) for h in IZIN):
        d["hata"] = "izinsiz alan adı"; kayit.append(d); continue
    hedef = os.path.join(OUT, re.sub(r"[^A-Za-z0-9_.-]", "_", d["ad"]))
    for dene in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(d["url"], headers=UA), timeout=900) as r, open(hedef, "wb") as f:
                while True:
                    b = r.read(1 << 20)
                    if not b: break
                    f.write(b)
            d["mb"] = round(os.path.getsize(hedef) / 1048576, 1); d.pop("hata", None); break
        except Exception as e:
            d["hata"] = str(e)[:120]; time.sleep(5 * (dene + 1))
    kayit.append(d); print(d["ad"], d.get("mb"), d.get("hata", "ok"))
json.dump({"bolum": J["bolum"], "tarih": time.strftime("%Y-%m-%d %H:%M"), "dosyalar": kayit},
          open(os.path.join(OUT, "manifest.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
