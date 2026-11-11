"""Keşif → "Denenen" görünümünün verisini üretir: docs/kesif/denenen.json

Kaynaklar (hepsi depoda, GDEO ve tampon hattı yazar):
  gdeo/gfad/oneriler.json   GFAD önerileri ve durumları
  gdeo/ou/kararlar.json     OU kararları (tampon_sonuc özeti dahil)
  tampon/sonuc/<id>.json    yalıtılmış deneme sonucu (durum, süre, güvenlik bulgusu)
  gdeo/rapor/*.md           günlük raporlar (son rapor metni sayfada açılır)
  gdeo/kasif/*.json         adayların güvenlik notları
  docs/kesif/gdeo-rapor.json son raporun özeti
Yapay zekâ kullanmaz; eksik dosyada sessizce boş geçer.
"""
import glob, json, os, re
from datetime import datetime, timezone

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
yol = lambda *p: os.path.join(KOK, *p)


def oku(p, varsayilan):
    try:
        with open(p, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return varsayilan


def main():
    oneriler = oku(yol("gdeo", "gfad", "oneriler.json"), [])
    kararlar = oku(yol("gdeo", "ou", "kararlar.json"), [])
    ozet = oku(yol("docs", "kesif", "gdeo-rapor.json"), {})
    son_karar = {}
    for k in kararlar:  # aynı öneri için en son karar geçerli
        if k.get("gfad_id"):
            son_karar[k["gfad_id"]] = k

    araclar = []
    for o in oneriler:
        i = o.get("id")
        k = son_karar.get(i, {})
        t = oku(yol("tampon", "sonuc", f"{i}.json"), None)
        durum = (k.get("karar") or o.get("durum") or "").replace("OU'da", "degerlendirmede")
        test = None
        if t:
            test = {"durum": t.get("durum"), "sure_sn": t.get("sure_sn"),
                    "guvenlik": t.get("guvenlik_bulgusu") or [],
                    "tarih": datetime.fromtimestamp(os.path.getmtime(yol("tampon", "sonuc", f"{i}.json")),
                                                    timezone.utc).strftime("%Y-%m-%d")}
        araclar.append({
            "id": i, "ad": o.get("ad"), "url": o.get("url"), "puan": o.get("puan"),
            "hedef": o.get("hedef_sistem"), "fayda": o.get("beklenen_fayda") or (k.get("fayda_zarar") or {}).get("kazanc"),
            "risk": o.get("risk") or (k.get("fayda_zarar") or {}).get("risk"),
            "durum": "iade" if durum.startswith("iade") else durum or "degerlendirmede",
            "iade_gerekcesi": o.get("iade_gerekcesi"), "tekrar_kosulu": o.get("tekrar_degerlendirme_kosulu"),
            "tarih": o.get("tarih"), "test": test,
            "test_ozeti": k.get("tampon_sonuc") if isinstance(k.get("tampon_sonuc"), str) else None,
            "yapilanlar": k.get("yapilanlar") or [], "geri_donus": k.get("geri_donus"),
        })
    araclar.sort(key=lambda a: (a.get("tarih") or "", a.get("puan") or 0), reverse=True)

    # Güvenlik uyarıları: rapor özetleri + KAŞİF notlarında "önerilmez/zararlı/şişirme" geçenler (tekrarsız)
    guv, gor = [], set()
    for f in sorted(glob.glob(yol("gdeo", "kasif", "*.json")), reverse=True):
        veri = oku(f, [])
        for a in (veri if isinstance(veri, list) else veri.get("guvenlik", [])):
            n = " — ".join(x for x in (a.get("guvenlik_notu") or a.get("bulgu"), a.get("karar")) if x)
            if re.search(r"önerilmez|zararl|şişirme|RİSK|önerme", n, re.I) and a.get("ad") not in gor:
                gor.add(a.get("ad"))
                guv.append({"ad": a.get("ad"), "url": a.get("url"), "not": n, "tarih": os.path.basename(f)[:10]})
    for g in ozet.get("guvenlik") or []:
        if not any(x["ad"] and x["ad"].split("/")[-1].lower() in g.lower() for x in guv):
            guv.append({"ad": None, "url": None, "not": g, "tarih": ozet.get("tarih")})

    raporlar = sorted(glob.glob(yol("gdeo", "rapor", "*.md")), reverse=True)
    son_rapor = open(raporlar[0], encoding="utf-8").read() if raporlar else ""

    cikti = {
        "uretildi": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M"),
        "son_calisma": {"tarih": ozet.get("tarih"), "aday": ozet.get("aday"), "oneri": ozet.get("oneri"),
                        "depoya_yazildi": ozet.get("depo_yazildi", True)},
        "sayilar": {d: sum(a["durum"] == d for a in araclar) for d in ("entegre", "tampon_denemede", "iade", "degerlendirmede")},
        "araclar": araclar, "guvenlik": guv[:30],
        "rapor": {"tarih": os.path.basename(raporlar[0])[:10] if raporlar else None, "metin": son_rapor[:12000],
                  "gecmis": [os.path.basename(r)[:10] for r in raporlar[:30]]},
    }
    p = yol("docs", "kesif", "denenen.json")
    with open(p, "w", encoding="utf-8") as f:
        json.dump(cikti, f, ensure_ascii=False, indent=1)
    print(f"denenen.json: {len(araclar)} araç, {len(guv)} güvenlik uyarısı, son rapor {cikti['rapor']['tarih']}")


MEDYA = {".jpg": "img", ".jpeg": "img", ".png": "img", ".webp": "img", ".gif": "img", ".svg": "img",
         ".mp4": "video", ".webm": "video", ".mp3": "ses", ".wav": "ses"}


def ornekler():
    """Tampon denemelerinin görsel/video çıktılarını Keşif kartlarına bağlar: docs/kesif/ornek.json + ornek/<id>/"""
    import shutil
    harita = oku(yol("tampon", "ornek_harita.json"), {})
    hedef = yol("docs", "kesif", "ornek")
    shutil.rmtree(hedef, ignore_errors=True)
    sonuc = {}
    for f in sorted(glob.glob(yol("tampon", "sonuc", "*.json"))):
        i = os.path.basename(f)[:-5]
        d = oku(yol("tampon", "deneme", f"{i}.json"), {})
        h = harita.get(i) or {}
        arac = d.get("arac") or h.get("arac")
        klasor = yol("tampon", "sonuc", i)
        if not arac or not os.path.isdir(klasor):
            continue
        t = oku(f, {})
        dosyalar = []
        for m in sorted(os.listdir(klasor)):
            tur = MEDYA.get(os.path.splitext(m)[1].lower())
            if not tur:
                continue
            os.makedirs(os.path.join(hedef, i), exist_ok=True)
            shutil.copy2(os.path.join(klasor, m), os.path.join(hedef, i, m))
            dosyalar.append({"f": f"ornek/{i}/{m}", "tur": tur, "ad": m})
        if not dosyalar:
            continue
        kayit = [l for l in (t.get("duman_sonu") or "").splitlines() if l.strip() and not l.startswith(("WARNING", "  ", "Downloading"))]
        sonuc.setdefault(arac, []).append({
            "id": i, "durum": t.get("durum"), "sure_sn": t.get("sure_sn"), "not": d.get("ornek_not") or h.get("not"),
            "tarih": datetime.fromtimestamp(os.path.getmtime(f), timezone.utc).strftime("%Y-%m-%d"),
            "dosyalar": dosyalar, "kayit": kayit[-8:]})
    with open(yol("docs", "kesif", "ornek.json"), "w", encoding="utf-8") as fp:
        json.dump(sonuc, fp, ensure_ascii=False, indent=1)
    print(f"ornek.json: {len(sonuc)} araç, {sum(len(x['dosyalar']) for v in sonuc.values() for x in v)} dosya")


if __name__ == "__main__":
    main()
    ornekler()
