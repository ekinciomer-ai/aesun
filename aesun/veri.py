"""Veri kaynaklari: epias-ptf reposundaki JSON'lar, Sungrow SQLite, Inavitas canli.

AESUN_VERI_DIZIN tanimliysa JSON'lar o klasorden okunur (yerel calisma / test),
yoksa GitHub raw adresinden 5 dakikalik onbellekle cekilir.
"""
from __future__ import annotations

import json
import os
import sqlite3
import threading
import time
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

RAW = os.getenv("AESUN_RAW", "https://raw.githubusercontent.com/ekinciomer-ai/epias-ptf/main")
VERI_DIZIN = os.getenv("AESUN_VERI_DIZIN", "").strip()
SUNGROW_DB = os.getenv("AESUN_DB", "aesun_sungrow.db")
SUNGROW_HARIC = {"5052814"} | {x.strip() for x in os.getenv("SUNGROW_HARIC", "").split(",") if x.strip()}
TTL = int(os.getenv("AESUN_ONBELLEK_SN", "300"))
TR = timezone(timedelta(hours=3))

_onbellek: dict[str, tuple[float, object]] = {}
_kilit = threading.Lock()


def simdi() -> datetime:
    return datetime.now(TR)


def json_oku(dosya: str, ttl: int = TTL):
    """Dosyayi yerel klasorden ya da GitHub raw'dan okur. Bulunamazsa None."""
    with _kilit:
        k = _onbellek.get(dosya)
        if k and time.time() - k[0] < ttl:
            return k[1]
    veri = None
    try:
        if VERI_DIZIN:
            yol = Path(VERI_DIZIN) / dosya
            if yol.is_file():
                veri = json.loads(yol.read_text(encoding="utf-8"))
        else:
            with urllib.request.urlopen(f"{RAW}/{dosya}", timeout=20) as r:
                veri = json.loads(r.read())
    except Exception:
        veri = None
    with _kilit:
        if veri is None and k:  # hata olursa eski veriyle devam
            return k[1]
        _onbellek[dosya] = (time.time(), veri)
    return veri


# ------------------------------------------------------------------ Sungrow
def sungrow_ozet(db_yolu: str = SUNGROW_DB) -> dict:
    """Sungrow toplayicisinin SQLite'indan her santralin son durumunu dondurur."""
    if not Path(db_yolu).is_file():
        return {"bagli": False, "santraller": {}}
    con = sqlite3.connect(db_yolu)
    try:
        sonuc = {}
        for ps_id, ad, kap, durum, raw, guncel in con.execute(
                "SELECT ps_id, name, capacity_kwp, status, raw, updated_at FROM sg_plant"):
            if str(ps_id) in SUNGROW_HARIC:
                continue
            ham = json.loads(raw or "{}")
            son_ts = con.execute("SELECT MAX(ts) FROM sg_reading WHERE ps_id=?", (ps_id,)).fetchone()[0]
            olcum = dict(con.execute(
                "SELECT metric, value FROM sg_reading WHERE ps_id=? AND device_type=11 AND ts=?",
                (ps_id, son_ts)).fetchall()) if son_ts else {}
            inv = []
            for key, isim, ariza in con.execute(
                    "SELECT ps_key, name, fault_status FROM sg_device WHERE ps_id=? AND device_type=1 ORDER BY name",
                    (ps_id,)):
                m = dict(con.execute("SELECT metric, value FROM sg_reading WHERE ps_key=? AND ts=?",
                                     (key, son_ts)).fetchall()) if son_ts else {}
                inv.append({"ad": isim, "ariza": str(ariza) == "1",
                            "gunluk_kwh": (m.get("daily_yield_wh") or 0) / 1000,
                            "sicaklik": m.get("internal_temp_c")})
            sonuc[ps_id] = {
                "ad": ad, "kapasite_mwp": kap, "ariza": str(ham.get("ps_fault_status")) == "1",
                "sebeke": ham.get("grid_connection_status"),
                "gunluk_kwh": (olcum.get("daily_yield_wh") or 0) / 1000,
                "guc_kw": (olcum.get("power_w") or 0) / 1000,
                "son": son_ts, "inverterler": inv,
                "inv_ariza": sum(1 for i in inv if i["ariza"]),
                "inv_uretmeyen": sum(1 for i in inv if i["gunluk_kwh"] <= 0),
            }
        return {"bagli": True, "santraller": sonuc}
    finally:
        con.close()


# ------------------------------------------------------------------ Inavitas
_inav = {"ts": 0.0, "veri": None, "hata": None}


