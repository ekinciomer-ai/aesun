"""NASA Image and Video Library'den (kamu malı) video arar ve indirir.
python3 nasa_indir.py <istek.json> <çıktı klasörü>
Çıktı: <klasör>/manifest.json (bütün bulunanlar + indirilenler, kredi bilgisiyle) ve <nasa_id>.mp4 dosyaları."""
import json, os, re, sys, time, urllib.parse, urllib.request

IST, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
J = json.load(open(IST, encoding="utf-8"))
API = "https://images-api.nasa.gov"
UA = {"User-Agent": "KozmosLab-arsiv/1.0"}
ANAHTAR = ["parmitano", "eva 23", "eva-23", "eva23", "water", "helmet", "cassidy", "expedition 36", "spacewalk", "nyberg"]

def getir(url, t=60):
    for d in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=t) as r:
                return r.read()
        except Exception as e:
            hata = e; time.sleep(3 * (d + 1))
    raise hata

def boyut(url):
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA, method="HEAD"), timeout=30) as r:
            return int(r.headers.get("Content-Length") or 0)
    except Exception:
        return 0

bulunan = {}
for q in J["sorgular"]:
    tur = "video"
    if isinstance(q, dict): tur = q.get("tur", "video"); q = q["q"]
    par = {"q": q, "media_type": tur}
    if J.get("tarih_bas"): par["year_start"] = J["tarih_bas"]
    u = f"{API}/search?" + urllib.parse.urlencode(par)
    try:
        d = json.loads(getir(u))
    except Exception as e:
        print("arama hatası", q, e); continue
    print("  bulunan (ham):", d.get("collection", {}).get("metadata", {}).get("total_hits"))
    for it in d.get("collection", {}).get("items", []):
        m = (it.get("data") or [{}])[0]
        nid = m.get("nasa_id")
        if not nid or nid in bulunan: continue
        if any(h in (m.get("title", "") + " " + nid).lower() for h in J.get("haric", [])): continue
        metin = (m.get("title", "") + " " + m.get("description", "")).lower()
        puan = sum(metin.count(k) for k in ANAHTAR) + (5 if "parmitano" in metin else 0) + (5 if re.search(r"eva[ -]?23", metin) else 0)
        bulunan[nid] = {"nasa_id": nid, "baslik": m.get("title", ""), "aciklama": m.get("description", "")[:1500],
                        "tarih": m.get("date_created", ""), "merkez": m.get("center", ""), "puan": puan, "tur": tur,
                        "sayfa": f"https://images.nasa.gov/details/{urllib.parse.quote(nid)}",
                        "lisans": "NASA, kamu malı (NASA Media Usage Guidelines)"}
    print("sorgu", q, "toplam", len(bulunan))

sirali = sorted(bulunan.values(), key=lambda x: -x["puan"])
indirilen = 0
resim = 0
for x in sirali:
    if x.get("tur") == "image":
        if resim >= J.get("en_cok_resim", 0) or x["puan"] < J.get("en_az_puan", 0): continue
    elif indirilen >= J.get("en_cok_video", 12) or x["puan"] < J.get("en_az_puan", 0): continue
    try:
        hrefs = [i["href"] for i in json.loads(getir(f"{API}/asset/{urllib.parse.quote(x['nasa_id'])}"))["collection"]["items"]]
    except Exception as e:
        x["hata"] = str(e)[:100]; continue
    hrefs = [h.replace("http://", "https://") for h in hrefs]
    secim = None
    sira = ("~orig.jpg", "~large.jpg", "~medium.jpg") if x.get("tur") == "image" else ("~medium.mp4", "~mobile.mp4", "~small.mp4", "~orig.mp4", ".mp4")
    for tur in sira:
        for h in hrefs:
            if h.lower().endswith(tur):
                b = boyut(h)
                if b and b <= J.get("en_buyuk_mb", 300) * 1024 * 1024:
                    secim = (h, b); break
        if secim: break
    if not secim:
        x["hata"] = "uygun boyutta dosya yok"; continue
    hedef = os.path.join(OUT, re.sub(r"[^A-Za-z0-9_.-]", "_", x["nasa_id"]) + (".jpg" if x.get("tur") == "image" else ".mp4"))
    try:
        open(hedef, "wb").write(getir(secim[0], 600))
        x["dosya"] = os.path.basename(hedef); x["kaynak_url"] = secim[0]; x["mb"] = round(secim[1] / 1048576, 1)
        if x.get("tur") == "image": resim += 1
        else: indirilen += 1
        print("indirildi", x["nasa_id"], x["mb"], "MB")
    except Exception as e:
        x["hata"] = str(e)[:100]

json.dump({"istek": J["bolum"], "tarih": time.strftime("%Y-%m-%d %H:%M"), "bulunan": sirali},
          open(os.path.join(OUT, "manifest.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("bitti", indirilen, "video,", len(sirali), "kayıt")
