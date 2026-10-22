"""Müşteri Monitoring · Fronius Solar.web (HAS GERİ DÖNÜŞÜM GES) otomatik inverter toplayıcısı.

Oturum:
  1. Önce /musteri/solarweb_cookies.json (veya SOLARWEB_COOKIE ortam değişkeni) ile mevcut oturumu dener.
  2. Oturum yoksa veya düşmüşse, FRONIUS_GIRIS_HASGERIDONUSUM ve FRONIUS_SIFRE_HASGERIDUNUS (veya
     FRONIUS_SIFRE_HASGERIDONUSUM) ile https://www.solarweb.com/Account/ExternalLogin ->
     https://login.fronius.com/commonauth -> ExternalLoginCallback OIDC akışı üzerinden otomatik giriş yapar
     ve çerezleri /musteri/solarweb_cookies.json dosyasına kaydeder.
  3. 11 adet Fronius Tauro inverterin (a62d38bb-354c-4e44-b614-7e7dccb93d79) 5 dakikalık güç, gerilim,
     akım, reaktif/görünür güç, cosPhi verilerini ve günlük/aylık/yıllık enerjilerini çeker:
     - SQLite (/musteri/has_solarweb.db -> solarweb_olcum) tablosuna upsert eder.
     - Müşteri Paneli için /musteri/45387414/ altında gun_YYYYMMDD.json, ay_YYYYMM.json, yil_YYYY.json,
       inverterler.json ve son.json dosyalarını üretir.
"""
import datetime as dt
import html as _html
import json
import os
import re
import sqlite3
import time
from pathlib import Path
from urllib.parse import urljoin

import requests

BASE = "https://www.solarweb.com/Chart/GetAnalysisChart"
PV_SYSTEM_ID = os.environ.get("FRONIUS_PV_ID_HASGERIDONUSUM", "a62d38bb-354c-4e44-b614-7e7dccb93d79")
HEDEF_SID = os.environ.get("FRONIUS_SID_HASGERIDONUSUM", "45387414")
KAPASITE_KWP = float(os.environ.get("FRONIUS_KWP_HASGERIDONUSUM", "1000"))
TR = dt.timezone(dt.timedelta(hours=3))

DEVICES = {
    "cb4a0b63-6b3c-4144-b498-7c6dd2961674": "Tauro (10)",
    "970439ce-0ca5-491a-8f5e-8de9b0ab6164": "Tauro (11)",
    "87d30ee6-a26e-4123-81f9-e8558ff16bb3": "Tauro ECO (1)",
    "ac51c712-913f-44ae-94d4-f77baac4d470": "Tauro ECO (2)",
    "d6c35a80-3051-4599-b5bc-a53d7a5e5583": "Tauro ECO (3)",
    "216fa506-49aa-4e64-8e5d-3b661ab99fa3": "Tauro ECO (4)",
    "6c035edf-006d-488f-93cb-66c6307692e7": "Tauro ECO (5)",
    "e6fde23f-5e07-440f-a13a-0916cf1aa300": "Tauro ECO (6)",
    "c51edfb3-04e8-4b00-b54a-136cc2585d28": "Tauro ECO (7)",
    "9da8c88f-8c64-44c1-b175-23e5ac9e1771": "Tauro ECO (8)",
    "c34149c5-4466-4d62-8eda-6c24adfa44a9": "Tauro ECO (9)",
}

CHANNEL_GROUPS = {
    "day": [
        ["devwork", "fromgen"],
        ["udcmean", "udcmean2", "udcmean3", "idcmean", "idcmean2", "idcmean3"],
        ["uacmeanl1", "uacmeanl2", "uacmeanl3", "iacmeanl1", "iacmeanl2", "iacmeanl3"],
        ["powerreactive", "powerapparent", "cosphi"],
    ],
    "month": [["devwork"]],
    "year": [["devwork"]],
}

