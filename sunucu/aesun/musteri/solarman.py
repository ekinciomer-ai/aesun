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
        self.iz = {}
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
    id_tipleri = (2, 3, 1) if "@" in H.kul else (3, 2, 1)
    j = None; t = None; secilen_tip = id_tipleri[0]; oauth_yol = "/oauth2-s/oauth/token"
    for yol in ("/oauth2-s/oauth/token", "/oauth-s/oauth/token"):
        for tip in id_tipleri:
            r = H.s.post(tb + yol, timeout=30, data={
                "grant_type": "mdc_password", "username": H.kul, "clear_text_pwd": "",
                "password": pw, "identity_type": tip, "client_id": "test", "system": "SOLARMAN"})
            if r.status_code == 200 and "access_token" in r.text:
                j = r.json(); t = j.get("access_token")
                if t:
                    secilen_tip = tip; oauth_yol = yol; break
        if t:
            break
    if not t:
        raise RuntimeError(f"hesap {H.ad}: giriş başarısız")
    eski_ara = H.iz.get("ara", [])
    H.iz = {"tb": tb.split("//")[-1].split(".")[0], "tip": secilen_tip, "mdc": j.get("mdc")}
    if eski_ara:
        H.iz["ara"] = eski_ara
    # Business hesabında organizasyon listesi varsa (/user-s/acc/org/my → [{"org":{"id":...}}]) grant_type=switch_org ile jetonu organizasyona geçir
    try:
        ro = H.s.get(tb + "/user-s/acc/org/my?language=en", headers={"Authorization": "Bearer " + t}, timeout=15)
        H.iz["org_st"] = ro.status_code
        if ro.status_code == 200:
            oj = ro.json()
            ol = oj if isinstance(oj, list) else (oj.get("data") or oj.get("orgList") or oj.get("orgInfoList") or [])
            if ol and isinstance(ol, list):
                ilk_t = t
                H.iz["orgs"] = []
                for item in ol:
                    org = (item.get("org") if isinstance(item, dict) and isinstance(item.get("org"), dict) else item) or {}
                    oid = org.get("id") or org.get("orgId") or org.get("companyId")
                    H.iz["orgs"].append(f"{oid}:{org.get('name')}")
                    if not oid:
                        continue
                    r2 = H.s.post(tb + oauth_yol, timeout=20, headers={"Authorization": "Bearer " + ilk_t}, data={
                        "grant_type": "switch_org", "identity_type": secilen_tip, "username": H.kul,
                        "password": pw, "access_token": ilk_t, "client_id": "test", "org_id": oid, "system": "SOLARMAN"})
                    H.iz["sw_st"] = r2.status_code
                    if r2.status_code == 200 and "access_token" in r2.text:
                        j2 = r2.json()
                        if j2.get("access_token"):
                            j = j2; t = j2["access_token"]; H.iz["sw_ok"] = oid; break
                    else:
                        H.iz["sw_err"] = r2.text[:120]
    except Exception as ex:
        H.iz["org_ex"] = str(ex)[:100]
    H.taban = tb; H.t = t; H.son = time.time() + int(j.get("expires_in", 3600)) - 300

def tur(H):
    def istek(yol, govde=None):
        if not H.t or time.time() > H.son:
            giris(H)
        for deneme in (1, 2):
            h = {"Authorization": "Bearer " + H.t}
            r = H.s.post(H.taban + yol, json=govde, headers=h, timeout=30) if govde is not None else H.s.get(H.taban + yol, headers=h, timeout=30)
            if r.status_code == 401 and deneme == 1:
                giris(H); continue
            r.raise_for_status(); return r.json()

    def santral_ara():
        H.iz.setdefault("ara", [])
        for kisa, yol, govde in (
            ("v2_pv", "/maintain-s/operating/station/v2/search?page=1&size=100&order.direction=ASC&order.property=name", {"station": {"powerTypeList": ["PV"]}}),
            ("v2", "/maintain-s/operating/station/v2/search?page=1&size=100&order.direction=ASC&order.property=name", {}),
            ("view_v2", "/maintain-s/operating/station/stationView/v2/search?page=1&size=100&order.direction=ASC&order.property=name", {}),
            ("s1", "/maintain-s/operating/station/search?page=1&size=100&order.direction=ASC&order.property=name", {}),
            ("scr", "/maintain-s/operating/station/screen/search?page=1&size=100&order.direction=ASC&order.property=name", None),
        ):
            try:
                res = istek(yol, govde)
                d = (res or {}).get("data") if isinstance(res, dict) else (res if isinstance(res, list) else None)
                H.iz["ara"].append(f"{H.iz.get('tb')}:{kisa}:{len(d) if isinstance(d, list) else type(res).__name__}:{(res or {}).get('total') if isinstance(res, dict) else ''}")
                if isinstance(d, list) and d:
                    return {"data": d}
            except Exception as ex:
                H.iz["ara"].append(f"{H.iz.get('tb')}:{kisa}:err:{str(ex)[:60]}")
        return {}

    simdi = datetime.now(TR); y, a, g = simdi.year, simdi.month, simdi.day
    liste = santral_ara()
    if not (liste or {}).get("data") and H.taban != "https://globalhome.solarmanpv.com":
        try:
            giris(H, "https://globalhome.solarmanpv.com")
            liste = santral_ara()
        except Exception as ex:
            H.iz.setdefault("ara", []).append(f"home_err:{str(ex)[:60]}")
        if not (liste or {}).get("data"):
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
                H.iz = {}
                s = tur(H); hepsi.update(s); durum["hesaplar"][H.ad] = {"tamam": True, "santral": len(s), "iz": H.iz}
            except Exception as e:
                durum["hesaplar"][H.ad] = {"tamam": False, "hata": str(e)[:200], "iz": H.iz}; traceback.print_exc(limit=1); H.t = None
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
