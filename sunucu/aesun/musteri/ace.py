"""Müşteri Monitoring · Ace Center (OSB sayaç sistemi) tam otomatik toplayıcısı — solarman.py döngüsünden çağrılır.

Giriş: OSB_KULLANICI_HASGERIDONUSUM / OSB_SIFRE_HASGERIDONUSUM (veya ACE_OTURUM çerezi) ile çalışır.
/Account/Captcha görselindeki 4 haneli güvenlik kodunu saf Python (zlib + struct + 108-bit şablon eşleştirme)
ile harici kütüphane gerekmeden ~0.05 ms'de çözer ve otomatik oturum açar. Oturum düşerse kendi kendine yeniler.
Her turda (5 dk) özet/günlük/aylık/reaktif grafik verilerini ve saatte bir OSF-07 (FORM NO: OSF.07.02)
saatlik Veriş/Çekiş Excel raporunu indirip okur.

Dosyalar (/musteri/<üretim sayacı seri no>/):
  son.json, ay_YYYYMM.json, yil_YYYY.json, reaktif.json, osf07_YYYYMM.json
"""
import io, json, os, re, struct, time, zipfile, zlib
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urljoin
import requests

TABAN = os.environ.get("ACE_TABAN", "http://95.9.199.129:7080").rstrip("/")
KUL = (os.environ.get("OSB_KULLANICI_HASGERIDONUSUM") or os.environ.get("OSB_KULLANICI") or "").strip()
SIFRE = (os.environ.get("OSB_SIFRE_HASGERIDONUSUM") or os.environ.get("OSB_SIFRE") or "").strip()
OTURUM = os.environ.get("ACE_OTURUM", "").strip()
AD = os.environ.get("ACE_SANTRAL_AD", "HAS GERİ DÖNÜŞÜM GES")
ADRES = os.environ.get("ACE_ADRES", "Aksaray OSB")
KAP = float(os.environ["ACE_KAPASITE_KWP"]) if os.environ.get("ACE_KAPASITE_KWP") else None
TR = timezone(timedelta(hours=3))
SINIR = {"ind": 20.0, "kap": 15.0}   # reaktif ceza sınırları (%), aktif enerjiye oran

# Ace Center /Account/Captcha (80x34 RGBA PNG, filtre=0) sabit 9x12 rakam şablonları (y=12..23, x=31..66)
_RAKAM_SABLON = {
    "0": 0x222bb8fc7e3d1e8fc7e3f1d5c44,
    "1": 0x0e0d0c8fc0e070381c0e070381c,
    "2": 0x232bf8fc70283c3c2c2c2838101,
    "3": 0x223bb8e07050d00e07e3f1d5e44,
    "4": 0x070782c3e3f3b9ddce808381c0e,
    "5": 0x61b81c0e0737bc0e07a3f1d5e44,
    "6": 0x333bf8fc0f34be8f47e3f1d5e66,
    "7": 0xc081c141e0a0f070383c1c0e050,
    "8": 0x222bbcfe757991dfc7a3f1dde46,
    "9": 0x222bb8f47a3f1dda4f03f1ddc44,
}

_AKTIF_OTURUM = None


class OturumDustu(RuntimeError):
    pass


def etkin():
    return bool((KUL and SIFRE) or OTURUM)


def _captcha_coz(png: bytes) -> str:
    """80x34 RGBA PNG güvenlik kodunu saf Python ile çözer."""
    p, idat = 8, b""
    while p + 8 <= len(png):
        l, t = struct.unpack(">I4s", png[p:p + 8])
        if t == b"IDAT":
            idat += png[p + 8:p + 8 + l]
        p += 12 + l
    raw = zlib.decompress(idat)
    out = []
    for i in range(4):
        bits = 0
        for y in range(12, 24):
            row = y * 321 + 1
            for x in range(31 + i * 9, 31 + (i + 1) * 9):
                px = row + x * 4
                r, g, b = raw[px], raw[px + 1], raw[px + 2]
                bits = (bits << 1) | (1 if (max(r, g, b) - min(r, g, b)) > 30 else 0)
        out.append(min(_RAKAM_SABLON, key=lambda k: (bits ^ _RAKAM_SABLON[k]).bit_count()))
    return "".join(out)


