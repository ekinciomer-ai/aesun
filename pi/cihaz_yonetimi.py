#!/usr/bin/env python3
"""AEMonitoring · Madenci cihaz yönetimi (Pi, crontab ile 5 dakikada bir).

Kural:
  a) Güneş üretimi varken (FusionSolar Sera-1 + Sera-2 anlık güç > eşik) cihazlar ÇALIŞIR; PTF'ye bakılmaz.
  b) Üretim yokken: saatlik enerji maliyeti > saatlik BTC geliri ise cihazlar UYUR, aksi halde ÇALIŞIR.

Maliyet (cihaz başı, TL/saat) = (PTF + YEKDEM) / 1000 × maliyet_carpani × cihaz_guc_kw
Gelir   (cihaz başı, TL/saat) = hashprice (BTC / TH / gün, F2Pool son N gün) × cihaz_th / 24 × BTC/TL

Ayarlar ve mod GitHub epias-ptf/cihaz_yonetimi.json dosyasında:
  mod: "izleme"   -> yalnız karar verir ve yazar, komut GÖNDERMEZ (varsayılan)
       "otomatik" -> karar değişince antminer_commands.json'a sleep/wake komutu yazar (Pi'deki altminer uygular)
       "kapali"   -> hiçbir şey yapmaz
Durum ve 24 saatlik plan: epias-ptf/n8n/cihaz_yonetimi_durum.json (panel buradan okur).

Elle:  python3 cihaz_yonetimi.py            (bir kez çalışır)
       python3 cihaz_yonetimi.py --mod otomatik|izleme|kapali   (modu değiştirir)
"""
import argparse, base64, json, os, sys, time, urllib.error, urllib.request, uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

REPO = "https://api.github.com/repos/ekinciomer-ai/epias-ptf/contents/"
TR = timezone(timedelta(hours=3))
YEREL = Path.home() / ".aesun" / "cihaz_yonetimi_yerel.json"
VARSAYILAN = {
    "mod": "izleme",
    "cihaz_sayisi": 29,
    "cihaz_guc_kw": 6.0,          # cihaz başı çekilen güç
    "cihaz_th": 300,              # cihaz başı hashrate (TH/s)
    "maliyet_carpani": 1.05,      # PTF+YEKDEM üzerine dağıtım/vergi payı (saat_kontrol.py ile aynı)
    "uretim_esik_kw": 50,         # Sera-1 + Sera-2 anlık gücü bunun üstündeyse "üretim var"
    "hashprice_gun": 7,           # hashprice için son kaç günün F2Pool geliri
    "komut_arasi_dk": 15,         # aynı komut en erken bu kadar dakika sonra tekrarlanır
    "sirali_gecikme_sn": 10,      # cihazlar arasına konan gecikme (ani yük binmesin)
}


def log(*a):
    print(datetime.now(TR).strftime("%Y-%m-%d %H:%M:%S"), *a, flush=True)


def token():
    for f in (Path.home() / ".aesun/osos.env", Path.home() / "aesun/env.txt"):
        if f.exists():
            for s in f.read_text().splitlines():
                if s.startswith("GITHUB_TOKEN="):
                    return s.split("=", 1)[1].strip()
    return os.environ.get("GITHUB_TOKEN", "")


TOK = token()


def gh(yol, veri=None, sha=None, mesaj=None):
    h = {"Authorization": "Bearer " + TOK, "Accept": "application/vnd.github+json", "User-Agent": "aesun-pi"}
    if veri is None:
        try:
            with urllib.request.urlopen(urllib.request.Request(REPO + yol, headers=h), timeout=30) as r:
                m = json.loads(r.read())
            if m.get("content"):
                return json.loads(base64.b64decode(m["content"]).decode()), m["sha"]
            with urllib.request.urlopen(urllib.request.Request(REPO + yol, headers={**h, "Accept": "application/vnd.github.raw+json"}), timeout=60) as r:
                return json.loads(r.read()), m["sha"]
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None, None
            raise
    govde = {"message": mesaj or ("cihaz yönetimi " + datetime.now(TR).strftime("%Y-%m-%d %H:%M")),
             "content": base64.b64encode(json.dumps(veri, ensure_ascii=False, indent=1).encode()).decode()}
    if sha:
        govde["sha"] = sha
    r = urllib.request.Request(REPO + yol, data=json.dumps(govde).encode(), headers=h, method="PUT")
    with urllib.request.urlopen(r, timeout=30) as y:
        return json.loads(y.read())


def ayar_oku():
    a, sha = gh("cihaz_yonetimi.json")
    if a is None:
        a = dict(VARSAYILAN)
        gh("cihaz_yonetimi.json", a, None, "cihaz yönetimi: varsayılan ayarlar (izleme modu)")
        return a
    return {**VARSAYILAN, **a}


