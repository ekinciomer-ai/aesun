"""Wikimedia Commons'tan yalnız kamu malı / serbest lisanslı görselleri indirir (GitHub Actions'ta çalışır).
python3 commons_indir.py <istek.json> <çıktı klasörü>
istek.json: {"bolum": "...", "dosyalar": [{"ad": "x", "dosya": "File:....jpg"} | {"ad": "x", "ara": "arama", "adet": 3}]}
Lisans süzgeci: Public domain, PD-*, CC0, CC BY, CC BY-SA. Künye manifest.json'a yazılır. Genişlik en fazla 2400 px."""
import json, os, re, sys, time, urllib.parse, urllib.request
IST, OUT = sys.argv[1], sys.argv[2]; os.makedirs(OUT, exist_ok=True)
J = json.load(open(IST, encoding="utf-8"))
UA = {"User-Agent": "AntikStudyo-arsiv/1.0 (https://github.com/ekinciomer-ai/aesun; kamu malı görsel arşivi)"}
API = "https://commons.wikimedia.org/w/api.php"
IZIN = re.compile(r"(public domain|^pd|cc0|cc[- ]by(-sa)?( |$|-)|cc by)", re.I)
def api(**p):
    p.update(format="json", formatversion=2)
    with urllib.request.urlopen(urllib.request.Request(API + "?" + urllib.parse.urlencode(p), headers=UA), timeout=60) as r: return json.load(r)
def bilgi(baslik):
    d = api(action="query", titles=baslik, prop="imageinfo", iiprop="url|extmetadata|size|mime", iiurlwidth=2400)
    pg = d["query"]["pages"][0]
    if "imageinfo" not in pg: return None
    ii = pg["imageinfo"][0]; m = ii.get("extmetadata", {})
    g = lambda k: re.sub(r"<[^>]+>", "", m.get(k, {}).get("value", "")).strip()
    return {"baslik": pg["title"], "url": ii.get("thumburl") or ii["url"], "lisans": g("LicenseShortName"), "sanatci": g("Artist")[:160],
            "tarih": g("DateTimeOriginal")[:60], "aciklama": g("ImageDescription")[:200], "sayfa": ii.get("descriptionurl"), "mime": ii.get("mime"), "w": ii.get("width"), "h": ii.get("height")}
def indir(url, hedef):
    for dene in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r, open(hedef, "wb") as f: f.write(r.read())
            return True
        except Exception as e:
            print("  hata", e); time.sleep(4 * (dene + 1))
    return False
kayit = []
for d in J["dosyalar"]:
    adaylar = []
    if "dosya" in d: adaylar = [d["dosya"]]
    else:
        s = api(action="query", list="search", srsearch=d["ara"] + " filetype:bitmap", srnamespace=6, srlimit=25)
        adaylar = [x["title"] for x in s["query"]["search"]]
    n = 0
    for b in adaylar:
        if n >= d.get("adet", 1): break
        try: inf = bilgi(b)
        except Exception as e: print("bilgi hatası", b, e); continue
        if not inf or not inf["mime"] or not inf["mime"].startswith("image/") or "svg" in inf["mime"]: continue
        if not IZIN.search(inf["lisans"] or ""): print("  lisans uygun değil:", b, inf["lisans"]); continue
        if (inf["w"] or 0) < 700 and "dosya" not in d: continue
        ext = ".png" if "png" in inf["mime"] else ".jpg"
        ad = d["ad"] + (f"_{n+1}" if d.get("adet", 1) > 1 else "") + ext
        if indir(inf["url"], os.path.join(OUT, ad)):
            inf["ad"] = ad; kayit.append(inf); n += 1; print("OK", ad, inf["lisans"], b)
        time.sleep(1)
    if n == 0: kayit.append({"ad": d["ad"], "hata": "uygun görsel bulunamadı", "istek": d})
json.dump({"bolum": J["bolum"], "tarih": time.strftime("%Y-%m-%d %H:%M"), "dosyalar": kayit}, open(os.path.join(OUT, "manifest.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
