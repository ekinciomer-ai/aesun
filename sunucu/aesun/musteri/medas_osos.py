"""Müşteri Monitoring · MEDAŞ GridBox OSOS (osos.meramedas.com.tr) sayaç toplayıcısı.

Çaylı Yem A.Ş. (Tesisat: 11506568, WiringId: 18229, Sayaç Seri No: 670013096, Çarpan: 80)
gibi MEDAŞ dağıtım şebekesindeki çift yönlü OSOS sayaçlarının 15 dakikalık yük profili verilerini
çeker; saatlik (osf07_YYYYMM.json), günlük (sayac_ay_YYYYMM.json), 12 aylık (sayac_yil_YYYY.json)
ve reaktif ceza oranı (reaktif.json) dosyalarını üretip ilgili SOLARMAN santraliyle (64837159) birleştirir.

Giriş: /opt/aesun/musteri.env içindeki OSOS_KULLANICI ve OSOS_SIFRE.
"""
import json, os, re, time
from calendar import monthrange
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
import requests

BASE = os.environ.get("MEDAS_OSOS_TABAN", "https://osos.meramedas.com.tr").rstrip("/")
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36"
TR = timezone(timedelta(hours=3))
SINIR = {"ind": 20.0, "kap": 15.0}

KOLON = [
    "ProfileDateTime", "ActiveEndex", "ActiveEndexDiff", "ActiveEndexOut", "ActiveEndexOutDiff", "ActiveEnergy",
    "InstantActiveDemand", "InstantActiveDemandOut", "InstantReactiveDemand", "InstantReactiveDemandOut",
    "CosL1", "CosL2", "CosL3", "FrequenceL1", "FrequenceL2", "FrequenceL3", "Voltage", "VoltageL1", "VoltageL2",
    "VoltageL3", "ReactiveCapacitiveEndex", "ReactiveCapacitiveEndexOut", "ReactiveInductiveEndex",
    "ReactiveInductiveEndexOut", "TotalReactiveEndex", "TotalReactiveEndexOut", "ActiveT0IndexDifference",
    "ActiveT0IndexExportDifference", "ReactiveIndexQ2Difference", "ReactiveIndexQ3Difference", "Id", "Meter_Id",
    "Wiring_Id",
]

# Müşteri Paneli'nde izlenen MEDAŞ OSOS abonelikleri
ABONELER = [
    {
        "tesisat": "11506568",
        "wid": "18229",
        "sayac_seri_no": "670013096",
        "carpan": 80.0,
        "ad": "Çaylı Yem",
        "abone_adi": "ÇAYLI YEM A.Ş. (Tesisat: 11506568 · Sayaç: 670013096)",
        "adres": "Ortaköy / Aksaray (MEDAŞ)",
        "hesap_eslesme": ("_1", "cayli", "çaylı", "64837159"),
    },
]

_OTURUM: requests.Session | None = None


class OturumHatasi(RuntimeError):
    pass


def _kimlik() -> tuple[str, str]:
    kul = (os.environ.get("OSOS_KULLANICI") or "").strip()
    sif = (os.environ.get("OSOS_SIFRE") or "").strip()
    return kul, sif


def etkin() -> bool:
    kul, sif = _kimlik()
    return bool(kul and sif)


def _sayi(v) -> float | None:
    if v is None or v == "":
        return None
    if isinstance(v, (int, float)):
        return float(v)
    t = str(v).strip().replace(" ", "")
    if not t:
        return None
    if "," in t:
        t = t.replace(".", "").replace(",", ".")
    try:
        return float(t)
    except ValueError:
        return None


def _oku(p: Path, varsayilan):
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return varsayilan


