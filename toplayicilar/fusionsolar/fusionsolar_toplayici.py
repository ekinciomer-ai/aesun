#!/usr/bin/env python3
"""
FusionSolar web toplayıcısı (Northbound API gerektirmez)
Tek Yıldız-1 (Sera-1) / Tek Yıldız-2 (Sera-2) GES

Kendi tarayıcı profiliyle (Playwright) FusionSolar web hesabına giriş yapar,
sitenin kendi veri adreslerinden çeker:

  - Tesis anlık KPI (güç, gün/ay/yıl/toplam üretim)   5 dk
  - İnvertör gerçek zamanlı (18 invertör)             5 dk
  - Alarmlar (aktif + son geçmiş)                      15 dk
  - Gün eğrisi (5 dk güç) + saatlik üretim             saatte bir
  - Ay içi günlük üretim                               6 saatte bir

Kayıt: data/fusionsolar.db (SQLite) + data/latest.json
Panel: GITHUB_TOKEN varsa (.env ya da ~/.aesun/osos.env) 10 dakikada bir
       epias-ptf/n8n/fusionsolar_son.json'a yazılır → AEMonitoring panelinde görünür.

Kullanım (CMD):
  py fusionsolar_toplayici.py --test         giriş + tesis/invertör listesi
  py fusionsolar_toplayici.py --once         her şeyi 1 kez çek
  py fusionsolar_toplayici.py --backfill 90  son 90 günün eğrisi + günlükleri
  py fusionsolar_toplayici.py --gecmis       şebeke bağlantısından bugüne günlük üretim (+ GitHub)
  py fusionsolar_toplayici.py                sürekli çalış
"""
import argparse
import base64
import urllib.error
import urllib.request
import datetime as dt
import json
import logging
import os
import re
import sqlite3
import sys
import time
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent


def load_env():
    for n in (".env", ".env.txt", "env", "env.txt"):
        p = ROOT / n
        if p.exists():
            for line in p.read_text(encoding="utf-8-sig").splitlines():
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
            return str(p)
    return None


ENV_FILE = load_env()
BASE = os.getenv("FUSIONSOLAR_BASE", "https://sg5.fusionsolar.huawei.com").rstrip("/")
USER = os.getenv("FUSIONSOLAR_USER", "")
PASS = os.getenv("FUSIONSOLAR_PASS", "")
HEADLESS = os.getenv("FS_HEADLESS", "1") == "1"
DATA = Path(os.getenv("FUSIONSOLAR_DATA", str(ROOT / "data")))
DATA.mkdir(parents=True, exist_ok=True)
DB_PATH = DATA / "fusionsolar.db"
LATEST = DATA / "latest.json"
PROFILE = DATA / "tarayici_profili"
GH_KOK = "https://api.github.com/repos/ekinciomer-ai/epias-ptf/contents/"
GH_PANEL = "n8n/fusionsolar_son.json"
GH_ARALIK = int(os.getenv("FS_GITHUB_DK", "10")) * 60


def gh_token():
    t = os.getenv("GITHUB_TOKEN", "")
    f = Path.home() / ".aesun" / "osos.env"
    if not t and f.exists():
        for line in f.read_text(encoding="utf-8-sig").splitlines():
            if line.strip().startswith("GITHUB_TOKEN="):
                t = line.split("=", 1)[1].strip()
    return t


LIST_URL = BASE + "/uniportal/pvmswebsite/assets/build/cloud.html#/home/list"

# Gerçek DC kurulu güç (portaldaki değer yanlış)
DC_KWP = {"NE=59224704": 1230.755,   # Tek Yıldız-1 / Sera-1
          "NE=73686040": 1035.0}     # Tek Yıldız-2 / Sera-2
KISA = {"NE=59224704": "Sera-1", "NE=73686040": "Sera-2"}

PERIOD = {"meta": 86400, "station": 300, "inverter": 300, "alarm": 900, "curve": 3600, "month": 21600, "invgun": 21600, "pvanlik": 600}

INV_SIG = {  # device-realtime-data sinyal id -> alan
    "10018": "aktif_kw", "10019": "reaktif_kvar", "10032": "gunluk_kwh", "10029": "toplam_kwh",
    "10006": "nominal_kw", "10020": "guc_faktoru", "10021": "frekans_hz", "10023": "sicaklik_c",
    "10024": "yalitim_mohm", "10025": "durum_kodu", "10014": "ia", "10015": "ib", "10016": "ic",
    "10008": "uab", "10009": "ubc", "10010": "uca", "10027": "baslama", "10028": "kapanma"}
INV_STATE = {512: "Şebekede", 513: "Şebekede (sınırlı)", 768: "Kapalı", 0: "Bekleme",
             1: "Bekleme (algılama)", 2: "Bekleme (ışınım yok)", 1025: "Bekleme",
             40960: "Bekleme (ışınım yok)"}
SEV = {1: "Kritik", 2: "Büyük", 3: "Küçük", 4: "Uyarı"}

log = logging.getLogger("fs")


def pv_sinyal(sid, ad):
    """Gerçek zamanlı sinyal → (PV no, 0=gerilim / 1=akım) ya da (None, None).
    Önce adına bakar ("PV1 giriş gerilimi", "PV3 input current"), yoksa Huawei kimlik düzeni 11001 + 3·(n−1) (+1 akım)."""
    m = re.search(r"PV\s*(\d+)\D{0,25}?(gerilim|voltage|akım|akim|current)", str(ad or ""), re.I)
    if m:
        return int(m.group(1)), 0 if m.group(2).lower() in ("gerilim", "voltage") else 1
    if str(sid).isdigit():
        i = int(sid) - 11001
        if 0 <= i < 3 * 40 and i % 3 < 2:
            return i // 3 + 1, i % 3
    return None, None

JS_CALL = """
async ([m, u, b]) => {
  const now = Date.now();
  if (!window.__fsTok || now - window.__fsTokT > 240000) {
    const r = await fetch('/rest/dpcloud/auth/v1/keep-alive', {headers: {Accept: 'application/json'}});
    let j = null; try { j = await r.json(); } catch (e) {}
    if (!j || typeof j.payload !== 'string' || j.payload.length < 10) return {s: -1, t: 'NOAUTH'};
    window.__fsTok = j.payload; window.__fsTokT = now;
  }
  return await new Promise(res => {
    const x = new XMLHttpRequest(); x.open(m, u, true);
    x.setRequestHeader('roarand', window.__fsTok);
    x.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    x.setRequestHeader('Accept', 'application/json');
    if (b) x.setRequestHeader('Content-Type', 'application/json');
    x.onload = () => res({s: x.status, t: x.responseText});
    x.onerror = () => res({s: 0, t: 'NETERR'});
    x.send(b ? JSON.stringify(b) : null);
  });
}
"""