def hashprice(gelir, n):
    gunler = sorted(g for g in gelir if g[:1].isdigit() and gelir[g].get("hash_rate"))[-n:]
    v = [gelir[g]["btc"] / gelir[g]["hash_rate"] for g in gunler if gelir[g]["hash_rate"] > 0]
    return (sum(v) / len(v) if v else None), (gunler[0] if gunler else None), (gunler[-1] if gunler else None)


def karar_ver(uretim, ptf, yekdem, a, hp, btc_try):
    maliyet = (ptf + yekdem) / 1000 * a["maliyet_carpani"] * a["cihaz_guc_kw"] if ptf is not None else None
    gelir = hp * a["cihaz_th"] / 24 * btc_try if hp and btc_try else None
    if uretim:
        return "calis", "güneş üretimi var", maliyet, gelir
    if maliyet is None or gelir is None:
        return None, "PTF ya da gelir verisi yok", maliyet, gelir
    if maliyet > gelir:
        return "uyut", f"maliyet {maliyet:.0f} ₺ > gelir {gelir:.0f} ₺ (cihaz/saat)", maliyet, gelir
    return "calis", f"gelir {gelir:.0f} ₺ ≥ maliyet {maliyet:.0f} ₺ (cihaz/saat)", maliyet, gelir


def calistir():
    if not TOK:
        sys.exit("GITHUB_TOKEN yok (~/.aesun/osos.env)")
    a = ayar_oku()
    simdi = datetime.now(TR)
    if a["mod"] == "kapali":
        log("mod kapalı, çıkılıyor")
        return
    ep, _ = gh("n8n/epias_gecmis.json")
    fs, _ = gh("n8n/fusionsolar_son.json")
    gelir, _ = gh("arsiv_f2pool_gelir.json")
    fiyat, _ = gh("arsiv_btc_fiyat.json")
    mad, _ = gh("antminer_panel.json")
    # PTF ve YEKDEM
    def ptf_al(t):
        g = (ep or {}).get("ptf", {}).get(t.strftime("%Y-%m-%d")) or []
        return g[t.hour] if len(g) > t.hour and g[t.hour] is not None else None
    def yekdem_al(t):
        y = (ep or {}).get("yekdem", {}).get(t.strftime("%Y-%m")) or {}
        return y.get("gercek") if y.get("gercek") is not None else y.get("ongoru")
    # BTC/TL: arşivdeki en son kapanış
    fg = (fiyat or {}).get("gun", {})
    son_fg = max((g for g in fg if fg[g].get("try")), default=None)
    btc_try = fg[son_fg]["try"] if son_fg else None
    hp, hp_bas, hp_son = hashprice(gelir or {}, a["hashprice_gun"])
    # Güneş üretimi: FusionSolar anlık güç (en çok 30 dk eski)
    uretim_kw, fs_taze = None, False
    if fs:
        try:
            ts = datetime.fromisoformat(fs.get("guncelleme")).replace(tzinfo=TR)
            fs_taze = (simdi - ts) < timedelta(minutes=30)
            uretim_kw = sum(float(t.get("anlik_guc_kw") or 0) for t in (fs.get("tesisler") or {}).values())
        except Exception:
            pass
    uretim = (uretim_kw or 0) > a["uretim_esik_kw"] if fs_taze else None
    # Saat sonuna 5 dk kala bir sonraki saatin fiyatına göre davran (geçiş önceden yapılsın)
    hedef = simdi + timedelta(minutes=5) if simdi.minute >= 55 else simdi
    ptf, yekdem = ptf_al(hedef), yekdem_al(hedef)
    if uretim is None:
        karar, neden, maliyet, gel = None, "FusionSolar verisi eski ya da yok (değişiklik yapılmaz)", None, None
    else:
        karar, neden, maliyet, gel = karar_ver(uretim, ptf, yekdem or 0, a, hp, btc_try)
    # Mevcut cihaz durumu
    cihazlar = (mad or {}).get("devices") or []
    ulasilan = [d for d in cihazlar if d.get("online") or d.get("sleeping")]
    calisan = sum(1 for d in cihazlar if d.get("online") and not d.get("sleeping"))
    uyuyan = sum(1 for d in cihazlar if d.get("sleeping"))
    try:
        mad_ts = datetime.fromisoformat((mad or {}).get("timestamp", "")).replace(tzinfo=TR)
        mad_taze = (simdi - mad_ts) < timedelta(minutes=15)
    except Exception:
        mad_taze = False
    # Eylem
    yerel = json.loads(YEREL.read_text()) if YEREL.exists() else {}
    eylem, eylem_not = None, ""
    if karar and mad_taze and ulasilan:
        if karar == "uyut" and calisan > 0:
            eylem = "sleep"
        elif karar == "calis" and uyuyan > 0:
            eylem = "wake"
    elif karar and not (mad_taze and ulasilan):
        eylem_not = "cihaz durumu okunamıyor (toplayıcı saha ağında değil ya da veri eski)"
    if eylem:
        son = yerel.get("son_komut") or {}
        if son.get("action") == eylem and (time.time() - son.get("t", 0)) < a["komut_arasi_dk"] * 60:
            eylem_not = f"aynı komut {a['komut_arasi_dk']} dk içinde gönderilmişti, bekleniyor"
            eylem = None
    gonderildi = False
    if eylem and a["mod"] == "otomatik":
        kom, sha = gh("antminer_commands.json")
        kom = kom or {"commands": []}
        cmd = {"id": str(uuid.uuid4())[:8], "action": eylem, "targets": "all", "delay_sec": a["sirali_gecikme_sn"],
               "sort_by": None, "issued_at": datetime.now().isoformat(), "issued_by": "otomatik (cihaz yönetimi)"}
        kom["commands"] = (kom.get("commands") or [])[-49:] + [cmd]
        kom["updated_at"] = cmd["issued_at"]
        gh("antminer_commands.json", kom, sha, f"otomatik {eylem}: {neden}")
        yerel["son_komut"] = {"action": eylem, "t": time.time(), "id": cmd["id"]}
        YEREL.parent.mkdir(parents=True, exist_ok=True)
        YEREL.write_text(json.dumps(yerel))
        gonderildi = True
        log("KOMUT", eylem, "-", neden)
    elif eylem:
        eylem_not = "izleme modu: komut gönderilmedi"
    # 24 saatlik plan (üretim varsayımı: bugünkü FusionSolar saatlik profili)
    saatlik = {}
    for v in ((fs or {}).get("saatlik_bugun") or {}).values():
        for s_, k in (v or {}).items():
            try:
                saatlik[int(str(s_)[:2])] = saatlik.get(int(str(s_)[:2]), 0) + float(k or 0)
            except Exception:
                pass
    plan = []
    for i in range(24):
        t = (simdi + timedelta(hours=i)).replace(minute=0, second=0, microsecond=0)
        p, y = ptf_al(t), yekdem_al(t)
        gunes = saatlik.get(t.hour, 0) > a["uretim_esik_kw"]
        k, n, m, g = karar_ver(gunes, p, y or 0, a, hp, btc_try)
        plan.append({"t": t.strftime("%Y-%m-%d %H:00"), "ptf": p, "yekdem": y, "gunes_tahmini": gunes, "maliyet": m, "gelir": g, "karar": k})
    basabas = None
    if hp and btc_try:
        g1 = hp * a["cihaz_th"] / 24 * btc_try
        basabas = g1 / (a["maliyet_carpani"] * a["cihaz_guc_kw"]) * 1000 - (yekdem or 0)
    durum, sha = gh("n8n/cihaz_yonetimi_durum.json")
    durum = durum or {}
    gec = durum.get("gecmis") or []
    if gonderildi or durum.get("karar") != karar:
        gec.append({"t": simdi.strftime("%Y-%m-%d %H:%M"), "karar": karar, "eylem": eylem or "-", "neden": neden,
                    "not": eylem_not, "gonderildi": gonderildi, "mod": a["mod"]})
    yeni = {
        "guncellendi": simdi.isoformat(timespec="seconds"), "mod": a["mod"], "ayarlar": a,
        "uretim_kw": uretim_kw, "uretim": uretim, "fs_taze": fs_taze, "ptf": ptf, "yekdem": yekdem,
        "btc_try": btc_try, "btc_tarih": son_fg, "hashprice_btc_th_gun": hp, "hashprice_aralik": [hp_bas, hp_son],
        "maliyet_tl_saat": maliyet, "gelir_tl_saat": gel, "basabas_ptf": basabas,
        "karar": karar, "neden": neden, "eylem": eylem, "eylem_not": eylem_not, "gonderildi": gonderildi,
        "cihaz": {"toplam": len(cihazlar), "ulasilan": len(ulasilan), "calisan": calisan, "uyuyan": uyuyan, "taze": mad_taze},
        "plan": plan, "gecmis": gec[-200:],
    }
    kiyas = {k: v for k, v in yeni.items() if k != "guncellendi"}
    eski = {k: v for k, v in durum.items() if k != "guncellendi"}
    if kiyas != eski or (simdi - datetime.fromisoformat(durum.get("guncellendi", "2000-01-01T00:00:00+03:00"))) > timedelta(minutes=30):
        gh("n8n/cihaz_yonetimi_durum.json", yeni, sha, f"cihaz yönetimi: {karar or '-'} ({a['mod']})")
    log(f"mod={a['mod']} üretim={uretim_kw} kW ptf={ptf} karar={karar} ({neden}) cihaz {calisan}/{uyuyan} eylem={eylem or '-'} {eylem_not}")


def mod_degistir(mod):
    a, sha = gh("cihaz_yonetimi.json")
    a = {**VARSAYILAN, **(a or {})}
    a["mod"] = mod
    gh("cihaz_yonetimi.json", a, sha, f"cihaz yönetimi: mod {mod}")
    print("mod:", mod)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--mod", choices=["izleme", "otomatik", "kapali"])
    x = ap.parse_args()
    if x.mod:
        mod_degistir(x.mod)
    else:
        calistir()
