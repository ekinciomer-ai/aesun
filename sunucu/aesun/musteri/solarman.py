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
KUL = os.environ.get("SOLARMAN_KULLANICI", "")
SIFRE = os.environ.get("SOLARMAN_SIFRE", "")
ARALIK = int(os.environ.get("MUSTERI_ARALIK_SN", "300"))
TR = timezone(timedelta(hours=3))
S = requests.Session(); S.headers.update({"User-Agent": "aesun-musteri/1", "Accept": "application/json"})
JETON = {"t": None, "son": 0}

def yaz(p: Path, v):
    p.parent.mkdir(parents=True, exist_ok=True)
    g = p.with_suffix(".tmp"); g.write_text(json.dumps(v, ensure_ascii=False, separators=(",", ":"))); g.replace(p)

def giris(taban=None, sys_ad="SOLARMAN"):
    """Web hesabıyla oturum. Şifre SHA-256 özetiyle gönderilir; jeton yalnız bellekte tutulur."""
    if not KUL or not SIFRE:
        raise RuntimeError("SOLARMAN_KULLANICI / SOLARMAN_SIFRE tanımlı değil")
    tb = taban or JETON.get("taban") or TABAN
    r = S.post(tb + "/oauth-s/oauth/token", timeout=30, data={
        "grant_type": "mdc_password", "username": KUL, "clear_text_pwd": "",
        "password": hashlib.sha256(SIFRE.encode()).hexdigest(), "identity_type": 2,
        "client_id": "test", "system": sys_ad})
    if r.status_code != 200 or "access_token" not in r.text:
        raise RuntimeError(f"giriş başarısız ({tb}, HTTP {r.status_code})")
    j = r.json()
    t = j["access_token"]
    rt = j.get("refresh_token")
    # SOLARMAN Business (globalpro): org seçimi gerekiyorsa ilk organizasyonla jetonu yenile
    if rt and not j.get("org_id"):
        for org_yol in ("/business-s/acc/org/list", "/account-s/acc/org/list", "/maintain-s/acc/org/list"):
            try:
                ro = S.get(tb + org_yol, headers={"Authorization": "bearer " + t}, timeout=15)
                if ro.status_code == 200:
                    oj = ro.json()
                    ol = oj if isinstance(oj, list) else (oj.get("data") or oj.get("orgList") or oj.get("records") or [])
                    if ol and isinstance(ol, list):
                        oid = ol[0].get("orgId") or ol[0].get("id") or ol[0].get("companyId")
                        if oid:
                            r2 = S.post(tb + "/oauth-s/oauth/token", timeout=20, data={
                                "grant_type": "refresh_token", "refresh_token": rt,
                                "org_id": oid, "client_id": "test", "system": sys_ad})
                            if r2.status_code == 200 and "access_token" in r2.text:
                                j = r2.json(); t = j["access_token"]
                                break
            except Exception:
                pass
    JETON.update(t=t, taban=tb, son=time.time() + int(j.get("expires_in", 3600)) - 300)

def istek(yol, govde=None):
    if not JETON["t"] or time.time() > JETON["son"]:
        giris()
    for deneme in (1, 2):
        tb = JETON.get("taban") or TABAN
        h = {"Authorization": "bearer " + JETON["t"]}
        r = S.post(tb + yol, json=govde, headers=h, timeout=30) if govde is not None else S.get(tb + yol, headers=h, timeout=30)
        if r.status_code == 401 and deneme == 1:
            giris(tb); continue
        r.raise_for_status(); return r.json()

def istasyon_ara():
    """Hem Business (globalpro) hem Smart (globalhome) uçlarını ve filtreli/filtresiz aramayı dener."""
    adaylar = [
        (TABAN, "SOLARMAN", "/maintain-s/operating/station/v2/search?page=1&size=100&order.direction=ASC&order.property=name", {}),
        (TABAN, "SOLARMAN", "/maintain-s/operating/station/v2/search?page=1&size=100&order.direction=ASC&order.property=name", {"station": {}}),
        (TABAN, "SOLARMANPRO", "/maintain-s/operating/station/v2/search?page=1&size=100&order.direction=ASC&order.property=name", {}),
        (TABAN, "SOLARMAN", "/maintain-s/operating/station/search?page=1&size=100&order.direction=ASC&order.property=name", {}),
        ("https://globalhome.solarmanpv.com", "SOLARMAN", "/maintain-s/operating/station/v2/search?page=1&size=100&order.direction=ASC&order.property=name", {}),
        ("https://globalhome.solarmanpv.com", "SOLARMAN", "/maintain-s/operating/station/search?page=1&size=100&order.direction=ASC&order.property=name", {}),
    ]
    for tb, sys_ad, yol, govde in adaylar:
        try:
            if JETON.get("taban") != tb or not JETON.get("t"):
                giris(tb, sys_ad)
            res = istek(yol, govde)
            veri = (res or {}).get("data") if isinstance(res, dict) else (res if isinstance(res, list) else None)
            if not veri and isinstance(res, dict):
                veri = res.get("records") or res.get("stationList") or []
            if veri:
                return veri
        except Exception:
            continue
    return []

def tur():
    simdi = datetime.now(TR); y, a, g = simdi.year, simdi.month, simdi.day
    kayitlar = istasyon_ara()
    santraller = {}
    for kay in kayitlar:
        s = (kay.get("station") if isinstance(kay, dict) and "station" in kay else kay) or {}
        sid = str(s.get("id") or kay.get("id"))
        if not sid or sid == "None":
            continue
        santraller[sid] = {"ad": s.get("name"), "adres": s.get("locationAddress"), "kapasite_kwp": s.get("installedCapacity"),
                           "isletme_baslangic": s.get("startOperatingTime"), "tip": s.get("type")}
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
    yaz(KOK / "santraller.json", santraller)
    return len(santraller)

def main():
    KOK.mkdir(parents=True, exist_ok=True)
    while True:
        bas = time.time(); durum = {"zaman": int(bas), "kaynak": "solarman"}
        try:
            durum.update(tamam=True, santral=tur())
        except Exception as e:
            durum.update(tamam=False, hata=str(e)[:200]); traceback.print_exc(limit=1)
            JETON["t"] = None
        durum["sure_sn"] = round(time.time() - bas, 1)
        yaz(KOK / "durum.json", durum)
        time.sleep(max(30, ARALIK - (time.time() - bas)))

if __name__ == "__main__":
    main()