def _formu_bul(html: str):
    for fm in re.finditer(r"<form\b([^>]*)>(.*?)</form>", html, re.S | re.I):
        govde_ = fm.group(2)
        if not re.search(r'type=["\']?password', govde_, re.I):
            continue
        act = (re.search(r'action=["\']([^"\']*)', fm.group(1), re.I) or [None, ""])[1]
        gizli, kullanici, sifre = [], None, None
        for inp in re.finditer(r"<input\b[^>]*>", govde_, re.I):
            t = inp.group(0)
            ad = (re.search(r'name=["\']([^"\']+)', t, re.I) or [None, None])[1]
            tip = ((re.search(r'type=["\']?([a-z]+)', t, re.I) or [None, "text"])[1]).lower()
            if not ad:
                continue
            if tip == "password":
                sifre = ad
            elif tip in ("text", "email") and not kullanici:
                kullanici = ad
            elif tip in ("hidden", "checkbox"):
                val = (re.search(r'value=["\']([^"\']*)', t, re.I) or [None, ""])[1]
                if tip == "checkbox":
                    val = "true"
                gizli.append((ad, val))
        return act, gizli, kullanici, sifre
    return None


def _giris_yap() -> requests.Session:
    global _OTURUM
    kul, sif = _kimlik()
    if not (kul and sif):
        raise OturumHatasi("MEDAŞ OSOS kullanıcı/şifre tanımlı değil")
    s = requests.Session()
    s.headers.update({"User-Agent": UA, "Accept-Language": "tr-TR,tr;q=0.9"})
    r = s.get(BASE + "/", timeout=60)
    f = _formu_bul(r.text)
    if not f:
        raise OturumHatasi(f"MEDAŞ OSOS giriş formu bulunamadı (HTTP {r.status_code})")
    act, gizli, k_alan, s_alan = f
    if not k_alan or not s_alan:
        raise OturumHatasi("MEDAŞ OSOS formunda kullanıcı/şifre alanı yok")
    hedef = requests.compat.urljoin(r.url, act) if act else r.url
    veri = gizli + [(k_alan, kul), (s_alan, sif)]
    s.post(hedef, data=veri, timeout=60, headers={"Referer": r.url, "Origin": BASE})
    k = s.get(BASE + "/WiringDashboard/Index", timeout=60, allow_redirects=False)
    if k.status_code != 200 or _formu_bul(k.text):
        raise OturumHatasi(f"MEDAŞ OSOS girişi başarısız (kontrol HTTP {k.status_code})")
    _OTURUM = s
    return s


def _oturum(yenile: bool = False) -> requests.Session:
    global _OTURUM
    if yenile or _OTURUM is None:
        return _giris_yap()
    return _OTURUM


def _govde(wid: str, aralik: str, limit: int = 2000):
    p = [("draw", "1")]
    for i, ad in enumerate(KOLON):
        c = f"columns[{i}]"
        ara = ad in ("ProfileDateTime", "Meter_Id", "Wiring_Id")
        deger = aralik if ad == "ProfileDateTime" else (wid if ad == "Wiring_Id" else "")
        p += [
            (c + "[data]", ad[0].lower() + ad[1:]),
            (c + "[name]", ad),
            (c + "[searchable]", "true" if ara else "false"),
            (c + "[orderable]", "true"),
            (c + "[search][value]", deger),
            (c + "[search][regex]", "false"),
        ]
    p += [
        ("order[0][column]", "0"),
        ("order[0][dir]", "asc"),
        ("start", "0"),
        ("length", str(limit)),
        ("search[value]", ""),
        ("search[regex]", "false"),
        ("myKey", "myValue"),
    ]
    return p


def _yuk_profili(wid: str, aralik: str, limit: int = 2000) -> list[dict]:
    for deneme in (1, 2):
        s = _oturum(yenile=(deneme == 2))
        try:
            r = s.post(
                BASE + "/LoadProfile/ModelDatas",
                data=_govde(wid, aralik, limit=limit),
                timeout=120,
                allow_redirects=False,
                headers={
                    "X-Requested-With": "XMLHttpRequest",
                    "Referer": BASE + "/LoadProfile/Index",
                    "Origin": BASE,
                    "Accept": "application/json, text/javascript, */*; q=0.01",
                },
            )
            if 300 <= r.status_code < 400:
                raise OturumHatasi(f"yönlendirme {r.status_code}")
            j = r.json()
            if not isinstance(j.get("data"), list):
                raise RuntimeError("beklenmeyen yanıt")
            return j["data"]
        except Exception:
            if deneme == 2:
                raise
    return []


