"""Uyari kurallari. Her uyari: {seviye, kategori, baslik, detay, abone?}.
seviye: kritik | uyari | bilgi
"""
from __future__ import annotations

import statistics
from datetime import datetime, timedelta

from . import veri
from .aboneler import abone_listesi
from .mahsup import MHS_BEDELLI_LIMIT

SIRA = {"kritik": 0, "uyari": 1, "bilgi": 2}
AY = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim",
      "Kasım", "Aralık"]


def tarih_tr(iso: str) -> str:
    d = datetime.fromisoformat(iso[:10])
    return f"{d.day} {AY[d.month - 1]}"


def sayi(x: float) -> str:
    return f"{x:,.0f}".replace(",", ".")


def _u(seviye, kategori, baslik, detay="", abone=None):
    return {"seviye": seviye, "kategori": kategori, "baslik": baslik, "detay": detay, "abone": abone}


def gunluk_seriler(abone_veri: dict) -> list[tuple[str, float, float, int]]:
    """[(gun, veris, cekis, saat_sayisi)] tarihe gore sirali."""
    out = []
    for g in sorted(abone_veri):
        s = abone_veri[g] or {}
        out.append((g, sum((x or {}).get("veris", 0) or 0 for x in s.values()),
                    sum((x or {}).get("cekis", 0) or 0 for x in s.values()), len(s)))
    return out


def osos_kurallari(endeks: dict, simdi: datetime) -> list[dict]:
    sonuc = []
    for a in abone_listesi():
        v = ((endeks or {}).get(a["key"]) or {}).get("veri") or {}
        if not v:
            sonuc.append(_u("bilgi", "osos", f"{a['kod']} için OSOS verisi yok",
                            f"{a['ad']} ({a['tesisat']}) henüz yüklenmedi.", a["key"]))
            continue
        son_gun = max(v)
        son_saat = max(v[son_gun]) if v[son_gun] else "00"
        son_an = datetime.fromisoformat(son_gun).replace(tzinfo=veri.TR) + timedelta(hours=int(son_saat[:2]) + 1)
        yas = (simdi - son_an).total_seconds() / 3600
        if yas > 72:
            sonuc.append(_u("kritik", "osos", f"{a['kod']} OSOS verisi {int(yas // 24)} gündür gelmiyor",
                            f"Son veri {tarih_tr(son_gun)} {son_saat}:00.", a["key"]))
        elif yas > 30:
            sonuc.append(_u("uyari", "osos", f"{a['kod']} OSOS verisi gecikti",
                            f"Son veri {tarih_tr(son_gun)} {son_saat}:00.", a["key"]))

        seri = [s for s in gunluk_seriler(v) if s[3] >= 20 and s[0] < son_gun]  # tam gunler
        if a.get("uretim") and len(seri) >= 10:
            # sondan geriye: uretimin neredeyse sifir oldugu gun serisi
            seri_u = [s[1] for s in seri]
            pozitif = [x for x in seri_u[-60:] if x > 0]
            esik = max(50.0, 0.05 * statistics.median(pozitif)) if pozitif else 50.0
            n = 0
            for x in reversed(seri_u):
                if x < esik:
                    n += 1
                else:
                    break
            onceki = [x for x in seri_u[:len(seri_u) - n][-30:] if x > 0]
            ort = statistics.mean(onceki) if onceki else 0
            if n >= 2 and ort > 500:
                bas = seri[len(seri) - n][0]
                sonuc.append(_u("kritik", "uretim", f"{a['kod']} santrali {tarih_tr(bas)}'den beri üretmiyor",
                                f"{n} gündür üretim yok. Önceki ortalama günde yaklaşık {sayi(ort)} kWh.",
                                a["key"]))
        if a.get("tuketim") and len(seri) >= 21:
            son7 = statistics.mean(s[2] for s in seri[-7:])
            ref = statistics.median(s[2] for s in seri[-37:-7])
            if ref > 50 and son7 >= 1.8 * ref and son7 - ref > 150:
                sonuc.append(_u("uyari", "tuketim", f"{a['kod']} tüketimi arttı",
                                f"Son 7 gün ortalaması günde {sayi(son7)} kWh, önceki dönem {sayi(ref)} kWh.",
                                a["key"]))
    return sonuc


def bedelli_kurali(ozet: dict) -> list[dict]:
    oran = ozet.get("bedelli_oran", 0)
    if oran >= 0.95:
        return [_u("kritik", "mahsup", "Bedelli satış limiti dolmak üzere",
                   f"Yüzde {oran * 100:.1f} kullanıldı ({sayi(ozet['bedelli'])} / {sayi(MHS_BEDELLI_LIMIT)} kWh).")]
    if oran >= 0.80:
        return [_u("uyari", "mahsup", "Bedelli satış limitinin yüzde 80'i aşıldı",
                   f"Yüzde {oran * 100:.1f} kullanıldı.")]
    return []