def _giris_yap() -> requests.Session:
    """Kullanıcı adı, şifre ve otomatik çözülen Captcha ile oturum açar."""
    global _AKTIF_OTURUM
    if not (KUL and SIFRE):
        if OTURUM:
            s = requests.Session()
            s.headers.update({"User-Agent": "aesun-musteri/1", "X-Requested-With": "XMLHttpRequest",
                              "Accept": "application/json, text/javascript, */*", "Cookie": OTURUM})
            _AKTIF_OTURUM = s
            return s
        raise OturumDustu("Ace Center kullanıcı/şifre tanımlı değil")

    son_hata = None
    for _ in range(5):
        try:
            s = requests.Session()
            s.headers.update({
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0 Safari/537.36",
                "Accept-Language": "tr-TR,tr;q=0.9",
            })
            s.get(TABAN + "/Account/Login", timeout=20)
            cap = s.get(TABAN + "/Account/Captcha", timeout=20)
            kod = _captcha_coz(cap.content)
            r = s.post(
                TABAN + "/Account/Login",
                data={"UserName": KUL, "Password": SIFRE, "SecurityImg": kod, "b": ""},
                headers={"Referer": TABAN + "/Account/Login"},
                allow_redirects=True,
                timeout=25,
            )
            if ".ASPXAUTH" in s.cookies and "/Account/Login" not in r.url:
                s.headers.update({"X-Requested-With": "XMLHttpRequest",
                                  "Accept": "application/json, text/javascript, */*"})
                _AKTIF_OTURUM = s
                return s
            son_hata = f"giriş reddedildi (captcha={kod})"
        except Exception as e:
            son_hata = str(e)
        time.sleep(1)
    raise OturumDustu(f"Ace Center otomatik giriş başarısız: {son_hata}")


def _oturum(yenile=False) -> requests.Session:
    global _AKTIF_OTURUM
    if yenile or _AKTIF_OTURUM is None:
        return _giris_yap()
    return _AKTIF_OTURUM


def _oku(p: Path, vars_):
    try:
        return json.loads(p.read_text())
    except Exception:
        return vars_


def _grafik(s, tur):
    for deneme in (1, 2):
        r = s.post(TABAN + "/Home/ChartData", data={"chartType": tur, "start": "1"}, timeout=40, allow_redirects=False)
        if r.status_code in (301, 302, 401, 403) or "/Account/Login" in r.headers.get("Location", ""):
            if deneme == 1 and KUL and SIFRE:
                s = _oturum(yenile=True)
                continue
            raise OturumDustu("Ace Center oturumu düştü")
        r.raise_for_status()
        try:
            j = r.json()
        except ValueError:
            if deneme == 1 and KUL and SIFRE:
                s = _oturum(yenile=True)
                continue
            raise OturumDustu("Ace Center JSON yerine sayfa döndü")
        if not isinstance(j, list) or len(j) < 2:
            return []
        return j[1] or []
    return []


def _f(v):
    try:
        return round(float(v), 3)
    except (TypeError, ValueError):
        return None


def _gun(term):   # "1.10.2026 00:00" → date
    return datetime.strptime(str(term).split()[0], "%d.%m.%Y").date()