def _ay_yuk_profili_cek(wid: str, yil: int, ay: int, bugun: date, mevcut_gun_saat: dict) -> tuple[list[dict], bool]:
    """Ayın 15 dk kayıtlarını çeker. Önceki günler zaten tamamsa yalnız son 3 günü sorgular."""
    son_gun = bugun.day if (yil, ay) == (bugun.year, bugun.month) else monthrange(yil, ay)[1]
    tam_gun_sayisi = sum(
        1 for g in range(1, max(1, son_gun - 2))
        if len((mevcut_gun_saat.get(f"{yil}-{ay:02d}-{g:02d}") or {})) >= 20
    )
    kismi = tam_gun_sayisi >= max(0, son_gun - 4) and son_gun > 4
    if kismi:
        b_dt = date(yil, ay, max(1, son_gun - 3)) - timedelta(days=1)
        e_dt = date(yil, ay, son_gun)
        pencereler = [(b_dt.strftime("%d.%m.%Y"), e_dt.strftime("%d.%m.%Y"))]
    else:
        b0 = (date(yil, ay, 1) - timedelta(days=1)).strftime("%d.%m.%Y")
        orta = min(15, son_gun)
        pencereler = [(b0, f"{orta:02d}.{ay:02d}.{yil}")]
        if son_gun > 15:
            pencereler.append((f"15.{ay:02d}.{yil}", f"{son_gun:02d}.{ay:02d}.{yil}"))

    satirlar = []
    for b_str, e_str in pencereler:
        satirlar.extend(_yuk_profili(wid, f"{b_str} - {e_str}"))
    by_dt = {str(x.get("profileDateTime")): x for x in satirlar if x.get("profileDateTime")}
    return [by_dt[k] for k in sorted(by_dt)], kismi


def _saatlik_ve_gunluk_coz(
    rows: list[dict], carpan: float, yil: int, ay: int, mevcut_gun_saat: dict, kismi: bool
) -> tuple[dict, dict, dict | None]:
    """15 dk kayıtlarından gun_saat ({YYYY-MM-DD: {HH: {veris, cekis}}}) ve günlük reaktif farkları çıkarır."""
    gun_saat = {k: dict(v) for k, v in (mevcut_gun_saat or {}).items()} if kismi else {}
    yeni_saat = {}
    gun_reaktif = {}
    onceki = None
    son_kayit = None
    ay_onek = f"{yil}-{ay:02d}-"

    for x in rows:
        dt_str = str(x.get("profileDateTime") or "")
        if len(dt_str) < 16:
            continue
        son_kayit = x
        try:
            t = datetime.strptime(dt_str[:16].replace("T", " "), "%Y-%m-%d %H:%M")
        except ValueError:
            onceki = None
            continue

        if dt_str.startswith(ay_onek):
            g_str = dt_str[:10]
            h_str = dt_str[11:13]
            ce = _sayi(x.get("activeT0IndexDifference"))
            if ce is None:
                ce = _sayi(x.get("activeEndexDiff")) or 0.0
            ve = _sayi(x.get("activeT0IndexExportDifference"))
            if ve is None:
                ve = _sayi(x.get("activeEndexOutDiff")) or 0.0
            k = yeni_saat.setdefault(g_str, {}).setdefault(h_str, [0.0, 0.0])
            k[0] += ve * carpan
            k[1] += ce * carpan

            if onceki and (t - onceki[0]) == timedelta(minutes=15):
                ri0, ri1 = _sayi(onceki[1].get("reactiveInductiveEndex")), _sayi(x.get("reactiveInductiveEndex"))
                rc0, rc1 = _sayi(onceki[1].get("reactiveCapacitiveEndex")), _sayi(x.get("reactiveCapacitiveEndex"))
                gr = gun_reaktif.setdefault(int(g_str[8:10]), {"ind": 0.0, "kap": 0.0})
                if ri0 is not None and ri1 is not None and ri1 >= ri0:
                    gr["ind"] += (ri1 - ri0) * carpan
                if rc0 is not None and rc1 is not None and rc1 >= rc0:
                    gr["kap"] += (rc1 - rc0) * carpan
        onceki = (t, x)

    for g_str, saatler in yeni_saat.items():
        gun_saat[g_str] = {
            h: {"veris": round(v, 2), "cekis": round(c, 2)}
            for h, (v, c) in sorted(saatler.items())
        }
    return dict(sorted(gun_saat.items())), gun_reaktif, son_kayit


