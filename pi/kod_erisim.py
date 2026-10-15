#!/usr/bin/env python3
"""aesun deposu gizli olunca Pi'nin kod güncellemesini (git pull) sürdürmesi için salt-okunur dağıtım anahtarı.

1) ~/.aesun/aesun_dagitim anahtarı yoksa üretir (özel anahtar yalnız Pi'de kalır).
2) Açık anahtarı epias-ptf/n8n/pi_aesun_anahtar.json'a yazar (yönetici GitHub'da aesun → Deploy keys'e ekler).
3) Anahtar GitHub'da tanımlanınca aesun'un uzak adresini SSH'ye çevirir; bundan sonra cron'daki git pull bununla çalışır.
cihaz_yonetimi.py her turda çağırır; iş bitince (işaret dosyası) hiçbir şey yapmaz.
"""
import json, os, subprocess, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ortak import gh  # noqa: E402

KOK = Path(__file__).resolve().parent.parent
A = Path.home() / ".aesun" / "aesun_dagitim"
ISARET = Path.home() / ".aesun" / "aesun_ssh_tamam"
SSH = f"ssh -i {A} -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new -o BatchMode=yes"
URL = "git@github.com:ekinciomer-ai/aesun.git"


def uygula(log=print):
    if ISARET.exists():
        return
    A.parent.mkdir(parents=True, exist_ok=True)
    if not A.exists():
        subprocess.run(["ssh-keygen", "-q", "-t", "ed25519", "-N", "", "-C", "saha-pi aesun (salt okunur)", "-f", str(A)], check=True)
        log("kod erişimi: dağıtım anahtarı üretildi")
    acik = A.with_suffix(".pub").read_text().strip()
    try:
        mevcut, sha = gh("n8n/pi_aesun_anahtar.json")
        if not (isinstance(mevcut, dict) and mevcut.get("acik") == acik):
            gh("n8n/pi_aesun_anahtar.json", {"acik": acik, "not": "GitHub → aesun → Settings → Deploy keys → Add (yazma izni GEREKMEZ)"}, sha, "Pi: aesun dağıtım anahtarı (açık)")
            log("kod erişimi: açık anahtar yayımlandı")
    except Exception as e:
        log("kod erişimi: yayımlanamadı", e)
    r = subprocess.run(["git", "ls-remote", URL, "HEAD"], capture_output=True, text=True, timeout=60, env={**os.environ, "GIT_SSH_COMMAND": SSH})
    if r.returncode == 0:
        subprocess.run(["git", "-C", str(KOK), "remote", "set-url", "origin", URL], check=True)
        subprocess.run(["git", "-C", str(KOK), "config", "core.sshCommand", SSH], check=True)
        ISARET.write_text("1")
        log("kod erişimi: aesun artık SSH dağıtım anahtarıyla güncelleniyor")


if __name__ == "__main__":
    uygula()
