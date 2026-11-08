#!/usr/bin/env python3
"""Kozmos Lab uzay görsel arşivi: indir, doğrula, 4K yatay + dikey (Shorts) sürümlerini çıkar.
Kaldığı yerden devam eder (geçerli dosyayı yeniden indirmez). Kredi/lisans bilgisi manifest.json'a yazılır.
Kullanım: python3 arsiv_indir.py <liste.json> <hedef_klasör>"""
import json, os, re, shutil, sys, time, urllib.parse, urllib.request

LISTE, HEDEF = sys.argv[1], sys.argv[2]
UA = {"User-Agent": "KozmosArsiv/1.0 (+portal.aksarayenerji.net)"}
MIN_BOS_GB = 25            # disk bu sınırın altına inerse indirme durur
TAM_KENAR = 6000           # bundan büyük kayıtlı görsel yeniden indirilmez
MIN_KENAR = 2000           # en uzun kenarı bundan küçük görsel arşive alınmaz
MAX_BAYT = 2 * 1024**3
os.makedirs(HEDEF, exist_ok=True)
DURUM = os.path.join(HEDEF, "durum.json")
MANIFEST = os.path.join(HEDEF, "manifest.json")

try:
    from PIL import Image
    Image.MAX_IMAGE_PIXELS = None
except ImportError:
    Image = None

manifest = {}
if os.path.exists(MANIFEST):
    try: manifest = {m["dosya"]: m for m in json.load(open(MANIFEST))}
    except Exception: manifest = {}
durum = {"basla": time.strftime("%Y-%m-%d %H:%M"), "tamam": 0, "atlandi": 0, "hata": [], "su_an": "", "bitti": False}

def kaydet():
    durum["guncel"] = time.strftime("%Y-%m-%d %H:%M:%S")
    durum["toplam_gb"] = round(sum(m.get("bayt", 0) for m in manifest.values()) / 1024**3, 2)
    durum["adet"] = len(manifest)
    for yol, veri in ((DURUM, durum), (MANIFEST, sorted(manifest.values(), key=lambda m: m["dosya"]))):
        g = yol + ".gecici"
        json.dump(veri, open(g, "w"), ensure_ascii=False, indent=1)
        os.replace(g, yol)   # yarım yazılmış dosya kalmaz

def bos_gb():
    return shutil.disk_usage(HEDEF).free / 1024**3

def getir(url, zaman=60):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=zaman)

def indir(url, yol):
    g = yol + ".parca"
    for deneme in range(3):
        try:
            with getir(url, 120) as r, open(g, "wb") as f:
                if r.status != 200: return False
                n = 0
                while True:
                    b = r.read(1 << 20)
                    if not b: break
                    n += len(b)
                    if n > MAX_BAYT: raise IOError("dosya çok büyük")
                    f.write(b)
            os.replace(g, yol)
            return True
        except urllib.error.HTTPError as e:
            if e.code in (403, 404): break
        except Exception:
            time.sleep(5 * (deneme + 1))
    if os.path.exists(g): os.remove(g)
    return False

def olcu(yol):
    if not Image: return (0, 0)
    try:
        with Image.open(yol) as im: return im.size
    except Exception: return (0, 0)

def turevler(yol, kat, ad):
    """4K yatay (3840x2160) ve dikey (2160x3840) ortadan kırpılmış JPEG; orijinal pan/zoom için korunur."""
    if not Image: return {}
    cik = {}
    for tur, (W, H) in (("4k", (3840, 2160)), ("dikey", (2160, 3840))):
        hedef = os.path.join(HEDEF, tur, kat, ad + ".jpg")
        if os.path.exists(hedef): cik[tur] = os.path.relpath(hedef, HEDEF); continue
        try:
            with Image.open(yol) as im:
                if im.format == "JPEG": im.draft("RGB", (W * 2, H * 2))   # dev JPEG'lerde belleği korur
                im = im.convert("RGB")
                w, h = im.size
                o = max(W / w, H / h)
                if o > 1.0: continue          # kaynak bu boyutu doldurmuyorsa büyütme yapılmaz
                yw, yh = round(w * o), round(h * o)
                im = im.resize((yw, yh), Image.LANCZOS)
                x, y = (yw - W) // 2, (yh - H) // 2
                os.makedirs(os.path.dirname(hedef), exist_ok=True)
                im.crop((x, y, x + W, y + H)).save(hedef, "JPEG", quality=93, subsampling=0)
                cik[tur] = os.path.relpath(hedef, HEDEF)
        except Exception as e:
            durum["hata"].append(f"{ad} {tur}: {str(e)[:80]}")
    return cik

