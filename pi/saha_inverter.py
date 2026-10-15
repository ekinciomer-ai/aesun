"""AEMonitoring · Sungrow (YD, Anka) ve Inavitas (AE) canlı inverter toplayıcı — 10 dakikada bir (crontab).

Çıktı (epias-ptf):
  n8n/sungrow_son.json   {"guncelleme", "santraller": {"5064453": {ad, anlik_kw, bugun_kwh, saatlik_bugun{"HH": kWh}, inverterler[]}, ...}}
  n8n/inavitas_son.json  aynı şema, santral "189"
Sungrow saatlik: santralin "günlük üretim" sayacının (83022) 10 dk'lık artışları okunduğu saate yazılır (~yerel durum
~/.aesun/sungrow_saat.json). Inavitas saatlik: portalın saatlik grafiği (GetPlantGraphic, D).
Giriş bilgileri ~/.aesun/osos.env (pi/inverter_kur.sh yazar): SUNGROW_APPKEY, SUNGROW_SECRET, SUNGROW_USER,
SUNGROW_PASSWORD, (SUNGROW_RSA_PUBLIC), INAVITAS_USER, INAVITAS_PASS. Koda/çıktıya yazılmaz.
"""
import json, os, sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ortak import AESUN, TR, gh, log  # noqa: E402


def env_yukle():
    f = AESUN / "osos.env"
    if f.exists():
        for s in f.read_text().splitlines():
            if "=" in s and not s.strip().startswith("#"):
                k, v = s.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


env_yukle()
os.environ.setdefault("SUNGROW_TOKEN_FILE", str(AESUN / "sungrow_token.json"))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "toplayicilar"))
SG_ADLAR = {"5064453": "Yılmaz Darılmaz GES", "5038906": "Anka Mineral GES (HG Yatırım)"}
DURUM = AESUN / "sungrow_saat.json"


def _yaz(yol, veri, mesaj):
    _, sha = gh(yol)
    gh(yol, veri, sha, mesaj)


def sungrow(simdi):
    import sungrow_collector as S
    cli = S.SungrowClient()
    try:
        durum = json.loads(DURUM.read_text()) if DURUM.exists() else {}
    except Exception:
        durum = {}
    gun, saat = simdi.strftime("%Y-%m-%d"), simdi.strftime("%H")
    out = {}
    for ps in SG_ADLAR:
        rows = cli.realtime(11, [f"{ps}_11_0_0"], ["83033", "83022"])
        pt = (rows[0].get("device_point", rows[0]) if rows else {}) or {}
        guc, gwh = S._num(pt.get("p83033")), S._num(pt.get("p83022"))
        d = durum.get(ps) or {}
        if d.get("gun") != gun or d.get("v") != 3:
            # yeni gün ya da ilk çalışma: sayacın o anki değeri taban alınır. Gece yarısı sayaç henüz sıfırlanmamışsa
            # (dünün toplamı) saat 00'a yazılmaz; sıfırlanınca aşağıdaki "sayaç sıfırlandı" dalı devralır.
            d = {"gun": gun, "v": 3, "son_wh": gwh or 0.0, "saat": {}, "baslangic_wh": gwh}
        if gwh is not None:
            artis = max(0.0, gwh - (d.get("son_wh") or 0.0))
            if gwh + 1 < (d.get("son_wh") or 0.0):        # sayaç sıfırlandı (gün dönümü gecikmesi)
                artis = gwh
            d["saat"][saat] = round(d["saat"].get(saat, 0.0) + artis / 1000, 2)
            d["son_wh"] = gwh
        durum[ps] = d
        invs = []
        try:
            keys = [x.get("ps_key") for x in cli.devices(ps) if int(x.get("device_type") or 0) == 1 and x.get("ps_key")]
            for r in cli.realtime(1, keys[:50], ["24", "1"]) if keys else []:
                p2 = r.get("device_point", r)
                invs.append({"ps_key": p2.get("ps_key"), "anlik_kw": round((S._num(p2.get("p24")) or 0) / 1000, 2),
                             "bugun_kwh": round((S._num(p2.get("p1")) or 0) / 1000, 1)})
        except Exception as e:
            log("sungrow inverter listesi:", ps, e)
        out[ps] = {"ad": SG_ADLAR[ps], "anlik_kw": round(guc / 1000, 2) if guc is not None else None,
                   "bugun_kwh": round(gwh / 1000, 1) if gwh is not None else None,
                   "saatlik_bugun": dict(sorted(d["saat"].items())), "inverterler": invs}
    DURUM.parent.mkdir(parents=True, exist_ok=True)
    DURUM.write_text(json.dumps(durum))
    _yaz("n8n/sungrow_son.json", {"guncelleme": simdi.isoformat(timespec="seconds"), "kaynak": "sungrow", "santraller": out},
         "Sungrow canlı " + simdi.strftime("%H:%M"))
    return out


