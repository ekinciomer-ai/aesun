#!/usr/bin/env python3
"""altminer (~/SAHA/antminer/antminer_panel.py) uyut/çalıştır yaması — S19 Hyd desteği (v2).

Sorun:
  1) Komut cihaza yalnız {"bitmain-work-mode": "1"} gönderiyordu. S21e bunu uygular; S19 XP+/S19e XP Hyd
     "success" der ama modu değiştirmez. S19'da mod, ayarın tamamı ile birlikte "miner-mode" (sayı) yazılınca değişiyor.
  2) v1 yamasında doğrulama yalnız str(c.get("bitmain-work-mode")) == mod kontrolü yapıyordu. Ancak S19 XP+ Hyd (.112)
     uykudayken bile get_miner_conf.cgi içinde bitmain-work-mode="0" döndürdüğü için, uyandırma (mod="0") sırasında
     mod zaten "0" sanılıp erken çıkılıyor ve miner-mode=0 hiç yazılmıyordu (20 Eki 2026).

Yama (v2):
  - Doğrulamada bitmain-work-mode yanı sıra miner-mode alanı ve summary.cgi gerçek çalışma/uyku durumu kontrol edilir.
  - Eşleşmiyorsa tam ayar ile hem bitmain-work-mode hem miner-mode birlikte yazılır.
  - v1 yaması kuruluysa otomatik olarak v2'ye yükseltir.
Kullanım:  python3 ~/aesun/pi/altminer_yama.py && pkill -f antminer_panel.py
"""
import py_compile, re, shutil, sys, time
from pathlib import Path

DOSYA = Path.home() / "SAHA/antminer/antminer_panel.py"
ISARET_ESKI = "# --- aesun yama: mod_yaz ---"
ISARET = "# --- aesun yama: mod_yaz v2 ---"

YARDIMCI = '''
''' + ISARET + '''
def mod_yaz(ip, mod, timeout=30):
    """Uyku ("1") / normal ("0") modu yazar ve doğrular. S21e kısa yol; S19 tam ayar + miner-mode (v2)."""
    import time as _t
    mod = str(mod)
    r = http_query(ip, "set_miner_conf.cgi", method="POST", body={"bitmain-work-mode": mod}, timeout=timeout)
    _t.sleep(8)
    try:
        c = http_query(ip, "get_miner_conf.cgi", timeout=timeout)
        uykuda = None
        try:
            sm = http_query(ip, "summary.cgi", timeout=10)
            st = (((sm or {}).get("STATUS") or [{}])[0]) or {}
            sy = (((sm or {}).get("SUMMARY") or [{}])[0]) or {}
            m_str = str(st.get("Msg") or "") + " " + str(sy.get("Miner Mode") or sy.get("miner_mode") or "")
            if "sleep" in m_str.lower() or str(sy.get("Miner Mode")) == "1":
                uykuda = True
            elif float(sy.get("rate_5s") or sy.get("GHS 5s") or 0) > 0:
                uykuda = False
        except Exception:
            pass
        hedef_uyku = (mod == "1")
        kip_ok = (
            isinstance(c, dict)
            and str(c.get("bitmain-work-mode")) == mod
            and (c.get("miner-mode") is None or str(c.get("miner-mode")) == mod)
            and (uykuda is None or uykuda == hedef_uyku)
        )
        if kip_ok:
            return r
        if isinstance(c, dict) and c.get("pools") is not None:
            c = {k: v for k, v in c.items() if v is not None}
            c["bitmain-work-mode"] = mod
            c["miner-mode"] = int(mod)
            r = http_query(ip, "set_miner_conf.cgi", method="POST", body=c, timeout=timeout)
            log_event(f"{ip}: mod {mod} tam ayarla (miner-mode + bitmain-work-mode) yazildi (uykuda={uykuda})")
    except Exception as e:
        log_event(f"{ip}: mod_yaz dogrulama hatasi: {e}")
    return r

'''

KALIP = re.compile(r'http_query\(\s*ip\s*,\s*"set_miner_conf\.cgi"\s*,\s*method="POST"\s*,\s*(?:timeout=\d+\s*,\s*)?'
                   r'body=\{\s*"bitmain-work-mode"\s*:\s*([^}]+?)\s*\}\s*(?:,\s*timeout=\d+\s*)?\)', re.S)
ESKI_BLOK = re.compile(r'\n?# --- aesun yama: mod_yaz ---\ndef mod_yaz\(ip, mod, timeout=30\):.*?return r\n+', re.S)


def main():
    s = DOSYA.read_text()
    if ISARET in s:
        print("Yama (v2) zaten uygulanmış."); return
    yedek = DOSYA.with_name(DOSYA.name + ".yedek-" + time.strftime("%Y%m%d-%H%M%S"))
    shutil.copy2(DOSYA, yedek)
    if ISARET_ESKI in s:
        yeni, adet = ESKI_BLOK.subn("\n" + YARDIMCI, s, count=1)
        if not adet:
            sys.exit("Eski yama bloğu güncellenemedi; değişiklik yapılmadı.")
        mesaj = f"Tamam: mod_yaz v1 -> v2 yükseltildi. Yedek: {yedek.name}"
    else:
        n = len(KALIP.findall(s))
        if n == 0:
            sys.exit("set_miner_conf çağrısı bulunamadı; dosya beklenenden farklı, değişiklik yapılmadı.")
        yeni = KALIP.sub(lambda m: f"mod_yaz(ip, {m.group(1)})", s)
        i = yeni.index("\ndef http_query(")
        j = yeni.index("\ndef ", i + 1)
        yeni = yeni[:j] + "\n" + YARDIMCI + yeni[j:]
        mesaj = f"Tamam: {n} çağrı mod_yaz v2'ye yönlendirildi. Yedek: {yedek.name}"
    DOSYA.write_text(yeni)
    try:
        py_compile.compile(str(DOSYA), doraise=True)
    except Exception as e:
        shutil.copy2(yedek, DOSYA)
        sys.exit(f"Derleme hatası, yedek geri yüklendi: {e}")
    print(mesaj)


if __name__ == "__main__":
    main()
