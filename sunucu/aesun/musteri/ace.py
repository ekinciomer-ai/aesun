"""Müşteri Monitoring · Ace Center (OSB sayaç sistemi) çoklu-hesap tam otomatik toplayıcısı.

Giriş: /opt/aesun/musteri.env içindeki tüm OSB_KULLANICI* / OSB_SIFRE* hesaplarıyla (ör. _HASGERIDONUSUM, _TATMAK)
otomatik çalışır. /Account/Captcha görselindeki 4 haneli güvenlik kodunu saf Python (zlib + struct + 108-bit şablon)
ile ~0.05 ms'de çözer ve oturum açar. Oturum düşerse kendi kendine yeniler.
Her turda (5 dk) özet/günlük/aylık/reaktif grafik verilerini ve OSF-07 (FORM NO: OSF.07.02) saatlik
Veriş/Çekiş Excel raporlarını indirip okur; aynı soneke sahip SOLARMAN inverter santrali varsa (ör. _TATMAK)
verileri o santralle birleştirir, yoksa bağımsız santral olarak kaydeder.
"""
import io, json, os, re, struct, time, zipfile, zlib
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urljoin
import requests

TABAN = os.environ.get("ACE_TABAN", "http://95.9.199.129:7080").rstrip("/")
OTURUM = os.environ.get("ACE_OTURUM", "").strip()
ADRES = os.environ.get("ACE_ADRES", "Aksaray OSB")
TR = timezone(timedelta(hours=3))
SINIR = {"ind": 20.0, "kap": 15.0}   # reaktif ceza sınırları (%), aktif enerjiye oran

AY_ADLARI = {
    "ocak": 1, "şubat": 2, "subat": 2, "mart": 3, "nisan": 4, "mayıs": 5, "mayis": 5,
    "haziran": 6, "temmuz": 7, "ağustos": 8, "agustos": 8, "eylül": 9, "eylul": 9,
    "ekim": 10, "kasım": 11, "kasim": 11, "aralık": 12, "aralik": 12,
}

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


class OturumDustu(RuntimeError):
    pass


class OsbHesap:
    def __init__(self, ad: str, kul: str, sifre: str, cerez: str = ""):
        self.ad = ad or "_1"
        self.kul = kul
        self.sifre = sifre
        self.cerez = cerez
        self.s = None
        self.kullanici_baslik = ""
        self.kart_basliklar = []


def hesap_listesi() -> list[OsbHesap]:
    out = []
    for k, v in sorted(os.environ.items()):
        if k.startswith("OSB_KULLANICI") and v.strip():
            ek = k[len("OSB_KULLANICI"):]
            sf = os.environ.get("OSB_SIFRE" + ek, "").strip()
            if sf:
                out.append(OsbHesap(ek or "_1", v.strip(), sf))
    if not out and OTURUM:
        out.append(OsbHesap("_1", "", "", OTURUM))
    return out


def etkin() -> bool:
    return bool(hesap_listesi())


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


def _giris_yap(H: OsbHesap) -> requests.Session:
    """Kullanıcı adı, şifre ve otomatik çözülen Captcha ile oturum açar."""
    if not (H.kul and H.sifre):
        if H.cerez:
            s = requests.Session()
            s.headers.update({"User-Agent": "aesun-musteri/1", "Cookie": H.cerez})
            H.s = s
            return s
        raise OturumDustu(f"Ace Center ({H.ad}) kullanıcı/şifre tanımlı değil")

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
                data={"UserName": H.kul, "Password": H.sifre, "SecurityImg": kod, "b": ""},
                headers={"Referer": TABAN + "/Account/Login"},
                allow_redirects=True,
                timeout=25,
            )
            if ".ASPXAUTH" in s.cookies and "/Account/Login" not in r.url:
                try:
                    ro = s.get(TABAN + "/Home/Osos?PlantId=0", timeout=20)
                    if ro.status_code == 200:
                        import html as _html
                        m = re.search(r'href="/System/UserConfiguration"[^>]*>([^<]+)<', ro.text)
                        if m:
                            H.kullanici_baslik = _html.unescape(m.group(1)).strip()
                        H.kart_basliklar = [_html.unescape(x).strip() for x in re.findall(r'font-weight:\s*bold;">\s*([^\r\n<]+)', ro.text) if x.strip()]
                except Exception:
                    pass
                H.s = s
                return s
            son_hata = f"giriş reddedildi (captcha={kod})"
        except Exception as e:
            son_hata = str(e)
        time.sleep(1)
    raise OturumDustu(f"Ace Center ({H.ad}) otomatik giriş başarısız: {son_hata}")


