#!/usr/bin/env python3
"""
EPİAŞ PTF toplayıcı — ertesi günün PTF'lerini yayınlanınca çeker, SQLite'a yazar.

Çalışma mantığı (tek seferlik çalıştırma, zamanlayıcı 13:00-18:00 arası 10 dk'da bir tetikler):
  1) Yarının 24 saati DB'de tamsa hiçbir şey yapmadan çıkar.
  2) Değilse EPİAŞ'tan çeker; 24 saat geldiyse kaydeder (upsert), gelmediyse sonraki tetiklemeyi bekler.
  3) Son N gün içinde eksik gün varsa onları da tamamlar (PC kapalı kaldıysa).

Bağımlılık yok (sadece Python 3.8+ standart kütüphane). Windows ve Raspberry Pi'de aynı çalışır.

Ayarlar: aynı klasördeki .env dosyası veya ortam değişkenleri
  EPIAS_USERNAME / EPIAS_PASSWORD   -> şeffaflık hesabı (varsa TGT ile resmi API kullanılır)
  PTF_DB                            -> SQLite yolu (varsayılan: ./ptf.db)
  PTF_WEBHOOK                       -> (opsiyonel) panel endpoint'i; kaydedilen gün JSON olarak POST edilir
  PTF_GERIYE_GUN                    -> eksik gün kontrolü (varsayılan 7)

Kullanım:
  python ptf_cek.py                 # normal (zamanlayıcı bunu çağırır)
  python ptf_cek.py --tarih 2026-10-05
  python ptf_cek.py --aralik 2026-01-01 2026-10-05   # geçmiş doldurma
"""
import argparse
import json
import logging
import os
import sqlite3
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

TR = timezone(timedelta(hours=3))  # Türkiye 2016'dan beri sabit UTC+3
KLASOR = Path(__file__).resolve().parent
API = "https://seffaflik.epias.com.tr/electricity-service/v1/markets/dam/data/mcp"
CAS = "https://giris.epias.com.tr/cas/v1/tickets"
UA = "Mozilla/5.0 (AksarayEnerji-PTF/1.0)"


def env_yukle():
    f = KLASOR / ".env"
    if f.exists():
        for satir in f.read_text(encoding="utf-8").splitlines():
            satir = satir.strip()
            if satir and not satir.startswith("#") and "=" in satir:
                k, v = satir.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


env_yukle()
DB = Path(os.environ.get("PTF_DB", KLASOR / "ptf.db"))
WEBHOOK = os.environ.get("PTF_WEBHOOK", "").strip()
GERIYE = int(os.environ.get("PTF_GERIYE_GUN", "7"))
KULLANICI = os.environ.get("EPIAS_USERNAME") or os.environ.get("EPIAS_KULLANICI")
SIFRE = os.environ.get("EPIAS_PASSWORD") or os.environ.get("EPIAS_SIFRE")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    handlers=[logging.FileHandler(KLASOR / "ptf.log", encoding="utf-8"), logging.StreamHandler()],
)
log = logging.getLogger("ptf")


# ---------------- DB ----------------
def db_ac():
    DB.parent.mkdir(parents=True, exist_ok=True)
    c = sqlite3.connect(DB)
    c.execute(
        """CREATE TABLE IF NOT EXISTS ptf_saatlik (
            tarih      TEXT NOT NULL,          -- YYYY-MM-DD
            saat       INTEGER NOT NULL,       -- 0..23
            ptf_tl     REAL NOT NULL,          -- TL/MWh
            ptf_usd    REAL,
            ptf_eur    REAL,
            cekilme    TEXT NOT NULL,          -- ISO zaman damgası
            PRIMARY KEY (tarih, saat))"""
    )
    c.execute(
        """CREATE VIEW IF NOT EXISTS ptf_gunluk AS
           SELECT tarih, COUNT(*) saat_sayisi, ROUND(AVG(ptf_tl),2) ort_tl,
                  MIN(ptf_tl) min_tl, MAX(ptf_tl) max_tl
           FROM ptf_saatlik GROUP BY tarih"""
    )
    return c


def gun_tam_mi(c, g: date) -> bool:
    n = c.execute("SELECT COUNT(*) FROM ptf_saatlik WHERE tarih=?", (g.isoformat(),)).fetchone()[0]
    return n >= 24


def kaydet(c, satirlar):
    simdi = datetime.now(TR).isoformat(timespec="seconds")
    c.executemany(
        """INSERT INTO ptf_saatlik (tarih,saat,ptf_tl,ptf_usd,ptf_eur,cekilme)
           VALUES (?,?,?,?,?,?)
           ON CONFLICT(tarih,saat) DO UPDATE SET
             ptf_tl=excluded.ptf_tl, ptf_usd=excluded.ptf_usd,
             ptf_eur=excluded.ptf_eur, cekilme=excluded.cekilme""",
        [(s["tarih"], s["saat"], s["ptf_tl"], s["ptf_usd"], s["ptf_eur"], simdi) for s in satirlar],
    )
    c.commit()