def _xlsx_coz(xlsx_bytes: bytes) -> dict:
    """OSF-07 .xlsx dosyasını saf Python (zipfile + ElementTree) ile okur ve FORM NO: OSF.07.02 yapısını döndürür."""
    ns = {"a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    with zipfile.ZipFile(io.BytesIO(xlsx_bytes)) as z:
        ss = []
        if "xl/sharedStrings.xml" in z.namelist():
            ss = ["".join(si.itertext()) for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("a:si", ns)]
        wb = ET.fromstring(z.read("xl/workbook.xml"))
        sheets = [sh.attrib.get("name", "") for sh in wb.findall(".//a:sheet", ns)]
        sh_files = sorted(n for n in z.namelist() if n.startswith("xl/worksheets/sheet") and n.endswith(".xml"))
        if not sh_files:
            return {}
        ws = ET.fromstring(z.read(sh_files[-1]))
        sheet_name = sheets[-1] if sheets else ""

        rows = []
        for row in ws.findall(".//a:sheetData/a:row", ns):
            rdict = {}
            for c in row.findall("a:c", ns):
                m = re.match(r"([A-Z]+)", c.attrib.get("r", ""))
                if not m:
                    continue
                col_idx = sum((ord(ch) - 64) * (26 ** i) for i, ch in enumerate(reversed(m.group(1)))) - 1
                v_el = c.find("a:v", ns)
                val = (ss[int(v_el.text)] if c.attrib.get("t") == "s" else v_el.text) if v_el is not None and v_el.text is not None else ""
                rdict[col_idx] = val
            if rdict:
                rows.append([rdict.get(i, "") for i in range(max(rdict) + 1)])

    saatler = []
    cur_saat = ""
    top_veris = 0.0
    top_cekis = 0.0
    gun_top_veris = [0.0] * 31
    gun_top_cekis = [0.0] * 31
    son_okuma = None
    son_anahtar = (-1, -1)

    for r in rows:
        if len(r) < 33:
            continue
        c0 = str(r[0]).strip()
        c1 = str(r[1]).strip()
        if re.match(r"^\d{2}:\d{2}\s*-\s*\d{2}:\d{2}$", c0):
            cur_saat = c0
        if cur_saat and c1 in ("Veriş", "Çekiş"):
            h_int = int(cur_saat[:2])
            gun_degerleri = []
            satir_top = 0.0
            for d in range(1, 32):
                raw_v = r[d + 1] if (d + 1) < len(r) else ""
                try:
                    val = round(float(raw_v), 4) if raw_v not in ("", None) else 0.0
                except (ValueError, TypeError):
                    val = 0.0
                gun_degerleri.append(val)
                satir_top += val
                if c1 == "Veriş":
                    gun_top_veris[d - 1] = round(gun_top_veris[d - 1] + val, 4)
                else:
                    gun_top_cekis[d - 1] = round(gun_top_cekis[d - 1] + val, 4)
                if val > 0 and (d, h_int) >= son_anahtar:
                    son_anahtar = (d, h_int)
                    son_okuma = {"gun": d, "saat": cur_saat, "yon": c1, "kwh": val}

            satir_top = round(satir_top, 4)
            if c1 == "Veriş":
                top_veris = round(top_veris + satir_top, 4)
            else:
                top_cekis = round(top_cekis + satir_top, 4)
            saatler.append({"saat": cur_saat, "yon": c1, "gunler": gun_degerleri, "toplam": satir_top})

    return {
        "form_no": "OSF.07.02",
        "baslik": "DENGELEME BİRİMİ SAYAÇ DEĞERLERİ FORMU",
        "sayac_seri_no": str(rows[8][3]).strip() if len(rows) > 8 and len(rows[8]) > 3 else "",
        "santral_adi": str(rows[12][7]).strip() if len(rows) > 12 and len(rows[12]) > 7 else AD,
        "abone_no": str(rows[16][8]).strip() if len(rows) > 16 and len(rows[16]) > 8 else "ELK-5210",
        "donem": sheet_name,
        "toplam_veris_kwh": top_veris,
        "toplam_cekis_kwh": top_cekis,
        "gun_toplam_veris": gun_top_veris,
        "gun_toplam_cekis": gun_top_cekis,
        "son_okuma": son_okuma,
        "saatler": saatler,
        "toplandi": int(time.time()),
    }


def _osf07_indir(s: requests.Session, sayaclar: list[str], yil: int, ay: int) -> dict:
    """/Report/OSF07 uç noktasından tüm sayaçların (45644611, 45387414) OSF.07.02 Excel raporunu indirir ve çözümler."""
    sonuc = {}
    try:
        s.get(TABAN + "/Report/OSF07", timeout=30)
    except Exception:
        pass
    for dev in sayaclar:
        try:
            veri = {
                "SearchKey": "", "TotalPage": "0", "SorterName": "", "SortDirection": "0", "Sorted": "",
                "StartEndDates": f"{ay},{yil}", "Plant": "1", "Group": "188", "Modem": "", "Facility": "",
                "Device": str(dev), "ExportType": "XLSX", "CurrentPage": "1", "annualfordevice": "1",
            }
            r = s.post(TABAN + "/Report/OSF07", data=veri, headers={"Referer": TABAN + "/Report/OSF07"}, timeout=45)
            r.raise_for_status()
            j = r.json()
            dosyalar = ((j.get("Value") or {}) if isinstance(j, dict) else {}).get("ExportedFiles") or []
            if not dosyalar:
                continue
            f_url = urljoin(TABAN + "/", str(dosyalar[0]).lstrip("/"))
            fr = s.get(f_url, timeout=45)
            fr.raise_for_status()
            cozulen = _xlsx_coz(fr.content)
            if cozulen and cozulen.get("saatler"):
                cozulen["sayac_seri_no"] = cozulen.get("sayac_seri_no") or str(dev)
                sonuc[str(dev)] = cozulen
        except Exception:
            continue
    if not sonuc:
        return {}
    ana_sn = "45644611" if "45644611" in sonuc else next(iter(sonuc))
    ana = dict(sonuc[ana_sn])
    ana["sayaclar"] = sonuc
    return ana


def tur(KOK: Path, yaz):
    s = _oturum()
    simdi = datetime.now(TR); bugun = simdi.date()
    gu = _grafik(s, "DailyProduction"); gt = _grafik(s, "DailyConsumption")
    au = _grafik(s, "MonthlyProduction"); at = _grafik(s, "MonthlyConsumption")
    ru = _grafik(s, "MonthlyPenaltyRateProduction"); rt = _grafik(s, "MonthlyPenaltyRate")
    s = _oturum()   # yeniden giriş yapıldıysa güncel oturumu al

    snu = str((au or gu or [{}])[0].get("DeviceSerialNo") or "45644611")
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

    # --- Saatlik OSF-07 (FORM NO: OSF.07.02) raporu (saatte bir veya dosya yoksa güncellenir)
    osf_yol = d / f"osf07_{bugun.year}{bugun.month:02d}.json"
    osf_veri = _oku(osf_yol, {})
    tum_sayaclar = sorted({snu, "45644611", *tuk_sn})
    if not osf_veri or not osf_veri.get("sayaclar") or (time.time() - osf_veri.get("toplandi", 0)) >= 3000:
        try:
            yeni_osf = _osf07_indir(s, tum_sayaclar, bugun.year, bugun.month)
            if yeni_osf and yeni_osf.get("saatler"):
                osf_veri = yeni_osf
                yaz(osf_yol, osf_veri)
        except Exception:
            pass

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
                  "bugun_tuketim": {sn: ((bu.get("tuk") or {}).get(sn) or {}).get("kwh") for sn in tuk_sn},
                  "ay_tuketim": tuk_ay, "osf07_son_okuma": osf_veri.get("son_okuma")},
        "toplandi": int(time.time())})
    return {snu: {"ad": AD, "adres": ADRES, "kapasite_kwp": KAP, "tip": "sayac", "hesap": "ace", "kaynak": "ace"}}