def _oturum(H: OsbHesap, yenile=False) -> requests.Session:
    if yenile or H.s is None:
        return _giris_yap(H)
    return H.s


def _oku(p: Path, vars_):
    try:
        return json.loads(p.read_text())
    except Exception:
        return vars_


def _grafik(H: OsbHesap, tur_adi: str) -> tuple[list[str], list[dict]]:
    s = _oturum(H)
    ajax_hdr = {"X-Requested-With": "XMLHttpRequest", "Accept": "application/json, text/javascript, */*"}
    for deneme in (1, 2):
        r = s.post(TABAN + "/Home/ChartData", data={"chartType": tur_adi, "start": "1"}, headers=ajax_hdr, timeout=40, allow_redirects=False)
        if r.status_code in (301, 302, 401, 403) or "/Account/Login" in r.headers.get("Location", ""):
            if deneme == 1 and H.kul and H.sifre:
                s = _oturum(H, yenile=True)
                continue
            raise OturumDustu(f"Ace Center ({H.ad}) oturumu düştü")
        r.raise_for_status()
        try:
            j = r.json()
        except ValueError:
            if deneme == 1 and H.kul and H.sifre:
                s = _oturum(H, yenile=True)
                continue
            raise OturumDustu(f"Ace Center ({H.ad}) JSON yerine sayfa döndü")
        if not isinstance(j, list) or len(j) < 2:
            return [], []
        cihazlar = [str(x) for x in (j[0] or []) if str(x).isdigit()]
        return cihazlar, (j[1] or [])
    return [], []


def _f(v):
    try:
        return round(float(v), 3)
    except (TypeError, ValueError):
        return None


def _gun(term):   # "1.10.2026 00:00" → date
    return datetime.strptime(str(term).split()[0], "%d.%m.%Y").date()


def _ay_yil_coz(sheet_name: str, donem_hucre: str, vars_yil: int, vars_ay: int) -> tuple[int, int]:
    m = re.search(r"(\d{4})-(\d{2})", str(donem_hucre or ""))
    if m:
        return int(m.group(1)), int(m.group(2))
    parcalar = str(sheet_name or "").strip().lower().split()
    if len(parcalar) >= 2 and parcalar[-1].isdigit():
        y = int(parcalar[-1])
        a = AY_ADLARI.get(parcalar[0], vars_ay)
        return y, a
    return vars_yil, vars_ay


