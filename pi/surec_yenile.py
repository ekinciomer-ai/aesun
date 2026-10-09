#!/usr/bin/env python3
"""Sürekli çalışan toplayıcıyı, kodu git pull ile değiştiyse bir kez yeniden başlatır.

FusionSolar toplayıcısı (toplayicilar/fusionsolar/fusionsolar_toplayici.py) sürekli modda çalışır; kod değişince
yeni sürüm ancak süreç yeniden başlayınca devreye girer. Yeni sürümler bunu kendisi yapar (dosya değişince çıkar),
bu betik eski sürümle çalışan süreç içindir: dosya süreçten yeniyse sürece SIGINT gönderir (tarayıcıyı düzgün kapatır),
cron (10 dk'da bir, flock) yeni kodla yeniden başlatır. cihaz_yonetimi.py her çalıştırmada çağırır.
"""
import os, signal, subprocess, time
from pathlib import Path

HEDEF = [Path.home() / "aesun/toplayicilar/fusionsolar/fusionsolar_toplayici.py"]


def _baslangic(pid):
    """Sürecin başlama zamanı (epoch sn)."""
    with open(f"/proc/{pid}/stat") as f:
        alan = f.read().rsplit(")", 1)[1].split()
    tik = int(alan[19])
    with open("/proc/uptime") as f:
        acik = float(f.read().split()[0])
    return time.time() - acik + tik / os.sysconf("SC_CLK_TCK")


def uygula(log=print):
    for dosya in HEDEF:
        if not dosya.exists():
            continue
        mt = dosya.stat().st_mtime
        r = subprocess.run(["pgrep", "-f", dosya.name], capture_output=True, text=True)
        for p in r.stdout.split():
            try:
                pid = int(p)
                arg = open(f"/proc/{pid}/cmdline", "rb").read().split(b"\0")
                if not arg or b"python" not in os.path.basename(arg[0]) or len([a for a in arg if a]) != 2:
                    continue                              # yalnız sürekli mod: "python fusionsolar_toplayici.py"
                if _baslangic(pid) < mt - 5:
                    os.kill(pid, signal.SIGINT)
                    log(f"{dosya.name} yeni sürüm: eski süreç ({pid}) durduruldu; cron yeni kodla başlatacak")
            except Exception as e:
                log("süreç yenileme:", e)


if __name__ == "__main__":
    uygula()