UNIT = {
    "W": (1.0, "W"), "kW": (1e3, "W"), "MW": (1e6, "W"),
    "VA": (1.0, "VA"), "kVA": (1e3, "VA"),
    "VAr": (1.0, "VAr"), "kVAr": (1e3, "VAr"), "var": (1.0, "VAr"), "kvar": (1e3, "VAr"),
    "A": (1.0, "A"), "mA": (1e-3, "A"),
    "V": (1.0, "V"), "kV": (1e3, "V"),
    "Wh": (1e-3, "kWh"), "kWh": (1.0, "kWh"), "MWh": (1e3, "kWh"),
    "1": (1.0, ""),
}

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
_OTURUM: requests.Session | None = None
_SON_AY_YIL_CEKIM: float = 0.0
_SON_CIHAZ_AYLIK: dict[str, float] = {}
_GECMIS_GUNLER_TAMAM: set[str] = set()


def _kimlik() -> tuple[str, str, str]:
    kul = (
        os.environ.get("FRONIUS_GIRIS_HASGERIDONUSUM")
        or os.environ.get("FRONIUS_KULLANICI_HASGERIDONUSUM")
        or os.environ.get("SOLARWEB_KULLANICI")
        or ""
    ).strip()
    sifre = (
        os.environ.get("FRONIUS_SIFRE_HASGERIDUNUS")
        or os.environ.get("FRONIUS_SIFRE_HASGERIDONUSUM")
        or os.environ.get("SOLARWEB_SIFRE")
        or ""
    ).strip()
    cerez = (os.environ.get("SOLARWEB_COOKIE") or "").strip()
    return kul, sifre, cerez


def etkin() -> bool:
    kul, sifre, cerez = _kimlik()
    return bool((kul and sifre) or cerez)


def norm(name: str) -> str:
    name = re.sub(r"\s+", " ", str(name or "")).strip()
    return re.sub(r"\(\s*(\d+)\s*\)", r"(\1)", name)


def _cerez_dosya(kok: Path) -> Path:
    return kok / "solarweb_cookies.json"


def _cerez_yukle(session: requests.Session, kok: Path) -> bool:
    cf = _cerez_dosya(kok)
    if cf.is_file():
        try:
            for c in json.loads(cf.read_text(encoding="utf-8")):
                session.cookies.set(c["name"], c["value"], domain=c.get("domain", "www.solarweb.com"), path=c.get("path", "/"))
            return True
        except Exception:
            pass
    _, _, raw = _kimlik()
    if not raw:
        return False
    for part in raw.split(";"):
        if "=" in part:
            k, v = part.strip().split("=", 1)
            session.cookies.set(k.strip(), v.strip(), domain="www.solarweb.com", path="/")
    return True


def _cerez_kaydet(session: requests.Session, kok: Path):
    try:
        cf = _cerez_dosya(kok)
        data = [{"name": c.name, "value": c.value, "domain": c.domain, "path": c.path} for c in session.cookies]
        tmp = cf.with_suffix(".tmp")
        tmp.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
        tmp.replace(cf)
    except Exception:
        pass


def _form_inputs_coz(html_text: str) -> dict[str, str]:
    out = {}
    for m in re.finditer(r"<input\b([^>]+)>", html_text, re.I):
        attrs = m.group(1)
        nm = re.search(r'\bname=["\']([^"\']+)["\']', attrs, re.I)
        if not nm:
            continue
        vl = re.search(r'\bvalue=["\']([^"\']*)["\']', attrs, re.I)
        tp = re.search(r'\btype=["\']([^"\']+)["\']', attrs, re.I)
        if tp and tp.group(1).lower() in ("checkbox", "submit", "button"):
            continue
        out[nm.group(1)] = _html.unescape(vl.group(1)) if vl else ""
    return out