def inavitas_ozet(ttl: int = 600) -> dict:
    """INAVITAS_USER/PASS tanimliysa canli ozet; degilse bagli degil."""
    if not (os.getenv("INAVITAS_USER") and os.getenv("INAVITAS_PASS")):
        return {"bagli": False, "hata": None, "veri": None}
    if _inav["veri"] is not None and time.time() - _inav["ts"] < ttl:
        return {"bagli": True, "hata": None, "veri": _inav["veri"]}
    try:
        import sys
        sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "toplayicilar"))
        from inavitas import Inavitas  # type: ignore
        cli = Inavitas()
        tarih = simdi().date().isoformat()
        veri = []
        for p in cli.plants():
            veri.append({"id": p["id"], "ad": p["name"], "ozet": cli.plant_overview(p["id"], tarih),
                         "inverterler": cli.inverters(p["id"], tarih)})
        _inav.update(ts=time.time(), veri=veri, hata=None)
        return {"bagli": True, "hata": None, "veri": veri}
    except Exception as e:
        _inav["hata"] = str(e)[:200]
        return {"bagli": True, "hata": _inav["hata"], "veri": _inav["veri"]}


# ------------------------------------------------------------------ BTC kuru
def btc_try() -> tuple[float, float]:
    """(BTC/TRY, BTC/USD). Saha PC'sinin antminer_panel ozetinden, yoksa sinyal.json'dan."""
    ap = json_oku("antminer_panel.json") or {}
    e = ((ap.get("summary") or {}).get("earnings") or {})
    usd, kur = e.get("btc_price_usd"), e.get("usd_try")
    if usd and kur:
        return usd * kur, usd
    s = json_oku("sinyal.json") or {}
    return s.get("btc_try") or 0, s.get("btc_usd") or 0


def f2pool_aylik(ay_sayisi: int = 12) -> dict[str, float]:
    """arsiv_f2pool_YYYY-MM.json'lardan aylik BTC (her gunun son okumasi)."""
    bugun = simdi().date()
    sonuc = {}
    for geri in range(ay_sayisi):
        y, m = bugun.year, bugun.month - geri
        while m <= 0:
            m += 12; y -= 1
        ay = f"{y:04d}-{m:02d}"
        arsiv = json_oku(f"arsiv_f2pool_{ay}.json")
        if not arsiv:
            continue
        gunluk = {}
        for ts, rec in arsiv.items():
            g = ts[:10]
            if g not in gunluk or ts > gunluk[g][0]:
                gunluk[g] = (ts, float((rec or {}).get("btc") or 0))
        sonuc[ay] = sum(v[1] for v in gunluk.values())
    return dict(sorted(sonuc.items()))


def f2pool_son_kayit() -> str | None:
    ay = simdi().strftime("%Y-%m")
    arsiv = json_oku(f"arsiv_f2pool_{ay}.json") or {}
    return max(arsiv) if arsiv else None


# ------------------------------------------------------------------ saatlik inverter verisi
def _saat_etiketi(etiket, i, n):
    """Grafik etiketinden saat (0-23) cikar; cikaramazsa 24 elemanli seride sira numarasi."""
    s = str(etiket)
    for parca in (s[:2], s.split(":")[0], s.split(" ")[-1].split(":")[0]):
        if parca.isdigit() and 0 <= int(parca) <= 23:
            return int(parca)
    return i if n == 24 else None


_inav_saat: dict[str, tuple[float, list]] = {}


def inavitas_saatlik(gun: str, ttl: int = 600) -> dict:
    """{santral_ad: {saat: kWh}} — INAVITAS_USER/PASS yoksa bos."""
    if not (os.getenv("INAVITAS_USER") and os.getenv("INAVITAS_PASS")):
        return {}
    k = _inav_saat.get(gun)
    if k and time.time() - k[0] < ttl:
        return k[1]
    sonuc = {}
    try:
        import sys
        sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "toplayicilar"))
        from inavitas import Inavitas  # type: ignore
        cli = Inavitas()
        for p in cli.plants():
            seri = cli.plant_hourly(p["id"], gun)
            if not seri:
                continue
            veri_ = seri[0]["veri"]
            saatler = {}
            for i, x in enumerate(veri_):
                h = _saat_etiketi(x["t"], i, len(veri_))
                if h is not None and x["kwh"] is not None:
                    saatler[h] = saatler.get(h, 0) + float(x["kwh"])
            sonuc[p["name"]] = saatler
    except Exception:
        return k[1] if k else {}
    _inav_saat[gun] = (time.time(), sonuc)
    return sonuc