def _on_iki_ay_endeks(wid: str, carpan: float, bugun: date, son_kayit: dict | None) -> tuple[dict, dict]:
    """Son 12 ayın ay başı (01.MM.YYYY 00:00) endeks farklarından aylık üretim/tüketim ve reaktif oranları hesaplar."""
    ay_listesi = []
    y, m = bugun.year, bugun.month
    for _ in range(12):
        ay_listesi.append((y, m))
        m -= 1
        if m == 0:
            m = 12
            y -= 1
    ay_listesi.reverse()

    bas_endeks = {}
    for yil, ay in ay_listesi:
        b = f"01.{ay:02d}.{yil}"
        e = f"02.{ay:02d}.{yil}"
        try:
            v = _yuk_profili(wid, f"{b} - {e}", limit=10)
            if v:
                r0 = v[0]
                bas_endeks[(yil, ay)] = {
                    "in": _sayi(r0.get("activeEndex")),
                    "out": _sayi(r0.get("activeEndexOut")),
                    "ri": _sayi(r0.get("reactiveInductiveEndex")),
                    "rc": _sayi(r0.get("reactiveCapacitiveEndex")),
                    "rio": _sayi(r0.get("reactiveInductiveEndexOut")),
                    "rco": _sayi(r0.get("reactiveCapacitiveEndexOut")),
                }
        except Exception:
            continue

    if son_kayit:
        bitis_endeks = {
            "in": _sayi(son_kayit.get("activeEndex")),
            "out": _sayi(son_kayit.get("activeEndexOut")),
            "ri": _sayi(son_kayit.get("reactiveInductiveEndex")),
            "rc": _sayi(son_kayit.get("reactiveCapacitiveEndex")),
            "rio": _sayi(son_kayit.get("reactiveInductiveEndexOut")),
            "rco": _sayi(son_kayit.get("reactiveCapacitiveEndexOut")),
        }
    else:
        bitis_endeks = None

    yillar = {}
    reak_uretim = []
    reak_tuketim = []

    for idx, (yil, ay) in enumerate(ay_listesi):
        b0 = bas_endeks.get((yil, ay))
        b1 = bas_endeks.get(ay_listesi[idx + 1]) if idx + 1 < len(ay_listesi) else bitis_endeks
        if not b0 or not b1:
            continue
        if b0.get("in") is None or b1.get("in") is None or b0.get("out") is None or b1.get("out") is None:
            continue
        cekis = max(0.0, (b1["in"] - b0["in"]) * carpan)
        veris = max(0.0, (b1["out"] - b0["out"]) * carpan)
        ri = max(0.0, ((b1.get("ri") or 0.0) - (b0.get("ri") or 0.0)) * carpan)
        rc = max(0.0, ((b1.get("rc") or 0.0) - (b0.get("rc") or 0.0)) * carpan)
        rio = max(0.0, ((b1.get("rio") or 0.0) - (b0.get("rio") or 0.0)) * carpan)
        rco = max(0.0, ((b1.get("rco") or 0.0) - (b0.get("rco") or 0.0)) * carpan)

        yillar.setdefault(yil, {})[ay] = {
            "ay": ay,
            "kwh": round(veris, 2),
            "ind": round(rio, 2),
            "kap": round(rco, 2),
            "veris": round(veris, 2),
            "cekis": round(cekis, 2),
            "ri_tuk": round(ri, 2),
            "rc_tuk": round(rc, 2),
        }
        reak_tuketim.append({
            "yil": yil,
            "ay": ay,
            "ind": round((ri / cekis) * 100.0, 2) if cekis > 0 else 0.0,
            "kap": round((rc / cekis) * 100.0, 2) if cekis > 0 else 0.0,
        })
        reak_uretim.append({
            "yil": yil,
            "ay": ay,
            "ind": round((rio / veris) * 100.0, 2) if veris > 0 else 0.0,
            "kap": round((rco / veris) * 100.0, 2) if veris > 0 else 0.0,
        })

    return yillar, {"uretim": reak_uretim, "tuketim": reak_tuketim}


