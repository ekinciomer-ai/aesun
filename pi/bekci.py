"""AEMonitoring · Bekçi: takılan ya da ayarı bozulan cihazı kendisi onarır (cihaz_detay.py içinden çağrılır).

Sorunlar (ardışık iki okumada, yani en az ~10 dk görülmeli):
  ayar_bozuk : web ayar sayfası 500 / boş / havuzsuz  → doğrudan ONARIM
  takili     : açık, uykuda değil, hash 0, olması gereken "çalış", son uyandırma komutundan 30 dk geçmiş
               → önce YENİDEN BAŞLAT (2 saatte en çok bir); 40 dk sonra hâlâ takılıysa ONARIM
ONARIM: fabrika ayarı (reset_conf) → cihaz açılana kadar bekle → ayar yedekten (~/.aesun/yedek/ayar/<no>.json;
        yoksa aynı modelden sağlam bir cihazın ayarı, worker adı değiştirilerek) yazılır, mod plana göre.
        Aynı cihaza 6 saatte en çok bir onarım. Başarısızsa bir daha denemez, uyarı üretir.
Durum: ~/.aesun/bekci_durum.json · Olaylar: cihaz_detay.json içinde "bekci" (son 100 olay ayrıca n8n/bekci.json).
Bekçiyi kapatmak: epias-ptf/cihaz_yonetimi.json → "bekci": false
"""
import json, time
from datetime import datetime, timedelta
from pathlib import Path

from ortak import AESUN, TR, gh, log, zaman
import madenci as M

DURUM = AESUN / "bekci_durum.json"
AYAR_DIR = AESUN / "yedek/ayar"
OLAY = "n8n/bekci.json"


def _yaz_olay(olaylar, w, ip, olay, sonuc, ayrinti=""):
    o = {"t": datetime.now(TR).isoformat(timespec="seconds"), "cihaz": w, "ip": ip, "olay": olay, "sonuc": sonuc, "ayrinti": ayrinti[:200]}
    olaylar.append(o); log("BEKÇİ", w, ip, olay, sonuc, ayrinti[:120])
    return o


def acilmasini_bekle(ip, sure=240):
    t0 = time.time()
    while time.time() - t0 < sure:
        k, c = M.cgi(ip, "get_miner_conf.cgi", timeout=10)
        if k == 200:
            return True
        time.sleep(15)
    return False


def ayar_kaynagi(w, model, sonuc):
    f = AYAR_DIR / f"{w}.json"
    if f.exists():
        return json.loads(f.read_text())["ayar"], "yedek"
    for o in sonuc:      # aynı modelden sağlam bir cihaz
        if o.get("ayar_saglam") and o.get("model") == model and o.get("worker") and o["worker"] != w:
            k, c = M.cgi(o["ip"], "get_miner_conf.cgi", timeout=10)
            if k == 200 and M.ayar_saglam(c):
                return c, "şablon " + o["worker"]
    return None, ""


def onar(w, ip, model, mod, sonuc):
    c, kaynak = ayar_kaynagi(w, model, sonuc)
    if not c:
        return False, "ayar kaynağı yok"
    c = {k: v for k, v in c.items() if v is not None}
    c["pools"] = [dict(p, user="mehmetas." + w) for p in c["pools"]]
    c["bitmain-work-mode"] = mod
    k, r = M.cgi(ip, "reset_conf.cgi", govde={}, timeout=30)
    if k not in (200, -1):
        return False, f"fabrika ayarı başarısız ({k})"
    time.sleep(60)
    if not acilmasini_bekle(ip):
        return False, "cihaz fabrika ayarından sonra giriş vermedi (şifre farklı olabilir)"
    k, r = M.cgi(ip, "set_miner_conf.cgi", govde=c, timeout=30)
    if k != 200:
        return False, f"ayar yazılamadı ({k})"
    time.sleep(15)
    k, c2 = M.cgi(ip, "get_miner_conf.cgi", timeout=15)
    ok = k == 200 and M.ayar_saglam(c2) and all((p or {}).get("user", "").endswith("." + w) for p in c2.get("pools") or [])
    return ok, f"ayar {kaynak}; mod {mod}" + ("" if ok else f"; kontrol başarısız ({k})")


