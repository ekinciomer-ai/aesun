#!/usr/bin/env python3
"""AEMonitoring · Cihaz detay toplayıcı + bekçi (Pi, crontab 5 dakikada bir, toplayıcının venv'i ile).

1) Toplayıcının gördüğü her cihazdan web arayüzü üzerinden ayrıntı okur (salt okuma):
   kart (hashboard) bazında hız / ideal hız / frekans / çip sayısı / PCB ve çip sıcaklığı / HW hatası,
   fanlar, çalışma modu, frekans seviyesi, çalışma süresi. → epias-ptf/n8n/cihaz_detay.json
   Her model için ham örnek günde bir kez → n8n/cihaz_detay_ornek.json (alan adlarını görmek için).
2) Sağlam ayarı (havuz + worker) olan her cihazın ayarını yerelde yedekler: ~/.aesun/yedek/ayar/<no>.json
3) Bekçi (bekci.py): ayarı bozulan ya da takılan cihazı kendisi onarır (bkz. bekci.py).

Elle:  ~/SAHA/antminer/venv/bin/python ~/aesun/pi/cihaz_detay.py [--bekci-yok]
"""
import concurrent.futures as CF, json, sys, time
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ortak import AESUN, TR, gh, log                        # noqa: E402
import madenci as M                                          # noqa: E402

AYAR_DIR = AESUN / "yedek/ayar"
DOSYA, ORNEK = "n8n/cihaz_detay.json", "n8n/cihaz_detay_ornek.json"


def _maks(v):
    v = [x for x in (v or []) if isinstance(x, (int, float)) and x > 0]
    return max(v) if v else None


def kart_ozet(st):
    S = (st or {}).get("STATS") or []
    s = S[0] if S and isinstance(S[0], dict) else {}
    kart = []
    for ch in s.get("chain") or []:
        kart.append({"i": ch.get("index"), "hiz": ch.get("rate_real"), "ideal": ch.get("rate_ideal"),
                     "frek": ch.get("freq_avg"), "asic": ch.get("asic_num"), "asic_dizi": ch.get("asic"),
                     "t_pcb": _maks(ch.get("temp_pcb")), "t_chip": _maks(ch.get("temp_chip")),
                     "t_pic": _maks(ch.get("temp_pic")), "hw": ch.get("hw"), "hwp": ch.get("hwp"), "sn": ch.get("sn")})
    bilinen = {"chain", "fan", "rate_5s", "rate_avg", "rate_30m", "rate_ideal", "rate_unit", "elapsed", "miner-mode",
               "freq-level", "hwp_total", "chain_num", "fan_num"}
    diger = {k: v for k, v in s.items() if k not in bilinen and isinstance(v, (int, float, str)) and len(str(v)) < 40}
    return {"hiz": s.get("rate_5s"), "hiz_30dk": s.get("rate_30m"), "ort": s.get("rate_avg"), "ideal": s.get("rate_ideal"),
            "birim": s.get("rate_unit"), "fan": s.get("fan"), "mod": s.get("miner-mode"), "frek_seviye": s.get("freq-level"),
            "hwp": s.get("hwp_total"), "sure_sn": s.get("elapsed"), "kart": kart, "diger": dict(list(diger.items())[:30])}


def kimlik_bul(d, kim):
    w = str(d.get("actual_worker") or "").split(".")[-1]
    if w:
        return w
    for k, v in kim.items():
        if v.get("serial") and v["serial"] == d.get("serial"):
            return k
        if v.get("mac") and d.get("mac") and v["mac"].upper() == str(d["mac"]).upper():
            return k
    return None


def oku(d, w, ayar_vakti):
    ip = d["ip"]
    o = {"ip": ip, "worker": w, "model": d.get("model"), "durum": d.get("status"), "uyku": bool(d.get("sleeping")),
         "hash_th": d.get("hashrate_TH")}
    if d.get("online") and not d.get("sleeping"):
        k, st = M.cgi(ip, "stats.cgi", timeout=10)
        o["stats_kod"] = k
        if k == 200 and isinstance(st, dict):
            o.update(kart_ozet(st)); o["_ham"] = st
    if ayar_vakti or d.get("online"):
        k, c = M.cgi(ip, "get_miner_conf.cgi", timeout=10)
        o["ayar_kod"] = k
        o["ayar_saglam"] = M.ayar_saglam(c) if k == 200 else False
        if k == 200 and isinstance(c, dict):
            o["ayar_mod"] = c.get("bitmain-work-mode")
            o["havuz_user"] = sorted({(p or {}).get("user") for p in c.get("pools") or [] if (p or {}).get("user")})
            if o["ayar_saglam"] and w and all(u.endswith("." + w) for u in o["havuz_user"]):
                AYAR_DIR.mkdir(parents=True, exist_ok=True)
                (AYAR_DIR / f"{w}.json").write_text(json.dumps({"zaman": datetime.now(TR).isoformat(timespec="seconds"),
                                                              "ip": ip, "serial": d.get("serial"), "model": d.get("model"),
                                                              "ayar": c}, ensure_ascii=False, indent=1))
    return o


def main():
    simdi = datetime.now(TR)
    mad, _ = gh("antminer_panel.json")
    kim, _ = gh("n8n/cihaz_kimlik.json")
    kim = kim or {}
    cihazlar = [d for d in (mad or {}).get("devices") or [] if d.get("online") or d.get("sleeping")]
    if not cihazlar:
        log("cihaz yok (toplayıcı verisi boş)"); return
    ayar_vakti = simdi.minute < 5                    # saatte bir uyuyan cihazların ayarını da oku (yedek için)
    with CF.ThreadPoolExecutor(8) as ex:
        sonuc = list(ex.map(lambda d: oku(d, kimlik_bul(d, kim), ayar_vakti), cihazlar))
    # günde bir kez her modelden bir ham örnek
    ornek, osha = gh(ORNEK)
    if not ornek or (ornek.get("gun") != simdi.strftime("%Y-%m-%d")):
        om = {}
        for o in sonuc:
            if o.get("_ham") and o.get("model") and o["model"] not in om:
                om[o["model"]] = {"ip": o["ip"], "worker": o["worker"], "stats": o["_ham"]}
        if om:
            gh(ORNEK, {"gun": simdi.strftime("%Y-%m-%d"), "modeller": om}, osha, "Cihaz ham örnek " + simdi.strftime("%d.%m"))
    for o in sonuc:
        o.pop("_ham", None)
    veri = {"zaman": simdi.isoformat(timespec="seconds"), "cihaz": {(o["worker"] or o["ip"]): o for o in sonuc}}
    if "--bekci-yok" not in sys.argv:
        try:
            import bekci
            veri["bekci"] = bekci.calis(sonuc, mad, kim)
        except Exception as e:
            log("bekçi hatası:", e); veri["bekci"] = {"hata": str(e)[:200]}
    _, sha = gh(DOSYA)
    gh(DOSYA, veri, sha, "Cihaz detay " + simdi.strftime("%H:%M"))
    sorunlu = [o["worker"] or o["ip"] for o in sonuc if o.get("ayar_kod") not in (None, 200) or (o.get("kart") and any((k.get("hiz") or 0) <= 0 for k in o["kart"]))]
    log(f"{len(sonuc)} cihaz okundu; dikkat: {', '.join(sorunlu) or 'yok'}")


if __name__ == "__main__":
    import signal, socket
    socket.setdefaulttimeout(60)
    signal.alarm(900)               # bekçi onarımı dahil en çok 15 dk; takılırsa kilidi bırak
    main()