def _otomatik_giris(kok: Path) -> requests.Session:
    """Headless Chromium (Playwright) ile Fronius Solar.web (login.fronius.com + FriendlyCaptcha) oturumu açar."""
    kul, sifre, cerez = _kimlik()
    s = requests.Session()
    s.headers.update({
        "User-Agent": UA,
        "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
    })
    if not (kul and sifre):
        if _cerez_yukle(s, kok):
            return s
        raise RuntimeError("Fronius kullanıcı/şifre veya çerez tanımlı değil")

    from playwright.sync_api import sync_playwright

    iz_not = []
    with sync_playwright() as p:
        exec_path = "/usr/bin/chromium" if Path("/usr/bin/chromium").exists() else None
        browser = p.chromium.launch(
            executable_path=exec_path,
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-blink-features=AutomationControlled"],
        )
        try:
            ctx = browser.new_context(
                user_agent=UA,
                locale="tr-TR",
                viewport={"width": 1280, "height": 800},
            )
            ctx.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined});")
            page = ctx.new_page()
            page.goto("https://www.solarweb.com/Account/ExternalLogin", wait_until="networkidle", timeout=45000)
            page.wait_for_timeout(1000)

            # Hesapta FriendlyCaptcha zorunlu olduğu için ilk ekranda reCaptcha=true yoksa doğrudan ekle
            if "login.fronius.com" in page.url and "reCaptcha=true" not in page.url:
                sep = "&" if "?" in page.url else "?"
                page.goto(page.url + f"{sep}reCaptcha=true", wait_until="networkidle", timeout=45000)
                page.wait_for_timeout(1500)

            for tur_no in (1, 2):
                if "solarweb.com" in page.url and "login.fronius.com" not in page.url and "ExternalLogin" not in page.url:
                    break
                if page.locator("#usernameUserInput").count() == 0:
                    page.wait_for_timeout(2000)
                    if "solarweb.com" in page.url and "login.fronius.com" not in page.url and "ExternalLogin" not in page.url:
                        break
                    if page.locator("#usernameUserInput").count() == 0:
                        break

                frc_var = page.locator(".frc-captcha").count() > 0
                frc_cozuldu = False
                durum_iz = []
                if frc_var:
                    # Widget ve Agent iframe'lerinin yüklenip hazır olmasını bekle
                    for _ in range(30):
                        st = page.evaluate("""() => {
                            if (!window.frcaptcha || !window.frcaptcha.widgets) return 'no-sdk';
                            const arr = Array.from(window.frcaptcha.widgets.values());
                            return arr.length ? (arr[0].getState() || 'empty') : 'no-widget';
                        }""")
                        if st not in ("no-sdk", "no-widget", "init", "unconnected"):
                            break
                        page.wait_for_timeout(500)

                # Kullanıcı adı ve şifreyi doldur (focusin tetikler)
                page.mouse.move(300, 300)
                page.click("#usernameUserInput")
                page.fill("#usernameUserInput", kul)
                page.click("#password")
                page.fill("#password", sifre)

                if frc_var:
                    son_tik = -5
                    for adim in range(70):
                        bilgi = page.evaluate("""() => {
                            const el = document.querySelector("[name='frc-captcha-response']");
                            const val = el ? el.value : '';
                            let st = 'none';
                            if (window.frcaptcha && window.frcaptcha.widgets) {
                                const arr = Array.from(window.frcaptcha.widgets.values());
                                if (arr.length) st = arr[0].getState();
                            }
                            return {val, st};
                        }""")
                        st = bilgi.get("st", "none")
                        val = bilgi.get("val", "")
                        if not durum_iz or durum_iz[-1] != st:
                            durum_iz.append(st)
                        if st == "completed" or (val and not str(val).startswith(".")):
                            frc_cozuldu = True
                            break
                        if st in ("unactivated", "activated", "expired", "error") and (adim - son_tik) >= 6:
                            son_tik = adim
                            try:
                                page.evaluate("""() => {
                                    if (window.frcaptcha && window.frcaptcha.widgets) {
                                        Array.from(window.frcaptcha.widgets.values()).forEach(w => {
                                            if (w.trigger) w.trigger('programmatic');
                                        });
                                    }
                                }""")
                            except Exception:
                                pass
                            try:
                                btn = page.frame_locator("iframe.frc-i-widget").locator("button.button, .main").first
                                if btn.count() > 0:
                                    btn.click(timeout=2000, force=True)
                            except Exception:
                                pass
                        page.wait_for_timeout(500)

                iz_not.append(f"t{tur_no}:frc={int(frc_var)}/{int(frc_cozuldu)}({'-'.join(durum_iz)})")

                with page.expect_navigation(wait_until="domcontentloaded", timeout=40000):
                    page.click("#login-button")
                page.wait_for_timeout(2500)

                # OIDC form_post sayfasıysa yönlenmenin tamamlanmasını bekle
                for _ in range(15):
                    if "login.fronius.com" not in page.url and "ExternalLoginCallback" not in page.url:
                        break
                    if page.locator("#usernameUserInput").count() > 0:
                        try:
                            page.wait_for_load_state("networkidle", timeout=15000)
                        except Exception:
                            pass
                        break
                    page.wait_for_timeout(1000)

            if "login.fronius.com" in page.url or "ExternalLogin" in page.url:
                from urllib.parse import parse_qs, urlparse
                qs = parse_qs(urlparse(page.url).query)
                f_msg = (qs.get("authFailureMsg") or qs.get("errorCode") or [""])[0]
                alert_txt = ""
                try:
                    if page.locator(".fro-alert__content").count() > 0:
                        alert_txt = page.locator(".fro-alert__content").inner_text().strip().replace("\n", " ")[:80]
                except Exception:
                    pass
                raise RuntimeError(f"Fronius girişi reddedildi ({','.join(iz_not)} msg={f_msg} alert={alert_txt})")

            try:
                page.goto(f"https://www.solarweb.com/Chart/AnalysisChart?pvSystemId={PV_SYSTEM_ID}", wait_until="domcontentloaded", timeout=30000)
                page.wait_for_timeout(1500)
            except Exception:
                pass

            cerez_listesi = []
            for c in ctx.cookies():
                s.cookies.set(c["name"], c["value"], domain=c.get("domain", "www.solarweb.com"), path=c.get("path", "/"))
                cerez_listesi.append({"name": c["name"], "value": c["value"], "domain": c.get("domain", "www.solarweb.com"), "path": c.get("path", "/")})
            cf = _cerez_dosya(kok)
            tmp = cf.with_suffix(".tmp")
            tmp.write_text(json.dumps(cerez_listesi, ensure_ascii=False), encoding="utf-8")
            tmp.replace(cf)
            return s
        finally:
            browser.close()