def _xlsx_sayfa_coz(ws, ss: list[str], sheet_name: str, vars_yil: int, vars_ay: int, vars_ad: str) -> dict:
    ns = {"a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
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

    sayac_sn = ""
    abone_adi = ""
    abone_no = ""
    donem_hc = ""
    for r in rows[:25]:
        for idx, hc in enumerate(r):
            s_hc = str(hc or "").strip()
            if s_hc.startswith("Sayaç Seri No"):
                for v in r[idx + 1:]:
                    if str(v or "").strip():
                        sayac_sn = str(v).strip().split(".")[0]
                        break
            elif s_hc == "Adı:":
                for v in r[idx + 1:]:
                    if str(v or "").strip():
                        abone_adi = str(v).strip()
                        break
            elif s_hc.startswith("Abone No"):
                for v in r[idx + 1:]:
                    if str(v or "").strip():
                        abone_no = str(v).strip()
                        break
            elif s_hc.startswith("Uzlaştırma Dönemi"):
                for v in r[idx + 1:]:
                    if str(v or "").strip() and not str(v).strip().startswith("Abone"):
                        donem_hc = str(v).strip()
                        break

    yil, ay = _ay_yil_coz(sheet_name, donem_hc, vars_yil, vars_ay)
    saatler = []
    cur_saat = ""
    top_veris = 0.0
    top_cekis = 0.0
    gun_top_veris = [0.0] * 31
    gun_top_cekis = [0.0] * 31
    son_okuma = None
    son_anahtar = (-1, -1)
    gun_saat = {}   # "YYYY-MM-DD": {"00": {"veris": x, "cekis": y}, ...}

    for r in rows:
        if len(r) < 33:
            continue
        c0 = str(r[0]).strip()
        c1 = str(r[1]).strip()
        if re.match(r"^\d{2}:\d{2}\s*-\s*\d{2}:\d{2}$", c0):
            cur_saat = c0
        if cur_saat and c1 in ("Veriş", "Çekiş"):
            h_int = int(cur_saat[:2])
            h_kod = f"{h_int:02d}"
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
                tarih_str = f"{yil:04d}-{ay:02d}-{d:02d}"
                gs = gun_saat.setdefault(tarih_str, {}).setdefault(h_kod, {"veris": 0.0, "cekis": 0.0})
                gs["veris" if c1 == "Veriş" else "cekis"] = val

            satir_top = round(satir_top, 4)
            if c1 == "Veriş":
                top_veris = round(top_veris + satir_top, 4)
            else:
                top_cekis = round(top_cekis + satir_top, 4)
            saatler.append({"saat": cur_saat, "yon": c1, "gunler": gun_degerleri, "toplam": satir_top})

    # Yalnız veri girilmiş günleri (son_anahtar[0]'a kadar olan günleri) gun_saat içinde tut
    max_gun = son_anahtar[0] if son_anahtar[0] > 0 else 0
    aktif_gun_saat = {k: v for k, v in gun_saat.items() if int(k.split("-")[2]) <= max_gun}

    # GES üretim sayacı tespiti: abone adında GES geçiyor ve Veriş=0, Çekiş>0 (yalnız gündüz saatlerinde üretim)
    ges_cekiste = ("GES" in abone_adi.upper() and top_veris == 0.0 and top_cekis > 0.0)

    return {
        "form_no": "OSF.07.02",
        "baslik": "DENGELEME BİRİMİ SAYAÇ DEĞERLERİ FORMU",
        "sayac_seri_no": sayac_sn,
        "abone_adi": abone_adi or vars_ad,
        "santral_adi": abone_adi or vars_ad,
        "abone_no": abone_no or "ELK-5210",
        "donem": sheet_name or f"{ay:02d}/{yil}",
        "yil": yil,
        "ay": ay,
        "ges_cekiste": ges_cekiste,
        "toplam_veris_kwh": top_veris,
        "toplam_cekis_kwh": top_cekis,
        "gun_toplam_veris": gun_top_veris,
        "gun_toplam_cekis": gun_top_cekis,
        "son_okuma": son_okuma,
        "saatler": saatler,
        "gun_saat": aktif_gun_saat,
        "toplandi": int(time.time()),
    }


def _xlsx_coz(xlsx_bytes: bytes, vars_yil: int = 2026, vars_ay: int = 10, vars_ad: str = "") -> dict:
    """OSF-07 .xlsx dosyasındaki tüm ay sayfalarını okur; son ayın özetini ve tüm ayların saatlik verisini döndürür."""
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
        ay_sonuclari = []
        tum_gun_saat = {}
        for idx, sh_f in enumerate(sh_files):
            sh_ad = sheets[idx] if idx < len(sheets) else ""
            ws = ET.fromstring(z.read(sh_f))
            coz = _xlsx_sayfa_coz(ws, ss, sh_ad, vars_yil, vars_ay, vars_ad)
            if coz.get("saatler"):
                tum_gun_saat.update(coz.get("gun_saat") or {})
                ay_sonuclari.append(coz)
        if not ay_sonuclari:
            return {}
        son = dict(ay_sonuclari[-1])
        son["gun_saat"] = tum_gun_saat
        return son


def _osf07_indir(H: OsbHesap, sayaclar: list[str], yil: int, ay: int, vars_ad: str) -> dict:
    """/Report/OSF07 uç noktasından hesabın tüm sayaçları için OSF.07.02 Excel raporunu indirir ve çözümler."""
    s = _oturum(H)
    grup_adaylari = []
    try:
        r0 = s.get(TABAN + "/Report/OSF07", timeout=25)
        for m in re.finditer(r'data-val="(\d+)"[^>]*data-url="/GetData/DeviceGroup"|name="Group"[^>]*value="(\d+)"', r0.text):
            g = m.group(1) or m.group(2)
            if g and g != "0" and g not in grup_adaylari:
                grup_adaylari.append(g)
    except Exception:
        pass
    try:
        rg = s.post(TABAN + "/GetData/DeviceGroup", headers={"X-Requested-With": "XMLHttpRequest"}, timeout=20)
        for g in re.findall(r'(?:data-val|"Value"|"Id"|"id")\s*[:=]\s*"?(\d+)"?', rg.text):
            if g and g != "0" and g not in grup_adaylari:
                grup_adaylari.append(g)
    except Exception:
        pass
    for g in ("", "188"):
        if g not in grup_adaylari:
            grup_adaylari.append(g)

    ajax_hdr = {
        "X-Requested-With": "XMLHttpRequest",
        "Referer": TABAN + "/Report/OSF07",
        "Accept": "application/json, text/javascript, */*; q=0.01",
    }
    sonuc = {}
    for dev in sayaclar:
        for grp in grup_adaylari:
            try:
                veri = {
                    "SearchKey": "", "TotalPage": "0", "SorterName": "", "SortDirection": "0", "Sorted": "",
                    "StartEndDates": f"{ay},{yil}", "Plant": "1", "Group": str(grp), "Modem": "", "Facility": "",
                    "Device": str(dev), "ExportType": "XLSX", "CurrentPage": "1", "annualfordevice": "1",
                }
                r = s.post(TABAN + "/Report/OSF07", data=veri, headers=ajax_hdr, timeout=45)
                if not r.ok:
                    continue
                j = r.json()
                dosyalar = ((j.get("Value") or {}) if isinstance(j, dict) else {}).get("ExportedFiles") or []
                if not dosyalar:
                    continue
                f_url = urljoin(TABAN + "/", str(dosyalar[0]).lstrip("/"))
                fr = s.get(f_url, timeout=45)
                fr.raise_for_status()
                cozulen = _xlsx_coz(fr.content, yil, ay, vars_ad)
                if cozulen and cozulen.get("saatler"):
                    cozulen["sayac_seri_no"] = cozulen.get("sayac_seri_no") or str(dev)
                    sonuc[str(dev)] = cozulen
                    break
            except Exception:
                continue
    if not sonuc:
        return {}
    # GES sayacı varsa onu ana sayaç olarak seç, yoksa ilkini
    ges_sn = next((sn for sn, v in sonuc.items() if "GES" in str(v.get("abone_adi", "")).upper()), None)
    ana_sn = ges_sn or next(iter(sonuc))
    ana = dict(sonuc[ana_sn])
    ana["sayaclar"] = sonuc
    return ana


def _hesap_tur(H: OsbHesap, KOK: Path, yaz, hedef_sid: str = None, hedef_santral: dict = None) -> tuple[str, dict, dict]:
    simdi = datetime.now(TR); bugun = simdi.date()
    c1, gu = _grafik(H, "DailyProduction")
    c2, gt = _grafik(H, "DailyConsumption")
    c3, au = _grafik(H, "MonthlyProduction")
    c4, at = _grafik(H, "MonthlyConsumption")
    c5, ru = _grafik(H, "MonthlyPenaltyRateProduction")
    c6, rt = _grafik(H, "MonthlyPenaltyRate")

    tum_cihazlar = sorted({
        *c1, *c2, *c3, *c4, *c5, *c6,
        *(str(x.get("DeviceSerialNo")) for x in (gu + gt + au + at + ru + rt) if x.get("DeviceSerialNo")),
    })
    if not tum_cihazlar:
        raise RuntimeError(f"Ace Center ({H.ad}): sayaç bulunamadı")

    vars_ad = (hedef_santral or {}).get("ad") or H.kullanici_baslik or (
        "HAS GERİ DÖNÜŞÜM GES" if "HAS" in H.ad.upper() else ("Tatmak GES" if "TATMAK" in H.ad.upper() else f"OSB {H.ad.lstrip('_')}")
    )

    snu_chart = str((au or gu or [{}])[0].get("DeviceSerialNo") or tum_cihazlar[0])
    sid = str(hedef_sid or snu_chart)
    d = KOK / sid

    # --- Saatlik OSF-07 (FORM NO: OSF.07.02) raporu (saatte bir veya dosya yoksa güncellenir)
    osf_yol = d / f"osf07_{bugun.year}{bugun.month:02d}.json"
    osf_veri = _oku(osf_yol, {})
    if not osf_veri or not osf_veri.get("sayaclar") or (time.time() - osf_veri.get("toplandi", 0)) >= 3000:
        try:
            yeni_osf = _osf07_indir(H, tum_cihazlar, bugun.year, bugun.month, vars_ad)
            if yeni_osf and yeni_osf.get("saatler"):
                osf_veri = yeni_osf
                yaz(osf_yol, osf_veri)
        except Exception:
            pass

    sayac_meta = (osf_veri.get("sayaclar") or {}) if isinstance(osf_veri, dict) else {}
    # GES üretim sayacı (adında GES geçen ve Çekiş kanalında gündüz üretimi yazan sayaç, ör. 45644611)
    ges_cekis_sayaclar = {sn for sn, m in sayac_meta.items() if m.get("ges_cekiste")}
    uretim_sn = next((sn for sn, m in sayac_meta.items() if "GES" in str(m.get("abone_adi", "")).upper()), snu_chart)
    tuk_sn = [sn for sn in tum_cihazlar if sn not in ges_cekis_sayaclar] or list(tum_cihazlar)

    # --- günlük (bu ay): üretim + sayaç başına tüketim + reaktif
    ay_yol = d / f"sayac_ay_{bugun.year}{bugun.month:02d}.json" if hedef_sid else d / f"ay_{bugun.year}{bugun.month:02d}.json"
    gunler = {x["g"]: x for x in _oku(ay_yol, [])}
    for x in gu:
        t = _gun(x["Term"])
        if (t.year, t.month) != (bugun.year, bugun.month):
            continue
        k = gunler.setdefault(t.day, {"g": t.day})
        sn = str(x.get("DeviceSerialNo"))
        k.setdefault("veris", {})[sn] = _f(x.get("ActiveCons"))
        if not ges_cekis_sayaclar:
            k.update(kwh=_f(x.get("ActiveCons")), ind=_f(x.get("EnductiveCons")), kap=_f(x.get("CapasitiveCons")))
    for x in gt:
        t = _gun(x["Term"])
        if (t.year, t.month) != (bugun.year, bugun.month):
            continue
        k = gunler.setdefault(t.day, {"g": t.day})
        sn = str(x.get("DeviceSerialNo"))
        if sn in ges_cekis_sayaclar:
            # GES üretim sayacı: üretim değeri burada
            k.update(kwh=_f(x.get("ActiveCons")), ind=_f(x.get("EnductiveCons")), kap=_f(x.get("CapasitiveCons")))
        else:
            k.setdefault("tuk", {})[sn] = {"kwh": _f(x.get("ActiveCons")), "ind": _f(x.get("EnductiveCons")), "kap": _f(x.get("CapasitiveCons"))}
    ay_liste = [gunler[g] for g in sorted(gunler)]
    yaz(ay_yol, ay_liste)
    if hedef_sid:
        # Hibrit santralde sayac_ay_ yanı sıra ana sayaç klasörüne de yaz
        yaz((KOK / snu_chart) / f"ay_{bugun.year}{bugun.month:02d}.json", ay_liste)

    # --- aylık (son 12 ay)
    yil_ = lambda m: bugun.year if int(m) <= bugun.month else bugun.year - 1
    yillar = {}
    for x in au:
        m = int(x["Term"]); y = yil_(m); sn = str(x.get("DeviceSerialNo"))
        kay = yillar.setdefault(y, {}).setdefault(m, {"ay": m})
        kay.setdefault("veris", {})[sn] = _f(x.get("ActiveCons"))
        if not ges_cekis_sayaclar:
            kay.update(kwh=_f(x.get("ActiveCons")), ind=_f(x.get("EnductiveCons")), kap=_f(x.get("CapasitiveCons")))
    for x in at:
        m = int(x["Term"]); y = yil_(m); sn = str(x.get("DeviceSerialNo"))
        kay = yillar.setdefault(y, {}).setdefault(m, {"ay": m})
        if sn in ges_cekis_sayaclar:
            kay.update(kwh=_f(x.get("ActiveCons")), ind=_f(x.get("EnductiveCons")), kap=_f(x.get("CapasitiveCons")))
        else:
            kay.setdefault("tuk", {})[sn] = {"kwh": _f(x.get("ActiveCons")), "ind": _f(x.get("EnductiveCons")), "kap": _f(x.get("CapasitiveCons"))}
    for y, aylar in yillar.items():
        p = d / (f"sayac_yil_{y}.json" if hedef_sid else f"yil_{y}.json")
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
    or_u = oran(ru)
    or_t = oran(rt)
    reak_uretim = or_t.pop(uretim_sn, None) if uretim_sn in ges_cekis_sayaclar and uretim_sn in or_t else or_u.get(uretim_sn, [])
    reak = {"sinir": SINIR, "uretim": reak_uretim or [], "tuketim": or_t, "toplandi": int(time.time())}
    yaz(d / "reaktif.json", reak)

    # --- özet
    bu = next((x for x in ay_liste if x["g"] == bugun.day), {})
    dun_t = bugun - timedelta(days=1)
    dun = next((x for x in ay_liste if x["g"] == dun_t.day), {}) if dun_t.month == bugun.month else {}
    top = lambda key: round(sum((x.get(key) or 0) for x in ay_liste), 2)
    tuk_ay = {sn: round(sum(((x.get("tuk") or {}).get(sn) or {}).get("kwh") or 0 for x in ay_liste), 2) for sn in tuk_sn}
    veris_ay = {sn: round(sum((x.get("veris") or {}).get(sn) or 0 for x in ay_liste), 2) for sn in tum_cihazlar}
    yil_kwh = round(sum((v.get("kwh") or 0) for v in (yillar.get(bugun.year) or {}).values()), 2) or None
    alarmlar = []
    for ad_, liste in [(f"Üretim {uretim_sn}", reak["uretim"])] + [(f"Tüketim {sn}", v) for sn, v in reak["tuketim"].items()]:
        son = liste[-1] if liste else None
        if son and son["yil"] == bugun.year and son["ay"] == bugun.month:
            for k, et in (("ind", "Endüktif"), ("kap", "Kapasitif")):
                if (son.get(k) or 0) > SINIR[k]:
                    alarmlar.append({"alertName": f"{ad_}: {et} oran %{son[k]:.1f} (sınır %{SINIR[k]:.0f})", "level": 1, "alertTime": int(time.time())})

    sayac_adlari = {sn: (sayac_meta.get(sn) or {}).get("abone_adi") or sn for sn in tum_cihazlar}
    sayac_ozet = {
        "uretim_sn": uretim_sn,
        "tuketim_sn": tuk_sn,
        "tum_sn": tum_cihazlar,
        "adlar": sayac_adlari,
        "ges_cekiste": list(ges_cekis_sayaclar),
        "bugun_uretim_kwh": bu.get("kwh"),
        "dun_uretim_kwh": dun.get("kwh"),
        "ay_uretim_kwh": top("kwh"),
        "yil_uretim_kwh": yil_kwh,
        "bugun_tuketim": {sn: ((bu.get("tuk") or {}).get(sn) or {}).get("kwh") for sn in tuk_sn},
        "dun_tuketim": {sn: ((dun.get("tuk") or {}).get(sn) or {}).get("kwh") for sn in tuk_sn},
        "ay_tuketim": tuk_ay,
        "ay_veris": veris_ay,
        "osf07_son_okuma": osf_veri.get("son_okuma") if isinstance(osf_veri, dict) else None,
    }

    if hedef_sid:
        # Mevcut inverter son.json dosyasını zenginleştir (inverter + sayaç birleşik)
        mevcut = _oku(d / "son.json", {})
        mevcut["sayac"] = sayac_ozet
        mevcut["alarmlar"] = (mevcut.get("alarmlar") or []) + alarmlar
        yaz(d / "son.json", mevcut)
        meta = dict(hedef_santral or {})
        meta["sayac_var"] = True
        meta["inverter_var"] = True
        meta["uretim_sn"] = uretim_sn
        meta["tuketim_sn"] = tuk_sn
        return sid, meta, {"cihazlar": tum_cihazlar, "adlar": sayac_adlari, "uretim_sn": uretim_sn}
    else:
        yaz(d / "son.json", {
            "sid": sid, "ad": vars_ad, "adres": ADRES, "kapasite_kwp": None, "kaynak": "ace",
            "inverter_var": False, "sayac_var": True,
            "guc_w": None, "gunluk_kwh": bu.get("kwh"), "aylik_kwh": top("kwh"), "yillik_kwh": yil_kwh, "toplam_kwh": None,
            "iletisim": "NORMAL", "son_veri": int(time.time()), "alarmlar": alarmlar,
            "sayac": sayac_ozet,
            "toplandi": int(time.time()),
        })
        return sid, {
            "ad": vars_ad, "adres": ADRES, "kapasite_kwp": None,
            "tip": "sayac", "hesap": H.ad, "kaynak": "ace",
            "inverter_var": False, "sayac_var": True, "uretim_sn": uretim_sn, "tuketim_sn": tuk_sn,
        }, {"cihazlar": tum_cihazlar, "adlar": sayac_adlari, "uretim_sn": uretim_sn}


def tur(KOK: Path, yaz, mevcut_santraller: dict = None) -> tuple[dict, dict]:
    """Tüm OSB hesaplarını dolaşır; (santraller_dict, durum_dict) döndürür."""
    mevcut_santraller = mevcut_santraller or {}
    santraller = {}
    hesap_durum = {}
    for H in hesap_listesi():
        try:
            # Aynı soneke sahip SOLARMAN santrali var mı? (ör. _TATMAK -> 60504527: Tatmak ges)
            eslesen_sid = None
            eslesen_sant = None
            for sid, s_meta in mevcut_santraller.items():
                if s_meta.get("kaynak") == "ace":
                    continue
                if s_meta.get("hesap") == H.ad or (H.ad.lstrip("_").lower() and H.ad.lstrip("_").lower() in str(s_meta.get("ad", "")).lower()):
                    eslesen_sid = sid
                    eslesen_sant = s_meta
                    break
            sid, meta, iz = _hesap_tur(H, KOK, yaz, eslesen_sid, eslesen_sant)
            santraller[sid] = meta
            hesap_durum[f"osb{H.ad}"] = {"tamam": True, "sid": sid, "iz": iz}
        except Exception as e:
            hesap_durum[f"osb{H.ad}"] = {"tamam": False, "hata": str(e)[:200]}
    return santraller, hesap_durum