def _abone_tur(ab: dict, KOK: Path, yaz, hedef_sid: str | None, hedef_santral: dict | None) -> tuple[str, dict, dict]:
    simdi = datetime.now(TR)
    bugun = simdi.date()
    tesisat = ab["tesisat"]
    wid = ab["wid"]
    carpan = float(ab["carpan"])
    sid = str(hedef_sid or tesisat)
    d = KOK / sid
    d.mkdir(parents=True, exist_ok=True)

    osf_yol = d / f"osf07_{bugun.year}{bugun.month:02d}.json"
    eski_osf = _oku(osf_yol, {})
    mevcut_gs = (((eski_osf.get("sayaclar") or {}).get(tesisat) or {}).get("gun_saat")) or {}

    rows, kismi = _ay_yuk_profili_cek(wid, bugun.year, bugun.month, bugun, mevcut_gs)
    if not rows and not mevcut_gs:
        raise RuntimeError(f"MEDAŞ OSOS ({tesisat}): yük profili boş döndü")

    gun_saat, gun_reaktif, son_kayit = _saatlik_ve_gunluk_coz(rows, carpan, bugun.year, bugun.month, mevcut_gs, kismi)

    # Saatlik OSF-07 uyumlu yapı oluştur
    saatler_list = []
    son_okuma = None
    toplam_veris = 0.0
    toplam_cekis = 0.0

    for h in range(24):
        h_kod = f"{h:02d}"
        etiket = f"{h:02d}:00 - {(h + 1) % 24:02d}:00"
        v_gunler = []
        c_gunler = []
        for g_no in range(1, 32):
            g_str = f"{bugun.year}-{bugun.month:02d}-{g_no:02d}"
            rec = (gun_saat.get(g_str) or {}).get(h_kod)
            v_val = round(rec["veris"], 2) if rec else 0.0
            c_val = round(rec["cekis"], 2) if rec else 0.0
            v_gunler.append(v_val)
            c_gunler.append(c_val)
            if rec and (v_val > 0 or c_val > 0):
                if not son_okuma or (g_no, h) >= (son_okuma["gun"], son_okuma["_h"]):
                    son_okuma = {
                        "gun": g_no,
                        "saat": etiket,
                        "yon": "Veriş" if v_val >= c_val else "Çekiş",
                        "kwh": v_val if v_val >= c_val else c_val,
                        "_h": h,
                    }
        v_top = round(sum(v_gunler), 2)
        c_top = round(sum(c_gunler), 2)
        toplam_veris += v_top
        toplam_cekis += c_top
        saatler_list.append({"saat": etiket, "yon": "Veriş", "gunler": v_gunler, "toplam": v_top})
        saatler_list.append({"saat": etiket, "yon": "Çekiş", "gunler": c_gunler, "toplam": c_top})

    if son_okuma:
        son_okuma.pop("_h", None)

    sayac_obj = {
        "yil": bugun.year,
        "ay": bugun.month,
        "santral_adi": ab["ad"],
        "abone_adi": ab["abone_adi"],
        "sayac_seri_no": tesisat,
        "meter_no": ab["sayac_seri_no"],
        "carpan": carpan,
        "ges_cekiste": False,
        "cift_yonlu": True,
        "toplam_veris_kwh": round(toplam_veris, 2),
        "toplam_cekis_kwh": round(toplam_cekis, 2),
        "son_okuma": son_okuma,
        "saatler": saatler_list,
        "gun_saat": gun_saat,
        "toplandi": int(time.time()),
    }
    osf_veri = dict(sayac_obj)
    osf_veri["sayaclar"] = {tesisat: sayac_obj}
    yaz(osf_yol, osf_veri)

    # Günlük tablo (sayac_ay_YYYYMM.json)
    ay_liste = []
    for g_str, saat_map in sorted(gun_saat.items()):
        if not g_str.startswith(f"{bugun.year}-{bugun.month:02d}-"):
            continue
        g_no = int(g_str[8:10])
        g_veris = round(sum(x.get("veris", 0.0) for x in saat_map.values()), 2)
        g_cekis = round(sum(x.get("cekis", 0.0) for x in saat_map.values()), 2)
        gr = gun_reaktif.get(g_no) or {"ind": 0.0, "kap": 0.0}
        ay_liste.append({
            "g": g_no,
            "kwh": g_veris,
            "ind": round(gr["ind"], 2),
            "kap": round(gr["kap"], 2),
            "veris": {tesisat: g_veris},
            "tuk": {tesisat: {"kwh": g_cekis, "ind": round(gr["ind"], 2), "kap": round(gr["kap"], 2)}},
        })
    ay_yol = d / (f"sayac_ay_{bugun.year}{bugun.month:02d}.json" if hedef_sid else f"ay_{bugun.year}{bugun.month:02d}.json")
    yaz(ay_yol, ay_liste)

    # 12 aylık endeks ve reaktif oranlar (saatte bir veya dosya yoksa yenilenir)
    reak_yol = d / "reaktif.json"
    eski_reak = _oku(reak_yol, {})
    yil_dosya = d / (f"sayac_yil_{bugun.year}.json" if hedef_sid else f"yil_{bugun.year}.json")
    if not yil_dosya.is_file() or not reak_yol.is_file() or (time.time() - eski_reak.get("toplandi", 0)) >= 3000:
        try:
            yillar, reak_oran = _on_iki_ay_endeks(wid, carpan, bugun, son_kayit)
            for y_no, aylar in yillar.items():
                p = d / (f"sayac_yil_{y_no}.json" if hedef_sid else f"yil_{y_no}.json")
                kayitlar = []
                for m_no, m_v in sorted(aylar.items()):
                    kayitlar.append({
                        "ay": m_no,
                        "kwh": m_v["veris"],
                        "ind": m_v["ind"],
                        "kap": m_v["kap"],
                        "veris": {tesisat: m_v["veris"]},
                        "tuk": {tesisat: {"kwh": m_v["cekis"], "ind": m_v["ri_tuk"], "kap": m_v["rc_tuk"]}},
                    })
                yaz(p, kayitlar)
            yaz(reak_yol, {
                "sinir": SINIR,
                "uretim": [],
                "tuketim": {tesisat: reak_oran["tuketim"]},
                "toplandi": int(time.time()),
            })
        except Exception:
            pass

    reak_guncel = _oku(reak_yol, {"sinir": SINIR, "uretim": [], "tuketim": {}})
    alarmlar = []
    for sn, liste in (reak_guncel.get("tuketim") or {}).items():
        ad_ = f"Tesisat {sn}"
        son_r = liste[-1] if liste else None
        if son_r and son_r.get("yil") == bugun.year and son_r.get("ay") == bugun.month:
            for k, et in (("ind", "Endüktif"), ("kap", "Kapasitif")):
                if (son_r.get(k) or 0) > SINIR[k]:
                    alarmlar.append({
                        "alertName": f"{ad_}: {et} oran %{son_r[k]:.1f} (sınır %{SINIR[k]:.0f})",
                        "level": 1,
                        "alertTime": int(time.time()),
                    })

    bu = next((x for x in ay_liste if x["g"] == bugun.day), {})
    dun_t = bugun - timedelta(days=1)
    dun = next((x for x in ay_liste if x["g"] == dun_t.day), {}) if dun_t.month == bugun.month else {}
    ay_veris_top = round(sum((x.get("kwh") or 0.0) for x in ay_liste), 2)
    ay_cekis_top = round(sum((((x.get("tuk") or {}).get(tesisat) or {}).get("kwh") or 0.0) for x in ay_liste), 2)
    yil_kayitlar = _oku(yil_dosya, [])
    yil_veris_top = round(sum((x.get("kwh") or 0.0) for x in yil_kayitlar), 2) or None

    sayac_ozet = {
        "kaynak": "medas",
        "cift_yonlu": True,
        "sayac_seri_no": ab["sayac_seri_no"],
        "carpan": carpan,
        "uretim_sn": tesisat,
        "tuketim_sn": [tesisat],
        "tum_sn": [tesisat],
        "adlar": {tesisat: ab["abone_adi"]},
        "ges_cekiste": [],
        "bugun_uretim_kwh": bu.get("kwh"),
        "dun_uretim_kwh": dun.get("kwh"),
        "ay_uretim_kwh": ay_veris_top,
        "yil_uretim_kwh": yil_veris_top,
        "bugun_tuketim": {tesisat: ((bu.get("tuk") or {}).get(tesisat) or {}).get("kwh")},
        "dun_tuketim": {tesisat: ((dun.get("tuk") or {}).get(tesisat) or {}).get("kwh")},
        "ay_tuketim": {tesisat: ay_cekis_top},
        "ay_veris": {tesisat: ay_veris_top},
        "osf07_son_okuma": son_okuma,
    }

    if hedef_sid:
        mevcut = _oku(d / "son.json", {})
        mevcut["inverter_var"] = True
        mevcut["sayac_var"] = True
        mevcut["sayac"] = sayac_ozet
        mevcut_al = [a for a in (mevcut.get("alarmlar") or []) if tesisat not in str(a.get("alertName", ""))]
        mevcut["alarmlar"] = mevcut_al + alarmlar
        yaz(d / "son.json", mevcut)
        meta = dict(hedef_santral or {})
        meta["sayac_var"] = True
        meta["inverter_var"] = True
        meta["uretim_sn"] = tesisat
        meta["tuketim_sn"] = [tesisat]
        return sid, meta, {
            "tesisat": tesisat,
            "sayac_seri_no": ab["sayac_seri_no"],
            "carpan": carpan,
            "ay_veris_kwh": ay_veris_top,
            "ay_cekis_kwh": ay_cekis_top,
        }
    else:
        yaz(d / "son.json", {
            "sid": sid,
            "ad": ab["ad"],
            "adres": ab["adres"],
            "kapasite_kwp": 300.0,
            "kaynak": "medas",
            "inverter_var": False,
            "sayac_var": True,
            "guc_w": None,
            "gunluk_kwh": bu.get("kwh"),
            "aylik_kwh": ay_veris_top,
            "yillik_kwh": yil_veris_top,
            "toplam_kwh": None,
            "iletisim": "NORMAL",
            "son_veri": int(time.time()),
            "alarmlar": alarmlar,
            "sayac": sayac_ozet,
            "toplandi": int(time.time()),
        })
        return sid, {
            "ad": ab["ad"],
            "adres": ab["adres"],
            "kapasite_kwp": 300.0,
            "tip": "sayac",
            "hesap": "_1",
            "kaynak": "medas",
            "inverter_var": False,
            "sayac_var": True,
            "uretim_sn": tesisat,
            "tuketim_sn": [tesisat],
        }, {
            "tesisat": tesisat,
            "sayac_seri_no": ab["sayac_seri_no"],
            "carpan": carpan,
            "ay_veris_kwh": ay_veris_top,
            "ay_cekis_kwh": ay_cekis_top,
        }


