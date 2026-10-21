#!/usr/bin/env python3
"""Toplayıcının (altminer, ~/SAHA/antminer/antminer_panel.py) okuduğu IP listesine aralık dışı cihaz IP'leri ekler.

Toplayıcı yalnız IP_RANGE = list(range(100, 130)) adreslerini okur. Modem bir cihaza aralık dışı IP verince
(8 Eki 2026: 016 → 192.168.0.133) cihaz F2Pool'da çalışır ama Pi göremez, uyutamaz.
Bu betik EK listesindeki son ekleri IP_RANGE'e ekler (yalnız eksik olanları), yedek alır, derlemeyi dener,
toplayıcıyı yeniden başlatır; 40 sn içinde geri gelmezse kendisi başlatır. Değişiklik yoksa hiçbir şey yapmaz.
Ek olarak ag_tara.py'nin son taraması (n8n/ag_tarama.json, ≤3 sa) "agda_var_liste_disi" bulduğu
madencilerin yeni IP'leri de eklenir (21 Eki 2026 00:31: modem 23 cihaza .130–.154 verdi, toplayıcı 6 cihaz gördü).
cihaz_yonetimi.py her çalıştırmada çağırır (Pi git pull ile alır). Elle: python3 ~/aesun/pi/altminer_ip_ekle.py
Geri almak: antminer_panel.py.yedek-ip-<zaman> dosyasını eski adına kopyalayın.
"""
import ipaddress, py_compile, re, shutil, subprocess, sys, time
from datetime import datetime, timedelta, timezone
from pathlib import Path

DOSYA = Path.home() / "SAHA/antminer/antminer_panel.py"
PY = Path.home() / "SAHA/antminer/venv/bin/python"
EK = [133]                                  # 016 (MAC A2:ED:87:03:64:F4)
SATIR = re.compile(r"^IP_RANGE\s*=\s*list\(range\(100,\s*130\)\)(?:\s*\+\s*\[([\d,\s]*)\])?(.*)$", re.M)


def tarama_ekleri(log=print):
    """ag_tarama.json'daki liste dışı madencilerin son ekleri (yalnız 192.168.0.x, taze tarama, worker'ı bilinen)."""
    try:
        sys.path.insert(0, str(Path(__file__).resolve().parent))
        from ortak import gh
        t, _ = gh("n8n/ag_tarama.json")
    except Exception as e:
        log("altminer IP ekleme: ağ taraması okunamadı:", e)
        return []
    if not t:
        return []
    try:
        if datetime.now(timezone.utc) - datetime.fromisoformat(t["zaman"]) > timedelta(hours=3):
            return []
        if ipaddress.ip_network(t.get("alt_ag") or "") != ipaddress.ip_network("192.168.0.0/24"):
            return []
    except Exception:
        return []
    pi = t.get("pi_ip")
    ek = set()
    for e in t.get("eksik") or []:
        ip = e.get("yeni_ip") or ""
        if e.get("durum") != "agda_var_liste_disi" or not e.get("worker") or not ip.startswith("192.168.0.") or ip == pi:
            continue
        try:
            s = int(ip.rsplit(".", 1)[1])
        except ValueError:
            continue
        if 2 <= s <= 254 and not 100 <= s < 130:
            ek.add(s)
    return sorted(ek) if len(ek) <= 40 else []


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
    eksik = sorted({x for x in EK + tarama_ekleri(log) if x not in mevcut and not 100 <= x < 130})
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
