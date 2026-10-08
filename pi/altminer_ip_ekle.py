#!/usr/bin/env python3
"""Toplayıcının (altminer, ~/SAHA/antminer/antminer_panel.py) okuduğu IP listesine aralık dışı cihaz IP'leri ekler.

Toplayıcı yalnız IP_RANGE = list(range(100, 130)) adreslerini okur. Modem bir cihaza aralık dışı IP verince
(8 Eki 2026: 016 → 192.168.0.133) cihaz F2Pool'da çalışır ama Pi göremez, uyutamaz.
Bu betik EK listesindeki son ekleri IP_RANGE'e ekler (yalnız eksik olanları), yedek alır, derlemeyi dener,
toplayıcıyı yeniden başlatır; 40 sn içinde geri gelmezse kendisi başlatır. Değişiklik yoksa hiçbir şey yapmaz.
cihaz_yonetimi.py her çalıştırmada çağırır (Pi git pull ile alır). Elle: python3 ~/aesun/pi/altminer_ip_ekle.py
Geri almak: antminer_panel.py.yedek-ip-<zaman> dosyasını eski adına kopyalayın.
"""
import py_compile, re, shutil, subprocess, sys, time
from pathlib import Path

DOSYA = Path.home() / "SAHA/antminer/antminer_panel.py"
PY = Path.home() / "SAHA/antminer/venv/bin/python"
EK = [133]                                  # 016 (MAC A2:ED:87:03:64:F4)
SATIR = re.compile(r"^IP_RANGE\s*=\s*list\(range\(100,\s*130\)\)(?:\s*\+\s*\[([\d,\s]*)\])?(.*)$", re.M)


def calisiyor():
    return subprocess.run(["pgrep", "-f", "antminer_panel.py"], capture_output=True).returncode == 0


def uygula(log=print):
    if not DOSYA.exists():
        return False
    s = DOSYA.read_text()
    m = SATIR.search(s)
    if not m:
        log("altminer IP_RANGE satırı beklenen biçimde değil; değişiklik yapılmadı")
        return False
    mevcut = [int(x) for x in (m.group(1) or "").replace(" ", "").split(",") if x]
    eksik = [x for x in EK if x not in mevcut and not 100 <= x < 130]
    if not eksik:
        return False
    yeni_liste = sorted(set(mevcut + eksik))
    yeni = s[:m.start()] + f"IP_RANGE = list(range(100, 130)) + {yeni_liste}  # aesun: aralık dışı cihazlar" + s[m.end():]
    yedek = DOSYA.with_name(DOSYA.name + ".yedek-ip-" + time.strftime("%Y%m%d-%H%M%S"))
    shutil.copy2(DOSYA, yedek)
    gecici = DOSYA.with_name(DOSYA.name + ".yeni")
    gecici.write_text(yeni)
    try:
        py_compile.compile(str(gecici), doraise=True)
    except Exception as e:
        gecici.unlink(missing_ok=True)
        log("altminer IP ekleme: derleme hatası, değişiklik yapılmadı:", e)
        return False
    shutil.copymode(DOSYA, gecici)
    gecici.replace(DOSYA)
    log(f"altminer IP listesine eklendi: {eksik} (yedek {yedek.name}); toplayıcı yeniden başlatılıyor")
    subprocess.run(["pkill", "-f", "antminer_panel.py"])
    for _ in range(20):
        time.sleep(2)
        if calisiyor():
            log("toplayıcı yeniden başladı")
            return True
    subprocess.Popen([str(PY if PY.exists() else sys.executable), str(DOSYA)], cwd=str(DOSYA.parent),
                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
    log("toplayıcı servis tarafından başlatılmadı; elle başlatıldı")
    return True


if __name__ == "__main__":
    uygula()
