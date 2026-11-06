#!/usr/bin/env python3
"""Wikimedia Commons'tan telifsiz/serbest lisanslı tarihi görsel bulur, dikey (1080x1920) kareye hazırlar.

Kullanım: commons_gorsel.py <cikti_klasoru> <terim1> <terim2> ...  (her terim bir cümleye karşılık gelir)
Çıktı: <cikti_klasoru>/g01.png ... ve kaynaklar.json (başlık, yazar, lisans, adres — video açıklamasına yazılır).
Kurallar: yalnız kamu malı / CC0 / CC BY / CC BY-SA; en az 1000 px; içinde okunur yazı olan görsel (tesseract) elenir.
Aynı görsel iki kez kullanılmaz. Bulunamayan terim için konu geneli (ilk terim) yedeği denenir.
"""
KONU = ""
import json, os, re, subprocess, sys, tempfile, urllib.parse, urllib.request

UA = {"User-Agent": "AksarayEnerjiMotor/1.0 (https://aksarayenerji.net)"}
API = "https://commons.wikimedia.org/w/api.php"
LISANS = re.compile(r"^(public domain|pd|cc0|cc by(-sa)? [\d.]+|cc by(-sa)?)", re.I)


def iste(url, sure=40):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=sure) as r:
        return r.read()


def ara(terim, adet=20):
    q = {"action": "query", "format": "json", "generator": "search", "gsrnamespace": "6", "gsrlimit": str(adet),
         "gsrsearch": f"{terim} filetype:bitmap", "prop": "imageinfo", "iiprop": "url|size|extmetadata",
         "iiurlwidth": "1600"}
    d = json.loads(iste(API + "?" + urllib.parse.urlencode(q)))
    sayfalar = sorted((d.get("query") or {}).get("pages", {}).values(), key=lambda p: p.get("index", 99))
    for p in sayfalar:
        ii = (p.get("imageinfo") or [{}])[0]
        m = ii.get("extmetadata") or {}
        lis = re.sub("<[^>]+>", "", (m.get("LicenseShortName") or {}).get("value", "")).strip()
        if not LISANS.match(lis) or max(ii.get("width", 0), ii.get("height", 0)) < 1000:
            continue
        yield {"baslik": p.get("title", ""), "lisans": lis, "adres": ii.get("descriptionurl", ""),
               "yazar": re.sub("<[^>]+>", "", (m.get("Artist") or {}).get("value", "")).strip()[:120],
               "kucuk": ii.get("thumburl") or ii.get("url")}


def yazi_var(yol):
    """Görselde okunur yazı (4+ harfli, güveni yüksek 3+ kelime) varsa True. tesseract yoksa False."""
    try:
        r = subprocess.run(["tesseract", yol, "-", "--psm", "11", "tsv"], capture_output=True, text=True, timeout=60)
    except Exception:
        return False
    kelime = 0
    for s in r.stdout.splitlines()[1:]:
        a = s.split("\t")
        if len(a) == 12 and a[11].strip() and float(a[10] or -1) > 75 and re.fullmatch(r"[A-Za-zÀ-ÿ]{4,}", a[11].strip()):
            kelime += 1
    return kelime >= 3


def ilgili_mi(yol, konu, terim):
    """Gemini (ücretsiz) görsele bakar: konu ve döneme uygun mu? Anahtar yoksa True (eleme yapılmaz)."""
    k = os.environ.get("GEMINI_KEY", "").strip()
    if not k:
        return True
    import base64
    try:
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", yol, "-vf", "scale=512:-1", yol + ".k.jpg"], check=True, timeout=60)
        resim = base64.b64encode(open(yol + ".k.jpg", "rb").read()).decode()
        os.unlink(yol + ".k.jpg")
        soru = (f"Video topic: {konu}. This scene: {terim}. Is this image a fitting illustration for this historical scene "
                "(a historical painting, engraving, map, manuscript, period artifact, or the real historical place)? "
                "Answer NO if it is a modern unrelated photo, a different place with the same name, a collage, a document page "
                "with mostly text, or a different era. Answer only YES or NO.")
        b = json.dumps({"contents": [{"parts": [{"text": soru}, {"inline_data": {"mime_type": "image/jpeg", "data": resim}}]}]}).encode()
        import time
        son = None
        for model, bekle in (("gemini-3.5-flash", 0), ("gemini-3.5-flash", 8), ("gemini-flash-lite-latest", 4), ("gemini-flash-lite-latest", 15)):
            time.sleep(bekle)
            try:
                r = urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                                           data=b, headers={"x-goog-api-key": k, "Content-Type": "application/json"})
                d = json.load(urllib.request.urlopen(r, timeout=90))
                t = "".join(p.get("text", "") for p in d["candidates"][0]["content"]["parts"]).strip().upper()
                time.sleep(2)   # ücretsiz kota: dakikadaki istek sınırına takılmamak için
                return t.startswith("YES")
            except urllib.error.HTTPError as e:
                son = e.code
        print(f"uyarı: ilgi kontrolü yapılamadı (HTTP {son}); görsel elendi", file=sys.stderr)
        return False
    except Exception as e:
        print(f"uyarı: ilgi kontrolü yapılamadı ({type(e).__name__}); görsel kabul edildi", file=sys.stderr)
        return True


def dikey(kaynak, hedef):
    """Bulanık arka plan + ortada tam görsel; alttaki altyazı bölgesi boş kalacak şekilde biraz yukarıda."""
    f = ("[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=30:2,eq=brightness=-0.08:saturation=1.15[a];"
         "[0:v]scale=1040:1400:force_original_aspect_ratio=decrease[b];[a][b]overlay=(W-w)/2:(H-h)/2-140")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", kaynak, "-filter_complex", f, "-frames:v", "1", hedef], check=True, timeout=120)


def main():
    global KONU
    cikti, terimler = sys.argv[1], sys.argv[2:]
    KONU = os.environ.get("KONU", terimler[0] if terimler else "")
    os.makedirs(cikti, exist_ok=True)
    kullanilan, kaynaklar = set(), []
    for i, terim in enumerate(terimler, 1):
        secilen = None
        for deneme in (terim, terim + " painting", terimler[0]):
            try:
                for g in ara(deneme):
                    if g["baslik"] in kullanilan:
                        continue
                    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as t:
                        t.write(iste(g["kucuk"], 90))
                    if yazi_var(t.name) or not ilgili_mi(t.name, KONU, terim):
                        os.unlink(t.name)
                        continue
                    secilen = (g, t.name)
                    break
            except Exception as e:
                print(f"uyarı: '{deneme}' aranamadı: {type(e).__name__}", file=sys.stderr)
            if secilen:
                break
        if not secilen:
            print(f"uyarı: '{terim}' için görsel bulunamadı", file=sys.stderr)
            continue
        g, gecici = secilen
        hedef = os.path.join(cikti, f"g{i:02d}.png")
        dikey(gecici, hedef)
        os.unlink(gecici)
        kullanilan.add(g["baslik"])
        kaynaklar.append({"dosya": os.path.basename(hedef), "terim": terim, **{k: g[k] for k in ("baslik", "yazar", "lisans", "adres")}})
    json.dump(kaynaklar, open(os.path.join(cikti, "kaynaklar.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(json.dumps({"gorsel": len(kaynaklar), "terim": len(terimler)}))


if __name__ == "__main__":
    main()