# ---------------- EPİAŞ ----------------
_tgt = {"deger": None, "zaman": 0.0}


def tgt_al():
    """Kullanıcı tanımlıysa TGT alır (2 saat geçerli, 90 dk önbellek)."""
    if not (KULLANICI and SIFRE):
        return None
    if _tgt["deger"] and time.time() - _tgt["zaman"] < 5400:
        return _tgt["deger"]
    data = urllib.parse.urlencode({"username": KULLANICI, "password": SIFRE}).encode()
    req = urllib.request.Request(
        CAS, data=data, method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded", "Accept": "text/plain", "User-Agent": UA},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            _tgt.update(deger=r.read().decode().strip(), zaman=time.time())
            return _tgt["deger"]
    except urllib.error.HTTPError as e:
        log.warning("TGT alınamadı (%s) — kimliksiz deneniyor", e.code)
        return None


def ptf_getir(bas: date, bit: date):
    """[bas, bit] aralığındaki saatlik PTF'leri döndürür."""
    govde = json.dumps({
        "startDate": f"{bas.isoformat()}T00:00:00+03:00",
        "endDate": f"{bit.isoformat()}T00:00:00+03:00",
    }).encode()
    for deneme in range(3):
        h = {"Content-Type": "application/json", "Accept": "application/json", "User-Agent": UA}
        t = tgt_al()
        if t:
            h["TGT"] = t
        req = urllib.request.Request(API, data=govde, method="POST", headers=h)
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                js = json.loads(r.read().decode())
            break
        except urllib.error.HTTPError as e:
            if e.code in (401, 403):
                _tgt["deger"] = None  # TGT düşmüş olabilir, yenile
            log.warning("EPİAŞ HTTP %s (deneme %d)", e.code, deneme + 1)
        except Exception as e:  # ağ hatası
            log.warning("EPİAŞ erişim hatası: %s (deneme %d)", e, deneme + 1)
        time.sleep(5 * (deneme + 1))
    else:
        return []

    out = []
    for it in js.get("items") or []:
        d = datetime.fromisoformat(it["date"]).astimezone(TR)
        out.append({
            "tarih": d.date().isoformat(), "saat": d.hour,
            "ptf_tl": round(float(it["price"]), 2),
            "ptf_usd": it.get("priceUsd"), "ptf_eur": it.get("priceEur"),
        })
    return out


def webhook_gonder(g: date, satirlar):
    if not WEBHOOK:
        return
    body = json.dumps({"tarih": g.isoformat(), "saatler": satirlar}).encode()
    req = urllib.request.Request(WEBHOOK, data=body, method="POST",
                                 headers={"Content-Type": "application/json"})
    try:
        urllib.request.urlopen(req, timeout=20).read()
        log.info("Webhook OK: %s", g)
    except Exception as e:
        log.warning("Webhook hatası (%s): %s", g, e)


# ---------------- akış ----------------
def gun_isle(c, g: date) -> bool:
    if gun_tam_mi(c, g):
        return True
    satirlar = [s for s in ptf_getir(g, g) if s["tarih"] == g.isoformat()]
    if len(satirlar) < 24:
        log.info("%s henüz yayınlanmamış (%d saat geldi)", g, len(satirlar))
        return False
    kaydet(c, satirlar)
    ort = sum(s["ptf_tl"] for s in satirlar) / len(satirlar)
    log.info("%s kaydedildi: 24 saat, ort %.2f TL/MWh", g, ort)
    webhook_gonder(g, satirlar)
    return True


def aralik_doldur(c, bas: date, bit: date):
    g = bas
    while g <= bit:
        parca_bit = min(g + timedelta(days=30), bit)
        satirlar = ptf_getir(g, parca_bit)
        if satirlar:
            kaydet(c, satirlar)
        log.info("Doldurma %s → %s: %d saat", g, parca_bit, len(satirlar))
        g = parca_bit + timedelta(days=1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tarih")
    ap.add_argument("--aralik", nargs=2)
    a = ap.parse_args()
    c = db_ac()

    if a.aralik:
        aralik_doldur(c, date.fromisoformat(a.aralik[0]), date.fromisoformat(a.aralik[1]))
        return 0
    if a.tarih:
        return 0 if gun_isle(c, date.fromisoformat(a.tarih)) else 1

    bugun = datetime.now(TR).date()
    # eksik geçmiş günler (bugün dahil)
    for i in range(GERIYE, -1, -1):
        g = bugun - timedelta(days=i)
        if not gun_tam_mi(c, g):
            gun_isle(c, g)
    # yarın: sadece 12:30 sonrası dene
    if datetime.now(TR).time() >= datetime.strptime("12:30", "%H:%M").time():
        return 0 if gun_isle(c, bugun + timedelta(days=1)) else 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