def sungrow_saatlik(gun: str, db_yolu: str = SUNGROW_DB) -> dict:
    """{ps_id: {saat: kWh}} — santral gunluk sayacinin saatlik artisi (toplayici surekli calismali)."""
    if not Path(db_yolu).is_file():
        return {}
    con = sqlite3.connect(db_yolu)
    try:
        sonuc: dict[str, dict[int, float]] = {}
        for ps_id, ts, deger in con.execute(
                "SELECT ps_id, ts, value FROM sg_reading WHERE device_type=11 AND metric='daily_yield_wh' ORDER BY ts"):
            if str(ps_id) in SUNGROW_HARIC:
                continue
            yerel = datetime.fromisoformat(ts).astimezone(TR)
            if yerel.date().isoformat() != gun:
                continue
            s = sonuc.setdefault(str(ps_id), {})
            s[yerel.hour] = max(s.get(yerel.hour, 0), (deger or 0) / 1000)  # saat sonu kumulatif
        cikti = {}
        for ps, kum in sonuc.items():
            onceki, saatlik = 0.0, {}
            for h in sorted(kum):
                saatlik[h] = max(kum[h] - onceki, 0)
                onceki = kum[h]
            cikti[ps] = saatlik
        return cikti
    finally:
        con.close()


def fusion_saatlik(gun: str) -> dict:
    """{istasyon_ad: {saat: kWh}} fusion_data.json'daki gunluk seriden (sadece o gunse)."""
    fu = json_oku("fusion_data.json") or {}
    sonuc = {}
    for kod, d in (fu.get("daily") or {}).items():
        if d.get("date") != gun:
            continue
        sonuc[d.get("stationName", kod)] = {int(h): (v or {}).get("production_kWh") or 0
                                           for h, v in (d.get("hourly") or {}).items()}
    return sonuc


# ------------------------------------------------------------------ gunluk (aylik gorunum) inverter verisi
_inav_ay: dict[str, tuple[float, dict]] = {}


def inavitas_gunluk(ay: str, ttl: int = 900) -> dict:
    """{santral_ad: {gun_no: kWh}} — Inavitas aylik grafigi (intervl=M)."""
    if not (os.getenv("INAVITAS_USER") and os.getenv("INAVITAS_PASS")):
        return {}
    k = _inav_ay.get(ay)
    if k and time.time() - k[0] < ttl:
        return k[1]
    sonuc = {}
    try:
        import sys
        sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "toplayicilar"))
        from inavitas import Inavitas  # type: ignore
        cli = Inavitas()
        for p in cli.plants():
            seri = cli.plant_hourly(p["id"], f"{ay}-01", intervl="M")
            if not seri:
                continue
            gunler = {}
            veri_ = seri[0]["veri"]
            for i, x in enumerate(veri_):
                s = str(x["t"])
                no = None
                for parca in (s[:2], s.split(".")[0], s.split("-")[-1], s.split("/")[0]):
                    if parca.strip().isdigit() and 1 <= int(parca) <= 31:
                        no = int(parca); break
                if no is None:
                    no = i + 1
                if x["kwh"] is not None:
                    gunler[no] = gunler.get(no, 0) + float(x["kwh"])
            sonuc[p["name"]] = gunler
    except Exception:
        return k[1] if k else {}
    _inav_ay[ay] = (time.time(), sonuc)
    return sonuc


def sungrow_gunluk(ay: str, db_yolu: str = SUNGROW_DB) -> dict:
    """{ps_id: {gun_no: kWh}} — her gunun en yuksek 'gunluk uretim' okumasi."""
    if not Path(db_yolu).is_file():
        return {}
    con = sqlite3.connect(db_yolu)
    try:
        sonuc: dict[str, dict[int, float]] = {}
        for ps_id, ts, deger in con.execute(
                "SELECT ps_id, ts, value FROM sg_reading WHERE device_type=11 AND metric='daily_yield_wh'"):
            if str(ps_id) in SUNGROW_HARIC:
                continue
            yerel = datetime.fromisoformat(ts).astimezone(TR)
            if yerel.strftime("%Y-%m") != ay:
                continue
            s = sonuc.setdefault(str(ps_id), {})
            s[yerel.day] = max(s.get(yerel.day, 0), (deger or 0) / 1000)
        return sonuc
    finally:
        con.close()


def fusion_gunluk(ay: str) -> dict:
    fu = json_oku("fusion_data.json") or {}
    sonuc = {}
    for kod, d in (fu.get("monthly") or {}).items():
        if d.get("month") != ay:
            continue
        g = {}
        for tarih, v in (d.get("daily") or {}).items():
            val = v.get("production_kWh") if isinstance(v, dict) else v
            g[int(tarih[8:10])] = val or 0
        sonuc[d.get("stationName", kod)] = g
    return sonuc
