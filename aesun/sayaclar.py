"""Sayaclar ve mahsup sayfasi: secilen gunun saatlik OSOS, inverter ve mahsup verisi."""
from __future__ import annotations

from datetime import date, timedelta

from . import mahsup, veri
from .aboneler import abone_listesi
from .uyarilar import AY, sayi

SAATLER = [f"{h:02d}" for h in range(24)]
GUN_AD = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"]


def gun_metni(gun: str) -> str:
    d = date.fromisoformat(gun)
    return f"{d.day} {AY[d.month - 1]} {d.year}, {GUN_AD[d.weekday()]}"


def _toplam(sutun: dict) -> float | None:
    vals = [v for v in sutun.values() if v is not None]
    return sum(vals) if vals else None


def gun_detay(gun: str | None = None) -> dict:
    endeks = veri.json_oku("2026_osos_endeks.json") or {}
    aboneler = abone_listesi()
    tum_gunler = sorted({g for a in aboneler for g in ((endeks.get(a["key"]) or {}).get("veri") or {})})
    if not tum_gunler:
        return {"gun": None}
    if gun not in tum_gunler:
        gun = tum_gunler[-1]
    i = tum_gunler.index(gun)

    # ---------------- OSOS saatlik
    osos_sutunlar = []
    for a in aboneler:
        v = ((endeks.get(a["key"]) or {}).get("veri") or {}).get(gun)
        if a["uretim"]:
            u = {h: ((v or {}).get(h) or {}).get("veris") if v and h in v else None for h in SAATLER}
            osos_sutunlar.append({"abone": a, "tur": "Üretim", "deger": u, "toplam": _toplam(u)})
        if a["tuketim"]:
            t = {h: ((v or {}).get(h) or {}).get("cekis") if v and h in v else None for h in SAATLER}
            osos_sutunlar.append({"abone": a, "tur": "Tüketim", "deger": t, "toplam": _toplam(t)})

    # ---------------- Inverter saatlik (her abone kendi kaynagindan)
    sg = veri.sungrow_saatlik(gun)
    inav = veri.inavitas_saatlik(gun)
    fu = veri.fusion_saatlik(gun)
    inv_sutunlar = []
    for a in aboneler:
        inv = a.get("inverter") or {}
        kaynak = inv.get("kaynak") or ("fusionsolar" if a["kod"] in ("T1", "T2") else None)
        if not kaynak:
            continue
        saatlik, not_ = None, ""
        if kaynak == "sungrow":
            saatlik = sg.get(inv["ps_id"])
            not_ = "Sungrow toplayıcısı o gün sürekli çalışmadıysa saatlik veri eksik olur."
        elif kaynak == "inavitas":
            saatlik = next(iter(inav.values()), None) if inav else None
            not_ = "Inavitas'tan canlı okunur."
        elif kaynak == "fusionsolar":
            ad = "Tek Yıldız-1 GES" if a["kod"] == "T1" else "Tek Yıldız-2 GES"
            saatlik = fu.get(ad)
            not_ = "FusionSolar verisi güncel değil."
        deger = {h: (saatlik or {}).get(int(h)) for h in SAATLER}
        osos_u = ((endeks.get(a["key"]) or {}).get("veri") or {}).get(gun) or {}
        osos_top = sum((x or {}).get("veris", 0) for x in osos_u.values()) if osos_u else None
        inv_top = _toplam(deger)
        fark = None
        if inv_top and osos_top:
            fark = (osos_top - inv_top) / inv_top * 100
        inv_sutunlar.append({"abone": a, "kaynak": {"sungrow": "Sungrow", "inavitas": "Inavitas",
                                                    "fusionsolar": "FusionSolar"}[kaynak],
                             "deger": deger, "toplam": inv_top, "osos_toplam": osos_top, "fark": fark,
                             "veri_var": inv_top is not None, "not": not_})

    # ---------------- Mahsup saatlik
    aylar = mahsup.hesapla(endeks)
    G = (aylar.get(gun[:7]) or {}).get("gunler", {}).get(gun)
    mhs = None
    if G:
        satirlar = []
        for h in SAATLER:
            S = G["saatler"].get(h)
            if not S:
                satirlar.append({"anahtar": h, "bos": True})
                continue
            satirlar.append({"anahtar": h, "bos": False, "u": S["uretim"], "t": S["tuketim"],
                             "m": S.get("mahsup_dag") or {}, "s": S.get("sonra") or {},
                             "b": S.get("bedelli", 0), "iz": S.get("izleme", {})})
        mhs = {"saatlik": gun >= mahsup.SAATLIK_BASLANGIC, "satirlar": satirlar,
               "top": {"u": G["uretim"], "t": G["tuketim"], "m": G.get("mahsup_dag") or {}, "s": G.get("sonra") or {},
                       "b": G.get("bedelli", 0), "iz": G.get("izleme", {})},
               "izleme": [a for a in aboneler if not a["mahsup"]]}

    return {
        "gun": gun, "gun_metin": gun_metni(gun),
        "onceki": tum_gunler[i - 1] if i > 0 else None,
        "sonraki": tum_gunler[i + 1] if i + 1 < len(tum_gunler) else None,
        "ilk": tum_gunler[0], "son": tum_gunler[-1],
        "anahtarlar": SAATLER, "etiket": {h: f"{h}:00" for h in SAATLER}, "satir_link": False,
        "osos": osos_sutunlar,
        "osos_gruplar": [(a, sum(1 for c in osos_sutunlar if c["abone"]["key"] == a["key"])) for a in aboneler], "inverter": inv_sutunlar, "mahsup": mhs, "sayi": sayi,
    }