def _oturum_al(kok: Path, yenile: bool = False) -> requests.Session:
    global _OTURUM
    if not yenile and _OTURUM is not None:
        return _OTURUM
    s = requests.Session()
    s.headers.update({
        "User-Agent": UA,
        "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
    })
    if not yenile and _cerez_yukle(s, kok):
        _OTURUM = s
        return s
    _OTURUM = _otomatik_giris(kok)
    return _OTURUM


def _fetch(kok: Path, interval: str, date: dt.date, channels: list[str]) -> dict:
    params = [
        ("pvSystemId", PV_SYSTEM_ID),
        ("year", date.year), ("month", date.month), ("day", date.day),
        ("interval", interval),
    ]
    params += [("channels", c) for c in channels]
    params += [("devices", d) for d in DEVICES]
    params += [("compareView", "false"), ("kwhkwpView", "false")]
    hdr = {
        "X-Requested-With": "XMLHttpRequest",
        "Referer": f"https://www.solarweb.com/Chart/AnalysisChart?pvSystemId={PV_SYSTEM_ID}",
        "Accept": "application/json, text/javascript, */*; q=0.01",
    }
    for deneme in (1, 2):
        s = _oturum_al(kok, yenile=(deneme == 2))
        r = s.get(BASE, params=params, headers=hdr, timeout=50, allow_redirects=False)
        if r.status_code in (301, 302, 401, 403) or "application/json" not in r.headers.get("Content-Type", "").lower():
            if deneme == 1:
                continue
            raise RuntimeError(f"Solar.web oturumu açılmadı (HTTP {r.status_code}, ct={r.headers.get('Content-Type', '')[:30]})")
        r.raise_for_status()
        _cerez_kaydet(s, kok)
        return r.json()
    raise RuntimeError("Solar.web veri çekilemedi")