class NoAuth(Exception):
    pass


def num(v):
    try:
        f = float(v)
        return None if f <= -9e7 else f
    except (TypeError, ValueError):
        return None


def midnight_ms(d: dt.date) -> int:
    return int(dt.datetime(d.year, d.month, d.day).timestamp() * 1000)


# ------------------------------------------------------------------ tarayıcı
class Web:
    def __init__(self):
        from playwright.sync_api import sync_playwright
        self.pw = sync_playwright().start()
        self.headless = HEADLESS
        self._open()

    def _open(self):
        last = None
        for ch in ("chrome", "msedge", None):
            try:
                kw = dict(user_data_dir=str(PROFILE), headless=self.headless, locale="tr-TR",
                          viewport={"width": 1366, "height": 850})
                if ch:
                    kw["channel"] = ch
                self.ctx = self.pw.chromium.launch_persistent_context(**kw)
                self.page = self.ctx.pages[0] if self.ctx.pages else self.ctx.new_page()
                log.info("Tarayıcı: %s (%s)", ch or "chromium", "gizli" if self.headless else "görünür")
                return
            except Exception as e:
                last = e
        raise SystemExit(f"Tarayıcı açılamadı: {last}\nÇözüm: py -m playwright install chromium")

    def _reopen(self, headless):
        try:
            self.ctx.close()
        except Exception:
            pass
        self.headless = headless
        self._open()

    def logged_in(self) -> bool:
        try:
            # yeni arayüzde giriş sonrası adres de "pvmswebsite/login/build/..." olabiliyor; asıl ölçü oturum API'si
            if "fusionsolar" not in self.page.url or "unisso" in self.page.url:
                return False
            r = self.page.evaluate(JS_CALL, ["GET", "/rest/dpcloud/auth/v1/is-session-alive", None])
            return r["s"] == 200 and "true" in r["t"]
        except Exception:
            return False

    def ensure(self):
        if self.logged_in():
            return
        log.info("Oturum yok, giriş yapılıyor...")
        self.page.goto(LIST_URL, wait_until="domcontentloaded", timeout=60000)
        time.sleep(4)
        if self.logged_in():
            log.info("Kayıtlı oturum geçerli")
            return
        if self._auto_login():
            return
        # otomatik giriş olmadı -> görünür pencerede elle giriş (ekranı olmayan Pi'de mümkün değil)
        if sys.platform.startswith("linux") and not os.environ.get("DISPLAY"):
            raise NoAuth("Otomatik giriş olmadı ve ekran yok: .env içindeki kullanıcı adı/şifreyi kontrol edin")
        if self.headless:
            self._reopen(False)
            self.page.goto(LIST_URL, wait_until="domcontentloaded", timeout=60000)
        print("\n>>> Açılan tarayıcı penceresinden FusionSolar'a giriş yapın (10 dk bekleniyor) <<<\n")
        end = time.time() + 600
        while time.time() < end:
            time.sleep(5)
            if "pvmswebsite" in self.page.url and self.logged_in():
                log.info("Giriş OK (elle)")
                return
        raise NoAuth("Giriş yapılamadı")

    def _auto_login(self) -> bool:
        if not (USER and PASS):
            log.warning("Otomatik giriş yok: .env içinde FUSIONSOLAR_USER / FUSIONSOLAR_PASS boş")
            return False
        p = self.page
        try:
            p.wait_for_selector("input[type=password]", timeout=25000)
            u = None
            for sec in ("input#username", "input[name=username]", "#username input",
                        "input[type=text]:visible", "input:not([type=password]):not([type=hidden]):not([type=checkbox]):visible"):
                u = p.query_selector(sec)
                if u:
                    break
            if not u:
                raise RuntimeError("kullanıcı adı alanı bulunamadı")
            u.click()
            u.fill(USER)
            pw = p.query_selector("input[type=password]:visible") or p.query_selector("input[type=password]")
            pw.click()
            pw.fill(PASS)
            btn = (p.query_selector("#submitDataverify") or p.query_selector("#btn_outerverify")
                   or p.query_selector("button:has-text('Giriş')") or p.query_selector("button:has-text('Log In')")
                   or p.query_selector("div.loginBtn"))
            if btn:
                btn.click()
            else:
                p.keyboard.press("Enter")
            end = time.time() + 60
            while time.time() < end:
                time.sleep(3)
                if "pvmswebsite" in p.url or "uniportal" in p.url:
                    if "pvmswebsite" not in p.url:
                        p.goto(LIST_URL, wait_until="domcontentloaded", timeout=60000)
                        time.sleep(4)
                    if self.logged_in():
                        log.info("Giriş OK (otomatik)")
                        return True
            log.warning("Otomatik giriş 60 sn içinde tamamlanmadı (adres: %s)", p.url)
        except Exception as e:
            log.warning("Otomatik giriş olmadı: %s", e)
        try:  # tanı için: sayfadaki uyarı metni ve ekran görüntüsü
            p.screenshot(path=str(DATA / "giris_hata.png"))
            metin = p.evaluate("() => document.body ? document.body.innerText : ''") or ""
            (DATA / "giris_hata.txt").write_text(metin[:3000], encoding="utf-8")
            log.warning("Giriş sayfası metni: %s", " | ".join(x.strip() for x in metin.splitlines() if x.strip())[:400])
        except Exception:
            pass
        return False

    def call(self, method, url, body=None, _retry=True):
        r = self.page.evaluate(JS_CALL, [method, url, body])
        if r["s"] == -1 or r["s"] in (401, 403) or r["t"].lstrip().startswith("<"):
            if _retry:
                self.page.evaluate("() => { window.__fsTok = null; }")
                self.ensure()
                return self.call(method, url, body, False)
            raise NoAuth(url)
        if r["s"] != 200:
            raise RuntimeError(f"HTTP {r['s']} {url.split('?')[0]}: {r['t'][:200]}")
        return json.loads(r["t"])

    def close(self):
        try:
            self.ctx.close()
            self.pw.stop()
        except Exception:
            pass


