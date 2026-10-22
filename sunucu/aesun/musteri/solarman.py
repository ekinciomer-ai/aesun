"""Müşteri Monitoring · SOLARMAN Business toplayıcısı (ns1, aesun-musteri kapsayıcısı).

AEMonitoring'den AYRIDIR: veri yalnız bu kapsayıcının birimine (/musteri) yazılır; epias-ptf'e, GitHub'a,
n8n'e yazılmaz. Kimlik bilgisi /opt/aesun/musteri.env'den ortam değişkeni olarak gelir; hiçbir dosyaya/loga yazılmaz.

Dosyalar (santral başına /musteri/<sid>/):
  son.json          anlık özet (güç, günlük/aylık/yıllık/toplam üretim, durum, alarmlar)
  gun_YYYYMMDD.json gün içi güç eğrisi (5 dk)
  ay_YYYYMM.json    günlük üretimler
  yil_YYYY.json     aylık üretimler
/musteri/santraller.json  {sid: {ad, adres, kapasite_kwp, ...}}  ·  /musteri/durum.json  toplayıcı sağlığı
"""
import hashlib, json, os, time, traceback
from datetime import datetime, timedelta, timezone
from pathlib import Path
import requests

KOK = Path(os.environ.get("MUSTERI_VERI", "/musteri"))
TABAN = os.environ.get("SOLARMAN_TABAN", "https://globalpro.solarmanpv.com")
# Birden çok müşteri hesabı: SOLARMAN_KULLANICI/SOLARMAN_SIFRE, SOLARMAN_KULLANICI_TATMAK/SOLARMAN_SIFRE_TATMAK, _2.._9 vb. tüm sonekler
HESAPLAR = [(k[18:], v, os.environ.get("SOLARMAN_SIFRE" + k[18:], ""))
            for k, v in sorted(os.environ.items()) if k.startswith("SOLARMAN_KULLANICI") and v]
ARALIK = int(os.environ.get("MUSTERI_ARALIK_SN", "300"))
TR = timezone(timedelta(hours=3))

class Hesap:
    def __init__(self, ad, kul, sifre):
        self.ad, self.kul, self.sifre, self.t, self.son, self.taban = ad or "_1", kul, sifre, None, 0, TABAN
        self.s = requests.Session(); self.s.headers.update({"User-Agent": "aesun-musteri/1", "Accept": "application/json"})

def yaz(p: Path, v):
    p.parent.mkdir(parents=True, exist_ok=True)
    g = p.with_suffix(".tmp"); g.write_text(json.dumps(v, ensure_ascii=False, separators=(",", ":"))); g.replace(p)

def giris(H, taban=None):
    """Web hesabıyla oturum. Şifre SHA-256 özetiyle gönderilir; jeton yalnız bellekte tutulur."""
    if not H.kul or not H.sifre:
        raise RuntimeError(f"hesap {H.ad}: kullanıcı/şifre tanımlı değil")
    tb = taban or H.taban or TABAN
    pw = hashlib.sha256(H.sifre.encode()).hexdigest()
    r = H.s.post(tb + "/oauth-s/oauth/token", timeout=30, data={
        "grant_type": "mdc_password", "username": H.kul, "clear_text_pwd": "",
        "password": pw, "identity_type": 2, "client_id": "test", "system": "SOLARMAN"})
    if r.status_code != 200 or "access_token" not in r.text:
        raise RuntimeError(f"hesap {H.ad}: giriş başarısız (HTTP {r.status_code})")
    j = r.json(); t = j["access_token"]
    # Business hesabında organizasyon listesi varsa org_id ile jetonu yenile
    try:
        ro = H.s.get(tb + "/user-s/acc/org/my?language=en", headers={"Authorization": "bearer " + t}, timeout=15)
        if ro.status_code == 200:
            oj = ro.json()
            ol = oj if isinstance(oj, list) else (oj.get("data") or oj.get("orgList") or oj.get("orgInfoList") or [])
            if ol and isinstance(ol, list):
                oid = ol[0].get("orgId") or ol[0].get("id") or ol[0].get("companyId")
                if oid:
                    r2 = H.s.post(tb + "/oauth-s/oauth/token", timeout=20, data={
                        "grant_type": "mdc_password", "username": H.kul, "clear_text_pwd": "",
                        "password": pw, "identity_type": 2, "access_token": t, "org_id": oid,
                        "client_id": "test", "system": "SOLARMAN"})
                    if r2.status_code == 200 and "access_token" in r2.text:
                        j = r2.json(); t = j["access_token"]
    except Exception:
        pass
    H.taban = tb; H.t = t; H.son = time.time() + int(j.get("expires_in", 3600)) - 300