def _rows_from(resp: dict, interval: str) -> list[tuple]:
    label_to_code = {}
    for ch in (resp.get("deviceChannels") or {}).get("channels") or []:
        label = re.sub(r"<[^>]+>", "", ch.get("displayName", ""))
        label = re.sub(r"\(.*?\)", "", label).strip()
        label_to_code[label] = ch.get("value")
    out = []
    for s in (resp.get("settings") or {}).get("series") or []:
        parts = [p.strip() for p in str(s.get("name", "")).split("|")]
        label, cihaz = (parts[0], parts[1]) if len(parts) > 1 else (parts[0], "")
        code = label_to_code.get(label)
        if label.startswith("Toplam enerji bilançosu") or cihaz == "FV üretim" or "total" in label.lower():
            code, cihaz = "fromgen", "TESIS"
        elif label in ("Enerji", "Energy", "Toplam performans", "Total performance") and not code:
            code = "devwork"
        if code is None:
            code = label or "devwork"
        carpan, birim = UNIT.get(s.get("yAxis"), (1.0, s.get("yAxis") or ""))
        c_norm = norm(cihaz) if cihaz else "TESIS"
        for pt in s.get("data") or []:
            if not isinstance(pt, (list, tuple)) or len(pt) < 2 or pt[1] is None:
                continue
            ts, val = pt[0], pt[1]
            out.append((
                PV_SYSTEM_ID,
                c_norm,
                code,
                interval,
                dt.datetime.fromtimestamp(ts / 1000, dt.timezone.utc).isoformat(),
                float(val) * carpan,
                birim,
            ))
    return out


def _sum_value_kwh(resp: dict) -> float | None:
    sv = str(resp.get("sumValue") or (resp.get("settings") or {}).get("sumValue") or "").strip()
    if not sv:
        return None
    m = re.search(r"([\d.,]+)\s*(Wh|kWh|MWh|GWh)", sv, re.I)
    if not m:
        return None
    num_s = m.group(1)
    if "," in num_s:
        num_s = num_s.replace(".", "").replace(",", ".")
    try:
        val = float(num_s)
    except ValueError:
        return None
    u = m.group(2).lower()
    if u == "wh":
        return round(val / 1000.0, 3)
    if u == "mwh":
        return round(val * 1000.0, 3)
    if u == "gwh":
        return round(val * 1e6, 3)
    return round(val, 3)


def _db_ac(kok: Path) -> sqlite3.Connection:
    db = sqlite3.connect(str(kok / "has_solarweb.db"))
    db.execute("""CREATE TABLE IF NOT EXISTS solarweb_olcum(
        tesis_id TEXT, cihaz_ad TEXT, kanal TEXT, aralik TEXT,
        ts_utc TEXT, deger REAL, birim TEXT,
        PRIMARY KEY(tesis_id, cihaz_ad, kanal, aralik, ts_utc))""")
    return db


def _db_yaz(db: sqlite3.Connection, rows: list[tuple]):
    if not rows:
        return
    db.executemany("""INSERT INTO solarweb_olcum VALUES(?,?,?,?,?,?,?)
        ON CONFLICT(tesis_id,cihaz_ad,kanal,aralik,ts_utc)
        DO UPDATE SET deger=excluded.deger, birim=excluded.birim""", rows)
    db.commit()


