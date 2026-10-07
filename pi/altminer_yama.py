#!/usr/bin/env python3
"""altminer (~/SAHA/antminer/antminer_panel.py) uyut/çalıştır yaması — S19 Hyd desteği.

Sorun: komut cihaza yalnız {"bitmain-work-mode": "1"} gönderiyordu. S21e bunu uygular; S19 XP+/S19e XP Hyd
"success" der ama modu değiştirmez (7 Eki 2026, .112'de denendi). S19'da mod, ayarın tamamı ile birlikte
"miner-mode" (sayı) yazılınca değişiyor.

Yama: mod_yaz(ip, mod) yardımcısı eklenir ve set_miner_conf çağrıları ona yönlendirilir:
  1) eski yol (S21e için değişmedi): {"bitmain-work-mode": mod}
  2) 8 sn sonra mod geri okunur; değişmemişse tam ayar + "miner-mode": int(mod) gönderilir.
Yedek: antminer_panel.py.yedek-<zaman>. Geri almak için yedeği eski adına kopyalayın.
Kullanım:  python3 ~/aesun/pi/altminer_yama.py && pkill -f antminer_panel.py
"""
import py_compile, re, shutil, sys, time
from pathlib import Path

DOSYA = Path.home() / "SAHA/antminer/antminer_panel.py"
ISARET = "# --- aesun yama: mod_yaz ---"

YARDIMCI = '''
''' + ISARET + '''
def mod_yaz(ip, mod, timeout=30):
    """Uyku ("1") / normal ("0") modu yazar ve doğrular. S21e kısa yol; S19 tam ayar + miner-mode."""
    import time as _t
    mod = str(mod)
    r = http_query(ip, "set_miner_conf.cgi", method="POST", body={"bitmain-work-mode": mod}, timeout=timeout)
    _t.sleep(8)
    try:
        c = http_query(ip, "get_miner_conf.cgi", timeout=timeout)
        if isinstance(c, dict) and str(c.get("bitmain-work-mode")) == mod:
            return r
        if isinstance(c, dict) and c.get("pools") is not None:
            c = {k: v for k, v in c.items() if v is not None}
            c.pop("bitmain-work-mode", None)
            c["miner-mode"] = int(mod)
            r = http_query(ip, "set_miner_conf.cgi", method="POST", body=c, timeout=timeout)
            log_event(f"{ip}: mod {mod} tam ayarla (miner-mode) yazildi")
    except Exception as e:
        log_event(f"{ip}: mod_yaz dogrulama hatasi: {e}")
    return r

'''

KALIP = re.compile(r'http_query\(\s*ip\s*,\s*"set_miner_conf\.cgi"\s*,\s*method="POST"\s*,\s*(?:timeout=\d+\s*,\s*)?'
                   r'body=\{\s*"bitmain-work-mode"\s*:\s*([^}]+?)\s*\}\s*(?:,\s*timeout=\d+\s*)?\)', re.S)


def main():
    s = DOSYA.read_text()
    if ISARET in s:
        print("Yama zaten uygulanmış."); return
    n = len(KALIP.findall(s))
    if n == 0:
        sys.exit("set_miner_conf çağrısı bulunamadı; dosya beklenenden farklı, değişiklik yapılmadı.")
    yedek = DOSYA.with_name(DOSYA.name + ".yedek-" + time.strftime("%Y%m%d-%H%M%S"))
    shutil.copy2(DOSYA, yedek)
    yeni = KALIP.sub(lambda m: f"mod_yaz(ip, {m.group(1)})", s)
    i = yeni.index("\ndef http_query(")
    j = yeni.index("\ndef ", i + 1)                 # http_query'nin bittiği yer
    yeni = yeni[:j] + "\n" + YARDIMCI + yeni[j:]
    DOSYA.write_text(yeni)
    try:
        py_compile.compile(str(DOSYA), doraise=True)
    except Exception as e:
        shutil.copy2(yedek, DOSYA)
        sys.exit(f"Derleme hatası, yedek geri yüklendi: {e}")
    print(f"Tamam: {n} çağrı mod_yaz'a yönlendirildi. Yedek: {yedek.name}")


if __name__ == "__main__":
    main()