def ekle(ad, kat, urls, kaynak, kredi, lisans, baslik, sayfa):
    if bos_gb() < MIN_BOS_GB:
        durum["hata"].append(f"disk boş alanı {MIN_BOS_GB} GB altına indi, durduruldu"); return "dur"
    for url in urls:
        uz = os.path.splitext(urllib.parse.urlparse(url).path)[1].lower() or ".jpg"
        yol = os.path.join(HEDEF, "orijinal", kat, ad + uz)
        rel = os.path.relpath(yol, HEDEF)
        os.makedirs(os.path.dirname(yol), exist_ok=True)
        eski = manifest.get(rel)
        if eski and os.path.exists(yol) and (eski.get("indirme") == urls[0] or max(eski["genislik"], eski["yukseklik"]) >= TAM_KENAR):
            durum["atlandi"] += 1; return "var"
        # aynı görselin eski/küçük kopyası ya da başka kategorideki kaydı temizlenir (yerine tam sürüm gelecek)
        for k, m in list(manifest.items()):
            if m["ad"] == ad:
                for f in [k] + list(m.get("turev", {}).values()):
                    try: os.remove(os.path.join(HEDEF, f))
                    except OSError: pass
                del manifest[k]
        durum["su_an"] = f"{ad} ← {url}"; kaydet()
        if not indir(url, yol): continue
        w, h = olcu(yol)
        if Image and max(w, h) < MIN_KENAR:
            os.remove(yol); continue
        manifest[rel] = {"dosya": rel, "ad": ad, "kategori": kat, "baslik": baslik, "genislik": w, "yukseklik": h,
                         "bayt": os.path.getsize(yol), "kaynak": kaynak, "sayfa": sayfa, "indirme": url,
                         "kredi": kredi, "lisans": lisans, "turev": turevler(yol, kat, ad)}
        durum["tamam"] += 1; kaydet()
        return "ok"
    durum["hata"].append(f"{ad}: indirilemedi")
    return "yok"

L = json.load(open(LISTE))

# 1) ESA Hubble / Webb: tam çözünürlüklü yayın JPEG'i, yoksa büyük JPEG
for e in L.get("esa", []):
    site, i = e["site"], e["id"]
    sayfa = f"https://{site}.org/images/{i}/"
    baslik, kredi = i, ("ESA/Hubble & NASA" if site == "esahubble" else "ESA/Webb, NASA & CSA")
    try:
        html = getir(sayfa, 30).read().decode("utf-8", "ignore")
        m = re.search(r'<meta property="og:title" content="([^"]+)"', html) or re.search(r"<title>([^<|]+)", html)
        if m: baslik = m.group(1).strip()
        m = re.search(r'Credit:</h3>\s*<div[^>]*>(.*?)</div>', html, re.S) or re.search(r'class="credit"[^>]*>(.*?)</', html, re.S)
        if m: kredi = re.sub(r"<[^>]+>|\s+", " ", m.group(1)).strip()[:300] or kredi
    except Exception:
        pass
    cdn = f"https://cdn.{site}.org/archives/images"
    r = ekle(f"{site.replace('esa', '')}_{i}", e["kategori"], [f"{cdn}/large/{i}.jpg", f"https://{site}.org/media/archives/images/original/{i}.tif",
              f"https://{site}.org/media/archives/images/publicationtiff10k/{i}.tif", f"{cdn}/publicationjpg/{i}.jpg"],
             site, kredi, "CC BY 4.0 (kredi zorunlu)", baslik, sayfa)
    if r == "dur": break

# 2) Doğrudan NASA bağlantıları
for d in L.get("dogrudan", []):
    if ekle(d["ad"], d["kategori"], [d["url"]], "nasa", d["kredi"], "Kamu malı (NASA)", d["ad"], d["url"]) == "dur": break

# 3) NASA Image and Video Library araması: her sorgudan en iyi N görselin orijinali
YASAK = re.compile(r"©|copyright|getty|reuters|associated press", re.I)
for s in L.get("nasa_arama", []):
    try:
        q = urllib.parse.urlencode({"q": s["q"], "media_type": "image"})
        ogeler = json.load(getir(f"https://images-api.nasa.gov/search?{q}", 60))["collection"]["items"]
    except Exception as e:
        durum["hata"].append(f"arama {s['q']}: {str(e)[:60]}"); continue
    alinan = 0
    for o in ogeler:
        if alinan >= s.get("adet", 3): break
        v = (o.get("data") or [{}])[0]
        nid = v.get("nasa_id", "")
        if not nid or YASAK.search(json.dumps(v, ensure_ascii=False)): continue
        try:
            varlik = [x["href"] for x in json.load(getir(f"https://images-api.nasa.gov/asset/{urllib.parse.quote(nid)}", 60))["collection"]["items"]]
        except Exception:
            continue
        aday = [u for u in varlik if "~orig." in u and u.lower().endswith((".jpg", ".jpeg", ".png", ".tif", ".tiff"))]
        aday += [u for u in varlik if "~large." in u]
        aday = [u.replace("http://", "https://") for u in aday]
        if not aday: continue
        ad = "nasa_" + re.sub(r"[^A-Za-z0-9_-]+", "_", nid)[:60]
        kredi = "NASA" + (f" / {v['center']}" if v.get("center") else "") + (f" / {v['photographer']}" if v.get("photographer") else "")
        r = ekle(ad, s["kategori"], aday, "nasa", kredi, "Kamu malı (NASA)", v.get("title", nid),
                 f"https://images.nasa.gov/details/{urllib.parse.quote(nid)}")
        if r == "dur": break
        if r in ("ok", "var"): alinan += 1

durum["bitti"], durum["su_an"] = True, ""
kaydet()
print(f"bitti: {len(manifest)} görsel, {durum['toplam_gb']} GB, {len(durum['hata'])} hata")