# ------------------------------------------------------------------ DB
SCHEMA = """
CREATE TABLE IF NOT EXISTS stations(dn TEXT PRIMARY KEY, name TEXT, kisa TEXT, dc_kwp REAL,
  portal_kwp REAL, company_dn TEXT, grid_date TEXT, updated TEXT);
CREATE TABLE IF NOT EXISTS inverters(dn TEXT PRIMARY KEY, name TEXT, station_dn TEXT, sn TEXT,
  status TEXT, updated TEXT);
CREATE TABLE IF NOT EXISTS station_real(ts TEXT, dn TEXT, power_kw REAL, day_kwh REAL, month_kwh REAL,
  year_kwh REAL, total_kwh REAL, spec_kwh_kwp REAL, status TEXT, PRIMARY KEY(ts, dn));
CREATE TABLE IF NOT EXISTS inverter_real(ts TEXT, dn TEXT, station_dn TEXT, aktif_kw REAL,
  gunluk_kwh REAL, toplam_kwh REAL, sicaklik_c REAL, durum_kodu INTEGER, raw TEXT,
  PRIMARY KEY(ts, dn));
CREATE TABLE IF NOT EXISTS station_5min(dn TEXT, t TEXT, power_kw REAL, PRIMARY KEY(dn, t));
CREATE TABLE IF NOT EXISTS station_hour(dn TEXT, hour TEXT, kwh REAL, PRIMARY KEY(dn, hour));
CREATE TABLE IF NOT EXISTS inverter_gun(dn TEXT, date TEXT, kwh REAL, PRIMARY KEY(dn, date));
CREATE TABLE IF NOT EXISTS station_day(dn TEXT, date TEXT, kwh REAL, spec_kwh_kwp REAL,
  PRIMARY KEY(dn, date));
CREATE TABLE IF NOT EXISTS alarms(csn TEXT PRIMARY KEY, station TEXT, device TEXT, name TEXT,
  severity TEXT, occur TEXT, cleared TEXT, active INTEGER, raw TEXT, last_seen TEXT);
"""


