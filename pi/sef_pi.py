"""AEMonitoring · Pi şefi (saha Pi'sinde, nabız ile 10 dk'da bir; cihaz_detay'dan bağımsız).

Pi'de toplayıcılar crontab + flock ile çalışır: bir süreç takılırsa kilidi tutar, sonraki çalışmalar atlanır ve veri bayatlar.
Şef bunları çözer (sudo gerekmez, yalnız kendi süreçleri):
  takili    süresini aşmış toplayıcı sürecini durdurur (TERM, gerekirse KILL) → bir sonraki dakikada cron temiz başlatır
  kod       git pull (yerel değişiklik / ayrık dal yüzünden) başarısızsa yerel değişikliği kenara alıp güncel koda geçer
  disk      disk %90'ı aşarsa büyük günlük dosyalarını kırpar
Çözemediğini 'acik' olarak yazar. Çıktı: epias-ptf n8n/sef_pi.json (yalnız eylem olunca ya da saatte bir) — ns1 şefi ve panel okur.
"""
import json, os, shutil, signal, subprocess, time
from datetime import datetime
from pathlib import Path

from ortak import AESUN, TR, gh, log

KOK = Path(__file__).resolve().parent.parent
YEREL = AESUN / "sef_pi.json"
SINIR = {  # betik: en uzun olağan süre (sn) — aşarsa takılmış sayılır
    "canli.py": 240, "cihaz_detay.py": 900, "cihaz_yonetimi.py": 1200, "cihaz_ogrenme.py": 1500, "ag_tara.py": 1200,
    "osos_toplayici.py": 2400, "nabiz.py": 600, "yedek.py": 5400, "firmware.py": 7200, "kompanzasyon.py": 900, "saha_inverter.py": 900, "fusionsolar_toplayici.py": 2700,   # 20 Eki: olağan turu ~20 dk sürüyor (30 dk'da bir yayın); yalnız gerçekten takılanı (ör. 3,6 gün) durdur

}


def sh(*a, t=120):
    try:
        r = subprocess.run(list(a), capture_output=True, text=True, timeout=t)
        return r.returncode, (r.stdout or "").strip(), (r.stderr or "").strip()
    except Exception as e:
        return 99, "", str(e)