def _gun_serisi_olustur(rows: list[tuple]) -> tuple[list[dict], dict[str, dict]]:
    """5 dk devwork/fromgen satırlarından tesis toplam güç serisini ve cihaz bazlı özetleri üretir."""
    ts_devwork: dict[int, float] = {}
    ts_fromgen: dict[int, float] = {}
    cihaz_son: dict[str, dict] = {norm(ad): {"ad": norm(ad), "device_id": did, "guc_w": 0.0, "gunluk_kwh": 0.0, "son_ts": 0, "kanallar": {}} for did, ad in DEVICES.items()}
    cihaz_kwh_puan: dict[str, list[float]] = {norm(ad): [] for ad in DEVICES.values()}

    for _, cihaz_ad, kanal, _, ts_iso, deger, birim in rows:
        ts_sec = int(dt.datetime.fromisoformat(ts_iso).timestamp())
        if kanal == "fromgen" and cihaz_ad == "TESIS":
            ts_fromgen[ts_sec] = round(deger, 2)
        elif kanal == "devwork" and cihaz_ad != "TESIS":
            ts_devwork[ts_sec] = round(ts_devwork.get(ts_sec, 0.0) + deger, 2)
            c = cihaz_son.setdefault(cihaz_ad, {"ad": cihaz_ad, "guc_w": 0.0, "gunluk_kwh": 0.0, "son_ts": 0, "kanallar": {}})
            cihaz_kwh_puan.setdefault(cihaz_ad, []).append(max(0.0, deger))
            if ts_sec >= c["son_ts"]:
                c["son_ts"] = ts_sec
                c["guc_w"] = round(deger, 1)
        elif cihaz_ad in cihaz_son:
            c = cihaz_son[cihaz_ad]
            kan = c["kanallar"].setdefault(kanal, {"ts": 0, "deger": None, "birim": birim})
            if ts_sec >= kan["ts"]:
                kan["ts"] = ts_sec
                kan["deger"] = round(deger, 3)
                kan["birim"] = birim

    # Her 5 dk nokta = 1/12 saat -> Wh = W / 12 -> kWh = W / 12000
    for c_ad, w_list in cihaz_kwh_puan.items():
        if w_list and c_ad in cihaz_son:
            cihaz_son[c_ad]["gunluk_kwh"] = round(sum(w_list) / 12000.0, 2)

    secilen_ts = ts_devwork if ts_devwork else ts_fromgen
    noktalar = [{"t": t, "w": round(secilen_ts[t], 1)} for t in sorted(secilen_ts)]
    return noktalar, cihaz_son


def _oku(p: Path, vars_):
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return vars_


