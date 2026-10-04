"""Genel bakis sayfasinin verisini hazirlar."""
from __future__ import annotations

from datetime import datetime

from . import mahsup, uyarilar, veri
from .aboneler import abone_listesi
from .uyarilar import AY, sayi, tarih_tr

RENK = {1: "#2a78d6", 2: "#eb6834", 3: "#1baf7a", 4: "#eda100", 5: "#e87ba4", 6: "#4a3aa7"}
GUNLER = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"]


def _polyline(degerler, w, h, ust=None):
    if not degerler:
        return ""
    ust = ust or max(degerler) or 1
    n = max(len(degerler) - 1, 1)
    return " ".join(f"{i * w / n:.1f},{h - min(v, ust) / ust * h:.1f}" for i, v in enumerate(degerler))


def _yuvarla_ust(x):
    for adim in (1000, 2000, 2500, 5000, 10000, 20000, 25000, 50000, 100000):
        if x <= adim * 4:
            return adim * ((int(x) // adim) + 1), adim
    return x * 1.1, x / 4


def _kisa(u: dict) -> str:
    if u["kategori"] == "inverter":
        return "Şebekede değil" if "şebekede" in u["baslik"] else "İnverter sorunu"
    return {"uretim": "Üretim durdu", "tuketim": "Tüketim arttı", "osos": "Veri gecikti"}.get(u["kategori"], "Kontrol et")


def genel_bakis() -> dict:
    simdi = veri.simdi()
    endeks = veri.json_oku("2026_osos_endeks.json") or {}
    aylar = mahsup.hesapla(endeks)
    mozet = mahsup.ozet(aylar)
    sungrow = veri.sungrow_ozet()
    inav = veri.inavitas_ozet()
    uy = uyarilar.hepsi(endeks, mozet, sungrow, inav, simdi)

    # --- sayaclar
    sayaclar = []
    son_veri = None
    for a in abone_listesi():
        v = (endeks.get(a["key"]) or {}).get("veri") or {}
        kart = {**a, "renk_hex": RENK.get(a["renk"], "#888"), "veri_var": bool(v)}
        if v:
            gun = max(v)
            saatler = v[gun]
            kart["gun"] = gun
            kart["son_saat"] = max(saatler) if saatler else None
            kart["bugun_u"] = sum(x.get("veris", 0) for x in saatler.values())
            kart["bugun_t"] = sum(x.get("cekis", 0) for x in saatler.values())
            seri = uyarilar.gunluk_seriler(v)
            tam = [s for s in seri if s[0] < gun][-30:]
            alan = 1 if a["uretim"] else 2
            kart["cizgi"] = _polyline([s[alan] for s in tam], 174, 36)
            kart["cizgi_ad"] = "üretimi" if a["uretim"] else "tüketimi"
            if not son_veri or gun > son_veri[0]:
                son_veri = (gun, kart["son_saat"])
        ak = [u for u in uy if u.get("abone") == a["key"] and u["seviye"] != "bilgi"]
        if ak:
            kart["durum"] = "kritik" if ak[0]["seviye"] == "kritik" else "uyari"
            kart["durum_metin"] = _kisa(ak[0])
        else:
            kart["durum"], kart["durum_metin"] = "iyi", "Veri güncel" if v else "Veri yok"
        inv = a.get("inverter") or {}
        if inv.get("kaynak") == "sungrow":
            s = (sungrow.get("santraller") or {}).get(inv["ps_id"])
            if s:
                kart["inverter_metin"] = f"Sungrow bugün {sayi(s['gunluk_kwh'])} kWh"
        sayaclar.append(kart)

    # --- bu ay enerji dengesi
    ay = simdi.strftime("%Y-%m")
    A = aylar.get(ay) or next(iter(reversed(aylar.values())), None)
    denge = None
    if A:
        gunler = sorted(A["gunler"])
        denge = {
            "ay_ad": AY[int((ay if ay in aylar else max(aylar))[5:7]) - 1],
            "aralik": f"{int(gunler[0][8:])}–{int(gunler[-1][8:])} {AY[int(gunler[-1][5:7]) - 1]}" if gunler else "",
            "u": A["uretim"]["TPL"], "t": A["tuketim"]["TPL"], "m": A["mahsup"], "b": A["bedelli"],
            "sebeke": A["sonra"]["TPL"],
        }
        enb = max(denge["u"], denge["t"]) or 1
        denge["u_gen"] = denge["u"] / enb * 100
        denge["t_gen"] = denge["t"] / enb * 100

    # --- son 30 gun mahsup havuzu
    gunluk = []
    for a_ in sorted(aylar):
        for g in sorted(aylar[a_]["gunler"]):
            G = aylar[a_]["gunler"][g]
            gunluk.append((g, G["uretim"]["TPL"], G["tuketim"]["TPL"]))
    gunluk = [x for x in gunluk if x[0] < simdi.date().isoformat()][-30:]
    trend = None
    if gunluk:
        ust, adim = _yuvarla_ust(max(max(x[1], x[2]) for x in gunluk))
        trend = {
            "u": _polyline([x[1] for x in gunluk], 840, 180, ust),
            "t": _polyline([x[2] for x in gunluk], 840, 180, ust),
            "izgara": [(180 - i * adim / ust * 180 + 10, sayi(i * adim)) for i in range(int(ust // adim) + 1)],
            "etiketler": [(52 + i * 840 / 29, f"{int(gunluk[i][0][8:])} {AY[int(gunluk[i][0][5:7]) - 1][:3]}")
                          for i in (0, 10, 20, len(gunluk) - 1) if i < len(gunluk)],
            "son_u": _polyline([gunluk[-1][1]], 0, 180, ust).split(",")[1] if gunluk else 0,
        }

    # --- inverterler
    fu = veri.json_oku("fusion_data.json") or {}
    fsum = fu.get("summary") or {}
    inverter = {
        "fusion": {"ts": fu.get("timestamp"), "santral": fsum.get("station_count"),
                   "inverter": fsum.get("inverter_count"), "mwp": fsum.get("total_capacity_MW")},
        "sungrow": sungrow, "inavitas": inav,
    }
    if inverter["fusion"]["ts"]:
        inverter["fusion"]["ts_metin"] = f"{tarih_tr(fu['timestamp'])} {fu['timestamp'][11:16]}"

    # --- madencilik
    ap = veri.json_oku("antminer_panel.json") or {}
    sm = ap.get("summary") or {}
    cihazlar = sorted(ap.get("devices") or [], key=lambda d: d.get("suffix") or 0)
    madencilik = {
        "ts": (ap.get("timestamp") or "")[11:16], "toplam": sm.get("total", 0), "online": sm.get("online", 0),
        "hash": sm.get("total_hashrate_TH", 0), "verim": sm.get("efficiency_pct", 0),
        "sicaklik": sm.get("avg_temp_C"), "su": sm.get("avg_water_temp_C"),
        "cihazlar": [{"no": d.get("suffix"), "durum": "iyi" if d.get("online") else
                      ("kapali" if d.get("status") == "OFFLINE" else "kritik"),
                      "etiket": f"Miner-{d.get('suffix')}: {d.get('status')}"} for d in cihazlar],
    }

    # --- mining geliri
    kur, usd = veri.btc_try()
    f2 = veri.f2pool_aylik(6)
    gelir = None
    if f2:
        en = max(f2.values()) or 1
        aylar_l = list(f2.items())
        tam_ay = [x for x in aylar_l if x[0] != ay] or aylar_l
        gelir = {
            "barlar": [{"ad": AY[int(k[5:7]) - 1][:3], "btc": v, "h": v / en * 79, "kismi": k == ay,
                        "x": 8 + i * 46} for i, (k, v) in enumerate(aylar_l)],
            "son_ay": AY[int(tam_ay[-1][0][5:7]) - 1], "son_btc": tam_ay[-1][1], "son_tl": tam_ay[-1][1] * kur,
        }

    kritik = sum(1 for u in uy if u["seviye"] == "kritik")
    return {
        "simdi": simdi, "tarih_metin": f"{GUNLER[simdi.weekday()]}, {simdi.day} {AY[simdi.month - 1]} {simdi.year}",
        "son_veri": son_veri and f"{son_veri[1]}:00",
        "uyarilar": uy, "uyari_kritik": kritik, "uyari_sayisi": len(uy),
        "sayaclar": sayaclar, "denge": denge, "bedelli": mozet, "trend": trend,
        "inverter": inverter, "madencilik": madencilik, "gelir": gelir,
        "sayi": sayi,
    }
