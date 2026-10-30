#!/usr/bin/env python3
"""MEDAŞ dpPower CBS Web Portalı (port 8586) bekçisi.

saha-pi yeniden başladığında veya süreç kapandığında medas_portal_modul.py'yi
mevcut veritabanı (medas_veri/medas_sebeke.db) dizininde otomatik başlatır.
"""
import os, socket, subprocess, time
from pathlib import Path

PORT = 8586


def acik_mi(port=PORT, timeout=1.5):
    try:
        with socket.create_connection(("127.0.0.1", port), timeout=timeout):
            return True
    except OSError:
        return False


def _adaylari_bul():
    ev = Path.home()
    adaylar = []
    try:
        r = subprocess.run(
            ["find", str(ev), "-maxdepth", "6",
             "(", "-name", ".git", "-o", "-name", "venv", "-o", "-name", ".venv", "-o", "-name", "node_modules", ")", "-prune",
             "-o", "-name", "medas_portal_modul.py", "-print"],
            capture_output=True, text=True, timeout=10
        )
        for satir in (r.stdout or "").splitlines():
            p = Path(satir.strip())
            if p.is_file():
                adaylar.append(p)
    except Exception:
        pass
    for sabit in (
        ev / "anti_star/medas_portal_modul.py",
        ev / "medas/medas_portal_modul.py",
        ev / "SAHA/antminer/medas_portal_modul.py",
        ev / "SAHA/medas/medas_portal_modul.py",
        ev / "medas_portal_modul.py",
    ):
        if sabit.is_file() and sabit not in adaylar:
            adaylar.append(sabit)

    def puan(p: Path):
        db = p.parent / "medas_veri" / "medas_sebeke.db"
        try:
            db_boyut = db.stat().st_size if db.is_file() else 0
            db_mtime = db.stat().st_mtime if db.is_file() else 0
            p_mtime = p.stat().st_mtime
        except OSError:
            db_boyut, db_mtime, p_mtime = 0, 0, 0
        return (1 if db_boyut > 0 else 0, db_boyut, db_mtime, p_mtime)

    adaylar.sort(key=puan, reverse=True)
    return adaylar


def kontrol():
    """Port 8586 açık değilse medas_portal_modul.py'yi başlatır.
    Dönüş: (eylem_yapildi: bool, basarili: bool, mesaj: str)
    """
    if acik_mi():
        return False, True, "çalışıyor"

    adaylar = _adaylari_bul()
    if not adaylar:
        return True, False, "medas_portal_modul.py bulunamadı"

    hedef = adaylar[0]
    py = "python3"
    venv_py = Path.home() / "SAHA/antminer/venv/bin/python"
    if venv_py.is_file():
        py = str(venv_py)

    try:
        with open("/tmp/medas_portal.log", "ab") as lg:
            subprocess.Popen(
                [py, str(hedef), "--port", str(PORT)],
                cwd=str(hedef.parent),
                stdout=lg,
                stderr=lg,
                start_new_session=True,
                 close_fds=True,
            )
        for _ in range(6):
            time.sleep(0.5)
            if acik_mi():
                db = hedef.parent / "medas_veri" / "medas_sebeke.db"
                boyut = f" (DB: {db.stat().st_size // 1024} KB)" if db.is_file() else ""
                return True, True, f"{hedef} port {PORT} üzerinde başlatıldı{boyut}"
        return True, False, f"{hedef} başlatıldı ancak port {PORT} henüz yanıt vermiyor"
    except Exception as e:
        return True, False, f"başlatılamadı ({hedef}): {e}"


if __name__ == "__main__":
    eylem, ok, msj = kontrol()
    print(f"eylem={eylem} ok={ok} mesaj={msj}")