def calis(sonuc, mad, kim):
    ayar, _ = gh("cihaz_yonetimi.json")
    if ayar is not None and ayar.get("bekci") is False:
        return {"durum": "kapalı"}
    simdi = datetime.now(TR)
    durum = json.loads(DURUM.read_text()) if DURUM.exists() else {}
    yon, _ = gh("n8n/cihaz_yonetimi_durum.json")
    istenen = (yon or {}).get("istenen") or (yon or {}).get("karar")
    gonderilen = (((yon or {}).get("zamanlama") or {}).get("gonderilen")) or []
    # son uyandırma komutu: komut dosyasından
    kom, _ = gh("antminer_commands.json")
    son_wake = max([zaman(c["issued_at"]) for c in (kom or {}).get("commands") or [] if c.get("action") == "wake"] or [simdi - timedelta(days=1)])
    olaylar, ozet = [], {"istenen": istenen, "izlenen": 0, "sorunlu": []}
    for o in sonuc:
        w, ip = o.get("worker"), o["ip"]
        if not w:
            continue
        ozet["izlenen"] += 1
        d = durum.setdefault(w, {})
        ayar_bozuk = o.get("ayar_kod") == 500 or (o.get("ayar_kod") == 200 and not o.get("ayar_saglam"))
        takili = (not o.get("uyku") and o.get("durum") in ("ONLINE", "ONLINE_HTTP") and not (o.get("hash_th") or 0) > 0
                  and istenen == "calis" and simdi - son_wake > timedelta(minutes=30))
        sorun = "ayar_bozuk" if ayar_bozuk else "takili" if takili else None
        if not sorun:
            if d.get("sorun"):
                _yaz_olay(olaylar, w, ip, "düzeldi", "ok", d["sorun"])
            d.pop("sorun", None); d.pop("ilk", None); d["sayac"] = 0
            continue
        if d.get("sorun") != sorun:
            d.update(sorun=sorun, ilk=simdi.isoformat(), sayac=0)
        d["sayac"] = d.get("sayac", 0) + 1
        ozet["sorunlu"].append({"cihaz": w, "sorun": sorun, "sure_dk": round((simdi - zaman(d["ilk"])).total_seconds() / 60)})
        if d["sayac"] < 2:
            continue                                 # tek okumaya güvenme
        sure = simdi - zaman(d["ilk"])
        son_onarim = zaman(d["son_onarim"]) if d.get("son_onarim") else None
        son_reboot = zaman(d["son_reboot"]) if d.get("son_reboot") else None
        mod = "1" if istenen == "uyut" else "0"
        onarim_serbest = not son_onarim or simdi - son_onarim > timedelta(hours=6)
        if sorun == "ayar_bozuk" or (sorun == "takili" and son_reboot and simdi - son_reboot > timedelta(minutes=40)
                                     and sure > timedelta(minutes=70)):
            if onarim_serbest:
                d["son_onarim"] = simdi.isoformat(); DURUM.write_text(json.dumps(durum))
                ok, ayr = onar(w, ip, o.get("model"), mod, sonuc)
                _yaz_olay(olaylar, w, ip, "onarım (fabrika ayarı + ayar yükleme)", "ok" if ok else "BAŞARISIZ", ayr)
            elif not d.get("uyarildi"):
                _yaz_olay(olaylar, w, ip, "onarım hakkı doldu", "BAŞARISIZ", "6 saat içinde ikinci onarım yapılmaz; sahada bakılmalı")
                d["uyarildi"] = True
        elif sorun == "takili" and sure > timedelta(minutes=30) and (not son_reboot or simdi - son_reboot > timedelta(hours=2)):
            k, r = M.cgi(ip, "reboot.cgi", timeout=15)
            d["son_reboot"] = simdi.isoformat()
            _yaz_olay(olaylar, w, ip, "yeniden başlatma", "ok" if k in (200, -1) else f"hata {k}", "hash 0, %d dk" % (sure.total_seconds() / 60))
    DURUM.write_text(json.dumps(durum))
    if olaylar:
        eski, sha = gh(OLAY)
        tum = ((eski or {}).get("olaylar") or []) + olaylar
        gh(OLAY, {"guncellendi": simdi.isoformat(timespec="seconds"), "olaylar": tum[-100:]}, sha, "Bekçi " + simdi.strftime("%H:%M"))
    ozet["olaylar"] = olaylar
    return ozet
