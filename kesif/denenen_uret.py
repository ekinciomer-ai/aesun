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


if __name__ == "__main__":
    main()