def inverter_kurallari(simdi: datetime, sungrow: dict, inav: dict) -> list[dict]:
    sonuc = []
    fu = veri.json_oku("fusion_data.json") or {}
    ts = fu.get("timestamp")
    if ts:
        yas = simdi - datetime.fromisoformat(ts).replace(tzinfo=veri.TR)
        if yas > timedelta(hours=24):
            sonuc.append(_u("kritik", "inverter", f"FusionSolar verisi {tarih_tr(ts)}'tan beri gelmiyor",
                            "T1 ve T2 inverterlerinin arızaları şu an görünmüyor."))
    else:
        sonuc.append(_u("kritik", "inverter", "FusionSolar verisi yok", "T1 ve T2 inverterleri izlenmiyor."))

    ps2abone = {a["inverter"]["ps_id"]: a for a in abone_listesi()
                if (a.get("inverter") or {}).get("kaynak") == "sungrow"}
    if not sungrow.get("bagli"):
        sonuc.append(_u("bilgi", "inverter", "Sungrow verisi bu sunucuda yok",
                        "Sungrow toplayıcısının veritabanı bulunamadı."))
    for ps, s in (sungrow.get("santraller") or {}).items():
        a = ps2abone.get(ps)
        ad = a["kod"] if a else s["ad"]
        n = len(s["inverterler"])
        if s["sebeke"] == 0 and s["gunluk_kwh"] <= 0:
            sonuc.append(_u("kritik", "inverter", f"{ad} şebekede değil",
                            f"Sungrow: {s['inv_ariza']}/{n} inverter arızada, bugün üretim yok. "
                            "Kesici, trafo ve koruma rölesi kontrol edilmeli.", a and a["key"]))
        elif s["gunluk_kwh"] > 1000 and s["inv_uretmeyen"]:
            isimler = ", ".join(i["ad"] for i in s["inverterler"] if i["gunluk_kwh"] <= 0)
            sonuc.append(_u("uyari", "inverter", f"{ad}: {s['inv_uretmeyen']} inverter bugün üretmedi",
                            isimler, a and a["key"]))
    if inav.get("hata"):
        sonuc.append(_u("uyari", "inverter", "Inavitas bağlantı hatası", inav["hata"]))
    for p in inav.get("veri") or []:
        alarmli = [i["ad"] for i in p.get("inverterler", []) if i.get("alarm")]
        if alarmli:
            sonuc.append(_u("uyari", "inverter", f"AE: {len(alarmli)} inverterde alarm", ", ".join(alarmli)))
    return sonuc


def madencilik_kurallari(simdi: datetime) -> list[dict]:
    ap = veri.json_oku("antminer_panel.json") or {}
    if not ap:
        return [_u("kritik", "madencilik", "Saha PC'sinden madenci verisi yok")]
    sonuc = []
    ts = ap.get("timestamp")
    if ts:
        yas = simdi - datetime.fromisoformat(ts[:19]).replace(tzinfo=veri.TR)
        if yas > timedelta(minutes=45):
            sonuc.append(_u("uyari", "madencilik", "Saha PC'si veri göndermiyor",
                            f"Son veri {tarih_tr(ts)} {ts[11:16]}."))
    kapali = [d for d in ap.get("devices", []) if not d.get("online")]
    if kapali:
        isim = ", ".join(f"Miner-{d.get('suffix')}" for d in kapali)
        sonuc.append(_u("uyari", "madencilik", f"{len(kapali)} madenci yanıt vermiyor", isim))
    sicak = [d for d in ap.get("devices", []) if (d.get("temp_max") or 0) >= 80]
    if sicak:
        sonuc.append(_u("uyari", "madencilik", f"{len(sicak)} madenci 80 °C üstünde",
                        ", ".join(f"Miner-{d.get('suffix')} {d.get('temp_max')} °C" for d in sicak)))
    son = veri.f2pool_son_kayit()
    if son and simdi - datetime.fromisoformat(son).replace(tzinfo=veri.TR) > timedelta(hours=8):
        sonuc.append(_u("uyari", "madencilik", "F2Pool arşivi güncellenmiyor", f"Son kayıt {son}."))
    return sonuc


def ptf_kurali(simdi: datetime) -> list[dict]:
    if simdi.hour < 15:
        return []
    yarin = (simdi + timedelta(days=1)).date()
    p = veri.json_oku("aylik_ptf.json") or {}
    if f"{yarin.day:02d}" not in (p.get(yarin.strftime("%Y-%m")) or {}):
        return [_u("uyari", "piyasa", "Yarının PTF verisi henüz yok", "EPİAŞ verisi panele gelmedi.")]
    return []


def hepsi(endeks, mahsup_ozet, sungrow, inav, simdi=None) -> list[dict]:
    simdi = simdi or veri.simdi()
    u = (osos_kurallari(endeks, simdi) + bedelli_kurali(mahsup_ozet) + inverter_kurallari(simdi, sungrow, inav)
         + madencilik_kurallari(simdi) + ptf_kurali(simdi))
    return sorted(u, key=lambda x: SIRA[x["seviye"]])
