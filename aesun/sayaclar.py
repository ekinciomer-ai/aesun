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
                satirlar.append({"saat": h, "bos": True})
                continue
            satirlar.append({"saat": h, "bos": False, "u": S["uretim"], "t": S["tuketim"],
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
        "saatler": SAATLER, "osos": osos_sutunlar,
        "osos_gruplar": [(a, sum(1 for c in osos_sutunlar if c["abone"]["key"] == a["key"])) for a in aboneler], "inverter": inv_sutunlar, "mahsup": mhs, "sayi": sayi,
    }