def inavitas(simdi):
    import inavitas as I
    cli = I.Inavitas()
    gun = simdi.strftime("%Y-%m-%d")
    out = {}
    for p in cli.plants():
        oz = cli.plant_overview(p["id"], gun)
        saatlik = {}
        for sr in cli.plant_hourly(p["id"], gun):
            for v in sr.get("veri") or []:
                try:
                    h = int(str(v["t"]).split(":")[0])
                    if v.get("kwh") is not None:
                        saatlik[f"{h:02d}"] = round(saatlik.get(f"{h:02d}", 0) + float(v["kwh"]), 2)
                except Exception:
                    pass
            break                                          # ilk seri = üretim
        invs = [{"ad": r["ad"], "anlik_kw": r["anlik_kw"], "bugun_kwh": r["uretim_kwh"], "alarm": r["alarm"]}
                for r in cli.inverters(p["id"], gun)]
        out[str(p["id"])] = {"ad": p["name"], "anlik_kw": oz.get("aktif_guc_kw"),
                             "bugun_kwh": round(sum(saatlik.values()), 1) if saatlik else ((oz.get("uretim_mwh") or 0) * 1000 or None),
                             "saatlik_bugun": dict(sorted(saatlik.items())), "inverterler": invs}
    _yaz("n8n/inavitas_son.json", {"guncelleme": simdi.isoformat(timespec="seconds"), "kaynak": "inavitas", "santraller": out},
         "Inavitas canlı " + simdi.strftime("%H:%M"))
    return out


def main():
    simdi = datetime.now(TR)
    test = "--test" in sys.argv
    for ad, f, gerek in (("Sungrow", sungrow, ("SUNGROW_APPKEY", "SUNGROW_SECRET", "SUNGROW_USER", "SUNGROW_PASSWORD")),
                         ("Inavitas", inavitas, ("INAVITAS_USER", "INAVITAS_PASS"))):
        eksik = [k for k in gerek if not os.environ.get(k)]
        if eksik:
            log(ad, "atlandı: giriş bilgisi yok (" + ", ".join(eksik) + ") → pi/inverter_kur.sh")
            continue
        try:
            o = f(simdi)
            log(ad, "tamam:", {k: (v.get("anlik_kw"), v.get("bugun_kwh"), len(v.get("saatlik_bugun") or {})) for k, v in o.items()})
        except Exception as e:
            log(ad, "HATA:", str(e)[:300])
            if test:
                raise
    # Sungrow keşfi (sürüm başına bir kez, en çok 3 deneme): okunabilen tüm noktalar → inverter/sungrow_kesif_<ps>.json
    if all(os.environ.get(k) for k in ("SUNGROW_APPKEY", "SUNGROW_SECRET", "SUNGROW_USER", "SUNGROW_PASSWORD")):
        try:
            import sungrow_kesif as K
            isaret = AESUN / f"sungrow_kesif_v{K.SURUM}"
            n = int(isaret.read_text() or 0) if isaret.exists() else 0
            if 0 <= n < 3:
                isaret.write_text(str(n + 1))
                K.main("5038906")
                isaret.write_text("-1")
        except Exception as e:
            log("Sungrow keşif HATA:", str(e)[:300])


if __name__ == "__main__":
    main()
