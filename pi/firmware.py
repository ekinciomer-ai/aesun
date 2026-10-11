"""AEMonitoring · Firmware hazırlığı (cihaz_detay.py içinden çağrılır).
Şimdilik YALNIZ OKUMA: bir cihazın web arayüzünden yükseltme sayfasının uç noktasını ve alan adlarını bulur,
firmware dosyasını indirip MD5'ini doğrular → n8n/firmware_kesif.json. Cihaza hiçbir şey yüklemez."""
import hashlib, json, re
from datetime import datetime
from pathlib import Path

from ortak import AESUN, TR, gh, log
import madenci as M

KESIF = "n8n/firmware_kesif.json"
FW = {"S21e Hyd": {"url": "https://raw.githubusercontent.com/ekinciomer-ai/aesun/firmware/S21eHyd_FR-1.42_251016.bmu",
                   "md5": "684efb616a07f67730a423c773a5881c", "ad": "S21eHyd_FR-1.42_251016.bmu"}}
FW_DIR = AESUN / "firmware"


def indir(m):
    f = FW[m]
    FW_DIR.mkdir(parents=True, exist_ok=True)
    yol = FW_DIR / f["ad"]
    if not yol.exists() or hashlib.md5(yol.read_bytes()).hexdigest() != f["md5"]:
        r = M.requests.get(f["url"], timeout=300)
        r.raise_for_status()
        yol.write_bytes(r.content)
    md5 = hashlib.md5(yol.read_bytes()).hexdigest()
    return str(yol), yol.stat().st_size, md5, md5 == f["md5"]


def arayuz_kesif(ip):
    """Web arayüzünü (salt GET) tarar: yükseltme ile ilgili satırlar ve uç noktalar."""
    a = M.filo_auth()
    out = {"sayfalar": {}, "upgrade_satir": [], "cgi": []}
    kuyruk, gorulen = ["/", "/index.html", "/upgrade.html"], set()
    while kuyruk and len(gorulen) < 25:
        p = kuyruk.pop(0)
        if p in gorulen:
            continue
        gorulen.add(p)
        try:
            r = M.requests.get(f"http://{ip}{p}", auth=a, timeout=15)
        except Exception as e:
            out["sayfalar"][p] = str(e)[:80]; continue
        t = r.text
        out["sayfalar"][p] = [r.status_code, len(t)]
        if r.status_code != 200:
            continue
        for s in re.findall(r'(?:src|href)=["\']([^"\']+\.(?:js|html))', t):
            s = s if s.startswith("/") else "/" + s.lstrip("./")
            if s not in gorulen and len(kuyruk) < 40:
                kuyruk.append(s)
        out["cgi"] += sorted(set(re.findall(r"cgi-bin/[A-Za-z0-9_]+\.cgi", t)))
        for m in re.finditer(r"upgrade|firmware|keep|restore|\.bmu", t, re.I):
            out["upgrade_satir"].append([p, t[max(0, m.start() - 160): m.end() + 160]])
            if len(out["upgrade_satir"]) > 60:
                break
    out["cgi"] = sorted(set(out["cgi"]))
    return out


def calis(sonuc, simdi):
    eski, sha = gh(KESIF)
    if eski and eski.get("gun") == simdi.strftime("%Y-%m-%d") and eski.get("md5_dogru"):
        return
    s21 = [o for o in sonuc if "S21e Hyd" in str(o.get("tip") or o.get("model")) and o.get("stats_kod") == 200]
    if not s21:
        return
    o = s21[0]
    v = {"gun": simdi.strftime("%Y-%m-%d"), "zaman": simdi.isoformat(timespec="seconds"), "ip": o["ip"], "fw_su_an": o.get("fw")}
    try:
        v["dosya"], v["boyut"], v["md5"], v["md5_dogru"] = indir("S21e Hyd")
    except Exception as e:
        v["indirme_hata"] = str(e)[:200]
    try:
        v["arayuz"] = arayuz_kesif(o["ip"])
    except Exception as e:
        v["arayuz_hata"] = str(e)[:200]
    gh(KESIF, v, sha, "Firmware keşfi " + simdi.strftime("%H:%M"))
    log("firmware keşfi:", v.get("md5_dogru"), len((v.get("arayuz") or {}).get("upgrade_satir") or []))
