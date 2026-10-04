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