def tur(KOK: Path, yaz, mevcut_santraller: dict = None) -> tuple[dict, dict]:
    """Tanımlı tüm MEDAŞ OSOS aboneliklerini dolaşır; (santraller_dict, durum_dict) döndürür."""
    mevcut_santraller = mevcut_santraller or {}
    santraller = {}
    durum = {}
    for ab in ABONELER:
        tesisat = ab["tesisat"]
        try:
            eslesen_sid = None
            eslesen_sant = None
            for sid, s_meta in mevcut_santraller.items():
                if s_meta.get("kaynak") in ("ace", "medas"):
                    continue
                ad_kucuk = str(s_meta.get("ad", "")).lower()
                hesap = str(s_meta.get("hesap", ""))
                if sid in ab["hesap_eslesme"] or hesap in ab["hesap_eslesme"] or any(k in ad_kucuk for k in ab["hesap_eslesme"]):
                    eslesen_sid = sid
                    eslesen_sant = s_meta
                    break
            sid, meta, iz = _abone_tur(ab, KOK, yaz, eslesen_sid, eslesen_sant)
            santraller[sid] = meta
            durum[f"medas_{tesisat}"] = {"tamam": True, "sid": sid, "kaynak": "medas", "iz": iz}
        except Exception as e:
            durum[f"medas_{tesisat}"] = {"tamam": False, "hata": str(e)[:200], "kaynak": "medas"}
    return santraller, durum
