#!/usr/bin/env python3
"""Anlık izleme gönderimini (pi/canli.py) crontab'a bir kez ekler. cihaz_yonetimi.py her çalıştırmada çağırır.
Kapatmak için: ~/.aesun/canli_kapali dosyası oluşturulur (satır kaldırılır)."""
import subprocess
from pathlib import Path

EV = Path.home()
KOK = Path(__file__).resolve().parent.parent
VPY = EV / "SAHA/antminer/venv/bin/python"
SATIR = f"* * * * * flock -n /tmp/aesun_canli.lock {VPY if VPY.exists() else 'python3'} {KOK}/pi/canli.py >> {KOK}/canli.log 2>&1"


def uygula(log=print):
    mevcut = subprocess.run(["crontab", "-l"], capture_output=True, text=True).stdout
    satirlar = [s for s in mevcut.splitlines() if "pi/canli.py" not in s]
    kapali = (EV / ".aesun" / "canli_kapali").exists()
    yeni = satirlar + ([] if kapali else [SATIR])
    if "\n".join(yeni).strip() == mevcut.strip():
        return
    subprocess.run(["crontab", "-"], input="\n".join(yeni) + "\n", text=True, check=True)
    log("canlı izleme cron " + ("kaldırıldı" if kapali else "eklendi"))


if __name__ == "__main__":
    uygula()