def main():
    simdi = datetime.now(TR); ts = time.time()
    try: st = json.loads(YEREL.read_text())
    except Exception: st = {}
    eylemler, acik = [], []
    benim = os.getpid()

    def kayit(eylem, sorun, sonuc, ok):
        eylemler.append({"t": simdi.isoformat(timespec="seconds"), "eylem": eylem, "sorun": sorun, "sonuc": sonuc, "ok": ok})
        log("şef:", eylem, sorun, "→", sonuc)

    # 1) takılan toplayıcılar
    k, o, _ = sh("ps", "-u", str(os.getuid()), "-o", "pid=,etimes=,args=")
    for satir in o.splitlines():
        p = satir.split(None, 2)
        if len(p) < 3 or not p[0].isdigit() or int(p[0]) == benim:
            continue
        pid, sure, kom = int(p[0]), int(p[1]), p[2]
        ilk = os.path.basename(kom.split()[0])
        if ilk in ("flock", "sh", "bash", "dash") or not ilk.startswith("python"):
            continue                                   # yalnız python sürecinin kendisi (kabuk sarmalayıcısı ikinci kez sayılmasın)
        for betik, lim in SINIR.items():
            if betik in kom and "python" in kom and sure > lim:
                if betik == "fusionsolar_toplayici.py":
                    son_veri = KOK / "toplayicilar/fusionsolar/data/latest.json"
                    if son_veri.exists() and ts - son_veri.stat().st_mtime < 1800:
                        break  # sürekli (forever) modda çalışıyor ve son 30 dk içinde veri üretti; takılı değil
                try:
                    os.kill(pid, signal.SIGTERM); time.sleep(5)
                    try: os.kill(pid, 0); os.kill(pid, signal.SIGKILL); ek = " (zorla)"
                    except OSError: ek = ""
                    kayit("takili", f"{betik} {round(sure / 60)} dk'dır çalışıyor (sınır {lim // 60} dk), kilidi tutuyordu", "durduruldu" + ek + "; cron bir sonraki turda temiz başlatır", True)
                except Exception as e:
                    kayit("takili", f"{betik} takılı", f"durdurulamadı: {e}", False)
                break

    # 2) kod güncellemesi
    k, _, e = sh("git", "-C", str(KOK), "fetch", "-q", "origin", "main", t=90)
    if not k:
        _, geri, _ = sh("git", "-C", str(KOK), "rev-list", "--count", "HEAD..origin/main")
        _, son, _ = sh("git", "-C", str(KOK), "log", "-1", "--format=%ct", "origin/main")
        if int(geri or 0) > 0 and son.isdigit() and ts - int(son) > 45 * 60:     # 30 dk'lık pull iki kez kaçtı
            k2, _, e2 = sh("git", "-C", str(KOK), "pull", "-q", "--ff-only", t=90)
            if k2:
                sh("git", "-C", str(KOK), "stash", "-q")
                k2, _, e2 = sh("git", "-C", str(KOK), "pull", "-q", "--ff-only", t=90)
                if k2:
                    sh("git", "-C", str(KOK), "reset", "-q", "--hard", "origin/main")
                    k2 = sh("git", "-C", str(KOK), "diff", "--quiet", "HEAD", "origin/main")[0]
            kayit("kod", f"Pi kodu {geri} commit geride, olağan güncelleme olmadı", "güncel koda geçildi" if not k2 else f"güncellenemedi: {e2[-120:]}", not k2)
    else:
        acik.append({"sorun": "Pi GitHub'a ulaşamıyor (kod güncellemesi)", "neden": e[-120:]})

    # 2b) altminer mod_yaz v2 yaması (S19 XP+ .112 uyandırma düzeltmesi)
    panel_py = Path.home() / "SAHA/antminer/antminer_panel.py"
    yama_py = KOK / "pi/altminer_yama.py"
    if panel_py.exists() and yama_py.exists():
        try:
            if "# --- aesun yama: mod_yaz v2 ---" not in panel_py.read_text():
                yk, yo, ye = sh("python3", str(yama_py), t=30)
                if not yk:
                    sh("pkill", "-f", "antminer_panel.py", t=15)
                kayit("yama", "antminer_panel.py mod_yaz v1 -> v2 yükseltmesi", yo or ye[-120:], not yk)
        except Exception as e:
            log("yama kontrol hatası:", e)

    # 3) disk
    du = shutil.disk_usage("/")
    if du.used / du.total > 0.90:
        kirp = 0
        for f in list(KOK.glob("*.log")) + list(AESUN.glob("*.log")):
            try:
                if f.stat().st_size > 20e6:
                    with open(f, "rb") as r: r.seek(-2_000_000, 2); son = r.read()
                    f.write_bytes(son); kirp += 1
            except Exception: pass
        du2 = shutil.disk_usage("/")
        ok = du2.used / du2.total <= 0.90
        kayit("disk", f"disk %{round(du.used / du.total * 100)} dolu", f"{kirp} günlük kırpıldı, şimdi %{round(du2.used / du2.total * 100)}", ok)
        if not ok:
            acik.append({"sorun": f"Pi diski %{round(du2.used / du2.total * 100)} dolu", "neden": "kırpma yetmedi — sahada bakılmalı"})

    durum = "mudahale" if eylemler else ("acik" if acik else "sakin")
    cikti = {"t": simdi.isoformat(timespec="seconds"), "durum": durum, "eylemler": eylemler, "acik": acik,
             "gecmis": ((st.get("gecmis") or []) + eylemler)[-30:]}
    ozet = json.dumps({"d": durum, "e": eylemler, "a": acik}, ensure_ascii=False, sort_keys=True)
    if eylemler or ozet != st.get("_ozet") or ts - st.get("_yazim", 0) > 3600:
        try:
            _, sha = gh("n8n/sef_pi.json")
            gh("n8n/sef_pi.json", cikti, sha, "Pi şefi: " + ("; ".join(e["eylem"] for e in eylemler) or durum))
            st["_yazim"] = ts
        except Exception as e:
            log("şef yazılamadı:", e)
    st.update({"_ozet": ozet, "gecmis": cikti["gecmis"]})
    YEREL.write_text(json.dumps(st, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        log("şef hatası:", e)