def ay_detay(ay: str | None = None) -> dict:
    """Secilen ayin gun gun OSOS, inverter ve mahsup tablosu."""
    endeks = veri.json_oku("2026_osos_endeks.json") or {}
    aboneler = abone_listesi()
    tum_aylar = sorted({g[:7] for a in aboneler for g in ((endeks.get(a["key"]) or {}).get("veri") or {})})
    if not tum_aylar:
        return {"ay": None}
    if ay not in tum_aylar:
        ay = tum_aylar[-1]
    i = tum_aylar.index(ay)
    y, m = int(ay[:4]), int(ay[5:7])
    gun_sayisi = ((date(y + (m == 12), m % 12 + 1, 1)) - date(y, m, 1)).days
    gunler = [f"{ay}-{d:02d}" for d in range(1, gun_sayisi + 1)]

    def gun_top(v, g, alan):
        s = (v or {}).get(g)
        return sum((x or {}).get(alan, 0) or 0 for x in s.values()) if s else None

    osos = []
    for a in aboneler:
        v = (endeks.get(a["key"]) or {}).get("veri") or {}
        if a["uretim"]:
            d = {g: gun_top(v, g, "veris") for g in gunler}
            osos.append({"abone": a, "tur": "Üretim", "deger": d, "toplam": _toplam(d)})
        if a["tuketim"]:
            d = {g: gun_top(v, g, "cekis") for g in gunler}
            osos.append({"abone": a, "tur": "Tüketim", "deger": d, "toplam": _toplam(d)})

    sg, inav, fu = veri.sungrow_gunluk(ay), veri.inavitas_gunluk(ay), veri.fusion_gunluk(ay)
    inv = []
    for a in aboneler:
        k = (a.get("inverter") or {})
        kaynak = k.get("kaynak") or ("fusionsolar" if a["kod"] in ("T1", "T2") else None)
        if not kaynak:
            continue
        if kaynak == "sungrow":
            src = sg.get(k["ps_id"])
        elif kaynak == "inavitas":
            src = next(iter(inav.values()), None) if inav else None
        else:
            src = fu.get("Tek Yıldız-1 GES" if a["kod"] == "T1" else "Tek Yıldız-2 GES")
        d = {g: (src or {}).get(int(g[8:])) for g in gunler}
        v = (endeks.get(a["key"]) or {}).get("veri") or {}
        osos_top = _toplam({g: gun_top(v, g, "veris") for g in gunler})
        inv_top = _toplam(d)
        inv.append({"abone": a, "kaynak": {"sungrow": "Sungrow", "inavitas": "Inavitas",
                                           "fusionsolar": "FusionSolar"}[kaynak],
                    "deger": d, "toplam": inv_top, "osos_toplam": osos_top, "veri_var": inv_top is not None,
                    "fark": (osos_top - inv_top) / inv_top * 100 if inv_top and osos_top else None})

    A = mahsup.hesapla(endeks).get(ay)
    mhs = None
    if A:
        satirlar = []
        for g in gunler:
            G = A["gunler"].get(g)
            if not G:
                satirlar.append({"anahtar": g, "bos": True})
                continue
            satirlar.append({"anahtar": g, "bos": False, "u": G["uretim"], "t": G["tuketim"],
                             "m": G.get("mahsup_dag") or {}, "s": G.get("sonra") or {},
                             "b": G.get("bedelli", 0), "iz": G.get("izleme", {})})
        mhs = {"saatlik": A["mod"] == "saatlik", "satirlar": satirlar,
               "top": {"u": A["uretim"], "t": A["tuketim"], "m": A.get("mahsup_dag") or {}, "s": A.get("sonra") or {},
                       "b": A.get("bedelli", 0), "iz": A.get("izleme", {})},
               "izleme": [a for a in aboneler if not a["mahsup"]]}

    kisa = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"]
    return {
        "ay": ay, "ay_metin": f"{AY[m - 1]} {y}",
        "onceki_ay": tum_aylar[i - 1] if i > 0 else None,
        "sonraki_ay": tum_aylar[i + 1] if i + 1 < len(tum_aylar) else None,
        "anahtarlar": gunler, "etiket": {g: f"{int(g[8:]):02d} {kisa[date.fromisoformat(g).weekday()]}" for g in gunler},
        "satir_link": True,
        "osos": osos, "osos_gruplar": [(a, sum(1 for c in osos if c["abone"]["key"] == a["key"])) for a in aboneler],
        "inverter": inv, "mahsup": mhs, "sayi": sayi,
    }
