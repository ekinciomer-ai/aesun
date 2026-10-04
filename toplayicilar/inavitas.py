"""
aesun — Inavitas SOLAR (insos.inavitas.io) bağlayıcısı
Sadece AKSARAY firması (companyId 49) → AKS_Sapmaz sahası (87) → Aksaray_GES santrali (189).

Ortam değişkenleri:
  INAVITAS_USER, INAVITAS_PASS   (zorunlu)
  INAVITAS_BASE   (vars. https://insos.inavitas.io)
  INAVITAS_COMPANY (vars. AKSARAY)  — ağaçta yalnız bu firma alınır

Kullanım:
  python inavitas.py                 # bugünün özeti (JSON)
  python inavitas.py 2026-10-03      # belirli gün
  Flask:  from inavitas import bp; app.register_blueprint(bp)  ->  /api/inavitas?date=YYYY-MM-DD
"""
import json, os, re, sys, time
from datetime import date as _date

import requests
from bs4 import BeautifulSoup
from pathlib import Path


def _env_yukle():
    """Repo kokundeki .env / env.txt dosyasini ortam degiskenlerine yukler (mevcutlari ezmez)."""
    kok = Path(__file__).resolve().parent.parent
    for yol in [d / ad for d in (Path.cwd(), kok) for ad in (".env", "env.txt", ".env.txt")]:
        if yol.is_file():
            for satir in yol.read_text(encoding="utf-8").splitlines():
                satir = satir.strip()
                if satir and not satir.startswith("#") and "=" in satir:
                    k, v = satir.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
            return


_env_yukle()

BASE = os.getenv("INAVITAS_BASE", "https://insos.inavitas.io")
COMPANY = os.getenv("INAVITAS_COMPANY", "AKSARAY")
UA = "Mozilla/5.0 (aesun-inavitas)"


def _num(s):
    """'1.469,94' -> 1469.94 ; '' -> None"""
    if s is None:
        return None
    s = str(s).strip().replace(".", "").replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return None


def _flat(html):
    soup = BeautifulSoup(html, "html.parser")
    for t in soup(["script", "style"]):
        t.decompose()
    return re.sub(r"\s+", " ", soup.get_text(" ")).strip()


