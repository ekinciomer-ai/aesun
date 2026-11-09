# NASA GIBS (kamu malı) uydu görüntüsü indirir: her istek için birden çok tarih dener, en az bulutlu/boş olanı seçer.
import json, io, sys, urllib.request, datetime as dt
from PIL import Image
import numpy as np
W = "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi"
istek = json.load(open(sys.argv[1]))
sec = {}
for ad, r in istek.items():
    s, w, n, e = r["bbox"]
    gen = r.get("w", 2048); yuk = int(gen * (n - s) / (e - w)) if not r.get("h") else r["h"]
    tarihler = r.get("tarih") or [None]
    en = None
    for katman in r["katman"]:
        for t in tarihler:
            u = f"{W}?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS={katman}&CRS=EPSG:4326&BBOX={s},{w},{n},{e}&WIDTH={gen}&HEIGHT={yuk}&FORMAT=image/jpeg" + (f"&TIME={t}" if t else "")
            try:
                b = urllib.request.urlopen(u, timeout=90).read()
                im = Image.open(io.BytesIO(b)).convert("RGB")
            except Exception as x:
                print(ad, katman, t, "HATA", x); continue
            a = np.asarray(im).astype(float)
            m = a.mean(axis=2)
            puan = (m < 8).mean() * 3 + (m > 215).mean() * 2 + (a.std(axis=2) < 3).mean()
            print(ad, katman, t, round(puan, 3))
            if en is None or puan < en[0]:
                en = (puan, im, katman, t)
            if puan < 0.01: break
        if en and en[0] < 0.01: break
    if en:
        en[1].save(f"{ad}.jpg", quality=92)
        sec[ad] = {"katman": en[2], "tarih": en[3], "puan": round(en[0], 3), "bbox": r["bbox"]}
json.dump(sec, open("secim.json", "w"), indent=1)
print(json.dumps(sec, indent=1))