def tur(kok: Path, yaz, mevcut_santraller: dict = None) -> tuple[dict, dict]:
    """HAS GERİ DÖNÜŞÜM GES Fronius Solar.web verilerini toplar ve /musteri/45387414/ altına yazar."""
    global _SON_AY_YIL_CEKIM, _SON_CIHAZ_AYLIK
    simdi = dt.datetime.now(TR)
    bugun = simdi.date()
    d = kok / HEDEF_SID
    d.mkdir(parents=True, exist_ok=True)
    db = _db_ac(kok)

    try:
        # 1. Bugünün 5 dk tüm kanal verilerini çek
        bugun_rows = []
        bugun_sum_kwh = None
        for idx, grp in enumerate(CHANNEL_GROUPS["day"]):
            resp = _fetch(kok, "day", bugun, grp)
            if idx == 0:
                bugun_sum_kwh = _sum_value_kwh(resp)
            r_list = _rows_from(resp, "day")
            bugun_rows.extend(r_list)
        _db_yaz(db, bugun_rows)

        noktalar, cihaz_map = _gun_serisi_olustur(bugun_rows)
        yaz(d / f"gun_{bugun.year}{bugun.month:02d}{bugun.day:02d}.json", noktalar)

        # 2. Aylık ve yıllık verileri (ve bu ayın eksik geçmiş günlerinin 5 dk güç serilerini) güncelle
        ay_dosya = d / f"ay_{bugun.year}{bugun.month:02d}.json"
        yil_dosya = d / f"yil_{bugun.year}.json"
        ay_listesi = _oku(ay_dosya, [])
        yil_listesi = _oku(yil_dosya, [])
        cihaz_aylik_kwh: dict[str, float] = dict(_SON_CIHAZ_AYLIK)

        if not ay_listesi or not yil_listesi or not cihaz_aylik_kwh or (time.time() - _SON_AY_YIL_CEKIM) >= 900:
            cihaz_aylik_kwh = {}
            # Bu ay (günlük kWh)
            resp_m = _fetch(kok, "month", bugun.replace(day=1), ["devwork"])
            m_rows = _rows_from(resp_m, "month")
            _db_yaz(db, m_rows)
            gun_toplam: dict[int, float] = {}
            for _, cihaz_ad, kanal, _, ts_iso, deger, _ in m_rows:
                if kanal != "devwork" or cihaz_ad == "TESIS":
                    continue
                t_dt = dt.datetime.fromisoformat(ts_iso)
                if t_dt.year == bugun.year and t_dt.month == bugun.month:
                    gun_toplam[t_dt.day] = round(gun_toplam.get(t_dt.day, 0.0) + deger, 2)
                    cihaz_aylik_kwh[cihaz_ad] = round(cihaz_aylik_kwh.get(cihaz_ad, 0.0) + deger, 2)
            ay_listesi = [
                {"g": g_no, "kwh": kwh, "saat": round(kwh / KAPASITE_KWP, 2) if KAPASITE_KWP else None}
                for g_no, kwh in sorted(gun_toplam.items())
            ]
            yaz(ay_dosya, ay_listesi)

            # Bu yıl (aylık kWh)
            resp_y = _fetch(kok, "year", dt.date(bugun.year, 1, 1), ["devwork"])
            y_rows = _rows_from(resp_y, "year")
            _db_yaz(db, y_rows)
            ay_toplam: dict[int, float] = {}
            for _, cihaz_ad, kanal, _, ts_iso, deger, _ in y_rows:
                if kanal != "devwork" or cihaz_ad == "TESIS":
                    continue
                t_dt = dt.datetime.fromisoformat(ts_iso)
                if t_dt.year == bugun.year:
                    ay_toplam[t_dt.month] = round(ay_toplam.get(t_dt.month, 0.0) + deger, 2)
            yil_listesi = [{"ay": m_no, "kwh": kwh} for m_no, kwh in sorted(ay_toplam.items())]
            yaz(yil_dosya, yil_listesi)

            # Geçen yıl dosyası yoksa bir kez çek
            gecen_yil_dosya = d / f"yil_{bugun.year - 1}.json"
            if not gecen_yil_dosya.is_file():
                try:
                    resp_py = _fetch(kok, "year", dt.date(bugun.year - 1, 1, 1), ["devwork"])
                    py_rows = _rows_from(resp_py, "year")
                    _db_yaz(db, py_rows)
                    py_toplam: dict[int, float] = {}
                    for _, cihaz_ad, kanal, _, ts_iso, deger, _ in py_rows:
                        if kanal != "devwork" or cihaz_ad == "TESIS":
                            continue
                        t_dt = dt.datetime.fromisoformat(ts_iso)
                        if t_dt.year == bugun.year - 1:
                            py_toplam[t_dt.month] = round(py_toplam.get(t_dt.month, 0.0) + deger, 2)
                    if py_toplam:
                        yaz(gecen_yil_dosya, [{"ay": m_no, "kwh": kwh} for m_no, kwh in sorted(py_toplam.items())])
                except Exception:
                    pass

            _SON_CIHAZ_AYLIK = dict(cihaz_aylik_kwh)
            _SON_AY_YIL_CEKIM = time.time()

        # 3. Bu ayın geçmiş günleri için gun_YYYYMMDD.json eksikse (her turda en fazla 5 gün) tamamla ki saatlik OSOS tablosunda tüm günler dolu olsun
        eksik_sayac = 0
        for g_no in range(bugun.day - 1, 0, -1):
            g_tarih = dt.date(bugun.year, bugun.month, g_no)
            g_kod = f"{g_tarih.year}{g_tarih.month:02d}{g_tarih.day:02d}"
            g_yol = d / f"gun_{g_kod}.json"
            if g_kod in _GECMIS_GUNLER_TAMAM or (g_yol.is_file() and g_yol.stat().st_size > 20):
                _GECMIS_GUNLER_TAMAM.add(g_kod)
                continue
            try:
                r_gecmis = _fetch(kok, "day", g_tarih, ["devwork", "fromgen"])
                rows_gecmis = _rows_from(r_gecmis, "day")
                _db_yaz(db, rows_gecmis)
                nk_gecmis, _ = _gun_serisi_olustur(rows_gecmis)
                if nk_gecmis:
                    yaz(g_yol, nk_gecmis)
                    _GECMIS_GUNLER_TAMAM.add(g_kod)
                eksik_sayac += 1
                if eksik_sayac >= 6:
                    break
            except Exception:
                break

        # 4. Cihaz bazlı özet (inverterler.json)
        for c_ad, c_bilgi in cihaz_map.items():
            if c_ad in cihaz_aylik_kwh:
                c_bilgi["aylik_kwh"] = cihaz_aylik_kwh[c_ad]
        cihaz_listesi = sorted(
            cihaz_map.values(),
            key=lambda x: (0 if "ECO" in x["ad"] else 1, int(re.search(r"(\d+)", x["ad"]).group(1)) if re.search(r"(\d+)", x["ad"]) else 99),
        )
        yaz(d / "inverterler.json", {
            "tesis_id": PV_SYSTEM_ID,
            "kaynak": "fronius_solarweb",
            "toplandi": int(time.time()),
            "cihaz_sayisi": len(cihaz_listesi),
            "cihazlar": cihaz_listesi,
        })

        # 5. Anlık güç ve üretim toplamları -> son.json
        son_nokta = noktalar[-1] if noktalar else None
        anlik_guc_w = son_nokta["w"] if (son_nokta and (time.time() - son_nokta["t"]) <= 2700) else 0.0
        bugun_kwh = bugun_sum_kwh if bugun_sum_kwh is not None else (
            next((x["kwh"] for x in ay_listesi if x["g"] == bugun.day), None)
            or round(sum(x["w"] for x in noktalar) / 12000.0, 2)
        )
        aylik_kwh = round(sum((x.get("kwh") or 0.0) for x in ay_listesi), 2)
        yillik_kwh = round(sum((x.get("kwh") or 0.0) for x in yil_listesi), 2)

        eski_son = _oku(d / "son.json", {})
        yeni_son = {
            "sid": HEDEF_SID,
            "ad": eski_son.get("ad") or "HAS GERİ DÖNÜŞÜM GES",
            "adres": eski_son.get("adres") or "Aksaray OSB",
            "kapasite_kwp": KAPASITE_KWP,
            "kaynak": "fronius",
            "pv_system_id": PV_SYSTEM_ID,
            "inverter_var": True,
            "inverter_sayisi": len(DEVICES),
            "sayac_var": bool(eski_son.get("sayac")),
            "guc_w": anlik_guc_w,
            "gunluk_kwh": bugun_kwh,
            "aylik_kwh": aylik_kwh,
            "yillik_kwh": yillik_kwh,
            "toplam_kwh": eski_son.get("toplam_kwh") or yillik_kwh,
            "tam_guc_saat": round(bugun_kwh / KAPASITE_KWP, 2) if (bugun_kwh and KAPASITE_KWP) else None,
            "iletisim": "NORMAL",
            "son_veri": son_nokta["t"] if son_nokta else int(time.time()),
            "alarmlar": eski_son.get("alarmlar") or [],
            "toplandi": int(time.time()),
        }
        if eski_son.get("sayac"):
            yeni_son["sayac"] = eski_son["sayac"]
        yaz(d / "son.json", yeni_son)

        meta = {
            "ad": yeni_son["ad"],
            "adres": yeni_son["adres"],
            "kapasite_kwp": KAPASITE_KWP,
            "tip": "pv_sayac",
            "hesap": "_HASGERIDONUSUM",
            "kaynak": "fronius",
            "inverter_var": True,
            "inverter_sayisi": len(DEVICES),
            "sayac_var": bool(eski_son.get("sayac")),
        }
        return {HEDEF_SID: meta}, {
            "fronius_HASGERIDONUSUM": {
                "tamam": True,
                "sid": HEDEF_SID,
                "cihaz": len(DEVICES),
                "nokta": len(noktalar),
                "gunluk_kwh": bugun_kwh,
                "aylik_kwh": aylik_kwh,
            }
        }
    finally:
        db.close()
