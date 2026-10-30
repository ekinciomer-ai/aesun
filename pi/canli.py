#!/usr/bin/env python3
"""Anlık izleme: cihazları ~10 sn'de bir okur, portal.aksarayenerji.net/api/canli.php'ye gönderir.

Cron her dakika başlatır (flock -n), betik ~55 sn çalışıp çıkar; böylece git pull ile gelen yeni kod
bir dakika içinde devreye girer, ayrı bir servis gerekmez. Toplayıcının venv'i ile çalışır (requests + digest kimliği):
  * * * * * flock -n /tmp/aesun_canli.lock ~/SAHA/antminer/venv/bin/python ~/aesun/pi/canli.py

Kimlik: ~/.aesun/canli_anahtar (ilk çalıştırmada üretilir, yalnız Pi'de durur).
Sunucuya yalnız anahtarın SHA-256 özeti, GitHub'daki epias-ptf/n8n/canli_anahtar.json ile bildirilir;
sunucu gelen anahtarın özetini bununla karşılaştırır. Koda, sohbete ya da GitHub'a anahtarın kendisi yazılmaz.
"""
import hashlib, json, os, secrets, subprocess, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import madenci as M                     # noqa: E402
from ortak import gh, log, panel_oku                # noqa: E402

KOK = Path(__file__).resolve().parent.parent
ADRES = os.environ.get("AE_CANLI_ADRES", "https://portal.aksarayenerji.net/api/canli.php")
ARALIK, SURE = 10, 55
ANAHTAR_DOSYA = Path.home() / ".aesun" / "canli_anahtar"
OZET_YOL = "n8n/canli_anahtar.json"


def anahtar():
    if not ANAHTAR_DOSYA.exists():
        ANAHTAR_DOSYA.parent.mkdir(parents=True, exist_ok=True)
        ANAHTAR_DOSYA.write_text(secrets.token_hex(32))
        os.chmod(ANAHTAR_DOSYA, 0o600)
        log("canlı: yeni anahtar üretildi")
    a = ANAHTAR_DOSYA.read_text().strip()
    ozet = hashlib.sha256(a.encode()).hexdigest()
    isaret = ANAHTAR_DOSYA.with_suffix(".bildirildi")
    if not isaret.exists() or isaret.read_text().strip() != ozet:
        uzak, sha = gh(OZET_YOL)
        if not (isinstance(uzak, dict) and uzak.get("sha256") == ozet):
            gh(OZET_YOL, {"sha256": ozet, "not": "Pi canlı gönderim anahtarının özeti (anahtar değil)"}, sha, "canlı: anahtar özeti")
            log("canlı: anahtar özeti GitHub'a yazıldı")
        isaret.write_text(ozet)
    return a


def cihazlar():
    mad, _ = panel_oku(gerekli=("ip", "online", "sleeping"))
    out = []
    for d in (mad or {}).get("devices") or []:
        if not d.get("ip") or not d.get("online"):
            continue
        no = str(d.get("actual_worker") or d.get("havuz_worker") or "").split(".")[-1] or ("." + d["ip"].split(".")[-1])
        out.append((no, d["ip"], bool(d.get("sleeping"))))
    return out


def _maks(v):
    v = [x for x in (v or []) if isinstance(x, (int, float)) and x > 0]
    return max(v) if v else None


def oku(c):
    no, ip, uyku = c
    k, st = M.cgi(ip, "stats.cgi", timeout=5)
    if k != 200 or not isinstance(st, dict):
        return no, None
    s = ((st.get("STATS") or [{}])[0]) or {}
    hiz = s.get("rate_5s")
    birim = str(s.get("rate_unit") or "GH/s").upper()
    if isinstance(hiz, (int, float)):
        hiz = hiz / 1000 if birim.startswith("GH") else hiz if birim.startswith("TH") else hiz / 1e6
    else:
        hiz = None
    tc = _maks([_maks(ch.get("temp_chip") or ch.get("temp_chip_out") or ch.get("temp2") or ch.get("temp_pcb")) for ch in s.get("chain") or []])
    return no, [round(hiz, 1) if hiz is not None else None, tc]


def yerel_kod():
    try:
        return subprocess.run(["git", "-C", str(KOK), "rev-parse", "--short=12", "HEAD"],
                              capture_output=True, text=True, timeout=5).stdout.strip()
    except Exception:
        return ""


def gonder(a, veri):
    r = urllib.request.Request(ADRES, data=json.dumps(veri, separators=(",", ":")).encode(),
                               headers={"Content-Type": "application/json", "X-AE-Canli": a, "User-Agent": "aesun-pi-canli"},
                               method="POST")
    with urllib.request.urlopen(r, timeout=8) as y:
        try:
            return json.loads(y.read().decode("utf-8") or "{}")
        except Exception:
            return {}


def main():
    bas = time.time()
    try:
        import medas_bekci
        eylem, _, msj = medas_bekci.kontrol()
        if eylem:
            log("canlı: medas portal ->", msj)
    except Exception as e:
        log("canlı: medas kontrol hatası:", e)
    a = anahtar()
    liste = cihazlar()
    if not liste:
        log("canlı: cihaz listesi boş"); return
    M.filo_auth()
    hata = 0
    kod = yerel_kod()
    son_cek = 0.0
    son_komut_t = 0
    with ThreadPoolExecutor(max_workers=12) as h:
        while time.time() - bas < SURE:
            t0 = time.time()
            c = dict(h.map(oku, liste))
            top = sum(v[0] or 0 for v in c.values() if v)
            try:
                yan = gonder(a, {"t": int(t0), "top": round(top, 1), "n": sum(1 for v in c.values() if v and (v[0] or 0) > 1), "c": c, "kod": kod})
                hedef_kod = str((yan or {}).get("kod") or "")
                if hedef_kod and kod and not kod.startswith(hedef_kod[:7]) and time.time() - son_cek > 20:
                    son_cek = time.time()
                    r = subprocess.run(["git", "-C", str(KOK), "pull", "-q", "--ff-only"], capture_output=True, text=True, timeout=30)
                    if r.returncode == 0:
                        kod = yerel_kod()
                        log("canlı: hızlı kod güncellemesi tamam ->", kod)
                komut_t = int((yan or {}).get("komut_t") or 0)
                if komut_t > son_komut_t and time.time() - komut_t < 120:
                    son_komut_t = komut_t
                    subprocess.Popen(["flock", "-n", "/tmp/aesun_cy.lock", "python3", str(KOK / "pi/cihaz_yonetimi.py"), "--tetik"])
            except Exception as e:
                hata += 1
                if hata <= 2:
                    log("canlı: gönderilemedi", str(e)[:120])
            time.sleep(max(0.5, ARALIK - (time.time() - t0)))


if __name__ == "__main__":
    main()
