"""Müşteri Monitoring · Ace Center (OSB sayaç sistemi) toplayıcısı — solarman.py döngüsünden çağrılır.

Ace Center girişinde güvenlik kodu (captcha) olduğu için toplayıcı GİRİŞ YAPMAZ. Ömer bir kez tarayıcıdan girer,
oturum çerezini aesun Secrets'a ACE_OTURUM olarak kendisi ekler (musteri_sir.yml → /opt/aesun/musteri.env).
Toplayıcı her turda (5 dk) aynı oturumla okur; bu düzenli istekler oturumu açık tutar. Oturum düşerse
durum.json'a "oturum düştü — yeniden giriş" yazılır, veri dosyalarına dokunulmaz.

Ortam: ACE_OTURUM (Cookie başlığı, "ad=değer; ad2=değer2"), ACE_TABAN (vars. http://95.9.199.129:7080),
       ACE_SANTRAL_AD, ACE_ADRES, ACE_KAPASITE_KWP (isteğe bağlı).
Dosyalar (/musteri/<üretim sayacı seri no>/): son.json, ay_YYYYMM.json, yil_YYYY.json, reaktif.json
"""
import json, os, time
from datetime import datetime, timedelta, timezone
from pathlib import Path
import requests

TABAN = os.environ.get("ACE_TABAN", "http://95.9.199.129:7080").rstrip("/")
OTURUM = os.environ.get("ACE_OTURUM", "").strip()
AD = os.environ.get("ACE_SANTRAL_AD", "HAS GERİ DÖNÜŞÜM GES")
ADRES = os.environ.get("ACE_ADRES", "")
KAP = float(os.environ["ACE_KAPASITE_KWP"]) if os.environ.get("ACE_KAPASITE_KWP") else None
TR = timezone(timedelta(hours=3))
SINIR = {"ind": 20.0, "kap": 15.0}   # reaktif ceza sınırları (%), aktif enerjiye oran


class OturumDustu(RuntimeError):
    pass


def etkin():
    return bool(OTURUM)


def _oku(p: Path, vars_):
    try:
        return json.loads(p.read_text())
    except Exception:
        return vars_


def _oturum():
    s = requests.Session()
    s.headers.update({"User-Agent": "aesun-musteri/1", "X-Requested-With": "XMLHttpRequest",
                      "Accept": "application/json, text/javascript, */*", "Cookie": OTURUM})
    return s


def _grafik(s, tur):
    r = s.post(TABAN + "/Home/ChartData", data={"chartType": tur, "start": "1"}, timeout=40, allow_redirects=False)
    if r.status_code in (301, 302, 401, 403) or "/Account/Login" in r.headers.get("Location", ""):
        raise OturumDustu("Ace Center oturumu düştü — tarayıcıdan yeniden girip ACE_OTURUM güncellenmeli")
    r.raise_for_status()
    try:
        j = r.json()
    except ValueError:
        raise OturumDustu("Ace Center JSON yerine sayfa döndü (oturum düşmüş olabilir)")
    if not isinstance(j, list) or len(j) < 2:
        return []
    return j[1] or []


def _f(v):
    try:
        return round(float(v), 3)
    except (TypeError, ValueError):
        return None


def _gun(term):   # "1.10.2026 00:00" → date
    return datetime.strptime(str(term).split()[0], "%d.%m.%Y").date()


