#!/usr/bin/env python3
"""AEMonitoring · Günlük yedek (Pi, crontab gece 03:30).

Ne yedeklenir (tek .tar.gz):
  saha/       ~/SAHA (toplayıcı altminer + OSOS/FusionSolar kodu); venv, log, önbellek ve oturum dosyaları hariç
  aesun/      ~/.aesun (öğrenme verisi, takvim, bekçi durumu, CİHAZ AYAR YEDEKLERİ yedek/ayar/*.json); osos.env hariç
  sistem/     crontab, altminer servis tanımı, venv paket listesi (pip freeze), işletim sistemi bilgisi
ŞİFRE/TOKEN YOK: *.env, oturum/çerez dosyaları alınmaz; metin dosyalarında PASS/TOKEN/SECRET/KEY değerleri *** yapılır
(hangi dosyalarda maskelendiği MANIFEST.json'da). Geri yüklerken bu değerler elle girilir (pi/GERI_YUKLE.md).
Nereye:
  ~/yedek/aesun_yedek_<tarih>.tar.gz (son 14 gün) ve
  ~/.aesun/osos.env içinde YEDEK_TOKEN + YEDEK_REPO (ör. ekinciomer-ai/SYS) varsa o GİZLİ depoya aesun-yedek/son.tar.gz
  (depo geçmişi her günün sürümünü tutar).
Elle:  python3 ~/aesun/pi/yedek.py
"""
import base64, io, json, os, re, subprocess, tarfile, time, urllib.request
from datetime import datetime
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from ortak import AESUN, TR, log  # noqa: E402

EV = Path.home()
HEDEF = EV / "yedek"
HARIC_DIZIN = {"venv", ".venv", "__pycache__", "node_modules", ".git", "logs", "log", "cache", ".cache", "cihaz_iz_eski"}
HARIC_AD = re.compile(r"(\.env$|^env\.txt$|oturum.*\.json$|cookie|cerez|\.log$|\.pyc$|\.yedek-|\.sqlite-journal$)", re.I)
GIZLI = re.compile(r"""((?:PASS(?:WORD)?|SIFRE|ŞİFRE|TOKEN|SECRET|API_?KEY|APPKEY|AUTH)[A-Z_]*\s*[=:]\s*["']?)([^\s"',}]{3,})""", re.I)
MAKS_BOYUT = 8 * 1024 * 1024


def env():
    e = {}
    f = AESUN / "osos.env"
    if f.exists():
        for s in f.read_text().splitlines():
            if "=" in s and not s.startswith("#"):
                k, v = s.split("=", 1); e[k.strip()] = v.strip()
    return e


def komut(*a):
    try:
        return subprocess.run(a, capture_output=True, text=True, timeout=60).stdout
    except Exception as e:
        return f"(çalıştırılamadı: {e})"


def ekle_dizin(tar, kok, ad, manifest):
    if not kok.exists():
        return
    for p in sorted(kok.rglob("*")):
        rel = p.relative_to(kok)
        if any(x in HARIC_DIZIN for x in rel.parts) or not p.is_file() or HARIC_AD.search(p.name) or p.name == "osos.env":
            continue
        if p.stat().st_size > MAKS_BOYUT:
            manifest["atlanan_buyuk"].append(f"{ad}/{rel}"); continue
        veri = p.read_bytes()
        if p.suffix.lower() in (".py", ".sh", ".json", ".txt", ".yml", ".yaml", ".ini", ".cfg", ".conf", ".service", ".md", ""):
            try:
                t = veri.decode()
                t2, n = GIZLI.subn(lambda m: m.group(1) + "***", t)
                if n:
                    manifest["maskelenen"].append(f"{ad}/{rel} ({n})"); veri = t2.encode()
            except UnicodeDecodeError:
                pass
        ti = tarfile.TarInfo(f"{ad}/{rel}"); ti.size = len(veri); ti.mtime = int(p.stat().st_mtime)
        tar.addfile(ti, io.BytesIO(veri)); manifest["dosya"] += 1


def ekle_metin(tar, yol, metin):
    b = metin.encode(); ti = tarfile.TarInfo(yol); ti.size = len(b); ti.mtime = int(time.time())
    tar.addfile(ti, io.BytesIO(b))


def main():
    simdi = datetime.now(TR)
    HEDEF.mkdir(exist_ok=True)
    dosya = HEDEF / f"aesun_yedek_{simdi:%Y%m%d}.tar.gz"
    manifest = {"zaman": simdi.isoformat(timespec="seconds"), "dosya": 0, "maskelenen": [], "atlanan_buyuk": []}
    with tarfile.open(dosya, "w:gz") as tar:
        ekle_dizin(tar, EV / "SAHA", "saha", manifest)
        ekle_dizin(tar, AESUN, "aesun", manifest)
        ekle_metin(tar, "sistem/crontab.txt", komut("crontab", "-l"))
        ekle_metin(tar, "sistem/altminer.service.txt", komut("systemctl", "cat", "altminer"))
        ekle_metin(tar, "sistem/pip_freeze.txt", komut(str(EV / "SAHA/antminer/venv/bin/pip"), "freeze"))
        ekle_metin(tar, "sistem/os.txt", komut("cat", "/etc/os-release") + komut("uname", "-a") + komut("python3", "--version"))
        ekle_metin(tar, "MANIFEST.json", json.dumps(manifest, ensure_ascii=False, indent=1))
    for eski in sorted(HEDEF.glob("aesun_yedek_*.tar.gz"))[:-14]:
        eski.unlink()
    boyut = dosya.stat().st_size
    log(f"yedek: {dosya.name} {boyut/1024:.0f} KB, {manifest['dosya']} dosya, maskelenen {len(manifest['maskelenen'])}")
    e = env()
    if e.get("YEDEK_TOKEN") and e.get("YEDEK_REPO"):
        url = f"https://api.github.com/repos/{e['YEDEK_REPO']}/contents/aesun-yedek/son.tar.gz"
        h = {"Authorization": "Bearer " + e["YEDEK_TOKEN"], "Accept": "application/vnd.github+json", "User-Agent": "aesun-pi"}
        sha = None
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=h), timeout=60) as r:
                sha = json.loads(r.read()).get("sha")
        except Exception:
            pass
        govde = {"message": f"aesun yedek {simdi:%Y-%m-%d}", "content": base64.b64encode(dosya.read_bytes()).decode()}
        if sha:
            govde["sha"] = sha
        req = urllib.request.Request(url, data=json.dumps(govde).encode(), headers={**h, "Content-Type": "application/json"}, method="PUT")
        with urllib.request.urlopen(req, timeout=180) as r:
            log("gizli depoya yüklendi:", e["YEDEK_REPO"], r.status)
    else:
        log("YEDEK_TOKEN/YEDEK_REPO yok: yalnız yerel yedek alındı (~/yedek)")


if __name__ == "__main__":
    main()