class Inavitas:
    def __init__(self, user=None, password=None):
        self.user = user or os.environ["INAVITAS_USER"]
        self.password = password or os.environ["INAVITAS_PASS"]
        self.s = requests.Session()
        self.s.headers["User-Agent"] = UA
        self._logged = False
        self._tree = None

    # ---------- oturum ----------
    def login(self):
        r = self.s.get(f"{BASE}/Login", timeout=30)
        tok = BeautifulSoup(r.text, "html.parser").find("input", {"name": "__RequestVerificationToken"})
        data = {
            "__RequestVerificationToken": tok["value"] if tok else "",
            "UserName": self.user,
            "Password": self.password,
            "RememberMe": "false",
        }
        # Form action "/" (kok) — /Login'e post edilirse giris yapilmaz
        r = self.s.post(f"{BASE}/", data=data, timeout=30, allow_redirects=True,
                        headers={"Referer": f"{BASE}/Login", "Origin": BASE})
        if 'name="Password"' in r.text:
            raise RuntimeError("Inavitas giriş başarısız (kullanıcı/şifre)")
        self._logged = True

    def _get(self, path, **params):
        if not self._logged:
            self.login()
        for attempt in (1, 2):
            r = self.s.get(f"{BASE}{path}", params=params, timeout=30,
                           headers={"X-Requested-With": "XMLHttpRequest"})
            if r.status_code == 200 and 'name="Password"' not in r.text:
                return r.text
            self.login()  # oturum düşmüş → yeniden
            time.sleep(1)
        r.raise_for_status()
        return r.text

    # ---------- hiyerarşi (yalnız AKSARAY) ----------
    def tree(self):
        if self._tree:
            return self._tree
        soup = BeautifulSoup(self._get("/Home/GetTreeData"), "html.parser")
        out = {"company": None, "sites": []}
        for li in soup.find_all("li", class_="1"):
            a = li.find("a")
            if not a or a.get_text(strip=True).upper() != COMPANY.upper():
                continue
            out["company"] = {"id": int(li["id"]), "name": a.get_text(strip=True)}
            for sli in li.find_all("li", class_="2"):
                site = {"id": int(sli["id"]), "name": sli.find("a").get_text(strip=True), "plants": []}
                for pli in sli.find_all("li", class_="3"):
                    plant = {"id": int(pli["id"]), "name": pli.find("a").get_text(strip=True), "inverters": []}
                    for ili in pli.find_all("li", class_="4"):
                        plant["inverters"].append({"id": int(ili["id"]), "name": ili.find("a").get_text(strip=True)})
                    site["plants"].append(plant)
                out["sites"].append(site)
        if not out["company"]:
            raise RuntimeError(f"Ağaçta '{COMPANY}' firması yok")
        self._tree = out
        return out

    def plants(self):
        return [p for s in self.tree()["sites"] for p in s["plants"]]

    # ---------- veriler ----------
    def plant_overview(self, plant_id, d, intervl="D"):
        t = _flat(self._get("/Plants/GetPlantOverview", plant=plant_id, intervl=intervl, date=d, plantType=1))
        g = lambda pat: (re.search(pat, t) or [None, None])[1]
        return {
            "aktif_guc_kw": _num(g(r"Aktif Güç \(kW\)\s*(-?[\d.,]+)")),
            "anma_gucu": g(r"Anma Gücü\s*([\d.,]+\s*\w+)"),
            "inverter_sayisi": _num(g(r"Inverter\s*(\d+)")),
            "son_haberlesme": g(r"Son Haberleşme\s*(.+?Önce)"),
            "uretim_mwh": _num(g(r"Üretim \(MWh\)\s*([\d.,]+)")),
            "pr_yuzde": _num(g(r"Performans Oran \(%\)\s*([\d.,]+)")),
            "gelir_usd": _num(g(r"Gelir \(USD\)\s*([\d.,]+)")),
            "kapi": g(r"Kapı Durumu\s*(\S+)"),
            "yangin": g(r"Yangın Durum\s*(\S+)"),
        }

    def plant_hourly(self, plant_id, d, intervl="D"):
        """Saatlik (D) / günlük (M) / aylık (Y) kWh serisi."""
        h = self._get("/Plants/GetPlantGraphic", plant=plant_id, intervl=intervl, date=d)
        cats = re.search(r"categories\s*:\s*(\[[^\]]*\])", h)
        ser = re.search(r"series\s*:\s*(\[\{.*?\}\])\s*\}\s*\)", h, re.S)
        labels = json.loads(cats.group(1)) if cats else []
        series = json.loads(ser.group(1)) if ser else []
        out = []
        for sr in series:
            out.append({"ad": sr.get("name"),
                        "veri": [{"t": l, "kwh": v} for l, v in zip(labels, sr.get("data", []))]})
        return out

    def inverters(self, plant_id, d, intervl="D"):
        soup = BeautifulSoup(self._get("/Plants/GetPlantInverterTable", plant=plant_id, intervl=intervl, date=d),
                             "html.parser")
        rows = []
        for tr in soup.select("tr"):
            c = [td.get_text(" ", strip=True) for td in tr.find_all("td")]
            if len(c) < 9:
                continue
            rows.append({
                "ad": c[0], "ac_kwe": _num(c[1]), "dc_kwp": _num(c[2]), "anlik_kw": _num(c[3]),
                "uretim_kwh": _num(c[4]), "kiyas_yuzde": _num(c[5]), "alarm": c[6] or None,
                "haberlesme": c[7], "son_haberlesme": c[8],
            })
        return rows

    def snapshot(self, d=None):
        d = d or _date.today().isoformat()
        tr = self.tree()
        res = {"kaynak": "inavitas", "tarih": d, "firma": tr["company"], "santraller": []}
        for p in self.plants():
            res["santraller"].append({
                "id": p["id"], "ad": p["name"],
                "ozet": self.plant_overview(p["id"], d),
                "saatlik": self.plant_hourly(p["id"], d),
                "inverterler": self.inverters(p["id"], d),
            })
        return res


# ---------- Flask (opsiyonel) ----------
try:
    from flask import Blueprint, jsonify, request

    bp = Blueprint("inavitas", __name__)
    _cli = None

    @bp.route("/api/inavitas")
    def api_inavitas():
        global _cli
        _cli = _cli or Inavitas()
        return jsonify(_cli.snapshot(request.args.get("date")))
except ImportError:
    bp = None


if __name__ == "__main__":
    print(json.dumps(Inavitas().snapshot(sys.argv[1] if len(sys.argv) > 1 else None),
                     ensure_ascii=False, indent=2))
