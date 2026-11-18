# Wikimedia Commons'tan serbest lisanslı yemek fotoğrafları (CC0 / kamu malı / CC BY öncelikli; yoksa CC BY-SA).
# Toplu: python3 yemek_gorsel.py gorsel/liste.json   (liste: [{"ad","ara","anahtar":[...], "sec": 0?}])
# Çıktı: motor/gorsel/yemek/<ad>.jpg (720 kare), motor/gorsel/yemek/lisans.json, gorsel/aday/<ad>.jpg (ilk 4 aday şeridi)
import json, sys, os, re, io, time, urllib.parse, urllib.request
from PIL import Image
KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); D = f"{KOK}/motor/gorsel/yemek"; A = f"{KOK}/gorsel/aday"
os.makedirs(D, exist_ok=True); os.makedirs(A, exist_ok=True)
H = {"User-Agent": "NasilYapildiBot/1.0 (egitim amacli kisa video; commons API)"}
def al(u, json_=False):
    for d in range(6):
        try:
            b = urllib.request.urlopen(urllib.request.Request(u, headers=H), timeout=60).read(); return json.loads(b) if json_ else b
        except urllib.error.HTTPError as e:
            if e.code == 429: time.sleep(20 * (d + 1)); continue
            raise
    raise RuntimeError("429 sürüyor")
def puan(l):
    l = (l or "").lower()
    if l in ("cc0", "public domain") or l.startswith("pd") or "public domain" in l: return 3
    if l.startswith("cc by") and "sa" not in l: return 2
    if l.startswith("cc by-sa"): return 1
    return 0
def norm(s): return s.lower().replace("ı", "i").replace("ş", "s").replace("ğ", "g").replace("ç", "c").replace("ö", "o").replace("ü", "u").replace("_", " ")
lf = f"{D}/lisans.json"; L = json.load(open(lf, encoding="utf-8")) if os.path.exists(lf) else {}
def isle(it):
    ad = it["ad"]
    if os.path.exists(f"{D}/{ad}.jpg") and "sec" not in it: return
    u = ("https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrlimit=30&prop=imageinfo"
         "&iiprop=url|extmetadata|size&iiurlwidth=900&format=json&gsrsearch=" + urllib.parse.quote(it["ara"]))
    d = al(u, True); ad_l = []
    for p in d.get("query", {}).get("pages", {}).values():
        ii = p["imageinfo"][0]; m = ii.get("extmetadata", {}); lis = m.get("LicenseShortName", {}).get("value", "")
        if puan(lis) == 0 or ii.get("width", 0) < 500 or not p["title"].lower().endswith((".jpg", ".jpeg", ".png")): continue
        if it.get("anahtar") and not any(norm(k) in norm(p["title"]) for k in it["anahtar"]): continue
        yazar = re.sub("<[^>]+>", "", m.get("Artist", {}).get("value", "")).strip()[:80]
        ad_l.append({"baslik": p["title"], "lisans": lis, "yazar": yazar, "sayfa": ii["descriptionurl"], "kucuk": ii["thumburl"], "p": puan(lis), "idx": p.get("index", 99)})
    ad_l.sort(key=lambda x: (-x["p"], x["idx"]))
    if not ad_l: print(f"::warning::{ad} serbest lisanslı görsel yok"); return
    imgs = []
    for a in ad_l[:4]:
        try:
            im = Image.open(io.BytesIO(al(a["kucuk"]))).convert("RGB"); w, h = im.size; s = min(w, h)
            imgs.append(im.crop(((w - s) // 2, (h - s) // 2, (w + s) // 2, (h + s) // 2)).resize((720, 720), Image.LANCZOS))
        except Exception as e: imgs.append(None); print("indirilemedi", a["baslik"], e)
        time.sleep(2)
    serit = Image.new("RGB", (240 * 4, 240), "white")
    for i, im in enumerate(imgs):
        if im: serit.paste(im.resize((240, 240)), (i * 240, 0))
    serit.save(f"{A}/{ad}.jpg", quality=80)
    json.dump(ad_l[:4], open(f"{A}/{ad}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    s = it.get("sec", 0)
    if s is not None and s < len(imgs) and imgs[s]:
        imgs[s].save(f"{D}/{ad}.jpg", quality=88); a = ad_l[s]
        L[ad] = {k: a[k] for k in ("baslik", "lisans", "yazar", "sayfa")}
        print(f"::notice::{ad} ← {a['baslik']} ({a['lisans']})")
    json.dump(L, open(lf, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    time.sleep(3)
for it in json.load(open(sys.argv[1], encoding="utf-8")):
    try: isle(it)
    except Exception as e: print(f"::warning::{it['ad']} atlandı: {e}"); time.sleep(30)