def tur(KOK: Path, yaz):
    s = _oturum()
    simdi = datetime.now(TR); bugun = simdi.date()
    gu = _grafik(s, "DailyProduction"); gt = _grafik(s, "DailyConsumption")
    au = _grafik(s, "MonthlyProduction"); at = _grafik(s, "MonthlyConsumption")
    ru = _grafik(s, "MonthlyPenaltyRateProduction"); rt = _grafik(s, "MonthlyPenaltyRate")

    snu = str((au or gu or [{}])[0].get("DeviceSerialNo") or "")
    if not snu.isdigit():
        raise RuntimeError("Ace Center: üretim sayacı bulunamadı")
    d = KOK / snu
    tuk_sn = sorted({str(x.get("DeviceSerialNo")) for x in gt + at if x.get("DeviceSerialNo")})

    # --- günlük (bu ay): üretim + sayaç başına tüketim + reaktif; eski günler korunur
    ay_yol = d / f"ay_{bugun.year}{bugun.month:02d}.json"
    gunler = {x["g"]: x for x in _oku(ay_yol, [])}
    for x in gu:
        t = _gun(x["Term"])
        if (t.year, t.month) != (bugun.year, bugun.month):
            continue
        k = gunler.setdefault(t.day, {"g": t.day})
        k.update(kwh=_f(x.get("ActiveCons")), ind=_f(x.get("EnductiveCons")), kap=_f(x.get("CapasitiveCons")))
    for x in gt:
        t = _gun(x["Term"])
        if (t.year, t.month) != (bugun.year, bugun.month):
            continue
        k = gunler.setdefault(t.day, {"g": t.day})
        k.setdefault("tuk", {})[str(x["DeviceSerialNo"])] = {"kwh": _f(x.get("ActiveCons")), "ind": _f(x.get("EnductiveCons")), "kap": _f(x.get("CapasitiveCons"))}
    ay = [gunler[g] for g in sorted(gunler)]
    yaz(ay_yol, ay)

    # --- aylık (son 12 ay): Term ay numarası; bu aydan büyük aylar geçen yıla aittir
    yil_ = lambda m: bugun.year if int(m) <= bugun.month else bugun.year - 1
    yillar = {}
    for x in au:
        m = int(x["Term"]); y = yil_(m)
        yillar.setdefault(y, {}).setdefault(m, {"ay": m}).update(kwh=_f(x.get("ActiveCons")), ind=_f(x.get("EnductiveCons")), kap=_f(x.get("CapasitiveCons")))
    for x in at:
        m = int(x["Term"]); y = yil_(m)
        yillar.setdefault(y, {}).setdefault(m, {"ay": m}).setdefault("tuk", {})[str(x["DeviceSerialNo"])] = {
            "kwh": _f(x.get("ActiveCons")), "ind": _f(x.get("EnductiveCons")), "kap": _f(x.get("CapasitiveCons"))}
    for y, aylar in yillar.items():
        p = d / f"yil_{y}.json"
        eski = {x["ay"]: x for x in _oku(p, [])}
        eski.update(aylar)
        yaz(p, [eski[m] for m in sorted(eski)])

    # --- reaktif oranlar (%), son 12 ay
    def oran(rows):
        out = {}
        for x in rows:
            m = int(x["Term"])
            out.setdefault(str(x.get("DeviceSerialNo")), []).append({"yil": yil_(m), "ay": m, "ind": _f(x.get("EnductiveRate")), "kap": _f(x.get("CapasitiveRate"))})
        for v in out.values():
            v.sort(key=lambda z: (z["yil"], z["ay"]))
        return out
    reak = {"sinir": SINIR, "uretim": oran(ru).get(snu, []), "tuketim": oran(rt), "toplandi": int(time.time())}
    yaz(d / "reaktif.json", reak)

    # --- özet
    bu = next((x for x in ay if x["g"] == bugun.day), {})
    dun_t = bugun - timedelta(days=1)
    dun = next((x for x in ay if x["g"] == dun_t.day), {}) if dun_t.month == bugun.month else {}
    top = lambda key: round(sum((x.get(key) or 0) for x in ay), 2)
    tuk_ay = {sn: round(sum(((x.get("tuk") or {}).get(sn) or {}).get("kwh") or 0 for x in ay), 2) for sn in tuk_sn}
    yil_kwh = round(sum((v.get("kwh") or 0) for v in (yillar.get(bugun.year) or {}).values()), 2) or None
    alarmlar = []
    for ad_, liste in [("Üretim", reak["uretim"])] + [(f"Tüketim {sn}", v) for sn, v in reak["tuketim"].items()]:
        son = liste[-1] if liste else None
        if son and son["yil"] == bugun.year and son["ay"] == bugun.month:
            for k, et in (("ind", "Endüktif"), ("kap", "Kapasitif")):
                if (son.get(k) or 0) > SINIR[k]:
                    alarmlar.append({"alertName": f"{ad_}: {et} oran %{son[k]:.1f} (sınır %{SINIR[k]:.0f})", "level": 1, "alertTime": int(time.time())})
    yaz(d / "son.json", {
        "sid": snu, "ad": AD, "adres": ADRES, "kapasite_kwp": KAP, "kaynak": "ace",
        "guc_w": None, "gunluk_kwh": bu.get("kwh"), "aylik_kwh": top("kwh"), "yillik_kwh": yil_kwh, "toplam_kwh": None,
        "iletisim": "NORMAL", "son_veri": int(time.time()), "alarmlar": alarmlar,
        "sayac": {"uretim_sn": snu, "tuketim_sn": tuk_sn, "dun_uretim_kwh": dun.get("kwh"),
                  "bugun_tuketim": {sn: ((bu.get("tuk") or {}).get(sn) or {}).get("kwh") for sn in tuk_sn}, "ay_tuketim": tuk_ay},
        "toplandi": int(time.time())})
    return {snu: {"ad": AD, "adres": ADRES, "kapasite_kwp": KAP, "tip": "sayac", "hesap": "ace", "kaynak": "ace"}}