# ------------------------------------------------------------------ toplayıcı
class Collector:
    def __init__(self):
        self.web = Web()
        self.con = sqlite3.connect(DB_PATH)
        self.con.executescript(SCHEMA)
        self.st = {}      # dn -> {name, kisa, dc, company}
        self.inv = {}     # dn -> {name, station_dn}
        self.latest = {"tesisler": {}, "invertorler": {}, "alarmlar": []}
        self.sinyal_ornek = None
        self.pv_no = {}   # dn -> [PV no] (geçmişi tutulan string girişleri)
        self.gh_token = gh_token()
        self.gh_son = 0.0
        self.gh_gecmis_son = 0.0

    def now(self):
        return dt.datetime.now().isoformat(timespec="seconds")

    # --- tesis listesi (anlık KPI dahil)
    def _station_list(self):
        body = {"curPage": 1, "pageSize": 50, "gridConnectedTime": "", "queryTime": midnight_ms(dt.date.today()),
                "timeZone": 3, "sortId": "createTime", "sortDir": "DESC", "locale": "tr_TR"}
        return self.web.call("POST", "/rest/pvms/web/station/v1/station/station-list", body)["data"]["list"]

    def meta(self):
        self.web.ensure()
        ts = self.now()
        lst = self._station_list()
        for s in lst:
            dn = s["dn"]
            self.st[dn] = {"name": s.get("name"), "kisa": KISA.get(dn, s.get("name")),
                           "dc": DC_KWP.get(dn) or num(s.get("installedCapacity")), "company": s.get("parentDn")}
            self.con.execute("INSERT OR REPLACE INTO stations VALUES(?,?,?,?,?,?,?,?)",
                             (dn, s.get("name"), self.st[dn]["kisa"], self.st[dn]["dc"],
                              num(s.get("installedCapacity")), s.get("parentDn"), s.get("gridConnectedTime"), ts))
        self.inv = {}
        for comp in {v["company"] for v in self.st.values()}:
            page = 1
            while True:
                q = (f"conditionParams.parentDn={quote(comp)}&conditionParams.curPage={page}"
                     f"&conditionParams.recordperpage=50&conditionParams.mocTypes=20822&_={int(time.time()*1000)}")
                r = self.web.call("GET", "/rest/neteco/web/config/device/v1/device-list?" + q)
                for d in r.get("data", []):
                    if d.get("stationDn") not in self.st:
                        continue
                    self.inv[d["dn"]] = {"name": d.get("name"), "station_dn": d.get("stationDn")}
                    self.con.execute("INSERT OR REPLACE INTO inverters VALUES(?,?,?,?,?,?)",
                                     (d["dn"], d.get("name"), d.get("stationDn"),
                                      (d.get("paramValues") or {}).get("10002"), d.get("status"), ts))
                if page * 50 >= int(r.get("total", 0)):
                    break
                page += 1
        self.con.commit()
        log.info("Tesis: %s | invertör: %d", ", ".join(v["kisa"] for v in self.st.values()), len(self.inv))

    def stations(self):
        ts = self.now()
        for s in self._station_list():
            dn = s["dn"]
            if dn not in self.st:
                continue
            dc = self.st[dn]["dc"]
            day = num(s.get("dailyEnergy"))
            spec = round(day / dc, 3) if day is not None and dc else None
            row = (ts, dn, num(s.get("currentPower")), day, num(s.get("monthEnergy")), num(s.get("yearEnergy")),
                   num(s.get("cumulativeEnergy")), spec, s.get("plantStatus"))
            self.con.execute("INSERT OR REPLACE INTO station_real VALUES(?,?,?,?,?,?,?,?,?)", row)
            self.latest["tesisler"][dn] = {
                "ad": self.st[dn]["name"], "kisa": self.st[dn]["kisa"], "dc_kwp": dc,
                "anlik_guc_kw": row[2], "bugun_kwh": day, "ay_kwh": row[4], "yil_kwh": row[5],
                "toplam_kwh": row[6], "bugun_kwh_kwp": spec, "durum": row[8], "ts": ts}
        self.con.commit()
        log.info("Tesis KPI: %s", {v["kisa"]: (v["anlik_guc_kw"], v["bugun_kwh"])
                                   for v in self.latest["tesisler"].values()})

    def inverters(self):
        ts = self.now()
        for dn, meta in self.inv.items():
            try:
                r = self.web.call("GET", f"/rest/pvms/web/device/v1/device-realtime-data?deviceDn={quote(dn)}"
                                         f"&_={int(time.time()*1000)}")
            except RuntimeError as e:
                log.warning("%s: %s", meta["name"], e)
                continue
            vals, pv, ornek = {}, {}, []
            for g in r.get("data", []):
                for sg in g.get("signals", []) or []:
                    sid = str(sg.get("id"))
                    k = INV_SIG.get(sid)
                    if k:
                        vals[k] = sg.get("realValue")
                    n, tur = pv_sinyal(sid, sg.get("name"))
                    if n:
                        pv.setdefault(n, [None, None])[tur] = num(sg.get("realValue"))
                    if not self.sinyal_ornek:
                        ornek.append([sid, str(sg.get("name") or "")[:40], str(sg.get("unit") or "")[:8]])
            if ornek:
                self.sinyal_ornek = {"inverter": meta["name"], "sinyaller": ornek}   # tanı: ad/kimlik listesi (değer yok)
                self.latest["sinyal_ornek"] = self.sinyal_ornek
            dk = num(vals.get("durum_kodu"))
            self.con.execute("INSERT OR REPLACE INTO inverter_real VALUES(?,?,?,?,?,?,?,?,?)",
                             (ts, dn, meta["station_dn"], num(vals.get("aktif_kw")), num(vals.get("gunluk_kwh")),
                              num(vals.get("toplam_kwh")), num(vals.get("sicaklik_c")),
                              int(dk) if dk is not None else None, json.dumps(vals, ensure_ascii=False)))
            self.latest["invertorler"][dn] = {
                "ad": meta["name"], "tesis": self.st[meta["station_dn"]]["kisa"],
                "guc_kw": num(vals.get("aktif_kw")), "gunluk_kwh": num(vals.get("gunluk_kwh")),
                "sicaklik_c": num(vals.get("sicaklik_c")),
                "durum": INV_STATE.get(int(dk) if dk is not None else -1, vals.get("durum_kodu")), "ts": ts,
                # şebeke tarafı (faz akımı A, hat gerilimi V) ve PV girişleri [no, V, A]
                **{k: num(vals.get(k)) for k in ("ia", "ib", "ic", "uab", "ubc", "uca", "guc_faktoru", "frekans_hz",
                                                  "nominal_kw", "reaktif_kvar", "yalitim_mohm")},
                "pv": [[n, v[0], v[1]] for n, v in sorted(pv.items()) if v[0] is not None or v[1] is not None]
                      or (self.latest["invertorler"].get(dn) or {}).get("pv") or [],
                "pv_ts": (self.latest["invertorler"].get(dn) or {}).get("pv_ts")}
            time.sleep(0.3)
        self.con.commit()
        log.info("İnvertör: %d okundu", len(self.inv))

    def _balance(self, dn, dim, d: dt.date):
        q = (f"stationDn={quote(dn)}&timeDim={dim}&queryTime={midnight_ms(d)}&timeZone=3"
             f"&timeZoneStr=Europe%2FIstanbul&dateStr={quote(d.strftime('%Y-%m-%d') + ' 00:00:00')}"
             f"&_={int(time.time()*1000)}")
        return self.web.call("GET", "/rest/pvms/web/station/v1/overview/energy-balance?" + q).get("data", {})

    def curve(self, d: dt.date | None = None):
        d = d or dt.date.today()
        for dn in self.st:
            b = self._balance(dn, 2, d)
            xs, ps = b.get("xAxis", []), b.get("productPower", [])
            hours = {}
            for t, p in zip(xs, ps):
                v = num(p) if p != "--" else None
                if v is None:
                    continue
                self.con.execute("INSERT OR REPLACE INTO station_5min VALUES(?,?,?)", (dn, t, v))
                hours.setdefault(t[:13], []).append(v)
            for h, vs in hours.items():  # 12 x 5dk ortalama kW = kWh
                self.con.execute("INSERT OR REPLACE INTO station_hour VALUES(?,?,?)",
                                 (dn, h + ":00", round(sum(vs) / 12, 3)))
        self.con.commit()
        log.info("Gün eğrisi %s: OK", d)

    def month(self, d: dt.date | None = None):
        d = (d or dt.date.today()).replace(day=1)
        for dn in self.st:
            b = self._balance(dn, 4, d)
            dc = self.st[dn]["dc"]
            for x, p in zip(b.get("xAxis", []), b.get("productPower", [])):
                v = num(p) if p != "--" else None
                if v is None:
                    continue
                day = f"{d.year}-{d.month:02d}-{int(x):02d}"
                self.con.execute("INSERT OR REPLACE INTO station_day VALUES(?,?,?,?)",
                                 (dn, day, v, round(v / dc, 3) if dc else None))
        self.con.commit()
        log.info("Aylık %s-%02d: OK", d.year, d.month)

    def alarms(self):
        seen = self.now()
        active = []
        self.con.execute("UPDATE alarms SET active=0")
        for typ, size in (("CURRENT", 100), ("HISTORY", 50)):
            r = self.web.call("POST", "/rest/pvms/fm/v1/query",
                              {"dataType": typ, "domainType": "OC_SOLAR", "pageNo": 1, "pageSize": size})
            for a in (r.get("data") or {}).get("hits", []) or []:
                csn = str(a.get("csn") or f"{a.get('alarmId')}-{a.get('occurUtc')}")
                rec = (csn, a.get("meName"), a.get("devNameStr") or a.get("nativeMoName"), a.get("alarmName"),
                       SEV.get(a.get("severity"), a.get("severity")), a.get("occurTimeStr"),
                       a.get("clearTimeStr"), 1 if typ == "CURRENT" else 0,
                       json.dumps(a, ensure_ascii=False), seen)
                self.con.execute("INSERT OR REPLACE INTO alarms VALUES(?,?,?,?,?,?,?,?,?,?)", rec)
                if typ == "CURRENT":
                    active.append({"tesis": rec[1], "cihaz": rec[2], "alarm": rec[3], "seviye": rec[4],
                                   "zaman": rec[5]})
        self.con.commit()
        self.latest["alarmlar"] = active
        log.info("Aktif alarm: %d", len(active))

    def write_latest(self):
        self.latest["guncelleme"] = self.now()
        LATEST.write_text(json.dumps(self.latest, ensure_ascii=False, indent=2), encoding="utf-8")
        if self.gh_token and self.latest["tesisler"] and time.time() - self.gh_son >= GH_ARALIK:
            try:
                self.panel_yaz()
                self.gh_son = time.time()
            except Exception as e:
                log.warning("GitHub yazılamadı: %s", e)

    # --- GitHub (AEMonitoring paneli ve inverter geçmişi)
    def _gh(self, method, path, govde=None):
        h = {"Authorization": "Bearer " + self.gh_token, "Accept": "application/vnd.github+json",
             "User-Agent": "aemonitoring-fusionsolar"}
        req = urllib.request.Request(GH_KOK + path, method=method, headers=h,
                                     data=json.dumps(govde).encode() if govde else None)
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.loads(r.read().decode())
        except urllib.error.HTTPError as e:
            if method == "GET" and e.code == 404:
                return {}
            raise

    def gh_put(self, path, veri, mesaj, sadece_degisirse=False):
        icerik = json.dumps(veri, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
        for deneme in range(3):
            mevcut = self._gh("GET", path)
            if sadece_degisirse and mevcut.get("content"):
                eski = json.loads(base64.b64decode(mevcut["content"]).decode())
                eski.pop("guncellendi", None)
                yeni = dict(veri)
                yeni.pop("guncellendi", None)
                if json.dumps(eski, sort_keys=True) == json.dumps(yeni, sort_keys=True):
                    return False
            govde = {"message": mesaj, "content": base64.b64encode(icerik.encode()).decode()}
            if mevcut.get("sha"):
                govde["sha"] = mevcut["sha"]
            try:
                self._gh("PUT", path, govde)
                return True
            except urllib.error.HTTPError as e:
                if e.code in (409, 422) and deneme < 2:
                    time.sleep(3)
                    continue
                raise

    def panel_yaz(self):
        kisa = {dn: v["kisa"] for dn, v in self.st.items()}
        bas = (dt.date.today() - dt.timedelta(days=35)).isoformat()
        gunluk, saatlik = {}, {}
        for dn, d, kwh in self.con.execute("SELECT dn, date, kwh FROM station_day WHERE date>=? ORDER BY date", (bas,)):
            gunluk.setdefault(kisa.get(dn, dn), {})[d] = kwh
        bugun = dt.date.today().isoformat()
        for dn, h, kwh in self.con.execute("SELECT dn, hour, kwh FROM station_hour WHERE hour LIKE ? ORDER BY hour",
                                           (bugun + "%",)):
            saatlik.setdefault(kisa.get(dn, dn), {})[h[11:13]] = kwh
        veri = dict(self.latest, gunluk=gunluk, saatlik_bugun=saatlik)
        self.gh_put(GH_PANEL, veri, f"FusionSolar {dt.datetime.now():%Y-%m-%d %H:%M}")
        log.info("GitHub: panel verisi yazıldı")
        if time.time() - self.gh_gecmis_son >= 3600:
            self.gecmis_yaz()
            self.gh_gecmis_son = time.time()

    def gecmis_yaz(self, yillar=None):
        """inverter/fusionsolar_<yıl>.json: tesis günlük üretimi + inverter günlük üretimi (panel analiz sayfası)."""
        dun = dt.date.today() - dt.timedelta(days=1)
        yillar = yillar or sorted({dt.date.today().year, dun.year})
        tesis = {dn: (r[0], r[1]) for dn, *r in self.con.execute("SELECT dn, kisa, dc_kwp FROM stations")}
        invad = {dn: (ad, st) for dn, ad, st in self.con.execute("SELECT dn, name, station_dn FROM inverters")}
        bugun = dt.date.today().isoformat()
        for yil in yillar:
            veri = {"kaynak": "fusionsolar", "yil": yil, "santraller": {}}
            for dn, (ad, kwp) in tesis.items():
                veri["santraller"][dn] = {"ad": ad, "kwp": kwp, "gun": {}, "ay": {}, "inv": {}}
            for dn, d, kwh in self.con.execute("SELECT dn, date, kwh FROM station_day WHERE substr(date,1,4)=? AND date<?",
                                               (str(yil), bugun)):
                if dn in veri["santraller"] and kwh is not None:
                    veri["santraller"][dn]["gun"][d] = round(kwh, 1)
            for dn, h, kwh in self.con.execute("SELECT dn, hour, kwh FROM station_hour WHERE substr(hour,1,4)=? AND substr(hour,1,10)<?",
                                               (str(yil), bugun)):
                if dn in veri["santraller"] and kwh is not None:
                    veri["santraller"][dn].setdefault("saat", {}).setdefault(h[:10], {})[h[11:13]] = round(kwh, 1)
            for dn, st, d, kwh in self.con.execute(
                    "SELECT dn, station_dn, substr(ts,1,10) d, MAX(gunluk_kwh) FROM inverter_real "
                    "WHERE substr(ts,1,4)=? AND substr(ts,1,10)<? GROUP BY dn, d", (str(yil), bugun)):
                if st in veri["santraller"] and kwh is not None:
                    inv = veri["santraller"][st]["inv"].setdefault(dn, {"ad": invad.get(dn, (dn,))[0], "gun": {}, "ay": {}})
                    inv["gun"][d] = round(kwh, 1)
            # FusionSolar inverter geçmişinden (device-history-data, 30016 Günün verimi) gelen günler önceliklidir
            for dn, d, kwh in self.con.execute("SELECT dn, date, kwh FROM inverter_gun WHERE substr(date,1,4)=? AND date<?",
                                               (str(yil), bugun)):
                st = invad.get(dn, (None, None))[1]
                if st in veri["santraller"] and kwh is not None:
                    inv = veri["santraller"][st]["inv"].setdefault(dn, {"ad": invad.get(dn, (dn,))[0], "gun": {}, "ay": {}})
                    inv["gun"][d] = round(kwh, 1)
            for sv in veri["santraller"].values():
                for inv in sv["inv"].values():
                    ay = {}
                    for d, k in inv["gun"].items():
                        ay[d[:7]] = round(ay.get(d[:7], 0) + k, 1)
                    inv["ay"] = ay
            if not any(s["gun"] for s in veri["santraller"].values()):
                continue
            # GitHub'daki mevcut dosyayla birleştir: başka bilgisayarda toplanmış geçmiş kaybolmasın
            try:
                mevcut = self._gh("GET", f"inverter/fusionsolar_{yil}.json")
                eski = json.loads(base64.b64decode(mevcut["content"]).decode()) if mevcut.get("content") else {}
            except Exception as e:
                log.warning("GitHub mevcut dosya okunamadı (%s), birleştirme atlandı", e)
                eski = {}
            for dn, es in (eski.get("santraller") or {}).items():
                ys = veri["santraller"].setdefault(dn, {"ad": es.get("ad"), "kwp": es.get("kwp"), "gun": {}, "ay": {}, "inv": {}})
                for alan in ("gun", "ay"):
                    ys[alan] = {**(es.get(alan) or {}), **ys.get(alan, {})}
                if es.get("saat") or ys.get("saat"):
                    saat = {g: dict(v) for g, v in (es.get("saat") or {}).items()}
                    for g, v in (ys.get("saat") or {}).items():
                        saat.setdefault(g, {}).update(v)
                    ys["saat"] = saat
                for idn, ei in (es.get("inv") or {}).items():
                    yi = ys["inv"].setdefault(idn, {"ad": ei.get("ad"), "gun": {}, "ay": {}})
                    for alan in ("gun", "ay"):
                        yi[alan] = {**(ei.get(alan) or {}), **yi.get(alan, {})}
            veri["guncellendi"] = dt.datetime.now().astimezone().isoformat(timespec="seconds")
            if self.gh_put(f"inverter/fusionsolar_{yil}.json", veri, f"İnverter geçmişi: fusionsolar_{yil}.json",
                           sadece_degisirse=True):
                log.info("GitHub: fusionsolar_%s.json yazıldı", yil)

    def gecmis(self):
        """Tesislerin şebekeye bağlandığı aydan bugüne tüm aylık (günlük çözünürlüklü) üretimi çeker."""
        self.meta()
        bas = dt.date.today().replace(day=1)
        for (gd,) in self.con.execute("SELECT grid_date FROM stations"):
            g = str(gd or "")
            try:
                d = (dt.datetime.fromtimestamp(int(g) / 1000).date() if g.isdigit()
                     else dt.date.fromisoformat(g[:10]))
                bas = min(bas, d.replace(day=1))
            except ValueError:
                pass
        if bas == dt.date.today().replace(day=1):
            bas = dt.date(2021, 1, 1)
        log.info("Geçmiş: %s ayından bugüne", bas.strftime("%Y-%m"))
        d, yillar = bas, set()
        while d <= dt.date.today():
            self._safe(self.month, d)
            yillar.add(d.year)
            d = (d + dt.timedelta(days=32)).replace(day=1)
            time.sleep(1)
        if self.gh_token:
            self.gecmis_yaz(sorted(yillar))

    # --- akışlar
    def _safe(self, f, *a):
        try:
            f(*a)
            return True
        except NoAuth as e:
            log.error("Oturum hatası: %s", e)
        except Exception as e:
            log.error("%s: %s", f.__name__, e)
        return False

    def inv_gun(self, d: dt.date):
        """Bir günün inverter bazında üretimi: 30016 "Günün verimi" (kWh) sinyalinin o günkü en büyük değeri.
        Not: device-history-data, verilen tarihten BİR ÖNCEKİ günü döndürüyor; bu yüzden d+1 istenir ve noktalar
        kendi zaman damgalarına göre güne ayrılır."""
        n = 0
        for dn in self.inv:
            r = self.web.call("GET", f"/rest/pvms/web/device/v1/device-history-data?signalIds=30016&deviceDn={quote(dn)}"
                                     f"&date={midnight_ms(d + dt.timedelta(days=1))}&_={int(time.time()*1000)}")
            gunluk = {}
            for p in ((r.get("data") or {}).get("30016") or {}).get("pmDataList") or []:
                v = num(p.get("counterValue"))
                if v is None or not (0 <= v < 1e9) or p.get("startTime") is None:
                    continue
                yerel = dt.datetime.fromtimestamp(int(p["startTime"]) + int(p.get("timeZoneOffset") or 180) * 60, dt.timezone.utc).date()
                gunluk[yerel] = max(gunluk.get(yerel, 0), v)
            if d in gunluk:
                self.con.execute("INSERT OR REPLACE INTO inverter_gun VALUES(?,?,?)", (dn, d.isoformat(), round(gunluk[d], 2)))
                n += 1
            time.sleep(0.4)
        self.con.commit()
        return n

    def invgun(self):
        """Sürekli modda: dün ve önceki gün (Pi kapalı kalmış olsa bile tam değer)."""
        bugun = dt.date.today()
        for i in (1, 2):
            self.inv_gun(bugun - dt.timedelta(days=i))
        log.info("İnverter günlük geçmişi: dün ve önceki gün OK")

    def inv_gecmis(self, gun=None):
        """Yıl başından (ya da GUN gün geriden) bugüne inverter günlük geçmişi; olan günleri atlar, 5 boş günde durur."""
        self.meta()
        bugun = dt.date.today()
        bas = bugun - dt.timedelta(days=gun) if gun else dt.date(bugun.year, 1, 1)
        olan = {(dn, d) for dn, d in self.con.execute("SELECT dn, date FROM inverter_gun")}
        d, bos, yillar = bugun - dt.timedelta(days=1), 0, set()
        while d >= bas:
            if all((dn, d.isoformat()) in olan for dn in self.inv):
                n = len(self.inv)
            else:
                try:
                    n = self.inv_gun(d)
                except RuntimeError as e:
                    log.warning("%s: %s", d, e)
                    n = 0
            log.info("İnverter geçmişi %s: %d/%d inverter", d, n, len(self.inv))
            if n:
                bos, yillar = 0, yillar | {d.year}
            else:
                bos += 1
                if bos >= 5:
                    log.info("5 gün üst üste veri yok: geçmiş burada bitiyor")
                    break
            if d.day == 1 and self.gh_token:
                self.gecmis_yaz(sorted(yillar))  # ay ay ilerleme panele düşsün
            d -= dt.timedelta(days=1)
        if self.gh_token and yillar:
            self.gecmis_yaz(sorted(yillar))

    def _gecmis_sinyal(self, dn, ids, d):
        """d günü için birden fazla sinyalin 5 dk geçmişi: {id: [(yerel_datetime, değer)]} (uç nokta bir önceki günü döndürdüğü için d+1 istenir)."""
        sonuc = {}
        def al(liste):
            r = self.web.call("GET", f"/rest/pvms/web/device/v1/device-history-data?signalIds={','.join(map(str, liste))}"
                                     f"&deviceDn={quote(dn)}&date={midnight_ms(d + dt.timedelta(days=1))}&_={int(time.time()*1000)}")
            for k, v in (r.get("data") or {}).items():
                noktalar = []
                for p in (v or {}).get("pmDataList") or []:
                    x = num(p.get("counterValue"))
                    if x is None or abs(x) >= 1e9 or p.get("startTime") is None:
                        continue
                    t = dt.datetime.fromtimestamp(int(p["startTime"]) + int(p.get("timeZoneOffset") or 180) * 60, dt.timezone.utc).replace(tzinfo=None)
                    if t.date() == d:
                        noktalar.append((t, x))
                sonuc[str(k)] = noktalar
        try:
            al(ids)
        except RuntimeError:
            sonuc = {}
        eksik = [i for i in ids if str(i) not in sonuc]
        for i in eksik:  # çoklu istek desteklenmiyorsa tek tek
            try:
                al([i])
            except RuntimeError as e:
                log.warning("%s sinyal %s: %s", dn, i, e)
            time.sleep(0.2)
        return sonuc

    def pv_anlik(self):
        """String (PV girişi) anlık gerilim/akım: gerçek zamanlı uç nokta PV sinyali vermediği için 5 dk geçmişin son noktası (31001/31002 + 3·(n−1))."""
        bugun = dt.date.today()
        for dn, meta in self.inv.items():
            if dn not in self.pv_no:
                r = self.web.call("GET", f"/rest/pvms/web/device/v1/device-statistics-signal?deviceDn={quote(dn)}&_={int(time.time()*1000)}")
                sig = {int(x["id"]) for x in ((r.get("data") or {}).get("signalList") or [])}
                self.pv_no[dn] = sorted(n for n in range(1, 41) if 31002 + 3 * (n - 1) in sig)
            nler = self.pv_no[dn]
            if not nler:
                continue
            ids = [31001 + 3 * (n - 1) for n in nler] + [31002 + 3 * (n - 1) for n in nler]
            h = self._gecmis_sinyal(dn, ids, bugun)
            pv, son = [], None
            for n in nler:
                v = h.get(str(31001 + 3 * (n - 1))) or []
                a = h.get(str(31002 + 3 * (n - 1))) or []
                if not v and not a:
                    continue
                t = max([x[0] for x in (v[-1:] + a[-1:])])
                son = t if son is None or t > son else son
                pv.append([n, v[-1][1] if v else None, a[-1][1] if a else None])
            iv = self.latest["invertorler"].get(dn)
            if iv is not None and pv:
                iv["pv"], iv["pv_ts"] = pv, son.isoformat(timespec="minutes") if son else None
            time.sleep(0.3)
        log.info("PV anlık: %d inverter", len(self.inv))

    def string_analiz(self, gun=7):
        """Her inverterin PV girişleri (string) için akım/gerilim analizi; son GUN tam günü; sonuç inverter/fusionsolar_string.json."""
        self.meta()
        bugun = dt.date.today()
        gunler = [bugun - dt.timedelta(days=i) for i in range(gun, 0, -1)]
        sonuc = {"guncellendi": dt.datetime.now().astimezone().isoformat(timespec="seconds"), "gunler": [g.isoformat() for g in gunler], "inverterler": {}}
        for dn, meta in self.inv.items():
            r = self.web.call("GET", f"/rest/pvms/web/device/v1/device-statistics-signal?deviceDn={quote(dn)}&_={int(time.time()*1000)}")
            sig = {int(x["id"]): x.get("name", "") for x in ((r.get("data") or {}).get("signalList") or [])}
            pv = sorted(n for n in range(1, 41) if 31002 + 3 * (n - 1) in sig)
            ids = [31002 + 3 * (n - 1) for n in pv] + sorted({31001 + 3 * (n - 1) for n in pv}) + [30014]
            st = {n: {"pv": n, "ah": [], "tepe_a": 0.0, "tepe_v": 0.0} for n in pv}
            kwh = []
            for d in gunler:
                h = self._gecmis_sinyal(dn, ids, d)
                for n in pv:
                    a = [x for _, x in h.get(str(31002 + 3 * (n - 1)), [])]
                    v = [x for _, x in h.get(str(31001 + 3 * (n - 1)), [])]
                    st[n]["ah"].append(round(sum(max(0.0, x) for x in a) * 5 / 60, 1) if a else None)
                    st[n]["tepe_a"] = max(st[n]["tepe_a"], max(a) if a else 0)
                    st[n]["tepe_v"] = max(st[n]["tepe_v"], max(v) if v else 0)
                kwh.append(round(sum(max(0.0, x) for _, x in h.get("30014", [])) * 5 / 60, 1) if h.get("30014") else None)
                time.sleep(0.3)
            sonuc["inverterler"][dn] = {"ad": meta["name"], "santral": self.st.get(meta["station_dn"], {}).get("kisa", meta["station_dn"]),
                                        "ac_kwh": kwh, "stringler": list(st.values())}
            log.info("String analizi: %s (%d giriş)", meta["name"], len(pv))
        # değerlendirme: santral bazında aktif stringlerin günlük Ah medyanına oran
        for kisa in {v["santral"] for v in sonuc["inverterler"].values()}:
            invs = [v for v in sonuc["inverterler"].values() if v["santral"] == kisa]
            for i in range(len(gunler)):
                vals = sorted(x["ah"][i] for v in invs for x in v["stringler"] if x["ah"][i] and x["tepe_a"] >= 1)
                med = vals[len(vals) // 2] if vals else 0
                for v in invs:
                    for x in v["stringler"]:
                        x.setdefault("oran", []).append(round(x["ah"][i] / med, 3) if med and x["ah"][i] is not None else None)
            for v in invs:
                for x in v["stringler"]:
                    o = sorted(y for y in x["oran"] if y is not None)
                    x["oran_medyan"] = o[len(o) // 2] if o else None
                    x["durum"] = ("bos" if x["tepe_a"] < 1 else "dusuk" if (x["oran_medyan"] or 0) < 0.85
                                  else "zayif" if (x["oran_medyan"] or 0) < 0.93 else "normal")
        ozet = {}
        for v in sonuc["inverterler"].values():
            for x in v["stringler"]:
                ozet[x["durum"]] = ozet.get(x["durum"], 0) + 1
        sonuc["ozet"] = ozet
        print("== String analizi", gunler[0], "–", gunler[-1], ozet)
        for v in sorted(sonuc["inverterler"].values(), key=lambda z: (z["santral"], z["ad"])):
            kotu = [f"PV{x['pv']}:{x['durum']}({x['oran_medyan']})" for x in v["stringler"] if x["durum"] != "normal"]
            print(f"{v['santral']:7} {v['ad']:14} {len(v['stringler']):2} giriş | " + (", ".join(kotu) or "hepsi normal"))
        (DATA / "string_analiz.json").write_text(json.dumps(sonuc, ensure_ascii=False), encoding="utf-8")
        if self.gh_token:
            self.gh_put("inverter/fusionsolar_string.json", sonuc, "String analizi FusionSolar")

    def kesif_inv(self):
        """Tanı: inverterin geçmişi tutulan sinyallerini listeler ve dün için hangisinde veri olduğunu gösterir."""
        self.meta()
        dn = next(iter(self.inv))
        d = dt.date.today() - dt.timedelta(days=1)
        t = int(time.time() * 1000)
        r = self.web.call("GET", f"/rest/pvms/web/device/v1/device-statistics-signal?deviceDn={quote(dn)}&_={t}")
        sig = (r.get("data") or {}).get("signalList") or []
        print(f"== {self.inv[dn]['name']} ({dn}), {d}: {len(sig)} sinyal, varsayılan {(r.get('data') or {}).get('defaultList')}")
        for x in sig:
            q = self.web.call("GET", f"/rest/pvms/web/device/v1/device-history-data?signalIds={x['id']}&deviceDn={quote(dn)}"
                                     f"&date={midnight_ms(d)}&_={int(time.time()*1000)}")
            liste = ((q.get("data") or {}).get(str(x["id"])) or {}).get("pmDataList") or []
            v = [num(p.get("counterValue")) for p in liste]
            v = [z for z in v if z is not None and abs(z) < 1e9]
            birim = (x.get("unit") or {}).get("unit", "") if isinstance(x.get("unit"), dict) else x.get("unit", "")
            print(f"{x['id']:>6} | {x.get('name','')[:40]:40} | {birim:6} | {x.get('period','')[:16]:16} | {len(v):3} nokta | en büyük {max(v) if v else '-'} | toplam {round(sum(v), 1) if v else '-'}")
            time.sleep(0.3)

    def once(self):
        self.meta()
        for f in (self.stations, self.inverters, self.pv_anlik, self.alarms, self.curve, self.month):
            self._safe(f)
        self.write_latest()

    def backfill(self, days):
        self.meta()
        today = dt.date.today()
        months = set()
        for i in range(days):
            d = today - dt.timedelta(days=i)
            months.add(d.replace(day=1))
            self._safe(self.curve, d)
            time.sleep(1)
        for m in sorted(months):
            self._safe(self.month, m)
        if self.gh_token:
            self.gecmis_yaz(sorted({m.year for m in months}))

    def forever(self):
        jobs = [("meta", self.meta), ("station", self.stations), ("inverter", self.inverters),
                ("alarm", self.alarms), ("curve", self.curve), ("month", self.month), ("invgun", self.invgun), ("pvanlik", self.pv_anlik)]
        nxt = {k: 0.0 for k, _ in jobs}
        kod = Path(__file__).resolve()
        kod_mt = kod.stat().st_mtime
        while True:
            t = time.time()
            try:
                if kod.stat().st_mtime != kod_mt:          # git pull yeni sürüm getirdi: çık, cron yeni kodla başlatır
                    log.info("Kod değişti; yeniden başlamak için çıkılıyor")
                    return
            except OSError:
                pass
            ran = False
            for k, f in jobs:
                if t >= nxt[k]:
                    ok = self._safe(f)
                    nxt[k] = t + (PERIOD[k] if ok else min(PERIOD[k], 300))
                    ran = True
            if ran:
                self.write_latest()
            time.sleep(max(5, min(nxt.values()) - time.time()))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--test", action="store_true")
    ap.add_argument("--once", action="store_true")
    ap.add_argument("--backfill", type=int, metavar="GUN")
    ap.add_argument("--gecmis", action="store_true", help="şebeke bağlantısından bugüne günlük üretim + GitHub")
    ap.add_argument("--inv-gecmis", type=int, nargs="?", const=0, metavar="GUN", help="inverter günlük geçmişi (varsayılan yıl başından) + GitHub")
    ap.add_argument("--string-analiz", type=int, nargs="?", const=7, metavar="GUN", help="PV girişi (string) akım/gerilim analizi, son GUN gün")
    ap.add_argument("--kesif-inv", action="store_true", help="tanı: inverter geçmiş uç noktalarını dener")
    a = ap.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s",
                        handlers=[logging.StreamHandler(sys.stdout),
                                  logging.FileHandler(DATA / "toplayici.log", encoding="utf-8")])
    log.info("Ayar dosyası: %s", ENV_FILE or "yok (giriş elle yapılacak)")
    log.info("Panel (GitHub): %s", "açık" if gh_token() else "KAPALI — .env dosyasına GITHUB_TOKEN= satırı ekleyin")
    c = Collector()
    try:
        if a.test:
            c.meta()
            c.stations()
            c.write_latest()
        elif a.once:
            c.once()
        elif a.backfill:
            c.backfill(a.backfill)
        elif a.gecmis:
            c.gecmis()
        elif a.inv_gecmis is not None:
            c.inv_gecmis(a.inv_gecmis or None)
        elif a.string_analiz:
            c.string_analiz(a.string_analiz)
        elif a.kesif_inv:
            c.kesif_inv()
        else:
            log.info("Sürekli mod — Ctrl+C ile durur")
            c.forever()
    except KeyboardInterrupt:
        pass
    finally:
        c.web.close()


if __name__ == "__main__":
    main()