def tur(H):
    def istek(yol, govde=None):
        if not H.t or time.time() > H.son:
            giris(H)
        for deneme in (1, 2):
            h = {"Authorization": "bearer " + H.t}
            r = H.s.post(H.taban + yol, json=govde, headers=h, timeout=30) if govde is not None else H.s.get(H.taban + yol, headers=h, timeout=30)
            if r.status_code == 401 and deneme == 1:
                giris(H); continue
            r.raise_for_status(); return r.json()

    simdi = datetime.now(TR); y, a, g = simdi.year, simdi.month, simdi.day
    liste = istek("/maintain-s/operating/station/v2/search?page=1&size=100&order.direction=ASC&order.property=name", {"station": {"powerTypeList": ["PV"]}})
    if not (liste or {}).get("data"):
        liste = istek("/maintain-s/operating/station/v2/search?page=1&size=100&order.direction=ASC&order.property=name", {})
    if not (liste or {}).get("data") and H.taban != "https://globalhome.solarmanpv.com":
        try:
            giris(H, "https://globalhome.solarmanpv.com")
            liste = istek("/maintain-s/operating/station/v2/search?page=1&size=100&order.direction=ASC&order.property=name", {})
        except Exception:
            giris(H, TABAN)
    santraller = {}
    for kay in (liste or {}).get("data", []):
        s = (kay.get("station") if isinstance(kay, dict) and "station" in kay else kay) or {}
        sid = str(s.get("id"))
        if not sid or sid == "None":
            continue
        santraller[sid] = {"ad": s.get("name"), "adres": s.get("locationAddress"), "kapasite_kwp": s.get("installedCapacity"),
                           "isletme_baslangic": s.get("startOperatingTime"), "tip": s.get("type"), "hesap": H.ad}
        d = KOK / sid
        try:
            alarm = istek("/maintain-s/operating/station/alert/lastest/list", {"stationIds": [int(sid)], "lan": "tr"}) or []
        except Exception:
            alarm = []
        gun = istek(f"/maintain-s/history/power/{sid}/record?year={y}&month={a}&day={g}")
        ay = istek(f"/maintain-s/history/power/{sid}/stats/month?year={y}&month={a}")
        yil = istek(f"/maintain-s/history/power/{sid}/stats/year?year={y}")
        yaz(d / f"gun_{y}{a:02d}{g:02d}.json", [{"t": int(r.get("dateTime") or 0), "w": r.get("generationPower")} for r in gun.get("records", [])])
        yaz(d / f"ay_{y}{a:02d}.json", [{"g": r.get("day"), "kwh": r.get("generationValue"), "saat": r.get("fullPowerHoursDay")} for r in ay.get("records", [])])
        yaz(d / f"yil_{y}.json", [{"ay": r.get("month"), "kwh": r.get("generationValue")} for r in yil.get("records", [])])
        yaz(d / "son.json", {
            "sid": sid, "ad": s.get("name"), "adres": s.get("locationAddress"), "kapasite_kwp": s.get("installedCapacity"),
            "guc_w": s.get("generationPower"), "gunluk_kwh": s.get("generationValue"), "aylik_kwh": s.get("generationMonth"),
            "yillik_kwh": s.get("generationYear"), "toplam_kwh": s.get("generationTotal"), "tam_guc_saat": s.get("fullPowerHoursDay"),
            "iletisim": s.get("networkStatus"), "uyari": s.get("businessWarningStatus"), "son_veri": s.get("lastUpdateTime"),
            "alarmlar": [{k: x.get(k) for k in ("alertName", "level", "deviceSn", "alertTime", "content") if k in x} for x in alarm][:20],
            "toplandi": int(time.time())})
    # geçen yılın/ayın kapanışını bir kez tamamla
    if g <= 2:
        o = simdi - timedelta(days=g + 1)
        for sid in santraller:
            try:
                ay = istek(f"/maintain-s/history/power/{sid}/stats/month?year={o.year}&month={o.month}")
                yaz(KOK / sid / f"ay_{o.year}{o.month:02d}.json", [{"g": r.get("day"), "kwh": r.get("generationValue"), "saat": r.get("fullPowerHoursDay")} for r in ay.get("records", [])])
            except Exception:
                pass
    return santraller

def main():
    KOK.mkdir(parents=True, exist_ok=True)
    hesaplar = [Hesap(*h) for h in HESAPLAR]
    eski = {}
    try:
        eski = json.loads((KOK / "santraller.json").read_text())
    except Exception:
        pass
    while True:
        bas = time.time(); durum = {"zaman": int(bas), "kaynak": "solarman", "hesaplar": {}}
        hepsi = dict(eski)   # hata veren hesabın santralleri listeden düşmesin
        for H in hesaplar:
            try:
                s = tur(H); hepsi.update(s); durum["hesaplar"][H.ad] = {"tamam": True, "santral": len(s)}
            except Exception as e:
                durum["hesaplar"][H.ad] = {"tamam": False, "hata": str(e)[:200]}; traceback.print_exc(limit=1); H.t = None
        yaz(KOK / "santraller.json", hepsi); eski = hepsi
        hatalar = [f"{k}: {v['hata']}" for k, v in durum["hesaplar"].items() if not v["tamam"]]
        durum.update(tamam=not hatalar and bool(hesaplar), santral=len(hepsi))
        if hatalar or not hesaplar:
            durum["hata"] = "; ".join(hatalar)[:300] or "hesap tanımlı değil"
        durum["sure_sn"] = round(time.time() - bas, 1)
        yaz(KOK / "durum.json", durum)
        time.sleep(max(30, ARALIK - (time.time() - bas)))

if __name__ == "__main__":
    main()
